import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyIndexedTransaction } from '../dist/server/index.js';

const transactionId = `00${'ab'.repeat(32)}`;
const contractAddress = 'cd'.repeat(32);
const row = { tx_hash: transactionId, contract_address: contractAddress, block_reference: null };

function indexed(action) {
  return Response.json({ data: { transactions: [{
    __typename: 'RegularTransaction', identifiers: [transactionId], block: { height: 2391682, hash: 'ef'.repeat(32) },
    transactionResult: { status: 'SUCCESS' }, contractActions: [action],
  }] } });
}

test('backend confirms only the claim entry point at the configured contract', async (t) => {
  const request = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://indexer.preprod.midnight.network/api/v4/graphql');
    assert.match(JSON.parse(options.body).query, /entryPoint/);
    return indexed({ __typename: 'ContractCall', address: contractAddress, entryPoint: 'claim' });
  });
  const result = await verifyIndexedTransaction(row, {});
  assert.deepEqual(result, { state: 'confirmed', blockReference: '2391682' });
  assert.equal(request.mock.callCount(), 1);
});

test('backend rejects a successful unrelated contract action', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => indexed({ __typename: 'ContractCall', address: 'de'.repeat(32), entryPoint: 'configureProgram' }));
  assert.deepEqual(await verifyIndexedTransaction(row, {}), { state: 'failed', detail: 'CLAIM_CONTRACT_ACTION_MISMATCH' });
});
