const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../../../lib/auth');
const { query } = require('../../../lib/db');

async function handler(req, res) {
  const uid = req.user.id;

  if (req.method === 'POST') {
    const { account_id, strategy_id, trade_date, asset, direction, lots, pnl, risk_pct, rr, result, session, setup, notes, images } = req.body;
    if (!account_id) return res.status(400).json({ error: 'Account is required' });
    if (!asset) return res.status(400).json({ error: 'Asset is required' });
    const [accCheck] = await query('SELECT id FROM accounts WHERE id = ? AND user_id = ?', [account_id, uid]);
    if (!accCheck.length) return res.status(403).json({ error: 'Invalid account' });
    const id = uuidv4();
    try {
      await query(
        'INSERT INTO trades (id, user_id, account_id, strategy_id, trade_date, asset, direction, lots, pnl, risk_pct, rr, result, session, setup, notes, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, uid, account_id, strategy_id||null, trade_date||null, asset, direction||'Buy', lots||null, pnl||0, risk_pct||null, rr||null, result||'Win', session||null, setup||null, notes||null, JSON.stringify(images||[])]
      );
      const [rows] = await query('SELECT * FROM trades WHERE id = ?', [id]);
      const r = rows[0];
      return res.status(201).json({ data: { ...r, images: JSON.parse(r.images||'[]') } });
    } catch (err) {
      console.error('[trades POST]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });
    const { account_id, strategy_id, trade_date, asset, direction, lots, pnl, risk_pct, rr, result, session, setup, notes, images } = req.body;
    try {
      const [check] = await query('SELECT id FROM trades WHERE id = ? AND user_id = ?', [id, uid]);
      if (!check.length) return res.status(404).json({ error: 'Not found' });
      await query(
        'UPDATE trades SET account_id=?, strategy_id=?, trade_date=?, asset=?, direction=?, lots=?, pnl=?, risk_pct=?, rr=?, result=?, session=?, setup=?, notes=?, images=? WHERE id=?',
        [account_id, strategy_id||null, trade_date||null, asset, direction||'Buy', lots||null, pnl||0, risk_pct||null, rr||null, result||'Win', session||null, setup||null, notes||null, JSON.stringify(images||[]), id]
      );
      const [rows] = await query('SELECT * FROM trades WHERE id = ?', [id]);
      const r = rows[0];
      return res.status(200).json({ data: { ...r, images: JSON.parse(r.images||'[]') } });
    } catch (err) {
      console.error('[trades PUT]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });
    try {
      const [check] = await query('SELECT id FROM trades WHERE id = ? AND user_id = ?', [id, uid]);
      if (!check.length) return res.status(404).json({ error: 'Not found' });
      await query('DELETE FROM trades WHERE id = ?', [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[trades DELETE]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end();
}

module.exports = requireAuth(handler);
