const { clearAuthCookie } = require('../../../lib/auth');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  clearAuthCookie(res);
  return res.status(200).json({ ok: true });
};
