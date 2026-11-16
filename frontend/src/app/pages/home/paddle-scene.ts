/**
 * PickleBook hero: a realistic carbon pickleball paddle built in code with Three.js.
 *
 * Real-world proportions (elongated shape): 16.5 in long, 7.4 in wide, 16 mm core, 5.25 in handle.
 * Parts, top to bottom: face print, carbon skin, honeycomb core, carbon skin,
 * edge guard, throat collar, grip wrap, handle core, butt cap.
 *
 * setExplode(0..1) separates the parts. onFrame() reports each part's screen position
 * so the page can draw leader lines to its labels.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface PaddlePartInfo { name: string; feature: string; desc: string; }

export const PADDLE_PARTS: PaddlePartInfo[] = [
  { name: 'Face print', feature: 'Find courts', desc: 'Every partner facility with rates and opening hours.' },
  { name: 'Carbon face', feature: 'Live availability', desc: 'Open and booked hours for each court, updated as people book.' },
  { name: 'Honeycomb core', feature: 'No double bookings', desc: 'A slot is locked the moment someone reserves it.' },
  { name: 'Carbon back', feature: 'Secure accounts', desc: 'Separate access for players, court owners and admins.' },
  { name: 'Edge guard', feature: 'GCash payments', desc: 'Scan the facility QR, then upload your receipt.' },
  { name: 'Throat', feature: 'Owner dashboard', desc: 'Verify payments and manage courts in one place.' },
  { name: 'Grip', feature: 'My bookings', desc: 'Track every reservation and its status.' },
  { name: 'Handle core', feature: 'Admin approval', desc: 'Facilities are reviewed before they go live.' },
  { name: 'Butt cap', feature: 'Reports', desc: 'Revenue and peak hours for each facility.' },
];

export interface ScreenAnchor { x: number; y: number; }

// ---------------------------------------------------------------- dimensions
// 1 unit = 3.9 in. Head is centered on its own origin.
const W = 1.9;                 // face width  (7.4 in)
const HEAD_H = 2.89;           // head length incl. shoulders (11.25 in)
const HALF_H = HEAD_H / 2;
const NECK_W = 0.2;            // half width of the neck
const HANDLE_LEN = 1.36;       // 5.25 in
const HEAD_Y = 0.68;           // head center in paddle space
const NECK_Y = HEAD_Y - HALF_H; // where head meets handle

const CORE_T = 0.118;          // honeycomb core
const SKIN_T = 0.014;          // carbon skin
const PRINT_T = 0.005;         // printed surface
const GUARD_T = 0.176;         // edge guard

// ---------------------------------------------------------------- outline
/** Paddle head outline: rounded top, straight sides, shoulders flowing into the neck. */
function headPath(): THREE.Shape {
  const hw = W / 2;
  const s = new THREE.Shape();
  s.moveTo(NECK_W, -HALF_H);
  s.bezierCurveTo(NECK_W + 0.015, -HALF_H + 0.2, 0.36, -HALF_H + 0.3, 0.55, -HALF_H + 0.36); // concave fillet
  s.bezierCurveTo(0.8, -HALF_H + 0.44, hw, -HALF_H + 0.62, hw, -HALF_H + 0.95);              // shoulder
  s.lineTo(hw, HALF_H - 0.58);
  s.bezierCurveTo(hw, HALF_H - 0.2, hw - 0.24, HALF_H - 0.012, hw - 0.56, HALF_H - 0.004);    // top corner
  s.bezierCurveTo(0.14, HALF_H + 0.012, -0.14, HALF_H + 0.012, -(hw - 0.56), HALF_H - 0.004); // slight crown
  s.bezierCurveTo(-(hw - 0.24), HALF_H - 0.012, -hw, HALF_H - 0.2, -hw, HALF_H - 0.58);
  s.lineTo(-hw, -HALF_H + 0.95);
  s.bezierCurveTo(-hw, -HALF_H + 0.62, -0.8, -HALF_H + 0.44, -0.55, -HALF_H + 0.36);
  s.bezierCurveTo(-0.36, -HALF_H + 0.3, -(NECK_W + 0.015), -HALF_H + 0.2, -NECK_W, -HALF_H);
  s.closePath();
  return s;
}

