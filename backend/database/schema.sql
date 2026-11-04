-- PickleBook database schema (MySQL 8 / MariaDB 10.5+)
-- Run with:  npm run db:setup   (creates the DB, tables, super admin and sample data)

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  phone         VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('player','owner','admin') NOT NULL DEFAULT 'player',
  status        ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facilities (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  owner_id       INT NOT NULL,
  name           VARCHAR(150) NOT NULL,
  description    TEXT,
  address        VARCHAR(255) NOT NULL,
  city           VARCHAR(80) NOT NULL DEFAULT 'Cebu City',
  contact_phone  VARCHAR(30),
  open_hour      TINYINT NOT NULL DEFAULT 6,   -- 6 = 6:00 AM
  close_hour     TINYINT NOT NULL DEFAULT 22,  -- 22 = 10:00 PM
  gcash_name     VARCHAR(120),
  gcash_number   VARCHAR(30),
  gcash_qr       VARCHAR(255),                 -- path to the uploaded GCash QR image
  status         ENUM('pending','approved','suspended') NOT NULL DEFAULT 'pending',
  plan           ENUM('starter','pro','club') NOT NULL DEFAULT 'starter',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS courts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  facility_id   INT NOT NULL,
  name          VARCHAR(80) NOT NULL,
  surface       ENUM('indoor','outdoor','covered') NOT NULL DEFAULT 'outdoor',
  hourly_rate   DECIMAL(10,2) NOT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

-- Status flow:
--   pending_payment -> for_verification (player uploaded GCash proof) -> confirmed / rejected
--   cancelled (player or owner) | completed
CREATE TABLE IF NOT EXISTS bookings (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  reference_code   VARCHAR(20) NOT NULL UNIQUE,
  player_id        INT NOT NULL,
  court_id         INT NOT NULL,
  booking_date     DATE NOT NULL,
  start_hour       TINYINT NOT NULL,
  end_hour         TINYINT NOT NULL,
  total_amount     DECIMAL(10,2) NOT NULL,
  status           ENUM('pending_payment','for_verification','confirmed','rejected','cancelled','completed')
                   NOT NULL DEFAULT 'pending_payment',
  gcash_reference  VARCHAR(40),
  payment_proof    VARCHAR(255),
  notes            VARCHAR(255),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (court_id)  REFERENCES courts(id) ON DELETE CASCADE,
  INDEX idx_court_date (court_id, booking_date)
);

-- Slots the owner closes (maintenance, private events)
CREATE TABLE IF NOT EXISTS blocked_slots (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  court_id     INT NOT NULL,
  block_date   DATE NOT NULL,
  start_hour   TINYINT NOT NULL,
  end_hour     TINYINT NOT NULL,
  reason       VARCHAR(120),
  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
);

-- Platform settings (super admin GCash QR for owner subscriptions, etc.)
CREATE TABLE IF NOT EXISTS settings (
  setting_key   VARCHAR(60) PRIMARY KEY,
  setting_value TEXT
);
