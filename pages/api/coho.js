export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path, ...params } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  const query = new URLSearchParams(params).toString();
  const url = 'https://api.coho.life/v1/public' + path + (query ? '?' + query : '');

  try {
    const r = await fetch(url, {
      headers: { 'Authorization': 'Bearer bf7c7e9f-37ab-414a-9267-288fa895817c' }
    });
    if (!r.ok) {
      const body = await r.text();
      return res.status(r.status).json({ error: body });
    }
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
