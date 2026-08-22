import * as ledger from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { transientHash } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { findDeployedContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { Aletheia, witnesses } from 'aletheia-compact-contract';

const PRIVATE_STATE_ID = 'aletheiaPrivateState';
const CONTRACT_ADDRESS = import.meta.env.VITE_ALETHEIA_CONTRACT_ADDRESS || '';
let context;
const sessionUserSecret = crypto.getRandomValues(new Uint8Array(32));

function hex(bytes) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''); }
function bytes(value) { const clean = value.replace(/^0x/, ''); return new Uint8Array(clean.match(/.{2}/g).map((part) => parseInt(part, 16))); }
async function programBytes(programId) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(programId))); }
function privateStateProvider() {
  const states = new Map(); const signingKeys = new Map(); let address = '';
  const key = (id) => `${address}:${id}`;
  return {
    setContractAddress(value) { address = value; }, async get(id) { return states.get(key(id)) ?? null; }, async set(id, value) { states.set(key(id), value); },
    async remove(id) { states.delete(key(id)); }, async clear() { states.clear(); }, async setSigningKey(a, value) { signingKeys.set(a, value); },
    async getSigningKey(a) { return signingKeys.get(a) ?? null; }, async removeSigningKey(a) { signingKeys.delete(a); }, async clearSigningKeys() { signingKeys.clear(); },
    async exportPrivateStates() { throw new Error('Private state export is intentionally disabled.'); }, async importPrivateStates() { throw new Error('Private state import is intentionally disabled.'); }
  };
}

export async function connectCompact() {
  if (!CONTRACT_ADDRESS) throw new Error('The Compact contract address is not configured. Simulation remains available, but no on-chain success will be shown.');
  const initial = window.midnight?.mnLace || Object.values(window.midnight || {}).find((item) => typeof item?.connect === 'function');
  if (!initial) throw new Error('Midnight Lace was not detected. Install or enable Lace and refresh.');
  const wallet = await initial.connect('preprod'); const status = await wallet.getConnectionStatus();
  if (status?.status !== 'connected') throw new Error('Lace did not connect to Midnight Preprod.');
  setNetworkId(status.networkId); const config = await wallet.getConfiguration(); const addresses = await wallet.getShieldedAddresses();
  if (!config.proverServerUri || !config.indexerUri || !addresses.shieldedCoinPublicKey || !addresses.shieldedEncryptionPublicKey) throw new Error('Lace returned incomplete Preprod provider configuration.');
  const stateProvider = privateStateProvider();
  const zkConfigProvider = new FetchZkConfigProvider(window.location.origin, fetch.bind(window));
  const providers = {
    privateStateProvider: stateProvider, zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proverServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => addresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => addresses.shieldedEncryptionPublicKey,
      async balanceTx(tx) {
        const result = await wallet.balanceUnsealedTransaction(hex(tx.serialize()), {});
        return ledger.Transaction.deserialize('signature', 'proof', 'binding', bytes(result.tx));
      }
    },
    midnightProvider: { async submitTx(tx) { await wallet.submitTransaction(hex(tx.serialize())); return tx.identifiers()[0]; } }
  };
  const compiledContract = CompiledContract.make('Aletheia', Aletheia.Contract).pipe(CompiledContract.withWitnesses(witnesses), CompiledContract.withCompiledFileAssets(window.location.origin));
  await findDeployedContract(providers, { contractAddress: CONTRACT_ADDRESS, compiledContract, privateStateId: PRIVATE_STATE_ID, initialPrivateState: emptyState() });
  context = { providers, compiledContract, contractAddress: CONTRACT_ADDRESS };
  return { contractAddress: CONTRACT_ADDRESS, network: status.networkId };
}

function emptyState() { return { age: 0n, jurisdiction: 0n, householdSize: 0n, annualIncome: 0n, credentialId: new Uint8Array(32), signature: { announcement: { x: 0n, y: 1n }, response: 0n }, providerId: 0n, userSecret: sessionUserSecret }; }

export async function prepareCompactClaim(programId, onState = () => {}) {
  if (!context) await connectCompact(); const state = emptyState(); const subjectHash = transientHash(state.userSecret);
  onState('Requesting signed demo credential');
  const response = await fetch('/api/credentials', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subjectHash: subjectHash.toString(), profile: 'eligible' }) });
  const issued = await response.json(); if (!response.ok) throw new Error(issued.error || 'The demo issuer rejected this request.');
  Object.assign(state, { age: BigInt(issued.credential.age), jurisdiction: BigInt(issued.credential.jurisdiction), householdSize: BigInt(issued.credential.householdSize), annualIncome: BigInt(issued.credential.annualIncome), credentialId: bytes(issued.credential.credentialId), providerId: BigInt(issued.providerId), signature: { announcement: { x: BigInt(issued.signature.announcement.x), y: BigInt(issued.signature.announcement.y) }, response: BigInt(issued.signature.response) } });
  await context.providers.privateStateProvider.set(PRIVATE_STATE_ID, state); const id = await programBytes(programId); const nullifier = Aletheia.pureCircuits.deriveProgramNullifier(state.userSecret, id);
  return { programId, programBytes: id, nullifier: hex(nullifier) };
}

export async function submitPreparedCompactClaim(prepared, onState = () => {}) {
  if (!context) throw new Error('The Compact session is no longer connected.');
  onState('Generating zero-knowledge proof');
  const tx = await submitCallTx(context.providers, { compiledContract: context.compiledContract, contractAddress: context.contractAddress, circuitId: 'claim', args: [prepared.programBytes], privateStateId: PRIVATE_STATE_ID });
  return { nullifier: prepared.nullifier, txHash: String(tx.public.txId), blockReference: String(tx.public.blockHeight), contractAddress: context.contractAddress };
}
