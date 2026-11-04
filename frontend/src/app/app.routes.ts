import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';

const ownerNav = [
  { path: '/owner', label: 'Overview', icon: '◎', exact: true },
  { path: '/owner/bookings', label: 'Bookings', icon: '▦' },
  { path: '/owner/courts', label: 'Courts & schedule', icon: '▭' },
  { path: '/owner/facility', label: 'Facility & GCash', icon: '⌂' },
];

const adminNav = [
  { path: '/admin', label: 'Overview', icon: '◎', exact: true },
  { path: '/admin/facilities', label: 'Facilities', icon: '⌂' },
  { path: '/admin/users', label: 'Users', icon: '◍' },
  { path: '/admin/bookings', label: 'All bookings', icon: '▦' },
  { path: '/admin/settings', label: 'Platform settings', icon: '⚙' },
];

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then((m) => m.HomePage), title: 'PickleBook — Book pickleball courts' },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/login').then((m) => m.LoginPage), title: 'Log in · PickleBook' },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/register').then((m) => m.RegisterPage), title: 'Create account · PickleBook' },
  { path: 'courts', loadComponent: () => import('./pages/courts/courts').then((m) => m.CourtsPage), title: 'Find courts · PickleBook' },
  { path: 'courts/:id', loadComponent: () => import('./pages/courts/facility-detail').then((m) => m.FacilityDetailPage), title: 'Book a court · PickleBook' },
  {
    path: 'my-bookings', canActivate: [authGuard], data: { roles: ['player'] },
    loadComponent: () => import('./pages/player/my-bookings').then((m) => m.MyBookingsPage), title: 'My bookings · PickleBook',
  },
  {
    path: 'bookings/:id/pay', canActivate: [authGuard], data: { roles: ['player'] },
    loadComponent: () => import('./pages/player/payment').then((m) => m.PaymentPage), title: 'Pay with GCash · PickleBook',
  },
  {
    path: 'owner', canActivate: [authGuard], data: { roles: ['owner'], nav: ownerNav, area: 'Court owner' },
    loadComponent: () => import('./pages/dash/dash-layout').then((m) => m.DashLayout),
    children: [
      { path: '', loadComponent: () => import('./pages/owner/overview').then((m) => m.OwnerOverviewPage), title: 'Dashboard · PickleBook' },
      { path: 'bookings', loadComponent: () => import('./pages/owner/bookings').then((m) => m.OwnerBookingsPage), title: 'Bookings · PickleBook' },
      { path: 'courts', loadComponent: () => import('./pages/owner/courts').then((m) => m.OwnerCourtsPage), title: 'Courts · PickleBook' },
      { path: 'facility', loadComponent: () => import('./pages/owner/facility').then((m) => m.OwnerFacilityPage), title: 'Facility · PickleBook' },
    ],
  },
  {
    path: 'admin', canActivate: [authGuard], data: { roles: ['admin'], nav: adminNav, area: 'Super admin' },
    loadComponent: () => import('./pages/dash/dash-layout').then((m) => m.DashLayout),
    children: [
      { path: '', loadComponent: () => import('./pages/admin/overview').then((m) => m.AdminOverviewPage), title: 'Admin · PickleBook' },
      { path: 'facilities', loadComponent: () => import('./pages/admin/facilities').then((m) => m.AdminFacilitiesPage), title: 'Facilities · Admin' },
      { path: 'users', loadComponent: () => import('./pages/admin/users').then((m) => m.AdminUsersPage), title: 'Users · Admin' },
      { path: 'bookings', loadComponent: () => import('./pages/admin/bookings').then((m) => m.AdminBookingsPage), title: 'Bookings · Admin' },
      { path: 'settings', loadComponent: () => import('./pages/admin/settings').then((m) => m.AdminSettingsPage), title: 'Settings · Admin' },
    ],
  },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundPage), title: 'Not found · PickleBook' },
];
