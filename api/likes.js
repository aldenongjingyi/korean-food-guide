// Shared like counter for the Korean Wave cards, stored in Upstash Redis.
const IDS = ['kpop', 'kdrama', 'social'];
const MAX_PER_REQUEST = 50;

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!URL_ || !TOKEN) return res.status(500).json({ error: 'Storage is not configured' });

  try {
    if (req.method === 'GET') {
      const vals = await redis('MGET', ...IDS.map(id => `likes:${id}`));
      return res.status(200).json(Object.fromEntries(IDS.map((id, i) => [id, Number(vals[i]) || 0])));
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { id } = body;
      const n = Math.min(MAX_PER_REQUEST, Math.max(1, Math.floor(Number(body.n) || 1)));
      if (!IDS.includes(id)) return res.status(400).json({ error: 'Unknown card' });
      const count = await redis('INCRBY', `likes:${id}`, n);
      return res.status(200).json({ id, count });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach the like counter' });
  }
};
