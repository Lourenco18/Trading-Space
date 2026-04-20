const { getUser } = require('../../../lib/auth');

module.exports = function handler(req, res) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  return res.status(200).json({ user: { id: user.id, email: user.email } });
};
