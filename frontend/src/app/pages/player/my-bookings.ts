import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errMsg } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Booking } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe, StatusPipe, isoDate } from '../../shared/pipes';

type Tab = 'upcoming' | 'action' | 'history';

@Component({
  selector: 'pb-my-bookings',
  standalone: true,
  imports: [RouterLink, PesoPipe, HourPipe, NiceDatePipe, StatusPipe],
  template: `
    <section class="page-hero">
      <div class="container">
        <span class="eyebrow" style="color: var(--lime)">Hi, {{ firstName() }}</span>
        <h1>My bookings</h1>
        <p>Track your reservations, payments and game schedule.</p>
      </div>
    </section>

    <div class="container wrap">
      <div class="top">
        <div class="chips">
          <button class="chip" [class.active]="tab() === 'upcoming'" (click)="tab.set('upcoming')">Upcoming <em>{{ upcoming().length }}</em></button>
          <button class="chip" [class.active]="tab() === 'action'" (click)="tab.set('action')">Needs action <em>{{ action().length }}</em></button>
          <button class="chip" [class.active]="tab() === 'history'" (click)="tab.set('history')">History <em>{{ history().length }}</em></button>
        </div>
        <a routerLink="/courts" class="btn btn-primary">+ New booking</a>
      </div>

      @if (loading()) {
        <div class="list">@for (i of [1,2,3]; track i) { <div class="skeleton" style="height: 120px"></div> }</div>
      } @else if (!shown().length) {
        <div class="empty card">
          <div class="empty-icon">🏓</div>
          <h3>{{ tab() === 'history' ? 'No past bookings yet' : tab() === 'action' ? 'Nothing needs your attention' : 'No upcoming games' }}</h3>
          <p>Find a court and reserve your next game in seconds.</p>
          <a routerLink="/courts" class="btn btn-primary" style="margin-top: 16px">Find a court</a>
        </div>
      } @else {
        <div class="list">
          @for (b of shown(); track b.id) {
            <article class="bk rise">
              <div class="date-tile">
                <small>{{ month(b.booking_date) }}</small>
                <b>{{ day(b.booking_date) }}</b>
                <small>{{ dow(b.booking_date) }}</small>
              </div>
              <div class="info">
                <div class="row1">
                  <h3>{{ b.facility_name }}</h3>
                  <span [class]="'badge ' + b.status">{{ b.status | status }}</span>
                </div>
                <p>{{ b.court_name }} · {{ b.start_hour | hour }} – {{ b.end_hour | hour }} · {{ b.end_hour - b.start_hour }}h</p>
                <p class="ref">Ref <b class="mono">{{ b.reference_code }}</b> · {{ b.total_amount | peso }}</p>
              </div>
              <div class="acts">
                @if (b.status === 'pending_payment' || b.status === 'rejected') {
                  <a [routerLink]="['/bookings', b.id, 'pay']" class="btn btn-lime btn-sm">Pay now</a>
                }
                @if (b.status === 'for_verification') { <span class="wait">Owner is verifying…</span> }
                @if (canCancel(b)) {
                  <button class="btn btn-danger btn-sm" (click)="confirmCancel.set(b)">Cancel</button>
                }
              </div>
            </article>
          }
        </div>
      }
    </div>

    @if (confirmCancel(); as c) {
      <div class="modal-backdrop" (click)="confirmCancel.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>Cancel booking?</h3><button class="icon-btn" (click)="confirmCancel.set(null)">✕</button></div>
          <div class="modal-body">
            <p>{{ c.facility_name }} · {{ c.court_name }}<br><b>{{ c.booking_date | niceDate }}, {{ c.start_hour | hour }} – {{ c.end_hour | hour }}</b></p>
            @if (c.status !== 'pending_payment') { <div class="alert warn" style="margin-top: 14px">If you already paid, contact the facility about refunds.</div> }
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px">
              <button class="btn btn-outline" (click)="confirmCancel.set(null)">Keep it</button>
              <button class="btn btn-danger" (click)="cancel(c)">Yes, cancel</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .wrap { padding-top: 24px; padding-bottom: 80px; }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
    .chip em { font-style: normal; margin-left: 6px; opacity: .6; }
    .list { display: grid; gap: 12px; }
    .bk { display: grid; grid-template-columns: auto 1fr; gap: 14px 16px; padding: 16px; background: #fff; border-radius: var(--radius-lg); border: 1px solid var(--line); transition: box-shadow .3s; }
    .bk:hover { box-shadow: var(--shadow); }
    .date-tile { width: 64px; padding: 8px 0; border-radius: 16px; background: var(--forest); color: #fff; display: flex; flex-direction: column; align-items: center; align-self: start; }
    .date-tile small { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--lime); }
    .date-tile b { font-family: var(--font-display); font-size: 24px; line-height: 1.1; }
    .row1 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .info h3 { font-size: 17px; }
    .info p { font-size: 14px; color: var(--ink-2); margin-top: 4px; }
    .ref { color: var(--muted) !important; }
    .acts { grid-column: 1 / -1; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .wait { font-size: 13px; color: var(--info); font-weight: 600; }
    @media (min-width: 720px) {
      .bk { grid-template-columns: auto 1fr auto; align-items: center; }
      .acts { grid-column: auto; justify-content: flex-end; }
    }
  `],
})
export class MyBookingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  tab = signal<Tab>('upcoming');
  confirmCancel = signal<Booking | null>(null);
  private today = isoDate(new Date());

  firstName = computed(() => this.auth.user()?.full_name.split(' ')[0] || 'player');
  action = computed(() => this.bookings().filter((b) => ['pending_payment', 'rejected'].includes(b.status) && b.booking_date >= this.today));
  upcoming = computed(() => this.bookings()
    .filter((b) => ['confirmed', 'for_verification', 'pending_payment'].includes(b.status) && b.booking_date >= this.today)
    .sort((a, b) => a.booking_date.localeCompare(b.booking_date) || a.start_hour - b.start_hour));
  history = computed(() => this.bookings().filter((b) => b.booking_date < this.today || ['cancelled', 'completed'].includes(b.status)));
  shown = computed(() => (this.tab() === 'upcoming' ? this.upcoming() : this.tab() === 'action' ? this.action() : this.history()));

  ngOnInit() { this.load(); }

  load() {
    this.api.myBookings().subscribe({
      next: (b) => {
        this.bookings.set(b);
        this.loading.set(false);
        if (this.action().length && !this.upcoming().some((x) => x.status === 'confirmed')) this.tab.set('action');
      },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  canCancel(b: Booking) {
    return ['pending_payment', 'for_verification', 'confirmed'].includes(b.status) && b.booking_date >= this.today;
  }

  cancel(b: Booking) {
    this.api.cancelBooking(b.id).subscribe({
      next: (r) => { this.toast.success(r.message); this.confirmCancel.set(null); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  private d(s: string) { return new Date(s.slice(0, 10) + 'T00:00:00'); }
  month(s: string) { return this.d(s).toLocaleDateString('en-US', { month: 'short' }); }
  day(s: string) { return this.d(s).getDate(); }
  dow(s: string) { return this.d(s).toLocaleDateString('en-US', { weekday: 'short' }); }
}
