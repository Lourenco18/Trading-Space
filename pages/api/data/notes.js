const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../../../lib/auth');
const { query } = require('../../../lib/db');

async function handler(req, res) {
  const uid = req.user.id;

  if (req.method === 'POST') {
    const { note_date, mood, analysis, plan } = req.body;
    const id = uuidv4();
    const date = note_date || new Date().toISOString().slice(0, 10);
    try {
      await query(
        'INSERT INTO daily_notes (id, user_id, note_date, mood, analysis, plan) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE mood=VALUES(mood), analysis=VALUES(analysis), plan=VALUES(plan)',
        [id, uid, date, mood||'Neutral', analysis||'', plan||'']
      );
      const [rows] = await query('SELECT * FROM daily_notes WHERE user_id = ? AND note_date = ?', [uid, date]);
      return res.status(201).json({ data: rows[0] });
    } catch (err) {
      console.error('[notes POST]', err.message);
      return res.status(500).json({ error: err.message });
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
      console.error('[notes DELETE]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end();
}

module.exports = requireAuth(handler);
