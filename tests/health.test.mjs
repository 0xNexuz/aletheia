import test from 'node:test';
import assert from 'node:assert/strict';

process.env.ALETHIA_API_ORIGIN = 'https://backend.example';
process.env.ALETHIA_SITES_TOKEN = 'test-server-only-token';
const { default: handler } = await import('../api/health.js');
const address = '7e4e3c18a2a139711f17085aef0aa66c953fa901900ab66895c9a26cca257fa5';

function response() {
  return { headers: {}, code: 200, body: null,
    status(code) { this.code = code; return this; },
    setHeader(key, value) { this.headers[key] = value; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
  };
}

test('health advertises the hosted contract, preserves backend status and excludes secrets', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.headers['OAI-Sites-Authorization'], 'Bearer test-server-only-token');
    return Response.json({ ok: true, midnightCompact: false, receiptAlgorithm: 'test' });
  });
  const old = process.env.ALETHEIA_CONTRACT_ADDRESS;
  t.after(() => { if (old === undefined) delete process.env.ALETHEIA_CONTRACT_ADDRESS; else process.env.ALETHEIA_CONTRACT_ADDRESS = old; });
  process.env.ALETHEIA_CONTRACT_ADDRESS = address.toUpperCase();
  const res = response();
  await handler({ method: 'GET', url: '/api/health' }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.receiptAlgorithm, 'test');
  assert.equal(res.body.contractAddress, address);
  assert.equal(res.body.midnightNetwork, 'preprod');
  assert.equal(res.body.midnightCompact, true);
  assert.equal(res.body.midnightChainVerified, false);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.doesNotMatch(JSON.stringify(res.body), /test-server-only-token/);
});

test('health fails closed for missing or invalid hosted addresses, even with stale upstream data', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ok: true, midnightCompact: true, contractAddress: address }));
  const old = process.env.ALETHEIA_CONTRACT_ADDRESS;
  t.after(() => { if (old === undefined) delete process.env.ALETHEIA_CONTRACT_ADDRESS; else process.env.ALETHEIA_CONTRACT_ADDRESS = old; });
  for (const value of ['', 'not-an-address', 'ab'.repeat(31), 'ab'.repeat(33)]) {
    process.env.ALETHEIA_CONTRACT_ADDRESS = value;
    const res = response();
    await handler({ method: 'GET', url: '/api/health' }, res);
    assert.equal(res.body.midnightCompact, false);
    assert.equal(res.body.contractAddress, null);
  }
});

test('health preserves upstream failure and redacts transport/parse failures', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Unavailable' }, { status: 503 }));
  let res = response();
  await handler({ method: 'GET', url: '/api/health' }, res);
  assert.equal(res.code, 503);
  assert.equal(JSON.parse(res.body).error, 'Unavailable');
  for (const implementation of [async () => { throw new Error('private upstream detail'); }, async () => new Response('not json')]) {
    mock.mock.mockImplementation(implementation);
    res = response();
    await handler({ method: 'GET', url: '/api/health' }, res);
    assert.equal(res.code, 502);
    assert.doesNotMatch(JSON.stringify(res.body), /private upstream detail|not json/);
  }
});

test('health rejects mutation methods without contacting the backend', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not call'); });
  const res = response();
  await handler({ method: 'POST', url: '/api/health' }, res);
  assert.equal(res.code, 405);
  assert.equal(res.headers.allow, 'GET');
  assert.equal(mock.mock.callCount(), 0);
});
