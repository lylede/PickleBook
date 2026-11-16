import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Booking } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe } from '../../shared/pipes';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'pb-payment',
  standalone: true,
  imports: [FormsModule, RouterLink, PesoPipe, HourPipe, NiceDatePipe, StatusBadge],
  template: `
    <div class="container page pay-page">
      <a routerLink="/my-bookings" class="small fw-semibold d-inline-flex align-items-center gap-1 mb-2"><i class="bi bi-chevron-left"></i>My bookings</a>

      @if (loading()) {
        <div class="skeleton mb-3" style="height: 28px; width: 50%"></div><div class="skeleton" style="height: 360px"></div>
      } @else {
        @if (b(); as b) {
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h1 class="page-title mb-0">{{ done() ? 'Payment sent' : needsPayment() ? 'Pay with GCash' : 'Booking details' }}</h1>
            <pb-status [status]="b.status" />
          </div>

          <!-- Hold timer -->
          @if (needsPayment() && b.status === 'pending_payment' && !done()) {
            <div class="alert d-flex align-items-center gap-2 py-2" [class.alert-warning]="secondsLeft() > 0" [class.alert-danger]="secondsLeft() <= 0" role="status">
              <i class="bi bi-stopwatch"></i>
              @if (secondsLeft() > 0) {
                <span>Your slot is held for <b class="tnum">{{ countdown() }}</b>. Pay before the timer ends.</span>
              } @else {
                <span>The hold has ended. You can still pay if nobody else has booked this slot.</span>
              }
            </div>
          }

          <div class="row g-4">
            <!-- Booking summary -->
            <div class="col-12 col-lg-5 order-lg-2">
              <div class="card">
                <div class="card-body">
                  <div class="d-flex justify-content-between mb-3">
                    <div><div class="small text-secondary">Reference</div><div class="fw-bold tnum">{{ b.reference_code }}</div></div>
                    <div class="text-end"><div class="small text-secondary">Amount</div><div class="fw-bold fs-5 tnum">{{ b.total_amount | peso }}</div></div>
                  </div>
                  <ul class="list-unstyled small d-grid gap-2 mb-0">
                    <li class="d-flex gap-2"><i class="bi bi-shop text-secondary"></i>{{ b.facility_name }} · {{ b.court_name }}</li>
                    <li class="d-flex gap-2"><i class="bi bi-calendar3 text-secondary"></i>{{ b.booking_date | niceDate }}</li>
                    <li class="d-flex gap-2"><i class="bi bi-clock text-secondary"></i>{{ b.start_hour | hour }} – {{ b.end_hour | hour }}</li>
                    <li class="d-flex gap-2"><i class="bi bi-geo-alt text-secondary"></i>{{ b.address }}, {{ b.city }}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="col-12 col-lg-7 order-lg-1">
              @if (done()) {
                <div class="card"><div class="card-body text-center py-5">
                  <div class="done-icon mb-3"><i class="bi bi-check-lg"></i></div>
                  <h2 class="h5">We sent your receipt to the facility</h2>
                  <p class="text-secondary">Your booking will show as Confirmed once the owner checks your payment. This usually takes a few minutes during opening hours.</p>
                  <a routerLink="/my-bookings" class="btn btn-primary">View my bookings</a>
                </div></div>
              } @else if (needsPayment()) {
                @if (b.status === 'rejected') {
                  <div class="alert alert-danger small"><i class="bi bi-x-circle me-2"></i>The facility couldn't match your last payment. Check the amount and upload the correct receipt.</div>
                }

                <!-- Step 1: QR -->
                <div class="card mb-3">
                  <div class="card-body">
                    <div class="d-flex gap-2 align-items-center mb-3"><span class="step-no">1</span><h2 class="h6 mb-0">Scan and pay in GCash</h2></div>
                    <div class="qr-wrap mx-auto">
                      @if (b.gcash_qr) {
                        <img [src]="api.asset(b.gcash_qr)" alt="GCash QR code for {{ b.gcash_name || b.facility_name }}" class="w-100 h-100">
                      } @else {
                        <div class="text-center text-secondary small p-3"><i class="bi bi-qr-code fs-1 d-block mb-2"></i>No QR uploaded. Send to the GCash number below.</div>
                      }
                    </div>
                    <div class="row g-2 mt-3 small">
                      <div class="col-6"><div class="text-secondary">Account name</div><div class="fw-bold text-break">{{ b.gcash_name || '—' }}</div></div>
                      <div class="col-6"><div class="text-secondary">GCash number</div>
                        <div class="fw-bold tnum d-flex align-items-center gap-1">{{ b.gcash_number || '—' }}
                          @if (b.gcash_number) { <button type="button" class="btn btn-link btn-sm p-0" (click)="copy(b.gcash_number!)" aria-label="Copy GCash number"><i class="bi bi-copy"></i></button> }
                        </div>
                      </div>
                    </div>
                    <p class="small text-secondary mt-3 mb-0">In GCash, tap <b>Pay QR</b> and scan the code, or use <b>Send Money</b> with the number. Pay exactly <b>{{ b.total_amount | peso }}</b>.
                      On a phone, take a screenshot of the QR and upload it in GCash.</p>
                  </div>
                </div>

                <!-- Step 2: receipt -->
                <form class="card" (ngSubmit)="submit()" novalidate>
                  <div class="card-body">
                    <div class="d-flex gap-2 align-items-center mb-3"><span class="step-no">2</span><h2 class="h6 mb-0">Upload your receipt</h2></div>
                    <div class="mb-3">
                      <label class="form-label" for="ref">GCash reference number</label>
                      <input id="ref" class="form-control tnum" name="ref" [(ngModel)]="reference" inputmode="numeric" autocomplete="off" maxlength="20" placeholder="13-digit number on your receipt">
                    </div>
                    <label class="form-label" for="proof">Receipt screenshot</label>
                    <label class="drop mb-3" for="proof" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
                      @if (preview()) {
                        <img [src]="preview()" alt="Receipt preview" class="preview">
                        <span class="small fw-semibold text-primary mt-2"><i class="bi bi-arrow-repeat me-1"></i>Choose a different image</span>
                      } @else {
                        <i class="bi bi-image fs-2 text-secondary"></i>
                        <span class="fw-semibold">Tap to choose a screenshot</span>
                        <span class="small text-secondary">PNG or JPG, up to 5 MB</span>
                      }
                    </label>
                    <input id="proof" type="file" class="visually-hidden" accept="image/png,image/jpeg,image/webp" (change)="onFile($event)">
                    <button class="btn btn-primary btn-lg w-100" [disabled]="submitting()">
                      @if (submitting()) { <span class="spinner-border" aria-hidden="true"></span> } Submit payment
                    </button>
                  </div>
                </form>
              } @else {
                <div class="card"><div class="card-body">
                  <p class="mb-3">This booking doesn't need a payment right now.</p>
                  @if (b.status === 'for_verification') { <p class="small text-secondary">We're waiting for the facility to check your receipt.</p> }
                  <a routerLink="/my-bookings" class="btn btn-light border">Back to my bookings</a>
                </div></div>
              }
            </div>
          </div>
        } @else {
          <div class="card"><div class="empty-state">
            <i class="bi bi-receipt"></i>
            <h3>Booking not found</h3>
            <a routerLink="/my-bookings" class="btn btn-primary mt-2">My bookings</a>
          </div></div>
        }
      }
    </div>
  `,
  styles: [`
    .step-no { width: 1.6rem; height: 1.6rem; border-radius: 50%; display: grid; place-items: center; background: var(--pb-pine); color: #fff; font-size: 0.8125rem; font-weight: 800; }
    .qr-wrap { width: min(260px, 100%); aspect-ratio: 1; border: 1px solid var(--pb-line); border-radius: 0.75rem; padding: 0.75rem; display: grid; place-items: center; background: #fff; }
    .qr-wrap img { object-fit: contain; }
    .drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.2rem; min-height: 9rem; padding: 1rem; width: 100%;
      border: 1.5px dashed #c3cfc7; border-radius: 0.75rem; background: var(--pb-bg); cursor: pointer; text-align: center; }
    .drop:hover { border-color: var(--pb-green); }
    .preview { max-height: 14rem; max-width: 100%; border-radius: 0.5rem; }
    .done-icon { width: 3.5rem; height: 3.5rem; margin: 0 auto; border-radius: 50%; display: grid; place-items: center; background: var(--pb-green-50); color: var(--pb-green); font-size: 1.75rem; }
  `],
})
export class PaymentPage implements OnInit, OnDestroy {
  id = input.required<string>();
  api = inject(ApiService);
  private toast = inject(ToastService);

