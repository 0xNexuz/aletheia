const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const encoder = new TextEncoder();
const PROGRAMS = [
  { id: 'food-support-2026', name: 'Emergency Food Support', capacity: 1000, minAge: 18, jurisdiction: 566, minHouseholdSize: 2, maxAnnualIncome: 2500000 },
  { id: 'medical-assistance-2026', name: 'Medical Assistance', capacity: 500, minAge: 18, jurisdiction: 566, minHouseholdSize: 1, maxAnnualIncome: 4000000 },
  { id: 'temporary-shelter-2026', name: 'Temporary Shelter', capacity: 250, minAge: 21, jurisdiction: 566, minHouseholdSize: 2, maxAnnualIncome: 3000000 }
];
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS }); }
function base64(bytes) { let value = ''; new Uint8Array(bytes).forEach((b) => value += String.fromCharCode(b)); return btoa(value); }
function fromBase64(value) { return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)); }
function isHex64(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }
const HELD_STATUSES = new Set(['reserved', 'claim_pending', 'claim_confirmed', 'pending_review']);
const TX_STATUS_QUERY = `query AletheiaTransactionStatus($transactionId: HexEncoded!) { transactions(offset: {identifier: $transactionId}) { __typename contractActions { __typename address ... on ContractCall { entryPoint } } ... on RegularTransaction { identifiers block { height hash } transactionResult { status } } } }`;
export { verifyIndexedTransaction };
async function verifyIndexedTransaction(row, env) {
  const indexer = env.MIDNIGHT_INDEXER_URL || 'https://indexer.preprod.midnight.network/api/v4/graphql';
  try {
    const response = await fetch(indexer, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: TX_STATUS_QUERY, variables: { transactionId: row.tx_hash } }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { state: 'unavailable', detail: `INDEXER_HTTP_${response.status}` };
    const payload = await response.json(); if (payload.errors) return { state: 'unavailable', detail: 'INDEXER_GRAPHQL_ERROR' };
    const transaction = payload.data?.transactions?.find((item) => item.__typename === 'RegularTransaction');
    if (!transaction) return { state: 'pending' };
    if (!transaction.identifiers?.map(String).map((item) => item.toLowerCase()).includes(row.tx_hash.toLowerCase())) return { state: 'failed', detail: 'TRANSACTION_IDENTIFIER_MISMATCH' };
    const matchingClaim = transaction.contractActions?.some((action) => action.__typename === 'ContractCall' && action.address === row.contract_address && action.entryPoint === 'claim');
    if (transaction.transactionResult?.status === 'SUCCESS' && matchingClaim) return { state: 'confirmed', blockReference: String(transaction.block?.height || transaction.block?.hash || row.block_reference || '') };
    if (transaction.transactionResult?.status === 'SUCCESS') return { state: 'failed', detail: 'CLAIM_CONTRACT_ACTION_MISMATCH' };
    if (transaction.transactionResult?.status === 'FAILURE') return { state: 'failed', detail: 'CHAIN_TRANSACTION_FAILED' };
    return { state: 'pending', detail: transaction.transactionResult?.status || 'INDEXER_PENDING' };
  } catch (error) { return { state: 'unavailable', detail: String(error?.message || error).slice(0, 200) }; }
}
async function initialize(db) { await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, organization TEXT NOT NULL, program TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS claim_events (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, created_at TEXT NOT NULL)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_claim_events_type ON claim_events(event_type)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS claim_records (id TEXT PRIMARY KEY, program_id TEXT NOT NULL, nullifier TEXT NOT NULL, commitment TEXT NOT NULL, wallet_kind TEXT NOT NULL, status TEXT NOT NULL, issued_at TEXT NOT NULL, signature TEXT NOT NULL)`),
  db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_records_program_nullifier ON claim_records(program_id, nullifier)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS program_inventory (program_id TEXT PRIMARY KEY, capacity INTEGER NOT NULL CHECK (capacity >= 0), allocated INTEGER NOT NULL DEFAULT 0 CHECK (allocated >= 0 AND allocated <= capacity))`),
  db.prepare(`CREATE TABLE IF NOT EXISTS programs (id TEXT PRIMARY KEY, name TEXT NOT NULL, capacity INTEGER NOT NULL, min_age INTEGER NOT NULL, jurisdiction INTEGER NOT NULL, min_household_size INTEGER NOT NULL, max_annual_income INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1, policy_hash TEXT)`),
  ...PROGRAMS.flatMap((program) => [
    db.prepare(`INSERT OR IGNORE INTO programs (id,name,capacity,min_age,jurisdiction,min_household_size,max_annual_income) VALUES (?,?,?,?,?,?,?)`).bind(program.id, program.name, program.capacity, program.minAge, program.jurisdiction, program.minHouseholdSize, program.maxAnnualIncome),
    db.prepare(`INSERT OR IGNORE INTO program_inventory (program_id,capacity,allocated) VALUES (?,?,0)`).bind(program.id, program.capacity)
  ])
]);
  const columns = await db.prepare(`PRAGMA table_info(claim_records)`).all(); const names = new Set((columns.results || []).map((column) => column.name));
  const migrations = [
    ['tx_hash', `ALTER TABLE claim_records ADD COLUMN tx_hash TEXT`], ['tx_network', `ALTER TABLE claim_records ADD COLUMN tx_network TEXT`],
    ['tx_status', `ALTER TABLE claim_records ADD COLUMN tx_status TEXT`], ['reserved_until', `ALTER TABLE claim_records ADD COLUMN reserved_until TEXT`],
    ['redeemed_at', `ALTER TABLE claim_records ADD COLUMN redeemed_at TEXT`], ['updated_at', `ALTER TABLE claim_records ADD COLUMN updated_at TEXT`],
    ['contract_address', `ALTER TABLE claim_records ADD COLUMN contract_address TEXT`], ['block_reference', `ALTER TABLE claim_records ADD COLUMN block_reference TEXT`],
    ['policy_hash', `ALTER TABLE claim_records ADD COLUMN policy_hash TEXT`], ['proof_mode', `ALTER TABLE claim_records ADD COLUMN proof_mode TEXT DEFAULT 'legacy-simulated'`],
    ['verification_error', `ALTER TABLE claim_records ADD COLUMN verification_error TEXT`], ['verification_attempted_at', `ALTER TABLE claim_records ADD COLUMN verification_attempted_at TEXT`],
    ['chain_confirmed_at', `ALTER TABLE claim_records ADD COLUMN chain_confirmed_at TEXT`]
  ].filter(([name]) => !names.has(name)).map(([, sql]) => db.prepare(sql)); if (migrations.length) await db.batch(migrations);
  await db.batch([
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_records_tx_hash ON claim_records(tx_hash) WHERE tx_hash IS NOT NULL`),
    db.prepare(`DROP TRIGGER IF EXISTS trg_claim_records_capacity_guard`), db.prepare(`DROP TRIGGER IF EXISTS trg_claim_records_allocate`),
    db.prepare(`DROP TRIGGER IF EXISTS trg_claim_records_capacity_guard_v2`), db.prepare(`DROP TRIGGER IF EXISTS trg_claim_records_allocate_v2`), db.prepare(`DROP TRIGGER IF EXISTS trg_claim_records_release_v2`),
    db.prepare(`DROP TRIGGER IF EXISTS trg_claim_records_capacity_guard_v3`), db.prepare(`DROP TRIGGER IF EXISTS trg_claim_records_allocate_v3`), db.prepare(`DROP TRIGGER IF EXISTS trg_claim_records_release_v3`),
    db.prepare(`CREATE TRIGGER IF NOT EXISTS trg_claim_records_capacity_guard_v4 BEFORE INSERT ON claim_records FOR EACH ROW WHEN NEW.status IN ('reserved','claim_pending','claim_confirmed','pending_review') AND COALESCE((SELECT allocated >= capacity FROM program_inventory WHERE program_id = NEW.program_id), 1) BEGIN SELECT RAISE(ABORT, 'PROGRAM_CAPACITY_REACHED'); END`),
    db.prepare(`CREATE TRIGGER IF NOT EXISTS trg_claim_records_allocate_v4 AFTER INSERT ON claim_records FOR EACH ROW WHEN NEW.status IN ('reserved','claim_pending','claim_confirmed','pending_review') BEGIN UPDATE program_inventory SET allocated = allocated + 1 WHERE program_id = NEW.program_id; END`),
    db.prepare(`CREATE TRIGGER IF NOT EXISTS trg_claim_records_release_v4 AFTER UPDATE OF status ON claim_records FOR EACH ROW WHEN OLD.status IN ('reserved','claim_pending','claim_confirmed','pending_review') AND NEW.status IN ('released','expired') BEGIN UPDATE program_inventory SET allocated = MAX(0, allocated - 1) WHERE program_id = NEW.program_id; END`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_claim_records_reservations ON claim_records(status, reserved_until)`)
  ]);
}
async function signingKeys(db) {
  const existing = await db.prepare(`SELECT value FROM settings WHERE key = ?`).bind('receipt_signing_key_v1').first(); let stored = existing?.value;
  if (!stored) { const generated = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']); const privateJwk = await crypto.subtle.exportKey('jwk', generated.privateKey); stored = JSON.stringify(privateJwk); try { await db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`).bind('receipt_signing_key_v1', stored).run(); } catch { stored = (await db.prepare(`SELECT value FROM settings WHERE key = ?`).bind('receipt_signing_key_v1').first()).value; } }
  const privateJwk = JSON.parse(stored); const publicJwk = { kty: privateJwk.kty, crv: privateJwk.crv, x: privateJwk.x, y: privateJwk.y, ext: true, key_ops: ['verify'] };
  return { privateKey: await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']), publicKey: await crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']), publicJwk };
}
function receiptFromRow(row) { const legacy = !row.updated_at; return { id: row.id, programId: row.program_id, commitment: row.commitment, status: row.status, issuedAt: row.issued_at, issuer: legacy ? 'Alethia Claim Ledger v1' : 'Alethia Claim Ledger v4', proofMode: row.proof_mode || 'legacy-simulated', ...(row.reserved_until ? { reservedUntil: row.reserved_until } : {}), ...(row.tx_hash ? { txHash: row.tx_hash, txNetwork: row.tx_network, txStatus: row.tx_status } : {}), ...(row.contract_address ? { contractAddress: row.contract_address } : {}), ...(row.block_reference ? { blockReference: row.block_reference } : {}), ...(row.policy_hash ? { policyHash: row.policy_hash } : {}), ...(row.redeemed_at ? { redeemedAt: row.redeemed_at } : {}), ...(row.chain_confirmed_at ? { chainConfirmedAt: row.chain_confirmed_at } : {}) }; }
async function signReceipt(receipt, keys) { return base64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, encoder.encode(JSON.stringify(receipt)))); }
async function persistReconciledRow(db, row, verification) {
  const now = new Date().toISOString(); let status = row.status; let txStatus = row.tx_status || 'submitted';
  if (verification.state === 'confirmed') { status = 'claim_confirmed'; txStatus = 'confirmed'; }
  else if (verification.state === 'failed') { status = 'released'; txStatus = 'failed'; }
  else if (verification.state === 'unavailable' && row.reserved_until && row.reserved_until < now) status = 'pending_review';
  else status = 'claim_pending';
  const updated = { ...row, status, tx_status: txStatus, block_reference: verification.blockReference || row.block_reference, verification_error: verification.detail || null, verification_attempted_at: now, chain_confirmed_at: status === 'claim_confirmed' ? now : row.chain_confirmed_at };
  const keys = await signingKeys(db); const receipt = receiptFromRow(updated); const signature = await signReceipt(receipt, keys);
  await db.prepare(`UPDATE claim_records SET status=?,tx_status=?,block_reference=?,verification_error=?,verification_attempted_at=?,chain_confirmed_at=?,signature=?,updated_at=? WHERE id=?`).bind(status, txStatus, updated.block_reference, updated.verification_error, now, updated.chain_confirmed_at, signature, now, row.id).run();
  return { row: updated, receipt, signature, publicKey: keys.publicJwk };
}
async function reconcileRow(db, row, env) {
  const now = new Date().toISOString();
  if (!row.tx_hash) {
    if (row.status === 'reserved' && row.reserved_until < now) { await db.prepare(`UPDATE claim_records SET status='expired',updated_at=? WHERE id=? AND status='reserved'`).bind(now, row.id).run(); return { row: { ...row, status: 'expired' } }; }
    return { row };
  }
  if (row.status === 'claim_confirmed' || row.status === 'released') return { row };
  return persistReconciledRow(db, row, await verifyIndexedTransaction(row, env));
}
async function handleClaimPost(request, env) {
  const body = await request.json().catch(() => null);
  const proofMode = body?.proofMode === 'midnight-compact' ? 'midnight-compact' : body?.proofMode === 'simulation' ? 'simulation' : null;
  if (!body || !PROGRAMS.some(({ id }) => id === body.programId) || !isHex64(body.nullifier) || !isHex64(body.commitment) || !proofMode) return json({ error: 'The proof envelope is invalid.' }, 400);
  const db = env.DB; await initialize(db); const keys = await signingKeys(db); const issuedAt = new Date().toISOString(); const reservedUntil = proofMode === 'midnight-compact' ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
  const row = { id: crypto.randomUUID(), program_id: body.programId, commitment: body.commitment, wallet_kind: proofMode, proof_mode: proofMode, status: reservedUntil ? 'reserved' : 'claim_confirmed', issued_at: issuedAt, reserved_until: reservedUntil, updated_at: issuedAt, tx_status: proofMode === 'simulation' ? 'simulated' : null }; const receipt = receiptFromRow(row); const signature = await signReceipt(receipt, keys);
  try { await db.batch([db.prepare(`INSERT INTO claim_records (id, program_id, nullifier, commitment, wallet_kind, proof_mode, status, issued_at, signature, reserved_until, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(row.id, body.programId, body.nullifier, body.commitment, proofMode, proofMode, row.status, issuedAt, signature, reservedUntil, issuedAt), db.prepare(`INSERT INTO claim_events (id, event_type, created_at) VALUES (?, ?, ?)`).bind(crypto.randomUUID(), reservedUntil ? 'compact_reserved' : 'simulation_accepted', issuedAt)]); return json({ receipt, signature, publicKey: keys.publicJwk }, 201); }
  catch (error) { const message = String(error).toLowerCase(); if (message.includes('program_capacity_reached')) return json({ error: 'This program has allocated all available supplies.', code: 'PROGRAM_FULL' }, 409); if (message.includes('unique')) { await db.prepare(`INSERT INTO claim_events (id, event_type, created_at) VALUES (?, ?, ?)`).bind(crypto.randomUUID(), 'duplicate_blocked', new Date().toISOString()).run(); return json({ error: 'This program-scoped nullifier was already used.', code: 'DUPLICATE_CLAIM' }, 409); } throw error; }
}
async function handleClaimPatch(request, env) {
  const body = await request.json().catch(() => null); if (!body || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id || '') || !/^[a-f0-9]{66}$/i.test(body.txHash || '') || body.network !== 'preprod' || !/^[a-f0-9]{64}$/i.test(body.contractAddress || '')) return json({ error: 'Complete Compact Preprod transaction evidence is required.' }, 400);
  const expectedContract = env.ALETHEIA_CONTRACT_ADDRESS; if (!expectedContract) return json({ error: 'Server contract configuration is unavailable.', code: 'CONTRACT_NOT_CONFIGURED' }, 503); if (body.contractAddress !== expectedContract) return json({ error: 'Transaction contract does not match the configured Aletheia contract.', code: 'CONTRACT_MISMATCH' }, 409);
  const db = env.DB; await initialize(db); let row = await db.prepare(`SELECT * FROM claim_records WHERE id = ?`).bind(body.id).first(); if (!row) return json({ error: 'Claim reservation not found.' }, 404); if (row.proof_mode !== 'midnight-compact') return json({ error: 'Only Compact reservations accept transaction evidence.' }, 409);
  const txHash = body.txHash.toLowerCase(); if (row.tx_hash && row.tx_hash !== txHash) return json({ error: 'This reservation is already associated with another transaction.', code: 'TRANSACTION_MISMATCH' }, 409);
  if (!row.tx_hash) {
    const now = new Date().toISOString(); if (row.status !== 'reserved' || !row.reserved_until || row.reserved_until < now) { await reconcileRow(db, row, env); return json({ error: 'This claim reservation has expired.', code: 'RESERVATION_EXPIRED' }, 409); }
    try { await db.batch([db.prepare(`UPDATE claim_records SET status='claim_pending',tx_hash=?,tx_network='preprod',tx_status='submitted',contract_address=?,block_reference=?,updated_at=? WHERE id=? AND status='reserved' AND reserved_until>=?`).bind(txHash, expectedContract, String(body.blockReference || '').slice(0, 200), now, body.id, now), db.prepare(`INSERT INTO claim_events (id,event_type,created_at) VALUES (?,'compact_submitted',?)`).bind(crypto.randomUUID(), now)]); }
    catch (error) { if (String(error).toLowerCase().includes('unique')) return json({ error: 'This transaction is already attached to another claim.', code: 'TRANSACTION_ALREADY_USED' }, 409); throw error; }
    row = await db.prepare(`SELECT * FROM claim_records WHERE id = ?`).bind(body.id).first(); if (row.tx_hash !== txHash) return json({ error: 'This reservation changed before transaction evidence could be attached.', code: 'RESERVATION_CONFLICT' }, 409);
  }
  const reconciled = await reconcileRow(db, row, env); const status = reconciled.row.status === 'claim_confirmed' ? 200 : 202; return json({ receipt: reconciled.receipt || receiptFromRow(reconciled.row), signature: reconciled.signature || reconciled.row.signature, publicKey: reconciled.publicKey, confirmation: reconciled.row.tx_status }, status);
}
async function handlePrograms(env) { const db = env.DB; await initialize(db); const rows = await db.prepare(`SELECT p.*, i.allocated FROM programs p JOIN program_inventory i ON i.program_id = p.id WHERE p.active = 1 ORDER BY p.capacity DESC`).all(); return json({ programs: (rows.results || []).map((p) => ({ id: p.id, name: p.name, capacity: p.capacity, allocated: p.allocated, remaining: Math.max(0, p.capacity - p.allocated), policy: { minAge: p.min_age, jurisdiction: p.jurisdiction, minHouseholdSize: p.min_household_size, maxAnnualIncome: p.max_annual_income }, policyHash: p.policy_hash })) }); }
async function handleClaimGet(url, env) {
  const id = url.searchParams.get('id'); if (!id) return json({ error: 'Receipt id is required.' }, 400); const db = env.DB; await initialize(db);
  let row = await db.prepare(`SELECT * FROM claim_records WHERE id = ?`).bind(id).first(); if (!row) return json({ valid: false, error: 'Receipt not found.' }, 404);
  const reconciled = await reconcileRow(db, row, env); row = reconciled.row; const receipt = reconciled.receipt || receiptFromRow(row); const keys = await signingKeys(db); const signature = reconciled.signature || row.signature;
  return json({ valid: await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keys.publicKey, fromBase64(signature), encoder.encode(JSON.stringify(receipt))), receipt, signature, publicKey: keys.publicJwk });
}
async function handleStats(env) {
  const db = env.DB; await initialize(db);
  const claims = await db.prepare(`SELECT COUNT(*) AS total FROM claim_records WHERE status = ?`).bind('claim_confirmed').first();
  const duplicates = await db.prepare(`SELECT COUNT(*) AS total FROM claim_events WHERE event_type = ?`).bind('duplicate_blocked').first();
  const inventory = await db.prepare(`SELECT SUM(capacity) AS capacity, SUM(allocated) AS allocated FROM program_inventory WHERE program_id IN (?,?,?)`).bind(...PROGRAMS.map(({ id }) => id)).first();
  const validClaims = Number(claims?.total || 0); const duplicateClaimsStopped = Number(duplicates?.total || 0); const attemptedClaims = validClaims + duplicateClaimsStopped;
  const supplyCapacity = Number(inventory?.capacity || 0); const allocatedSupplies = Number(inventory?.allocated || 0); const remainingSupplies = Math.max(0, supplyCapacity - allocatedSupplies);
  return json({ validClaims, duplicateClaimsStopped, attemptedClaims, privateFieldsPublished: 0, supplyCapacity, allocatedSupplies, remainingSupplies, updatedAt: new Date().toISOString() });
}
async function handleInquiry(request, env) {
  const body = await request.json().catch(() => null); const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const item = { id: crypto.randomUUID(), name: clean(body?.name, 120), email: clean(body?.email, 200), organization: clean(body?.organization, 200), program: clean(body?.program, 100), message: clean(body?.message, 3000), createdAt: new Date().toISOString() };
  if (body?.contactConsent !== 'yes') return json({ error: 'Consent is required before contact details are stored.' }, 400);
  if (!/^\S+@\S+\.\S+$/.test(item.email) || !item.message) return json({ error: 'A valid contact email and message are required.' }, 400);
  const db = env.DB; await initialize(db); await db.prepare(`INSERT INTO inquiries (id, name, email, organization, program, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(item.id, item.name, item.email, item.organization, item.program, item.message, item.createdAt).run(); return json({ ok: true, reference: `ALT-${item.id.slice(0, 8).toUpperCase()}` }, 201);
}
export default { async fetch(request, env) { try { const url = new URL(request.url); if (!env?.DB && url.pathname.startsWith('/api/')) return json({ error: 'The claim database is not configured.' }, 503); if (url.pathname === '/api/claims' && request.method === 'POST') return handleClaimPost(request, env); if (url.pathname === '/api/claims' && request.method === 'PATCH') return handleClaimPatch(request, env); if (url.pathname === '/api/claims' && request.method === 'GET') return handleClaimGet(url, env); if (url.pathname === '/api/programs' && request.method === 'GET') return handlePrograms(env); if (url.pathname === '/api/inquiries' && request.method === 'POST') return handleInquiry(request, env); if (url.pathname === '/api/stats' && request.method === 'GET') return handleStats(env); if (url.pathname === '/api/health') { const configured = /^[a-f0-9]{64}$/i.test(env.ALETHEIA_CONTRACT_ADDRESS || ''); return json({ ok: true, service: 'aletheia', apiVersion: 4, mode: 'compact-ready-private-allocation', receiptAlgorithm: 'ECDSA P-256 / SHA-256', midnightNetwork: 'preprod', midnightCompact: configured, contractAddress: configured ? env.ALETHEIA_CONTRACT_ADDRESS.toLowerCase() : null }); } return env?.ASSETS?.fetch ? env.ASSETS.fetch(request) : new Response('Alethia is ready.', { headers: { 'content-type': 'text/plain; charset=utf-8' } }); } catch { return json({ error: 'Alethia could not complete this request.' }, 500); } } };
