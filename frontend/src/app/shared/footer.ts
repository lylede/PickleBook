import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from './logo';

@Component({
  selector: 'pb-footer',
  standalone: true,
  imports: [RouterLink, Logo],
  template: `
    <footer class="bg-pine text-white-50 pt-5 pb-4">
      <div class="container">
        <div class="row gy-4">
          <div class="col-12 col-lg-5">
            <pb-logo [onDark]="true" [height]="28" />
            <p class="mt-3 mb-0 small" style="max-width: 22rem">Online booking and management for pickleball courts in Cebu.</p>
          </div>
          <div class="col-6 col-lg-2">
            <h2 class="foot-h">Players</h2>
            <a routerLink="/courts">Find a court</a>
            <a routerLink="/my-bookings">My bookings</a>
            <a routerLink="/register">Create account</a>
          </div>
          <div class="col-6 col-lg-2">
            <h2 class="foot-h">Court owners</h2>
            <a routerLink="/register" [queryParams]="{ as: 'owner' }">List your facility</a>
            <a routerLink="/" fragment="pricing">Plans</a>
            <a routerLink="/owner">Dashboard</a>
          </div>
          <div class="col-12 col-lg-3">
            <h2 class="foot-h">Help</h2>
            <a routerLink="/" fragment="faq">Questions and answers</a>
            <a routerLink="/" fragment="how">How booking works</a>
          </div>
        </div>
        <hr class="border-light opacity-25 my-4">
        <p class="small mb-0">© {{ year }} PickleBook · Team IT-FRELEAN</p>
      </div>
    </footer>
  `,
  styles: [`
    .foot-h { font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; margin-bottom: 0.75rem; }
    a { display: block; padding: 0.2rem 0; color: rgba(255, 255, 255, 0.72); font-size: 0.9375rem; text-decoration: none; }
    a:hover { color: var(--pb-lime); }
  `],
})
export class Footer {
  year = new Date().getFullYear();
}
