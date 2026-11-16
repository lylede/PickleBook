import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Logo } from './logo';

@Component({
  selector: 'pb-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, Logo],
  template: `
    <header class="topbar sticky-top bg-white border-bottom">
      <div class="container d-flex align-items-center gap-3">
        <a routerLink="/" class="navbar-brand m-0 py-0" aria-label="PickleBook home"><pb-logo [height]="26" /></a>

        <!-- Desktop links. Phones use the tab bar at the bottom instead. -->
        <nav class="d-none d-lg-flex align-items-center gap-1 ms-3" aria-label="Main">
          @if (auth.role() === 'owner') {
            <a class="nav-link" routerLink="/owner" routerLinkActive="active">Dashboard</a>
          } @else if (auth.role() === 'admin') {
            <a class="nav-link" routerLink="/admin" routerLinkActive="active">Admin</a>
          }
          <a class="nav-link" routerLink="/courts" routerLinkActive="active">Find courts</a>
          @if (auth.role() === 'player') {
            <a class="nav-link" routerLink="/my-bookings" routerLinkActive="active">My bookings</a>
          }
          @if (!auth.isLoggedIn()) {
            <a class="nav-link" routerLink="/" fragment="how">How it works</a>
            <a class="nav-link" routerLink="/" fragment="owners">For court owners</a>
          }
        </nav>

        <div class="ms-auto d-flex align-items-center gap-2">
          @if (auth.user(); as u) {
            <div class="dropdown">
              <button class="btn btn-light d-flex align-items-center gap-2 px-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Account menu">
                <span class="avatar">{{ initials() }}</span>
                <span class="d-none d-md-inline fw-semibold">{{ firstName() }}</span>
                <i class="bi bi-chevron-down small text-secondary"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li class="px-3 py-2">
                  <div class="fw-bold">{{ u.full_name }}</div>
                  <div class="small text-secondary text-break">{{ u.email }}</div>
                </li>
                <li><hr class="dropdown-divider"></li>
                @if (u.role !== 'player') {
                  <li><a class="dropdown-item" [routerLink]="auth.homeFor(u.role)"><i class="bi bi-speedometer2 me-2"></i>Dashboard</a></li>
                } @else {
                  <li><a class="dropdown-item" routerLink="/my-bookings"><i class="bi bi-calendar-check me-2"></i>My bookings</a></li>
                }
                <li><a class="dropdown-item" routerLink="/account"><i class="bi bi-person me-2"></i>Account</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><button class="dropdown-item text-danger" type="button" (click)="auth.logout()"><i class="bi bi-box-arrow-right me-2"></i>Log out</button></li>
              </ul>
            </div>
          } @else {
            <a routerLink="/login" class="btn btn-light btn-sm d-none d-sm-inline-block">Log in</a>
            <a routerLink="/register" class="btn btn-primary btn-sm">Sign up</a>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar { z-index: 1040; }
    .topbar .container { height: 60px; }
    .nav-link { padding: 0.45rem 0.8rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.9375rem; color: var(--pb-ink); }
    .nav-link:hover { background: var(--pb-bg); color: var(--pb-ink); }
    .nav-link.active { color: var(--pb-green); background: var(--pb-green-50); }
    .avatar { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--pb-pine); color: #fff; font-size: 0.6875rem; font-weight: 800; }
  `],
})
export class Navbar {
  auth = inject(AuthService);
  firstName = computed(() => (this.auth.user()?.full_name || '').split(' ')[0]);
  initials = computed(() => (this.auth.user()?.full_name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase());
}
