import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Booking } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe, StatusPipe } from '../../shared/pipes';

@Component({
  selector: 'pb-admin-bookings',
  standalone: true,
  imports: [PesoPipe, HourPipe, NiceDatePipe, StatusPipe],
  styleUrl: '../dash/dash.scss',
  template: `
    <div class="head"><div><h1>All bookings</h1><p>Latest 300 reservations across every facility.</p></div></div>
    <div class="panel">
      <div class="panel-head">
        <div class="chips">
          @for (t of tabs; track t.value) {
            <button class="chip" [class.active]="status() === t.value" (click)="status.set(t.value); load()">{{ t.label }}</button>
          }
        </div>
      </div>
      @if (loading()) {
        <div class="center-state"><span class="spinner"></span></div>
      } @else if (!list().length) {
        <div class="empty"><h3>No bookings</h3></div>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Reference</th><th>Player</th><th>Facility</th><th>Schedule</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              @for (b of list(); track b.id) {
                <tr>
                  <td data-label="Reference"><b class="mono">{{ b.reference_code }}</b></td>
                  <td data-label="Player">{{ b.player_name }}</td>
                  <td data-label="Facility" class="who"><b>{{ b.facility_name }}</b><small>{{ b.court_name }}</small></td>
                  <td data-label="Schedule">{{ b.booking_date | niceDate: true }} · {{ b.start_hour | hour }}–{{ b.end_hour | hour }}</td>
                  <td data-label="Amount">{{ b.total_amount | peso }}</td>
                  <td data-label="Status"><span [class]="'badge ' + b.status">{{ b.status | status }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class AdminBookingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  list = signal<Booking[]>([]);
  loading = signal(true);
  status = signal('');
  tabs = [
    { value: '', label: 'All' }, { value: 'for_verification', label: 'Verifying' }, { value: 'pending_payment', label: 'Awaiting payment' },
    { value: 'confirmed', label: 'Confirmed' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.adminBookings(this.status()).subscribe({
      next: (b) => { this.list.set(b); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }
}
