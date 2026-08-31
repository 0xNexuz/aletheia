const ENVIRONMENTS = Object.freeze({
  local: Object.freeze({
    environment: 'local',
    networkId: 'undeployed',
    node: 'http://127.0.0.1:9944',
    indexer: 'http://127.0.0.1:8088/api/v4/graphql',
    indexerWs: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
    proofServer: 'http://127.0.0.1:6300'
  }),
  preprod: Object.freeze({
    environment: 'preprod',
    networkId: 'preprod',
    node: 'https://rpc.preprod.midnight.network',
    indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWs: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    // Official Preprod examples run the proof server locally.
    proofServer: 'http://127.0.0.1:6300'
  })
});

function runtimeEnv(name) {
  return typeof process !== 'undefined' && process?.env ? process.env[name] : undefined;
}

export function getMidnightConfig(environment = runtimeEnv('ALETHEIA_MIDNIGHT_ENV') || 'preprod') {
  if (!(environment in ENVIRONMENTS)) throw new Error(`Unsupported Midnight environment: ${environment}`);
  const base = ENVIRONMENTS[environment];
  const prefix = `ALETHEIA_${environment.toUpperCase()}`;
  return Object.freeze({
    ...base,
    node: runtimeEnv(`${prefix}_NODE_URL`) || base.node,
    indexer: runtimeEnv(`${prefix}_INDEXER_URL`) || base.indexer,
    indexerWs: runtimeEnv(`${prefix}_INDEXER_WS_URL`) || base.indexerWs,
    proofServer: runtimeEnv(`${prefix}_PROOF_SERVER_URL`) || base.proofServer,
    contractAddress: runtimeEnv(`${prefix}_CONTRACT_ADDRESS`) || ''
  });
}

export function classifyWalletReadiness(state) {
  if (!state?.isSynced) return 'WALLET_NOT_SYNCED';
  const nightCoins = state.unshielded?.availableCoins || [];
  const balances = state.unshielded?.balances || {};
  const nightBalance = Object.values(balances).reduce((sum, value) => sum + BigInt(value || 0), 0n);
  if (nightCoins.length === 0 && nightBalance <= 0n) return 'NO_NIGHT';
  const registered = nightCoins.filter((coin) => coin?.meta?.registeredForDustGeneration === true);
  if (registered.length === 0) return 'NIGHT_NOT_REGISTERED_FOR_DUST';
  const availableCoins = state.dust?.availableCoins || [];
  const pendingCoins = state.dust?.pendingCoins || [];
  if (availableCoins.length >= 1) return 'DUST_READY';
  if (pendingCoins.length > 0) return 'DUST_NOT_SPENDABLE';
  return 'DUST_ACCRUING';
}

export function redactEvidence(value) {
  const forbidden = /seed|secret|credential|age|income|household|jurisdiction|signature|private/i;
  if (Array.isArray(value)) return value.map(redactEvidence);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !forbidden.test(key)).map(([key, item]) => [key, redactEvidence(item)]));
}

export function assertEvidenceSafe(value) {
  const serialized = JSON.stringify(redactEvidence(value));
  if (/credentialId|userSecret|annualIncome|householdSize|jurisdiction|walletSeed/i.test(serialized)) {
    throw new Error('PRIVATE_DATA_IN_EVIDENCE');
  }
  return JSON.parse(serialized);
}

export function readinessExitCode(code) { return code === 'DUST_READY' ? 0 : 2; }

export { ENVIRONMENTS };
