import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { ApiService, errMsg } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Availability, CourtAvailability, Facility } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe, hourLabel, isoDate } from '../../shared/pipes';

/**
 * Booking screen. The player picks, in order: date, court, how long, start time.
 * Only start times where the whole duration is free are shown, so an invalid choice is impossible.
 */
@Component({
  selector: 'pb-facility-detail',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, PesoPipe, HourPipe, NiceDatePipe],
  template: `
    @if (loading()) {
      <div class="container page"><div class="skeleton mb-3" style="height: 28px; width: 60%"></div><div class="skeleton" style="height: 300px"></div></div>
    } @else if (!facility()) {
      <div class="container page"><div class="card"><div class="empty-state">
        <i class="bi bi-shop"></i>
        <h3>This facility isn't available</h3>
        <p>{{ error() || 'It may have been removed or is not yet approved.' }}</p>
        <a routerLink="/courts" class="btn btn-primary">Back to courts</a>
      </div></div></div>
    } @else {
      <div class="container page booking-page">
        <a routerLink="/courts" class="small fw-semibold d-inline-flex align-items-center gap-1 mb-2"><i class="bi bi-chevron-left"></i>All courts</a>
        <h1 class="page-title">{{ facility()!.name }}</h1>
        <p class="page-sub small"><i class="bi bi-geo-alt me-1"></i>{{ facility()!.address }}, {{ facility()!.city }}</p>
        <p class="small text-secondary mb-3"><i class="bi bi-clock me-1"></i>Open {{ facility()!.open_hour | hour }} – {{ facility()!.close_hour | hour }}
          @if (facility()!.contact_phone) { <span class="ms-2"><i class="bi bi-telephone me-1"></i>{{ facility()!.contact_phone }}</span> }</p>
        @if (facility()!.description) { <p class="mb-4">{{ facility()!.description }}</p> }

        <div class="row g-4">
          <div class="col-12 col-lg-8">
            <!-- Date -->
            <section class="mb-4" aria-labelledby="h-date">
              <h2 id="h-date" class="h6 mb-2">Date</h2>
              <div class="d-flex gap-2 overflow-auto pb-1 dates">
                @for (d of dates; track d.iso) {
                  <button type="button" class="date" [class.active]="date() === d.iso" (click)="pickDate(d.iso)" [attr.aria-pressed]="date() === d.iso">
                    <small>{{ d.dow }}</small><b>{{ d.day }}</b><small>{{ d.mon }}</small>
                  </button>
                }
              </div>
            </section>

            <!-- Court -->
            <section class="mb-4" aria-labelledby="h-court">
              <h2 id="h-court" class="h6 mb-2">Court</h2>
              @if (!availLoading() && !avail()?.courts?.length) {
                <p class="text-secondary small">No courts are open for booking at this facility yet.</p>
              }
              <div class="list-group">
                @for (c of avail()?.courts || []; track c.id) {
                  <button type="button" class="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3" [class.active-court]="courtId() === c.id" (click)="pickCourt(c.id)" [attr.aria-pressed]="courtId() === c.id">
                    <i class="bi fs-5" [class.bi-record-circle-fill]="courtId() === c.id" [class.text-primary]="courtId() === c.id" [class.bi-circle]="courtId() !== c.id" [class.text-secondary]="courtId() !== c.id"></i>
                    <div class="flex-grow-1 min-w-0">
                      <div class="fw-bold">{{ c.name }}</div>
                      <div class="small text-secondary">{{ surfaceLabel(c.surface) }} · {{ freeCount(c) }} open {{ freeCount(c) === 1 ? 'hour' : 'hours' }}</div>
                    </div>
                    <div class="text-end fw-bold text-nowrap">{{ c.hourly_rate | peso }}<div class="small fw-normal text-secondary">per hour</div></div>
                  </button>
                }
              </div>
            </section>

            <!-- Duration -->
            <section class="mb-4" aria-labelledby="h-dur">
              <h2 id="h-dur" class="h6 mb-2">How long?</h2>
              <div class="btn-group w-100" role="group" aria-label="Duration">
                @for (h of [1, 2, 3, 4]; track h) {
                  <button type="button" class="btn" [class.btn-dark]="hours() === h" [class.btn-light]="hours() !== h" [class.border]="hours() !== h" (click)="pickHours(h)">{{ h }} {{ h === 1 ? 'hour' : 'hrs' }}</button>
                }
              </div>
            </section>

            <!-- Start time -->
            <section class="mb-4" aria-labelledby="h-time">
              <h2 id="h-time" class="h6 mb-2">Start time</h2>
              @if (availLoading()) {
                <div class="row g-2">@for (i of [1,2,3,4,5,6]; track i) { <div class="col-4 col-sm-3"><div class="skeleton" style="height: 44px"></div></div> }</div>
              } @else if (court() && !startTimes().length) {
                <div class="alert alert-light border small mb-0"><i class="bi bi-calendar-x me-2"></i>No {{ hours() }}-hour slots left on this day. Try a shorter time, another court or another date.</div>
              } @else {
                <div class="row g-2">
                  @for (t of startTimes(); track t) {
                    <div class="col-4 col-sm-3 col-md-2">
                      <button type="button" class="btn w-100 time" [class.btn-primary]="start() === t" [class.btn-light]="start() !== t" [class.border]="start() !== t" (click)="start.set(t)" [attr.aria-pressed]="start() === t">{{ t | hour }}</button>
                    </div>
                  }
                </div>
              }
            </section>
          </div>

          <!-- Summary (desktop) -->
          <div class="col-lg-4 d-none d-lg-block">
            <div class="card sticky-summary">
              <div class="card-header">Booking summary</div>
              <div class="card-body">
                <dl class="row small mb-0">
                  <dt class="col-5 fw-normal text-secondary">Date</dt><dd class="col-7 text-end">{{ date() | niceDate }}</dd>
                  <dt class="col-5 fw-normal text-secondary">Court</dt><dd class="col-7 text-end">{{ court()?.name || '—' }}</dd>
                  <dt class="col-5 fw-normal text-secondary">Time</dt><dd class="col-7 text-end">{{ timeLabel() }}</dd>
                </dl>
                <hr>
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="fw-semibold">Total</span><span class="fs-4 fw-bold tnum">{{ total() | peso }}</span>
                </div>
                <ng-container *ngTemplateOutlet="cta" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Phone action bar -->
      <div class="action-bar d-lg-none">
        <div class="d-flex align-items-center gap-3">
          <div class="flex-grow-1 min-w-0">
            <div class="small text-secondary text-truncate">{{ start() !== null ? (court()?.name + ' · ' + timeLabel()) : 'Choose a start time' }}</div>
            <div class="fw-bold fs-5 tnum">{{ total() | peso }}</div>
          </div>
          <button class="btn btn-primary btn-lg text-nowrap" [disabled]="!canBook() || booking()" (click)="book()">
            @if (booking()) { <span class="spinner-border" aria-hidden="true"></span> }
            {{ auth.isLoggedIn() ? 'Reserve' : 'Log in to book' }}
          </button>
        </div>
        @if (blockedRole()) { <div class="small text-danger mt-2">Switch to a player account to book.</div> }
      </div>

      <ng-template #cta>
        @if (blockedRole()) { <div class="alert alert-warning small py-2">You're signed in as a {{ auth.role() }}. Use a player account to book.</div> }
        <button class="btn btn-primary btn-lg w-100" [disabled]="!canBook() || booking()" (click)="book()">
          @if (booking()) { <span class="spinner-border" aria-hidden="true"></span> }
          {{ auth.isLoggedIn() ? 'Reserve and pay' : 'Log in to book' }}
        </button>
        <p class="small text-secondary mt-2 mb-0"><i class="bi bi-info-circle me-1"></i>We hold your slot for 15 minutes while you pay with GCash.</p>
      </ng-template>
    }
  `,
  styles: [`
    .booking-page { padding-bottom: 7rem; }
    @media (min-width: 992px) { .booking-page { padding-bottom: 4rem; } }
    .dates { scrollbar-width: none; } .dates::-webkit-scrollbar { display: none; }
    .date { flex: none; width: 60px; padding: 0.5rem 0; border-radius: 0.6rem; border: 1px solid var(--pb-line); background: #fff; display: flex; flex-direction: column; align-items: center; line-height: 1.2; }
    .date small { font-size: 0.6875rem; font-weight: 600; color: var(--pb-muted); }
    .date b { font-size: 1.15rem; }
    .date.active { background: var(--pb-pine); border-color: var(--pb-pine); color: #fff; }
    .date.active small { color: var(--pb-lime); }
    .active-court { background: var(--pb-green-50); }
    .time { padding: 0.6rem 0; font-weight: 700; font-size: 0.9375rem; }
    .sticky-summary { position: sticky; top: 76px; }
  `],
})
export class FacilityDetailPage implements OnInit {
  id = input.required<string>();

  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  facility = signal<Facility | null>(null);
  avail = signal<Availability | null>(null);
  loading = signal(true);
  availLoading = signal(false);
  booking = signal(false);
  error = signal('');

