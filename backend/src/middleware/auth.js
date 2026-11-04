const jwt = require('jsonwebtoken');
const pool = require('../db');

// Verifies the Bearer token and loads the user
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in first.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT id, full_name, email, phone, role, status FROM users WHERE id = ?', [payload.id]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Account not found.' });
    if (user.status === 'suspended') return res.status(403).json({ message: 'Your account is suspended.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
}

// Usage: requireRole('owner', 'admin')
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'You do not have access to this.' });

module.exports = { requireAuth, requireRole };
