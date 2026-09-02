import * as ledger from '@midnight-ntwrk/ledger-v8';
import { Bytes32Descriptor, transientHash } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { deployContract, findDeployedContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createProofProvider } from '@midnight-ntwrk/midnight-js-types';
import { MidnightBech32m, ShieldedCoinPublicKey, ShieldedEncryptionPublicKey } from '@midnight-ntwrk/wallet-sdk-address-format';
import { Aletheia, witnesses } from 'aletheia-compact-contract';
import { readRecovery, saveRecovery, withDeploymentLock } from './deployment-recovery.js';
import { configureDeployment } from './deployment-setup.js';

const PRIVATE_STATE_ID = 'aletheiaPrivateState';
let context;
const sessionUserSecret = crypto.getRandomValues(new Uint8Array(32));

function hex(bytes) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''); }
function bytes(value) { const clean = value.replace(/^0x/, ''); return new Uint8Array(clean.match(/.{2}/g).map((part) => parseInt(part, 16))); }
async function programBytes(programId) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(programId))); }
function versionParts(value) { return String(value || '').split('.').map((part) => Number.parseInt(part, 10) || 0); }
function newerVersion(left, right) { const a = versionParts(left); const b = versionParts(right); for (let index = 0; index < 3; index += 1) { if (a[index] !== b[index]) return a[index] > b[index]; } return false; }
function compatibleConnector(value) { return value && typeof value.connect === 'function' && typeof value.name === 'string' && typeof value.rdns === 'string' && versionParts(value.apiVersion)[0] === 4; }
async function configuredContractAddress() {
  const bundled = import.meta.env.VITE_ALETHEIA_CONTRACT_ADDRESS || '';
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    const health = await response.json();
    const address = health?.midnightNetwork === 'preprod' ? health.contractAddress : '';
    if (response.ok && typeof address === 'string' && address && address.length <= 200 && !/\s/.test(address)) return address;
  } catch { /* A bundled address remains a valid deployment fallback. */ }
  return typeof bundled === 'string' && bundled.length <= 200 && !/\s/.test(bundled) ? bundled : '';
}
function decodeConnectorKey(value, codec, networkId) {
  if (typeof value !== 'string') throw new Error('The wallet returned an invalid shielded key.');
  if (/^[a-f0-9]{64}$/i.test(value)) return value.toLowerCase();
  return codec.decode(networkId, MidnightBech32m.parse(value)).toHexString();
}

export function discoverCompactWallets() {
  const byWallet = new Map();
  for (const [id, connector] of Object.entries(window.midnight || {})) {
    if (!compatibleConnector(connector)) continue;
    const existing = byWallet.get(connector.rdns);
    if (!existing || newerVersion(connector.apiVersion, existing.apiVersion)) byWallet.set(connector.rdns, { id, name: connector.name.trim().slice(0, 80) || 'Midnight wallet', rdns: connector.rdns, apiVersion: connector.apiVersion });
  }
  return [...byWallet.values()].sort((left, right) => left.name.localeCompare(right.name));
}
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

