const router = require('express').Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { imageUpload } = require('../utils/upload');
const { asyncHandler, isValidDate, todayPH } = require('../utils/helpers');

router.use(requireAuth, requireRole('owner'));

// Helpers to make sure the owner only touches their own records
async function ownFacility(ownerId, facilityId) {
  const [[f]] = await pool.query('SELECT * FROM facilities WHERE id=? AND owner_id=?', [facilityId, ownerId]);
  return f;
}
async function ownCourt(ownerId, courtId) {
  const [[c]] = await pool.query(
    'SELECT c.* FROM courts c JOIN facilities f ON f.id=c.facility_id WHERE c.id=? AND f.owner_id=?', [courtId, ownerId]);
  return c;
}

// ---------- Dashboard ----------
// GET /api/owner/stats
router.get('/stats', asyncHandler(async (req, res) => {
  const today = todayPH();
  const [[s]] = await pool.query(
    `SELECT
       SUM(b.booking_date = ? AND b.status IN ('confirmed','completed','for_verification')) AS today_bookings,
       SUM(b.status = 'for_verification') AS to_verify,
       SUM(b.booking_date >= ? AND b.status = 'confirmed') AS upcoming,
       COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed')
                     AND DATE_FORMAT(b.booking_date,'%Y-%m') = DATE_FORMAT(?,'%Y-%m') THEN b.total_amount END),0) AS month_revenue
     FROM bookings b JOIN courts c ON c.id=b.court_id JOIN facilities f ON f.id=c.facility_id
     WHERE f.owner_id = ?`, [today, today, today, req.user.id]);

  // Bookings per hour of day (popular time slots) - last 60 days
  const [popular] = await pool.query(
    `SELECT b.start_hour AS hour, COUNT(*) AS total
     FROM bookings b JOIN courts c ON c.id=b.court_id JOIN facilities f ON f.id=c.facility_id
     WHERE f.owner_id=? AND b.status IN ('confirmed','completed')
       AND b.booking_date >= (? - INTERVAL 60 DAY)
     GROUP BY b.start_hour ORDER BY b.start_hour`, [req.user.id, today]);

  // Revenue for the last 7 days
  const [week] = await pool.query(
    `SELECT b.booking_date AS date, SUM(b.total_amount) AS revenue, COUNT(*) AS bookings
     FROM bookings b JOIN courts c ON c.id=b.court_id JOIN facilities f ON f.id=c.facility_id
     WHERE f.owner_id=? AND b.status IN ('confirmed','completed')
       AND b.booking_date BETWEEN (? - INTERVAL 6 DAY) AND ?
     GROUP BY b.booking_date ORDER BY b.booking_date`, [req.user.id, today, today]);

  res.json({
    today_bookings: Number(s.today_bookings || 0),
    to_verify: Number(s.to_verify || 0),
    upcoming: Number(s.upcoming || 0),
    month_revenue: Number(s.month_revenue || 0),
    popular_hours: popular,
    week,
  });
}));

