import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, errMsg } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Booking, Facility, OwnerStats } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe, StatusPipe, hourLabel, isoDate } from '../../shared/pipes';
import { ProofModal } from './proof-modal';

@Component({
  selector: 'pb-owner-overview',
  standalone: true,
  imports: [RouterLink, PesoPipe, HourPipe, NiceDatePipe, StatusPipe, ProofModal],
  styleUrl: '../dash/dash.scss',
  template: `
    <div class="head">
      <div>
        <h1>Good {{ greeting }}, {{ firstName() }} 👋</h1>
        <p>Here's what's happening at your courts today.</p>
      </div>
      <a routerLink="/owner/bookings" class="btn btn-primary">View all bookings</a>
    </div>

    @for (f of facilities(); track f.id) {
      @if (f.status === 'pending') {
        <div class="alert warn" style="margin-bottom: 12px">⏳ <div><b>{{ f.name }}</b> is waiting for super admin approval. Players can't see it yet, but you can already set up courts and your GCash QR.</div></div>
      }
      @if (f.status === 'suspended') {
        <div class="alert warn" style="margin-bottom: 12px">⛔ <div><b>{{ f.name }}</b> is suspended. Contact PickleBook support.</div></div>
      }
      @if (!f.gcash_qr) {
        <div class="alert info" style="margin-bottom: 12px">📷 <div><b>{{ f.name }}</b> has no GCash QR yet. <a routerLink="/owner/facility" style="font-weight: 800; text-decoration: underline">Upload it</a> so players can pay you directly.</div></div>
      }
    }

    <div class="stats" style="margin: 6px 0 18px">
      <div class="stat feature"><span class="label">Today's bookings</span><div class="value">{{ stats()?.today_bookings ?? '–' }}</div><span class="stat-icon">▦</span></div>
      <div class="stat"><span class="label">Payments to verify</span><div class="value">{{ stats()?.to_verify ?? '–' }}</div><span class="stat-icon">◷</span></div>
      <div class="stat"><span class="label">Upcoming confirmed</span><div class="value">{{ stats()?.upcoming ?? '–' }}</div><span class="stat-icon">✓</span></div>
      <div class="stat"><span class="label">Revenue this month</span><div class="value">{{ (stats()?.month_revenue ?? 0) | peso }}</div><span class="stat-icon">₱</span></div>
    </div>

    <div class="cols two">
      <div class="panel">
        <div class="panel-head"><h2>Needs verification</h2><span class="badge for_verification">{{ toVerify().length }}</span></div>
        @if (!toVerify().length) {
          <div class="empty"><div class="empty-icon">✓</div><h3>All caught up</h3><p>New GCash payments will appear here.</p></div>
        } @else {
          <table class="table">
            <thead><tr><th>Player</th><th>Schedule</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              @for (b of toVerify(); track b.id) {
                <tr>
                  <td data-label="Player" class="who"><b>{{ b.player_name }}</b><small>{{ b.reference_code }}</small></td>
                  <td data-label="Schedule">{{ b.booking_date | niceDate: true }} · {{ b.start_hour | hour }}<br><small class="muted">{{ b.court_name }}</small></td>
                  <td data-label="Amount"><b>{{ b.total_amount | peso }}</b></td>
                  <td class="actions"><button class="btn btn-primary btn-sm" (click)="selected.set(b)">Review</button></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <div class="panel">
        <div class="panel-head"><h2>Revenue · last 7 days</h2></div>
        <div class="panel-body">
          <div class="bars">
            @for (d of week(); track d.date) {
              <div class="bar" [title]="(d.revenue | peso) + ' · ' + d.bookings + ' bookings'">
                <em>{{ d.revenue ? (d.revenue / 1000).toFixed(1) + 'k' : '' }}</em>
                <i [style.height.%]="d.pct"></i>
                <small>{{ d.label }}</small>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Peak hours</h2><span class="muted" style="font-size: 13px">Confirmed bookings by start time, last 60 days</span></div>
      <div class="panel-body">
        @if (!peak().length) {
          <p class="muted">No confirmed bookings yet. Your busiest hours will show here.</p>
        } @else {
          <div class="bars">
            @for (h of peak(); track h.hour) {
              <div class="bar"><em>{{ h.total }}</em><i [style.height.%]="h.pct"></i><small>{{ h.label }}</small></div>
            }
          </div>
        }
      </div>
    </div>

    @if (selected(); as s) {
      <pb-proof-modal [booking]="s" (closed)="selected.set(null)" (action)="setStatus(s, $event)" />
    }
  `,
})
export class OwnerOverviewPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  stats = signal<OwnerStats | null>(null);
  facilities = signal<Facility[]>([]);
  toVerify = signal<Booking[]>([]);
  selected = signal<Booking | null>(null);

  greeting = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
  firstName = computed(() => this.auth.user()?.full_name.split(' ')[0] || '');

  week = computed(() => {
    const data = this.stats()?.week || [];
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 6 + i);
      const iso = isoDate(d);
      const row = data.find((r) => r.date.slice(0, 10) === iso);
      return { date: iso, label: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: Number(row?.revenue || 0), bookings: Number(row?.bookings || 0), pct: 0 };
    });
    const max = Math.max(1, ...days.map((d) => d.revenue));
    days.forEach((d) => (d.pct = (d.revenue / max) * 100));
    return days;
  });

  peak = computed(() => {
    const rows = this.stats()?.popular_hours || [];
    const max = Math.max(1, ...rows.map((r) => Number(r.total)));
    return rows.map((r) => ({ hour: r.hour, total: Number(r.total), pct: (Number(r.total) / max) * 100, label: hourLabel(r.hour).replace(':00', '') }));
  });

  ngOnInit() { this.load(); }

  load() {
    forkJoin({
      stats: this.api.ownerStats(),
      facilities: this.api.ownerFacilities(),
      verify: this.api.ownerBookings({ status: 'for_verification' }),
    }).subscribe({
      next: (r) => { this.stats.set(r.stats); this.facilities.set(r.facilities); this.toVerify.set(r.verify); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  setStatus(b: Booking, status: string) {
    this.api.setBookingStatus(b.id, status).subscribe({
      next: (r) => { this.toast.success(r.message); this.selected.set(null); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
