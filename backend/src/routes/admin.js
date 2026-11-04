const router = require('express').Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { imageUpload } = require('../utils/upload');
const { asyncHandler } = require('../utils/helpers');

router.use(requireAuth, requireRole('admin'));

// GET /api/admin/stats
router.get('/stats', asyncHandler(async (req, res) => {
  const [[u]] = await pool.query(
    "SELECT SUM(role='player') AS players, SUM(role='owner') AS owners FROM users");
  const [[f]] = await pool.query(
    "SELECT SUM(status='approved') AS approved, SUM(status='pending') AS pending, COUNT(*) AS total FROM facilities");
  const [[b]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(status IN ('confirmed','completed')) AS successful,
            COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN total_amount END),0) AS gross
     FROM bookings`);
  const [[plans]] = await pool.query(
    `SELECT SUM(plan='starter') AS starter, SUM(plan='pro') AS pro, SUM(plan='club') AS club
     FROM facilities WHERE status='approved'`);
  const prices = { starter: 499, pro: 999, club: 1999 };
  const mrr = (plans.starter || 0) * prices.starter + (plans.pro || 0) * prices.pro + (plans.club || 0) * prices.club;
  res.json({
    players: Number(u.players || 0), owners: Number(u.owners || 0),
    facilities_total: Number(f.total || 0), facilities_approved: Number(f.approved || 0), facilities_pending: Number(f.pending || 0),
    bookings_total: Number(b.total || 0), bookings_successful: Number(b.successful || 0), gross_bookings: Number(b.gross || 0),
    plans: { starter: Number(plans.starter || 0), pro: Number(plans.pro || 0), club: Number(plans.club || 0) },
    mrr,
  });
}));

// ---------- Facilities ----------
router.get('/facilities', asyncHandler(async (req, res) => {
  const { status = '' } = req.query;
  const [rows] = await pool.query(
    `SELECT f.*, u.full_name AS owner_name, u.email AS owner_email,
            (SELECT COUNT(*) FROM courts c WHERE c.facility_id=f.id) AS court_count
     FROM facilities f JOIN users u ON u.id=f.owner_id
     WHERE (?='' OR f.status=?)
     ORDER BY FIELD(f.status,'pending','approved','suspended'), f.created_at DESC`, [status, status]);
  res.json(rows);
}));

// PATCH /api/admin/facilities/:id  { status?, plan? }
router.patch('/facilities/:id', asyncHandler(async (req, res) => {
  const { status, plan } = req.body;
  if (status && !['pending', 'approved', 'suspended'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  if (plan && !['starter', 'pro', 'club'].includes(plan)) return res.status(400).json({ message: 'Invalid plan.' });
  const [r] = await pool.query(
    'UPDATE facilities SET status=COALESCE(?,status), plan=COALESCE(?,plan) WHERE id=?', [status || null, plan || null, req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Facility not found.' });
  res.json({ message: 'Facility updated.' });
}));

// ---------- Users ----------
router.get('/users', asyncHandler(async (req, res) => {
  const { role = '', q = '' } = req.query;
  const [rows] = await pool.query(
    `SELECT id, full_name, email, phone, role, status, created_at FROM users
     WHERE (?='' OR role=?) AND (full_name LIKE ? OR email LIKE ?) ORDER BY created_at DESC`,
    [role, role, `%${q}%`, `%${q}%`]);
  res.json(rows);
}));

router.patch('/users/:id', asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'You cannot suspend yourself.' });
  await pool.query("UPDATE users SET status=? WHERE id=? AND role<>'admin'", [status, req.params.id]);
  res.json({ message: `User ${status}.` });
}));

// ---------- Bookings ----------
router.get('/bookings', asyncHandler(async (req, res) => {
  const { status = '' } = req.query;
  const [rows] = await pool.query(
    `SELECT b.*, c.name AS court_name, f.name AS facility_name, u.full_name AS player_name
     FROM bookings b JOIN courts c ON c.id=b.court_id JOIN facilities f ON f.id=c.facility_id JOIN users u ON u.id=b.player_id
     WHERE (?='' OR b.status=?) ORDER BY b.created_at DESC LIMIT 300`, [status, status]);
  res.json(rows);
}));

// ---------- Platform settings (super admin GCash QR) ----------
router.get('/settings', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM settings');
  res.json(Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value])));
}));

router.put('/settings', asyncHandler(async (req, res) => {
  const { platform_gcash_name, platform_gcash_number } = req.body;
  const upsert = 'INSERT INTO settings VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)';
  await pool.query(upsert, ['platform_gcash_name', platform_gcash_name || '']);
  await pool.query(upsert, ['platform_gcash_number', platform_gcash_number || '']);
  res.json({ message: 'Settings saved.' });
}));

router.post('/settings/qr', imageUpload('qr').single('qr'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Upload a QR image.' });
  const url = `/uploads/qr/${req.file.filename}`;
  await pool.query(
    "INSERT INTO settings VALUES ('platform_gcash_qr',?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)", [url]);
  res.json({ platform_gcash_qr: url, message: 'Platform GCash QR saved.' });
}));

module.exports = router;
