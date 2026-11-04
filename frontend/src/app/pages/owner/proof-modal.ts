import { Component, inject, input, output } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { Booking } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe, StatusPipe } from '../../shared/pipes';

/** Shows a booking's GCash receipt so the owner can confirm or reject it */
@Component({
  selector: 'pb-proof-modal',
  standalone: true,
  imports: [PesoPipe, HourPipe, NiceDatePipe, StatusPipe],
  template: `
    <div class="modal-backdrop" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h3>Booking {{ booking().reference_code }}</h3>
          <button class="icon-btn" (click)="closed.emit()" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <div class="grid">
            <div><small>Player</small><b>{{ booking().player_name }}</b><span>{{ booking().player_phone || booking().player_email }}</span></div>
            <div><small>Status</small><span [class]="'badge ' + booking().status">{{ booking().status | status }}</span></div>
            <div><small>Court</small><b>{{ booking().court_name }}</b></div>
            <div><small>Schedule</small><b>{{ booking().booking_date | niceDate }}</b><span>{{ booking().start_hour | hour }} – {{ booking().end_hour | hour }}</span></div>
            <div><small>Amount due</small><b class="amt">{{ booking().total_amount | peso }}</b></div>
            <div><small>GCash ref no.</small><b class="mono">{{ booking().gcash_reference || '—' }}</b></div>
          </div>
          @if (booking().payment_proof) {
            <a [href]="api.asset(booking().payment_proof)" target="_blank" rel="noopener" class="proof">
              <img [src]="api.asset(booking().payment_proof)" alt="GCash receipt" />
              <span>Open full size ↗</span>
            </a>
          } @else {
            <div class="alert info">No receipt uploaded yet.</div>
          }
          @if (booking().status === 'for_verification' || booking().status === 'pending_payment') {
            <div class="acts">
              @if (booking().status === 'for_verification') {
                <button class="btn btn-danger" (click)="action.emit('rejected')">Reject payment</button>
              }
              <button class="btn btn-primary" (click)="action.emit('confirmed')">Confirm booking</button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
    .grid small { display: block; font-size: 11.5px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    .grid b { display: block; }
    .grid span:not(.badge) { font-size: 13px; color: var(--muted); }
    .amt { font-family: var(--font-display); color: var(--court); font-size: 20px; }
    .proof { position: relative; display: block; border-radius: 16px; overflow: hidden; border: 1px solid var(--line); background: var(--mint); }
    .proof img { width: 100%; max-height: 420px; object-fit: contain; }
    .proof span { position: absolute; right: 10px; bottom: 10px; padding: 4px 10px; border-radius: 999px; background: rgba(4,20,13,.7); color: #fff; font-size: 12px; font-weight: 700; }
    .acts { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; margin-top: 18px; }
  `],
})
export class ProofModal {
  api = inject(ApiService);
  booking = input.required<Booking>();
  closed = output<void>();
  action = output<'confirmed' | 'rejected'>();
}