let outlineCache: THREE.Vector2[] | null = null;
function outline(): THREE.Vector2[] {
  if (outlineCache) return outlineCache;
  const pts = headPath().getPoints(18);
  const out: THREE.Vector2[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || last.distanceTo(p) > 1e-4) out.push(p);
  }
  if (out.length > 2 && out[0].distanceTo(out[out.length - 1]) < 1e-4) out.pop();
  outlineCache = out;
  return out;
}

/** Offsets a closed polygon. d > 0 shrinks it, d < 0 grows it. */
function offsetPolygon(pts: THREE.Vector2[], d: number): THREE.Vector2[] {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; area += p.x * q.y - q.x * p.y; }
  const sign = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const e1 = p.clone().sub(a).normalize(), e2 = b.clone().sub(p).normalize();
    const n2 = new THREE.Vector2(-e2.y, e2.x);
    const m = new THREE.Vector2(-e1.y, e1.x).add(n2);
    const len = m.length();
    if (len < 1e-6) return p.clone();
    m.divideScalar(len);
    const cos = Math.max(0.4, m.dot(n2));
    return p.clone().addScaledVector(m, (sign * d) / cos);
  });
}

const headShape = (inset: number) => new THREE.Shape(offsetPolygon(outline(), inset));

function pointInPolygon(x: number, y: number, poly: THREE.Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function honeycombShape(): THREE.Shape {
  const shape = headShape(0.03);
  const bounds = offsetPolygon(outline(), 0.085);
  const r = 0.072;            // about 8 mm cells
  const hole = r * 0.84;
  const dx = r * 1.5;
  const dy = Math.sqrt(3) * r;
  for (let col = -10; col <= 10; col++) {
    for (let row = -13; row <= 13; row++) {
      const cx = col * dx;
      const cy = row * dy + (col % 2 !== 0 ? dy / 2 : 0);
      const pts: THREE.Vector2[] = [];
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k;
        pts.push(new THREE.Vector2(cx + hole * Math.cos(a), cy + hole * Math.sin(a)));
      }
      if (pts.every((p) => pointInPolygon(p.x, p.y, bounds))) shape.holes.push(new THREE.Path(pts));
    }
  }
  return shape;
}

function edgeGuardShape(): THREE.Shape {
  const outer = new THREE.Shape(offsetPolygon(outline(), -0.02));
  outer.holes.push(new THREE.Path(offsetPolygon(outline(), 0.034)));
  return outer;
}

/** Molded collar where the head meets the handle. Origin sits on the neck line. */
function throatShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.212, -0.2);
  s.lineTo(0.212, -0.2);
  s.lineTo(0.222, 0.0);
  s.bezierCurveTo(0.25, 0.19, 0.38, 0.27, 0.53, 0.325);
  s.lineTo(0.5, 0.4);
  s.bezierCurveTo(0.3, 0.3, -0.3, 0.3, -0.5, 0.4);
  s.lineTo(-0.53, 0.325);
  s.bezierCurveTo(-0.38, 0.27, -0.25, 0.19, -0.222, 0.0);
  s.closePath();
  return s;
}

function extrude(shape: THREE.Shape, depth: number, bevel = 0, curveSegments = 12): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, curveSegments,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/**
 * Turns a round geometry (unit radius, axis on Y) into a handle cross-section:
 * a rounded rectangle sx by sz. Optional spiral ridges imitate an overlapped grip wrap.
 */
function shapeHandle(g: THREE.BufferGeometry, sx: number, sz: number, len = 1, wraps = 0, flare = 0): THREE.BufferGeometry {
  const pos = g.attributes['position'] as THREE.BufferAttribute;
  const power = 3.2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-6) continue;
    const c = x / r, s = z / r;
    const squarish = Math.pow(Math.pow(Math.abs(c), power) + Math.pow(Math.abs(s), power), -1 / power);
    const t = y / len + 0.5;                       // 0 at the butt, 1 at the throat
    let k = squarish * (1 + flare * (1 - t) * (1 - t));
    if (wraps > 0 && r > 0.98) {
      const phase = (((Math.atan2(z, x) / (Math.PI * 2) + t * wraps) % 1) + 1) % 1;
      k *= 1 + 0.026 * phase;                      // tape overlap: ramps up, then steps down
    }
    pos.setXYZ(i, c * r * sx * k, y, s * r * sz * k);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- textures
function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

