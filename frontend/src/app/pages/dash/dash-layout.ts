import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

interface NavItem { path: string; label: string; icon: string; exact?: boolean; }

/** Shared shell for the court owner and super admin dashboards */
@Component({
  selector: 'pb-dash-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="dash">
      <aside class="side">
        <div class="area">
          <span class="dot"></span>
          <div><small>{{ area }}</small><b>{{ auth.user()?.full_name }}</b></div>
        </div>
        <nav>
          @for (n of nav; track n.path) {
            <a [routerLink]="n.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!n.exact }">
              <span class="ico">{{ n.icon }}</span>{{ n.label }}
            </a>
          }
        </nav>
        <div class="side-foot">
          <a routerLink="/courts" class="ghost">View public site ↗</a>
          <button class="ghost" (click)="auth.logout()">Log out</button>
        </div>
      </aside>
      <section class="content">
        <router-outlet />
      </section>
    </div>
  `,
  styles: [`
    .dash { min-height: 100svh; padding-top: var(--nav-h); background: var(--mint); }
    .side { position: sticky; top: var(--nav-h); z-index: 20; background: var(--night); color: #fff; }
    .area { display: none; }
    nav { display: flex; gap: 4px; overflow-x: auto; padding: 10px 14px; scrollbar-width: none; }
    nav::-webkit-scrollbar { display: none; }
    nav a { flex: none; display: flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 12px; font-weight: 600; font-size: 14px; color: rgba(255,255,255,.7); transition: background .2s, color .2s; }
    nav a:hover { color: #fff; background: rgba(255,255,255,.06); }
    nav a.active { background: var(--lime); color: var(--ink); }
    .ico { width: 18px; text-align: center; }
    .side-foot { display: none; }
    .content { padding: 22px 16px 60px; max-width: 1180px; }

    @media (min-width: 1000px) {
      .dash { display: grid; grid-template-columns: 260px 1fr; }
      .side { height: calc(100svh - var(--nav-h)); display: flex; flex-direction: column; padding: 22px 16px; }
      .area { display: flex; gap: 12px; align-items: center; padding: 6px 10px 22px; border-bottom: 1px solid rgba(255,255,255,.08); margin-bottom: 14px; }
      .area .dot { width: 38px; height: 38px; border-radius: 12px; background: linear-gradient(135deg, var(--lime), var(--court-2)); flex: none; }
      .area small { display: block; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--lime); }
      .area b { font-size: 14.5px; }
      nav { flex-direction: column; overflow: visible; padding: 0; }
      nav a { padding: 12px 14px; }
      .side-foot { display: grid; gap: 4px; margin-top: auto; }
      .ghost { text-align: left; background: none; border: 0; color: rgba(255,255,255,.6); font-weight: 600; font-size: 14px; padding: 10px 14px; border-radius: 12px; }
      .ghost:hover { color: #fff; background: rgba(255,255,255,.06); }
      .content { padding: 32px 36px 60px; width: 100%; }
    }
  `],
})
export class DashLayout {
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  nav: NavItem[] = this.route.snapshot.data['nav'] || [];
  area: string = this.route.snapshot.data['area'] || '';
}
