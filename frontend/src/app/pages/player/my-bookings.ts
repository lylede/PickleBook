import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errMsg } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import { Booking } from '../../core/models';
import { HourPipe, PesoPipe, isoDate } from '../../shared/pipes';
import { StatusBadge } from '../../shared/status-badge';

type Tab = 'upcoming' | 'past';

@Component({
  selector: 'pb-my-bookings',
  standalone: true,
  imports: [RouterLink, PesoPipe, HourPipe, StatusBadge],
  template: `
    <div class="container page" style="max-width: 860px">
      <div class="d-flex align-items-center justify-content-between gap-2 mb-3">
        <h1 class="page-title mb-0">My bookings</h1>
        <a routerLink="/courts" class="btn btn-primary btn-sm"><i class="bi bi-plus-lg me-1"></i>Book</a>
      </div>

      @if (needsAction().length) {
        <div class="alert alert-warning d-flex gap-2 align-items-start">
          <i class="bi bi-exclamation-triangle mt-1"></i>
          <div>{{ needsAction().length === 1 ? 'One booking needs' : needsAction().length + ' bookings need' }} payment. Pay soon so you don't lose the slot.</div>
        </div>
      }

      <ul class="nav nav-pills mb-3">
        <li class="nav-item"><button class="nav-link" [class.active]="tab() === 'upcoming'" (click)="tab.set('upcoming')">Upcoming <span class="ms-1 opacity-75">{{ upcoming().length }}</span></button></li>
        <li class="nav-item"><button class="nav-link" [class.active]="tab() === 'past'" (click)="tab.set('past')">Past and cancelled</button></li>
      </ul>

      @if (loading()) {
        <div class="d-grid gap-2">@for (i of [1,2,3]; track i) { <div class="skeleton" style="height: 110px"></div> }</div>
      } @else if (!shown().length) {
        <div class="card"><div class="empty-state">
          <i class="bi bi-calendar2-x"></i>
          <h3>{{ tab() === 'upcoming' ? 'No upcoming games' : 'Nothing here yet' }}</h3>
          <p>Find an open court and reserve your next game.</p>
          <a routerLink="/courts" class="btn btn-primary">Find a court</a>
        </div></div>
      } @else {
        <div class="d-grid gap-2">
          @for (b of shown(); track b.id) {
            <article class="card">
              <div class="card-body d-flex gap-3">
                <div class="date-tile text-center">
                  <div class="small fw-semibold">{{ month(b.booking_date) }}</div>
                  <div class="fs-4 fw-bold lh-1">{{ day(b.booking_date) }}</div>
                  <div class="small">{{ dow(b.booking_date) }}</div>
                </div>
                <div class="flex-grow-1 min-w-0">
                  <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <h2 class="h6 mb-0 text-truncate">{{ b.facility_name }}</h2>
                    <pb-status [status]="b.status" />
                  </div>
                  <div class="small">{{ b.court_name }} · {{ b.start_hour | hour }} – {{ b.end_hour | hour }}</div>
                  <div class="small text-secondary">Ref {{ b.reference_code }} · {{ b.total_amount | peso }}</div>
                  <div class="d-flex flex-wrap gap-2 mt-2">
                    @if ((b.status === 'pending_payment' || b.status === 'rejected') && !isPast(b)) {
                      <a [routerLink]="['/bookings', b.id, 'pay']" class="btn btn-primary btn-sm"><i class="bi bi-qr-code-scan me-1"></i>Pay now</a>
                    }
                    @if (b.status !== 'pending_payment' && b.status !== 'rejected') {
                      <a [routerLink]="['/bookings', b.id, 'pay']" class="btn btn-light border btn-sm">Details</a>
                    }
                    @if (canCancel(b)) {
                      <button class="btn btn-light border btn-sm text-danger" (click)="cancel(b)">Cancel</button>
                    }
                  </div>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .date-tile { width: 3.5rem; flex: none; padding: 0.4rem 0; border-radius: 0.6rem; background: var(--pb-green-50); color: var(--pb-pine); align-self: flex-start; }
  `],
})
export class MyBookingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  tab = signal<Tab>('upcoming');
  private today = isoDate(new Date());

  isPast = (b: Booking) => b.booking_date.slice(0, 10) < this.today;
  upcoming = computed(() => this.bookings()
    .filter((b) => !this.isPast(b) && ['pending_payment', 'for_verification', 'confirmed', 'rejected'].includes(b.status))
    .sort((a, b) => a.booking_date.localeCompare(b.booking_date) || a.start_hour - b.start_hour));
  past = computed(() => this.bookings().filter((b) => !this.upcoming().includes(b)));
  needsAction = computed(() => this.upcoming().filter((b) => b.status === 'pending_payment' || b.status === 'rejected'));
  shown = computed(() => (this.tab() === 'upcoming' ? this.upcoming() : this.past()));

  ngOnInit() { this.load(); }

  load() {
    this.api.myBookings().subscribe({
      next: (b) => { this.bookings.set(b); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  canCancel(b: Booking) { return !this.isPast(b) && ['pending_payment', 'for_verification', 'confirmed'].includes(b.status); }

  async cancel(b: Booking) {
    const ok = await this.confirm.ask({
      title: 'Cancel this booking?',
      message: b.status === 'pending_payment'
        ? 'The slot will be released for other players.'
        : 'The slot will be released. If you already paid, contact the facility about a refund.',
      confirmText: 'Cancel booking', cancelText: 'Keep booking', danger: true,
    });
    if (!ok) return;
    this.api.cancelBooking(b.id).subscribe({
      next: () => { this.toast.success('Booking cancelled'); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  private d(s: string) { return new Date(s.slice(0, 10) + 'T00:00:00'); }
  month(s: string) { return this.d(s).toLocaleDateString('en-US', { month: 'short' }); }
  day(s: string) { return this.d(s).getDate(); }
  dow(s: string) { return this.d(s).toLocaleDateString('en-US', { weekday: 'short' }); }
}
