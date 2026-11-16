/** Subscription plans for facilities. Prices are in pesos per month. Keep in sync with backend/src/config/plans.js */
export interface Plan { id: 'starter' | 'pro' | 'club'; name: string; price: number; courts: string; features: string[]; }

export const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 499, courts: 'Up to 2 courts', features: ['Online booking page', 'GCash QR payments', 'Schedule and slot blocking'] },
  { id: 'pro', name: 'Pro', price: 999, courts: 'Up to 6 courts', features: ['Everything in Starter', 'Revenue and peak-hour reports', 'Multiple facilities'] },
  { id: 'club', name: 'Club', price: 1999, courts: 'Unlimited courts', features: ['Everything in Pro', 'Priority listing', 'Priority support'] },
];
