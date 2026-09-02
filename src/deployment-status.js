export const PREPROD_INDEXER = 'https://indexer.preprod.midnight.network/api/v4/graphql';

export async function lookupDeployment(identifier, request = fetch) {
  if (!/^[a-f0-9]{66}$/i.test(identifier || '')) throw new Error('The saved transaction identifier is invalid. Recovery was not changed.');
  const query = `query ($id: HexEncoded!) { transactions(offset: {identifier: $id}) { hash block { height } contractActions { __typename ... on ContractDeploy { address } } ... on RegularTransaction { identifiers transactionResult { status } } } }`;
  const response = await request(PREPROD_INDEXER, {
    method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ query, variables: { id: identifier } })
  });
  if (!response.ok) throw new Error('The Preprod indexer is unavailable. Nothing was reset or submitted.');
  const payload = await response.json();
  if (payload.errors?.length || !Array.isArray(payload.data?.transactions)) throw new Error('The Preprod check failed. Nothing was reset or submitted.');
  const transactions = payload.data.transactions;
  if (!transactions.length) return { status: 'unconfirmed', identifier };
  const transaction = transactions.find((tx) => tx.identifiers?.includes(identifier));
  if (!transaction) throw new Error('The indexer response did not match the saved identifier.');
  const deployments = transaction.contractActions?.filter((action) => action.__typename === 'ContractDeploy') || [];
  if (transaction.transactionResult?.status !== 'SUCCESS' || deployments.length !== 1 || !/^[a-f0-9]{64}$/i.test(deployments[0].address)) {
    return { status: 'indexed-review-required', identifier, transactionHash: transaction.hash, result: transaction.transactionResult?.status };
  }
  return { status: 'confirmed', identifier, contractAddress: deployments[0].address, transactionHash: transaction.hash, blockHeight: transaction.block.height };
}

export async function submitTracked({ submit, tx, identifier, checkpoint }) {
  checkpoint({ started: true, pendingTransactionId: identifier, submissionStatus: 'requested', lastSubmissionError: '' });
  try {
    const result = await submit(tx);
    checkpoint({ submissionStatus: 'wallet-accepted-awaiting-chain', lastSubmissionError: '' });
    return result;
  } catch (error) {
    const detail = String(error?.message || error?.reason || 'Wallet submission failed or was interrupted.')
      .replace(/[a-f0-9]{64,}/gi, '[redacted transaction/key]')
      .replace(/mn_[a-z0-9_]+/gi, '[redacted address]').slice(0, 400);
    // Never erase a pending marker on rejection: a transport error can follow acceptance.
    try { checkpoint({ submissionStatus: 'failed-or-unknown', lastSubmissionError: detail }); } catch { /* Preserve the original submission failure. */ }
    throw new Error(`Submission stopped: ${detail} Use Check saved transaction before retrying.`);
  }
}

export function prepareRetry(record, observation, approved) {
  if (approved !== true) throw new Error('A fresh attempt needs your explicit approval because the old attempt could still land.');
  if (!record?.started || !record.pendingTransactionId || record.contractAddress || record.completed || record.transactions?.length) throw new Error('This recovery is not an unconfirmed deployment. Resume its existing contract instead.');
  if (observation?.status !== 'unconfirmed' || observation.identifier !== record.pendingTransactionId) throw new Error('Only the exact unconfirmed attempt can be retried. Recovery was not changed.');
  return { ...record, started: false, completed: false, pendingTransactionId: '', candidateContractAddress: '', pendingTransactionHash: '', submissionStatus: 'retry-authorized', lastSubmissionError: '',
    previousAttempts: [...(record.previousAttempts || []), {
      pendingTransactionId: record.pendingTransactionId, submissionStatus: record.submissionStatus || 'legacy-result-not-recorded',
      candidateContractAddress: record.candidateContractAddress || '', pendingTransactionHash: record.pendingTransactionHash || '',
      lastSubmissionError: record.lastSubmissionError || '', archivedAt: new Date().toISOString()
    }]
  };
}