  b = signal<Booking | null>(null);
  loading = signal(true);
  submitting = signal(false);
  done = signal(false);
  preview = signal('');
  secondsLeft = signal(0);
  reference = '';
  private file: File | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;

  needsPayment = computed(() => ['pending_payment', 'rejected'].includes(this.b()?.status || ''));
  countdown = computed(() => {
    const s = Math.max(0, this.secondsLeft());
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  ngOnInit() {
    this.api.booking(+this.id()).subscribe({
      next: (b) => {
        this.b.set(b);
        this.loading.set(false);
        this.secondsLeft.set(Number(b.hold_seconds || 0));
        this.timer = setInterval(() => this.secondsLeft.update((s) => s - 1), 1000);
      },
      error: (e) => { this.loading.set(false); if (e.status !== 404) this.toast.error(errMsg(e)); },
    });
  }

  ngOnDestroy() { clearInterval(this.timer); }

  copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => this.toast.success('GCash number copied'), () => {});
  }

  onFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.setFile(f);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) this.setFile(f);
  }

  private setFile(f: File) {
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) { this.toast.error('Choose a PNG, JPG or WEBP image.'); return; }
    if (f.size > 5 * 1024 * 1024) { this.toast.error('That image is larger than 5 MB.'); return; }
    this.file = f;
    const reader = new FileReader();
    reader.onload = () => this.preview.set(reader.result as string);
    reader.readAsDataURL(f);
  }

  submit() {
    const ref = this.reference.replace(/\s/g, '');
    if (!/^\d{8,20}$/.test(ref)) { this.toast.error('Enter the reference number from your GCash receipt (numbers only).'); return; }
    if (!this.file) { this.toast.error('Add a screenshot of your GCash receipt.'); return; }
    this.submitting.set(true);
    this.api.submitPayment(this.b()!.id, ref, this.file).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
        this.b.update((b) => (b ? { ...b, status: 'for_verification' } : b));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (e) => { this.submitting.set(false); this.toast.error(errMsg(e)); },
    });
  }
}
