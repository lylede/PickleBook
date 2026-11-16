// Subscription plans for facilities (pesos per month). Keep in sync with frontend/src/app/core/plans.ts
module.exports = {
  starter: { name: 'Starter', price: 499, maxCourts: 2 },
  pro: { name: 'Pro', price: 999, maxCourts: 6 },
  club: { name: 'Club', price: 1999, maxCourts: Infinity },
};