async function connectWallet(walletId) {
  const available = discoverCompactWallets();
  const selected = available.find((item) => item.id === walletId) || (available.length === 1 ? available[0] : null);
  if (!selected) throw new Error(available.length ? 'Choose a compatible Midnight wallet first.' : 'No compatible Midnight wallet was detected. Install or enable a wallet implementing Connector API v4 and refresh.');
  const initial = window.midnight?.[selected.id];
  if (!compatibleConnector(initial)) throw new Error('The selected Midnight wallet is no longer available.');
  const wallet = await initial.connect('preprod'); const status = await wallet.getConnectionStatus();
  if (status?.status !== 'connected' || status.networkId !== 'preprod') throw new Error(`${selected.name} did not connect to Midnight Preprod.`);
  await wallet.hintUsage?.(['getConfiguration', 'getShieldedAddresses', 'getProvingProvider', 'balanceUnsealedTransaction', 'submitTransaction']);
  setNetworkId(status.networkId); const config = await wallet.getConfiguration(); const addresses = await wallet.getShieldedAddresses();
  if (config.networkId !== status.networkId || !config.indexerUri || !config.indexerWsUri || !addresses.shieldedCoinPublicKey || !addresses.shieldedEncryptionPublicKey) throw new Error(`${selected.name} returned incomplete or mismatched Preprod configuration.`);
  const stateProvider = privateStateProvider();
  const zkConfigProvider = new FetchZkConfigProvider(window.location.origin, fetch.bind(window));
  const proofProvider = typeof wallet.getProvingProvider === 'function'
    ? createProofProvider(await wallet.getProvingProvider(zkConfigProvider.asKeyMaterialProvider()))
    : config.proverServerUri ? httpClientProofProvider(config.proverServerUri, zkConfigProvider) : null;
  if (!proofProvider) throw new Error(`${selected.name} does not provide a compatible proving service.`);
  const coinPublicKey = decodeConnectorKey(addresses.shieldedCoinPublicKey, ShieldedCoinPublicKey.codec, status.networkId);
  const encryptionPublicKey = decodeConnectorKey(addresses.shieldedEncryptionPublicKey, ShieldedEncryptionPublicKey.codec, status.networkId);
  const providers = {
    privateStateProvider: stateProvider, zkConfigProvider,
    proofProvider,
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => coinPublicKey,
      getEncryptionPublicKey: () => encryptionPublicKey,
      async balanceTx(tx) {
        const result = await wallet.balanceUnsealedTransaction(hex(tx.serialize()), {});
        return ledger.Transaction.deserialize('signature', 'proof', 'binding', bytes(result.tx));
      }
    },
    midnightProvider: { async submitTx(tx) { await wallet.submitTransaction(hex(tx.serialize())); return tx.identifiers()[0]; } }
  };
  const compiledContract = CompiledContract.make('Aletheia', Aletheia.Contract).pipe(CompiledContract.withWitnesses(witnesses), CompiledContract.withCompiledFileAssets(window.location.origin));
  return { selected, providers, compiledContract, network: status.networkId };
}

export async function connectCompact(walletId) {
  const contractAddress = await configuredContractAddress();
  if (!contractAddress) throw new Error('The Compact contract address is not configured. Simulation remains available, but no on-chain success will be shown.');
  const { selected, providers, compiledContract, network } = await connectWallet(walletId);
  await findDeployedContract(providers, { contractAddress, compiledContract, privateStateId: PRIVATE_STATE_ID, initialPrivateState: emptyState() });
  context = { providers, compiledContract, contractAddress };
  return { contractAddress, network, walletName: selected.name, walletId: selected.id };
}

export async function deployCompact(walletId, onState = () => {}, recovery) {
  if (!recovery?.secret || recovery.secret.length !== 32 || !recovery.backupConfirmed) throw new Error('Open /deploy.html and save an encrypted admin recovery backup before deploying.');
  return withDeploymentLock(navigator.locks, () => deployOrResume(walletId, onState, recovery));
}

