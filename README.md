# PickleBook

**An Online Booking and Management System for Pickleball Courts**
Team IT-FRELEAN · Cebu, Philippines

- `frontend/` — Angular 20 website (responsive for phone and desktop) with a Three.js 3D paddle hero
- `backend/` — Node.js + Express REST API with MySQL
- `preview/hero-preview.html` — standalone preview of the 3D hero (open in Chrome/Edge)

---

## 1. Requirements

- Node.js 20.19+ (or 22 / 24)
- MySQL 8 (XAMPP's MySQL/MariaDB also works)

## 2. Backend

```bash
cd backend
npm install
copy .env.example .env      # Windows   (mac/linux: cp .env.example .env)
```

Open `.env` and set your MySQL user/password (XAMPP default: user `root`, empty password).

```bash
npm run db:setup            # creates the database, tables and demo accounts
npm run dev                 # API on http://localhost:3000
```

## 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm start                   # opens http://localhost:4200
```

## 4. Demo accounts

| Role         | Email                  | Password   |
|--------------|------------------------|------------|
| Super admin  | admin@picklebook.ph    | Admin@123  |
| Court owner  | owner@picklebook.ph    | Owner@123  |
| Player       | player@picklebook.ph   | Player@123 |

The login page also has one-click buttons for these.

---

## Main features

**Public**
- Interactive 3D hero: a pickleball paddle built in code that explodes into 9 labeled layers as you scroll (drag to spin, hover a layer on desktop)
- Browse facilities, search, filter by city

**Player**
- Register / log in
- Pick a date, court and one or more consecutive hourly slots
- Slot is held for 15 minutes while paying
- Pay by scanning the facility's **GCash QR** on screen, then upload the receipt and reference number
- My Bookings: upcoming, needs action, history, cancel

**Court owner**
- Dashboard: today's bookings, payments to verify, monthly revenue, last 7 days chart, peak hours
- Review GCash receipts and confirm / reject
- Manage courts (rate, surface, active), close time slots
- Facility profile, opening hours, upload GCash QR, add more facilities

**Super admin**
- Approve / suspend facilities, set subscription plans (Starter / Pro / Club)
- Manage users, view all bookings
- Platform GCash QR (used when a facility has no QR yet)

**No double bookings** — the backend locks the court row in a transaction and re-checks overlaps before saving.

## Booking status flow

`pending_payment` → (player uploads receipt) → `for_verification` → (owner) → `confirmed` → `completed`
Owner can also `reject` a payment (player can re-upload) or `cancel`.

## API overview

| Method | Endpoint | Who |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| GET | /api/facilities, /api/facilities/:id, /api/facilities/:id/availability?date= | public |
| POST | /api/bookings · GET /api/bookings/mine · POST /api/bookings/:id/payment · PATCH /api/bookings/:id/cancel | player |
| GET/POST/PUT | /api/owner/... (stats, facilities, courts, blocks, bookings) | owner |
| GET/PATCH/PUT | /api/admin/... (stats, facilities, users, bookings, settings) | admin |

Uploaded images (QR codes, receipts) are saved in `backend/uploads/`.
