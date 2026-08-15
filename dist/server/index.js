const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const encoder = new TextEncoder();
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS }); }
function base64(bytes) { let value = ''; new Uint8Array(bytes).forEach((b) => value += String.fromCharCode(b)); return btoa(value); }
function fromBase64(value) { return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)); }
function isHex64(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }
async function initialize(db) { await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, organization TEXT NOT NULL, program TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS claim_events (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, created_at TEXT NOT NULL)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_claim_events_type ON claim_events(event_type)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS claim_records (id TEXT PRIMARY KEY, program_id TEXT NOT NULL, nullifier TEXT NOT NULL, commitment TEXT NOT NULL, wallet_kind TEXT NOT NULL, status TEXT NOT NULL, issued_at TEXT NOT NULL, signature TEXT NOT NULL)`),
  db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_records_program_nullifier ON claim_records(program_id, nullifier)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS program_inventory (program_id TEXT PRIMARY KEY, capacity INTEGER NOT NULL CHECK (capacity >= 0), allocated INTEGER NOT NULL DEFAULT 0 CHECK (allocated >= 0 AND allocated <= capacity))`),
  db.prepare(`INSERT INTO program_inventory (program_id, capacity, allocated) SELECT 'emergency-relief-2026', 1000, COUNT(*) FROM claim_records WHERE program_id = 'emergency-relief-2026' AND status IN ('accepted', 'reserved') ON CONFLICT(program_id) DO NOTHING`)
]);
  const columns = await db.prepare(`PRAGMA table_info(claim_records)`).all(); const names = new Set((columns.results || []).map((column) => column.name));
  const migrations = [
    ['tx_hash', `ALTER TABLE claim_records ADD COLUMN tx_hash TEXT`], ['tx_network', `ALTER TABLE claim_records ADD COLUMN tx_network TEXT`],
    ['tx_status', `ALTER TABLE claim_records ADD COLUMN tx_status TEXT`], ['reserved_until', `ALTER TABLE claim_records ADD COLUMN reserved_until TEXT`],
    ['redeemed_at', `ALTER TABLE claim_records ADD COLUMN redeemed_at TEXT`], ['updated_at', `ALTER TABLE claim_records ADD COLUMN updated_at TEXT`]
  ].filter(([name]) => !names.has(name)).map(([, sql]) => db.prepare(sql)); if (migrations.length) await db.batch(migrations);
  await db.batch([
    db.prepare(`DROP TRIGGER IF EXISTS trg_claim_records_capacity_guard`), db.prepare(`DROP TRIGGER IF EXISTS trg_claim_records_allocate`),
    db.prepare(`CREATE TRIGGER IF NOT EXISTS trg_claim_records_capacity_guard_v2 BEFORE INSERT ON claim_records FOR EACH ROW WHEN NEW.status IN ('accepted', 'reserved') AND COALESCE((SELECT allocated >= capacity FROM program_inventory WHERE program_id = NEW.program_id), 1) BEGIN SELECT RAISE(ABORT, 'PROGRAM_CAPACITY_REACHED'); END`),
    db.prepare(`CREATE TRIGGER IF NOT EXISTS trg_claim_records_allocate_v2 AFTER INSERT ON claim_records FOR EACH ROW WHEN NEW.status IN ('accepted', 'reserved') BEGIN UPDATE program_inventory SET allocated = allocated + 1 WHERE program_id = NEW.program_id; END`),
    db.prepare(`CREATE TRIGGER IF NOT EXISTS trg_claim_records_release_v2 AFTER UPDATE OF status ON claim_records FOR EACH ROW WHEN OLD.status IN ('accepted', 'reserved') AND NEW.status NOT IN ('accepted', 'reserved') BEGIN UPDATE program_inventory SET allocated = MAX(0, allocated - 1) WHERE program_id = NEW.program_id; END`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_claim_records_reservations ON claim_records(status, reserved_until)`)
  ]); await db.prepare(`UPDATE claim_records SET status = 'expired', updated_at = ? WHERE status = 'reserved' AND reserved_until < ?`).bind(new Date().toISOString(), new Date().toISOString()).run();
}
async function signingKeys(db) {
  const existing = await db.prepare(`SELECT value FROM settings WHERE key = ?`).bind('receipt_signing_key_v1').first(); let stored = existing?.value;
  if (!stored) { const generated = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']); const privateJwk = await crypto.subtle.exportKey('jwk', generated.privateKey); stored = JSON.stringify(privateJwk); try { await db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`).bind('receipt_signing_key_v1', stored).run(); } catch { stored = (await db.prepare(`SELECT value FROM settings WHERE key = ?`).bind('receipt_signing_key_v1').first()).value; } }
  const privateJwk = JSON.parse(stored); const publicJwk = { kty: privateJwk.kty, crv: privateJwk.crv, x: privateJwk.x, y: privateJwk.y, ext: true, key_ops: ['verify'] };
  return { privateKey: await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']), publicKey: await crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']), publicJwk };
}
function receiptFromRow(row) { const legacy = !row.updated_at; return { id: row.id, programId: row.program_id, commitment: row.commitment, status: row.status, issuedAt: row.issued_at, issuer: legacy ? 'Alethia Claim Ledger v1' : 'Alethia Claim Ledger v2', proofMode: row.wallet_kind === 'midnight-preprod' ? (legacy ? 'midnight-wallet-connected' : 'midnight-preprod-transaction') : 'browser-test', ...(row.reserved_until ? { reservedUntil: row.reserved_until } : {}), ...(row.tx_hash ? { txHash: row.tx_hash, txNetwork: row.tx_network, txStatus: row.tx_status } : {}), ...(row.redeemed_at ? { redeemedAt: row.redeemed_at } : {}) }; }
async function signReceipt(receipt, keys) { return base64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, encoder.encode(JSON.stringify(receipt)))); }
async function handleClaimPost(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || body.programId !== 'emergency-relief-2026' || !isHex64(body.nullifier) || !isHex64(body.commitment) || !['aletheia-test', 'midnight-preprod'].includes(body.walletKind)) return json({ error: 'The proof envelope is invalid.' }, 400);
  const db = env.DB; await initialize(db); const keys = await signingKeys(db); const issuedAt = new Date().toISOString(); const reservedUntil = body.walletKind === 'midnight-preprod' ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
  const row = { id: crypto.randomUUID(), program_id: body.programId, commitment: body.commitment, wallet_kind: body.walletKind, status: reservedUntil ? 'reserved' : 'accepted', issued_at: issuedAt, reserved_until: reservedUntil, updated_at: issuedAt }; const receipt = receiptFromRow(row); const signature = await signReceipt(receipt, keys);
  try { await db.batch([db.prepare(`INSERT INTO claim_records (id, program_id, nullifier, commitment, wallet_kind, status, issued_at, signature, reserved_until, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(row.id, body.programId, body.nullifier, body.commitment, body.walletKind, row.status, issuedAt, signature, reservedUntil, issuedAt), db.prepare(`INSERT INTO claim_events (id, event_type, created_at) VALUES (?, ?, ?)`).bind(crypto.randomUUID(), reservedUntil ? 'reserved' : 'accepted', issuedAt)]); return json({ receipt, signature, publicKey: keys.publicJwk }, 201); }
  catch (error) { const message = String(error).toLowerCase(); if (message.includes('program_capacity_reached')) return json({ error: 'This program has allocated all available supplies.', code: 'PROGRAM_FULL' }, 409); if (message.includes('unique')) { await db.prepare(`INSERT INTO claim_events (id, event_type, created_at) VALUES (?, ?, ?)`).bind(crypto.randomUUID(), 'duplicate_blocked', new Date().toISOString()).run(); return json({ error: 'This wallet has already claimed this program benefit.', code: 'DUPLICATE_CLAIM' }, 409); } throw error; }
}
async function handleClaimPatch(request, env) {
  const body = await request.json().catch(() => null); if (!body || typeof body.id !== 'string' || !/^[a-f0-9]{64}$/i.test(body.txHash || '') || body.network !== 'preprod') return json({ error: 'Valid Preprod transaction evidence is required.' }, 400);
  const db = env.DB; await initialize(db); const row = await db.prepare(`SELECT * FROM claim_records WHERE id = ?`).bind(body.id).first(); if (!row) return json({ error: 'Claim reservation not found.' }, 404); if (row.wallet_kind !== 'midnight-preprod') return json({ error: 'Only Midnight reservations accept transaction evidence.' }, 409); if (row.status !== 'reserved' || row.reserved_until < new Date().toISOString()) return json({ error: 'This reservation has expired or was already finalized.' }, 409);
  const updated = { ...row, status: 'accepted', tx_hash: body.txHash.toLowerCase(), tx_network: 'preprod', tx_status: String(body.txStatus || 'submitted').slice(0, 40) }; const keys = await signingKeys(db); const receipt = receiptFromRow(updated); const signature = await signReceipt(receipt, keys); const now = new Date().toISOString();
  await db.batch([db.prepare(`UPDATE claim_records SET status = 'accepted', tx_hash = ?, tx_network = 'preprod', tx_status = ?, signature = ?, updated_at = ? WHERE id = ? AND status = 'reserved'`).bind(updated.tx_hash, updated.tx_status, signature, now, body.id), db.prepare(`INSERT INTO claim_events (id, event_type, created_at) VALUES (?, 'onchain_submitted', ?)`).bind(crypto.randomUUID(), now)]); return json({ receipt, signature, publicKey: keys.publicJwk });
}
async function handleClaimGet(url, env) {
  const id = url.searchParams.get('id'); if (!id) return json({ error: 'Receipt id is required.' }, 400); const db = env.DB; await initialize(db);
  const row = await db.prepare(`SELECT * FROM claim_records WHERE id = ?`).bind(id).first(); if (!row) return json({ valid: false, error: 'Receipt not found.' }, 404);
  const receipt = receiptFromRow(row); const keys = await signingKeys(db);
  return json({ valid: await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keys.publicKey, fromBase64(row.signature), encoder.encode(JSON.stringify(receipt))), receipt, signature: row.signature, publicKey: keys.publicJwk });
}
async function handleStats(env) {
  const db = env.DB; await initialize(db);
  const claims = await db.prepare(`SELECT COUNT(*) AS total FROM claim_records WHERE status = ?`).bind('accepted').first();
  const duplicates = await db.prepare(`SELECT COUNT(*) AS total FROM claim_events WHERE event_type = ?`).bind('duplicate_blocked').first();
  const inventory = await db.prepare(`SELECT capacity, allocated FROM program_inventory WHERE program_id = ?`).bind('emergency-relief-2026').first();
  const validClaims = Number(claims?.total || 0); const duplicateClaimsStopped = Number(duplicates?.total || 0); const attemptedClaims = validClaims + duplicateClaimsStopped;
  const supplyCapacity = Number(inventory?.capacity || 0); const allocatedSupplies = Number(inventory?.allocated || 0); const remainingSupplies = Math.max(0, supplyCapacity - allocatedSupplies);
  return json({ validClaims, duplicateClaimsStopped, attemptedClaims, privateFieldsPublished: 0, supplyCapacity, allocatedSupplies, remainingSupplies, updatedAt: new Date().toISOString() });
}
async function handleInquiry(request, env) {
  const body = await request.json().catch(() => null); const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const item = { id: crypto.randomUUID(), name: clean(body?.name, 120), email: clean(body?.email, 200), organization: clean(body?.organization, 200), program: clean(body?.program, 100), message: clean(body?.message, 3000), createdAt: new Date().toISOString() };
  if (!item.name || !/^\S+@\S+\.\S+$/.test(item.email) || !item.message) return json({ error: 'Name, a valid email, and a message are required.' }, 400);
  const db = env.DB; await initialize(db); await db.prepare(`INSERT INTO inquiries (id, name, email, organization, program, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(item.id, item.name, item.email, item.organization, item.program, item.message, item.createdAt).run(); return json({ ok: true, reference: `ALT-${item.id.slice(0, 8).toUpperCase()}` }, 201);
}
export default { async fetch(request, env) { try { const url = new URL(request.url); if (!env?.DB && url.pathname.startsWith('/api/')) return json({ error: 'The claim database is not configured.' }, 503); if (url.pathname === '/api/claims' && request.method === 'POST') return handleClaimPost(request, env); if (url.pathname === '/api/claims' && request.method === 'PATCH') return handleClaimPatch(request, env); if (url.pathname === '/api/claims' && request.method === 'GET') return handleClaimGet(url, env); if (url.pathname === '/api/inquiries' && request.method === 'POST') return handleInquiry(request, env); if (url.pathname === '/api/stats' && request.method === 'GET') return handleStats(env); if (url.pathname === '/api/health') return json({ ok: true, service: 'aletheia', mode: 'signed-ledger-with-midnight-preprod-anchor', receiptAlgorithm: 'ECDSA P-256 / SHA-256', midnightPreprodTransaction: true, midnightCompact: false }); return env?.ASSETS?.fetch ? env.ASSETS.fetch(request) : new Response('Alethia is ready.', { headers: { 'content-type': 'text/plain; charset=utf-8' } }); } catch (error) { return json({ error: 'Alethia could not complete this request.', detail: String(error?.message || error) }, 500); } } };
