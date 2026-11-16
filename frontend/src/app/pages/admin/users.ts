import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { ApiService, errMsg } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import { User } from '../../core/models';
import { NiceDatePipe } from '../../shared/pipes';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'pb-admin-users',
  standalone: true,
  imports: [FormsModule, NiceDatePipe, StatusBadge],
  template: `
    <h1 class="page-title mb-3">Users</h1>
    <div class="row g-2 mb-3">
      <div class="col-12 col-md-6">
        <div class="input-group"><span class="input-group-text"><i class="bi bi-search"></i></span>
          <input class="form-control" type="search" [(ngModel)]="q" (ngModelChange)="search$.next($event)" placeholder="Name or email" aria-label="Search users"></div>
      </div>
      <div class="col-12 col-md-3">
        <select class="form-select" [(ngModel)]="role" (ngModelChange)="load()" aria-label="Role">
          <option value="">All roles</option><option value="player">Players</option><option value="owner">Court owners</option><option value="admin">Admins</option>
        </select>
      </div>
    </div>

    @if (loading()) {
      <div class="d-grid gap-2">@for (i of [1,2,3]; track i) { <div class="skeleton" style="height: 72px"></div> }</div>
    } @else if (!users().length) {
      <div class="card"><div class="empty-state"><i class="bi bi-people"></i><h3>No users found</h3></div></div>
    } @else {
      <p class="small text-secondary mb-2">{{ users().length }} users</p>
      <div class="card"><div class="list-group list-group-flush">
        @for (u of users(); track u.id) {
          <div class="list-group-item d-flex flex-wrap align-items-center gap-3 py-3">
            <span class="avatar">{{ initials(u.full_name) }}</span>
            <div class="flex-grow-1 min-w-0">
              <div class="fw-bold text-truncate">{{ u.full_name }} <span class="badge bg-body-tertiary text-body-secondary fw-semibold ms-1">{{ roleLabel[u.role] }}</span></div>
              <div class="small text-secondary text-truncate">{{ u.email }}{{ u.phone ? ' · ' + u.phone : '' }} · joined {{ u.created_at | niceDate: true }}</div>
            </div>
            <pb-status [status]="u.status || 'active'" />
            @if (u.role !== 'admin' && u.id !== me) {
              @if (u.status === 'active') { <button class="btn btn-light border btn-sm text-danger" (click)="suspend(u)">Suspend</button> }
              @else { <button class="btn btn-light border btn-sm" (click)="setStatus(u, 'active')">Reactivate</button> }
            }
          </div>
        }
      </div></div>
    }
  `,
  styles: [`.avatar { width: 2.25rem; height: 2.25rem; flex: none; border-radius: 50%; display: grid; place-items: center; background: var(--pb-green-50); color: var(--pb-pine); font-weight: 800; font-size: 0.8125rem; }`],
})
export class AdminUsersPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  me = inject(AuthService).user()?.id;
  users = signal<User[]>([]);
  loading = signal(true);
  q = '';
  role = '';
  search$ = new Subject<string>();
  private sub?: Subscription;
  roleLabel: Record<string, string> = { player: 'Player', owner: 'Court owner', admin: 'Admin' };

  ngOnInit() {
    this.load();
    this.sub = this.search$.pipe(debounceTime(300)).subscribe(() => this.load());
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  initials(n: string) { return n.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase(); }

  load() {
    this.api.adminUsers(this.role, this.q.trim()).subscribe({
      next: (u) => { this.users.set(u); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  async suspend(u: User) {
    const ok = await this.confirm.ask({ title: `Suspend ${u.full_name}?`, message: 'They won’t be able to log in until you reactivate the account.', confirmText: 'Suspend', danger: true });
    if (ok) this.setStatus(u, 'suspended');
  }

  setStatus(u: User, status: string) {
    this.api.adminSetUserStatus(u.id, status).subscribe({
      next: () => { this.toast.success(status === 'active' ? 'Account reactivated' : 'Account suspended'); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
