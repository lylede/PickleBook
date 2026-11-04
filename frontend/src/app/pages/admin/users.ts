import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { ApiService, errMsg } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { User } from '../../core/models';
import { NiceDatePipe, StatusPipe } from '../../shared/pipes';

@Component({
  selector: 'pb-admin-users',
  standalone: true,
  imports: [FormsModule, NiceDatePipe, StatusPipe],
  styleUrl: '../dash/dash.scss',
  template: `
    <div class="head"><div><h1>Users</h1><p>Players, court owners and admins on PickleBook.</p></div></div>
    <div class="panel">
      <div class="panel-head">
        <div class="filters">
          <input class="input" [(ngModel)]="q" (ngModelChange)="search$.next($event)" placeholder="Search name or email">
          <select class="select" [(ngModel)]="role" (ngModelChange)="load()">
            <option value="">All roles</option><option value="player">Players</option><option value="owner">Court owners</option><option value="admin">Admins</option>
          </select>
        </div>
        <span class="muted" style="font-size: 13px">{{ users().length }} users</span>
      </div>
      @if (loading()) {
        <div class="center-state"><span class="spinner"></span></div>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Joined</th><th>Status</th><th></th></tr></thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td data-label="Name" class="who"><b>{{ u.full_name }}</b><small>{{ u.email }}</small></td>
                  <td data-label="Role"><span class="role" [attr.data-role]="u.role">{{ roleLabel[u.role] }}</span></td>
                  <td data-label="Phone">{{ u.phone || '—' }}</td>
                  <td data-label="Joined">{{ u.created_at | niceDate: true }}</td>
                  <td data-label="Status"><span [class]="'badge ' + u.status">{{ u.status | status }}</span></td>
                  <td class="actions">
                    @if (u.role !== 'admin' && u.id !== me) {
                      @if (u.status === 'active') { <button class="btn btn-danger btn-sm" (click)="setStatus(u, 'suspended')">Suspend</button> }
                      @else { <button class="btn btn-outline btn-sm" (click)="setStatus(u, 'active')">Reactivate</button> }
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .role { font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 8px; background: var(--mint-2); color: var(--forest); }
    .role[data-role="owner"] { background: #e0f2fe; color: #075985; }
    .role[data-role="admin"] { background: var(--ink); color: var(--lime); }
  `],
})
export class AdminUsersPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  me = inject(AuthService).user()?.id;
  users = signal<User[]>([]);
  loading = signal(true);
  q = '';
  role = '';
  search$ = new Subject<string>();
  roleLabel: Record<string, string> = { player: 'Player', owner: 'Court owner', admin: 'Super admin' };

  ngOnInit() {
    this.load();
    this.search$.pipe(debounceTime(300)).subscribe(() => this.load());
  }

  load() {
    this.api.adminUsers(this.role, this.q).subscribe({
      next: (u) => { this.users.set(u); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  setStatus(u: User, status: string) {
    this.api.adminSetUserStatus(u.id, status).subscribe({
      next: (r) => { this.toast.success(r.message); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
