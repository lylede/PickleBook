import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService, errMsg } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import { Booking, Facility } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe } from '../../shared/pipes';
import { StatusBadge } from '../../shared/status-badge';
import { ProofModal } from './proof-modal';

@Component({
  selector: 'pb-owner-bookings',
  standalone: true,
  imports: [FormsModule, PesoPipe, HourPipe, NiceDatePipe, StatusBadge, ProofModal],
  template: `
    <h1 class="page-title mb-3">Bookings</h1>

    <div class="d-flex gap-2 overflow-auto pb-2 mb-2 chips" role="group" aria-label="Filter by status">
      @for (t of tabs; track t.value) {
        <button type="button" class="btn btn-sm rounded-pill flex-none" [class.btn-dark]="status === t.value" [class.btn-light]="status !== t.value" [class.border]="status !== t.value" (click)="status = t.value; load()">{{ t.label }}</button>
      }
    </div>
    <div class="row g-2 mb-3">
      <div class="col-6 col-md-3">
        <label class="visually-hidden" for="f-date">Date</label>
        <input id="f-date" class="form-control" type="date" [(ngModel)]="date" (ngModelChange)="load()">
      </div>
      @if (facilities().length > 1) {
        <div class="col-6 col-md-3">
          <label class="visually-hidden" for="f-fac">Facility</label>
          <select id="f-fac" class="form-select" [(ngModel)]="facilityId" (ngModelChange)="load()">
            <option value="">All facilities</option>
            @for (f of facilities(); track f.id) { <option [value]="f.id">{{ f.name }}</option> }
          </select>
        </div>
      }
      @if (date || facilityId) { <div class="col-auto"><button class="btn btn-link" (click)="date = ''; facilityId = ''; load()">Clear</button></div> }
    </div>

    @if (loading()) {
      <div class="d-grid gap-2">@for (i of [1,2,3]; track i) { <div class="skeleton" style="height: 84px"></div> }</div>
    } @else if (!bookings().length) {
      <div class="card"><div class="empty-state"><i class="bi bi-calendar2-x"></i><h3>No bookings here</h3><p class="mb-0">Try another filter.</p></div></div>
    } @else {
      <div class="card">
        <div class="list-group list-group-flush">
          @for (b of bookings(); track b.id) {
            <div class="list-group-item py-3">
              <div class="d-flex flex-wrap align-items-start gap-2 gap-md-3">
                <div class="flex-grow-1 min-w-0">
                  <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <span class="fw-bold">{{ b.player_name }}</span>
                    <pb-status [status]="b.status" />
                  </div>
                  <div class="small">{{ b.court_name }}@if (facilities().length > 1) { · {{ b.facility_name }} } · {{ b.booking_date | niceDate: true }}, {{ b.start_hour | hour }} – {{ b.end_hour | hour }}</div>
                  <div class="small text-secondary">Ref {{ b.reference_code }} · {{ b.total_amount | peso }}@if (b.player_phone) { · {{ b.player_phone }} }</div>
                </div>
                <div class="d-flex flex-wrap gap-2">
                  @if (b.status === 'for_verification') { <button class="btn btn-primary btn-sm" (click)="selected.set(b)">Review payment</button> }
                  @if (b.status === 'pending_payment') { <button class="btn btn-light border btn-sm" (click)="selected.set(b)">Mark as paid</button> }
                  @if (b.status === 'confirmed') { <button class="btn btn-light border btn-sm" (click)="setStatus(b, 'completed')">Mark played</button> }
                  @if (b.payment_proof && b.status !== 'for_verification') { <button class="btn btn-light border btn-sm" (click)="selected.set(b)" aria-label="View receipt"><i class="bi bi-receipt"></i></button> }
                  @if (b.status === 'pending_payment' || b.status === 'for_verification' || b.status === 'confirmed') {
                    <button class="btn btn-light border btn-sm text-danger" (click)="cancel(b)" aria-label="Cancel booking"><i class="bi bi-x-lg"></i></button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    }

    @if (selected(); as s) {
      <pb-proof-modal [booking]="s" (closed)="selected.set(null)" (action)="setStatus(s, $event)" />
    }
  `,
  styles: [`.chips { scrollbar-width: none; } .chips::-webkit-scrollbar { display: none; } .flex-none { flex: none; }`],
})
export class OwnerBookingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  bookings = signal<Booking[]>([]);
  facilities = signal<Facility[]>([]);
  loading = signal(true);
  selected = signal<Booking | null>(null);
  status = inject(ActivatedRoute).snapshot.queryParamMap.get('status') || '';
  date = '';
  facilityId: string | number = '';
  tabs = [
    { value: '', label: 'All' },
    { value: 'for_verification', label: 'To verify' },
    { value: 'pending_payment', label: 'Awaiting payment' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  ngOnInit() {
    this.api.ownerFacilities().subscribe({ next: (f) => this.facilities.set(f), error: () => {} });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.ownerBookings({ status: this.status, date: this.date, facility_id: this.facilityId }).subscribe({
      next: (b) => { this.bookings.set(b); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  async cancel(b: Booking) {
    const ok = await this.confirm.ask({ title: 'Cancel this booking?', message: `${b.player_name}'s slot will be released. Let them know if a refund applies.`, confirmText: 'Cancel booking', cancelText: 'Keep', danger: true });
    if (ok) this.setStatus(b, 'cancelled');
  }

  setStatus(b: Booking, status: string) {
    const msg: Record<string, string> = { confirmed: 'Booking confirmed', rejected: 'Payment rejected', cancelled: 'Booking cancelled', completed: 'Marked as played' };
    this.api.setBookingStatus(b.id, status).subscribe({
      next: () => { this.toast.success(msg[status] || 'Updated'); this.selected.set(null); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
