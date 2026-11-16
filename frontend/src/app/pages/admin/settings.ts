import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'pb-admin-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-title">Settings</h1>
    <p class="page-sub mb-3 small">PickleBook's own GCash account. Players see it when a facility hasn't uploaded a QR yet.</p>
    <div class="row g-3">
      <div class="col-12 col-xl-7">
        <form class="card" (ngSubmit)="save()">
          <div class="card-header">GCash account</div>
          <div class="card-body">
            <div class="mb-3"><label class="form-label" for="s-name">Account name</label><input id="s-name" class="form-control" name="n" [(ngModel)]="name"></div>
            <div class="mb-3"><label class="form-label" for="s-num">GCash number</label><input id="s-num" class="form-control" name="num" [(ngModel)]="number" inputmode="tel"></div>
            <button class="btn btn-primary" [disabled]="saving()">@if (saving()) { <span class="spinner-border" aria-hidden="true"></span> } Save</button>
          </div>
        </form>
      </div>
      <div class="col-12 col-xl-5">
        <div class="card">
          <div class="card-header">GCash QR code</div>
          <div class="card-body d-flex gap-3 align-items-center">
            <div class="qr-box">
              @if (qr()) { <img [src]="api.asset(qr())" alt="PickleBook GCash QR"> } @else { <span class="small text-secondary">No QR</span> }
            </div>
            <label class="btn btn-primary btn-sm mb-0">
              <i class="bi bi-upload me-1"></i>{{ qr() ? 'Replace QR' : 'Upload QR' }}
              <input type="file" class="visually-hidden" accept="image/png,image/jpeg,image/webp" (change)="upload($event)">
            </label>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`.qr-box { width: 128px; height: 128px; flex: none; border: 1px dashed #c3cfc7; border-radius: .75rem; display: grid; place-items: center; overflow: hidden; background: var(--pb-bg); } .qr-box img { width: 100%; height: 100%; object-fit: contain; background: #fff; }`],
})
export class AdminSettingsPage implements OnInit {
  api = inject(ApiService);
  private toast = inject(ToastService);
  name = '';
  number = '';
  qr = signal('');
  saving = signal(false);

  ngOnInit() {
    this.api.adminSettings().subscribe({
      next: (s) => { this.name = s['platform_gcash_name'] || ''; this.number = s['platform_gcash_number'] || ''; this.qr.set(s['platform_gcash_qr'] || ''); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  save() {
    this.saving.set(true);
    this.api.adminSaveSettings({ platform_gcash_name: this.name.trim(), platform_gcash_number: this.number.trim() }).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Settings saved'); },
      error: (e) => { this.saving.set(false); this.toast.error(errMsg(e)); },
    });
  }

  upload(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.api.adminUploadQr(f).subscribe({
      next: (r) => { this.qr.set(r.platform_gcash_qr); this.toast.success('QR saved'); },
      error: (err) => this.toast.error(errMsg(err)),
    });
  }
}
