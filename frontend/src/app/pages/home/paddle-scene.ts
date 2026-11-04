/**
 * PickleBook 3D hero — an exploded pickleball paddle built entirely in code with Three.js.
 *
 * Layers (top to bottom, like a real carbon paddle):
 *   graphic face · carbon top · honeycomb core · carbon bottom · edge guard · throat · grip wrap · handle core · butt cap
 *
 * setExplode(0..1) moves every part from its assembled spot to its exploded spot.
 * onFrame() reports where each part is on screen so the page can draw leader lines to labels.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface PaddlePartInfo { name: string; feature: string; desc: string; }

export const PADDLE_PARTS: PaddlePartInfo[] = [
  { name: 'Top graphic layer', feature: 'Discover courts', desc: 'Every partner facility, rate and schedule in one place.' },
  { name: 'Carbon fiber · top', feature: 'Live availability', desc: 'Open slots update in real time. No more “available pa po?”' },
  { name: 'Polymer honeycomb core', feature: 'Zero double bookings', desc: 'A slot locks the moment you reserve it.' },
  { name: 'Carbon fiber · bottom', feature: 'Secure accounts', desc: 'Separate access for players, owners and admins.' },
  { name: 'Edge guard', feature: 'GCash QR payments', desc: 'Scan the court’s QR, upload your receipt, done.' },
  { name: 'Throat / neck', feature: 'Owner dashboard', desc: 'Verify payments and manage courts from one screen.' },
  { name: 'Grip wrap', feature: 'My Bookings', desc: 'Track every reservation and its status.' },
  { name: 'Handle core', feature: 'Super admin', desc: 'Approves facilities and keeps the platform fair.' },
  { name: 'Butt cap', feature: 'Booking reports', desc: 'See your busiest days and peak hours.' },
];

export interface ScreenAnchor { x: number; y: number; }

// Paddle dimensions (scene units)
const W = 1.95;      // face width
const H = 2.9;       // face height (elongated shape)
const FACE_Y = 0.75; // face center height

// ---------------------------------------------------------------- shapes
function faceShape(inset = 0): THREE.Shape {
  const w = W / 2 - inset;
  const h = H / 2 - inset;
  const r = Math.max(0.06, 0.46 - inset);           // rounded top corners
  const c = Math.max(0.04, 0.3 - inset * 0.6);      // chamfered bottom corners
  const s = new THREE.Shape();
  s.moveTo(-w + c, -h);
  s.lineTo(w - c, -h);
  s.lineTo(w, -h + c);
  s.lineTo(w, h - r);
  s.bezierCurveTo(w, h - r * 0.35, w - r * 0.35, h, w - r, h);
  s.lineTo(-w + r, h);
  s.bezierCurveTo(-w + r * 0.35, h, -w, h - r * 0.35, -w, h - r);
  s.lineTo(-w, -h + c);
  s.closePath();
  return s;
}

function pointInPolygon(x: number, y: number, poly: THREE.Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function honeycombShape(): THREE.Shape {
  const shape = faceShape(0.04);
  const bounds = faceShape(0.12).getPoints(6);
  const r = 0.115;                    // hex cell radius
  const hole = r * 0.8;               // leaves thin walls
  const dx = r * 1.5;
  const dy = Math.sqrt(3) * r;
  for (let col = -8; col <= 8; col++) {
    for (let row = -10; row <= 10; row++) {
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
  const outer = faceShape(-0.035);
  const inner = faceShape(0.05);
  outer.holes.push(new THREE.Path(inner.getPoints(10)));
  return outer;
}

function throatShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.64, 0.12);
  s.lineTo(0.64, 0.12);
  s.lineTo(0.64, 0.0);
  s.bezierCurveTo(0.36, -0.02, 0.22, -0.12, 0.21, -0.3);
  s.lineTo(0.21, -0.42);
  s.lineTo(-0.21, -0.42);
  s.lineTo(-0.21, -0.3);
  s.bezierCurveTo(-0.22, -0.12, -0.36, -0.02, -0.64, 0.0);
  s.closePath();
  return s;
}

function extrude(shape: THREE.Shape, depth: number, bevel = 0, curveSegments = 12): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, curveSegments,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

// ---------------------------------------------------------------- textures
function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

const DISPLAY_FONT = '"Unbounded", "Plus Jakarta Sans", Arial, sans-serif';

function graphicTexture(): HTMLCanvasElement {
  const [c, g] = canvas(1024, 1524);
  const cw = c.width, ch = c.height;

  // Base gradient: deep forest -> court green -> lime glow
  const grad = g.createLinearGradient(0, 0, cw, ch * 0.75);
  grad.addColorStop(0, '#052e1c');
  grad.addColorStop(0.45, '#15803d');
  grad.addColorStop(1, '#a3e635');
  g.fillStyle = grad;
  g.fillRect(0, 0, cw, ch);

  // Top-down pickleball court, rotated across the face
  g.save();
  g.translate(cw * 0.52, ch * 0.4);
  g.rotate(-0.42);
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = 12;
  const cwid = 560, clen = 1240, kitchen = 190;
  g.strokeRect(-cwid / 2, -clen / 2, cwid, clen);
  g.beginPath();
  g.moveTo(-cwid / 2, -kitchen); g.lineTo(cwid / 2, -kitchen);
  g.moveTo(-cwid / 2, kitchen); g.lineTo(cwid / 2, kitchen);
  g.moveTo(0, -clen / 2); g.lineTo(0, -kitchen);
  g.moveTo(0, kitchen); g.lineTo(0, clen / 2);
  g.stroke();
  // net
  g.strokeStyle = 'rgba(190,242,100,0.95)';
  g.lineWidth = 18;
  g.beginPath(); g.moveTo(-cwid / 2 - 40, 0); g.lineTo(cwid / 2 + 40, 0); g.stroke();
  // kitchen zone tint
  g.fillStyle = 'rgba(4,20,13,0.28)';
  g.fillRect(-cwid / 2, -kitchen, cwid, kitchen * 2);
  g.restore();

  // Ball
  g.fillStyle = '#d4f53c';
  g.beginPath(); g.arc(cw * 0.76, ch * 0.2, 46, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(4,20,13,0.35)';
  [[-14, -12], [16, -6], [-4, 16], [20, 20], [-22, 10]].forEach(([x, y]) => {
    g.beginPath(); g.arc(cw * 0.76 + x, ch * 0.2 + y, 6, 0, Math.PI * 2); g.fill();
  });

  // Bottom carbon panel
  const panelY = ch * 0.74;
  const fade = g.createLinearGradient(0, panelY - 60, 0, panelY + 20);
  fade.addColorStop(0, 'rgba(10,14,12,0)');
  fade.addColorStop(1, 'rgba(10,14,12,1)');
  g.fillStyle = fade; g.fillRect(0, panelY - 60, cw, 80);
  g.fillStyle = '#0a0e0c'; g.fillRect(0, panelY + 20, cw, ch);
  g.globalAlpha = 0.18;
  for (let y = panelY + 20; y < ch; y += 16) {
    for (let x = 0; x < cw; x += 16) {
      g.fillStyle = ((x + y) / 16) % 2 ? '#3a403d' : '#1a1e1c';
      g.fillRect(x, y, 16, 16);
    }
  }
  g.globalAlpha = 1;

  // Wordmark top
  g.fillStyle = '#ffffff';
  g.font = `800 64px ${DISPLAY_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('PICKLEBOOK', cw / 2, 96);

  // Model name on the carbon panel
  g.font = `700 92px ${DISPLAY_FONT}`;
  g.fillText('COURTSIDE', cw / 2, panelY + 150);
  g.fillStyle = '#bef264';
  g.font = `700 34px ${DISPLAY_FONT}`;
  g.fillText('PRO · 16MM · CARBON', cw / 2, panelY + 230);
  g.fillRect(cw / 2 - 3, panelY + 50, 6, 36);
  g.fillRect(cw / 2 - 18, panelY + 65, 36, 6);
  return c;
}

function carbonTexture(): HTMLCanvasElement {
  const [c, g] = canvas(256, 256);
  const s = 16;
  for (let y = 0; y < 256; y += s) {
    for (let x = 0; x < 256; x += s) {
      const twill = ((x / s) + (y / s)) % 4 < 2;
      const grad = twill ? g.createLinearGradient(x, y, x + s, y) : g.createLinearGradient(x, y, x, y + s);
      grad.addColorStop(0, '#121614');
      grad.addColorStop(0.5, '#3b423e');
      grad.addColorStop(1, '#121614');
      g.fillStyle = grad;
      g.fillRect(x, y, s, s);
    }
  }
  return c;
}

function gripTexture(): HTMLCanvasElement {
  const [c, g] = canvas(512, 1024);
  g.fillStyle = '#f2f6f3';
  g.fillRect(0, 0, 512, 1024);
  // perforations
  g.fillStyle = 'rgba(6,36,23,0.08)';
  for (let y = 6; y < 1024; y += 14) for (let x = (y / 14) % 2 ? 6 : 13; x < 512; x += 14) {
    g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill();
  }
  // overlapping wrap edges + wordmark
  g.save();
  g.rotate(-0.38);
  for (let i = -6; i < 14; i++) {
    const y = i * 120;
    g.fillStyle = 'rgba(6,36,23,0.12)';
    g.fillRect(-400, y, 1400, 4);
    g.fillStyle = '#0b3d2a';
    g.font = `800 42px ${DISPLAY_FONT}`;
    g.fillText('PICKLEBOOK', -200 + (i % 2) * 140, y + 74);
  }
  g.restore();
  return c;
}

function capTexture(): HTMLCanvasElement {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#f4f7f5';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#0b3d2a';
  g.font = `800 92px ${DISPLAY_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('PB', 128, 132);
  return c;
}

function ballTexture(): HTMLCanvasElement {
  const [c, g] = canvas(512, 256);
  g.fillStyle = '#d4f53c';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#9fbf1f';
  for (let row = 0; row < 5; row++) {
    const y = 28 + row * 50;
    const count = row === 0 || row === 4 ? 4 : 8;
    for (let i = 0; i < count; i++) {
      const x = (i + (row % 2) * 0.5) * (512 / count);
      g.beginPath(); g.ellipse(x, y, 14, 12, 0, 0, Math.PI * 2); g.fill();
    }
  }
  return c;
}

function shadowTexture(): HTMLCanvasElement {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
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
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
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
  private pointer = new THREE.Vector2(0, 0);   // -1..1
  private pointerSmooth = new THREE.Vector2(0, 0);
  private hasPointer = false;
  private autoYaw = 0.5;
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
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.touchAction = 'pan-y';
    host.appendChild(this.renderer.domElement);

    // Studio reflections without loading an HDR file
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTex;
    this.disposables.push(envTex, pmrem);

    this.camera.position.set(0, 0.7, 11);
    this.camera.lookAt(0, 0, 0);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 6);
    const rim = new THREE.PointLight(0xbef264, 30, 16);
    rim.position.set(-4, 2, -3);
    const fill = new THREE.PointLight(0x22c55e, 18, 14);
    fill.position.set(4, -3, 3);
    this.scene.add(key, rim, fill, new THREE.AmbientLight(0xffffff, 0.25));

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
      mats.forEach((mat: any) => { mat.map?.dispose(); mat.dispose(); });
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

  private build() {
    // Materials ---------------------------------------------------------
    const graphicMap = this.texture(graphicTexture());
    graphicMap.repeat.set(1 / W, 1 / H);   // ExtrudeGeometry caps use shape units as UVs
    graphicMap.offset.set(0.5, 0.5);

    const carbonCanvas = carbonTexture();
    const carbonMap = this.texture(carbonCanvas);
    carbonMap.wrapS = carbonMap.wrapT = THREE.RepeatWrapping;
    carbonMap.repeat.set(2.2, 2.2);

    const gripMap = this.texture(gripTexture());
    gripMap.wrapS = gripMap.wrapT = THREE.RepeatWrapping;
    const capMap = this.texture(capTexture());

    const mGraphic = () => new THREE.MeshPhysicalMaterial({ map: graphicMap, roughness: 0.38, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
    const mCarbon = () => new THREE.MeshPhysicalMaterial({ map: carbonMap, color: 0xffffff, roughness: 0.32, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.18 });
    const mEdge = () => new THREE.MeshStandardMaterial({ color: 0x0a0d0c, roughness: 0.42, metalness: 0.2 });
    const mCore = () => new THREE.MeshStandardMaterial({ color: 0x9aa39e, roughness: 0.7, metalness: 0.05 });
    const mThroat = () => new THREE.MeshPhysicalMaterial({ color: 0x0c100e, roughness: 0.28, metalness: 0.3, clearcoat: 0.8 });
    const mGrip = () => new THREE.MeshStandardMaterial({ map: gripMap, roughness: 0.85 });
    const mHandle = () => new THREE.MeshStandardMaterial({ color: 0x151917, roughness: 0.5, metalness: 0.2 });
    const mCap = () => new THREE.MeshStandardMaterial({ color: 0xf4f7f5, roughness: 0.45 });
    const mCapLogo = () => new THREE.MeshStandardMaterial({ map: capMap, roughness: 0.45 });

    // Part factory ------------------------------------------------------
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.12, 0, 0));
    const upright = new THREE.Quaternion();
    const add = (
      geo: THREE.BufferGeometry, mats: THREE.MeshStandardMaterial[],
      aPos: [number, number, number], ePos: [number, number, number], eQuat: THREE.Quaternion,
      anchor: [number, number, number], rotY = 0,
    ) => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(geo, mats.length === 1 ? mats[0] : mats);
      mesh.rotation.y = rotY;
      mesh.userData['part'] = this.parts.length;
      group.add(mesh);
      group.position.set(...aPos);
      this.root.add(group);
      this.pickables.push(mesh);
      this.parts.push({
        group, materials: mats,
        aPos: new THREE.Vector3(...aPos), aQuat: new THREE.Quaternion(),
        ePos: new THREE.Vector3(...ePos), eQuat: eQuat.clone(),
        anchor: new THREE.Vector3(...anchor), glow: 0,
      });
    };

    const fy = FACE_Y;
    const right = W / 2 + 0.04;
    // 0 graphic face  (front cap gets the print, sides stay dark)
    add(extrude(faceShape(0), 0.02), [mGraphic(), mEdge()], [0, fy, 0.12], [0, 3.15, 0], tilt, [right, 0, 0]);
    // 1 carbon top
    add(extrude(faceShape(0), 0.03), [mCarbon()], [0, fy, 0.095], [0, 2.5, 0], tilt, [right, 0, 0]);
    // 2 honeycomb core
    add(extrude(honeycombShape(), 0.16, 0, 6), [mCore()], [0, fy, 0], [0, 1.75, 0], tilt, [right - 0.04, 0, 0]);
    // 3 carbon bottom
    add(extrude(faceShape(0), 0.03), [mCarbon()], [0, fy, -0.095], [0, 1.0, 0], tilt, [right, 0, 0]);
    // 4 edge guard
    add(extrude(edgeGuardShape(), 0.24, 0.018, 16), [mEdge()], [0, fy, 0], [0, 0.3, 0], tilt, [right + 0.02, 0, 0]);
    // 5 throat
    add(extrude(throatShape(), 0.2, 0.03), [mThroat()], [0, fy - H / 2 - 0.04, 0], [0, -0.42, 0],
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, 0, 0)), [0.66, 0.06, 0]);
    // 6 grip wrap
    const grip = new THREE.CylinderGeometry(0.2, 0.212, 1.3, 40, 1, false);
    add(grip, [mGrip()], [0, -1.75, 0], [0, -1.6, 0], upright, [0.22, 0, 0]);
    // 7 handle core (octagonal, hidden inside the grip when assembled)
    add(new THREE.CylinderGeometry(0.165, 0.165, 1.15, 8), [mHandle()], [0, -1.72, 0], [0, -2.95, 0], upright, [0.18, 0, 0], Math.PI / 8);
    // 8 butt cap  (materials: side, top, bottom-with-logo)
    add(new THREE.CylinderGeometry(0.215, 0.24, 0.15, 8), [mCap(), mCap(), mCapLogo()], [0, -2.45, 0], [0, -3.85, 0],
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.6, 0, 0)), [0.25, 0, 0], Math.PI / 8);

    // Ball ----------------------------------------------------------------
    const ballMap = this.texture(ballTexture());
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 48, 32),
      new THREE.MeshPhysicalMaterial({ map: ballMap, roughness: 0.4, clearcoat: 0.6, emissive: 0x3f5a00, emissiveIntensity: 0.25 }),
    );
    this.scene.add(this.ball);

    // Soft contact shadow -------------------------------------------------
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 1.1),
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
    if (e.pointerType === 'touch') return; // touch keeps page scrolling
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
    if (aspect >= 1.1) {
      // Desktop: paddle on the right, exploded view slides left to make room for labels
      this.layout = { aPos: new THREE.Vector3(2.0, -0.05, 0), aScale: 1, ePos: new THREE.Vector3(-1.5, 0.1, 0), eScale: 0.6 };
    } else if (aspect >= 0.75) {
      // Tablet
      this.layout = { aPos: new THREE.Vector3(1.2, -0.3, 0), aScale: 0.85, ePos: new THREE.Vector3(-0.9, 0.1, 0), eScale: 0.55 };
    } else {
      // Phone: paddle sits under the headline, exploded view centered
      this.layout = { aPos: new THREE.Vector3(0, -1.15, 0), aScale: 0.66, ePos: new THREE.Vector3(0, 0.45, 0), eScale: 0.5 };
    }
  }

  // -------------------------------------------------------------- frame
  private tick(dt: number) {
    this.time += dt;
    const L = this.layout;

    this.explode = damp(this.explode, this.explodeTarget, 6, dt);
    const e = this.explode;
    const eEase = easeInOut(e);

    // Pointer smoothing (parallax)
    const px = this.hasPointer ? this.pointer.x : 0;
    const py = this.hasPointer ? this.pointer.y : 0;
    this.pointerSmooth.x = damp(this.pointerSmooth.x, px, 4, dt);
    this.pointerSmooth.y = damp(this.pointerSmooth.y, py, 4, dt);

    // Yaw: idle spin when assembled, settle into a 3/4 view when exploded
    if (!this.dragging) {
      this.userYaw += this.yawVelocity;
      this.yawVelocity *= Math.pow(0.04, dt);
      if (e > 0.02) this.userYaw = damp(this.userYaw, THREE.MathUtils.clamp(this.userYaw, -0.6, 0.6), 3, dt);
    }
    if (e < 0.02 && !this.reducedMotion) {
      this.autoYaw += dt * 0.45;
    } else {
      const nearest = Math.round(this.autoYaw / (Math.PI * 2)) * Math.PI * 2;
      this.autoYaw = damp(this.autoYaw, nearest, 3, dt);
    }
    const yaw = this.autoYaw + this.userYaw + eEase * -0.42 + this.pointerSmooth.x * 0.35;
    const pitch = -this.pointerSmooth.y * 0.18 * (1 - eEase * 0.5);
    const float = this.reducedMotion ? 0 : Math.sin(this.time * 1.4) * 0.08 * (1 - eEase * 0.6);

    this.root.position.lerpVectors(L.aPos, L.ePos, eEase);
    this.root.position.y += float;
    const scale = THREE.MathUtils.lerp(L.aScale, L.eScale, eEase);
    this.root.scale.setScalar(scale);
    this.root.rotation.set(pitch, yaw, (1 - eEase) * 0.12);

    // Hover picking (only when exploded and a mouse is present)
    if (this.hasPointer && e > 0.75 && !this.dragging) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
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

      // Active layer slides toward its label and glows
      p.glow = damp(p.glow, i === active && e > 0.6 ? 1 : 0, 8, dt);
      p.group.position.x += p.glow * 0.35;
      const pulse = p.glow * (0.55 + Math.sin(this.time * 5) * 0.15);
      p.materials.forEach((m) => { m.emissive.setRGB(0.45 * pulse, 0.8 * pulse, 0.12 * pulse); });
    });

    // Ball: bounces next to the assembled paddle, drops away when exploding
    const ballOut = clamp01(e * 2.2);
    const bounce = Math.abs(Math.sin(this.time * 2.2));
    const bx = L.aPos.x + 1.25 * L.aScale;
    const by = L.aPos.y - 0.4 * L.aScale + bounce * 1.25 * L.aScale - ballOut * 3;
    this.ball.position.set(bx, by, 0.9);
    this.ball.rotation.x += dt * 2.4;
    this.ball.rotation.z += dt * 1.1;
    this.ball.scale.setScalar(Math.max(0.0001, (1 - ballOut) * L.aScale));

    // Shadow under the paddle
    const sMat = this.shadow.material as THREE.MeshBasicMaterial;
    this.shadow.position.set(this.root.position.x, this.root.position.y - 2.7 * scale - 0.35 - float, 0);
    this.shadow.scale.setScalar(scale * (1 - float * 0.8));
    sMat.opacity = 0.45 * (1 - eEase);

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
