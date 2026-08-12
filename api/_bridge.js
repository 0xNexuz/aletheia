const API_ORIGIN = process.env.ALETHIA_API_ORIGIN;
const SITES_TOKEN = process.env.ALETHIA_SITES_TOKEN;

export async function forwardAlethia(req, res, endpoint, allowedMethods) {
  if (!allowedMethods.includes(req.method)) {
    res.setHeader('allow', allowedMethods.join(', '));
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!API_ORIGIN || !SITES_TOKEN) return res.status(503).json({ error: 'Alethia service is not configured.' });

  const sourceUrl = new URL(req.url, 'https://vercel.local');
  const target = new URL(endpoint, API_ORIGIN);
  target.search = sourceUrl.search;
  const headers = {
    accept: 'application/json',
    'OAI-Sites-Authorization': `Bearer ${SITES_TOKEN}`,
  };
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(req.body || {});
  }

  try {
    const upstream = await fetch(target, { method: req.method, headers, body });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    return res.send(text);
  } catch {
    return res.status(502).json({ error: 'Alethia service is temporarily unavailable.' });
  }
}