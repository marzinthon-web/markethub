export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return res.status(500).json({ error: 'Database is not configured.' });
  try {
    const url = new URL('/rest/v1/pi_listings', base);
    url.searchParams.set('select', 'id,title,description,listing_type,transaction_type,category,price,currency,price_ngn,state,city,quantity,unit,created_at');
    url.searchParams.set('status', 'eq.published');
    url.searchParams.set('order', 'created_at.desc');
    const response = await fetch(url, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
    if (!response.ok) return res.status(502).json({ error: 'Could not load marketplace listings.' });
    return res.status(200).json({ listings: await response.json() });
  } catch (error) {
    console.error('Listing fetch error:', error);
    return res.status(500).json({ error: 'Unexpected error while loading listings.' });
  }
}
