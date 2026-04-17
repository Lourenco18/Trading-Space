// pages/api/data/strategies.js
import { requireAuth } from '../../../lib/auth';
import { query } from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

async function handler(req, res) {
  const uid = req.user.id;

  if (req.method === 'POST') {
    const { name, color, description, entry_rules, exit_rules, timeframe, min_rr, risk_pct, notes, pairs, sessions } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = uuidv4();
    try {
      await query(
        `INSERT INTO strategies (id, user_id, name, color, description, entry_rules, exit_rules, timeframe, min_rr, risk_pct, notes, pairs, sessions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, uid, name, color || '#818cf8', description || '', entry_rules || '', exit_rules || '',
         timeframe || '', min_rr || '', risk_pct || null, notes || '',
         JSON.stringify(pairs || []), JSON.stringify(sessions || [])]
      );
      const [rows] = await query('SELECT * FROM strategies WHERE id = ?', [id]);
      const row = rows[0];
      return res.status(201).json({
        data: { ...row, pairs: JSON.parse(row.pairs || '[]'), sessions: JSON.parse(row.sessions || '[]') }
      });
    } catch (err) {
      console.error('[strategies POST]', err);
      return res.status(500).json({ error: 'Failed to create strategy' });
    }
  }

  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });
    const { name, color, description, entry_rules, exit_rules, timeframe, min_rr, risk_pct, notes, pairs, sessions } = req.body;
    try {
      const [check] = await query('SELECT id FROM strategies WHERE id = ? AND user_id = ?', [id, uid]);
      if (!check.length) return res.status(404).json({ error: 'Not found' });
      await query(
        `UPDATE strategies SET name=?, color=?, description=?, entry_rules=?, exit_rules=?, timeframe=?, min_rr=?, risk_pct=?, notes=?, pairs=?, sessions=? WHERE id=?`,
        [name, color || '#818cf8', description || '', entry_rules || '', exit_rules || '',
         timeframe || '', min_rr || '', risk_pct || null, notes || '',
         JSON.stringify(pairs || []), JSON.stringify(sessions || []), id]
      );
      const [rows] = await query('SELECT * FROM strategies WHERE id = ?', [id]);
      const row = rows[0];
      return res.status(200).json({
        data: { ...row, pairs: JSON.parse(row.pairs || '[]'), sessions: JSON.parse(row.sessions || '[]') }
      });
    } catch (err) {
      console.error('[strategies PUT]', err);
      return res.status(500).json({ error: 'Failed to update strategy' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });
    try {
      const [check] = await query('SELECT id FROM strategies WHERE id = ? AND user_id = ?', [id, uid]);
      if (!check.length) return res.status(404).json({ error: 'Not found' });
      // Nullify strategy_id in trades first (FK is ON DELETE SET NULL but let's be safe)
      await query('UPDATE trades SET strategy_id = NULL WHERE strategy_id = ? AND user_id = ?', [id, uid]);
      await query('DELETE FROM strategies WHERE id = ?', [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[strategies DELETE]', err);
      return res.status(500).json({ error: 'Failed to delete strategy' });
    }
  }

  return res.status(405).end();
}

export default requireAuth(handler);
