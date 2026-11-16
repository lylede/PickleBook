import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import { BlockedSlot, Court, Facility } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe, isoDate } from '../../shared/pipes';

@Component({
  selector: 'pb-owner-courts',
  standalone: true,
  imports: [FormsModule, PesoPipe, HourPipe, NiceDatePipe],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="page-title mb-0">Courts</h1>
      @if (facilities().length > 1) {
        <select class="form-select w-auto" [ngModel]="facilityId()" (ngModelChange)="selectFacility($event)" aria-label="Facility">
          @for (f of facilities(); track f.id) { <option [ngValue]="f.id">{{ f.name }}</option> }
        </select>
      }
    </div>

    @if (!loading() && !facilities().length) {
      <div class="card"><div class="empty-state"><i class="bi bi-shop"></i><h3>Add a facility first</h3><p class="mb-0">Go to Facility to create one.</p></div></div>
    } @else {
      <div class="row g-3">
        <div class="col-12 col-xl-7">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span>Your courts</span>
              <button class="btn btn-primary btn-sm" (click)="openForm()"><i class="bi bi-plus-lg me-1"></i>Add court</button>
            </div>
            @if (!courts().length) {
              <div class="empty-state"><i class="bi bi-grid"></i><h3>No courts yet</h3><p>Add each court players can book, with its hourly rate.</p>
                <button class="btn btn-primary" (click)="openForm()">Add your first court</button></div>
            } @else {
              <div class="list-group list-group-flush">
                @for (c of courts(); track c.id) {
                  <div class="list-group-item d-flex align-items-center gap-3 py-3">
                    <div class="icon-tile"><i class="bi bi-grid-1x2"></i></div>
                    <div class="flex-grow-1 min-w-0">
                      <div class="fw-bold">{{ c.name }} @if (!c.is_active) { <span class="badge bg-secondary-subtle text-secondary-emphasis ms-1">Hidden</span> }</div>
                      <div class="small text-secondary">{{ surfaceLabel(c.surface) }} · {{ c.hourly_rate | peso }} per hour</div>
                    </div>
                    <div class="form-check form-switch m-0" [title]="c.is_active ? 'Players can book this court' : 'Hidden from players'">
                      <input class="form-check-input" type="checkbox" role="switch" [id]="'active' + c.id" [checked]="!!c.is_active" (change)="toggleActive(c)">
                      <label class="visually-hidden" [for]="'active' + c.id">Bookable</label>
                    </div>
                    <div class="dropdown">
                      <button class="btn btn-light btn-sm border" data-bs-toggle="dropdown" aria-label="More actions for {{ c.name }}"><i class="bi bi-three-dots"></i></button>
                      <ul class="dropdown-menu dropdown-menu-end">
                        <li><button class="dropdown-item" (click)="openForm(c)"><i class="bi bi-pencil me-2"></i>Edit</button></li>
                        <li><button class="dropdown-item text-danger" (click)="remove(c)"><i class="bi bi-trash me-2"></i>Delete</button></li>
                      </ul>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <div class="col-12 col-xl-5">
          <form class="card" (ngSubmit)="addBlock()">
            <div class="card-header">Close a time slot</div>
            <div class="card-body">
              <p class="small text-secondary">For maintenance or private events. Players won't be able to book these hours.</p>
              <div class="mb-3">
                <label class="form-label" for="b-court">Court</label>
                <select id="b-court" class="form-select" name="bcourt" [(ngModel)]="block.court_id">
                  @for (c of courts(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label" for="b-date">Date</label>
                <input id="b-date" class="form-control" type="date" name="bdate" [min]="today" [(ngModel)]="block.date">
              </div>
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="form-label" for="b-from">From</label>
                  <select id="b-from" class="form-select" name="bstart" [(ngModel)]="block.start_hour">
                    @for (h of hours(); track h) { <option [ngValue]="h">{{ h | hour }}</option> }
                  </select>
                </div>
                <div class="col-6">
                  <label class="form-label" for="b-to">Until</label>
                  <select id="b-to" class="form-select" name="bend" [(ngModel)]="block.end_hour">
                    @for (h of hours(); track h) { <option [ngValue]="h + 1">{{ h + 1 | hour }}</option> }
                  </select>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label" for="b-reason">Reason <span class="text-secondary fw-normal">(optional)</span></label>
                <input id="b-reason" class="form-control" name="breason" [(ngModel)]="block.reason" placeholder="Resurfacing, tournament…">
              </div>
              <button class="btn btn-dark w-100" [disabled]="!courts().length">Close these hours</button>
            </div>
            @if (blocks().length) {
              <ul class="list-group list-group-flush border-top">
                @for (b of blocks(); track b.id) {
                  <li class="list-group-item d-flex align-items-center gap-2 small">
                    <i class="bi bi-slash-circle text-secondary"></i>
                    <div class="flex-grow-1"><b>{{ b.court_name }}</b> · {{ b.block_date | niceDate: true }}, {{ b.start_hour | hour }}–{{ b.end_hour | hour }}
                      @if (b.reason) { <div class="text-secondary">{{ b.reason }}</div> }</div>
                    <button type="button" class="btn btn-sm btn-link text-danger" (click)="removeBlock(b)">Reopen</button>
                  </li>
                }
              </ul>
            }
          </form>
        </div>
      </div>
    }

    <!-- Add / edit court -->
    @if (formOpen()) {
      <div class="modal-backdrop show"></div>
      <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="courtFormTitle" (click)="formOpen.set(false)">
        <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
          <form class="modal-content" (ngSubmit)="saveCourt()">
            <div class="modal-header">
              <h2 class="modal-title h6" id="courtFormTitle">{{ form.id ? 'Edit court' : 'Add a court' }}</h2>
              <button type="button" class="btn-close" aria-label="Close" (click)="formOpen.set(false)"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label" for="c-name">Court name</label>
                <input id="c-name" class="form-control" name="name" [(ngModel)]="form.name" placeholder="Court 1">
              </div>
              <div class="mb-3">
                <label class="form-label">Type</label>
                <div class="btn-group w-100" role="group" aria-label="Court type">
                  @for (s of surfaces; track s.value) {
                    <input type="radio" class="btn-check" name="surface" [id]="'s-' + s.value" [value]="s.value" [(ngModel)]="form.surface">
                    <label class="btn btn-outline-primary" [for]="'s-' + s.value">{{ s.label }}</label>
                  }
                </div>
              </div>
              <div>
                <label class="form-label" for="c-rate">Hourly rate</label>
                <div class="input-group">
                  <span class="input-group-text">₱</span>
                  <input id="c-rate" class="form-control" type="number" min="1" step="10" inputmode="numeric" name="rate" [(ngModel)]="form.hourly_rate" placeholder="400">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-light border" (click)="formOpen.set(false)">Cancel</button>
              <button class="btn btn-primary" [disabled]="saving()">@if (saving()) { <span class="spinner-border" aria-hidden="true"></span> } Save</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class OwnerCourtsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  facilities = signal<Facility[]>([]);
  facilityId = signal<number | null>(null);
  courts = signal<Court[]>([]);
  blocks = signal<BlockedSlot[]>([]);
  loading = signal(true);
  hours = signal<number[]>([]);
  formOpen = signal(false);
  saving = signal(false);
  today = isoDate(new Date());
  surfaces = [{ value: 'outdoor', label: 'Outdoor' }, { value: 'covered', label: 'Covered' }, { value: 'indoor', label: 'Indoor' }];

  form: Partial<Court> = {};
  block = { court_id: null as number | null, date: isoDate(new Date()), start_hour: 8, end_hour: 10, reason: '' };

  ngOnInit() {
    this.api.ownerFacilities().subscribe({
      next: (f) => { this.facilities.set(f); this.loading.set(false); if (f.length) this.selectFacility(f[0].id); },
      error: (e) => { this.loading.set(false); this.toast.error(errMsg(e)); },
    });
  }

  selectFacility(value: number | string) {
    const id = Number(value);
    this.facilityId.set(id);
    this.block.court_id = null;
    const f = this.facilities().find((x) => x.id === id);
    if (f) this.hours.set(Array.from({ length: f.close_hour - f.open_hour }, (_, i) => f.open_hour + i));
    this.loadCourts();
  }

  loadCourts() {
    const id = this.facilityId();
    if (!id) return;
    this.api.ownerCourts(id).subscribe({
      next: (c) => { this.courts.set(c); if (!this.block.court_id && c.length) this.block.court_id = c[0].id; },
      error: (e) => this.toast.error(errMsg(e)),
    });
    this.api.ownerBlocks(id).subscribe({ next: (b) => this.blocks.set(b), error: () => {} });
  }

  surfaceLabel(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

  openForm(c?: Court) {
    this.form = c ? { ...c } : { name: `Court ${this.courts().length + 1}`, surface: 'outdoor', hourly_rate: undefined };
    this.formOpen.set(true);
  }

  saveCourt() {
    const c = this.form;
    if (!c.name?.trim()) { this.toast.error('Give the court a name.'); return; }
    if (!(Number(c.hourly_rate) > 0)) { this.toast.error('Enter the hourly rate in pesos.'); return; }
    this.saving.set(true);
    const body = { name: c.name.trim(), surface: c.surface, hourly_rate: Number(c.hourly_rate) };
    const req = c.id ? this.api.updateCourt(c.id, body) : this.api.addCourt(this.facilityId()!, body);
    req.subscribe({
      next: () => { this.saving.set(false); this.formOpen.set(false); this.toast.success(c.id ? 'Court updated' : 'Court added'); this.loadCourts(); },
      error: (e) => { this.saving.set(false); this.toast.error(errMsg(e)); },
    });
  }

  toggleActive(c: Court) {
    this.api.updateCourt(c.id, { is_active: !c.is_active }).subscribe({
      next: () => { this.toast.success(c.is_active ? `${c.name} is hidden from players` : `${c.name} is bookable again`); this.loadCourts(); },
      error: (e) => { this.toast.error(errMsg(e)); this.loadCourts(); },
    });
  }

  async remove(c: Court) {
    const ok = await this.confirm.ask({ title: `Delete ${c.name}?`, message: 'This can’t be undone. To stop bookings temporarily, switch the court off instead.', confirmText: 'Delete court', danger: true });
    if (!ok) return;
    this.api.deleteCourt(c.id).subscribe({
      next: () => { this.toast.success('Court deleted'); this.loadCourts(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  addBlock() {
    const b = this.block;
    if (!b.court_id || !b.date) { this.toast.error('Choose a court and date.'); return; }
    if (b.end_hour <= b.start_hour) { this.toast.error('The end time must be after the start time.'); return; }
    this.api.addBlock(b.court_id, { date: b.date, start_hour: b.start_hour, end_hour: b.end_hour, reason: b.reason }).subscribe({
      next: () => { this.toast.success('Hours closed'); this.block.reason = ''; this.loadCourts(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  removeBlock(b: BlockedSlot) {
    this.api.deleteBlock(b.id).subscribe({
      next: () => { this.toast.success('Hours reopened'); this.loadCourts(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
