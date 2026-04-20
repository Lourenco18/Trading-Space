const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../../../lib/auth');
const { query } = require('../../../lib/db');

async function handler(req, res) {
  const uid = req.user.id;

  if (req.method === 'POST') {
    const { name, firm, capital, split, profit_target, max_dd, daily_dd, status, market } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = uuidv4();
    try {
      await query(
        'INSERT INTO accounts (id, user_id, name, firm, capital, split, profit_target, max_dd, daily_dd, status, market) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, uid, name, firm||'', capital||0, split||80, profit_target||10, max_dd||10, daily_dd||5, status||'Challenge', market||'Forex']
      );
      const [rows] = await query('SELECT * FROM accounts WHERE id = ?', [id]);
      return res.status(201).json({ data: rows[0] });
    } catch (err) {
      console.error('[accounts POST]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });
    try {
      const [rows] = await query('SELECT id FROM accounts WHERE id = ? AND user_id = ?', [id, uid]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      await query('DELETE FROM accounts WHERE id = ?', [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[accounts DELETE]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end();
}

module.exports = requireAuth(handler);
