import test from 'node:test';
import assert from 'node:assert/strict';
import { RECOVERY_KEY, createRecovery, readRecovery, saveRecovery, unlockRecovery, importRecovery, withDeploymentLock } from '../src/deployment-recovery.js';
import { configureDeployment, PROGRAM_POLICIES } from '../src/deployment-setup.js';

function storage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
const password = 'only-a-test-passphrase-1234';

test('admin recovery survives a fresh session, encrypts the key, and restores an exported backup', async () => {
  const local = storage();
  const { record, secret } = await createRecovery(local, password);
  const serialized = local.getItem(RECOVERY_KEY);
  assert.equal(serialized.includes(password), false);
  assert.equal(serialized.includes(Array.from(secret, (b) => b.toString(16).padStart(2, '0')).join('')), false);
  assert.deepEqual(await unlockRecovery(readRecovery(local), password), secret);
  const restored = await importRecovery(storage(), serialized, password);
  assert.deepEqual(restored.secret, secret);
  assert.deepEqual(restored.record, record);
  await assert.rejects(createRecovery(local, password), /already exists/);
});

test('wrong passwords, modified ciphertext and malformed files fail closed', async () => {
  const { record } = await createRecovery(storage(), password);
  await assert.rejects(unlockRecovery(record, 'wrong-test-passphrase'), /Wrong recovery/);
  record.vault.ciphertext = (record.vault.ciphertext[0] === '0' ? '1' : '0') + record.vault.ciphertext.slice(1);
  await assert.rejects(unlockRecovery(record, password), /Wrong recovery/);
  await assert.rejects(importRecovery(storage(), '{}', password), /Invalid encrypted/);
  await assert.rejects(createRecovery(storage(), 'weak'), /at least 12/);
});

test('storage write failures prevent recovery creation and checkpoint writes', async () => {
  const broken = { getItem: () => null, setItem: () => {} };
  await assert.rejects(createRecovery(broken, password), /storage failed/);
  const { record } = await createRecovery(storage(), password);
  assert.throws(() => saveRecovery(broken, record), /storage failed/);
});

test('import never replaces a different key or rolls back newer local progress', async () => {
  const local = storage();
  const first = await createRecovery(local, password);
  const oldBackup = JSON.stringify(first.record);
  saveRecovery(local, { ...first.record, started: true, contractAddress: 'ab'.repeat(32) });
  const retained = await importRecovery(local, oldBackup, password);
  assert.equal(retained.record.started, true);
  assert.equal(retained.record.contractAddress, 'ab'.repeat(32));
  const second = await createRecovery(storage(), password);
  await assert.rejects(importRecovery(local, JSON.stringify(second.record), password), /different recovery/);
  assert.equal(readRecovery(local).contractAddress, 'ab'.repeat(32));
});

test('cross-tab deployment lock prevents duplicate invocation', async () => {
  let calls = 0;
  await assert.rejects(withDeploymentLock(null, () => { calls++; }), /locking/);
  await assert.rejects(withDeploymentLock({ request: async (_key, options, action) => {
    assert.equal(options.ifAvailable, true); return action(null);
  } }, () => { calls++; }), /another tab/);
  assert.equal(calls, 0);
  await withDeploymentLock({ request: async (_key, _options, action) => action({}) }, () => { calls++; });
  assert.equal(calls, 1);
});

function fixture() {
  const providers = new Map(); const programs = new Map(); const calls = [];
  const mapView = (map) => ({ member: (key) => map.has(key), lookup: (key) => map.get(key) });
  return {
    providers, programs, calls,
    options: {
      issuer: { providerId: '1', publicKey: { x: '12', y: '34' } }, programBytes: async (id) => id,
      readLedger: async () => ({ providers: mapView(providers), programs: mapView(programs) }),
      onState: () => {}, onTransaction: async () => {},
      callTx: {
        registerProvider: async (id, key) => { providers.set(id, key); calls.push('provider'); return {}; },
        configureProgram: async (id, policy) => { programs.set(id, policy); calls.push(id); return {}; }
      }
    }
  };
}

test('new setup configures four calls; a repeated run sends no additional calls', async () => {
  const f = fixture();
  await configureDeployment(f.options);
  assert.equal(f.calls.length, 4);
  await configureDeployment(f.options);
  assert.equal(f.calls.length, 4);
});

test('resume uses on-chain state after interruption at any confirmation boundary', async () => {
  for (let failAt = 1; failAt <= 4; failAt++) {
    const f = fixture(); let confirmed = 0;
    await assert.rejects(configureDeployment({ ...f.options, onTransaction: async () => {
      if (++confirmed === failAt) throw new Error('tab closed after confirmation');
    } }), /tab closed/);
    await configureDeployment(f.options);
    assert.equal(f.calls.length, 4, `no duplicated calls at boundary ${failAt}`);
  }
});

test('resume does not silently overwrite an unexpected issuer or policy', async () => {
  const issuerMismatch = fixture();
  issuerMismatch.providers.set(1n, { x: 99n, y: 1n });
  await assert.rejects(configureDeployment(issuerMismatch.options), /issuer differs/);
  assert.equal(issuerMismatch.calls.length, 0);
  const policyMismatch = fixture();
  policyMismatch.providers.set(1n, { x: 12n, y: 34n });
  policyMismatch.programs.set(PROGRAM_POLICIES[0][0], { ...PROGRAM_POLICIES[0][1], active: false });
  await assert.rejects(configureDeployment(policyMismatch.options), /policy.*differs/);
  assert.equal(policyMismatch.calls.length, 0);
});

test('success requires the configured policies to actually appear on-chain', async () => {
  const f = fixture();
  f.options.callTx.configureProgram = async () => ({});
  await assert.rejects(configureDeployment(f.options), /not yet verified/);
});
