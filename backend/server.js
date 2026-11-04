require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

if (!process.env.JWT_SECRET) {
  console.error('✖ Missing JWT_SECRET. Copy .env.example to .env first.');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:4200').split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
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
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
    console.error('Database error:', err.message);
    return res.status(503).json({ message: 'Database is not reachable. Check MySQL and your .env file.' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏓 PickleBook API running on http://localhost:${PORT}`));
