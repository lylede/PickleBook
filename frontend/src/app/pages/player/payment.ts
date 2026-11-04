import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Booking } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe, StatusPipe } from '../../shared/pipes';

@Component({
  selector: 'pb-payment',
  standalone: true,
  imports: [FormsModule, RouterLink, PesoPipe, HourPipe, NiceDatePipe, StatusPipe],
  template: `
    <section class="page-hero">
      <div class="container">
        <a routerLink="/my-bookings" class="back">← My bookings</a>
        <h1>Pay with GCash</h1>
        <p>Scan the QR below with your GCash app, then upload your receipt.</p>
      </div>
    </section>

    <div class="container wrap">
      @if (loading()) {
        <div class="center-state"><span class="spinner"></span></div>
      } @else {
       @if (b(); as b) {
        <div class="grid">
          <!-- QR card -->
          <div class="qr-card">
            <div class="qr-top">
              <span class="gcash">G<b>Cash</b></span>
              <span class="amount-label">Amount to pay</span>
              <span class="amount">{{ b.total_amount | peso }}</span>
            </div>
            <div class="qr-frame">
              @if (b.gcash_qr) {
                <img [src]="api.asset(b.gcash_qr)" alt="GCash QR code" />
              } @else {
                <div class="no-qr"><b>No QR uploaded yet</b><span>Send the exact amount to the GCash number below.</span></div>
              }
              <i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>
            </div>
            <div class="payee">
              <div><small>Account name</small><b>{{ b.gcash_name || '—' }}</b></div>
              <div><small>GCash number</small><b class="mono">{{ b.gcash_number || '—' }}</b></div>
            </div>
            @if (b.paid_to_platform) { <p class="plat">Payment goes to PickleBook and is forwarded to the facility.</p> }
          </div>

          <!-- Details + upload -->
          <div class="side">
            <div class="card card-pad">
              <div class="ref-row">
                <div><small>Booking reference</small><b class="mono">{{ b.reference_code }}</b></div>
                <span class="badge" [class]="'badge ' + b.status">{{ b.status | status }}</span>
              </div>
              <dl>
                <div><dt>Facility</dt><dd>{{ b.facility_name }}</dd></div>
                <div><dt>Court</dt><dd>{{ b.court_name }}</dd></div>
                <div><dt>Date</dt><dd>{{ b.booking_date | niceDate }}</dd></div>
                <div><dt>Time</dt><dd>{{ b.start_hour | hour }} – {{ b.end_hour | hour }}</dd></div>
              </dl>
              @if (needsPayment() && b.status === 'pending_payment') {
                <div class="timer" [class.late]="secondsLeft() <= 0">
                  @if (secondsLeft() > 0) {
                    <span>Slot held for</span><b class="mono">{{ countdown() }}</b>
                  } @else {
                    <span>Hold expired. You can still pay if the slot is free.</span>
                  }
                </div>
              }
            </div>

            @if (done()) {
              <div class="card card-pad success">
                <div class="check">✓</div>
                <h3>Payment submitted!</h3>
                <p class="muted">The court owner will verify your GCash payment. We'll mark your booking as confirmed once it's checked.</p>
                <a routerLink="/my-bookings" class="btn btn-primary btn-block" style="margin-top: 18px">View my bookings</a>
              </div>
            } @else if (needsPayment()) {
              <form class="card card-pad" (ngSubmit)="submit()">
                <h3>Upload your receipt</h3>
                <ol class="howto">
                  <li>Open GCash and tap <b>Pay QR</b>, then scan the code.</li>
                  <li>Pay exactly <b>{{ b.total_amount | peso }}</b>.</li>
                  <li>Screenshot the receipt and upload it here with the reference number.</li>
                </ol>
                @if (b.status === 'rejected') {
                  <div class="alert warn" style="margin-bottom: 14px">Your last payment was rejected by the owner. Please check the amount and upload a new receipt.</div>
                }
                <div class="field">
                  <label for="ref">GCash reference no.</label>
                  <input id="ref" class="input mono" name="ref" [(ngModel)]="reference" inputmode="numeric" placeholder="e.g. 1012 345 678901" maxlength="20">
                </div>
                <label class="drop" [class.has]="preview()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
                  <input type="file" accept="image/png,image/jpeg,image/webp" (change)="onFile($event)">
                  @if (preview()) {
                    <img [src]="preview()" alt="Receipt preview">
                    <span class="change">Tap to change</span>
                  } @else {
                    <span class="up">⇪</span>
                    <b>Upload receipt screenshot</b>
                    <small>PNG or JPG, max 5 MB</small>
                  }
                </label>
                <button class="btn btn-primary btn-lg btn-block" [disabled]="submitting()">
                  @if (submitting()) { <span class="spinner"></span> } Submit payment
                </button>
              </form>
            } @else {
              <div class="card card-pad">
                <p class="muted">This booking is <b>{{ b.status | status }}</b> and doesn't need payment.</p>
                <a routerLink="/my-bookings" class="btn btn-outline btn-block" style="margin-top: 14px">Back to my bookings</a>
              </div>
            }
          </div>
        </div>
       } @else {
        <div class="empty"><h3>Booking not found</h3><a routerLink="/my-bookings" class="btn btn-primary" style="margin-top: 14px">My bookings</a></div>
       }
      }
    </div>
  `,
  styles: [`
    .back { display: inline-block; color: var(--lime); font-weight: 700; font-size: 14px; margin-bottom: 14px; }
    .wrap { padding-top: 24px; padding-bottom: 80px; }
    .grid { display: grid; gap: 20px; align-items: start; }
    @media (min-width: 900px) { .grid { grid-template-columns: 420px 1fr; } .qr-card { position: sticky; top: calc(var(--nav-h) + 16px); } }

    .qr-card { background: linear-gradient(170deg, #0a5bd3, #0047b3); color: #fff; border-radius: 28px; padding: 22px; box-shadow: var(--shadow-lg); text-align: center; }
    .qr-top { display: flex; flex-direction: column; align-items: center; gap: 2px; margin-bottom: 18px; }
    .gcash { font-family: var(--font-display); font-weight: 800; font-size: 22px; letter-spacing: -.03em; }
    .gcash b { font-weight: 500; }
    .amount-label { font-size: 12px; opacity: .75; margin-top: 8px; }
    .amount { font-family: var(--font-display); font-size: 38px; font-weight: 700; }
    .qr-frame { position: relative; background: #fff; border-radius: 22px; padding: 18px; aspect-ratio: 1; display: grid; place-items: center; max-width: 320px; margin: 0 auto; }
    .qr-frame img { width: 100%; height: 100%; object-fit: contain; }
    .c { position: absolute; width: 26px; height: 26px; border: 4px solid var(--lime); }
    .tl { left: -6px; top: -6px; border-right: 0; border-bottom: 0; border-radius: 12px 0 0 0; }
    .tr { right: -6px; top: -6px; border-left: 0; border-bottom: 0; border-radius: 0 12px 0 0; }
    .bl { left: -6px; bottom: -6px; border-right: 0; border-top: 0; border-radius: 0 0 0 12px; }
    .br { right: -6px; bottom: -6px; border-left: 0; border-top: 0; border-radius: 0 0 12px 0; }
    .no-qr { color: var(--ink); display: flex; flex-direction: column; gap: 6px; padding: 20px; }
    .no-qr span { font-size: 13px; color: var(--muted); }
    .payee { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; text-align: left; }
    .payee div { background: rgba(255,255,255,.12); border-radius: 14px; padding: 10px 12px; }
    .payee small { display: block; font-size: 11px; opacity: .75; }
    .payee b { font-size: 14.5px; word-break: break-word; }
    .plat { font-size: 12px; opacity: .8; margin-top: 12px; }

    .side { display: grid; gap: 16px; }
    .ref-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px; }
    .ref-row small { display: block; font-size: 12px; color: var(--muted); }
    .ref-row b { font-family: var(--font-display); font-size: 20px; }
    dl { margin: 0; display: grid; gap: 8px; }
    dl div { display: flex; justify-content: space-between; gap: 10px; font-size: 14px; }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 700; text-align: right; }
    .timer { margin-top: 16px; padding: 12px 14px; border-radius: 14px; background: #fef3c7; color: #92400e; display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600; }
    .timer b { font-size: 20px; font-family: var(--font-display); }
    .timer.late { background: #fee2e2; color: #991b1b; }
    h3 { font-size: 18px; margin-bottom: 12px; }
    .howto { margin: 0 0 18px; padding-left: 20px; display: grid; gap: 6px; font-size: 14px; color: var(--ink-2); }
    .drop { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 160px; padding: 18px; margin-bottom: 18px;
      border: 2px dashed var(--line); border-radius: 18px; background: var(--mint); cursor: pointer; text-align: center; transition: border-color .2s, background .2s; overflow: hidden; }
    .drop:hover { border-color: var(--court-2); background: #fff; }
    .drop input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .drop .up { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--forest); color: var(--lime); font-size: 22px; margin-bottom: 6px; }
    .drop small { color: var(--muted); font-size: 12px; }
    .drop.has { padding: 8px; }
    .drop img { max-height: 260px; border-radius: 12px; }
    .change { position: absolute; bottom: 12px; padding: 4px 10px; border-radius: 999px; background: rgba(4,20,13,.7); color: #fff; font-size: 12px; font-weight: 700; }
    .success { text-align: center; }
    .check { width: 64px; height: 64px; margin: 4px auto 14px; border-radius: 50%; background: var(--lime); color: var(--ink); display: grid; place-items: center; font-size: 30px; font-weight: 800; animation: pop .4s var(--ease); }
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
  preview = signal<string>('');
  secondsLeft = signal(0);
  reference = '';
  private file: File | null = null;
  private timer: any;

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
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  ngOnDestroy() { clearInterval(this.timer); }

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
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) { this.toast.error('Please upload a PNG, JPG or WEBP image.'); return; }
    if (f.size > 5 * 1024 * 1024) { this.toast.error('Image must be 5 MB or smaller.'); return; }
    this.file = f;
    const reader = new FileReader();
    reader.onload = () => this.preview.set(reader.result as string);
    reader.readAsDataURL(f);
  }

  submit() {
    const ref = this.reference.replace(/\s/g, '');
    if (!/^\d{8,20}$/.test(ref)) { this.toast.error('Enter the GCash reference number (numbers only).'); return; }
    if (!this.file) { this.toast.error('Upload a screenshot of your GCash receipt.'); return; }
    this.submitting.set(true);
    this.api.submitPayment(this.b()!.id, ref, this.file).subscribe({
      next: (r) => {
        this.submitting.set(false);
        this.done.set(true);
        this.b.update((b) => (b ? { ...b, status: 'for_verification' } : b));
        this.toast.success(r.message);
      },
      error: (e) => { this.submitting.set(false); this.toast.error(errMsg(e)); },
    });
  }
}
