// Device-local, encrypted Preprod application-admin recovery. Never a wallet seed.
export const RECOVERY_KEY = 'aletheia:preprod:admin-recovery:v1';
const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
const bytes = (value) => Uint8Array.from(value.match(/../g), (part) => Number.parseInt(part, 16));
const validHex = (value, length) => typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);

function validate(record) {
  if (record?.version !== 1 || record.network !== 'preprod'
    || !validHex(record.vault?.salt, 32) || !validHex(record.vault?.iv, 24)
    || !validHex(record.vault?.ciphertext, 96)) throw new Error('Invalid encrypted Preprod recovery file.');
  if (typeof record.started !== 'boolean' || (record.contractAddress && !validHex(record.contractAddress, 64))) throw new Error('Invalid recovery checkpoint.');
  return record;
}

async function deriveKey(password, salt) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Use a recovery passphrase of at least 12 characters. Do not use your wallet seed.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export function readRecovery(storage) {
  const serialized = storage.getItem(RECOVERY_KEY);
  return serialized ? validate(JSON.parse(serialized)) : null;
}

export function saveRecovery(storage, record) {
  const serialized = JSON.stringify(validate(record));
  storage.setItem(RECOVERY_KEY, serialized);
  if (storage.getItem(RECOVERY_KEY) !== serialized) throw new Error('Recovery storage failed. No deployment is safe until browser storage works.');
}

export async function createRecovery(storage, password) {
  if (storage.getItem(RECOVERY_KEY)) throw new Error('A saved recovery already exists. Unlock it instead of replacing it.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const key = await deriveKey(password, salt);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, secret));
  const record = { version: 1, network: 'preprod', vault: { salt: hex(salt), iv: hex(iv), ciphertext: hex(ciphertext) }, started: false, contractAddress: '', transactions: [] };
  saveRecovery(storage, record);
  return { record, secret };
}

export async function unlockRecovery(record, password) {
  validate(record);
  const key = await deriveKey(password, bytes(record.vault.salt));
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(record.vault.iv) }, key, bytes(record.vault.ciphertext)));
  } catch { throw new Error('Wrong recovery passphrase or damaged recovery file. Nothing was submitted.'); }
}

export async function importRecovery(storage, serialized, password) {
  if (serialized.length > 32000) throw new Error('Recovery file is too large.');
  const record = validate(JSON.parse(serialized));
  const secret = await unlockRecovery(record, password);
  const existing = readRecovery(storage);
  if (existing && JSON.stringify(existing.vault) !== JSON.stringify(record.vault)) throw new Error('A different recovery is already saved here. Use a separate browser profile to avoid overwriting it.');
  // An older downloaded backup must not roll back a newer local checkpoint.
  const retained = existing || record;
  if (!existing) saveRecovery(storage, record);
  return { record: retained, secret };
}

export async function withDeploymentLock(locks, action) {
  if (!locks?.request) throw new Error('Use current Chrome on localhost or HTTPS so deployment locking is available.');
  return locks.request(RECOVERY_KEY, { mode: 'exclusive', ifAvailable: true }, (lock) => {
    if (!lock) throw new Error('Deployment is already running in another tab. Return to that tab.');
    return action();
  });
}
