import { createHash, randomBytes } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getMidnightConfig, classifyWalletReadiness, assertEvidenceSafe, readinessExitCode } from '../lib/midnight/protocol.js';
import { PREPROD_KEYSTORE, closeHeadlessWallet, createPreprodKeystore, openHeadlessWallet, publicWalletSummary, registerNightForDust, waitForWalletState } from '../lib/midnight/headless-wallet.js';
import { createClaimEngine } from '../lib/midnight/claim-engine.js';

type Environment = 'local' | 'preprod';
const [command = 'status', requestedEnvironment = 'local'] = process.argv.slice(2);
const environment = requestedEnvironment as Environment;
const jsonMode = process.argv.includes('--json');
const output = (value: unknown) => console.log(jsonMode ? JSON.stringify(value, null, 2) : Object.entries(value as Record<string, unknown>).map(([key, item]) => `${key}: ${typeof item === 'object' ? JSON.stringify(item) : item}`).join('\n'));
const contractAddressFile = (env: Environment) => path.resolve('.midnight', 'deployments', `${env}.json`);
const PROGRAMS = new Set(['food-support-2026', 'medical-assistance-2026', 'temporary-shelter-2026']);

async function probe(url: string, init?: RequestInit) { try { const response = await fetch(url, { signal: AbortSignal.timeout(8_000), ...init }); return { ok: response.ok, status: response.status }; } catch (error) { return { ok: false, error: String((error as Error).message) }; } }
async function artifactDigest() {
  const source = await readFile(path.resolve('contract', 'src', 'aletheia.compact'));
  return createHash('sha256').update(source).digest('hex');
}
async function saveEvidence(name: string, value: unknown) { const safe = assertEvidenceSafe(value); await mkdir(path.resolve('evidence'), { recursive: true }); await writeFile(path.resolve('evidence', name), `${JSON.stringify(safe, null, 2)}\n`, { flag: 'wx' }); return safe; }
async function readDeployment(env: Environment) {
  const value = JSON.parse(await readFile(contractAddressFile(env), 'utf8')) as Record<string, unknown>;
  if (value.environment !== env || value.networkId !== getMidnightConfig(env).networkId || typeof value.contractAddress !== 'string' || !value.contractAddress || value.contractAddress.length > 200 || /\s/.test(value.contractAddress)) throw new Error('DEPLOYMENT_FILE_INVALID');
  if (value.artifactDigest !== await artifactDigest()) throw new Error('DEPLOYMENT_ARTIFACT_MISMATCH');
  return value as { contractAddress: string };
}
async function withWallet<T>(env: Environment, operation: (context: Awaited<ReturnType<typeof openHeadlessWallet>>) => Promise<T>) {
  const context = await openHeadlessWallet(env);
  try { return await operation(context); } finally { await closeHeadlessWallet(context); }
}

async function status(env: Environment) {
  const config = getMidnightConfig(env);
  const services = {
    node: await probe(config.node, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'system_health', params: [] }) }),
    indexer: await probe(config.indexer, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'query AletheiaStatus { __typename }' }) }),
    proofServer: await probe(config.proofServer)
  };
  let wallet = { readiness: 'WALLET_NOT_SYNCED' } as Record<string, unknown>;
  try { wallet = await withWallet(env, async (context) => publicWalletSummary(await waitForWalletState(context.wallet, 60_000), context.unshieldedKeystore)); } catch (error) { wallet = { readiness: 'WALLET_NOT_SYNCED', detail: String((error as Error).message) }; }
  const result = { environment: env, networkId: config.networkId, services, wallet, contractAddress: config.contractAddress || null };
  output(result); process.exitCode = Object.values(services).every((item) => item.ok) ? readinessExitCode(String(wallet.readiness)) : 3;
}

async function walletCommand() {
  try { await access(PREPROD_KEYSTORE); } catch { await createPreprodKeystore(); }
  output(await withWallet('preprod', async (context) => publicWalletSummary(await waitForWalletState(context.wallet), context.unshieldedKeystore)));
}

