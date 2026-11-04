const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const sign = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (u) => ({ id: u.id, full_name: u.full_name, email: u.email, phone: u.phone, role: u.role });

// POST /api/auth/register
// Players register directly. Owners also send their facility details; the facility waits for super admin approval.
router.post('/register', asyncHandler(async (req, res) => {
  const { full_name, email, phone, password, role = 'player', facility_name, facility_address, facility_city } = req.body;

  if (!full_name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Please enter a valid email.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  if (!['player', 'owner'].includes(role)) return res.status(400).json({ message: 'Invalid account type.' });
  if (role === 'owner' && (!facility_name || !facility_address))
    return res.status(400).json({ message: 'Facility name and address are required for court owners.' });

  const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (exists.length) return res.status(409).json({ message: 'This email is already registered.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO users (full_name,email,phone,password_hash,role) VALUES (?,?,?,?,?)',
      [full_name.trim(), email.toLowerCase().trim(), phone || null, await bcrypt.hash(password, 10), role]);
    if (role === 'owner') {
      await conn.query(
        'INSERT INTO facilities (owner_id,name,address,city,contact_phone,gcash_name,gcash_number) VALUES (?,?,?,?,?,?,?)',
        [r.insertId, facility_name.trim(), facility_address.trim(), facility_city || 'Cebu City', phone || null, full_name.trim(), phone || null]);
    }
    await conn.commit();
    const user = { id: r.insertId, full_name, email: email.toLowerCase(), phone, role };
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ message: 'Incorrect email or password.' });
  if (user.status === 'suspended') return res.status(403).json({ message: 'Your account is suspended. Contact PickleBook support.' });

  res.json({ token: sign(user), user: publicUser(user) });
}));

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// PUT /api/auth/me  (update profile)
router.put('/me', requireAuth, asyncHandler(async (req, res) => {
  const { full_name, phone } = req.body;
  if (!full_name) return res.status(400).json({ message: 'Name is required.' });
  await pool.query('UPDATE users SET full_name=?, phone=? WHERE id=?', [full_name, phone || null, req.user.id]);
  res.json({ user: publicUser({ ...req.user, full_name, phone }) });
}));

module.exports = router;
