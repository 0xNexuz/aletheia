import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readEncryptedSeed, writeEncryptedSeed } from '../lib/midnight/keystore.js';
import { assertEvidenceSafe, classifyWalletReadiness } from '../lib/midnight/protocol.js';

test('wallet keystore encrypts and authenticates a seed', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'aletheia-keystore-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'wallet.json');
  const previous = process.env.ALETHEIA_KEYSTORE_PASSWORD;
  process.env.ALETHEIA_KEYSTORE_PASSWORD = 'test-only-password-1234';
  context.after(() => { if (previous === undefined) delete process.env.ALETHEIA_KEYSTORE_PASSWORD; else process.env.ALETHEIA_KEYSTORE_PASSWORD = previous; });
  const seed = 'ab'.repeat(32);
  await writeEncryptedSeed(file, seed);
  const serialized = await readFile(file, 'utf8');
  assert.doesNotMatch(serialized, new RegExp(seed));
  assert.equal(await readEncryptedSeed(file), seed);
  const payload = JSON.parse(serialized);
  payload.tag = Buffer.alloc(16).toString('base64');
  await writeFile(file, JSON.stringify(payload));
  await assert.rejects(readEncryptedSeed(file));
});

test('wallet keystore rejects weak passwords and malformed seeds', async () => {
  const previous = process.env.ALETHEIA_KEYSTORE_PASSWORD;
  process.env.ALETHEIA_KEYSTORE_PASSWORD = 'short';
  try { await assert.rejects(writeEncryptedSeed(path.join(tmpdir(), 'unused-aletheia-wallet.json'), 'ab'.repeat(32)), /at least 12/); }
  finally { if (previous === undefined) delete process.env.ALETHEIA_KEYSTORE_PASSWORD; else process.env.ALETHEIA_KEYSTORE_PASSWORD = previous; }
});

test('evidence redaction recursively removes private claim material', () => {
  const safe = assertEvidenceSafe({ transactionId: 'tx', nested: { annualIncome: 10, credentialId: 'private', result: 'confirmed' } });
  assert.deepEqual(safe, { transactionId: 'tx', nested: { result: 'confirmed' } });
});

test('wallet readiness remains fail-closed across funding states', () => {
  assert.equal(classifyWalletReadiness(null), 'WALLET_NOT_SYNCED');
  assert.equal(classifyWalletReadiness({ isSynced: true, unshielded: { availableCoins: [], balances: {} } }), 'NO_NIGHT');
  assert.equal(classifyWalletReadiness({ isSynced: true, unshielded: { availableCoins: [{ meta: {} }], balances: { night: 1n } }, dust: { availableCoins: [], pendingCoins: [] } }), 'NIGHT_NOT_REGISTERED_FOR_DUST');
  assert.equal(classifyWalletReadiness({ isSynced: true, unshielded: { availableCoins: [{ meta: { registeredForDustGeneration: true } }], balances: { night: 1n } }, dust: { availableCoins: [{}], pendingCoins: [] } }), 'DUST_READY');
});
