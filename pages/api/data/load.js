// pages/api/data/load.js
// Loads all user data in a single request (accounts, strategies, trades, notes)
import { requireAuth } from '../../../lib/auth';
import { query } from '../../../lib/db';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const uid = req.user.id;

  try {
    const [accounts, strategies, trades, notes] = await Promise.all([
      query('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC', [uid]),
      query('SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at ASC', [uid]),
      query('SELECT * FROM trades WHERE user_id = ? ORDER BY trade_date DESC', [uid]),
      query('SELECT * FROM daily_notes WHERE user_id = ? ORDER BY note_date DESC', [uid]),
    ]);

    // Parse JSON fields from MySQL
    const parseJSON = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch { return []; }
    };

    return res.status(200).json({
      accounts: accounts[0],
      strategies: strategies[0].map(r => ({
        ...r,
        pairs: parseJSON(r.pairs),
        sessions: parseJSON(r.sessions),
      })),
      trades: trades[0].map(r => ({
        ...r,
        images: parseJSON(r.images),
      })),
      notes: notes[0],
    });
  } catch (err) {
    console.error('[load]', err);
    return res.status(500).json({ error: 'Failed to load data' });
  }
}

export default requireAuth(handler);
