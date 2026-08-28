import { Buffer } from 'node:buffer';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FORMAT = 'aletheia-wallet-keystore-v1';
const HEX_SEED = /^[a-f0-9]{64}$/i;

function key(password, salt) { return scryptSync(password, salt, 32); }
function password() {
  const value = process.env.ALETHEIA_KEYSTORE_PASSWORD;
  if (!value || value.length < 12) throw new Error('ALETHEIA_KEYSTORE_PASSWORD must be set at runtime and contain at least 12 characters. Do not place it in .env.');
  return value;
}

export async function writeEncryptedSeed(file, seed) {
  if (!HEX_SEED.test(seed)) throw new Error('WALLET_SEED_INVALID');
  const salt = randomBytes(16); const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key(password(), salt), iv);
  const ciphertext = Buffer.concat([cipher.update(seed, 'utf8'), cipher.final()]);
  const payload = { format: FORMAT, kdf: 'scrypt', cipher: 'aes-256-gcm', salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
}

export async function readEncryptedSeed(file) {
  const payload = JSON.parse(await readFile(file, 'utf8'));
  if (payload?.format !== FORMAT || payload.kdf !== 'scrypt' || payload.cipher !== 'aes-256-gcm') throw new Error('WALLET_KEYSTORE_FORMAT_INVALID');
  const salt = Buffer.from(payload.salt || '', 'base64');
  const iv = Buffer.from(payload.iv || '', 'base64');
  const tag = Buffer.from(payload.tag || '', 'base64');
  const ciphertext = Buffer.from(payload.ciphertext || '', 'base64');
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) throw new Error('WALLET_KEYSTORE_FORMAT_INVALID');
  const decipher = createDecipheriv('aes-256-gcm', key(password(), salt), iv);
  decipher.setAuthTag(tag);
  const seed = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  if (!HEX_SEED.test(seed)) throw new Error('WALLET_SEED_INVALID');
  return seed;
}