const FONT = '"Plus Jakarta Sans", "Inter", "Segoe UI", Arial, sans-serif';
const TEX_W = 1024;
const TEX_H = Math.round((TEX_W * HEAD_H) / W);

/** Raw carbon twill, matte and low contrast like a peel-ply paddle face. */
function drawWeave(g: CanvasRenderingContext2D, w: number, h: number, cell = 9, light = 1) {
  g.fillStyle = '#131615';
  g.fillRect(0, 0, w, h);
  for (let y = 0, j = 0; y < h; y += cell, j++) {
    for (let x = 0, i = 0; x < w; x += cell, i++) {
      const over = (i + j) % 4 < 2;
      const v = over ? 30 + 10 * light : 20;
      const grad = over ? g.createLinearGradient(x, y, x + cell, y) : g.createLinearGradient(x, y, x, y + cell);
      grad.addColorStop(0, `rgb(${v - 8},${v - 5},${v - 7})`);
      grad.addColorStop(0.5, `rgb(${v + 9},${v + 12},${v + 10})`);
      grad.addColorStop(1, `rgb(${v - 8},${v - 5},${v - 7})`);
      g.fillStyle = grad;
      g.fillRect(x, y, cell - 0.6, cell - 0.6);
    }
  }
}

/** The PickleBook mark (same artwork as brand/logo-mark.svg), drawn in a 48 x 48 box. */
const MARK_PATH = 'M17 3h8a9 9 0 0 1 9 9v10.5c0 4.6-4.600 6.300-7.400 7.200-1.100.4-1.600 1.200-1.600 2.300v13.500l-4-4-4 4V32c0-1.100-.5-1.900-1.600-2.300C12.600 28.800 8 27.100 8 22.500V12a9 9 0 0 1 9-9Z';
function drawMark(g: CanvasRenderingContext2D, cx: number, cy: number, size: number, body: string, ball: string) {
  const k = size / 48;
  g.save();
  g.translate(cx - 24 * k, cy - 24 * k);
  g.scale(k, k);
  g.save();
  const clip = new Path2D();
  clip.rect(0, 0, 48, 48);
  clip.arc(37.2, 11.2, 8.6, 0, Math.PI * 2);
  g.clip(clip, 'evenodd');
  g.fillStyle = body;
  g.fill(new Path2D(MARK_PATH));
  g.restore();
  g.fillStyle = ball;
  g.beginPath(); g.arc(37.2, 11.2, 6.2, 0, Math.PI * 2); g.fill();
  g.restore();
}

function printTexture(): HTMLCanvasElement {
  const [c, g] = canvas(TEX_W, TEX_H);
  const w = TEX_W, h = TEX_H;

  // Full-face gradient: deep court green at the throat, lime at the tip
  const grad = g.createLinearGradient(w * 0.15, h, w * 0.85, 0);
  grad.addColorStop(0, '#075a35');
  grad.addColorStop(0.4, '#119152');
  grad.addColorStop(0.75, '#3fb64a');
  grad.addColorStop(1, '#bfe33f');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // soft light across the upper face
  const sheen = g.createRadialGradient(w * 0.7, h * 0.18, 0, w * 0.7, h * 0.18, w * 0.9);
  sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sheen;
  g.fillRect(0, 0, w, h);

  // Diagonal court-line bands: two parallel ribbons crossing the face
  const band = (offset: number, width: number, color: string) => {
    g.save();
    g.translate(w * 0.5, h * 0.44);
    g.rotate(-0.62);
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(-w * 1.2, offset, w * 2.4, width, width / 2);
    g.fill();
    g.restore();
  };
  band(-150, 120, 'rgba(6, 58, 36, 0.55)');
  band(-6, 46, 'rgba(6, 58, 36, 0.4)');
  band(78, 16, 'rgba(255, 255, 255, 0.55)');

  // fine carbon texture through the ink
  g.globalAlpha = 0.035;
  for (let y = 0, j = 0; y < h; y += 9, j++) for (let x = 0, i = 0; x < w; x += 9, i++) {
    g.fillStyle = (i + j) % 4 < 2 ? '#ffffff' : '#000000';
    g.fillRect(x, y, 8.4, 8.4);
  }
  g.globalAlpha = 1;

  // brand lockup near the top, like a production paddle
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  drawMark(g, w / 2 - 150, 132, 70, '#ffffff', '#0a6a3f');
  g.fillStyle = '#ffffff';
  g.font = `800 54px ${FONT}`;
  g.fillText('picklebook', w / 2 + 40, 132);

  // vertical model text along the left edge
  g.save();
  g.translate(112, h * 0.52);
  g.rotate(-Math.PI / 2);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.font = `700 34px ${FONT}`;
  g.fillText('COURTSIDE  ·  16MM  ·  RAW CARBON', 0, 0);
  g.restore();

  // model badge near the throat
  drawMark(g, w / 2 - 92, h * 0.83, 46, 'rgba(255,255,255,0.95)', '#18a05a');
  g.fillStyle = '#ffffff';
  g.font = `800 58px ${FONT}`;
  g.fillText('PRO', w / 2 + 34, h * 0.83 + 2);
  return c;
}

