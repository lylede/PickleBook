import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Facility } from '../../core/models';
import { StatusPipe } from '../../shared/pipes';

@Component({
  selector: 'pb-admin-facilities',
  standalone: true,
  imports: [FormsModule, RouterLink, StatusPipe],
  styleUrl: '../dash/dash.scss',
  template: `
    <div class="head"><div><h1>Facilities</h1><p>Approve new courts, suspend facilities and set subscription plans.</p></div></div>

    <div class="panel">
      <div class="panel-head">
        <div class="chips">
          @for (t of tabs; track t.value) {
            <button class="chip" [class.active]="status() === t.value" (click)="status.set(t.value); load()">{{ t.label }}</button>
          }
        </div>
      </div>
      @if (loading()) {
        <div class="center-state"><span class="spinner"></span></div>
      } @else if (!list().length) {
        <div class="empty"><h3>No facilities</h3></div>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Facility</th><th>Owner</th><th>Courts</th><th>GCash QR</th><th>Plan</th><th>Status</th><th></th></tr></thead>
            <tbody>
              @for (f of list(); track f.id) {
                <tr>
                  <td data-label="Facility" class="who"><b>{{ f.name }}</b><small>{{ f.address }}, {{ f.city }}</small></td>
                  <td data-label="Owner" class="who"><b>{{ f.owner_name }}</b><small>{{ f.owner_email }}</small></td>
                  <td data-label="Courts">{{ f.court_count }}</td>
                  <td data-label="GCash QR">
                    @if (f.gcash_qr) { <a [href]="api.asset(f.gcash_qr)" target="_blank" rel="noopener"><img class="proof-thumb" [src]="api.asset(f.gcash_qr)" alt="QR"></a> }
                    @else { <span class="muted">None</span> }
                  </td>
                  <td data-label="Plan">
                    <select class="select" style="height: 36px; width: 110px" [ngModel]="f.plan" (ngModelChange)="update(f, { plan: $event })">
                      <option value="starter">Starter</option><option value="pro">Pro</option><option value="club">Club</option>
                    </select>
                  </td>
                  <td data-label="Status"><span [class]="'badge ' + f.status">{{ f.status | status }}</span></td>
                  <td class="actions">
                    @if (f.status !== 'approved') { <button class="btn btn-primary btn-sm" (click)="update(f, { status: 'approved' })">Approve</button> }
                    @if (f.status === 'approved') {
                      <a class="btn btn-outline btn-sm" [routerLink]="['/courts', f.id]" target="_blank">View</a>
                      <button class="btn btn-danger btn-sm" (click)="update(f, { status: 'suspended' })">Suspend</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class AdminFacilitiesPage implements OnInit {
  api = inject(ApiService);
  private toast = inject(ToastService);
  list = signal<Facility[]>([]);
  loading = signal(true);
  status = signal('');
  tabs = [
    { value: '', label: 'All' }, { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' }, { value: 'suspended', label: 'Suspended' },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.adminFacilities(this.status()).subscribe({
      next: (f) => { this.list.set(f); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  update(f: Facility, body: { status?: string; plan?: string }) {
    this.api.adminUpdateFacility(f.id, body).subscribe({
      next: (r) => { this.toast.success(r.message); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