// ---------- Facilities ----------
router.get('/facilities', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT f.*, (SELECT COUNT(*) FROM courts c WHERE c.facility_id=f.id) AS court_count
     FROM facilities f WHERE owner_id=? ORDER BY created_at`, [req.user.id]);
  res.json(rows);
}));

router.post('/facilities', asyncHandler(async (req, res) => {
  const { name, address, city, description, contact_phone } = req.body;
  if (!name || !address) return res.status(400).json({ message: 'Name and address are required.' });
  const [r] = await pool.query(
    'INSERT INTO facilities (owner_id,name,address,city,description,contact_phone,gcash_name,gcash_number) VALUES (?,?,?,?,?,?,?,?)',
    [req.user.id, name, address, city || 'Cebu City', description || null, contact_phone || null, req.user.full_name, req.user.phone]);
  res.status(201).json({ id: r.insertId, message: 'Facility submitted for approval.' });
}));

router.put('/facilities/:id', asyncHandler(async (req, res) => {
  const f = await ownFacility(req.user.id, req.params.id);
  if (!f) return res.status(404).json({ message: 'Facility not found.' });
  const { name, description, address, city, contact_phone, open_hour, close_hour, gcash_name, gcash_number } = req.body;
  const open = Number(open_hour ?? f.open_hour), close = Number(close_hour ?? f.close_hour);
  if (!(open >= 0 && close <= 24 && open < close)) return res.status(400).json({ message: 'Check your opening hours.' });
  await pool.query(
    `UPDATE facilities SET name=?, description=?, address=?, city=?, contact_phone=?, open_hour=?, close_hour=?,
       gcash_name=?, gcash_number=? WHERE id=?`,
    [name || f.name, description ?? f.description, address || f.address, city || f.city, contact_phone ?? f.contact_phone,
     open, close, gcash_name ?? f.gcash_name, gcash_number ?? f.gcash_number, f.id]);
  res.json({ message: 'Facility updated.' });
}));

// POST /api/owner/facilities/:id/qr  (multipart: qr image)
router.post('/facilities/:id/qr', imageUpload('qr').single('qr'), asyncHandler(async (req, res) => {
  const f = await ownFacility(req.user.id, req.params.id);
  if (!f) return res.status(404).json({ message: 'Facility not found.' });
  if (!req.file) return res.status(400).json({ message: 'Upload your GCash QR image.' });
  const url = `/uploads/qr/${req.file.filename}`;
  await pool.query('UPDATE facilities SET gcash_qr=? WHERE id=?', [url, f.id]);
  res.json({ gcash_qr: url, message: 'GCash QR saved.' });
}));

// ---------- Courts ----------
router.get('/facilities/:id/courts', asyncHandler(async (req, res) => {
  const f = await ownFacility(req.user.id, req.params.id);
  if (!f) return res.status(404).json({ message: 'Facility not found.' });
  const [rows] = await pool.query('SELECT * FROM courts WHERE facility_id=? ORDER BY name', [f.id]);
  res.json(rows);
}));

router.post('/facilities/:id/courts', asyncHandler(async (req, res) => {
  const f = await ownFacility(req.user.id, req.params.id);
  if (!f) return res.status(404).json({ message: 'Facility not found.' });
  const { name, surface = 'outdoor', hourly_rate } = req.body;
  if (!name || !(Number(hourly_rate) > 0)) return res.status(400).json({ message: 'Court name and hourly rate are required.' });
  const [r] = await pool.query('INSERT INTO courts (facility_id,name,surface,hourly_rate) VALUES (?,?,?,?)',
    [f.id, name, surface, hourly_rate]);
  res.status(201).json({ id: r.insertId, message: 'Court added.' });
}));

router.put('/courts/:id', asyncHandler(async (req, res) => {
  const c = await ownCourt(req.user.id, req.params.id);
  if (!c) return res.status(404).json({ message: 'Court not found.' });
  const { name, surface, hourly_rate, is_active } = req.body;
  await pool.query('UPDATE courts SET name=?, surface=?, hourly_rate=?, is_active=? WHERE id=?',
    [name || c.name, surface || c.surface, hourly_rate || c.hourly_rate, is_active === undefined ? c.is_active : (is_active ? 1 : 0), c.id]);
  res.json({ message: 'Court updated.' });
}));

router.delete('/courts/:id', asyncHandler(async (req, res) => {
  const c = await ownCourt(req.user.id, req.params.id);
  if (!c) return res.status(404).json({ message: 'Court not found.' });
  const [[{ n }]] = await pool.query(
    "SELECT COUNT(*) AS n FROM bookings WHERE court_id=? AND status IN ('pending_payment','for_verification','confirmed')", [c.id]);
  if (n > 0) return res.status(400).json({ message: 'This court has active bookings. Deactivate it instead.' });
  await pool.query('DELETE FROM courts WHERE id=?', [c.id]);
  res.json({ message: 'Court deleted.' });
}));

// ---------- Blocked slots ----------
router.get('/facilities/:id/blocks', asyncHandler(async (req, res) => {
  const f = await ownFacility(req.user.id, req.params.id);
  if (!f) return res.status(404).json({ message: 'Facility not found.' });
  const [rows] = await pool.query(
    `SELECT bs.*, c.name AS court_name FROM blocked_slots bs JOIN courts c ON c.id=bs.court_id
     WHERE c.facility_id=? AND bs.block_date >= ? ORDER BY bs.block_date, bs.start_hour`, [f.id, todayPH()]);
  res.json(rows);
}));

router.post('/courts/:id/blocks', asyncHandler(async (req, res) => {
  const c = await ownCourt(req.user.id, req.params.id);
  if (!c) return res.status(404).json({ message: 'Court not found.' });
  const { date, start_hour, end_hour, reason } = req.body;
  if (!isValidDate(date) || !(Number(start_hour) < Number(end_hour)))
    return res.status(400).json({ message: 'Choose a valid date and time range.' });
  await pool.query('INSERT INTO blocked_slots (court_id,block_date,start_hour,end_hour,reason) VALUES (?,?,?,?,?)',
    [c.id, date, start_hour, end_hour, reason || null]);
  res.status(201).json({ message: 'Time slot blocked.' });
}));

router.delete('/blocks/:id', asyncHandler(async (req, res) => {
  const [r] = await pool.query(
    `DELETE bs FROM blocked_slots bs JOIN courts c ON c.id=bs.court_id JOIN facilities f ON f.id=c.facility_id
     WHERE bs.id=? AND f.owner_id=?`, [req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Block not found.' });
  res.json({ message: 'Block removed.' });
}));

// ---------- Bookings ----------
// GET /api/owner/bookings?status=&date=&facility_id=
router.get('/bookings', asyncHandler(async (req, res) => {
  const { status = '', date = '', facility_id = '' } = req.query;
  const [rows] = await pool.query(
    `SELECT b.*, c.name AS court_name, f.name AS facility_name, u.full_name AS player_name, u.email AS player_email, u.phone AS player_phone
     FROM bookings b JOIN courts c ON c.id=b.court_id JOIN facilities f ON f.id=c.facility_id JOIN users u ON u.id=b.player_id
     WHERE f.owner_id=? AND (?='' OR b.status=?) AND (?='' OR b.booking_date=?) AND (?='' OR f.id=?)
     ORDER BY FIELD(b.status,'for_verification','pending_payment','confirmed','completed','rejected','cancelled'),
              b.booking_date DESC, b.start_hour`,
    [req.user.id, status, status, date, date, facility_id, facility_id]);
  res.json(rows);
}));

// PATCH /api/owner/bookings/:id  { status: confirmed | rejected | cancelled | completed }
router.patch('/bookings/:id', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = { confirmed: ['for_verification', 'pending_payment'], rejected: ['for_verification'],
                    cancelled: ['pending_payment', 'for_verification', 'confirmed'], completed: ['confirmed'] };
  if (!allowed[status]) return res.status(400).json({ message: 'Invalid status.' });
  const [[b]] = await pool.query(
    `SELECT b.* FROM bookings b JOIN courts c ON c.id=b.court_id JOIN facilities f ON f.id=c.facility_id
     WHERE b.id=? AND f.owner_id=?`, [req.params.id, req.user.id]);
  if (!b) return res.status(404).json({ message: 'Booking not found.' });
  if (!allowed[status].includes(b.status))
    return res.status(400).json({ message: `A ${b.status.replace('_', ' ')} booking cannot be marked ${status}.` });
  await pool.query('UPDATE bookings SET status=? WHERE id=?', [status, b.id]);
  res.json({ message: `Booking ${status}.` });
}));

module.exports = router;
