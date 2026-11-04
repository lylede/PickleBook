const router = require('express').Router();
const pool = require('../db');
const { asyncHandler, isValidDate, todayPH, currentHourPH } = require('../utils/helpers');
const { ACTIVE_BOOKING_SQL } = require('../utils/slots');

// GET /api/facilities?q=&city=   (public: approved facilities only)
router.get('/', asyncHandler(async (req, res) => {
  const { q = '', city = '' } = req.query;
  const [rows] = await pool.query(
    `SELECT f.id, f.name, f.description, f.address, f.city, f.open_hour, f.close_hour,
            COUNT(c.id) AS court_count, MIN(c.hourly_rate) AS min_rate,
            GROUP_CONCAT(DISTINCT c.surface) AS surfaces
     FROM facilities f
     LEFT JOIN courts c ON c.facility_id = f.id AND c.is_active = 1
     WHERE f.status = 'approved'
       AND (f.name LIKE ? OR f.address LIKE ? OR f.city LIKE ?)
       AND (? = '' OR f.city = ?)
     GROUP BY f.id
     ORDER BY f.name`,
    [`%${q}%`, `%${q}%`, `%${q}%`, city, city]);
  res.json(rows);
}));

// GET /api/facilities/cities
router.get('/cities', asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT DISTINCT city FROM facilities WHERE status='approved' ORDER BY city");
  res.json(rows.map((r) => r.city));
}));

// GET /api/facilities/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, name, description, address, city, contact_phone, open_hour, close_hour, status
     FROM facilities WHERE id = ? AND status = 'approved'`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Facility not found.' });
  const [courts] = await pool.query(
    'SELECT id, name, surface, hourly_rate FROM courts WHERE facility_id = ? AND is_active = 1 ORDER BY name', [req.params.id]);
  res.json({ ...rows[0], courts });
}));

// GET /api/facilities/:id/availability?date=YYYY-MM-DD
// Returns each court with an array of hourly slots: available | booked | blocked | past
router.get('/:id/availability', asyncHandler(async (req, res) => {
  const date = req.query.date || todayPH();
  if (!isValidDate(date)) return res.status(400).json({ message: 'Invalid date.' });

  const [[facility]] = await pool.query(
    "SELECT id, open_hour, close_hour FROM facilities WHERE id=? AND status='approved'", [req.params.id]);
  if (!facility) return res.status(404).json({ message: 'Facility not found.' });

  const [courts] = await pool.query(
    'SELECT id, name, surface, hourly_rate FROM courts WHERE facility_id=? AND is_active=1 ORDER BY name', [facility.id]);
  const ids = courts.map((c) => c.id);
  let bookings = [], blocks = [];
  if (ids.length) {
    [bookings] = await pool.query(
      `SELECT court_id, start_hour, end_hour FROM bookings
       WHERE court_id IN (?) AND booking_date=? AND ${ACTIVE_BOOKING_SQL}`, [ids, date]);
    [blocks] = await pool.query(
      'SELECT court_id, start_hour, end_hour FROM blocked_slots WHERE court_id IN (?) AND block_date=?', [ids, date]);
  }

  const isToday = date === todayPH();
  const nowHour = currentHourPH();
  const inRange = (list, courtId, h) => list.some((x) => x.court_id === courtId && x.start_hour <= h && x.end_hour > h);

  const result = courts.map((c) => {
    const slots = [];
    for (let h = facility.open_hour; h < facility.close_hour; h++) {
      let status = 'available';
      if (date < todayPH() || (isToday && h <= nowHour)) status = 'past';
      else if (inRange(blocks, c.id, h)) status = 'blocked';
      else if (inRange(bookings, c.id, h)) status = 'booked';
      slots.push({ hour: h, status });
    }
    return { ...c, slots };
  });

  res.json({ date, open_hour: facility.open_hour, close_hour: facility.close_hour, courts: result });
}));

module.exports = router;
