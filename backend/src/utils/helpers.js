// Wraps async route handlers so errors go to the error middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// PB-7K3Q9A style booking reference
function makeReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'PB-' + s;
}

const isValidDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime());

// Today in Philippine time as YYYY-MM-DD
function todayPH() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
function currentHourPH() {
  return new Date(Date.now() + 8 * 3600 * 1000).getUTCHours();
}

module.exports = { asyncHandler, makeReference, isValidDate, todayPH, currentHourPH };
