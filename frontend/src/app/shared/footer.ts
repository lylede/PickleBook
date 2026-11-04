import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from './logo';

@Component({
  selector: 'pb-footer',
  standalone: true,
  imports: [RouterLink, Logo],
  template: `
    <footer>
      <div class="container grid">
        <div class="about">
          <pb-logo />
          <p>An online booking and management system for pickleball courts. Built for local courts and the players who love them.</p>
        </div>
        <div>
          <h4>Players</h4>
          <a routerLink="/courts">Find a court</a>
          <a routerLink="/register">Create account</a>
          <a routerLink="/my-bookings">My bookings</a>
        </div>
        <div>
          <h4>Court owners</h4>
          <a routerLink="/register" [queryParams]="{ as: 'owner' }">List your facility</a>
          <a routerLink="/" fragment="pricing">Pricing</a>
          <a routerLink="/owner">Owner dashboard</a>
        </div>
        <div>
          <h4>Team</h4>
          <span>PickleBook · IT-FRELEAN</span>
          <span>Cebu, Philippines</span>
        </div>
      </div>
      <div class="container bottom">
        <span>© {{ year }} PickleBook. All rights reserved.</span>
        <span>Play more. Message less.</span>
      </div>
    </footer>
  `,
  styles: [`
    footer { background: var(--night); color: rgba(255,255,255,.66); padding: 56px 0 24px; font-size: 14px; }
    .grid { display: grid; gap: 32px; grid-template-columns: 1fr 1fr; }
    .about { grid-column: 1 / -1; }
    .about p { margin-top: 14px; max-width: 360px; }
    h4 { font-family: var(--font-body); font-size: 12px; text-transform: uppercase; letter-spacing: .14em; color: #fff; margin-bottom: 14px; }
    a, span { display: block; padding: 4px 0; }
    a:hover { color: var(--lime); }
    .bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,.08); font-size: 13px; }
    .bottom span { padding: 0; }
    @media (min-width: 860px) { .grid { grid-template-columns: 2fr 1fr 1fr 1fr; } .about { grid-column: auto; } }
  `],
})
export class Footer {
  year = new Date().getFullYear();
}
