<div align="center">

<img src="brand/logo.svg" alt="PickleBook" height="56">

# PickleBook

### An Online Booking and Management System for Pickleball Courts

**Book the court. Skip the chat.**

![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-3D-000000?logo=threedotjs&logoColor=white)
![GCash](https://img.shields.io/badge/Payments-GCash_QR-0A5BD3)

</div>

---

## About

Many pickleball court owners still take reservations through Facebook, Messenger, phone calls or paper schedules. This leads to **double bookings, missed reservations and slow replies**, especially on weekends, holidays and peak hours. Players have to message several facilities just to ask if a court is free.

**PickleBook** is a dedicated booking platform where players can see live court availability, reserve a slot in seconds and pay through the facility's **GCash QR**. Court owners manage schedules, payments and customers from one dashboard.

> 📍 Starting with local pickleball facilities in **Cebu City and Mandaue City**.

---

## Features

### For Players
- Create an account and log in
- Browse partner facilities, search and filter by city
- See **real-time availability** per court and date
- Book one or more consecutive hours (slot is held for 15 minutes while paying)
- Pay by scanning the court's **GCash QR**, then upload the receipt and reference number
- **My Bookings**: upcoming, needs action and history, with cancel option

### For Court Owners
- Dashboard with today's bookings, payments to verify, monthly revenue, a 7-day revenue chart and peak hours
- Review GCash receipts and **confirm or reject** payments
- Add and edit courts, hourly rates and surface type; turn courts on or off
- Close time slots for maintenance or private events
- Edit facility profile and opening hours, upload your **GCash QR**, and add more facilities

### For the Super Admin
- Approve or suspend new facilities
- Set subscription plans (Starter / Pro / Club)
- Manage users and view all bookings
- Upload the platform GCash QR (used when a facility has no QR yet)

### Highlights
- **Mobile first**: built with Bootstrap 5 and Bootstrap Icons, with a bottom tab bar on phones and a sidebar on desktop
- **Simple booking**: pick a date, a court, how long, then a start time. Only times that are fully free are shown
- **Interactive 3D hero**: a realistic carbon paddle built in Three.js that comes apart into 9 labeled layers as you scroll
- **Zero double bookings**: the backend locks the court in a database transaction before saving a booking
- **Production basics**: Helmet security headers, rate limits on login and the API, input validation, strict TypeScript and strict Angular templates

---

## Booking Flow

```
Player picks a slot ──► pending_payment ──► (uploads GCash receipt) ──► for_verification
                                                                            │
                                         ┌──────────────────────────────────┤
                                         ▼                                  ▼
                                     confirmed ──► completed            rejected (player re-uploads)
```
Players and owners can also **cancel** a booking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20 (standalone components, signals), Bootstrap 5.3, Bootstrap Icons |
| 3D | Three.js |
| Backend | Node.js, Express |
| Database | MySQL 8 |
| Auth | JWT, bcrypt password hashing |
| Security | Helmet, express-rate-limit |
| Uploads | Multer (GCash QR and receipt images) |

---

## Project Structure

```
PickleBook/
├── brand/               # logo files (SVG + PNG)
├── backend/
│   ├── database/        # schema.sql + setup script (tables & demo data)
│   ├── src/
│   │   ├── middleware/  # JWT auth & role checks
│   │   ├── routes/      # auth, facilities, bookings, owner, admin
│   │   └── utils/       # uploads, slot conflict checks, helpers
│   ├── uploads/         # QR codes & payment receipts
│   └── server.js
└── frontend/
    └── src/app/
        ├── core/        # API service, auth, guards, interceptor
        ├── shared/      # navbar, footer, pipes, toasts
        └── pages/       # home (3D hero), auth, courts, player, owner, admin
```

---

## Getting Started

### Requirements
- [Node.js](https://nodejs.org/) 20.19 or newer
- MySQL 8 (or XAMPP)

### 1. Backend
```bash
cd backend
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
```
Open `.env` and set your MySQL username and password (XAMPP default is `root` with no password).

```bash
npm run db:setup            # creates the database, tables and demo accounts
npm run dev                 # API runs on http://localhost:3000
```

### 2. Frontend
```bash
cd frontend
npm install
npm start                   # opens http://localhost:4200
```

### 3. Test on your phone
Connect your phone to the same Wi-Fi as your laptop, then:
```bash
cd frontend
npm run start:phone
```
Find your laptop's IP address (`ipconfig` on Windows, look for IPv4, e.g. `192.168.1.5`) and open `http://192.168.1.5:4200` on your phone. The site calls the API on the same address automatically.

### 4. Demo accounts

| Role | Email | Password |
|---|---|---|
| Super admin | admin@picklebook.ph | Admin@123 |
| Court owner | owner@picklebook.ph | Owner@123 |
| Player | player@picklebook.ph | Player@123 |

---

## API Overview

| Method | Endpoint | Access |
|---|---|---|
| `POST` | `/api/auth/register` · `/api/auth/login` | Public |
| `GET` `PUT` | `/api/auth/me` · `/api/auth/password` | Logged in |
| `GET` | `/api/facilities` · `/api/facilities/:id` · `/api/facilities/:id/availability?date=` | Public |
| `POST` `GET` `PATCH` | `/api/bookings` · `/api/bookings/mine` · `/api/bookings/:id/payment` · `/api/bookings/:id/cancel` | Player |
| `GET` `POST` `PUT` `PATCH` `DELETE` | `/api/owner/*` (stats, facilities, courts, blocked slots, bookings) | Court owner |
| `GET` `PATCH` `PUT` `POST` | `/api/admin/*` (stats, facilities, users, bookings, settings) | Super admin |

---

## Brand

The logo is a paddle whose handle ends in a bookmark notch, with a ball at the corner: **pickle** + **book**.

| File | Use |
|---|---|
| `brand/logo.svg` | Main logo on light backgrounds |
| `brand/logo-on-dark.svg` | Logo on dark green backgrounds |
| `brand/logo-mark.svg` | Icon only |
| `brand/app-icon.svg` / `.png` | App icon, social profile picture |

Colours: pine `#0B3D2A`, green `#0F7B45`, lime `#C6E84A`. Font: Plus Jakarta Sans.

---

## Before going live

- Set `NODE_ENV=production`, a long random `JWT_SECRET`, and `CLIENT_URL` to your real website address in `backend/.env`
- Set `apiUrl` in `frontend/src/environments/environment.prod.ts`, then run `npm run build` in `frontend`
- Change the super admin password after the first login
- Serve the site and API over HTTPS

---

## Business Model

PickleBook charges pickleball facilities a **monthly subscription**. Players book for free.

| Plan | Price | Courts | Includes |
|---|---|---|---|
| Starter | ₱499 / month | Up to 2 | Online booking page, GCash QR payments, schedule & slot blocking |
| Pro | ₱999 / month | Up to 6 | Everything in Starter + revenue and peak-hour reports, multiple facilities |
| Club | ₱1,999 / month | Unlimited | Everything in Pro + priority listing and support |

Prices live in `backend/src/config/plans.js` and `frontend/src/app/core/plans.ts`.

---

## Team IT-FRELEAN

| Name | Role |
|---|---|
| Josh Efraim C. Padernal | Chief Executive Officer |
| Clint Eroll Capondag | Chief Technology Officer |
| Lyle Adrien Dedumo | Chief Marketing Officer |
| Ian Francis Loyola | Chief Financial Officer |
| Christian Exequeil Alminaza | Chief Business Development Officer |
| Jerson Villegas | Chief Business Development Officer |

---

<div align="center">

Made in Cebu, Philippines · **Play more. Message less.**

</div>
