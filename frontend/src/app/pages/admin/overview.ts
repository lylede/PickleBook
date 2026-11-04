import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { AdminStats, Facility } from '../../core/models';
import { PesoPipe } from '../../shared/pipes';

@Component({
  selector: 'pb-admin-overview',
  standalone: true,
  imports: [RouterLink, PesoPipe],
  styleUrl: '../dash/dash.scss',
  template: `
    <div class="head">
      <div><h1>Platform overview</h1><p>Everything happening across PickleBook.</p></div>
      <a routerLink="/admin/facilities" class="btn btn-primary">Manage facilities</a>
    </div>

    <div class="stats" style="margin-bottom: 18px">
      <div class="stat feature"><span class="label">Monthly subscription revenue</span><div class="value">{{ (s()?.mrr ?? 0) | peso }}</div><span class="stat-icon">₱</span></div>
      <div class="stat"><span class="label">Live facilities</span><div class="value">{{ s()?.facilities_approved ?? '–' }}</div><span class="stat-icon">⌂</span></div>
      <div class="stat"><span class="label">Players</span><div class="value">{{ s()?.players ?? '–' }}</div><span class="stat-icon">◍</span></div>
      <div class="stat"><span class="label">Successful bookings</span><div class="value">{{ s()?.bookings_successful ?? '–' }}</div><span class="stat-icon">✓</span></div>
    </div>

    <div class="cols two">
      <div class="panel">
        <div class="panel-head"><h2>Waiting for approval</h2><span class="badge pending">{{ pending().length }}</span></div>
        @if (!pending().length) {
          <div class="empty"><div class="empty-icon">✓</div><h3>No pending facilities</h3><p>New owner sign-ups will show up here.</p></div>
        } @else {
          <table class="table">
            <thead><tr><th>Facility</th><th>Owner</th><th></th></tr></thead>
            <tbody>
              @for (f of pending(); track f.id) {
                <tr>
                  <td data-label="Facility" class="who"><b>{{ f.name }}</b><small>{{ f.address }}, {{ f.city }}</small></td>
                  <td data-label="Owner" class="who"><b>{{ f.owner_name }}</b><small>{{ f.owner_email }}</small></td>
                  <td class="actions">
                    <button class="btn btn-danger btn-sm" (click)="update(f, 'suspended')">Decline</button>
                    <button class="btn btn-primary btn-sm" (click)="update(f, 'approved')">Approve</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <div class="panel">
        <div class="panel-head"><h2>Subscription plans</h2></div>
        <div class="panel-body">
          @for (p of plans(); track p.name) {
            <div class="plan-row">
              <div class="pr-top"><b>{{ p.name }}</b><span>{{ p.count }} {{ p.count === 1 ? 'facility' : 'facilities' }} · {{ p.price | peso }}/mo</span></div>
              <div class="track"><i [style.width.%]="p.pct"></i></div>
            </div>
          }
          <div class="totals">
            <div><small>Owners</small><b>{{ s()?.owners ?? 0 }}</b></div>
            <div><small>All bookings</small><b>{{ s()?.bookings_total ?? 0 }}</b></div>
            <div><small>Gross booking value</small><b>{{ (s()?.gross_bookings ?? 0) | peso }}</b></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .plan-row { margin-bottom: 16px; }
    .pr-top { display: flex; justify-content: space-between; gap: 10px; font-size: 14px; margin-bottom: 6px; }
    .pr-top span { color: var(--muted); }
    .track { height: 10px; border-radius: 999px; background: var(--mint-2); overflow: hidden; }
    .track i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--court), var(--lime)); transition: width .6s var(--ease); }
    .totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); }
    .totals small { display: block; font-size: 12px; color: var(--muted); }
    .totals b { font-family: var(--font-display); font-size: 18px; }
  `],
})
export class AdminOverviewPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  s = signal<AdminStats | null>(null);
  pending = signal<Facility[]>([]);

  plans = computed(() => {
    const p = this.s()?.plans || { starter: 0, pro: 0, club: 0 };
    const total = Math.max(1, p.starter + p.pro + p.club);
    return [
      { name: 'Starter', count: p.starter, price: 499, pct: (p.starter / total) * 100 },
      { name: 'Pro', count: p.pro, price: 999, pct: (p.pro / total) * 100 },
      { name: 'Club', count: p.club, price: 1999, pct: (p.club / total) * 100 },
    ];
  });

  ngOnInit() { this.load(); }

  load() {
    forkJoin({ stats: this.api.adminStats(), pending: this.api.adminFacilities('pending') }).subscribe({
      next: (r) => { this.s.set(r.stats); this.pending.set(r.pending); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  update(f: Facility, status: string) {
    this.api.adminUpdateFacility(f.id, { status }).subscribe({
      next: () => { this.toast.success(`${f.name} ${status === 'approved' ? 'is now live' : 'was declined'}`); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
