const { requireAuth } = require('../../../lib/auth');
const { query } = require('../../../lib/db');

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const uid = req.user.id;

  try {
    const [accounts]   = await query('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC', [uid]);
    const [strategies] = await query('SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at ASC', [uid]);
    const [trades]     = await query('SELECT * FROM trades WHERE user_id = ? ORDER BY trade_date DESC', [uid]);
    const [notes]      = await query('SELECT * FROM daily_notes WHERE user_id = ? ORDER BY note_date DESC', [uid]);

    const parseJ = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch { return []; }
    };

    return res.status(200).json({
      accounts,
      strategies: strategies.map(r => ({ ...r, pairs: parseJ(r.pairs), sessions: parseJ(r.sessions) })),
      trades:     trades.map(r => ({ ...r, images: parseJ(r.images) })),
      notes,
    });
  } catch (err) {
    console.error('[load]', err.message);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = requireAuth(handler);
