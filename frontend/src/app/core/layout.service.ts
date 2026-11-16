import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** Knows which page is open so the shell can show or hide the footer and the phone tab bar. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private router = inject(Router);
  readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects.split('?')[0].split('#')[0]),
    ),
    { initialValue: '/' },
  );

  readonly isDashboard = computed(() => /^\/(owner|admin)(\/|$)/.test(this.url()));
  readonly isAuthPage = computed(() => /^\/(login|register)$/.test(this.url()));
  /** Booking and payment screens have their own bottom action bar, so the tab bar steps aside. */
  readonly isCheckout = computed(() => /^\/courts\/\d+$/.test(this.url()) || /^\/bookings\//.test(this.url()));

  readonly showTabbar = computed(() => !this.isAuthPage() && !this.isCheckout());
  readonly showFooter = computed(() => !this.isDashboard() && !this.isAuthPage() && !this.isCheckout() && this.url() !== '/account');
}
