import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Facility } from '../../core/models';
import { PLANS } from '../../core/plans';
import { HourPipe } from '../../shared/pipes';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'pb-owner-facility',
  standalone: true,
  imports: [FormsModule, HourPipe, StatusBadge],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="page-title mb-0">Facility</h1>
      <button class="btn btn-light border btn-sm" (click)="addOpen.set(!addOpen())"><i class="bi bi-plus-lg me-1"></i>Add facility</button>
    </div>

    @if (addOpen()) {
      <form class="card mb-3" (ngSubmit)="addFacility()">
        <div class="card-header">New facility</div>
        <div class="card-body">
          <div class="row g-2">
            <div class="col-12 col-md-4"><label class="form-label" for="n-name">Name</label><input id="n-name" class="form-control" name="nname" [(ngModel)]="newF.name"></div>
            <div class="col-12 col-md-5"><label class="form-label" for="n-addr">Street address</label><input id="n-addr" class="form-control" name="naddr" [(ngModel)]="newF.address"></div>
            <div class="col-12 col-md-3"><label class="form-label" for="n-city">City</label><input id="n-city" class="form-control" name="ncity" [(ngModel)]="newF.city"></div>
          </div>
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-primary">Submit for review</button>
            <button type="button" class="btn btn-light border" (click)="addOpen.set(false)">Cancel</button>
          </div>
        </div>
      </form>
    }

    @if (facilities().length > 1) {
      <ul class="nav nav-pills mb-3 flex-nowrap overflow-auto">
        @for (f of facilities(); track f.id) {
          <li class="nav-item"><button class="nav-link text-nowrap" [class.active]="form?.id === f.id" (click)="select(f)">{{ f.name }}</button></li>
        }
      </ul>
    }

    @if (form) {
      @if (form.status === 'pending') {
        <div class="alert alert-warning d-flex gap-2"><i class="bi bi-hourglass-split mt-1"></i><div>We're reviewing this facility. Players will see it once it's approved. You can finish setting it up in the meantime.</div></div>
      }
      @if (form.status === 'suspended') {
        <div class="alert alert-danger d-flex gap-2"><i class="bi bi-slash-circle mt-1"></i><div>This facility is suspended and hidden from players. Contact PickleBook support.</div></div>
      }

      <div class="row g-3">
        <div class="col-12 col-xl-7">
          <form class="card" (ngSubmit)="save()">
            <div class="card-header d-flex justify-content-between align-items-center"><span>Details</span><pb-status [status]="form.status || 'pending'" /></div>
            <div class="card-body">
              <div class="mb-3"><label class="form-label" for="f-name">Facility name</label><input id="f-name" class="form-control" name="name" [(ngModel)]="form.name"></div>
              <div class="mb-3"><label class="form-label" for="f-desc">Description</label>
                <textarea id="f-desc" class="form-control" rows="3" name="desc" [(ngModel)]="form.description" placeholder="Covered courts, paddle rental, parking, showers…"></textarea>
                <div class="form-text">Shown to players on your booking page.</div></div>
              <div class="row g-2 mb-3">
                <div class="col-12 col-md-8"><label class="form-label" for="f-addr">Street address</label><input id="f-addr" class="form-control" name="addr" [(ngModel)]="form.address"></div>
                <div class="col-12 col-md-4"><label class="form-label" for="f-city">City</label><input id="f-city" class="form-control" name="city" [(ngModel)]="form.city"></div>
              </div>
              <div class="mb-3"><label class="form-label" for="f-phone">Contact number</label><input id="f-phone" class="form-control" name="phone" [(ngModel)]="form.contact_phone" inputmode="tel"></div>
              <div class="row g-2 mb-4">
                <div class="col-6"><label class="form-label" for="f-open">Opens</label>
                  <select id="f-open" class="form-select" name="open" [(ngModel)]="form.open_hour">@for (h of hourOptions; track h) { <option [ngValue]="h">{{ h | hour }}</option> }</select></div>
                <div class="col-6"><label class="form-label" for="f-close">Closes</label>
                  <select id="f-close" class="form-select" name="close" [(ngModel)]="form.close_hour">@for (h of hourOptions; track h) { <option [ngValue]="h + 1">{{ h + 1 | hour }}</option> }</select></div>
              </div>
              <h3 class="h6">GCash account</h3>
              <div class="row g-2 mb-3">
                <div class="col-12 col-md-6"><label class="form-label" for="g-name">Account name</label><input id="g-name" class="form-control" name="gname" [(ngModel)]="form.gcash_name"></div>
                <div class="col-12 col-md-6"><label class="form-label" for="g-num">GCash number</label><input id="g-num" class="form-control" name="gnum" [(ngModel)]="form.gcash_number" inputmode="tel"></div>
              </div>
              <button class="btn btn-primary" [disabled]="saving()">@if (saving()) { <span class="spinner-border" aria-hidden="true"></span> } Save changes</button>
            </div>
          </form>
        </div>

        <div class="col-12 col-xl-5">
          <div class="card mb-3">
            <div class="card-header">GCash QR code</div>
            <div class="card-body d-flex flex-column flex-sm-row flex-xl-column gap-3 align-items-sm-center align-items-xl-start">
              <div class="qr-box">
                @if (form.gcash_qr) { <img [src]="api.asset(form.gcash_qr)" alt="Your GCash QR"> }
                @else { <div class="text-center text-secondary small"><i class="bi bi-qr-code fs-2 d-block"></i>No QR yet</div> }
              </div>
              <div>
                <p class="small text-secondary">In the GCash app, open <b>QR</b>, then <b>Generate QR</b> and save the image. Upload it here. Players see it on the payment screen.</p>
                <label class="btn btn-primary btn-sm mb-0" [class.disabled]="uploading()">
                  @if (uploading()) { <span class="spinner-border" aria-hidden="true"></span> Uploading… } @else { <i class="bi bi-upload me-1"></i>{{ form.gcash_qr ? 'Replace QR' : 'Upload QR' }} }
                  <input type="file" class="visually-hidden" accept="image/png,image/jpeg,image/webp" (change)="uploadQr($event)" [disabled]="uploading()">
                </label>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">Plan</div>
            <div class="card-body">
              <div class="fw-bold">{{ planName() }}</div>
              <div class="small text-secondary">Billed monthly. To change your plan, contact PickleBook support.</div>
            </div>
          </div>
        </div>
      </div>
    } @else if (!loading()) {
      <div class="card"><div class="empty-state"><i class="bi bi-shop"></i><h3>No facility yet</h3><button class="btn btn-primary mt-2" (click)="addOpen.set(true)">Add your facility</button></div></div>
    }
  `,
  styles: [`
    .qr-box { width: 160px; height: 160px; flex: none; border: 1px dashed #c3cfc7; border-radius: 0.75rem; display: grid; place-items: center; overflow: hidden; background: var(--pb-bg); }
    .qr-box img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
  `],
})
export class OwnerFacilityPage implements OnInit {
  api = inject(ApiService);
  private toast = inject(ToastService);

  facilities = signal<Facility[]>([]);
  form: Facility | null = null;
  loading = signal(true);
  saving = signal(false);
  uploading = signal(false);
  addOpen = signal(false);
  newF = { name: '', address: '', city: 'Cebu City' };
  hourOptions = Array.from({ length: 24 }, (_, i) => i);

  planName() { return PLANS.find((p) => p.id === this.form?.plan)?.name ?? 'Starter'; }

  ngOnInit() { this.load(); }

  load(keepId?: number) {
    this.api.ownerFacilities().subscribe({
      next: (f) => {
        this.facilities.set(f);
        this.loading.set(false);
        const pick = f.find((x) => x.id === (keepId ?? this.form?.id)) || f[0];
        if (pick) this.select(pick);
      },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  select(f: Facility) { this.form = { ...f }; }

  save() {
    const f = this.form;
    if (!f) return;
    if (!f.name?.trim() || !f.address?.trim()) { this.toast.error('Name and address are required.'); return; }
    if (Number(f.close_hour) <= Number(f.open_hour)) { this.toast.error('Closing time must be after opening time.'); return; }
    this.saving.set(true);
    this.api.updateFacility(f.id, f).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Changes saved'); this.load(f.id); },
      error: (e) => { this.saving.set(false); this.toast.error(errMsg(e)); },
    });
  }

  uploadQr(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.form) return;
    if (file.size > 5 * 1024 * 1024) { this.toast.error('That image is larger than 5 MB.'); return; }
    this.uploading.set(true);
    this.api.uploadFacilityQr(this.form.id, file).subscribe({
      next: (r) => { this.uploading.set(false); this.form!.gcash_qr = r.gcash_qr; input.value = ''; this.toast.success('GCash QR saved'); },
      error: (err) => { this.uploading.set(false); this.toast.error(errMsg(err)); },
    });
  }

  addFacility() {
    if (!this.newF.name.trim() || !this.newF.address.trim()) { this.toast.error('Enter a name and address.'); return; }
    this.api.addFacility(this.newF).subscribe({
      next: (r) => { this.toast.success('Facility submitted for review'); this.addOpen.set(false); this.newF = { name: '', address: '', city: 'Cebu City' }; this.load(r.id); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
