import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { BlockedSlot, Court, Facility } from '../../core/models';
import { HourPipe, NiceDatePipe, PesoPipe, isoDate } from '../../shared/pipes';

@Component({
  selector: 'pb-owner-courts',
  standalone: true,
  imports: [FormsModule, PesoPipe, HourPipe, NiceDatePipe],
  styleUrl: '../dash/dash.scss',
  template: `
    <div class="head">
      <div><h1>Courts &amp; schedule</h1><p>Add courts, set hourly rates and close time slots for maintenance or events.</p></div>
      @if (facilities().length > 1) {
        <select class="select" style="width: auto" [ngModel]="facilityId()" (ngModelChange)="selectFacility($event)" aria-label="Facility">
          @for (f of facilities(); track f.id) { <option [ngValue]="f.id">{{ f.name }}</option> }
        </select>
      }
    </div>

    @if (!facilities().length && !loading()) {
      <div class="panel"><div class="empty"><h3>No facility yet</h3><p>Add a facility first in “Facility &amp; GCash”.</p></div></div>
    } @else {
      <div class="cols two">
        <!-- Courts -->
        <div class="panel">
          <div class="panel-head"><h2>Courts</h2><span class="muted" style="font-size: 13px">{{ courts().length }} total</span></div>
          @if (!courts().length) {
            <div class="empty"><div class="empty-icon">▭</div><h3>No courts yet</h3><p>Add your first court below.</p></div>
          } @else {
            <table class="table">
              <thead><tr><th>Court</th><th>Surface</th><th>Rate / hr</th><th>Status</th><th></th></tr></thead>
              <tbody>
                @for (c of courts(); track c.id) {
                  @if (editId() === c.id) {
                    <tr>
                      <td data-label="Court"><input class="input" [(ngModel)]="edit.name" style="height: 40px"></td>
                      <td data-label="Surface">
                        <select class="select" [(ngModel)]="edit.surface" style="height: 40px">
                          <option value="outdoor">Outdoor</option><option value="covered">Covered</option><option value="indoor">Indoor</option>
                        </select>
                      </td>
                      <td data-label="Rate"><input class="input" type="number" min="1" [(ngModel)]="edit.hourly_rate" style="height: 40px; max-width: 120px"></td>
                      <td data-label="Status"></td>
                      <td class="actions">
                        <button class="btn btn-primary btn-sm" (click)="saveEdit(c)">Save</button>
                        <button class="btn btn-outline btn-sm" (click)="editId.set(null)">Cancel</button>
                      </td>
                    </tr>
                  } @else {
                    <tr>
                      <td data-label="Court"><b>{{ c.name }}</b></td>
                      <td data-label="Surface" style="text-transform: capitalize">{{ c.surface }}</td>
                      <td data-label="Rate / hr"><b>{{ c.hourly_rate | peso }}</b></td>
                      <td data-label="Status">
                        <button class="toggle" [class.on]="c.is_active" (click)="toggleActive(c)" [attr.aria-label]="c.is_active ? 'Deactivate' : 'Activate'"><i></i></button>
                      </td>
                      <td class="actions">
                        <button class="btn btn-outline btn-sm" (click)="startEdit(c)">Edit</button>
                        <button class="btn btn-danger btn-sm" (click)="remove(c)">Delete</button>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          }
          <form class="panel-body add" (ngSubmit)="addCourt()">
            <h3>Add a court</h3>
            <div class="form-row cols-3">
              <div class="field"><label>Name</label><input class="input" name="name" [(ngModel)]="newCourt.name" placeholder="Court 1"></div>
              <div class="field"><label>Surface</label>
                <select class="select" name="surface" [(ngModel)]="newCourt.surface">
                  <option value="outdoor">Outdoor</option><option value="covered">Covered</option><option value="indoor">Indoor</option>
                </select>
              </div>
              <div class="field"><label>Rate per hour (₱)</label><input class="input" type="number" min="1" name="rate" [(ngModel)]="newCourt.hourly_rate" placeholder="400"></div>
            </div>
            <button class="btn btn-primary">+ Add court</button>
          </form>
        </div>

        <!-- Blocked slots -->
        <div class="panel">
          <div class="panel-head"><h2>Closed time slots</h2></div>
          <form class="panel-body" (ngSubmit)="addBlock()">
            <div class="field"><label>Court</label>
              <select class="select" name="bcourt" [(ngModel)]="block.court_id">
                @for (c of courts(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select>
            </div>
            <div class="field"><label>Date</label><input class="input" type="date" name="bdate" [min]="today" [(ngModel)]="block.date"></div>
            <div class="form-row cols-2">
              <div class="field"><label>From</label>
                <select class="select" name="bstart" [(ngModel)]="block.start_hour">
                  @for (h of hours(); track h) { <option [ngValue]="h">{{ h | hour }}</option> }
                </select>
              </div>
              <div class="field"><label>Until</label>
                <select class="select" name="bend" [(ngModel)]="block.end_hour">
                  @for (h of hours(); track h) { <option [ngValue]="h + 1">{{ h + 1 | hour }}</option> }
                </select>
              </div>
            </div>
            <div class="field"><label>Reason (optional)</label><input class="input" name="breason" [(ngModel)]="block.reason" placeholder="Maintenance, private event…"></div>
            <button class="btn btn-dark btn-block" [disabled]="!courts().length">Close this time</button>
          </form>
          @if (blocks().length) {
            <ul class="blocks">
              @for (b of blocks(); track b.id) {
                <li>
                  <div><b>{{ b.court_name }}</b> · {{ b.block_date | niceDate: true }}<br><small>{{ b.start_hour | hour }} – {{ b.end_hour | hour }}{{ b.reason ? ' · ' + b.reason : '' }}</small></div>
                  <button class="icon-btn" (click)="removeBlock(b)" aria-label="Remove">✕</button>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .add { border-top: 1px solid var(--line); background: var(--mint); }
    .add h3 { font-size: 15px; margin-bottom: 12px; }
    .toggle { width: 46px; height: 26px; border-radius: 999px; border: 0; background: #cbd5e1; position: relative; transition: background .2s; }
    .toggle i { position: absolute; left: 3px; top: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform .25s var(--ease); box-shadow: 0 1px 3px rgba(0,0,0,.2); }
    .toggle.on { background: var(--court-2); }
    .toggle.on i { transform: translateX(20px); }
    .blocks { list-style: none; margin: 0; padding: 0 20px 20px; display: grid; gap: 8px; }
    .blocks li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--mint); font-size: 14px; }
    .blocks small { color: var(--muted); }
  `],
})
export class OwnerCourtsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  facilities = signal<Facility[]>([]);
  facilityId = signal<number | null>(null);
  courts = signal<Court[]>([]);
  blocks = signal<BlockedSlot[]>([]);
  loading = signal(true);
  editId = signal<number | null>(null);
  hours = signal<number[]>([]);
  today = isoDate(new Date());

  edit: Partial<Court> = {};
  newCourt: Partial<Court> = { name: '', surface: 'outdoor', hourly_rate: undefined };
  block = { court_id: null as number | null, date: isoDate(new Date()), start_hour: 8, end_hour: 10, reason: '' };

  ngOnInit() {
    this.api.ownerFacilities().subscribe({
      next: (f) => {
        this.facilities.set(f);
        this.loading.set(false);
        if (f.length) this.selectFacility(f[0].id);
      },
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

  addCourt() {
    const c = this.newCourt;
    if (!c.name?.trim() || !(Number(c.hourly_rate) > 0)) { this.toast.error('Enter a court name and hourly rate.'); return; }
    this.api.addCourt(this.facilityId()!, c).subscribe({
      next: (r) => { this.toast.success(r.message); this.newCourt = { name: '', surface: 'outdoor', hourly_rate: undefined }; this.loadCourts(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  startEdit(c: Court) { this.edit = { ...c }; this.editId.set(c.id); }

  saveEdit(c: Court) {
    this.api.updateCourt(c.id, { name: this.edit.name, surface: this.edit.surface, hourly_rate: this.edit.hourly_rate }).subscribe({
      next: (r) => { this.toast.success(r.message); this.editId.set(null); this.loadCourts(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  toggleActive(c: Court) {
    this.api.updateCourt(c.id, { is_active: !c.is_active }).subscribe({
      next: () => { this.toast.success(c.is_active ? `${c.name} hidden from players` : `${c.name} is bookable again`); this.loadCourts(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  remove(c: Court) {
    if (!confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    this.api.deleteCourt(c.id).subscribe({
      next: (r) => { this.toast.success(r.message); this.loadCourts(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  addBlock() {
    const b = this.block;
    if (!b.court_id || !b.date) { this.toast.error('Choose a court and date.'); return; }
    if (b.end_hour <= b.start_hour) { this.toast.error('End time must be after start time.'); return; }
    this.api.addBlock(b.court_id, { date: b.date, start_hour: b.start_hour, end_hour: b.end_hour, reason: b.reason }).subscribe({
      next: (r) => { this.toast.success(r.message); this.block.reason = ''; this.loadCourts(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }

  removeBlock(b: BlockedSlot) {
    this.api.deleteBlock(b.id).subscribe({
      next: (r) => { this.toast.success(r.message); this.loadCourts(); },
      error: (e) => this.toast.error(errMsg(e)),
    });
  }
}
