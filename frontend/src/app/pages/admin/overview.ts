import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { AdminStats, Facility } from '../../core/models';
import { PLANS } from '../../core/plans';
import { PesoPipe } from '../../shared/pipes';

@Component({
  selector: 'pb-admin-overview',
  standalone: true,
  imports: [RouterLink, PesoPipe],
  template: `
    <h1 class="page-title mb-3">Overview</h1>

    <div class="row g-2 g-lg-3 mb-3">
      <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body">
        <div class="stat-label"><i class="bi bi-cash-coin me-1"></i>Monthly subscriptions</div><div class="stat-value tnum">{{ (s()?.mrr ?? 0) | peso }}</div>
      </div></div></div>
      <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body">
        <div class="stat-label"><i class="bi bi-shop me-1"></i>Live facilities</div><div class="stat-value tnum">{{ s()?.facilities_approved ?? 0 }}</div>
      </div></div></div>
      <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body">
        <div class="stat-label"><i class="bi bi-people me-1"></i>Players</div><div class="stat-value tnum">{{ s()?.players ?? 0 }}</div>
      </div></div></div>
      <div class="col-6 col-xl-3"><div class="card h-100"><div class="card-body">
        <div class="stat-label"><i class="bi bi-calendar-check me-1"></i>Paid bookings</div><div class="stat-value tnum">{{ s()?.bookings_successful ?? 0 }}</div>
      </div></div></div>
    </div>

    <div class="row g-3">
      <div class="col-12 col-xl-7">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Waiting for approval</span>
            @if (pending().length) { <span class="badge rounded-pill text-bg-warning">{{ pending().length }}</span> }
          </div>
          @if (!pending().length) {
            <div class="empty-state"><i class="bi bi-check2-circle"></i><h3>Nothing to review</h3><p class="mb-0">New facilities will show up here.</p></div>
          } @else {
            <div class="list-group list-group-flush">
              @for (f of pending(); track f.id) {
                <div class="list-group-item py-3">
                  <div class="d-flex flex-wrap gap-2 align-items-start">
                    <div class="flex-grow-1 min-w-0">
                      <div class="fw-bold">{{ f.name }}</div>
                      <div class="small text-secondary">{{ f.address }}, {{ f.city }}</div>
                      <div class="small">{{ f.owner_name }} · {{ f.owner_email }}</div>
                      <div class="small mt-1">
                        <span [class]="f.court_count ? 'text-success' : 'text-secondary'"><i class="bi" [class.bi-check-circle]="f.court_count" [class.bi-circle]="!f.court_count"></i> {{ f.court_count || 0 }} courts</span>
                        <span class="ms-3" [class]="f.gcash_qr ? 'text-success' : 'text-secondary'"><i class="bi" [class.bi-check-circle]="f.gcash_qr" [class.bi-circle]="!f.gcash_qr"></i> GCash QR</span>
                      </div>
                    </div>
                    <div class="d-flex gap-2">
                      <button class="btn btn-light border btn-sm" (click)="update(f, 'suspended')">Decline</button>
                      <button class="btn btn-primary btn-sm" (click)="update(f, 'approved')">Approve</button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
      <div class="col-12 col-xl-5">
        <div class="card">
          <div class="card-header">Plans</div>
          <div class="card-body">
            @for (p of plans(); track p.name) {
              <div class="mb-3">
                <div class="d-flex justify-content-between small mb-1"><span class="fw-semibold">{{ p.name }}</span><span class="text-secondary">{{ p.count }} · {{ p.price | peso }}/mo</span></div>
                <div class="progress" style="height: 8px"><div class="progress-bar bg-primary" [style.width.%]="p.pct"></div></div>
              </div>
            }
            <hr>
            <div class="row small g-2">
              <div class="col-4"><div class="text-secondary">Owners</div><div class="fw-bold tnum">{{ s()?.owners ?? 0 }}</div></div>
              <div class="col-4"><div class="text-secondary">All bookings</div><div class="fw-bold tnum">{{ s()?.bookings_total ?? 0 }}</div></div>
              <div class="col-4"><div class="text-secondary">Booking value</div><div class="fw-bold tnum">{{ (s()?.gross_bookings ?? 0) | peso }}</div></div>
            </div>
          </div>
        </div>
        <a routerLink="/admin/facilities" class="btn btn-light border w-100 mt-3">Manage all facilities</a>
      </div>
    </div>
  `,
})
export class AdminOverviewPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  s = signal<AdminStats | null>(null);
  pending = signal<Facility[]>([]);

  plans = computed(() => {
    const p = this.s()?.plans || { starter: 0, pro: 0, club: 0 };
    const total = Math.max(1, p.starter + p.pro + p.club);
    return PLANS.map((pl) => ({ name: pl.name, price: pl.price, count: p[pl.id], pct: (p[pl.id] / total) * 100 }));
  });

  ngOnInit() { this.load(); }

  load() {
    forkJoin({ stats: this.api.adminStats(), pending: this.api.adminFacilities('pending') }).subscribe({
      next: (r) => { this.s.set(r.stats); this.pending.set(r.pending); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  update(f: Facility, status: string) {
    this.api.adminUpdateFacility(f.id, { status }).subscribe({
      next: () => { this.toast.success(status === 'approved' ? `${f.name} is now live` : `${f.name} was declined`); this.load(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