function carbonTexture(): HTMLCanvasElement {
  const [c, g] = canvas(TEX_W, TEX_H);
  drawWeave(g, TEX_W, TEX_H, 9, 1.4);
  return c;
}

/** Transparent decal for the back of the paddle. */
function backMarkTexture(): HTMLCanvasElement {
  const [c, g] = canvas(512, 512);
  drawMark(g, 256, 256, 440, '#e9ede9', '#c6e84a');
  return c;
}

function gripTexture(): HTMLCanvasElement {
  const [c, g] = canvas(512, 1024);
  g.fillStyle = '#eef0ec';
  g.fillRect(0, 0, 512, 1024);
  g.fillStyle = 'rgba(20, 30, 25, 0.16)';
  for (let y = 7, j = 0; y < 1024; y += 13, j++) {
    for (let x = j % 2 ? 6 : 12.5; x < 512; x += 13) { g.beginPath(); g.arc(x, y, 2.1, 0, Math.PI * 2); g.fill(); }
  }
  // printed wordmark bands, the way grip tape is branded
  g.fillStyle = '#0b3d2a';
  g.font = `800 40px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const y of [180, 540, 900]) {
    g.save(); g.translate(256, y); g.rotate(-0.18); g.fillText('PICKLEBOOK', 0, 0); g.restore();
  }
  return c;
}

function gripBump(): HTMLCanvasElement {
  const [c, g] = canvas(512, 1024);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 512, 1024);
  g.fillStyle = '#303030';
  for (let y = 7, j = 0; y < 1024; y += 13, j++) {
    for (let x = j % 2 ? 6 : 12.5; x < 512; x += 13) { g.beginPath(); g.arc(x, y, 2.4, 0, Math.PI * 2); g.fill(); }
  }
  return c;
}

function capTexture(): HTMLCanvasElement {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#eef0ec';
  g.fillRect(0, 0, 256, 256);
  drawMark(g, 128, 128, 150, '#0b3d2a', '#8fbf1f');
  return c;
}

function ballTexture(): HTMLCanvasElement {
  const [c, g] = canvas(1024, 512);
  g.fillStyle = '#d7ee3f';
  g.fillRect(0, 0, 1024, 512);
  g.fillStyle = '#7f9416';
  // 40 holes laid out in latitude bands; widths stretched toward the poles to stay round on the sphere
  const bands = [[0.13, 4], [0.3, 8], [0.5, 10], [0.7, 8], [0.87, 4]] as const;
  bands.forEach(([v, count], bi) => {
    const lat = (v - 0.5) * Math.PI;
    for (let i = 0; i < count; i++) {
      const x = ((i + (bi % 2) * 0.5) / count) * 1024;
      g.beginPath();
      g.ellipse(x, v * 512, 21 / Math.max(0.35, Math.cos(lat)), 21, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  return c;
}

function shadowTexture(): HTMLCanvasElement {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.6)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return c;
}

// ---------------------------------------------------------------- helpers
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

interface Part {
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  aPos: THREE.Vector3; aQuat: THREE.Quaternion;
  ePos: THREE.Vector3; eQuat: THREE.Quaternion;
  anchor: THREE.Vector3;
  glow: number;
}

interface Layout { aPos: THREE.Vector3; aScale: number; ePos: THREE.Vector3; eScale: number; }

// ================================================================ scene
export class PaddleScene {
  /** Called every frame with the screen position (px, relative to host) of each part's label anchor */
  onFrame?: (anchors: ScreenAnchor[], explode: number) => void;
  /** Called when the hovered part changes (-1 = none) */
  onHover?: (index: number) => void;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private root = new THREE.Group();
  private ball!: THREE.Mesh;
  private shadow!: THREE.Mesh;
  private parts: Part[] = [];
  private pickables: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private clock = new THREE.Clock();
  private frameId = 0;
  private running = false;
  private resizeObs: ResizeObserver;

  private explodeTarget = 0;
  private explode = 0;
  private highlight = -1;
  private hover = -1;
  private pointer = new THREE.Vector2(0, 0);
  private pointerSmooth = new THREE.Vector2(0, 0);
  private hasPointer = false;
  private userYaw = 0;
  private yawVelocity = 0;
  private dragging = false;
  private lastX = 0;
  private time = 0;
  private width = 1;
  private height = 1;
  private layout!: Layout;
  private reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private tmp = new THREE.Vector3();
  private disposables: { dispose(): void }[] = [];

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.style.touchAction = 'pan-y';
    host.appendChild(this.renderer.domElement);

    // Soft studio reflections without loading an HDR file
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    this.scene.environment = envTex;
    this.scene.environmentIntensity = 0.85;
    this.disposables.push(envTex, pmrem);

    this.camera.position.set(0, 0.5, 11.5);
    this.camera.lookAt(0, 0, 0);

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-3.5, 5, 7);
    const rim = new THREE.DirectionalLight(0xd8f7a0, 1.5);
    rim.position.set(5, 2, -6);
    const fill = new THREE.DirectionalLight(0xa8ffd0, 0.5);
    fill.position.set(4, -4, 4);
    this.scene.add(key, rim, fill);

    this.scene.add(this.root);
    this.build();
    this.bindEvents();

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.resize();
  }

  // -------------------------------------------------------------- public API
  setExplode(v: number) { this.explodeTarget = clamp01(v); }
  setHighlight(i: number) { this.highlight = i; }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.getDelta();
    const loop = () => {
      if (!this.running) return;
      this.frameId = requestAnimationFrame(loop);
      this.tick(Math.min(this.clock.getDelta(), 0.05));
    };
    loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  /** Renders a single frame at a fixed state (used for reduced motion and tests). */
  renderOnce(explode = 0) {
    this.explode = this.explodeTarget = clamp01(explode);
    this.tick(0);
  }

  dispose() {
    this.stop();
    this.resizeObs.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointerleave', this.onLeave);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((mat: any) => { mat.map?.dispose(); mat.bumpMap?.dispose(); mat.dispose(); });
    });
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    el.remove();
  }

  // -------------------------------------------------------------- building
  private texture(c: HTMLCanvasElement, color = true): THREE.CanvasTexture {
    const t = new THREE.CanvasTexture(c);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  /** Maps a head-sized canvas onto an extruded head shape (cap UVs are in shape units). */
  private faceTexture(c: HTMLCanvasElement, color = true): THREE.CanvasTexture {
    const t = this.texture(c, color);
    t.repeat.set(1 / W, 1 / HEAD_H);
    t.offset.set(0.5, 0.5);
    return t;
  }

  private build() {
    // ---- materials
    const printCanvas = printTexture();
    const carbonCanvas = carbonTexture();
    const weaveBump = this.faceTexture(carbonCanvas, false);

    const mPrint = new THREE.MeshPhysicalMaterial({
      map: this.faceTexture(printCanvas), bumpMap: weaveBump, bumpScale: 0.35,
      roughness: 0.5, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.45,
    });
    const mCarbon = (canvasEl: HTMLCanvasElement) => new THREE.MeshPhysicalMaterial({
      map: this.faceTexture(canvasEl), bumpMap: weaveBump, bumpScale: 0.8,
      roughness: 0.55, metalness: 0.15, clearcoat: 0.35, clearcoatRoughness: 0.5,
    });
    const mSide = () => new THREE.MeshStandardMaterial({ color: 0xe8ece9, roughness: 0.6 });
    const mCore = () => new THREE.MeshStandardMaterial({ color: 0xc9cec8, roughness: 0.78 });
    const mGuard = () => new THREE.MeshPhysicalMaterial({ color: 0xf3f5f3, roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 });
    const mThroat = () => new THREE.MeshPhysicalMaterial({ color: 0xf3f5f3, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    const gripMap = this.texture(gripTexture());
    const gripBumpMap = this.texture(gripBump(), false);
    [gripMap, gripBumpMap].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2.4); });
    const mGrip = () => new THREE.MeshStandardMaterial({ map: gripMap, bumpMap: gripBumpMap, bumpScale: 1.2, roughness: 0.92 });
    const mHandle = () => new THREE.MeshStandardMaterial({ color: 0x2a2f2c, roughness: 0.75 });
    const mCap = () => new THREE.MeshStandardMaterial({ color: 0xeef0ec, roughness: 0.5 });

    // ---- part factory
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.92, 0, 0));
    const upright = new THREE.Quaternion();
    const add = (
      object: THREE.Mesh, mats: THREE.MeshStandardMaterial[],
      aPos: [number, number, number], ePos: [number, number, number], eQuat: THREE.Quaternion,
      anchor: [number, number, number],
    ) => {
      const group = new THREE.Group();
      object.traverse((o) => { o.userData['part'] = this.parts.length; });
      group.add(object);
      group.position.set(...aPos);
      this.root.add(group);
      this.pickables.push(object);
      this.parts.push({
        group, materials: mats,
        aPos: new THREE.Vector3(...aPos), aQuat: new THREE.Quaternion(),
        ePos: new THREE.Vector3(...ePos), eQuat: eQuat.clone(),
        anchor: new THREE.Vector3(...anchor), glow: 0,
      });
    };
    const mesh = (geo: THREE.BufferGeometry, mats: THREE.MeshStandardMaterial[]) =>
      new THREE.Mesh(geo, mats.length === 1 ? mats[0] : mats);

    const right = W / 2 + 0.03;
    const zSkin = CORE_T / 2 + SKIN_T / 2;
    const zPrint = CORE_T / 2 + SKIN_T + PRINT_T / 2;

    // 0 face print
    let m: THREE.MeshStandardMaterial[] = [mPrint, mSide()];
    add(mesh(extrude(headShape(0.046), PRINT_T), m), m, [0, HEAD_Y, zPrint], [0, 3.55, 0], tilt, [right - 0.05, 0, 0]);
    // 1 carbon skin, front
    m = [mCarbon(carbonCanvas), mSide()];
    add(mesh(extrude(headShape(0.02), SKIN_T), m), m, [0, HEAD_Y, zSkin], [0, 2.77, 0], tilt, [right - 0.03, 0, 0]);
    // 2 honeycomb core
    m = [mCore()];
    add(mesh(extrude(honeycombShape(), CORE_T, 0, 6), m), m, [0, HEAD_Y, 0], [0, 1.99, 0], tilt, [right - 0.04, 0, 0]);
    // 3 carbon skin, back (carries the mark)
    m = [mCarbon(carbonCanvas), mSide()];
    const backSkin = mesh(extrude(headShape(0.02), SKIN_T), m);
    const backMark = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.72),
      new THREE.MeshStandardMaterial({ map: this.texture(backMarkTexture()), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    backMark.rotation.y = Math.PI;                 // faces the back
    backMark.position.set(0, 0.42, -SKIN_T / 2 - 0.001);
    backSkin.add(backMark);
    add(backSkin, m, [0, HEAD_Y, -zSkin], [0, 1.21, 0], tilt, [right - 0.03, 0, 0]);
    // 4 edge guard
    m = [mGuard()];
    add(mesh(extrude(edgeGuardShape(), GUARD_T - 0.036, 0.018, 14), m), m, [0, HEAD_Y, 0], [0, 0.43, 0], tilt, [right + 0.02, 0, 0]);
    // 5 throat collar
    m = [mThroat()];
    add(mesh(extrude(throatShape(), 0.176, 0.022, 14), m), m, [0, NECK_Y, 0], [0, -0.78, 0],
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, 0)), [0.5, 0.33, 0]);
    // 6 grip wrap
    const gripLen = HANDLE_LEN - 0.24;
    const gripGeo = shapeHandle(new THREE.CylinderGeometry(1, 1, gripLen, 72, 120), 0.168, 0.142, gripLen, 9, 0.07);
    m = [mGrip()];
    add(mesh(gripGeo, m), m, [0, NECK_Y - 0.2 - gripLen / 2 + 0.01, 0], [0, -1.95, 0], upright, [0.19, 0, 0]);
    // 7 handle core (hidden inside the grip until exploded)
    const coreLen = gripLen - 0.06;
    m = [mHandle()];
    add(mesh(shapeHandle(new THREE.CylinderGeometry(1, 1, coreLen, 40, 1), 0.148, 0.122, coreLen), m), m,
      [0, NECK_Y - 0.2 - gripLen / 2 + 0.01, 0], [0, -3.2, 0], upright, [0.16, 0, 0]);
    // 8 butt cap
    const capProfile = [
      new THREE.Vector2(0.001, -0.07), new THREE.Vector2(0.9, -0.07), new THREE.Vector2(0.99, -0.052), new THREE.Vector2(1.03, -0.02),
      new THREE.Vector2(1.03, 0.012), new THREE.Vector2(0.97, 0.05), new THREE.Vector2(0.9, 0.07), new THREE.Vector2(0.001, 0.07),
    ];
    const capGeo = shapeHandle(new THREE.LatheGeometry(capProfile, 56), 0.186, 0.158);
    m = [mCap()];
    const cap = mesh(capGeo, m);
    const decal = new THREE.Mesh(
      new THREE.CircleGeometry(0.105, 40),
      new THREE.MeshStandardMaterial({ map: this.texture(capTexture()), roughness: 0.5 }),
    );
    decal.rotation.x = Math.PI / 2;      // faces down, out of the butt
    decal.position.y = -0.0712;
    cap.add(decal);
    add(cap, m, [0, NECK_Y - HANDLE_LEN + 0.06, 0], [0, -4.12, 0],
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.62, 0, 0)), [0.2, 0, 0]);

    // ---- ball
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.285, 48, 32),
      new THREE.MeshStandardMaterial({ map: this.texture(ballTexture()), roughness: 0.55 }),
    );
    this.scene.add(this.ball);

    // ---- soft contact shadow
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.8),
      new THREE.MeshBasicMaterial({ map: this.texture(shadowTexture(), false), transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadow);
  }

  // -------------------------------------------------------------- input
  private bindEvents() {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointerleave', this.onLeave);
  }

  private onDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return; // touch keeps the page scrolling
    this.dragging = true;
    this.lastX = e.clientX;
    this.host.classList.add('grabbing');
  };

  private onMove = (e: PointerEvent) => {
    const rect = this.host.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
    this.hasPointer = e.pointerType !== 'touch';
    if (this.dragging) {
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      this.userYaw += dx * 0.008;
      this.yawVelocity = dx * 0.008;
    }
  };

  private onUp = () => {
    this.dragging = false;
    this.host.classList.remove('grabbing');
  };

  private onLeave = () => { this.hasPointer = false; };

  // -------------------------------------------------------------- layout
  private resize() {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.width = w; this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const aspect = w / h;
    if (aspect >= 1.15) {
      // Desktop: paddle on the right, exploded view moves left to make room for labels
      this.layout = { aPos: new THREE.Vector3(2.35, -0.1, 0), aScale: 1.08, ePos: new THREE.Vector3(-0.15, -0.25, 0), eScale: 0.55 };
    } else if (aspect >= 0.75) {
      // Tablet
      this.layout = { aPos: new THREE.Vector3(1.25, -0.5, 0), aScale: 0.86, ePos: new THREE.Vector3(-0.6, -0.2, 0), eScale: 0.48 };
    } else {
      // Phone: paddle sits below the headline, exploded view is centered
      this.layout = { aPos: new THREE.Vector3(0.1, -1.3, 0), aScale: 0.7, ePos: new THREE.Vector3(0, 0.05, 0), eScale: 0.42 };
    }
    if (!this.running) this.tick(0);
  }

  // -------------------------------------------------------------- frame
  private tick(dt: number) {
    this.time += dt;
    const L = this.layout;
    if (!L) return;

    this.explode = dt > 0 ? damp(this.explode, this.explodeTarget, 6, dt) : this.explodeTarget;
    const e = this.explode;
    const eEase = easeInOut(e);
    const still = this.reducedMotion;

    // Pointer parallax
    const px = this.hasPointer ? this.pointer.x : 0;
    const py = this.hasPointer ? this.pointer.y : 0;
    this.pointerSmooth.x = damp(this.pointerSmooth.x, px, 4, dt);
    this.pointerSmooth.y = damp(this.pointerSmooth.y, py, 4, dt);

    // Drag inertia; when exploded the view settles back to a readable angle
    if (!this.dragging) {
      this.userYaw += this.yawVelocity;
      this.yawVelocity *= Math.pow(0.04, dt);
      if (e > 0.05) {
        const nearest = Math.round(this.userYaw / (Math.PI * 2)) * Math.PI * 2;
        this.userYaw = damp(this.userYaw, nearest, 3, dt);
      }
    }

    // Assembled: a slow three-quarter sway. Exploded: fixed three-quarter view.
    const sway = still ? 0 : Math.sin(this.time * 0.55) * 0.34;
    const yaw = (-0.52 + sway) * (1 - eEase) + -0.4 * eEase + this.userYaw + this.pointerSmooth.x * 0.22;
    const pitch = (0.06 - this.pointerSmooth.y * 0.14) * (1 - eEase * 0.6);
    const float = still ? 0 : Math.sin(this.time * 1.2) * 0.06 * (1 - eEase * 0.7);

    this.root.position.lerpVectors(L.aPos, L.ePos, eEase);
    this.root.position.y += float;
    const scale = THREE.MathUtils.lerp(L.aScale, L.eScale, eEase);
    this.root.scale.setScalar(scale);
    this.root.rotation.set(pitch, yaw, (1 - eEase) * 0.2);

    // Hover picking (only when exploded and a mouse is present)
    if (this.hasPointer && e > 0.75 && !this.dragging) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.pickables, true)[0];
      const idx = hit ? (hit.object.userData['part'] as number) : -1;
      if (idx !== this.hover) { this.hover = idx; this.onHover?.(idx); }
    } else if (this.hover !== -1) {
      this.hover = -1; this.onHover?.(-1);
    }
    const active = this.hover >= 0 ? this.hover : this.highlight;

    // Parts
    const n = this.parts.length;
    const stagger = 0.045;
    this.parts.forEach((p, i) => {
      const t = easeInOut(clamp01((e - i * stagger * 0.5) / (1 - stagger * (n - 1) * 0.5)));
      p.group.position.lerpVectors(p.aPos, p.ePos, t);
      p.group.quaternion.slerpQuaternions(p.aQuat, p.eQuat, t);

      // The active part slides toward its label and glows
      p.glow = dt > 0 ? damp(p.glow, i === active && e > 0.6 ? 1 : 0, 8, dt) : (i === active && e > 0.6 ? 1 : 0);
      p.group.position.x += p.glow * 0.3;
      const pulse = p.glow * (0.4 + (still ? 0 : Math.sin(this.time * 5) * 0.1));
      p.materials.forEach((mat) => { mat.emissive.setRGB(0.4 * pulse, 0.7 * pulse, 0.12 * pulse); });
    });

    // Ball bounces beside the assembled paddle and drops away when the parts separate
    const ballOut = clamp01(e * 2.2);
    const bounce = still ? 0.6 : Math.abs(Math.sin(this.time * 2.1));
    const side = L.aPos.x > 1 ? -1.55 : 1.05;
    this.ball.position.set(L.aPos.x + side * L.aScale, L.aPos.y + (-0.35 + bounce * 1.5) * L.aScale - ballOut * 3.2, 1.0);
    this.ball.rotation.x += dt * 2.2;
    this.ball.rotation.z += dt * 0.9;
    this.ball.scale.setScalar(Math.max(0.0001, (1 - ballOut) * L.aScale));

    // Shadow under the paddle
    const sMat = this.shadow.material as THREE.MeshBasicMaterial;
    this.shadow.position.set(this.root.position.x, L.aPos.y - 2.42 * L.aScale, 0);
    this.shadow.scale.setScalar(scale * (1 - float * 1.2));
    sMat.opacity = 0.5 * (1 - eEase);

    this.renderer.render(this.scene, this.camera);

    // Report label anchors in host pixel space
    if (this.onFrame) {
      const anchors: ScreenAnchor[] = this.parts.map((p) => {
        this.tmp.copy(p.anchor);
        p.group.localToWorld(this.tmp);
        this.tmp.project(this.camera);
        return { x: (this.tmp.x * 0.5 + 0.5) * this.width, y: (-this.tmp.y * 0.5 + 0.5) * this.height };
      });
      this.onFrame(anchors, e);
    }
  }
}
