// pages/api/data/accounts.js
import { requireAuth } from '../../../lib/auth';
import { query } from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

async function handler(req, res) {
  const uid = req.user.id;

  // POST — create
  if (req.method === 'POST') {
    const { name, firm, capital, split, profit_target, max_dd, daily_dd, status, market } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = uuidv4();
    try {
      await query(
        `INSERT INTO accounts (id, user_id, name, firm, capital, split, profit_target, max_dd, daily_dd, status, market)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, uid, name, firm || '', capital || 0, split || 80, profit_target || 10, max_dd || 10, daily_dd || 5, status || 'Challenge', market || 'Forex']
      );
      const [rows] = await query('SELECT * FROM accounts WHERE id = ?', [id]);
      return res.status(201).json({ data: rows[0] });
    } catch (err) {
      console.error('[accounts POST]', err);
      return res.status(500).json({ error: 'Failed to create account' });
    }
  }

  // DELETE — delete account and all its trades (cascade)
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });
    try {
      // Verify ownership
      const [rows] = await query('SELECT id FROM accounts WHERE id = ? AND user_id = ?', [id, uid]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      await query('DELETE FROM accounts WHERE id = ?', [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[accounts DELETE]', err);
      return res.status(500).json({ error: 'Failed to delete account' });
    }
  }

  return res.status(405).end();
}

export default requireAuth(handler);