async function dustRegister(env: Environment) { output(await withWallet(env, registerNightForDust)); }

async function deploy(env: Environment) {
  await withWallet(env, async (context) => {
    const state = await waitForWalletState(context.wallet); const readiness = classifyWalletReadiness(state); if (readiness !== 'DUST_READY') throw new Error(readiness);
    const engine = await createClaimEngine(context); const contract = await engine.deploy(); await engine.configure(contract);
    const data = contract.deployTxData.public; const evidence = { environment: env, networkId: context.config.networkId, contractAddress: String(data.contractAddress), deploymentTxId: String(data.txId), blockReference: String(data.blockHeight), timestamp: new Date().toISOString(), artifactDigest: await artifactDigest() };
    await mkdir(path.dirname(contractAddressFile(env)), { recursive: true }); await writeFile(contractAddressFile(env), `${JSON.stringify(evidence, null, 2)}\n`);
    output(await saveEvidence(`deployment-${env}-${evidence.deploymentTxId.slice(0, 16)}.json`, evidence));
  });
}

async function claim(env: Environment, program = 'food-support-2026', secret = randomBytes(32)) {
  if (!PROGRAMS.has(program)) throw new Error('PROGRAM_NOT_SUPPORTED');
  const deployment = await readDeployment(env);
  return withWallet(env, async (context) => {
    const engine = await createClaimEngine(context); const contract = await engine.join(deployment.contractAddress); const result = await engine.claim(contract, program, new Uint8Array(secret));
    const evidence = { environment: env, networkId: context.config.networkId, contractAddress: deployment.contractAddress, transactionId: String(result.finalized.txId), blockReference: String(result.finalized.blockHeight), timestamp: new Date().toISOString(), artifactDigest: await artifactDigest(), program, nullifier: result.nullifier, result: 'confirmed' };
    output(await saveEvidence(`claim-${env}-${program}-${evidence.transactionId.slice(0, 16)}.json`, evidence)); return evidence;
  });
}

async function duplicate(env: Environment) { const secret = randomBytes(32); const first = await claim(env, 'food-support-2026', secret); try { await claim(env, 'food-support-2026', secret); throw new Error('DUPLICATE_ACCEPTED_UNEXPECTEDLY'); } catch (error) { if (String((error as Error).message).includes('DUPLICATE_ACCEPTED_UNEXPECTEDLY')) throw error; output({ firstTransactionId: first.transactionId, result: 'rejected', rejectionCode: 'PROGRAM_NULLIFIER_ALREADY_USED', origin: 'Compact' }); } }
async function scoped(env: Environment) { const secret = randomBytes(32); const first = await claim(env, 'food-support-2026', secret); const second = await claim(env, 'medical-assistance-2026', secret); if (first.nullifier === second.nullifier) throw new Error('SCOPED_NULLIFIER_COLLISION'); output({ result: 'confirmed', firstProgram: first.program, firstNullifier: first.nullifier, secondProgram: second.program, secondNullifier: second.nullifier }); }
async function e2e() { await deploy('local'); await duplicate('local'); await scoped('local'); }

try {
  if (!['local', 'preprod'].includes(environment)) throw new Error('Environment must be local or preprod.');
  if (command === 'status') await status(environment);
  else if (command === 'wallet' && environment === 'preprod') await walletCommand();
  else if (command === 'dust-register') await dustRegister(environment);
  else if (command === 'deploy') await deploy(environment);
  else if (command === 'claim') await claim(environment);
  else if (command === 'duplicate') await duplicate(environment);
  else if (command === 'scoped-nullifier') await scoped(environment);
  else if (command === 'e2e' && environment === 'local') await e2e();
  else throw new Error(`Unknown command: ${command} ${environment}`);
} catch (error) { const result = { ok: false, code: String((error as Error).message).split(':')[0], detail: String((error as Error).message) }; console.error(jsonMode ? JSON.stringify(result) : `${result.code}: ${result.detail}`); process.exitCode = 1; }
