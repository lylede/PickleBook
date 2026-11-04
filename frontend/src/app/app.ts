import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Navbar } from './shared/navbar';
import { Footer } from './shared/footer';
import { Toasts } from './shared/toasts';

@Component({
  selector: 'pb-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer, Toasts],
  template: `
    <pb-navbar />
    <main><router-outlet /></main>
    @if (showFooter()) { <pb-footer /> }
    <pb-toasts />
  `,
  styles: [`main { min-height: 100svh; }`],
})
export class App {
  private router = inject(Router);
  private url = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map((e: any) => e.urlAfterRedirects as string)),
    { initialValue: '/' },
  );
  // Dashboards and auth pages are full-screen apps without the marketing footer
  showFooter = computed(() => !/^\/(owner|admin|login|register)/.test(this.url()));
}
