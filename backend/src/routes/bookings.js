const router = require('express').Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { imageUpload } = require('../utils/upload');
const { asyncHandler, makeReference, isValidDate, todayPH, currentHourPH } = require('../utils/helpers');
const { hasConflict, HOLD_MINUTES } = require('../utils/slots');

const BOOKING_SELECT = `
  SELECT b.*, TIMESTAMPDIFF(SECOND, NOW(), b.created_at + INTERVAL ${HOLD_MINUTES} MINUTE) AS hold_seconds,
         c.name AS court_name, c.surface, c.hourly_rate,
         f.id AS facility_id, f.name AS facility_name, f.address, f.city, f.owner_id,
         f.gcash_name, f.gcash_number, f.gcash_qr, f.contact_phone,
         u.full_name AS player_name, u.email AS player_email, u.phone AS player_phone
  FROM bookings b
  JOIN courts c ON c.id = b.court_id
  JOIN facilities f ON f.id = c.facility_id
  JOIN users u ON u.id = b.player_id`;

// If a facility has no GCash QR yet, fall back to the platform (super admin) QR
async function withPaymentInfo(booking) {
  if (booking.gcash_qr) return booking;
  const [rows] = await pool.query("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'platform_gcash_%'");
  const s = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
  return {
    ...booking,
    gcash_qr: s.platform_gcash_qr || null,
    gcash_name: booking.gcash_name || s.platform_gcash_name,
    gcash_number: booking.gcash_number || s.platform_gcash_number,
    paid_to_platform: true,
  };
}

router.use(requireAuth);

// POST /api/bookings  { court_id, date, start_hour, hours }
router.post('/', requireRole('player'), asyncHandler(async (req, res) => {
  const { court_id, date, notes } = req.body;
  const start = Number(req.body.start_hour);
  const hours = Number(req.body.hours || 1);
  const end = start + hours;

  if (!court_id || !isValidDate(date)) return res.status(400).json({ message: 'Choose a court and date.' });
  if (!Number.isInteger(start) || !Number.isInteger(hours) || hours < 1 || hours > 6)
    return res.status(400).json({ message: 'Choose between 1 and 6 hours.' });
  if (date < todayPH() || (date === todayPH() && start <= currentHourPH()))
    return res.status(400).json({ message: 'That time has already passed.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Lock the court row so two players cannot book the same slot at the same time
    const [[court]] = await conn.query(
      `SELECT c.id, c.hourly_rate, f.open_hour, f.close_hour, f.status
       FROM courts c JOIN facilities f ON f.id = c.facility_id
       WHERE c.id = ? AND c.is_active = 1 FOR UPDATE`, [court_id]);
    if (!court || court.status !== 'approved') {
      await conn.rollback();
      return res.status(404).json({ message: 'Court not available.' });
    }
    if (start < court.open_hour || end > court.close_hour) {
      await conn.rollback();
      return res.status(400).json({ message: 'Selected time is outside opening hours.' });
    }
    if (await hasConflict(conn, court_id, date, start, end)) {
      await conn.rollback();
      return res.status(409).json({ message: 'Sorry, that slot was just taken. Please choose another time.' });
    }

    let ref = makeReference();
    for (let i = 0; i < 5; i++) {
      const [dup] = await conn.query('SELECT id FROM bookings WHERE reference_code=?', [ref]);
      if (!dup.length) break;
      ref = makeReference();
    }
    const [r] = await conn.query(
      `INSERT INTO bookings (reference_code, player_id, court_id, booking_date, start_hour, end_hour, total_amount, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [ref, req.user.id, court_id, date, start, end, court.hourly_rate * hours, notes || null]);
    await conn.commit();

    const [[booking]] = await pool.query(`${BOOKING_SELECT} WHERE b.id = ?`, [r.insertId]);
    res.status(201).json({ ...(await withPaymentInfo(booking)), hold_minutes: HOLD_MINUTES });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

// GET /api/bookings/mine
router.get('/mine', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `${BOOKING_SELECT} WHERE b.player_id = ? ORDER BY b.booking_date DESC, b.start_hour DESC`, [req.user.id]);
  res.json(rows);
}));

// GET /api/bookings/:id  (player who booked, facility owner, or admin)
router.get('/:id', asyncHandler(async (req, res) => {
  const [[b]] = await pool.query(`${BOOKING_SELECT} WHERE b.id = ?`, [req.params.id]);
  if (!b) return res.status(404).json({ message: 'Booking not found.' });
  const allowed = req.user.role === 'admin' || b.player_id === req.user.id || b.owner_id === req.user.id;
  if (!allowed) return res.status(403).json({ message: 'You do not have access to this booking.' });
  res.json({ ...(await withPaymentInfo(b)), hold_minutes: HOLD_MINUTES });
}));

// POST /api/bookings/:id/payment  (multipart: proof image + gcash_reference)
router.post('/:id/payment', requireRole('player'), imageUpload('proofs').single('proof'), asyncHandler(async (req, res) => {
  const { gcash_reference } = req.body;
  const [[b]] = await pool.query('SELECT * FROM bookings WHERE id=? AND player_id=?', [req.params.id, req.user.id]);
  if (!b) return res.status(404).json({ message: 'Booking not found.' });
  if (!['pending_payment', 'rejected'].includes(b.status))
    return res.status(400).json({ message: 'This booking no longer needs payment.' });
  if (!gcash_reference || !/^[0-9 ]{8,20}$/.test(gcash_reference.trim()))
    return res.status(400).json({ message: 'Enter the GCash reference number from your receipt.' });
  if (!req.file) return res.status(400).json({ message: 'Upload a screenshot of your GCash receipt.' });

  // If the hold expired, make sure nobody took the slot meanwhile
  if (await hasConflict(pool, b.court_id, b.booking_date, b.start_hour, b.end_hour, b.id))
    return res.status(409).json({ message: 'Your 15-minute hold expired and the slot was taken. Please book another time.' });

  await pool.query(
    "UPDATE bookings SET status='for_verification', gcash_reference=?, payment_proof=? WHERE id=?",
    [gcash_reference.replace(/\s/g, ''), `/uploads/proofs/${req.file.filename}`, b.id]);
  res.json({ message: 'Payment submitted! The court owner will verify it shortly.' });
}));

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', requireRole('player'), asyncHandler(async (req, res) => {
  const [[b]] = await pool.query('SELECT * FROM bookings WHERE id=? AND player_id=?', [req.params.id, req.user.id]);
  if (!b) return res.status(404).json({ message: 'Booking not found.' });
  if (!['pending_payment', 'for_verification', 'confirmed'].includes(b.status))
    return res.status(400).json({ message: 'This booking can no longer be cancelled.' });
  await pool.query("UPDATE bookings SET status='cancelled' WHERE id=?", [b.id]);
  res.json({ message: 'Booking cancelled.' });
}));

module.exports = router;
