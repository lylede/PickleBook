import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ApiService, errMsg } from '../../core/api.service';
import { Facility } from '../../core/models';
import { HourPipe, PesoPipe } from '../../shared/pipes';

@Component({
  selector: 'pb-courts',
  standalone: true,
  imports: [FormsModule, RouterLink, PesoPipe, HourPipe],
  template: `
    <section class="page-hero">
      <div class="container">
        <span class="eyebrow" style="color: var(--lime)">Find a court</span>
        <h1>Where are you playing today?</h1>
        <p>Browse partner pickleball facilities, check rates and book an open slot.</p>
        <div class="search">
          <span class="ico">⌕</span>
          <input class="input" [(ngModel)]="q" (ngModelChange)="search$.next($event)" placeholder="Search by court name, barangay or city" aria-label="Search courts">
        </div>
      </div>
    </section>

    <section class="container list">
      <div class="chips">
        <button class="chip" [class.active]="city() === ''" (click)="setCity('')">All cities</button>
        @for (c of cities(); track c) {
          <button class="chip" [class.active]="city() === c" (click)="setCity(c)">{{ c }}</button>
        }
      </div>

      @if (loading()) {
        <div class="grid">
          @for (i of [1, 2, 3]; track i) { <div class="skeleton" style="height: 320px"></div> }
        </div>
      } @else if (error()) {
        <div class="empty"><div class="empty-icon">!</div><h3>Couldn't load courts</h3><p>{{ error() }}</p>
          <button class="btn btn-primary" style="margin-top: 16px" (click)="load()">Try again</button></div>
      } @else if (!facilities().length) {
        <div class="empty"><div class="empty-icon">⌕</div><h3>No courts found</h3><p>Try another name or city.</p></div>
      } @else {
        <p class="count">{{ facilities().length }} {{ facilities().length === 1 ? 'facility' : 'facilities' }} available</p>
        <div class="grid">
          @for (f of facilities(); track f.id; let i = $index) {
            <a class="fac rise" [style.animation-delay.ms]="i * 60" [routerLink]="['/courts', f.id]">
              <div class="art" [style.--hue]="(i * 18) + 'deg'">
                <div class="court"></div>
                <span class="rate">from {{ f.min_rate | peso }}<small>/hr</small></span>
                <span class="open">{{ f.open_hour | hour }} – {{ f.close_hour | hour }}</span>
              </div>
              <div class="body">
                <h3>{{ f.name }}</h3>
                <p class="addr">📍 {{ f.address }}, {{ f.city }}</p>
                @if (f.description) { <p class="desc">{{ f.description }}</p> }
                <div class="meta">
                  <span>{{ f.court_count }} {{ f.court_count == 1 ? 'court' : 'courts' }}</span>
                  @for (s of surfaces(f); track s) { <span class="cap">{{ s }}</span> }
                </div>
                <span class="go">Check availability →</span>
              </div>
            </a>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .search { position: relative; margin-top: 26px; max-width: 560px; }
    .search .ico { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 20px; }
    .search .input { height: 56px; padding-left: 48px; border-radius: 16px; border: 0; box-shadow: var(--shadow-lg); }
    .list { padding-top: 28px; padding-bottom: 80px; }
    .count { margin: 18px 0 14px; color: var(--muted); font-weight: 600; font-size: 14px; }
    .grid { display: grid; gap: 18px; margin-top: 8px; }
    @media (min-width: 700px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1040px) { .grid { grid-template-columns: repeat(3, 1fr); } }
    .fac { display: flex; flex-direction: column; background: #fff; border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; transition: transform .4s var(--ease), box-shadow .4s var(--ease); }
    .fac:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); }
    .fac:hover .court { transform: perspective(520px) rotateX(52deg) scale(1.08); }
    .art { position: relative; height: 180px; overflow: hidden; display: grid; place-items: center;
      background: linear-gradient(150deg, var(--forest), var(--court)); filter: hue-rotate(var(--hue, 0deg)); }
    .court { width: 44%; height: 150%; border: 2px solid rgba(255,255,255,.55); transform: perspective(520px) rotateX(55deg); transition: transform .6s var(--ease);
      background: linear-gradient(rgba(255,255,255,.55), rgba(255,255,255,.55)) 50% 0 / 2px 100% no-repeat,
                  linear-gradient(rgba(255,255,255,.55), rgba(255,255,255,.55)) 0 38% / 100% 2px no-repeat,
                  linear-gradient(rgba(255,255,255,.55), rgba(255,255,255,.55)) 0 62% / 100% 2px no-repeat,
                  linear-gradient(var(--lime), var(--lime)) 0 50% / 100% 4px no-repeat, rgba(4,20,13,.2); }
    .rate { position: absolute; left: 14px; bottom: 14px; padding: 6px 12px; border-radius: 999px; background: var(--lime); color: var(--ink); font-weight: 800; font-size: 14px; }
    .rate small { font-weight: 600; opacity: .7; }
    .open { position: absolute; right: 14px; top: 14px; padding: 5px 10px; border-radius: 999px; background: rgba(4,20,13,.55); color: #fff; font-size: 12px; font-weight: 700; backdrop-filter: blur(6px); }
    .body { padding: 18px 20px 20px; display: flex; flex-direction: column; flex: 1; }
    .body h3 { font-size: 19px; }
    .addr { font-size: 13.5px; color: var(--muted); margin-top: 6px; }
    .desc { font-size: 14px; color: var(--ink-2); margin-top: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
    .meta span { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: var(--mint-2); color: var(--forest); }
    .cap { text-transform: capitalize; }
    .go { margin-top: auto; padding-top: 16px; font-weight: 800; color: var(--court); font-size: 14px; }
  `],
})
export class CourtsPage implements OnInit {
  private api = inject(ApiService);
  facilities = signal<Facility[]>([]);
  cities = signal<string[]>([]);
  city = signal('');
  loading = signal(true);
  error = signal('');
  q = '';
  search$ = new Subject<string>();

  ngOnInit() {
    this.load();
    this.api.cities().subscribe({ next: (c) => this.cities.set(c), error: () => {} });
    this.search$.pipe(debounceTime(300)).subscribe(() => this.load());
  }

  setCity(c: string) { this.city.set(c); this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.facilities(this.q, this.city()).subscribe({
      next: (f) => { this.facilities.set(f); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  surfaces(f: Facility) { return (f.surfaces || '').split(',').filter(Boolean); }
}
