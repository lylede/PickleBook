import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, errMsg } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Booking, Court, Facility, OwnerStats } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe, hourLabel, isoDate } from '../../shared/pipes';
import { ProofModal } from './proof-modal';

interface SetupStep { label: string; done: boolean; link: string; }

@Component({
  selector: 'pb-owner-overview',
  standalone: true,
  imports: [RouterLink, PesoPipe, HourPipe, NiceDatePipe, ProofModal],
  template: `
    <h1 class="page-title">Hi, {{ firstName() }}</h1>
    <p class="page-sub mb-4">{{ today | niceDate }}</p>

    @if (loading()) {
      <div class="row g-3">@for (i of [1,2,3,4]; track i) { <div class="col-6 col-xl-3"><div class="skeleton" style="height: 92px"></div></div> }</div>
    } @else {
      <!-- Setup checklist until the facility is ready -->
      @if (setupLeft() > 0) {
        <div class="card mb-3 border-warning-subtle">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h2 class="h6 mb-0">Finish setting up {{ facility()?.name }}</h2>
              <span class="small text-secondary">{{ setup().length - setupLeft() }} of {{ setup().length }} done</span>
            </div>
            <div class="progress mb-3" style="height: 6px" role="progressbar" [attr.aria-valuenow]="setup().length - setupLeft()" aria-valuemin="0" [attr.aria-valuemax]="setup().length">
              <div class="progress-bar bg-primary" [style.width.%]="((setup().length - setupLeft()) / setup().length) * 100"></div>
            </div>
            <ul class="list-unstyled d-grid gap-2 mb-0">
              @for (s of setup(); track s.label) {
                <li class="d-flex align-items-center gap-2">
                  <i class="bi" [class.bi-check-circle-fill]="s.done" [class.text-primary]="s.done" [class.bi-circle]="!s.done" [class.text-secondary]="!s.done"></i>
                  @if (s.done) { <span class="text-secondary text-decoration-line-through">{{ s.label }}</span> }
                  @else { <a [routerLink]="s.link" class="fw-semibold">{{ s.label }}</a> }
                </li>
              }
            </ul>
          </div>
        </div>
      }

      <!-- Key numbers -->
      <div class="row g-2 g-lg-3 mb-3">
        <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body">
          <div class="stat-label"><i class="bi bi-calendar-day me-1"></i>Today</div><div class="stat-value tnum">{{ stats()?.today_bookings ?? 0 }}</div><div class="small text-secondary">bookings</div>
        </div></div></div>
        <div class="col-6 col-xl-3"><a class="card h-100 text-reset" routerLink="/owner/bookings" [queryParams]="{ status: 'for_verification' }"><div class="card-body">
          <div class="stat-label"><i class="bi bi-receipt me-1"></i>To verify</div>
          <div class="stat-value tnum" [class.text-warning-emphasis]="(stats()?.to_verify ?? 0) > 0">{{ stats()?.to_verify ?? 0 }}</div><div class="small text-secondary">GCash payments</div>
        </div></a></div>
        <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body">
          <div class="stat-label"><i class="bi bi-calendar-check me-1"></i>Upcoming</div><div class="stat-value tnum">{{ stats()?.upcoming ?? 0 }}</div><div class="small text-secondary">confirmed</div>
        </div></div></div>
        <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body">
          <div class="stat-label"><i class="bi bi-cash-stack me-1"></i>This month</div><div class="stat-value tnum">{{ (stats()?.month_revenue ?? 0) | peso }}</div><div class="small text-secondary">confirmed revenue</div>
        </div></div></div>
      </div>

      <div class="row g-3">
        <div class="col-12 col-xl-7">
          <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span>Payments to verify</span>
              @if (toVerify().length) { <span class="badge rounded-pill text-bg-warning">{{ toVerify().length }}</span> }
            </div>
            @if (!toVerify().length) {
              <div class="empty-state"><i class="bi bi-check2-circle"></i><h3>You're all caught up</h3><p class="mb-0">New GCash receipts will appear here.</p></div>
            } @else {
              <div class="list-group list-group-flush">
                @for (b of toVerify(); track b.id) {
                  <button type="button" class="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3" (click)="selected.set(b)">
                    <div class="icon-tile"><i class="bi bi-receipt"></i></div>
                    <div class="flex-grow-1 min-w-0">
                      <div class="fw-bold text-truncate">{{ b.player_name }}</div>
                      <div class="small text-secondary">{{ b.court_name }} · {{ b.booking_date | niceDate: true }}, {{ b.start_hour | hour }}</div>
                    </div>
                    <div class="text-end"><div class="fw-bold tnum">{{ b.total_amount | peso }}</div><div class="small text-primary fw-semibold">Review <i class="bi bi-chevron-right"></i></div></div>
                  </button>
                }
              </div>
            }
          </div>
        </div>
        <div class="col-12 col-xl-5">
          <div class="card mb-3">
            <div class="card-header">Revenue, last 7 days</div>
            <div class="card-body">
              <div class="bars" role="img" [attr.aria-label]="'Revenue for the last 7 days, total ' + weekTotal()">
                @for (d of week(); track d.date) {
                  <div class="bar" [title]="d.label + ': ' + d.revenue + ' pesos'"><i [style.height.%]="d.pct"></i><small>{{ d.label }}</small></div>
                }
              </div>
              <div class="small text-secondary mt-2">Total <b class="text-body tnum">{{ weekTotal() | peso }}</b></div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">Busiest start times</div>
            <div class="card-body">
              @if (!peak().length) {
                <p class="small text-secondary mb-0">Shows up after your first confirmed bookings.</p>
              } @else {
                <div class="bars">
                  @for (h of peak(); track h.hour) { <div class="bar"><b>{{ h.total }}</b><i [style.height.%]="h.pct"></i><small>{{ h.label }}</small></div> }
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }

    @if (selected(); as s) {
      <pb-proof-modal [booking]="s" (closed)="selected.set(null)" (action)="setStatus(s, $event)" />
    }
  `,
})
export class OwnerOverviewPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  today = isoDate(new Date());
  loading = signal(true);
  stats = signal<OwnerStats | null>(null);
  facilities = signal<Facility[]>([]);
  courts = signal<Court[]>([]);
  toVerify = signal<Booking[]>([]);
  selected = signal<Booking | null>(null);

  firstName = computed(() => (this.auth.user()?.full_name || '').split(' ')[0]);
  facility = computed(() => this.facilities()[0]);
  setup = computed<SetupStep[]>(() => {
    const f = this.facility();
    if (!f) return [];
    return [
      { label: 'Add your first court', done: this.courts().length > 0, link: '/owner/courts' },
      { label: 'Upload your GCash QR', done: !!f.gcash_qr, link: '/owner/facility' },
      { label: 'Set opening hours and contact number', done: !!f.contact_phone, link: '/owner/facility' },
      { label: 'Get approved by PickleBook', done: f.status === 'approved', link: '/owner/facility' },
    ];
  });
  setupLeft = computed(() => this.setup().filter((s) => !s.done).length);

  week = computed(() => {
    const data = this.stats()?.week || [];
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 6 + i);
      const iso = isoDate(d);
      const row = data.find((r) => r.date.slice(0, 10) === iso);
      return { date: iso, label: d.toLocaleDateString('en-US', { weekday: 'narrow' }), revenue: Number(row?.revenue || 0), pct: 0 };
    });
    const max = Math.max(1, ...days.map((d) => d.revenue));
    days.forEach((d) => (d.pct = (d.revenue / max) * 100));
    return days;
  });
  weekTotal = computed(() => this.week().reduce((a, d) => a + d.revenue, 0));

  peak = computed(() => {
    const rows = this.stats()?.popular_hours || [];
    const max = Math.max(1, ...rows.map((r) => Number(r.total)));
    return rows.map((r) => ({ hour: r.hour, total: Number(r.total), pct: (Number(r.total) / max) * 100, label: hourLabel(r.hour).replace(':00 ', '') }));
  });

  ngOnInit() { this.load(); }

  load() {
    forkJoin({
      stats: this.api.ownerStats(),
      facilities: this.api.ownerFacilities(),
      verify: this.api.ownerBookings({ status: 'for_verification' }),
    }).subscribe({
      next: (r) => {
        this.stats.set(r.stats); this.facilities.set(r.facilities); this.toVerify.set(r.verify); this.loading.set(false);
        if (r.facilities[0]) this.api.ownerCourts(r.facilities[0].id).subscribe({ next: (c) => this.courts.set(c), error: () => {} });
      },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  setStatus(b: Booking, status: string) {
    this.api.setBookingStatus(b.id, status).subscribe({
      next: () => { this.toast.success(status === 'confirmed' ? 'Booking confirmed' : 'Payment rejected. The player can upload a new receipt.'); this.selected.set(null); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
