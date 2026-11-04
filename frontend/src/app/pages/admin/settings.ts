import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'pb-admin-settings',
  standalone: true,
  imports: [FormsModule],
  styleUrl: '../dash/dash.scss',
  template: `
    <div class="head"><div><h1>Platform settings</h1><p>The PickleBook GCash account. Players see this QR when a facility hasn't uploaded its own.</p></div></div>
    <div class="cols two">
      <form class="panel" (ngSubmit)="save()">
        <div class="panel-head"><h2>PickleBook GCash account</h2></div>
        <div class="panel-body">
          <div class="field"><label>Account name</label><input class="input" name="n" [(ngModel)]="name"></div>
          <div class="field"><label>GCash number</label><input class="input" name="num" [(ngModel)]="number" inputmode="tel"></div>
          <button class="btn btn-primary" [disabled]="saving()">Save</button>
        </div>
      </form>
      <div class="panel">
        <div class="panel-head"><h2>Platform GCash QR</h2></div>
        <div class="panel-body" style="display: grid; gap: 16px; justify-items: start">
          <div class="qr-box">
            @if (qr()) { <img [src]="api.asset(qr())" alt="Platform GCash QR"> } @else { <span>No QR yet</span> }
          </div>
          <label class="btn btn-lime file-btn">
            {{ qr() ? 'Replace QR' : 'Upload QR' }}
            <input type="file" accept="image/png,image/jpeg,image/webp" (change)="upload($event)">
          </label>
        </div>
      </div>
    </div>
  `,
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
    this.api.adminSaveSettings({ platform_gcash_name: this.name, platform_gcash_number: this.number }).subscribe({
      next: (r) => { this.saving.set(false); this.toast.success(r.message); },
      error: (e) => { this.saving.set(false); this.toast.error(errMsg(e)); },
    });
  }

  upload(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.api.adminUploadQr(f).subscribe({
      next: (r) => { this.qr.set(r.platform_gcash_qr); this.toast.success(r.message); },
      error: (err) => this.toast.error(errMsg(err)),
    });
  }
}
