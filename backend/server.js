require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

if (!process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32)) {
  console.error('Missing or weak JWT_SECRET. Copy .env.example to .env and set a long random value.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // correct client IPs behind a hosting proxy
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // lets the site load QR images from /uploads
const allowed = (process.env.CLIENT_URL || 'http://localhost:4200').split(',').map((s) => s.trim());
const isDev = process.env.NODE_ENV !== 'production';
app.use(cors({
  origin(origin, cb) {
    // Same-origin and tools without an Origin header, listed origins, and (in development) any LAN address on port 4200
    if (!origin || allowed.includes(origin) || (isDev && /^http:\/\/(\d{1,3}\.){3}\d{1,3}:4200$/.test(origin))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '1mb' }));

// Basic abuse protection: tight limit on login/register, looser limit on the rest of the API
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' } });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'PickleBook API' }));
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/facilities', require('./src/routes/facilities'));
app.use('/api/bookings', require('./src/routes/bookings'));
app.use('/api/owner', require('./src/routes/owner'));
app.use('/api/admin', require('./src/routes/admin'));

app.use('/api', (req, res) => res.status(404).json({ message: 'Endpoint not found.' }));

// Central error handler
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Image must be 5 MB or smaller.' });
  if (err.message && err.message.startsWith('Only PNG')) return res.status(400).json({ message: err.message });
  if (err.message === 'Not allowed by CORS') return res.status(403).json({ message: 'Origin not allowed.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid request body.' });
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
    console.error('Database error:', err.message);
    return res.status(503).json({ message: 'Database is not reachable. Check MySQL and your .env file.' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PickleBook API listening on http://localhost:${PORT}`));
