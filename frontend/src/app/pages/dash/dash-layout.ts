import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

interface NavItem { path: string; label: string; icon: string; exact?: boolean; }

/** Shell for the owner and admin dashboards. Desktop gets a sidebar; phones use the bottom tab bar. */
@Component({
  selector: 'pb-dash-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="dash">
      <aside class="side d-none d-lg-flex flex-column">
        <div class="small text-uppercase fw-bold text-secondary px-3 mb-2" style="letter-spacing: .06em">{{ area }}</div>
        <nav class="nav flex-column gap-1">
          @for (n of nav; track n.path) {
            <a class="nav-link d-flex align-items-center gap-2" [routerLink]="n.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!n.exact }">
              <i [class]="'bi ' + n.icon"></i>{{ n.label }}
            </a>
          }
        </nav>
        <div class="mt-auto">
          <a class="nav-link d-flex align-items-center gap-2" routerLink="/courts"><i class="bi bi-box-arrow-up-right"></i>Public site</a>
          <a class="nav-link d-flex align-items-center gap-2" routerLink="/account"><i class="bi bi-person"></i>Account</a>
        </div>
      </aside>
      <div class="content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .dash { display: block; }
    .content { padding: 1.25rem 1rem 2rem; min-width: 0; }
    @media (min-width: 992px) {
      .dash { display: grid; grid-template-columns: 240px minmax(0, 1fr); min-height: calc(100svh - 61px); }
      .side { position: sticky; top: 61px; height: calc(100svh - 61px); padding: 1.5rem 0.75rem; background: #fff; border-right: 1px solid var(--pb-line); }
      .nav-link { color: var(--pb-ink); font-weight: 600; border-radius: 0.5rem; padding: 0.55rem 0.75rem; }
      .nav-link:hover { background: var(--pb-bg); }
      .nav-link.active { background: var(--pb-green-50); color: var(--pb-green); }
      .content { padding: 2rem 2.25rem 3rem; max-width: 1200px; }
    }
  `],
})
export class DashLayout {
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);
  nav: NavItem[] = this.route.snapshot.data['nav'] || [];
  area: string = this.route.snapshot.data['area'] || '';
}
