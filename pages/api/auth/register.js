// pages/api/auth/register.js
import bcrypt from 'bcryptjs';
import { query } from '../../../lib/db';
import { signToken, setAuthCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    // Check if email exists
    const [existing] = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) return res.status(400).json({ error: 'An account with this email already exists' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await query(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email.toLowerCase(), hash]
    );

    const [rows] = await query('SELECT id, email FROM users WHERE id = LAST_INSERT_ID()');
    // Note: MySQL UUID default — fetch by email if LAST_INSERT_ID doesn't work with UUID
    const [user] = await query('SELECT id, email FROM users WHERE email = ?', [email.toLowerCase()]);

    const token = signToken({ id: user[0].id, email: user[0].email });
    setAuthCookie(res, token);

    return res.status(201).json({ user: { id: user[0].id, email: user[0].email } });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
}
