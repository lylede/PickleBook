import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { Logo } from './logo';

@Component({
  selector: 'pb-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, Logo],
  template: `
    <header class="nav" [class.solid]="solid()" [class.open]="open()">
      <div class="container bar">
        <a routerLink="/" class="brand" aria-label="PickleBook home"><pb-logo [dark]="solid() && !open()" /></a>

        <nav class="links">
          <a routerLink="/courts" routerLinkActive="active">Find courts</a>
          <a routerLink="/" fragment="how" (click)="close()">How it works</a>
          <a routerLink="/" fragment="owners" (click)="close()">For court owners</a>
          @if (auth.role() === 'player') { <a routerLink="/my-bookings" routerLinkActive="active">My bookings</a> }
          @if (auth.role() === 'owner') { <a routerLink="/owner" routerLinkActive="active">Dashboard</a> }
          @if (auth.role() === 'admin') { <a routerLink="/admin" routerLinkActive="active">Admin</a> }
        </nav>

        <div class="actions">
          @if (auth.user(); as u) {
            <div class="user">
              <button class="avatar" (click)="menu.set(!menu())" [attr.aria-expanded]="menu()" aria-label="Account menu">{{ initials() }}</button>
              @if (menu()) {
                <div class="dropdown" (click)="menu.set(false)">
                  <div class="who"><b>{{ u.full_name }}</b><span>{{ u.email }}</span><em class="role">{{ roleLabel() }}</em></div>
                  <a [routerLink]="auth.homeFor(u.role)">{{ u.role === 'player' ? 'Browse courts' : 'Open dashboard' }}</a>
                  @if (u.role === 'player') { <a routerLink="/my-bookings">My bookings</a> }
                  <button (click)="auth.logout()">Log out</button>
                </div>
              }
            </div>
          } @else {
            <a routerLink="/login" class="login">Log in</a>
            <a routerLink="/register" class="btn btn-lime btn-sm">Get started</a>
          }
          <button class="burger" (click)="open.set(!open())" [attr.aria-expanded]="open()" aria-label="Menu">
            <span></span><span></span>
          </button>
        </div>
      </div>

      <!-- Mobile drawer -->
      <div class="drawer">
        <a routerLink="/courts" (click)="close()">Find courts</a>
        <a routerLink="/" fragment="how" (click)="close()">How it works</a>
        <a routerLink="/" fragment="owners" (click)="close()">For court owners</a>
        @if (auth.role() === 'player') { <a routerLink="/my-bookings" (click)="close()">My bookings</a> }
        @if (auth.role() === 'owner') { <a routerLink="/owner" (click)="close()">Owner dashboard</a> }
        @if (auth.role() === 'admin') { <a routerLink="/admin" (click)="close()">Super admin</a> }
        <div class="drawer-cta">
          @if (auth.isLoggedIn()) {
            <button class="btn btn-ghost-light btn-block" (click)="auth.logout(); close()">Log out</button>
          } @else {
            <a routerLink="/login" class="btn btn-ghost-light btn-block" (click)="close()">Log in</a>
            <a routerLink="/register" class="btn btn-lime btn-block" (click)="close()">Create an account</a>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .nav { position: fixed; inset: 0 0 auto; z-index: 100; transition: background .3s, box-shadow .3s, backdrop-filter .3s; }
    .bar { height: var(--nav-h); display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .nav.solid { background: rgba(255,255,255,.86); backdrop-filter: blur(14px) saturate(1.4); box-shadow: 0 1px 0 var(--line); }
    .links { display: none; gap: 4px; }
    .links a { padding: 8px 14px; border-radius: 999px; font-weight: 600; font-size: 14.5px; color: rgba(255,255,255,.78); transition: color .2s, background .2s; }
    .links a:hover, .links a.active { color: #fff; background: rgba(255,255,255,.08); }
    .solid .links a { color: var(--ink-2); }
    .solid .links a:hover, .solid .links a.active { color: var(--ink); background: var(--mint-2); }
    .actions { display: flex; align-items: center; gap: 10px; }
    .login { font-weight: 700; font-size: 14.5px; color: #fff; padding: 8px 6px; display: none; }
    .solid .login { color: var(--ink); }
    .actions > .btn { display: none; }

    .user { position: relative; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--lime); background: var(--forest); color: var(--lime); font-weight: 800; font-size: 14px; }
    .dropdown { position: absolute; right: 0; top: 50px; width: 240px; background: #fff; border-radius: 16px; box-shadow: var(--shadow-lg); border: 1px solid var(--line); padding: 8px; animation: pop .2s var(--ease); }
    .dropdown .who { padding: 10px 12px 12px; border-bottom: 1px solid var(--line); margin-bottom: 6px; display: flex; flex-direction: column; }
    .dropdown .who span { font-size: 12.5px; color: var(--muted); word-break: break-all; }
    .dropdown .role { font-style: normal; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--court); margin-top: 6px; }
    .dropdown a, .dropdown button { display: block; width: 100%; text-align: left; padding: 10px 12px; border-radius: 10px; border: 0; background: none; font-weight: 600; font-size: 14px; color: var(--ink); }
    .dropdown a:hover, .dropdown button:hover { background: var(--mint); }
    .dropdown button { color: var(--danger); }

    .burger { width: 42px; height: 42px; border-radius: 12px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06); display: grid; place-content: center; gap: 6px; }
    .burger span { width: 18px; height: 2px; background: #fff; border-radius: 2px; transition: transform .3s var(--ease); }
    .solid .burger { border-color: var(--line); background: #fff; }
    .solid .burger span { background: var(--ink); }
    .open .burger span:first-child { transform: translateY(4px) rotate(45deg); background: #fff; }
    .open .burger span:last-child { transform: translateY(-4px) rotate(-45deg); background: #fff; }
    .open .burger { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.2); }

    .drawer { position: fixed; inset: var(--nav-h) 0 0; background: var(--night); padding: 24px 20px; display: flex; flex-direction: column; gap: 4px;
      transform: translateY(-8px); opacity: 0; pointer-events: none; transition: opacity .25s, transform .3s var(--ease); }
    .open { background: var(--night) !important; box-shadow: none !important; }
    .open .drawer { opacity: 1; transform: none; pointer-events: auto; }
    .drawer a:not(.btn) { font-family: var(--font-display); font-size: 24px; color: #fff; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,.08); }
    .drawer-cta { margin-top: auto; display: grid; gap: 10px; padding-bottom: env(safe-area-inset-bottom); }

    @media (min-width: 960px) {
      .links { display: flex; }
      .burger, .drawer { display: none; }
      .login { display: inline-block; }
      .actions > .btn { display: inline-flex; }
    }
    @media (min-width: 480px) and (max-width: 959px) { .actions > .btn { display: inline-flex; } }
  `],
})
export class Navbar {
  auth = inject(AuthService);
  private router = inject(Router);
  open = signal(false);
  menu = signal(false);
  private scrolled = signal(false);
  private onHome = signal(true);

  /** Transparent on top of dark heroes, solid white elsewhere */
  solid = computed(() => this.scrolled() || !this.onHome());
  initials = computed(() => (this.auth.user()?.full_name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase());
  roleLabel = computed(() => ({ player: 'Player', owner: 'Court owner', admin: 'Super admin' }[this.auth.role() || 'player']));

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url: string = e.urlAfterRedirects.split('?')[0].split('#')[0];
      // Pages with a dark hero at the top
      this.onHome.set(url === '/' || url === '/courts' || url.startsWith('/courts/') || url === '/my-bookings' || url.startsWith('/bookings/'));
      this.close();
      this.onScroll();
    });
  }

  close() { this.open.set(false); this.menu.set(false); }

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 24); }

  @HostListener('document:click', ['$event'])
  onDoc(e: MouseEvent) {
    if (this.menu() && !(e.target as HTMLElement).closest('.user')) this.menu.set(false);
  }
}
