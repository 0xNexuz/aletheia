import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import path from 'node:path';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  DustWallet,
  HDWallet,
  InMemoryTransactionHistoryStorage,
  MidnightBech32m,
  PublicKey,
  Roles,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
  ShieldedWallet,
  UnshieldedWallet,
  WalletFacade,
  WalletEntrySchema,
  createKeystore,
  generateRandomSeed,
  mergeWalletEntries
} from '@midnightntwrk/wallet-sdk';
import { getMidnightConfig, classifyWalletReadiness } from './protocol.js';
import { readEncryptedSeed, writeEncryptedSeed } from './keystore.js';

globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

export const PREPROD_KEYSTORE = path.resolve('.midnight', 'secrets', 'preprod-wallet-keystore.json');
const LOCAL_GENESIS_SEED = `${'0'.repeat(63)}1`;

function deriveKeys(seed: string) {
  const initialized = HDWallet.fromSeed(Buffer.from(seed.replace(/^0x/, ''), 'hex'));
  if (initialized.type !== 'seedOk') throw new Error('WALLET_SEED_INVALID');
  const derived = initialized.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
  initialized.hdWallet.clear();
  if (derived.type !== 'keysDerived') throw new Error('WALLET_KEY_DERIVATION_FAILED');
  return derived.keys;
}

export async function createPreprodKeystore(file = PREPROD_KEYSTORE) {
  const generated = Buffer.from(generateRandomSeed()).toString('hex');
  await writeEncryptedSeed(file, generated);
  return file;
}

export async function loadEnvironmentSeed(environment: 'local' | 'preprod') {
  if (environment === 'local') return LOCAL_GENESIS_SEED;
  const injected = process.env.ALETHEIA_PREPROD_WALLET_SEED;
  if (injected !== undefined) {
    const normalized = injected.trim().replace(/^0x/, '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error('ALETHEIA_PREPROD_WALLET_SEED_INVALID');
    return normalized;
  }
  return readEncryptedSeed(PREPROD_KEYSTORE);
}

export async function derivePreprodFundingAddress() {
  setNetworkId('preprod');
  const seed = await loadEnvironmentSeed('preprod');
  const keys = deriveKeys(seed);
  return createKeystore(keys[Roles.NightExternal], getNetworkId()).getBech32Address().toString();
}

function walletConfiguration(config: ReturnType<typeof getMidnightConfig>) {
  const indexerClientConnection = { indexerHttpUrl: config.indexer, indexerWsUrl: config.indexerWs };
  return {
    networkId: config.networkId,
    indexerClientConnection,
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    provingServerUrl: new URL(config.proofServer),
    relayURL: new URL(config.node.replace(/^http/, 'ws')),
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 }
  };
}

export async function openHeadlessWallet(environment: 'local' | 'preprod') {
  const config = getMidnightConfig(environment); setNetworkId(config.networkId);
  const seed = await loadEnvironmentSeed(environment);
  const keys = deriveKeys(seed);
  const privateStoragePassword = createHash('sha256').update('aletheia:private-state:v1:').update(seed).digest('base64url');
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());
  const unified = walletConfiguration(config);
  const wallet = await WalletFacade.init({
    configuration: unified,
    shielded: (item) => ShieldedWallet(item).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (item) => UnshieldedWallet(item).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (item) => DustWallet(item).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust)
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);
  return { environment, config, wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore, privateStoragePassword };
}

export async function waitForWalletState(wallet: WalletFacade, timeoutMs = 900_000) {
  return Rx.firstValueFrom(wallet.state().pipe(Rx.filter((state) => state.isSynced), Rx.timeout({ first: timeoutMs })));
}

export async function waitForDustReady(wallet: WalletFacade, timeoutMs = 1_200_000) {
  return Rx.firstValueFrom(wallet.state().pipe(
    Rx.filter((state) => state.isSynced && classifyWalletReadiness(state) === 'DUST_READY'),
    Rx.timeout({ first: timeoutMs })
  ));
}

export function publicWalletSummary(state: any, unshieldedKeystore: any) {
  const networkId = getNetworkId();
  const coin = ShieldedCoinPublicKey.fromHexString(state.shielded.coinPublicKey.toHexString());
  const encryption = ShieldedEncryptionPublicKey.fromHexString(state.shielded.encryptionPublicKey.toHexString());
  return {
    networkId,
    shieldedAddress: MidnightBech32m.encode(networkId, new ShieldedAddress(coin, encryption)).toString(),
    unshieldedAddress: unshieldedKeystore.getBech32Address(),
    dustAddress: MidnightBech32m.encode(networkId, state.dust.address).toString(),
    readiness: classifyWalletReadiness(state),
    dust: { availableCoins: state.dust.availableCoins.length, pendingCoins: state.dust.pendingCoins.length }
  };
}

export async function registerNightForDust(context: Awaited<ReturnType<typeof openHeadlessWallet>>) {
  const state = await waitForWalletState(context.wallet);
  const coins = state.unshielded.availableCoins.filter((coin: any) => coin.meta?.registeredForDustGeneration !== true);
  if (coins.length === 0) return { submitted: false, readiness: classifyWalletReadiness(state) };
  const recipe = await context.wallet.registerNightUtxosForDustGeneration(
    coins,
    context.unshieldedKeystore.getPublicKey(),
    (payload: Uint8Array) => context.unshieldedKeystore.signData(payload)
  );
  const finalized = await context.wallet.finalizeRecipe(recipe);
  const transactionId = await context.wallet.submitTransaction(finalized);
  return { submitted: true, transactionId: String(transactionId) };
}

export async function closeHeadlessWallet(context: Awaited<ReturnType<typeof openHeadlessWallet>>) {
  await context.wallet.stop();
}
