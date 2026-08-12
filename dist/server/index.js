const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const encoder = new TextEncoder();
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS }); }
function base64(bytes) { let value = ''; new Uint8Array(bytes).forEach((b) => value += String.fromCharCode(b)); return btoa(value); }
function fromBase64(value) { return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)); }
function isHex64(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }
async function initialize(db) { await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS claims (id TEXT PRIMARY KEY, program_id TEXT NOT NULL, wallet_id TEXT NOT NULL, nullifier TEXT NOT NULL, commitment TEXT NOT NULL, wallet_kind TEXT NOT NULL, status TEXT NOT NULL, issued_at TEXT NOT NULL, signature TEXT NOT NULL)`),
  db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_program_nullifier ON claims(program_id, nullifier)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, organization TEXT NOT NULL, program TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL)`)
]); }
async function signingKeys(db) {
  const existing = await db.prepare(`SELECT value FROM settings WHERE key = ?`).bind('receipt_signing_key_v1').first(); let stored = existing?.value;
  if (!stored) { const generated = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']); const privateJwk = await crypto.subtle.exportKey('jwk', generated.privateKey); stored = JSON.stringify(privateJwk); try { await db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`).bind('receipt_signing_key_v1', stored).run(); } catch { stored = (await db.prepare(`SELECT value FROM settings WHERE key = ?`).bind('receipt_signing_key_v1').first()).value; } }
  const privateJwk = JSON.parse(stored); const publicJwk = { kty: privateJwk.kty, crv: privateJwk.crv, x: privateJwk.x, y: privateJwk.y, ext: true, key_ops: ['verify'] };
  return { privateKey: await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']), publicKey: await crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']), publicJwk };
}
async function handleClaimPost(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || body.programId !== 'emergency-relief-2026' || !isHex64(body.walletId) || !isHex64(body.nullifier) || !isHex64(body.commitment) || !['aletheia-test', 'midnight-preprod'].includes(body.walletKind)) return json({ error: 'The proof envelope is invalid.' }, 400);
  const db = env.DB; await initialize(db); const keys = await signingKeys(db);
  const receipt = { id: crypto.randomUUID(), programId: body.programId, commitment: body.commitment, status: 'accepted', issuedAt: new Date().toISOString(), issuer: 'Alethia Claim Ledger v1', proofMode: body.walletKind === 'midnight-preprod' ? 'midnight-wallet-connected' : 'browser-test' };
  const signature = base64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, encoder.encode(JSON.stringify(receipt))));
  try { await db.prepare(`INSERT INTO claims (id, program_id, wallet_id, nullifier, commitment, wallet_kind, status, issued_at, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(receipt.id, body.programId, body.walletId, body.nullifier, body.commitment, body.walletKind, receipt.status, receipt.issuedAt, signature).run(); return json({ receipt, signature, publicKey: keys.publicJwk }, 201); }
  catch (error) { if (String(error).toLowerCase().includes('unique')) return json({ error: 'This wallet has already claimed this program benefit.', code: 'DUPLICATE_CLAIM' }, 409); throw error; }
}
async function handleClaimGet(url, env) {
  const id = url.searchParams.get('id'); if (!id) return json({ error: 'Receipt id is required.' }, 400); const db = env.DB; await initialize(db);
  const row = await db.prepare(`SELECT id, program_id, commitment, wallet_kind, status, issued_at, signature FROM claims WHERE id = ?`).bind(id).first(); if (!row) return json({ valid: false, error: 'Receipt not found.' }, 404);
  const receipt = { id: row.id, programId: row.program_id, commitment: row.commitment, status: row.status, issuedAt: row.issued_at, issuer: 'Alethia Claim Ledger v1', proofMode: row.wallet_kind === 'midnight-preprod' ? 'midnight-wallet-connected' : 'browser-test' }; const keys = await signingKeys(db);
  return json({ valid: await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keys.publicKey, fromBase64(row.signature), encoder.encode(JSON.stringify(receipt))), receipt, signature: row.signature, publicKey: keys.publicJwk });
}
async function handleInquiry(request, env) {
  const body = await request.json().catch(() => null); const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const item = { id: crypto.randomUUID(), name: clean(body?.name, 120), email: clean(body?.email, 200), organization: clean(body?.organization, 200), program: clean(body?.program, 100), message: clean(body?.message, 3000), createdAt: new Date().toISOString() };
  if (!item.name || !/^\S+@\S+\.\S+$/.test(item.email) || !item.message) return json({ error: 'Name, a valid email, and a message are required.' }, 400);
  const db = env.DB; await initialize(db); await db.prepare(`INSERT INTO inquiries (id, name, email, organization, program, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(item.id, item.name, item.email, item.organization, item.program, item.message, item.createdAt).run(); return json({ ok: true, reference: `ALT-${item.id.slice(0, 8).toUpperCase()}` }, 201);
}
export default { async fetch(request, env) { try { const url = new URL(request.url); if (!env?.DB && url.pathname.startsWith('/api/')) return json({ error: 'The claim database is not configured.' }, 503); if (url.pathname === '/api/claims' && request.method === 'POST') return handleClaimPost(request, env); if (url.pathname === '/api/claims' && request.method === 'GET') return handleClaimGet(url, env); if (url.pathname === '/api/inquiries' && request.method === 'POST') return handleInquiry(request, env); if (url.pathname === '/api/health') return json({ ok: true, service: 'aletheia', receiptAlgorithm: 'ECDSA P-256 / SHA-256' }); return env?.ASSETS?.fetch ? env.ASSETS.fetch(request) : new Response('Alethia is ready.', { headers: { 'content-type': 'text/plain; charset=utf-8' } }); } catch (error) { return json({ error: 'Alethia could not complete this request.', detail: String(error?.message || error) }, 500); } } };