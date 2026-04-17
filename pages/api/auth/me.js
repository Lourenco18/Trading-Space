// pages/api/auth/me.js
import { getUser } from '../../../lib/auth';

export default function handler(req, res) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  return res.status(200).json({ user: { id: user.id, email: user.email } });
}
