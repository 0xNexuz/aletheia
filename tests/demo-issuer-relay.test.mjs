import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_ISSUER_ORIGIN as origin, relayDemoCredential } from '../lib/demo-issuer-relay.js';
const issued = { providerId: '1', publicKey: { x: '12', y: '34' }, profile: 'eligible', credential: { age: '34', jurisdiction: '566', householdSize: '4', annualIncome: '1800000', credentialId: 'ab'.repeat(32) }, signature: { announcement: { x: '56', y: '78' }, response: '90' } };

test('relay only sends the commitment and profile to the approved destination', async () => {
  const result = await relayDemoCredential('POST', { subjectHash: '123', walletSeed: 'never-forward' }, origin, async (url, options) => {
    assert.equal(url, origin + '/api/credentials');
    assert.deepEqual(JSON.parse(options.body), { subjectHash: '123', profile: 'eligible' });
    assert.deepEqual(options.headers, { 'content-type': 'application/json' });
    assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); assert.ok(options.signal);
    return Response.json({ ...issued, extra: 'not-returned' });
  });
  assert.deepEqual(result, { status: 201, body: issued });
});
test('relay rejects unapproved destinations and bad inputs without a network call', async () => {
  let calls = 0; const request = async () => { calls++; return Response.json(issued); };
  await assert.rejects(relayDemoCredential('GET', {}, 'https://example.com', request), /Unsupported/);
  assert.equal((await relayDemoCredential('DELETE', {}, origin, request)).status, 405);
  for (const body of [{ subjectHash: '-1' }, { subjectHash: 1 }, { subjectHash: '1', profile: 'real-person' }]) assert.equal((await relayDemoCredential('POST', body, origin, request)).status, 400);
  assert.equal(calls, 0);
});
test('public GET returns only public metadata and failures do not reflect upstream details', async () => {
  const result = await relayDemoCredential('GET', {}, origin, async () => Response.json({ ...issued, secret: 'not-returned' }));
  assert.equal(result.status, 200); assert.deepEqual(result.body.publicKey, issued.publicKey); assert.equal(result.body.secret, undefined); assert.equal(result.body.credential, undefined);
  for (const request of [async () => { throw Error('private-detail'); }, async () => new Response('private-detail', { status: 500 }), async () => Response.json({ ...issued, signature: {} }), async () => new Response('not-json')]) {
    const failed = await relayDemoCredential('POST', { subjectHash: '123' }, origin, request);
    assert.equal(failed.status, 503); assert.doesNotMatch(JSON.stringify(failed), /private-detail/);
  }
});
