const bcrypt = require('bcryptjs');
const { query } = require('../../../lib/db');
const { signToken, setAuthCookie } = require('../../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Diagnóstico — confirmar variáveis de ambiente
  const envCheck = {
    MYSQL_HOST:     !!process.env.MYSQL_HOST,
    MYSQL_USER:     !!process.env.MYSQL_USER,
    MYSQL_PASSWORD: !!process.env.MYSQL_PASSWORD,
    MYSQL_DATABASE: !!process.env.MYSQL_DATABASE,
    JWT_SECRET:     !!process.env.JWT_SECRET,
  };
  const missingEnv = Object.entries(envCheck).filter(([,v]) => !v).map(([k]) => k);
  if (missingEnv.length > 0) {
    return res.status(500).json({ error: 'Missing env vars: ' + missingEnv.join(', ') });
  }

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
    console.error('[login error]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
