const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../../../lib/db');
const { signToken, setAuthCookie } = require('../../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const [existing] = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) return res.status(400).json({ error: 'An account with this email already exists' });

    const hash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    await query('INSERT INTO users (id, email, password) VALUES (?, ?, ?)', [id, email.toLowerCase(), hash]);

    const token = signToken({ id, email: email.toLowerCase() });
    setAuthCookie(res, token);
    return res.status(201).json({ user: { id, email: email.toLowerCase() } });
  } catch (err) {
    console.error('[register]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
