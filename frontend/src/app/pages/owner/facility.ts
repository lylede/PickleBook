import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Facility } from '../../core/models';
import { HourPipe, StatusPipe } from '../../shared/pipes';

@Component({
  selector: 'pb-owner-facility',
  standalone: true,
  imports: [FormsModule, HourPipe, StatusPipe],
  styleUrl: '../dash/dash.scss',
  template: `
    <div class="head">
      <div><h1>Facility &amp; GCash</h1><p>Your public profile, opening hours and the GCash QR players will scan.</p></div>
      <button class="btn btn-outline" (click)="showAdd.set(!showAdd())">{{ showAdd() ? 'Close' : '+ Add another facility' }}</button>
    </div>

    @if (showAdd()) {
      <form class="panel" (ngSubmit)="addFacility()">
        <div class="panel-head"><h2>New facility</h2></div>
        <div class="panel-body">
          <div class="form-row cols-3">
            <div class="field"><label>Name</label><input class="input" name="nname" [(ngModel)]="newF.name"></div>
            <div class="field"><label>Address</label><input class="input" name="naddr" [(ngModel)]="newF.address"></div>
            <div class="field"><label>City</label><input class="input" name="ncity" [(ngModel)]="newF.city"></div>
          </div>
          <button class="btn btn-primary">Submit for approval</button>
        </div>
      </form>
    }

    @if (facilities().length > 1) {
      <div class="chips" style="margin-bottom: 16px">
        @for (f of facilities(); track f.id) {
          <button class="chip" [class.active]="form?.id === f.id" (click)="select(f)">{{ f.name }}</button>
        }
      </div>
    }

    @if (form) {
      <div class="cols two">
        <form class="panel" (ngSubmit)="save()">
          <div class="panel-head">
            <h2>Profile</h2>
            <span [class]="'badge ' + form.status">{{ form.status | status }}</span>
          </div>
          <div class="panel-body">
            <div class="field"><label>Facility name</label><input class="input" name="name" [(ngModel)]="form.name"></div>
            <div class="field"><label>Description</label><textarea class="textarea" name="desc" [(ngModel)]="form.description" placeholder="Covered courts, paddle rentals, parking…"></textarea></div>
            <div class="form-row cols-2">
              <div class="field"><label>Address</label><input class="input" name="addr" [(ngModel)]="form.address"></div>
              <div class="field"><label>City</label><input class="input" name="city" [(ngModel)]="form.city"></div>
            </div>
            <div class="form-row cols-3">
              <div class="field"><label>Contact number</label><input class="input" name="phone" [(ngModel)]="form.contact_phone"></div>
              <div class="field"><label>Opens</label>
                <select class="select" name="open" [(ngModel)]="form.open_hour">
                  @for (h of hourOptions; track h) { <option [ngValue]="h">{{ h | hour }}</option> }
                </select>
              </div>
              <div class="field"><label>Closes</label>
                <select class="select" name="close" [(ngModel)]="form.close_hour">
                  @for (h of hourOptions; track h) { <option [ngValue]="h + 1">{{ h + 1 | hour }}</option> }
                </select>
              </div>
            </div>
            <h3 class="sub">GCash details</h3>
            <div class="form-row cols-2">
              <div class="field"><label>GCash account name</label><input class="input" name="gname" [(ngModel)]="form.gcash_name"></div>
              <div class="field"><label>GCash number</label><input class="input" name="gnum" [(ngModel)]="form.gcash_number" inputmode="tel"></div>
            </div>
            <button class="btn btn-primary" [disabled]="saving()">@if (saving()) { <span class="spinner"></span> } Save changes</button>
          </div>
        </form>

        <div class="panel">
          <div class="panel-head"><h2>GCash QR code</h2></div>
          <div class="panel-body qr-area">
            <div class="qr-box">
              @if (form.gcash_qr) { <img [src]="api.asset(form.gcash_qr)" alt="Your GCash QR"> }
              @else { <span>No QR yet</span> }
            </div>
            <div>
              <p class="muted" style="font-size: 14px; margin-bottom: 14px">In GCash, go to <b>QR → Generate QR / My QR</b>, save the image, then upload it here. Players will see it on the payment screen and scan it with their phone.</p>
              <label class="btn btn-lime file-btn">
                {{ uploading() ? 'Uploading…' : form.gcash_qr ? 'Replace QR' : 'Upload QR' }}
                <input type="file" accept="image/png,image/jpeg,image/webp" (change)="uploadQr($event)" [disabled]="uploading()">
              </label>
            </div>
          </div>
          <div class="panel-body" style="border-top: 1px solid var(--line)">
            <h3 class="sub" style="margin-top: 0">Plan</h3>
            <p style="text-transform: capitalize"><b>{{ form.plan }}</b> <span class="muted">· changed by the PickleBook super admin</span></p>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .sub { font-size: 14px; font-family: var(--font-body); text-transform: uppercase; letter-spacing: .1em; color: var(--court); margin: 8px 0 12px; }
    .qr-area { display: grid; gap: 18px; }
    @media (min-width: 560px) { .qr-area { grid-template-columns: auto 1fr; align-items: center; } }
  `],
})
export class OwnerFacilityPage implements OnInit {
  api = inject(ApiService);
  private toast = inject(ToastService);

  facilities = signal<Facility[]>([]);
  form: Facility | null = null;
  saving = signal(false);
  uploading = signal(false);
  showAdd = signal(false);
  newF = { name: '', address: '', city: 'Cebu City' };
  hourOptions = Array.from({ length: 24 }, (_, i) => i);

  ngOnInit() { this.load(); }

  load(keepId?: number) {
    this.api.ownerFacilities().subscribe({
      next: (f) => {
        this.facilities.set(f);
        const pick = f.find((x) => x.id === (keepId ?? this.form?.id)) || f[0];
        if (pick) this.select(pick);
      },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  select(f: Facility) { this.form = { ...f }; }

  save() {
    if (!this.form) return;
    this.saving.set(true);
    this.api.updateFacility(this.form.id, this.form).subscribe({
      next: (r) => { this.saving.set(false); this.toast.success(r.message); this.load(this.form!.id); },
      error: (e) => { this.saving.set(false); this.toast.error(errMsg(e)); },
    });
  }

  uploadQr(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !this.form) return;
    this.uploading.set(true);
    this.api.uploadFacilityQr(this.form.id, file).subscribe({
      next: (r) => { this.uploading.set(false); this.form!.gcash_qr = r.gcash_qr; this.toast.success(r.message); },
      error: (err) => { this.uploading.set(false); this.toast.error(errMsg(err)); },
    });
  }

  addFacility() {
    if (!this.newF.name.trim() || !this.newF.address.trim()) { this.toast.error('Enter a name and address.'); return; }
    this.api.addFacility(this.newF).subscribe({
      next: (r) => { this.toast.success(r.message); this.showAdd.set(false); this.newF = { name: '', address: '', city: 'Cebu City' }; this.load(r.id); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
