import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Booking } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe } from '../../shared/pipes';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'pb-admin-bookings',
  standalone: true,
  imports: [PesoPipe, HourPipe, NiceDatePipe, StatusBadge],
  template: `
    <h1 class="page-title">All bookings</h1>
    <p class="page-sub mb-3 small">The latest 300 bookings across every facility.</p>
    <div class="d-flex gap-2 overflow-auto pb-2 mb-3 chips">
      @for (t of tabs; track t.value) {
        <button type="button" class="btn btn-sm rounded-pill flex-none" [class.btn-dark]="status() === t.value" [class.btn-light]="status() !== t.value" [class.border]="status() !== t.value" (click)="status.set(t.value); load()">{{ t.label }}</button>
      }
    </div>
    @if (loading()) {
      <div class="d-grid gap-2">@for (i of [1,2,3]; track i) { <div class="skeleton" style="height: 72px"></div> }</div>
    } @else if (!list().length) {
      <div class="card"><div class="empty-state"><i class="bi bi-calendar2-x"></i><h3>No bookings</h3></div></div>
    } @else {
      <div class="card">
        <!-- Phones: list -->
        <div class="list-group list-group-flush d-md-none">
          @for (b of list(); track b.id) {
            <div class="list-group-item py-3">
              <div class="d-flex justify-content-between gap-2"><span class="fw-bold text-truncate">{{ b.facility_name }}</span><pb-status [status]="b.status" /></div>
              <div class="small">{{ b.player_name }} · {{ b.court_name }}</div>
              <div class="small text-secondary">{{ b.booking_date | niceDate: true }}, {{ b.start_hour | hour }} · {{ b.total_amount | peso }} · {{ b.reference_code }}</div>
            </div>
          }
        </div>
        <!-- Tablet and up: table -->
        <div class="table-responsive d-none d-md-block">
          <table class="table table-hover align-middle mb-0">
            <thead><tr><th>Reference</th><th>Player</th><th>Facility</th><th>When</th><th class="text-end">Amount</th><th>Status</th></tr></thead>
            <tbody>
              @for (b of list(); track b.id) {
                <tr>
                  <td class="tnum">{{ b.reference_code }}</td>
                  <td>{{ b.player_name }}</td>
                  <td>{{ b.facility_name }}<div class="small text-secondary">{{ b.court_name }}</div></td>
                  <td class="text-nowrap">{{ b.booking_date | niceDate: true }}<div class="small text-secondary">{{ b.start_hour | hour }} – {{ b.end_hour | hour }}</div></td>
                  <td class="text-end tnum">{{ b.total_amount | peso }}</td>
                  <td><pb-status [status]="b.status" /></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
  styles: [`.chips { scrollbar-width: none; } .chips::-webkit-scrollbar { display: none; } .flex-none { flex: none; }`],
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
