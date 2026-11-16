import { Component, HostListener, inject, input, output } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { Booking } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe } from '../../shared/pipes';
import { StatusBadge } from '../../shared/status-badge';

/** Booking details with the player's GCash receipt, so the owner can confirm or reject it. */
@Component({
  selector: 'pb-proof-modal',
  standalone: true,
  imports: [PesoPipe, HourPipe, NiceDatePipe, StatusBadge],
  template: `
    <div class="modal-backdrop show"></div>
    <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="proofTitle" (click)="closed.emit()">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down" (click)="$event.stopPropagation()">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title h6" id="proofTitle">Booking {{ booking().reference_code }}</h2>
            <button type="button" class="btn-close" aria-label="Close" (click)="closed.emit()"></button>
          </div>
          <div class="modal-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <div class="fw-bold">{{ booking().player_name }}</div>
                <div class="small text-secondary">{{ booking().player_phone || booking().player_email }}</div>
              </div>
              <pb-status [status]="booking().status" />
            </div>
            <div class="row g-2 small mb-3">
              <div class="col-6"><div class="text-secondary">Court</div><div class="fw-semibold">{{ booking().court_name }}</div></div>
              <div class="col-6"><div class="text-secondary">When</div><div class="fw-semibold">{{ booking().booking_date | niceDate }}<br>{{ booking().start_hour | hour }} – {{ booking().end_hour | hour }}</div></div>
              <div class="col-6"><div class="text-secondary">Amount due</div><div class="fw-bold fs-5 tnum">{{ booking().total_amount | peso }}</div></div>
              <div class="col-6"><div class="text-secondary">GCash ref no.</div><div class="fw-semibold tnum text-break">{{ booking().gcash_reference || '—' }}</div></div>
            </div>
            @if (booking().payment_proof) {
              <a [href]="api.asset(booking().payment_proof)" target="_blank" rel="noopener" class="d-block border rounded overflow-hidden bg-body-tertiary">
                <img [src]="api.asset(booking().payment_proof)" alt="GCash receipt" class="d-block mx-auto" style="max-height: 60vh; max-width: 100%">
              </a>
              <p class="small text-secondary mt-2 mb-0">Check that the amount, account name and reference number match your GCash history before confirming.</p>
            } @else {
              <div class="alert alert-light border small mb-0">No receipt uploaded yet. Confirm only if the player paid in person.</div>
            }
          </div>
          @if (booking().status === 'for_verification' || booking().status === 'pending_payment') {
            <div class="modal-footer">
              @if (booking().status === 'for_verification') {
                <button type="button" class="btn btn-light border text-danger" (click)="action.emit('rejected')">Reject payment</button>
              }
              <button type="button" class="btn btn-primary" (click)="action.emit('confirmed')"><i class="bi bi-check-lg me-1"></i>{{ booking().status === 'pending_payment' ? 'Mark as paid' : 'Confirm booking' }}</button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ProofModal {
  api = inject(ApiService);
  booking = input.required<Booking>();
  closed = output<void>();
  action = output<'confirmed' | 'rejected'>();

  @HostListener('document:keydown.escape')
  onEscape() { this.closed.emit(); }
}
