// Local-only relay to the issuer explicitly approved by the project owner.
export const DEMO_ISSUER_ORIGIN = 'https://alethia-pi.vercel.app';
const decimal = value => typeof value === 'string' && /^\d{1,80}$/.test(value);
const point = value => decimal(value?.x) && decimal(value?.y);
const unavailable = () => ({ status: 503, body: { error: 'The production demo issuer is unavailable or returned an invalid credential.' } });

export async function relayDemoCredential(method, body, origin, request = fetch) {
  if (origin !== DEMO_ISSUER_ORIGIN) throw new Error('Unsupported demo issuer origin.');
  if (!['GET', 'POST'].includes(method)) return { status: 405, body: { error: 'Method not allowed.' } };
  const options = { method, headers: { 'content-type': 'application/json' }, redirect: 'error', credentials: 'omit', signal: globalThis.AbortSignal.timeout(15000) };
  const { subjectHash, profile = 'eligible' } = body || {};
  if (method === 'POST') {
    if (!decimal(subjectHash) || !['eligible', 'ineligible'].includes(profile)) return { status: 400, body: { error: 'Invalid demo commitment or profile.' } };
    // No cookies, authorization, wallet identifiers, or other caller fields.
    options.body = JSON.stringify({ subjectHash, profile });
  }
  try {
    const response = await request(`${DEMO_ISSUER_ORIGIN}/api/credentials`, options);
    if (!response.ok) return unavailable();
    const data = await response.json();
    if (data?.providerId !== '1' || !point(data.publicKey)) return unavailable();
    const result = { providerId: data.providerId, publicKey: { x: data.publicKey.x, y: data.publicKey.y } };
    if (method === 'GET') return { status: 200, body: { ...result, label: 'Aletheia signed demo issuer — test credentials only' } };
    const credential = data.credential;
    if (data.profile !== profile || !['age', 'jurisdiction', 'householdSize', 'annualIncome'].every(key => decimal(credential?.[key]))
      || typeof credential?.credentialId !== 'string' || !/^[a-f0-9]{64}$/i.test(credential.credentialId)
      || !point(data.signature?.announcement) || !decimal(data.signature?.response)) return unavailable();
    return { status: 201, body: { ...result, profile, credential: {
      age: credential.age, jurisdiction: credential.jurisdiction, householdSize: credential.householdSize,
      annualIncome: credential.annualIncome, credentialId: credential.credentialId
    }, signature: { announcement: { x: data.signature.announcement.x, y: data.signature.announcement.y }, response: data.signature.response } } };
  } catch { return unavailable(); }
}
