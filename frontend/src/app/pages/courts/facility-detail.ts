import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errMsg } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Availability, CourtAvailability, Facility } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe, hourLabel, isoDate } from '../../shared/pipes';

@Component({
  selector: 'pb-facility-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, PesoPipe, HourPipe, NiceDatePipe],
  template: `
    @if (loading()) {
      <section class="page-hero"><div class="container"><div class="skeleton" style="height: 48px; max-width: 420px; opacity: .2"></div></div></section>
      <div class="center-state"><span class="spinner"></span></div>
    } @else if (!facility()) {
      <section class="page-hero"><div class="container"><h1>Facility not found</h1></div></section>
      <div class="empty"><p>{{ error() || 'This facility is not available.' }}</p><a routerLink="/courts" class="btn btn-primary" style="margin-top: 16px">Back to courts</a></div>
    } @else {
      <section class="page-hero">
        <div class="container">
          <a routerLink="/courts" class="back">← All courts</a>
          <h1>{{ facility()!.name }}</h1>
          <p>📍 {{ facility()!.address }}, {{ facility()!.city }} · Open {{ facility()!.open_hour | hour }} – {{ facility()!.close_hour | hour }}</p>
          @if (facility()!.description) { <p class="desc">{{ facility()!.description }}</p> }
        </div>
      </section>

      <div class="container layout">
        <div class="main">
          <!-- 1. Date -->
          <div class="card card-pad block">
            <div class="step-head"><span>1</span><h2>Choose a date</h2></div>
            <div class="dates">
              @for (d of dates; track d.iso) {
                <button class="date" [class.active]="date() === d.iso" (click)="pickDate(d.iso)">
                  <small>{{ d.dow }}</small><b>{{ d.day }}</b><small>{{ d.mon }}</small>
                </button>
              }
              <label class="date more" title="Pick another date">
                <small>Other</small><b>📅</b>
                <input type="date" [min]="dates[0].iso" (change)="pickDate($any($event.target).value)">
              </label>
            </div>
          </div>

          <!-- 2. Court -->
          <div class="card card-pad block">
            <div class="step-head"><span>2</span><h2>Choose a court</h2></div>
            @if (!avail()?.courts?.length && !availLoading()) { <p class="muted">No courts are open for booking yet.</p> }
            <div class="courts">
              @for (c of avail()?.courts || []; track c.id) {
                <button class="court-opt" [class.active]="courtId() === c.id" (click)="pickCourt(c.id)">
                  <div class="mini"></div>
                  <div class="info">
                    <b>{{ c.name }}</b>
                    <span class="cap">{{ c.surface }}</span>
                  </div>
                  <div class="right">
                    <b>{{ c.hourly_rate | peso }}</b><small>per hour</small>
                    <em>{{ freeCount(c) }} open</em>
                  </div>
                </button>
              }
            </div>
          </div>

          <!-- 3. Time -->
          <div class="card card-pad block">
            <div class="step-head"><span>3</span><h2>Pick your time</h2></div>
            <p class="muted small">Tap a start time, then tap the next slots to add more hours.</p>
            <div class="legend"><span class="l av"></span>Open <span class="l sel"></span>Selected <span class="l bk"></span>Booked</div>
            @if (availLoading()) {
              <div class="slots">@for (i of [1,2,3,4,5,6,7,8]; track i) { <div class="skeleton" style="height: 52px"></div> }</div>
            } @else if (court()) {
              <div class="slots">
                @for (s of court()!.slots; track s.hour) {
                  <button class="slot" [class]="'slot ' + s.status" [class.sel]="isSelected(s.hour)"
                          [disabled]="s.status !== 'available'" (click)="toggle(s.hour)">
                    <b>{{ s.hour | hour }}</b>
                    <small>{{ s.status === 'available' ? (isSelected(s.hour) ? 'Selected' : 'Open') : s.status === 'past' ? 'Passed' : s.status === 'blocked' ? 'Closed' : 'Booked' }}</small>
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Summary -->
        <aside class="summary">
          <div class="card sum-card">
            <h3>Your booking</h3>
            <dl>
              <div><dt>Facility</dt><dd>{{ facility()!.name }}</dd></div>
              <div><dt>Date</dt><dd>{{ date() | niceDate }}</dd></div>
              <div><dt>Court</dt><dd>{{ court()?.name || '—' }}</dd></div>
              <div><dt>Time</dt><dd>{{ timeLabel() }}</dd></div>
              <div><dt>Duration</dt><dd>{{ hours() ? hours() + (hours() === 1 ? ' hour' : ' hours') : '—' }}</dd></div>
            </dl>
            <div class="total"><span>Total</span><b>{{ total() | peso }}</b></div>
            @if (auth.isLoggedIn() && auth.role() !== 'player') {
              <p class="note">Log in with a player account to book. You are signed in as {{ auth.role() }}.</p>
            }
            <button class="btn btn-primary btn-lg btn-block" [disabled]="!hours() || booking() || (auth.isLoggedIn() && auth.role() !== 'player')" (click)="book()">
              @if (booking()) { <span class="spinner"></span> }
              {{ auth.isLoggedIn() ? 'Reserve & pay with GCash' : 'Log in to reserve' }}
            </button>
            <p class="fine">Your slot is held for 15 minutes while you pay.</p>
          </div>
        </aside>
      </div>

      <!-- Mobile bottom bar -->
      @if (hours()) {
        <div class="mobile-bar">
          <div><small>{{ court()?.name }} · {{ timeLabel() }}</small><b>{{ total() | peso }}</b></div>
          <button class="btn btn-lime" [disabled]="booking() || (auth.isLoggedIn() && auth.role() !== 'player')" (click)="book()">
            {{ auth.isLoggedIn() ? 'Reserve' : 'Log in to reserve' }}
          </button>
        </div>
      }
    }
  `,
  styles: [`
    .back { display: inline-block; color: var(--lime); font-weight: 700; font-size: 14px; margin-bottom: 14px; }
    .desc { font-size: 14.5px; }
    .layout { display: grid; gap: 20px; padding-top: 24px; padding-bottom: 120px; }
    .block { margin-bottom: 16px; }
    .step-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .step-head span { width: 30px; height: 30px; border-radius: 50%; background: var(--forest); color: var(--lime); display: grid; place-items: center; font-weight: 800; font-size: 14px; }
    .step-head h2 { font-size: 18px; }
    .small { font-size: 13.5px; }

    .dates { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 8px; scrollbar-width: thin; }
    .date { position: relative; flex: none; width: 66px; padding: 10px 0; border-radius: 16px; border: 1.5px solid var(--line); background: #fff; display: flex; flex-direction: column; align-items: center; transition: all .2s; }
    .date small { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
    .date b { font-family: var(--font-display); font-size: 20px; margin: 2px 0; }
    .date:hover { border-color: var(--court-2); }
    .date.active { background: var(--forest); border-color: var(--forest); color: #fff; box-shadow: 0 10px 20px -10px rgba(11,61,42,.7); }
    .date.active small { color: var(--lime); }
    .date.more { cursor: pointer; justify-content: center; }
    .date.more input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

    .courts { display: grid; gap: 10px; }
    @media (min-width: 640px) { .courts { grid-template-columns: 1fr 1fr; } }
    .court-opt { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px; border: 1.5px solid var(--line); background: #fff; text-align: left; transition: all .2s; }
    .court-opt:hover { border-color: var(--court-2); }
    .court-opt.active { border-color: var(--court); box-shadow: 0 0 0 4px rgba(34,197,94,.14); }
    .mini { width: 40px; height: 52px; flex: none; border-radius: 8px; background: linear-gradient(var(--lime), var(--lime)) 0 50% / 100% 3px no-repeat, linear-gradient(rgba(255,255,255,.6), rgba(255,255,255,.6)) 50% 0 / 2px 100% no-repeat, var(--court); border: 2px solid var(--forest); }
    .info { flex: 1; }
    .info b { display: block; }
    .info span { font-size: 12.5px; color: var(--muted); }
    .right { text-align: right; display: flex; flex-direction: column; }
    .right small { font-size: 11px; color: var(--muted); }
    .right em { font-style: normal; font-size: 11.5px; font-weight: 800; color: var(--court); }
    .cap { text-transform: capitalize; }

    .legend { display: flex; align-items: center; gap: 6px 14px; flex-wrap: wrap; font-size: 12.5px; color: var(--muted); margin: 12px 0 14px; }
    .l { display: inline-block; width: 14px; height: 14px; border-radius: 4px; margin-right: -8px; vertical-align: middle; }
    .l.av { background: #fff; border: 1.5px solid var(--line); }
    .l.sel { background: var(--lime); }
    .l.bk { background: var(--mint-2); }
    .slots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    @media (min-width: 560px) { .slots { grid-template-columns: repeat(4, 1fr); } }
    @media (min-width: 900px) { .slots { grid-template-columns: repeat(5, 1fr); } }
    .slot { padding: 10px 6px; border-radius: 14px; border: 1.5px solid var(--line); background: #fff; display: flex; flex-direction: column; align-items: center; transition: transform .15s, background .2s, border-color .2s; }
    .slot b { font-size: 14px; }
    .slot small { font-size: 11px; color: var(--muted); font-weight: 600; }
    .slot.available:hover { border-color: var(--court-2); transform: translateY(-2px); }
    .slot.sel { background: var(--lime); border-color: var(--lime); box-shadow: 0 8px 18px -10px rgba(132, 204, 22, .9); }
    .slot.sel small { color: var(--forest); }
    .slot.booked, .slot.blocked { background: var(--mint-2); border-color: transparent; cursor: not-allowed; }
    .slot.booked b, .slot.blocked b { color: var(--muted); text-decoration: line-through; }
    .slot.past { opacity: .4; cursor: not-allowed; }

    .summary { display: none; }
    .sum-card { padding: 22px; position: sticky; top: calc(var(--nav-h) + 16px); }
    .sum-card h3 { font-size: 18px; margin-bottom: 14px; }
    dl { margin: 0; display: grid; gap: 10px; }
    dl div { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 700; text-align: right; }
    .total { display: flex; justify-content: space-between; align-items: center; margin: 16px 0; padding-top: 16px; border-top: 1px dashed var(--line); }
    .total b { font-family: var(--font-display); font-size: 26px; color: var(--court); }
    .note { font-size: 13px; color: var(--warn); margin-bottom: 12px; }
    .fine { font-size: 12px; color: var(--muted); text-align: center; margin-top: 10px; }

    .mobile-bar { position: fixed; z-index: 90; left: 12px; right: 12px; bottom: max(12px, env(safe-area-inset-bottom)); display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 12px 12px 18px; border-radius: 20px; background: var(--night); color: #fff; box-shadow: var(--shadow-lg); animation: pop .3s var(--ease); }
    .mobile-bar small { display: block; font-size: 12px; color: rgba(255,255,255,.6); }
    .mobile-bar b { font-family: var(--font-display); font-size: 20px; color: var(--lime); }

    @media (min-width: 1000px) {
      .layout { grid-template-columns: 1fr 360px; align-items: start; padding-bottom: 80px; }
      .summary { display: block; }
      .mobile-bar { display: none; }
    }
  `],
})
export class FacilityDetailPage implements OnInit {
  /** Route param :id (bound with withComponentInputBinding) */
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
  start = signal<number | null>(null);
  hours = signal(0);

  dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return {
      iso: isoDate(d),
      dow: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      day: d.getDate(),
      mon: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });

  court = computed<CourtAvailability | undefined>(() => this.avail()?.courts.find((c) => c.id === this.courtId()));
  total = computed(() => (this.court() ? Number(this.court()!.hourly_rate) * this.hours() : 0));
  timeLabel = computed(() => (this.start() == null || !this.hours() ? '—' : `${hourLabel(this.start()!)} – ${hourLabel(this.start()! + this.hours())}`));

  ngOnInit() {
    this.api.facility(+this.id()).subscribe({
      next: (f) => { this.facility.set(f); this.loading.set(false); this.loadAvailability(); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  loadAvailability() {
    this.availLoading.set(true);
    this.api.availability(+this.id(), this.date()).subscribe({
      next: (a) => {
        this.avail.set(a);
        if (!a.courts.find((c) => c.id === this.courtId())) this.courtId.set(a.courts[0]?.id ?? null);
        this.clearSelection();
        this.availLoading.set(false);
      },
      error: (e) => { this.toast.error(errMsg(e)); this.availLoading.set(false); },
    });
  }

  pickDate(iso: string) { if (!iso) return; this.date.set(iso); this.loadAvailability(); }
  pickCourt(id: number) { this.courtId.set(id); this.clearSelection(); }
  clearSelection() { this.start.set(null); this.hours.set(0); }
  freeCount(c: CourtAvailability) { return c.slots.filter((s) => s.status === 'available').length; }

  isSelected(h: number) {
    const s = this.start();
    return s != null && h >= s && h < s + this.hours();
  }

  private isFree(h: number) { return this.court()?.slots.find((s) => s.hour === h)?.status === 'available'; }

  /** Tap to start, tap neighbours to extend, tap an edge to shrink */
  toggle(h: number) {
    const s = this.start();
    const n = this.hours();
    if (s == null || n === 0) { this.start.set(h); this.hours.set(1); return; }
    const end = s + n; // exclusive
    if (h === end && this.isFree(h) && n < 6) { this.hours.set(n + 1); return; }
    if (h === s - 1 && this.isFree(h) && n < 6) { this.start.set(h); this.hours.set(n + 1); return; }
    if (n > 1 && h === end - 1) { this.hours.set(n - 1); return; }
    if (n > 1 && h === s) { this.start.set(s + 1); this.hours.set(n - 1); return; }
    if (n === 1 && h === s) { this.clearSelection(); return; }
    if ((h === end || h === s - 1) && n >= 6) { this.toast.show('You can book up to 6 hours at a time.'); return; }
    this.start.set(h); this.hours.set(1);
  }

  book() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (!this.court() || this.start() == null || !this.hours()) return;
    this.booking.set(true);
    this.api.createBooking({ court_id: this.court()!.id, date: this.date(), start_hour: this.start()!, hours: this.hours() }).subscribe({
      next: (b) => {
        this.booking.set(false);
        this.toast.success(`Slot held! Reference ${b.reference_code}`);
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
