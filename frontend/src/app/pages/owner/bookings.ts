import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Booking, Facility } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe, StatusPipe } from '../../shared/pipes';
import { ProofModal } from './proof-modal';

@Component({
  selector: 'pb-owner-bookings',
  standalone: true,
  imports: [FormsModule, PesoPipe, HourPipe, NiceDatePipe, StatusPipe, ProofModal],
  styleUrl: '../dash/dash.scss',
  template: `
    <div class="head">
      <div><h1>Bookings</h1><p>Verify GCash payments and manage reservations.</p></div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div class="filters">
          <select class="select" [(ngModel)]="status" (ngModelChange)="load()" aria-label="Status">
            <option value="">All statuses</option>
            <option value="for_verification">Verifying payment</option>
            <option value="pending_payment">Awaiting payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input class="input" type="date" [(ngModel)]="date" (ngModelChange)="load()" aria-label="Date">
          @if (facilities().length > 1) {
            <select class="select" [(ngModel)]="facilityId" (ngModelChange)="load()" aria-label="Facility">
              <option value="">All facilities</option>
              @for (f of facilities(); track f.id) { <option [value]="f.id">{{ f.name }}</option> }
            </select>
          }
          @if (status || date || facilityId) { <button class="btn btn-outline btn-sm" (click)="reset()">Clear</button> }
        </div>
        <span class="muted" style="font-size: 13px">{{ bookings().length }} results</span>
      </div>

      @if (loading()) {
        <div class="center-state"><span class="spinner"></span></div>
      } @else if (!bookings().length) {
        <div class="empty"><div class="empty-icon">▦</div><h3>No bookings found</h3><p>Try a different filter.</p></div>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Reference</th><th>Player</th><th>Court</th><th>Schedule</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              @for (b of bookings(); track b.id) {
                <tr>
                  <td data-label="Reference"><b class="mono">{{ b.reference_code }}</b></td>
                  <td data-label="Player" class="who"><b>{{ b.player_name }}</b><small>{{ b.player_phone || b.player_email }}</small></td>
                  <td data-label="Court">{{ b.court_name }}@if (facilities().length > 1) {<br><small class="muted">{{ b.facility_name }}</small>}</td>
                  <td data-label="Schedule">{{ b.booking_date | niceDate: true }}<br><small class="muted">{{ b.start_hour | hour }} – {{ b.end_hour | hour }}</small></td>
                  <td data-label="Amount"><b>{{ b.total_amount | peso }}</b></td>
                  <td data-label="Status"><span [class]="'badge ' + b.status">{{ b.status | status }}</span></td>
                  <td class="actions">
                    @if (b.status === 'for_verification') { <button class="btn btn-primary btn-sm" (click)="selected.set(b)">Review payment</button> }
                    @if (b.status === 'pending_payment') { <button class="btn btn-outline btn-sm" (click)="setStatus(b, 'confirmed')">Mark paid (cash)</button> }
                    @if (b.status === 'confirmed') { <button class="btn btn-outline btn-sm" (click)="setStatus(b, 'completed')">Complete</button> }
                    @if (['pending_payment', 'for_verification', 'confirmed'].includes(b.status)) {
                      <button class="btn btn-danger btn-sm" (click)="setStatus(b, 'cancelled')">Cancel</button>
                    }
                    @if (b.payment_proof && b.status !== 'for_verification') { <button class="btn btn-outline btn-sm" (click)="selected.set(b)">Receipt</button> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (selected(); as s) {
      <pb-proof-modal [booking]="s" (closed)="selected.set(null)" (action)="setStatus(s, $event)" />
    }
  `,
})
export class OwnerBookingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  bookings = signal<Booking[]>([]);
  facilities = signal<Facility[]>([]);
  loading = signal(true);
  selected = signal<Booking | null>(null);
  status = '';
  date = '';
  facilityId: string | number = '';

  ngOnInit() {
    this.api.ownerFacilities().subscribe({ next: (f) => this.facilities.set(f), error: () => {} });
    this.load();
  }

  reset() { this.status = ''; this.date = ''; this.facilityId = ''; this.load(); }

  load() {
    this.loading.set(true);
    this.api.ownerBookings({ status: this.status, date: this.date, facility_id: this.facilityId }).subscribe({
      next: (b) => { this.bookings.set(b); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  setStatus(b: Booking, status: string) {
    if (status === 'cancelled' && !confirm(`Cancel booking ${b.reference_code}?`)) return;
    this.api.setBookingStatus(b.id, status).subscribe({
      next: (r) => { this.toast.success(r.message); this.selected.set(null); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
