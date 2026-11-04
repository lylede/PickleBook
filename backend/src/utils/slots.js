// Shared slot logic. A pending_payment booking holds its slot for HOLD_MINUTES,
// so an unpaid reservation does not block the court forever.
const HOLD_MINUTES = 15;

const ACTIVE_BOOKING_SQL = `(
  status IN ('for_verification','confirmed','completed')
  OR (status = 'pending_payment' AND created_at > (NOW() - INTERVAL ${HOLD_MINUTES} MINUTE))
)`;

// Returns true if [start,end) overlaps an active booking or a blocked slot.
async function hasConflict(conn, courtId, date, start, end, excludeBookingId = 0) {
  const [b] = await conn.query(
    `SELECT id FROM bookings
     WHERE court_id=? AND booking_date=? AND id<>? AND ${ACTIVE_BOOKING_SQL}
       AND start_hour < ? AND end_hour > ?`,
    [courtId, date, excludeBookingId, end, start]);
  if (b.length) return true;
  const [bl] = await conn.query(
    'SELECT id FROM blocked_slots WHERE court_id=? AND block_date=? AND start_hour < ? AND end_hour > ?',
    [courtId, date, end, start]);
  return bl.length > 0;
}

module.exports = { HOLD_MINUTES, ACTIVE_BOOKING_SQL, hasConflict };
