import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { ApiService, errMsg } from '../../core/api.service';
import { Facility } from '../../core/models';
import { HourPipe, PesoPipe } from '../../shared/pipes';
import { CourtArt } from '../../shared/court-art';

@Component({
  selector: 'pb-courts',
  standalone: true,
  imports: [FormsModule, RouterLink, PesoPipe, HourPipe, CourtArt],
  template: `
    <div class="container page">
      <h1 class="page-title">Find a court</h1>
      <p class="page-sub mb-3">Partner pickleball facilities in Cebu.</p>

      <div class="input-group input-group-lg mb-3">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input class="form-control" type="search" [(ngModel)]="q" (ngModelChange)="search$.next($event)" placeholder="Search by name or area" aria-label="Search courts">
      </div>

      <div class="d-flex gap-2 overflow-auto pb-2 mb-3 chips" role="group" aria-label="Filter by city">
        <button type="button" class="btn btn-sm rounded-pill flex-none" [class.btn-dark]="city() === ''" [class.btn-light]="city() !== ''" [class.border]="city() !== ''" (click)="setCity('')">All cities</button>
        @for (c of cities(); track c) {
          <button type="button" class="btn btn-sm rounded-pill flex-none" [class.btn-dark]="city() === c" [class.btn-light]="city() !== c" [class.border]="city() !== c" (click)="setCity(c)">{{ c }}</button>
        }
      </div>

      @if (loading()) {
        <div class="row g-3">
          @for (i of [1, 2, 3]; track i) { <div class="col-12 col-md-6 col-lg-4"><div class="skeleton" style="height: 250px"></div></div> }
        </div>
      } @else if (error()) {
        <div class="card"><div class="empty-state">
          <i class="bi bi-wifi-off"></i>
          <h3>Couldn't load courts</h3>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" (click)="load()">Try again</button>
        </div></div>
      } @else if (!facilities().length) {
        <div class="card"><div class="empty-state">
          <i class="bi bi-search"></i>
          <h3>No courts match your search</h3>
          <p class="mb-0">Try a different name or city.</p>
        </div></div>
      } @else {
        <p class="small text-secondary mb-2">{{ facilities().length }} {{ facilities().length === 1 ? 'facility' : 'facilities' }}</p>
        <div class="row g-3">
          @for (f of facilities(); track f.id) {
            <div class="col-12 col-md-6 col-lg-4">
              <a class="card h-100 facility" [routerLink]="['/courts', f.id]">
                <div class="d-flex d-md-block">
                  <pb-court-art class="art" />
                  <div class="card-body min-w-0">
                    <h2 class="h6 mb-1 text-truncate">{{ f.name }}</h2>
                    <p class="small text-secondary mb-2 text-truncate"><i class="bi bi-geo-alt me-1"></i>{{ f.address }}, {{ f.city }}</p>
                    <div class="small d-flex flex-wrap column-gap-3 row-gap-1">
                      <span><i class="bi bi-clock me-1 text-secondary"></i>{{ f.open_hour | hour }}–{{ f.close_hour | hour }}</span>
                      <span><i class="bi bi-grid me-1 text-secondary"></i>{{ f.court_count }} {{ f.court_count == 1 ? 'court' : 'courts' }}</span>
                    </div>
                    <div class="mt-2 fw-bold">{{ f.min_rate | peso }} <span class="fw-normal small text-secondary">/ hour</span></div>
                  </div>
                </div>
              </a>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .chips { scrollbar-width: none; } .chips::-webkit-scrollbar { display: none; }
    .flex-none { flex: none; }
    .facility { color: inherit; overflow: hidden; transition: border-color .15s, box-shadow .15s; }
    .facility:hover { border-color: #b9dcc7; box-shadow: 0 12px 28px -18px rgba(16,32,26,.45); }
    .art { width: 108px; flex: none; }
    @media (min-width: 768px) { .art { width: auto; height: 130px; } }
  `],
})
export class CourtsPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  facilities = signal<Facility[]>([]);
  cities = signal<string[]>([]);
  city = signal('');
  loading = signal(true);
  error = signal('');
  q = '';
  search$ = new Subject<string>();
  private sub?: Subscription;

  ngOnInit() {
    this.load();
    this.api.cities().subscribe({ next: (c) => this.cities.set(c), error: () => {} });
    this.sub = this.search$.pipe(debounceTime(300)).subscribe(() => this.load());
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  setCity(c: string) { this.city.set(c); this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.facilities(this.q.trim(), this.city()).subscribe({
      next: (f) => { this.facilities.set(f); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