  date = signal(isoDate(new Date()));
  courtId = signal<number | null>(null);
  hours = signal(1);
  start = signal<number | null>(null);

  dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return {
      iso: isoDate(d),
      dow: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      day: d.getDate(),
      mon: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });

  court = computed<CourtAvailability | undefined>(() => this.avail()?.courts.find((c) => c.id === this.courtId()));

  /** Start hours where every hour of the chosen duration is open */
  startTimes = computed(() => {
    const c = this.court();
    if (!c) return [];
    const open = new Set(c.slots.filter((s) => s.status === 'available').map((s) => s.hour));
    return c.slots.map((s) => s.hour).filter((h) => Array.from({ length: this.hours() }, (_, i) => h + i).every((x) => open.has(x)));
  });

  total = computed(() => (this.court() && this.start() !== null ? Number(this.court()!.hourly_rate) * this.hours() : 0));
  timeLabel = computed(() => (this.start() === null ? '—' : `${hourLabel(this.start()!)} – ${hourLabel(this.start()! + this.hours())}`));
  blockedRole = computed(() => this.auth.isLoggedIn() && this.auth.role() !== 'player');
  canBook = computed(() => this.start() !== null && !!this.court() && !this.blockedRole());

  ngOnInit() {
    this.api.facility(+this.id()).subscribe({
      next: (f) => { this.facility.set(f); this.loading.set(false); this.loadAvailability(); },
      error: (e) => { this.error.set(e.status === 404 ? '' : errMsg(e)); this.loading.set(false); },
    });
  }

  loadAvailability() {
    this.availLoading.set(true);
    this.api.availability(+this.id(), this.date()).subscribe({
      next: (a) => {
        this.avail.set(a);
        if (!a.courts.find((c) => c.id === this.courtId())) this.courtId.set(a.courts[0]?.id ?? null);
        this.start.set(null);
        this.availLoading.set(false);
      },
      error: (e) => { this.toast.error(errMsg(e)); this.availLoading.set(false); },
    });
  }

  pickDate(iso: string) { this.date.set(iso); this.loadAvailability(); }
  pickCourt(id: number) { this.courtId.set(id); this.start.set(null); }
  pickHours(h: number) {
    this.hours.set(h);
    if (this.start() !== null && !this.startTimes().includes(this.start()!)) this.start.set(null);
  }
  freeCount(c: CourtAvailability) { return c.slots.filter((s) => s.status === 'available').length; }
  surfaceLabel(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

  book() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (!this.canBook()) return;
    this.booking.set(true);
    this.api.createBooking({ court_id: this.court()!.id, date: this.date(), start_hour: this.start()!, hours: this.hours() }).subscribe({
      next: (b) => {
        this.booking.set(false);
        this.router.navigate(['/bookings', b.id, 'pay']);
      },
      error: (e) => {
        this.booking.set(false);
        this.toast.error(errMsg(e));
        if (e.status === 409) this.loadAvailability();
      },
    });
  }
}
