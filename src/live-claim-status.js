import { PREPROD_INDEXER } from './deployment-status.js';

export function assertClaimRecord(claim, contractAddress) {
  if (!/^[a-f0-9]{64}$/i.test(contractAddress || '') || claim?.contractAddress !== contractAddress
    || !/^[a-f0-9]{64}$/i.test(claim?.nullifier || '') || claim?.programId !== 'food-support-2026'
    || !/^[a-f0-9]{66}$/i.test(claim?.pendingTransactionId || '')) throw new Error('No valid saved live-claim transaction to check.');
}

export async function lookupLiveClaim(claim, request = fetch) {
  assertClaimRecord(claim, claim?.contractAddress);
  const query = 'query ($id: HexEncoded!) { transactions(offset: {identifier: $id}) { hash block { height } contractActions { __typename address } ... on RegularTransaction { identifiers transactionResult { status } } } }';
  const response = await request(PREPROD_INDEXER, { method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ query, variables: { id: claim.pendingTransactionId } }) });
  if (!response.ok) throw new Error('The Preprod indexer is unavailable. The saved claim was kept.');
  const payload = await response.json();
  if (payload.errors?.length || !Array.isArray(payload.data?.transactions)) throw new Error('The claim check failed. No transaction was sent.');
  if (!payload.data.transactions.length) return { status: 'unconfirmed' };
  const tx = payload.data.transactions.find(item => item.identifiers?.includes(claim.pendingTransactionId));
  if (!tx) throw new Error('The indexer returned a different transaction.');
  if (tx.transactionResult?.status !== 'SUCCESS' || !tx.contractActions?.some(action => action.__typename === 'ContractCall' && action.address === claim.contractAddress)) return { status: 'indexed-review-required' };
  return { status: 'transaction-confirmed', transactionHash: tx.hash, blockHeight: tx.block.height };
}

export function verifyClaimLedger(state, nullifierBytes, programBytes) {
  if (!state.usedNullifiers.member(nullifierBytes) || !state.claims.member(nullifierBytes)) throw new Error('The claim is not verified in contract state yet. No additional claim was sent.');
  const claim = state.claims.lookup(nullifierBytes);
  if (claim.eligible !== true || claim.programId.length !== programBytes.length || !claim.programId.every((byte, index) => byte === programBytes[index])) throw new Error('The indexed claim does not match the saved program.');
}
