import { demoIssuerPublicKey, issueDemoCredential } from '../lib/issuer.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return res.status(200).json(demoIssuerPublicKey());
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    const { subjectHash, profile = 'eligible' } = req.body || {};
    if (!/^\d{1,80}$/.test(String(subjectHash)) || !['eligible', 'ineligible'].includes(profile)) return res.status(400).json({ error: 'A valid private subject commitment and demo profile are required.' });
    return res.status(201).json(issueDemoCredential(subjectHash, profile));
  } catch (error) { return res.status(503).json({ error: error.message }); }
}
