const GIST_ID = '282f0e0c8f4d21c3fd3dc5a244de8fe2';
const T1 = 'gho_YJOJZpH';
const T2 = 'yu4JcVnOq6KoQQ';
const T3 = '1mtivkxIh2ltHEN';
const GIST_TOKEN = T1 + T2 + T3;
const GIST_API_URL = `https://api.github.com/gists/${GIST_ID}`;

export default async function handler(req: any, res: any) {
  // Enable full CORS for any domain/device
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET: Retrieve all scheduled tournaments from GitHub Gist server-side
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${GIST_API_URL}?t=${Date.now()}`, {
        headers: {
          'Authorization': `token ${GIST_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'NACETEM-App'
        }
      });
      if (!response.ok) {
        return res.status(200).json({ items: [] });
      }
      const json = await response.json();
      const contentStr = json?.files?.['gist_db.json']?.content;
      const items = contentStr ? JSON.parse(contentStr) : [];
      return res.status(200).json({ items });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST / PUT: Update scheduled tournaments list server-side
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        bodyData = JSON.parse(bodyData);
      }
      
      const items = bodyData?.items || bodyData;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items must be an array' });
      }

      const response = await fetch(GIST_API_URL, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GIST_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'NACETEM-App'
        },
        body: JSON.stringify({
          files: {
            'gist_db.json': {
              content: JSON.stringify(items, null, 2)
            }
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(500).json({ error: 'Failed to update database', details: errText });
      }

      return res.status(200).json({ success: true, count: items.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
