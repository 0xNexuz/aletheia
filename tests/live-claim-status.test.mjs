import test from 'node:test';
import assert from 'node:assert/strict';
import { assertClaimRecord, lookupLiveClaim, verifyClaimLedger } from '../src/live-claim-status.js';
import { deploymentArguments, verifyDeploymentSetup, PROGRAM_POLICIES } from '../src/deployment-setup.js';

const claim = { contractAddress: 'ab'.repeat(32), nullifier: 'cd'.repeat(32), pendingTransactionId: '00' + 'ef'.repeat(32), programId: 'food-support-2026' };
const transaction = { hash: 'aa'.repeat(32), identifiers: [claim.pendingTransactionId], transactionResult: { status: 'SUCCESS' }, block: { height: 42 }, contractActions: [{ __typename: 'ContractCall', address: claim.contractAddress }] };
const response = (transactions) => async () => Response.json({ data: { transactions } });

test('live claim lookup requires exact ID, successful call, and matching contract', async () => {
  assert.equal((await lookupLiveClaim(claim, response([transaction]))).status, 'transaction-confirmed');
  assert.equal((await lookupLiveClaim(claim, response([]))).status, 'unconfirmed');
  for (const patch of [
    { transactionResult: { status: 'FAILURE' } },
    { contractActions: [{ __typename: 'ContractDeploy', address: claim.contractAddress }] },
    { contractActions: [{ __typename: 'ContractCall', address: '11'.repeat(32) }] }
  ]) assert.equal((await lookupLiveClaim(claim, response([{ ...transaction, ...patch }]))).status, 'indexed-review-required');
  await assert.rejects(lookupLiveClaim(claim, response([{ ...transaction, identifiers: ['other'] }])), /different transaction/);
});

test('malformed records and indexer errors fail closed', async () => {
  assert.throws(() => assertClaimRecord(claim, '11'.repeat(32)), /valid saved/);
  await assert.rejects(lookupLiveClaim({ ...claim, pendingTransactionId: '' }, response([])), /valid saved/);
  await assert.rejects(lookupLiveClaim(claim, async () => Response.json({ errors: [{ message: 'error' }] })), /check failed/);
  await assert.rejects(lookupLiveClaim(claim, async () => new Response('', { status: 503 })), /unavailable/);
});

test('confirmation requires public eligibility and the exact program in contract state', () => {
  const id = new Uint8Array(32).fill(1);
  const state = { usedNullifiers: { member: () => true }, claims: { member: () => true, lookup: () => ({ eligible: true, programId: id }) } };
  assert.doesNotThrow(() => verifyClaimLedger(state, id, id));
  assert.throws(() => verifyClaimLedger(state, id, new Uint8Array(32).fill(2)), /does not match/);
  assert.throws(() => verifyClaimLedger({ ...state, usedNullifiers: { member: () => false } }, id, id), /not verified/);
  assert.throws(() => verifyClaimLedger({ ...state, claims: { member: () => true, lookup: () => ({ eligible: false, programId: id }) } }, id, id), /does not match/);
});

test('constructor arguments use all three stable program hashes', async () => {
  const ids = [];
  const args = await deploymentArguments({ providerId: '1', publicKey: { x: '12', y: '34' } }, async id => { ids.push(id); return new Uint8Array(32); });
  assert.equal(args[0], 1n);
  assert.deepEqual(args[1], { x: 12n, y: 34n });
  assert.deepEqual(ids, PROGRAM_POLICIES.map(([id]) => id));
  await assert.rejects(deploymentArguments({ providerId: '65536', publicKey: { x: '12', y: '34' } }, () => {}), /invalid/);
  await assert.rejects(deploymentArguments({ providerId: '1', publicKey: { x: '0', y: '1' } }, () => {}), /invalid/);
});

test('setup verification is read-only and rejects unconfigured or mismatched deployments', async () => {
  const issuer = { providerId: '1', publicKey: { x: '12', y: '34' } };
  const policies = new Map(PROGRAM_POLICIES);
  const state = { providers: { member: () => true, lookup: () => ({ x: 12n, y: 34n }) }, programs: { member: id => policies.has(id), lookup: id => policies.get(id) } };
  const options = { issuer, programBytes: async id => id, readLedger: async () => state };
  await verifyDeploymentSetup(options);
  policies.delete(PROGRAM_POLICIES[1][0]);
  await assert.rejects(verifyDeploymentSetup(options), /not preconfigured/);
  state.providers.lookup = () => ({ x: 0n, y: 1n });
  await assert.rejects(verifyDeploymentSetup(options), /expected issuer/);
});
