import { randomBytes } from 'node:crypto';
import { Bytes32Descriptor, ecMulGenerator, transientHash } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Aletheia } from 'aletheia-compact-contract';

const JUBJUB_ORDER = 6554484396890773809930967563523245729705921265872317281365359162392183254199n;
const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
const PROVIDER_ID = 1n;

function scalar(bytes = randomBytes(32)) { return BigInt(`0x${bytes.toString('hex')}`) % JUBJUB_ORDER; }
function issuerSecret() {
  const configured = process.env.ALETHEIA_DEMO_ISSUER_SECRET;
  if (!configured) throw new Error('The signed demo issuer is not configured. Set ALETHEIA_DEMO_ISSUER_SECRET.');
  return BigInt(`0x${configured.replace(/^0x/, '')}`) % JUBJUB_ORDER;
}
function sign(secret, message) {
  const publicKey = ecMulGenerator(secret); const nonce = scalar(); const announcement = ecMulGenerator(nonce);
  const full = Aletheia.pureCircuits.schnorrChallenge(announcement.x, announcement.y, publicKey.x, publicKey.y, message);
  const challenge = full % TWO_248;
  return { publicKey, signature: { announcement, response: (nonce + challenge * secret) % JUBJUB_ORDER } };
}
function stringify(value) { return JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item)); }

export function issueDemoCredential(subjectHash, profile = 'eligible') {
  const credentialId = randomBytes(32); const eligible = profile !== 'ineligible';
  const credential = { age: eligible ? 34n : 16n, jurisdiction: 566n, householdSize: 4n, annualIncome: 1800000n, credentialId: new Uint8Array(credentialId) };
  const message = [credential.age, credential.jurisdiction, credential.householdSize, credential.annualIncome, transientHash(Bytes32Descriptor, credential.credentialId), BigInt(subjectHash)];
  const signed = sign(issuerSecret(), message);
  return stringify({ providerId: PROVIDER_ID, profile, credential: { ...credential, credentialId: credentialId.toString('hex') }, ...signed });
}

export function demoIssuerPublicKey() { return stringify({ providerId: PROVIDER_ID, publicKey: ecMulGenerator(issuerSecret()), label: 'Alethia signed demo issuer — test credentials only' }); }
