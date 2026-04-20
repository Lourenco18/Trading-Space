const bcrypt = require('bcryptjs');
const { query } = require('../../../lib/db');
const { signToken, setAuthCookie } = require('../../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const [rows] = await query('SELECT id, email, password FROM users WHERE email = ?', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Incorrect email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect email or password' });

    const token = signToken({ id: user.id, email: user.email });
    setAuthCookie(res, token);
    return res.status(200).json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
