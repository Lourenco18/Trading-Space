// pages/api/data/notes.js
import { requireAuth } from '../../../lib/auth';
import { query } from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

async function handler(req, res) {
  const uid = req.user.id;

  if (req.method === 'POST') {
    const { note_date, mood, analysis, plan } = req.body;
    const id = uuidv4();
    const date = note_date || new Date().toISOString().slice(0, 10);
    try {
      // Use INSERT ... ON DUPLICATE KEY UPDATE to handle unique constraint (user_id, note_date)
      await query(
        `INSERT INTO daily_notes (id, user_id, note_date, mood, analysis, plan)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE mood=VALUES(mood), analysis=VALUES(analysis), plan=VALUES(plan)`,
        [id, uid, date, mood || 'Neutral', analysis || '', plan || '']
      );
      const [rows] = await query('SELECT * FROM daily_notes WHERE user_id = ? AND note_date = ?', [uid, date]);
      return res.status(201).json({ data: rows[0] });
    } catch (err) {
      console.error('[notes POST]', err);
      return res.status(500).json({ error: 'Failed to save note' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });
    try {
      const [check] = await query('SELECT id FROM daily_notes WHERE id = ? AND user_id = ?', [id, uid]);
      if (!check.length) return res.status(404).json({ error: 'Not found' });
      await query('DELETE FROM daily_notes WHERE id = ?', [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[notes DELETE]', err);
      return res.status(500).json({ error: 'Failed to delete note' });
    }
  }

  return res.status(405).end();
}

export default requireAuth(handler);
