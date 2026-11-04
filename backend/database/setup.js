// Creates the database, all tables, the super admin and sample data.
// Usage: npm run db:setup
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const dbName = process.env.DB_NAME || 'picklebook';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await conn.query(`USE \`${dbName}\``);
  await conn.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  console.log('✔ Tables ready');

  const [[{ count }]] = await conn.query('SELECT COUNT(*) AS count FROM users');
  if (count > 0) {
    console.log('ℹ Data already exists, skipping seed.');
    await conn.end();
    return;
  }

  const hash = (p) => bcrypt.hashSync(p, 10);
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@picklebook.ph';
  const adminPass = process.env.ADMIN_PASSWORD || 'Admin@123';

  await conn.query(
    'INSERT INTO users (full_name,email,phone,password_hash,role) VALUES (?,?,?,?,?)',
    ['PickleBook Admin', adminEmail, '09170000000', hash(adminPass), 'admin']
  );
  const [owner] = await conn.query(
    'INSERT INTO users (full_name,email,phone,password_hash,role) VALUES (?,?,?,?,?)',
    ['Mark Reyes', 'owner@picklebook.ph', '09171234567', hash('Owner@123'), 'owner']
  );
  const [owner2] = await conn.query(
    'INSERT INTO users (full_name,email,phone,password_hash,role) VALUES (?,?,?,?,?)',
    ['Ana Lim', 'owner2@picklebook.ph', '09179876543', hash('Owner@123'), 'owner']
  );
  await conn.query(
    'INSERT INTO users (full_name,email,phone,password_hash,role) VALUES (?,?,?,?,?)',
    ['Miguel Santos', 'player@picklebook.ph', '09981112222', hash('Player@123'), 'player']
  );

  const facilities = [
    [owner.insertId, 'Dink Yard Cebu', 'Six covered courts with LED lighting, paddle rentals and a chill-out lounge.', 'A.S. Fortuna St., Banilad', 'Mandaue City', '09171234567', 6, 23, 'Mark Reyes', '09171234567', 'approved', 'pro'],
    [owner.insertId, 'Kitchen Line Sports Hub', 'Indoor air-conditioned courts. Perfect for night games and tournaments.', 'Salinas Drive, Lahug', 'Cebu City', '09171234567', 7, 22, 'Mark Reyes', '09171234567', 'approved', 'starter'],
    [owner2.insertId, 'Third Shot Courts', 'Outdoor courts near the IT Park. Beginner clinics every Saturday.', 'Cebu IT Park, Apas', 'Cebu City', '09179876543', 6, 21, 'Ana Lim', '09179876543', 'pending', 'starter'],
  ];
  for (const f of facilities) {
    const [r] = await conn.query(
      `INSERT INTO facilities (owner_id,name,description,address,city,contact_phone,open_hour,close_hour,gcash_name,gcash_number,status,plan)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, f);
    const courts = f[1].startsWith('Dink')
      ? [['Court 1', 'covered', 400], ['Court 2', 'covered', 400], ['Court 3', 'covered', 450], ['Center Court', 'covered', 550]]
      : f[1].startsWith('Kitchen')
        ? [['Court A', 'indoor', 600], ['Court B', 'indoor', 600]]
        : [['North Court', 'outdoor', 300], ['South Court', 'outdoor', 300]];
    for (const c of courts) {
      await conn.query('INSERT INTO courts (facility_id,name,surface,hourly_rate) VALUES (?,?,?,?)', [r.insertId, ...c]);
    }
  }

  await conn.query(`INSERT INTO settings VALUES
    ('platform_gcash_name','PickleBook'),
    ('platform_gcash_number','09170000000'),
    ('platform_gcash_qr',NULL)`);

  console.log('✔ Sample data inserted');
  console.log('\n  Super admin : ' + adminEmail + ' / ' + adminPass);
  console.log('  Court owner : owner@picklebook.ph / Owner@123');
  console.log('  Player      : player@picklebook.ph / Player@123\n');
  await conn.end();
}

main().catch((e) => {
  console.error('✖ Setup failed:', e.message);
  process.exit(1);
});
