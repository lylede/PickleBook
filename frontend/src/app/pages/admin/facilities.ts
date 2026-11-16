import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errMsg } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import { Facility } from '../../core/models';
import { PLANS } from '../../core/plans';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'pb-admin-facilities',
  standalone: true,
  imports: [FormsModule, RouterLink, StatusBadge],
  template: `
    <h1 class="page-title mb-3">Facilities</h1>
    <div class="d-flex gap-2 overflow-auto pb-2 mb-3 chips">
      @for (t of tabs; track t.value) {
        <button type="button" class="btn btn-sm rounded-pill flex-none" [class.btn-dark]="status() === t.value" [class.btn-light]="status() !== t.value" [class.border]="status() !== t.value" (click)="status.set(t.value); load()">{{ t.label }}</button>
      }
    </div>

    @if (loading()) {
      <div class="d-grid gap-2">@for (i of [1,2,3]; track i) { <div class="skeleton" style="height: 96px"></div> }</div>
    } @else if (!list().length) {
      <div class="card"><div class="empty-state"><i class="bi bi-shop"></i><h3>No facilities</h3></div></div>
    } @else {
      <div class="card"><div class="list-group list-group-flush">
        @for (f of list(); track f.id) {
          <div class="list-group-item py-3">
            <div class="d-flex flex-wrap gap-3 align-items-start">
              <div class="flex-grow-1 min-w-0">
                <div class="d-flex flex-wrap align-items-center gap-2"><span class="fw-bold">{{ f.name }}</span><pb-status [status]="f.status || 'pending'" /></div>
                <div class="small text-secondary">{{ f.address }}, {{ f.city }}</div>
                <div class="small">{{ f.owner_name }} · {{ f.owner_email }} · {{ f.court_count }} courts</div>
              </div>
              <div class="d-flex flex-wrap gap-2 align-items-center">
                <label class="visually-hidden" [for]="'plan' + f.id">Plan</label>
                <select class="form-select form-select-sm w-auto" [id]="'plan' + f.id" [ngModel]="f.plan" (ngModelChange)="update(f, { plan: $event })">
                  @for (p of plans; track p.id) { <option [value]="p.id">{{ p.name }}</option> }
                </select>
                @if (f.status !== 'approved') { <button class="btn btn-primary btn-sm" (click)="update(f, { status: 'approved' })">Approve</button> }
                @if (f.status === 'approved') {
                  <a class="btn btn-light border btn-sm" [routerLink]="['/courts', f.id]" aria-label="View public page"><i class="bi bi-box-arrow-up-right"></i></a>
                  <button class="btn btn-light border btn-sm text-danger" (click)="suspend(f)">Suspend</button>
                }
              </div>
            </div>
          </div>
        }
      </div></div>
    }
  `,
  styles: [`.chips { scrollbar-width: none; } .chips::-webkit-scrollbar { display: none; } .flex-none { flex: none; }`],
})
export class AdminFacilitiesPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  list = signal<Facility[]>([]);
  loading = signal(true);
  status = signal('');
  plans = PLANS;
  tabs = [{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Live' }, { value: 'suspended', label: 'Suspended' }];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.adminFacilities(this.status()).subscribe({
      next: (f) => { this.list.set(f); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  async suspend(f: Facility) {
    const ok = await this.confirm.ask({ title: `Suspend ${f.name}?`, message: 'Players won’t be able to see or book it until it’s approved again.', confirmText: 'Suspend', danger: true });
    if (ok) this.update(f, { status: 'suspended' });
  }

  update(f: Facility, body: { status?: string; plan?: string }) {
    this.api.adminUpdateFacility(f.id, body).subscribe({
      next: () => { this.toast.success(body.plan ? 'Plan updated' : body.status === 'approved' ? `${f.name} is live` : `${f.name} suspended`); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
