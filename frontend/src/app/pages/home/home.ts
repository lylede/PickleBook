import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, inject, signal, viewChild, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Facility } from '../../core/models';
import { HourPipe, PesoPipe } from '../../shared/pipes';
import { PADDLE_PARTS, PaddleScene, ScreenAnchor } from './paddle-scene';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

@Component({
  selector: 'pb-home',
  standalone: true,
  imports: [RouterLink, PesoPipe, HourPipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  private zone = inject(NgZone);
  private api = inject(ApiService);
  auth = inject(AuthService);

  parts = PADDLE_PARTS;
  featured = signal<Facility[]>([]);
  webglFailed = signal(false);

  hero = viewChild.required<ElementRef<HTMLElement>>('hero');
  stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  host = viewChild.required<ElementRef<HTMLElement>>('host');
  labelEls = viewChildren<ElementRef<HTMLElement>>('label');
  lineEls = viewChildren<ElementRef<SVGPathElement>>('line');
  mobileCard = viewChild<ElementRef<HTMLElement>>('mobileCard');

  private scene?: PaddleScene;
  private io?: IntersectionObserver;
  private labelPoints: { x: number; y: number }[] = [];
  private scrollActive = -1;
  private hoverActive = -1;
  private shownActive = -2;
  private destroyed = false;

  ngOnInit() {
    this.api.facilities().subscribe({ next: (f) => this.featured.set(f.slice(0, 3)), error: () => this.featured.set([]) });
  }

  async ngAfterViewInit() {
    // Wait (briefly) for the display font so the paddle print uses it
    try {
      await Promise.race([document.fonts.load('800 64px Unbounded'), new Promise((r) => setTimeout(r, 1500))]);
    } catch { /* ignore */ }
    if (this.destroyed) return;

    this.zone.runOutsideAngular(() => {
      try {
        this.scene = new PaddleScene(this.host().nativeElement);
      } catch (e) {
        console.warn('WebGL not available', e);
        this.zone.run(() => this.webglFailed.set(true));
        return;
      }
      this.scene.onFrame = (a, e) => this.drawLeaders(a, e);
      this.scene.onHover = (i) => { this.hoverActive = i; };

      this.io = new IntersectionObserver(([entry]) => entry.isIntersecting ? this.scene?.start() : this.scene?.stop());
      this.io.observe(this.hero().nativeElement);

      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onResize);
      this.onResize();
      this.onScroll();
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    this.io?.disconnect();
    this.scene?.dispose();
  }

  /** Scroll position inside the tall hero drives the explode animation */
  private onScroll = () => {
    const rect = this.hero().nativeElement.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const p = clamp01(-rect.top / Math.max(1, total));

    const explode = smooth(0.08, 0.36, p);
    this.scene?.setExplode(explode);

    this.stage().nativeElement.classList.toggle('exploded', p > 0.2);
    const s = this.stage().nativeElement.style;
    s.setProperty('--intro', String(1 - smooth(0.03, 0.18, p)));
    s.setProperty('--layers', String(smooth(0.28, 0.4, p)));
    s.setProperty('--hint', String(1 - smooth(0.0, 0.06, p)));

    // Walk through the layers one by one while the user keeps scrolling
    this.scrollActive = p >= 0.4 ? Math.min(this.parts.length - 1, Math.floor(((p - 0.4) / 0.56) * this.parts.length)) : (explode > 0.9 ? 0 : -1);
    this.scene?.setHighlight(this.scrollActive);
  };

  private onResize = () => {
    const stageRect = this.stage().nativeElement.getBoundingClientRect();
    this.labelPoints = this.labelEls().map((el) => {
      const r = el.nativeElement.getBoundingClientRect();
      return { x: r.left - stageRect.left - 10, y: r.top - stageRect.top + 22 };
    });
  };

  /** Runs every animation frame (outside Angular) */
  private drawLeaders(anchors: ScreenAnchor[], explode: number) {
    const active = this.hoverActive >= 0 ? this.hoverActive : this.scrollActive;
    const lines = this.lineEls();
    const linesVisible = explode > 0.85 && window.innerWidth >= 900;
    if (linesVisible) this.onResize(); // labels slide in, so measure them each frame
    this.stage().nativeElement.style.setProperty('--lines', linesVisible ? String((explode - 0.85) / 0.15) : '0');

    if (linesVisible) {
      anchors.forEach((a, i) => {
        const l = this.labelPoints[i];
        const path = lines[i]?.nativeElement;
        if (!l || !path) return;
        const elbowX = l.x - 36;
        path.setAttribute('d', `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${elbowX.toFixed(1)},${l.y.toFixed(1)} L${l.x.toFixed(1)},${l.y.toFixed(1)}`);
      });
    }

    if (active !== this.shownActive) {
      this.shownActive = active;
      this.labelEls().forEach((el, i) => el.nativeElement.classList.toggle('active', i === active));
      lines.forEach((el, i) => el.nativeElement.classList.toggle('active', i === active));
      const card = this.mobileCard()?.nativeElement;
      if (card) {
        const part = this.parts[Math.max(0, active)];
        card.querySelector('.mc-num')!.textContent = String(Math.max(0, active) + 1).padStart(2, '0');
        card.querySelector('.mc-name')!.textContent = part.name;
        card.querySelector('.mc-feature')!.textContent = part.feature;
        card.querySelector('.mc-desc')!.textContent = part.desc;
      }
    }
  }

  scrollToLayers() {
    const el = this.hero().nativeElement;
    window.scrollTo({ top: el.offsetTop + (el.offsetHeight - window.innerHeight) * 0.42, behavior: 'smooth' });
  }

  surfaces(f: Facility): string[] {
    return (f.surfaces || '').split(',').filter(Boolean);
  }
}
