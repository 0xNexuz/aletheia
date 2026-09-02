import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupDeployment, prepareRetry, submitTracked } from '../src/deployment-status.js';

const id = '00' + 'ab'.repeat(32);
const response = (transactions) => async () => ({ ok: true, json: async () => ({ data: { transactions } }) });

test('missing transaction stays unconfirmed, not failed or safe-to-retry', async () => {
  assert.deepEqual(await lookupDeployment(id, response([])), { status: 'unconfirmed', identifier: id });
});
test('only a matching successful deployment produces a recovered address', async () => {
  const tx = { identifiers: [id], hash: 'bc'.repeat(32), transactionResult: { status: 'SUCCESS' }, block: { height: 42 }, contractActions: [{ __typename: 'ContractDeploy', address: 'cd'.repeat(32) }] };
  assert.equal((await lookupDeployment(id, response([tx]))).contractAddress, 'cd'.repeat(32));
  assert.equal((await lookupDeployment(id, response([{ ...tx, transactionResult: { status: 'FAILURE' } }]))).status, 'indexed-review-required');
  await assert.rejects(lookupDeployment(id, response([{ ...tx, identifiers: [] }])), /did not match/);
});
test('indexer errors never permit retry', async () => {
  await assert.rejects(lookupDeployment('bad', response([])), /invalid/);
  await assert.rejects(lookupDeployment(id, async () => ({ ok: false })), /unavailable/);
  await assert.rejects(lookupDeployment(id, async () => ({ ok: true, json: async () => ({ errors: [{}] }) })), /check failed/);
});
test('pending state is durable before broadcast and acceptance is not chain confirmation', async () => {
  const events = [];
  await submitTracked({ identifier: id, tx: 'sealed-test-tx', checkpoint: (value) => events.push(value), submit: async () => {
    assert.equal(events[0].submissionStatus, 'requested'); return id;
  } });
  assert.equal(events[1].submissionStatus, 'wallet-accepted-awaiting-chain');
});
test('submission failure preserves pending identity and redacts long hex values', async () => {
  const events = [];
  await assert.rejects(submitTracked({ identifier: id, tx: 'test', checkpoint: (value) => events.push(value), submit: async () => { throw new Error('Rejected tx ' + 'cd'.repeat(32)); } }), /Submission stopped/);
  assert.equal(events[0].pendingTransactionId, id);
  assert.equal(events[1].submissionStatus, 'failed-or-unknown');
  assert.doesNotMatch(events[1].lastSubmissionError, /cdcdcd/);
  assert.equal(events.some((item) => item.started === false), false);
});
test('storage failure prevents wallet broadcast', async () => {
  let sent = false;
  await assert.rejects(submitTracked({ identifier: id, tx: 'test', checkpoint: () => { throw new Error('storage blocked'); }, submit: async () => { sent = true; } }), /storage blocked/);
  assert.equal(sent, false);
});

test('approved retry preserves the exact encrypted vault and archives the old ID without mutating it', () => {
  const record = { vault: { ciphertext: 'encrypted-test-value' }, started: true, pendingTransactionId: id, transactions: [], issuerIdentity: 'same-issuer' };
  const next = prepareRetry(record, { status: 'unconfirmed', identifier: id }, true);
  assert.equal(next.vault, record.vault);
  assert.equal(next.issuerIdentity, record.issuerIdentity);
  assert.equal(record.pendingTransactionId, id);
  assert.equal(record.started, true);
  assert.equal(next.previousAttempts[0].pendingTransactionId, id);
  assert.equal(next.started, false);
});
test('retry refuses absent consent, mismatched IDs, confirmed results and configured contracts', () => {
  const record = { started: true, pendingTransactionId: id, transactions: [] };
  const unconfirmed = { status: 'unconfirmed', identifier: id };
  assert.throws(() => prepareRetry(record, unconfirmed, false), /explicit approval/);
  assert.throws(() => prepareRetry(record, { ...unconfirmed, identifier: 'different' }, true), /exact unconfirmed/);
  assert.throws(() => prepareRetry(record, { ...unconfirmed, status: 'confirmed' }, true), /exact unconfirmed/);
  assert.throws(() => prepareRetry({ ...record, contractAddress: 'ab'.repeat(32) }, unconfirmed, true), /existing contract/);
});
