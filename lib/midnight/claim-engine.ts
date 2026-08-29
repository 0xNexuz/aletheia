import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { Bytes32Descriptor, transientHash } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { Aletheia, witnesses } from 'aletheia-compact-contract';
import { issueDemoCredential, demoIssuerPublicKey } from '../issuer.js';
import type { openHeadlessWallet } from './headless-wallet.js';

const PRIVATE_STATE_ID = 'aletheiaPrivateState';
const ASSETS = path.resolve('contract', 'src', 'managed', 'aletheia');
type CircuitId = 'claim' | 'configureProgram' | 'registerProvider' | 'revokeCredential' | 'rotateAdmin';

function hex(bytes: Uint8Array) { return Buffer.from(bytes).toString('hex'); }
export function programBytes(program: string) { return new Uint8Array(createHash('sha256').update(program).digest()); }
function blankState(userSecret: Uint8Array = randomBytes(32)) { return { age: 0n, jurisdiction: 0n, householdSize: 0n, annualIncome: 0n, credentialId: new Uint8Array(32), signature: { announcement: { x: 0n, y: 1n }, response: 0n }, providerId: 0n, userSecret: new Uint8Array(userSecret) }; }

export async function createClaimEngine(walletContext: Awaited<ReturnType<typeof openHeadlessWallet>>) {
  const state = await walletContext.wallet.waitForSyncedState();
  const walletProvider = {
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletContext.wallet.balanceUnboundTransaction(tx, { shieldedSecretKeys: walletContext.shieldedSecretKeys, dustSecretKey: walletContext.dustSecretKey }, { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) });
      return walletContext.wallet.finalizeRecipe(recipe);
    },
    async submitTx(tx: any) { return walletContext.wallet.submitTransaction(tx); }
  };
  const privateStateProvider = levelPrivateStateProvider({ privateStateStoreName: `aletheia-${walletContext.environment}-private-state`, accountId: walletProvider.getCoinPublicKey(), privateStoragePasswordProvider: () => walletContext.privateStoragePassword });
  const zkConfigProvider = new NodeZkConfigProvider<CircuitId>(ASSETS);
  const providers = { privateStateProvider, publicDataProvider: indexerPublicDataProvider(walletContext.config.indexer, walletContext.config.indexerWs), zkConfigProvider, proofProvider: httpClientProofProvider(walletContext.config.proofServer, zkConfigProvider), walletProvider, midnightProvider: walletProvider };
  const compiledContract = CompiledContract.make('Aletheia', Aletheia.Contract).pipe(CompiledContract.withWitnesses(witnesses), CompiledContract.withCompiledFileAssets(ASSETS));
  return {
    providers, compiledContract, privateStateProvider,
    async deploy() { return deployContract(providers, { compiledContract, privateStateId: PRIVATE_STATE_ID, initialPrivateState: blankState() }); },
    async join(contractAddress: string) { return findDeployedContract(providers, { contractAddress, compiledContract, privateStateId: PRIVATE_STATE_ID, initialPrivateState: blankState() }); },
    async configure(contract: any) {
      const issuer = demoIssuerPublicKey();
      await contract.callTx.registerProvider(BigInt(issuer.providerId), { x: BigInt(issuer.publicKey.x), y: BigInt(issuer.publicKey.y) });
      const policies = [
        ['food-support-2026', { minAge: 18n, jurisdiction: 566n, minHouseholdSize: 2n, maxAnnualIncome: 2500000n, active: true }],
        ['medical-assistance-2026', { minAge: 18n, jurisdiction: 566n, minHouseholdSize: 1n, maxAnnualIncome: 4000000n, active: true }],
        ['temporary-shelter-2026', { minAge: 21n, jurisdiction: 566n, minHouseholdSize: 2n, maxAnnualIncome: 3000000n, active: true }]
      ] as const;
      for (const [id, policy] of policies) await contract.callTx.configureProgram(programBytes(id), policy);
    },
    async claim(contract: any, program: string, userSecret: Uint8Array) {
      const base = blankState(userSecret); const issued = issueDemoCredential(transientHash(Bytes32Descriptor, base.userSecret).toString(), 'eligible');
      const privateState = { ...base, age: BigInt(issued.credential.age), jurisdiction: BigInt(issued.credential.jurisdiction), householdSize: BigInt(issued.credential.householdSize), annualIncome: BigInt(issued.credential.annualIncome), credentialId: new Uint8Array(Buffer.from(issued.credential.credentialId, 'hex')), providerId: BigInt(issued.providerId), signature: { announcement: { x: BigInt(issued.signature.announcement.x), y: BigInt(issued.signature.announcement.y) }, response: BigInt(issued.signature.response) } };
      await privateStateProvider.set(PRIVATE_STATE_ID, privateState);
      const programId = programBytes(program); const nullifier = hex(Aletheia.pureCircuits.deriveProgramNullifier(userSecret, programId));
      const finalized = await contract.callTx.claim(programId);
      return { finalized: finalized.public, nullifier };
    }
  };
}