async function deployOrResume(walletId, onState, recovery) {
  const storage = window.localStorage;
  let record = readRecovery(storage);
  if (!record || record.vault.ciphertext !== recovery.record.vault.ciphertext) throw new Error('The saved recovery changed. Unlock the current recovery before continuing.');
  const checkpoint = (changes) => { record = { ...record, ...changes }; saveRecovery(storage, record); recovery.record = record; };
  const suppliedAddress = recovery.contractAddress?.trim().toLowerCase();
  if (suppliedAddress) {
    if (!/^[a-f0-9]{64}$/.test(suppliedAddress)) throw new Error('Enter a 64-character Preprod contract address, not a transaction hash.');
    if (record.contractAddress && record.contractAddress !== suppliedAddress) throw new Error('That address differs from the saved deployment.');
    // Verify the supplied address and admin key before saving this override.
  }
  let contractAddress = record.contractAddress || suppliedAddress;
  if (!contractAddress && record.started) throw new Error('A deployment may already have been submitted. Find its contract address using the saved transaction ID, paste it above, and resume. No duplicate deployment was sent.');
  if (!contractAddress) {
    const existing = await configuredContractAddress();
    if (existing) throw new Error(`A Preprod contract is already configured at ${existing}.`);
  }
  const issuerResponse = await fetch('/api/credentials', { method: 'GET', cache: 'no-store' });
  const issuer = await issuerResponse.json();
  if (!issuerResponse.ok || !issuer?.publicKey || !/^\d+$/.test(issuer.providerId)) throw new Error(issuer.error || 'The demo issuer configuration is unavailable. No deployment was requested.');
  const issuerIdentity = JSON.stringify({ providerId: issuer.providerId, publicKey: issuer.publicKey });
  if (record.issuerIdentity && record.issuerIdentity !== issuerIdentity) throw new Error('The demo issuer changed since setup began. Restore the original issuer configuration before resuming.');
  checkpoint({ issuerIdentity });
  const { selected, providers, compiledContract } = await connectWallet(walletId);
  const initialPrivateState = { ...emptyState(), userSecret: recovery.secret };
  const readLedger = async () => {
    const state = await providers.publicDataProvider.queryContractState(contractAddress);
    if (!state) throw new Error('This contract is not indexed yet. Check the address and resume later; no replacement was deployed.');
    const decoded = Aletheia.ledger(state.data);
    if (hex(decoded.contractAdmin) !== hex(Aletheia.pureCircuits.deriveAdminCommitment(recovery.secret))) throw new Error('This recovery key is not the admin of that contract. Nothing was submitted.');
    return decoded;
  };
  const transactions = [...(record.transactions || [])];
  const onTransaction = async (action, result) => {
    transactions.push({ action, transactionId: String(result.public.txId), blockReference: String(result.public.blockHeight) });
    checkpoint({ transactions });
  };
  let deployed;
  if (contractAddress) {
    onState('Checking the existing deployment and recovery key.');
    await readLedger();
    checkpoint({ contractAddress, started: true });
    deployed = await findDeployedContract(providers, { compiledContract, contractAddress, privateStateId: PRIVATE_STATE_ID, initialPrivateState });
  } else {
    const submit = providers.midnightProvider.submitTx;
    providers.midnightProvider.submitTx = async (tx) => {
      // Save before broadcast. If confirmation is interrupted, never silently deploy again.
      checkpoint({ started: true, pendingTransactionId: String(tx.identifiers()[0]) });
      return submit(tx);
    };
    onState('Approve contract deployment in 1AM. Your encrypted admin backup is saved.');
    deployed = await deployContract(providers, { compiledContract, privateStateId: PRIVATE_STATE_ID, initialPrivateState });
    providers.midnightProvider.submitTx = submit;
    contractAddress = String(deployed.deployTxData.public.contractAddress);
    checkpoint({ contractAddress, started: true });
    await onTransaction('deploy', { public: deployed.deployTxData.public });
  }
  await configureDeployment({ readLedger, callTx: deployed.callTx, issuer, programBytes, onState, onTransaction });
  checkpoint({ completed: true });
  context = { providers, compiledContract, contractAddress };
  return { contractAddress, network: 'preprod', walletName: selected.name, transactions };
}

function emptyState() { return { age: 0n, jurisdiction: 0n, householdSize: 0n, annualIncome: 0n, credentialId: new Uint8Array(32), signature: { announcement: { x: 0n, y: 1n }, response: 0n }, providerId: 0n, userSecret: sessionUserSecret }; }

export async function prepareCompactClaim(programId, onState = () => {}) {
  if (!context) throw new Error('Connect a compatible Midnight wallet before preparing a claim.'); const state = emptyState(); const subjectHash = transientHash(Bytes32Descriptor, state.userSecret);
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
