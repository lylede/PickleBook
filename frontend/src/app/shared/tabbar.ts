import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface Tab { path: string; label: string; icon: string; exact?: boolean; }

const TABS: Record<string, Tab[]> = {
  guest: [
    { path: '/', label: 'Home', icon: 'bi-house-door', exact: true },
    { path: '/courts', label: 'Courts', icon: 'bi-search' },
    { path: '/login', label: 'Log in', icon: 'bi-person' },
  ],
  player: [
    { path: '/', label: 'Home', icon: 'bi-house-door', exact: true },
    { path: '/courts', label: 'Courts', icon: 'bi-search' },
    { path: '/my-bookings', label: 'Bookings', icon: 'bi-calendar-check' },
    { path: '/account', label: 'Account', icon: 'bi-person' },
  ],
  owner: [
    { path: '/owner', label: 'Overview', icon: 'bi-speedometer2', exact: true },
    { path: '/owner/bookings', label: 'Bookings', icon: 'bi-calendar-check' },
    { path: '/owner/courts', label: 'Courts', icon: 'bi-grid' },
    { path: '/owner/facility', label: 'Facility', icon: 'bi-shop' },
    { path: '/account', label: 'Account', icon: 'bi-person' },
  ],
  admin: [
    { path: '/admin', label: 'Overview', icon: 'bi-speedometer2', exact: true },
    { path: '/admin/facilities', label: 'Facilities', icon: 'bi-shop' },
    { path: '/admin/users', label: 'Users', icon: 'bi-people' },
    { path: '/admin/bookings', label: 'Bookings', icon: 'bi-calendar-check' },
    { path: '/admin/settings', label: 'Settings', icon: 'bi-gear' },
  ],
};

/** Bottom navigation for phones and tablets. Desktop uses the top bar and dashboard sidebar. */
@Component({
  selector: 'pb-tabbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabbar d-lg-none" aria-label="Main">
      @for (t of tabs(); track t.path) {
        <a [routerLink]="t.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!t.exact }">
          <i [class]="'bi ' + t.icon"></i>
          <span>{{ t.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [`
    .tabbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 1035; display: flex; background: #fff; border-top: 1px solid var(--pb-line);
      padding-bottom: env(safe-area-inset-bottom, 0px); }
    .tabbar a { flex: 1; min-width: 0; height: var(--pb-tabbar-h); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      color: var(--pb-muted); font-size: 0.6875rem; font-weight: 600; }
    .tabbar .bi { font-size: 1.3rem; line-height: 1; }
    .tabbar a.active { color: var(--pb-green); }
    .tabbar a.active .bi { transform: translateY(-1px); }
  `],
})
export class Tabbar {
  private auth = inject(AuthService);
  tabs = computed(() => TABS[this.auth.role() ?? 'guest']);
}
