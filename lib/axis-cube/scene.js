// Axis Cube: three puzzles (an Axis Cube, a classic 3×3 and a 2×2) in a teenager's
// bedroom at dusk, light coming through the blinds. Plain three.js, no React: the
// page mounts it into one element and the artifact build bundles the same file.
//
//   const dispose = mountAxisCube(host);   // builds the canvas and the rings inside host
//
// The room opens looking down at the bed, where the three puzzles rest. Tap one: it
// floats up into the light and the camera drops to face it. A grid of rings, laid
// out like its face (3×3, or 2×2 for the 2×2), turns it: swipe sideways across a row
// to turn that horizontal layer, up or down along a column to turn that vertical
// slice; a turn keeps its momentum and snaps onto a quarter turn as it slows. Swipe the puzzle itself: the whole thing spins and
// settles square to the screen. Hold it: it opens and scrambles or solves in one go
// (slide off to cancel). A long swipe straight down on it puts it back on the bed.
// Drag anywhere else: look around.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { haptic } from '../histok/haptic';


const HUD = `
<canvas id="stage" tabindex="0" aria-label="Tres cubos sobre una cama, en un cuarto al atardecer. Tocá uno para usarlo; deslizá los aros para girar sus capas; mantenelo para armarlo o desarmarlo; deslizalo hacia abajo para dejarlo."></canvas>
<div class="pad" aria-hidden="true">
  <span class="dot" data-r="0" data-c="0"></span>
  <span class="dot" data-r="0" data-c="1"></span>
  <span class="dot" data-r="0" data-c="2"></span>
  <span class="dot" data-r="1" data-c="0"></span>
  <span class="dot" data-r="1" data-c="1"></span>
  <span class="dot" data-r="1" data-c="2"></span>
  <span class="dot" data-r="2" data-c="0"></span>
  <span class="dot" data-r="2" data-c="1"></span>
  <span class="dot" data-r="2" data-c="2"></span>
</div>
<div class="fallback" id="fallback" hidden></div>`;

export function mountAxisCube(host, opts) {
  const texBase = (opts && opts.texBase) || '/kit/axis-cube/tex/';
  host.classList.add('axis');
  host.innerHTML = HUD;

  const T = THREE;
  const $ = (s) => host.querySelector(s);
  function fail(msg) { const el = $('#fallback'); el.hidden = false; el.textContent = msg; }

  const canvas = $('#stage');
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
  } catch (e) { fail('Este navegador no pudo iniciar WebGL.'); return () => { host.innerHTML = ''; }; }
  if (!renderer.capabilities.isWebGL2) { fail('Hace falta WebGL 2 para ver esta escena.'); renderer.dispose(); return () => { host.innerHTML = ''; }; }

  /* ───────────────────────── helpers ───────────────────────── */
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const clamp = T.MathUtils.clamp;
  const lerp = T.MathUtils.lerp;
  function mulberry(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ───────────────────────── layout of the room ───────────────────────── */
  // a real teenager's bedroom, in metres: 3.6 wide, 4.2 deep, 2.6 to the ceiling; a single bed under the window
  const ROOM = { xMin: -1.8, xMax: 1.8, yMax: 2.6, zBack: -2.0, zFront: 2.2 };
  const WT = 0.12;                                               // wall thickness
  const WIN = { x0: -0.74, x1: 0.28, y0: 0.96, y1: 2.14 };       // opening in the back wall
  const CURT = { x0: WIN.x0 - 0.21, x1: WIN.x1 + 0.21, y0: WIN.y0 - 0.38, y1: WIN.y1 + 0.10, z: -1.90 };
  const CW = CURT.x1 - CURT.x0, CH = CURT.y1 - CURT.y0;
  const CUBE_HOME = V3(0, 1.3, -0.9);
  const CUBE_SCALE = 0.265;                                      // the room came down to real size; the cube keeps its size on screen
  const G0 = V3(-0.3, 1.98, CURT.z);                             // where the main beam crosses the mask plane
  const SUN_DIR = CUBE_HOME.clone().sub(G0).normalize();         // direction the light travels
  const SUN_POS = G0.clone().addScaledVector(SUN_DIR, -42);
  const kx = SUN_DIR.x / SUN_DIR.z, ky = SUN_DIR.y / SUN_DIR.z;
  const toCurt = (x, y, z) => [x + (CURT.z - z) * kx, y + (CURT.z - z) * ky];
  const zOut = ROOM.zBack - WT - 0.01, zIn = ROOM.zBack + 0.03, zSill = ROOM.zBack + 0.05;
  const OPEN = {                                                  // window opening as seen by the light, on the mask plane
    x0: Math.max(toCurt(WIN.x0, 0, zOut)[0], toCurt(WIN.x0, 0, zIn)[0]),
    x1: Math.min(toCurt(WIN.x1, 0, zOut)[0], toCurt(WIN.x1, 0, zIn)[0]),
    y0: Math.max(toCurt(0, WIN.y0, zOut)[1], toCurt(0, WIN.y0, zSill)[1]),
    y1: Math.min(toCurt(0, WIN.y1, zOut)[1], toCurt(0, WIN.y1, zIn)[1])
  };
  const OPENC = (OPEN.x0 + OPEN.x1) / 2;
  const MUNT = { x: (WIN.x0 + WIN.x1) / 2, y: WIN.y0 + 0.6, t: 0.018, z0: ROOM.zBack - 0.08, z1: ROOM.zBack - 0.04 };
  const BL = { x0: WIN.x0 + 0.012, x1: WIN.x1 - 0.012, z: ROOM.zBack + 0.055, top: WIN.y1 - 0.02, bottom: WIN.y0 + 0.23, pitch: 0.034, depth: 0.025, tilt: 0.42 };
  const SLATS = [];
  for (let y = BL.top - 0.06; y > BL.bottom + 0.02; y -= BL.pitch) SLATS.push(y);
  const BED = { w: 0.96, len: 1.9, zHead: -1.88, top: 0.52 };    // a single mattress, its top at sitting height
  // where the three puzzles rest on the duvet: two behind and one in front, in a shallow V (s is half their size at rest)
  const SPOTS = [
    { key: 'cube2', x: -0.25, z: -0.33, yaw: 0.22, s: 0.072 },
    { key: 'axis', x: 0.0, z: -0.17, yaw: -0.1, s: 0.085 },
    { key: 'cube3', x: 0.25, z: -0.33, yaw: -0.28, s: 0.085 }
  ];

  /* ───────────────────────── renderer ───────────────────────── */
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.NoToneMapping;
  renderer.autoClear = false;
  const gl = renderer.getContext();
  const hdrOK = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  const RT_TYPE = hdrOK ? T.HalfFloatType : T.UnsignedByteType;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new T.Scene();
  scene.background = new T.Color(0x000000);
  const camera = new T.PerspectiveCamera(50, 1, 0.1, 60);

  /* ───────────────────────── canvas textures ───────────────────────── */
  function makeCanvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
  function tex(c, opt) {
    opt = opt || {};
    const t = new T.CanvasTexture(c);
    if (opt.srgb !== false) t.colorSpace = T.SRGBColorSpace;
    if (opt.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    if (opt.nomip) { t.generateMipmaps = false; t.minFilter = T.LinearFilter; }
    t.anisotropy = Math.min(8, maxAniso);
    return t;
  }
  const rgb = (a) => 'rgb(' + a.map((v) => Math.round(clamp(v, 0, 255))).join(',') + ')';

  function drawWood(g, w, h, rnd, base, planks) {
    const pw = w / planks;
    for (let i = 0; i < planks; i++) {
      const tone = 0.86 + rnd() * 0.26;
      g.fillStyle = rgb(base.map((v) => v * tone));
      g.fillRect(i * pw, 0, pw + 1, h);
      for (let k = 0; k < 64; k++) {
        const x = i * pw + rnd() * pw, a = 0.03 + rnd() * 0.09;
        g.strokeStyle = rnd() < 0.7 ? 'rgba(40,18,6,' + a + ')' : 'rgba(255,205,150,' + a * 0.7 + ')';
        g.lineWidth = 0.6 + rnd() * 1.8;
        g.beginPath(); g.moveTo(x, -4);
        let y = 0, xx = x;
        while (y < h + 4) { y += 40 + rnd() * 80; xx += (rnd() - 0.5) * 5; g.lineTo(xx, y); }
        g.stroke();
      }
      if (rnd() < 0.4) {
        const kx2 = i * pw + pw * (0.3 + rnd() * 0.4), ky2 = h * (0.1 + rnd() * 0.8);
        for (let r = 14; r > 2; r -= 2.5) {
          g.strokeStyle = 'rgba(45,20,8,' + (0.10 + (14 - r) * 0.012) + ')'; g.lineWidth = 1.2;
          g.beginPath(); g.ellipse(kx2, ky2, r * 0.55, r * 1.7, 0, 0, 6.283); g.stroke();
        }
      }
    }
    for (let i = 0; i <= planks; i++) {
      const x = i * pw;
      const gr = g.createLinearGradient(x - 5, 0, x + 5, 0);
      gr.addColorStop(0, 'rgba(20,8,2,0)'); gr.addColorStop(0.42, 'rgba(18,7,2,0.9)');
      gr.addColorStop(0.58, 'rgba(18,7,2,0.9)'); gr.addColorStop(0.75, 'rgba(255,210,160,0.16)'); gr.addColorStop(1, 'rgba(255,210,160,0)');
      g.fillStyle = gr; g.fillRect(x - 5, 0, 10, h);
    }
  }
  const darkWoodTex = tex(makeCanvas(512, 512, (g, w, h) => drawWood(g, w, h, mulberry(21), [82, 46, 24], 3)), { repeat: true });
  const STRIPES = [['#7a3b22', 5], ['#d9662b', 3], ['#efb23c', 3], ['#f1dfb8', 1.2], ['#2f7f72', 3], ['#27557f', 4], ['#f1dfb8', 1.2],
    ['#b8322a', 3], ['#e08a2e', 2], ['#4a2a1c', 4], ['#efb23c', 1.5], ['#2f7f72', 2], ['#d9662b', 4], ['#27557f', 2]];
  const blanketTex = tex(makeCanvas(256, 1024, (g, w, h) => {
    const rnd = mulberry(11);
    const total = STRIPES.reduce((s, a) => s + a[1], 0);
    let y = 0;
    for (const [c, wd] of STRIPES) { const hh = wd / total * h; g.fillStyle = c; g.fillRect(0, y, w, hh + 1); y += hh; }
    for (let i = 0; i < 26000; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,240,215,0.09)';
      g.fillRect(rnd() * w, rnd() * h, 1, 1 + rnd() * 3);
    }
    for (let x = 0; x < w; x += 4) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(x, 0, 1, h); }
  }), { repeat: true });

  /* The light mask on the plane just inside the blinds: the window opening, less the shadow of every slat, the rails and the muntins. */
  function muntinShadow() {
    const a = toCurt(MUNT.x - MUNT.t, 0, MUNT.z1)[0], b = toCurt(MUNT.x + MUNT.t, 0, MUNT.z0)[0];
    const c = toCurt(0, MUNT.y - MUNT.t, MUNT.z0)[1], d = toCurt(0, MUNT.y + MUNT.t, MUNT.z1)[1];
    return { vx0: a, vx1: b, hy0: c, hy1: d };
  }
  function slatBand(yc, half, thick) {                  // where a slat (or rail) at height yc falls on the mask plane
    const ys = [], zs = [-1, 1];
    for (const sgn of zs) for (const tt of [-thick, thick]) {
      const y = yc - sgn * half * Math.sin(BL.tilt) + tt, z = BL.z + sgn * half * Math.cos(BL.tilt);
      ys.push(toCurt(0, y, z)[1]);
    }
    return [Math.min.apply(null, ys), Math.max.apply(null, ys)];
  }
  const maskCanvas = (function () {
    const big = makeCanvas(512, 512, (g, S) => {
      const cx = (x) => (x - CURT.x0) / CW * S, cy = (y) => (1 - (y - CURT.y0) / CH) * S;
      g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
      g.save();
      g.beginPath(); g.rect(cx(OPEN.x0), cy(OPEN.y1), (OPEN.x1 - OPEN.x0) / CW * S, (OPEN.y1 - OPEN.y0) / CH * S); g.clip();
      g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#000';
      SLATS.forEach((y) => { const b = slatBand(y, BL.depth / 2, 0.001); g.fillRect(0, cy(b[1]), S, (b[1] - b[0]) / CH * S); });
      const rail = slatBand(BL.bottom, 0.016, 0.007); g.fillRect(0, cy(rail[1]), S, (rail[1] - rail[0]) / CH * S);
      const head = slatBand(BL.top + 0.03, 0.03, 0.03); g.fillRect(0, cy(head[1]), S, (head[1] - head[0]) / CH * S);
      const m = muntinShadow();
      g.fillRect(cx(m.vx0), 0, (m.vx1 - m.vx0) / CW * S, S);
      g.fillRect(0, cy(m.hy1), S, (m.hy1 - m.hy0) / CH * S);
      g.restore();
    });
    return makeCanvas(192, 192, (g, S) => { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(big, 0, 0, S, S); });
  })();
  const maskTex = tex(maskCanvas, { srgb: false, nomip: true });
  maskTex.wrapS = maskTex.wrapT = T.ClampToEdgeWrapping;
  /* Posters: original designs, drawn here. */
  function drawPosterSun(g, w, h) {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#102a3c'); bg.addColorStop(0.62, '#1f4458'); bg.addColorStop(1, '#13232e');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.40, R = w * 0.30;
    const sg = g.createLinearGradient(0, cy - R, 0, cy + R);
    sg.addColorStop(0, '#ffd34d'); sg.addColorStop(0.55, '#ff8a3c'); sg.addColorStop(1, '#e8455a');
    g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.fill();
    g.fillStyle = '#1c3f52';
    for (let i = 0; i < 6; i++) g.fillRect(cx - R - 4, cy + R * (0.06 + i * 0.16), 2 * R + 8, 4 + i * 3.2);
    g.fillStyle = '#16303f'; g.beginPath(); g.moveTo(0, h * 0.64);
    g.quadraticCurveTo(w * 0.28, h * 0.52, w * 0.55, h * 0.64); g.quadraticCurveTo(w * 0.8, h * 0.72, w, h * 0.6); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#0b1a24'; g.beginPath(); g.moveTo(0, h * 0.72);
    g.quadraticCurveTo(w * 0.3, h * 0.64, w * 0.6, h * 0.73); g.quadraticCurveTo(w * 0.85, h * 0.8, w, h * 0.7); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#f3e2c0'; g.textAlign = 'center';
    g.font = '900 58px "Arial Black", Impact, sans-serif'; g.fillText('VERANO 85', cx, h * 0.875);
    g.font = '700 19px Arial, sans-serif'; g.fillText('M Ú S I C A   ·   S O L   ·   M A R', cx, h * 0.92);
    g.strokeStyle = '#f3e2c0'; g.lineWidth = 10; g.strokeRect(16, 16, w - 32, h - 32);
  }
  function drawPosterShapes(g, w, h) {
    g.fillStyle = '#efe2c6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e2571c'; g.beginPath(); g.arc(w * 0.34, h * 0.33, w * 0.2, 0, 6.2832); g.fill();
    g.fillStyle = '#1f6f78'; g.beginPath(); g.moveTo(w * 0.52, h * 0.6); g.lineTo(w * 0.9, h * 0.6); g.lineTo(w * 0.71, h * 0.28); g.fill();
    g.fillStyle = '#f0b83d'; g.fillRect(w * 0.14, h * 0.58, w * 0.3, h * 0.2);
    g.strokeStyle = '#2b2a45'; g.lineWidth = 9; g.lineJoin = 'round'; g.beginPath();
    for (let i = 0; i <= 8; i++) { const x = w * (0.12 + i * 0.095), y = h * (0.88 + (i % 2 ? -0.03 : 0.03)); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
    g.fillStyle = '#2b2a45';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(w * (0.6 + i * 0.065), h * (0.68 + j * 0.035), 4.2, 0, 6.2832); g.fill(); }
    g.font = '900 44px "Arial Black", Impact, sans-serif'; g.textAlign = 'left'; g.fillText('HI-FI', w * 0.12, h * 0.15);
  }
  const posterSunTex = tex(makeCanvas(512, 768, drawPosterSun));
  const posterShapesTex = tex(makeCanvas(512, 640, drawPosterShapes));
  function drawPosterComet(g, w, h) {
    const rnd = mulberry(31);
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0b0d24'); bg.addColorStop(0.52, '#3b1d4a'); bg.addColorStop(0.74, '#c2493d'); bg.addColorStop(0.82, '#f29b4b');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(255,245,225,' + (0.25 + rnd() * 0.7) + ')'; const r = rnd() < 0.92 ? 0.8 : 1.8; g.beginPath(); g.arc(rnd() * w, rnd() * h * 0.66, r, 0, 6.2832); g.fill(); }
    const hx = w * 0.7, hy = h * 0.24;
    g.save(); g.translate(hx, hy); g.rotate(Math.PI + 0.62);
    const tg = g.createLinearGradient(0, 0, 380, 0);
    tg.addColorStop(0, 'rgba(255,250,230,0.95)'); tg.addColorStop(0.22, 'rgba(170,220,255,0.5)'); tg.addColorStop(1, 'rgba(120,150,255,0)');
    g.fillStyle = tg; g.beginPath(); g.moveTo(-6, 0); g.lineTo(380, -40); g.quadraticCurveTo(392, 2, 380, 46); g.closePath(); g.fill();
    g.restore();
    const hg = g.createRadialGradient(hx, hy, 0, hx, hy, 26); hg.addColorStop(0, '#fffdf2'); hg.addColorStop(0.3, 'rgba(220,240,255,0.8)'); hg.addColorStop(1, 'rgba(160,200,255,0)');
    g.fillStyle = hg; g.beginPath(); g.arc(hx, hy, 26, 0, 6.2832); g.fill();
    g.fillStyle = '#2a1530'; g.beginPath(); g.moveTo(0, h * 0.74); g.lineTo(w * 0.18, h * 0.66); g.lineTo(w * 0.32, h * 0.72); g.lineTo(w * 0.5, h * 0.62); g.lineTo(w * 0.7, h * 0.71); g.lineTo(w * 0.86, h * 0.65); g.lineTo(w, h * 0.7); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#140a18'; g.beginPath(); g.moveTo(0, h * 0.79); g.quadraticCurveTo(w * 0.35, h * 0.72, w * 0.62, h * 0.78); g.quadraticCurveTo(w * 0.84, h * 0.82, w, h * 0.76); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#f6e7c8'; g.textAlign = 'center';
    g.font = '900 66px "Arial Black", Impact, sans-serif'; g.fillText('COMETA 86', w / 2, h * 0.885, w - 50);
    g.font = '700 15px Arial, sans-serif'; g.fillText('A B R I L   ·   E L   C I E L O   D E L   S U R', w / 2, h * 0.93, w - 60);
    g.strokeStyle = 'rgba(246,231,200,0.8)'; g.lineWidth = 2; g.strokeRect(18, 18, w - 36, h - 36);
  }
  function drawPosterBridge(g, w, h) {
    g.fillStyle = '#f1e8d4'; g.fillRect(0, 0, w, h);
    const ih = h * 0.8, L = 26;
    g.save(); g.beginPath(); g.rect(L, L, w - 2 * L, ih - L); g.clip();
    const sky = g.createLinearGradient(0, 0, 0, ih);
    sky.addColorStop(0, '#2c2f55'); sky.addColorStop(0.42, '#a8516a'); sky.addColorStop(0.72, '#f0975a'); sky.addColorStop(1, '#f7c27c');
    g.fillStyle = sky; g.fillRect(0, 0, w, ih);
    g.fillStyle = 'rgba(255,222,160,0.95)'; g.beginPath(); g.arc(w * 0.66, ih * 0.7, 44, 0, 6.2832); g.fill();
    g.fillStyle = '#3d2c3e'; g.beginPath(); g.moveTo(0, ih * 0.66); g.quadraticCurveTo(w * 0.18, ih * 0.6, w * 0.34, ih * 0.74); g.lineTo(w, ih * 0.76); g.lineTo(w, ih); g.lineTo(0, ih); g.fill();
    const sea = g.createLinearGradient(0, ih * 0.76, 0, ih); sea.addColorStop(0, '#6a4560'); sea.addColorStop(1, '#221d36');
    g.fillStyle = sea; g.fillRect(0, ih * 0.76, w, ih);
    const red = '#c4472c', top = ih * 0.24, deck = ih * 0.71, x1 = w * 0.27, x2 = w * 0.8, xm = (x1 + x2) / 2, half = (x2 - x1) / 2;
    const cab = (x) => { const u = (x - xm) / half; return deck - 10 + (top + 6 - (deck - 10)) * u * u; };
    g.fillStyle = red;
    for (const tx of [x1, x2]) {
      g.fillRect(tx - 10, top, 7, ih - top); g.fillRect(tx + 3, top, 7, ih - top);
      for (const yy of [top, top + 34, top + 74, top + 120]) g.fillRect(tx - 10, yy, 20, 6);
    }
    g.fillRect(0, deck, w, 8);
    g.strokeStyle = red; g.lineWidth = 3; g.beginPath();
    for (let x = x1; x <= x2; x += 4) { if (x === x1) g.moveTo(x, cab(x)); else g.lineTo(x, cab(x)); }
    g.stroke();
    g.beginPath(); g.moveTo(x1, top + 6); g.quadraticCurveTo(x1 * 0.55, deck - 30, 0, deck - 4); g.stroke();
    g.beginPath(); g.moveTo(x2, top + 6); g.quadraticCurveTo(x2 + (w - x2) * 0.45, deck - 30, w, deck - 4); g.stroke();
    g.lineWidth = 1;
    for (let x = x1 + 10; x < x2 - 6; x += 9) { g.beginPath(); g.moveTo(x, cab(x)); g.lineTo(x, deck); g.stroke(); }
    g.restore();
    g.fillStyle = '#1e1b2e'; g.textAlign = 'center';
    g.font = '800 50px "Arial Black", Arial, sans-serif'; g.fillText('SAN FRANCISCO', w / 2, ih + 70, w - 60);
    g.font = '600 15px Arial, sans-serif'; g.fillText('C A L I F O R N I A', w / 2, ih + 104);
  }
  function drawPolaroid(g, w, h) {
    g.fillStyle = '#f3efe6'; g.fillRect(0, 0, w, h);
    const ph = h * 0.74;
    const sky = g.createLinearGradient(0, 12, 0, ph); sky.addColorStop(0, '#6f8fb4'); sky.addColorStop(0.7, '#e9b27e'); sky.addColorStop(1, '#d48a5c');
    g.fillStyle = sky; g.fillRect(12, 12, w - 24, ph - 12);
    g.fillStyle = '#3a3240';
    [[20, 40, 30], [48, 70, 24], [70, 52, 18], [94, 84, 30], [126, 60, 22], [150, 76, 26]].forEach(([x, hh, ww]) => g.fillRect(x, ph - hh, ww, hh));
    g.fillRect(112, ph - 128, 6, 50); g.fillRect(106, ph - 80, 18, 8);
    g.fillStyle = 'rgba(255,240,210,0.18)'; g.fillRect(12, 12, w - 24, ph - 12);
    g.fillStyle = '#3b3550'; g.font = 'italic 19px "Comic Sans MS", "Marker Felt", cursive'; g.textAlign = 'center'; g.fillText("verano '86", w / 2, h - 24);
  }
  const posterCometTex = tex(makeCanvas(512, 720, drawPosterComet));
  const posterBridgeTex = tex(makeCanvas(512, 704, drawPosterBridge));
  const polaroidTex = tex(makeCanvas(200, 240, drawPolaroid));

  /* VHS spines: one atlas, a cell per tape; titles are made up. */
  const VHS_TITLES = ['NOCHE DE NEÓN', 'EL ÚLTIMO VERANO', 'ROBOTS DEL VALLE', 'CARRERA 2000', 'PIRATAS DEL ESPACIO', 'LA ISLA PERDIDA', 'KARATE EN LA PLAYA', 'AGENTE DORADO',
    'EL REGRESO', 'TORMENTA SOLAR', 'LOS INVASORES', 'CAZADORES', 'LA MÁQUINA', 'DINO PARK', 'OCÉANO PROFUNDO', 'EL DRAGÓN', 'FUGA 85', 'PATINES', 'MISIÓN MARTE',
    'EL TESORO', 'LUCES DE CIUDAD', 'BAILE FINAL', 'EL CAMPEÓN', 'GALAXIA 9', 'SOMBRAS', 'LA PANDILLA', 'TURBO', 'EL VAGABUNDO', 'RAYO LÁSER', 'PANTANO', 'CINE EN CASA', 'VOLCÁN'];
  const VHS_COLS = 32, VHS_ROWS = 2, VHS_CW = 32, VHS_CH = 256, VHS_PAD = 32, VHS_H = VHS_ROWS * VHS_CH + VHS_PAD;
  const vhsTex = tex(makeCanvas(VHS_COLS * VHS_CW, VHS_H, (g, w) => {
    const rnd = mulberry(55);
    const PAL = [['#151515', '#e8d9b8'], ['#1d2f5a', '#f2c14e'], ['#b3261e', '#f4efe3'], ['#efe7d3', '#1a1a1a'], ['#e7b416', '#141414'],
      ['#1f6f6a', '#f4efe3'], ['#3a1f4d', '#ff7a3d'], ['#0f0f0f', '#e24a2b'], ['#2b2b2b', '#5fd0e0'], ['#f4efe3', '#b3261e']];
    for (let r = 0; r < VHS_ROWS; r++) for (let c = 0; c < VHS_COLS; c++) {
      const x = c * VHS_CW, y = r * VHS_CH, pal = PAL[(rnd() * PAL.length) | 0], bg = pal[0], fg = pal[1];
      g.fillStyle = bg; g.fillRect(x, y, VHS_CW, VHS_CH);
      if (rnd() < 0.6) { g.fillStyle = fg; g.fillRect(x, y + 10 + rnd() * 20, VHS_CW, 4 + rnd() * 10); }
      if (rnd() < 0.5) { g.fillStyle = PAL[(rnd() * PAL.length) | 0][1]; g.fillRect(x, y + VHS_CH - 48, VHS_CW, 16); }
      g.save(); g.translate(x + VHS_CW / 2 + 6, y + VHS_CH - 60); g.rotate(-Math.PI / 2);
      g.fillStyle = fg; g.font = (rnd() < 0.5 ? '900 ' : '700 ') + (14 + ((rnd() * 3) | 0)) + 'px "Arial Narrow", Arial, sans-serif';
      g.fillText(VHS_TITLES[(r * VHS_COLS + c) % VHS_TITLES.length], 0, 0, VHS_CH - 84);
      g.restore();
      g.fillStyle = fg; g.globalAlpha = 0.85; g.fillRect(x + 8, y + VHS_CH - 24, VHS_CW - 16, 12); g.globalAlpha = 1;
      for (let k = 0; k < 70; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.09)'; g.fillRect(x + rnd() * VHS_CW, y + rnd() * VHS_CH, 1, 1 + rnd() * 3); }
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x, y, 1.5, VHS_CH); g.fillRect(x + VHS_CW - 1.5, y, 1.5, VHS_CH);
    }
    g.fillStyle = '#1c1916'; g.fillRect(0, VHS_ROWS * VHS_CH, w, VHS_PAD);
  }));

  /* cloth-bound books: one atlas, a spine per cell, pages in the strip at the bottom */
  const BK_N = 16, BK_CW = 48, BK_CH = 320, BK_PAD = 32, BK_W = BK_N * BK_CW, BK_H = BK_CH + BK_PAD;
  const bookTex = tex(makeCanvas(BK_W, BK_H, (g) => {
    const rnd = mulberry(71);
    const CLOTH = ['#6b1f1a', '#1f3a2c', '#23304f', '#5a4632', '#7a5a1e', '#3b2a3f', '#8a7356', '#2c2c2c', '#9c4a24', '#40503a'];
    for (let c = 0; c < BK_N; c++) {
      const x = c * BK_CW, col = CLOTH[(rnd() * CLOTH.length) | 0];
      g.fillStyle = col; g.fillRect(x, 0, BK_CW, BK_CH);
      for (let k = 0; k < 400; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,240,210,0.07)'; g.fillRect(x + rnd() * BK_CW, rnd() * BK_CH, 1, 1 + rnd() * 2); }
      const gold = rnd() < 0.7 ? '#c9a45a' : '#e8dcc0';
      g.fillStyle = gold;
      for (const y of [26, 34, BK_CH - 40, BK_CH - 32]) g.fillRect(x + 4, y, BK_CW - 8, 2.5);
      g.save(); g.translate(x + BK_CW / 2 + 6, BK_CH - 60); g.rotate(-Math.PI / 2);
      g.font = 'italic 700 15px Georgia, serif'; g.fillText(['Cuentos', 'Historia', 'El mar', 'Poemas', 'Atlas', 'Viajes', 'Ensayos', 'La ciudad'][c % 8], 0, 0, BK_CH - 120);
      g.restore();
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 2, BK_CH); g.fillRect(x + BK_CW - 2, 0, 2, BK_CH);
    }
    g.fillStyle = '#e9dfc8'; g.fillRect(0, BK_CH, BK_W, BK_PAD);
    for (let y = BK_CH; y < BK_H; y += 2) { g.fillStyle = 'rgba(120,100,70,0.25)'; g.fillRect(0, y, BK_W, 1); }
  }));
  const globeTex = tex(makeCanvas(512, 256, (g, w, h) => {
    const rnd = mulberry(77), D = [];
    for (let k = 0; k < 14; k++) { const th = rnd() * 6.2832, z = rnd() * 2 - 1, sn = Math.sqrt(1 - z * z); D.push([sn * Math.cos(th), sn * Math.sin(th), z, 1.6 + rnd() * 4.4, rnd() * 6.2832, 1 / (1 + k * 0.35)]); }
    const img = g.createImageData(w, h), px = img.data;
    for (let j = 0; j < h; j++) {
      const lat = (0.5 - (j + 0.5) / h) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      for (let i = 0; i < w; i++) {
        const lon = (i + 0.5) / w * 6.2832, p0 = cl * Math.cos(lon), p1 = cl * Math.sin(lon);
        let f = 0; for (const d of D) f += d[5] * Math.sin((p0 * d[0] + p1 * d[1] + sl * d[2]) * d[3] + d[4]);
        let c;
        if (Math.abs(lat) > 1.27) c = [234, 226, 206];
        else if (f > 0.45) { const t = clamp((f - 0.45) * 1.4, 0, 1); c = [lerp(204, 132, t), lerp(176, 150, t), lerp(108, 84, t)]; }
        else { const t = clamp((0.45 - f) * 0.7, 0, 1); c = [lerp(96, 44, t), lerp(156, 104, t), lerp(162, 140, t)]; }
        const o = (j * w + i) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(60,40,20,0.28)'; g.lineWidth = 1;
    for (let k = 1; k < 12; k++) { g.beginPath(); g.moveTo(k * w / 12, 0); g.lineTo(k * w / 12, h); g.stroke(); }
    for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(0, k * h / 6); g.lineTo(w, k * h / 6); g.stroke(); }
    g.fillStyle = 'rgba(210,150,60,0.14)'; g.fillRect(0, 0, w, h);                // aged varnish
  }));

  const boomTex = tex(makeCanvas(512, 240, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#3b3b3e'); bg.addColorStop(1, '#1d1d1f');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9c6bd'; g.fillRect(16, 12, w - 32, 34);
    g.fillStyle = '#161616'; g.fillRect(150, 18, 212, 22);
    g.fillStyle = '#e8e2cf'; g.font = '700 10px Arial, sans-serif'; ['88', '92', '96', '100', '104', '108'].forEach((t, i) => g.fillText(t, 158 + i * 34, 33));
    g.fillStyle = '#ff6a1a'; g.fillRect(238, 18, 2, 22);
    for (let i = 0; i < 6; i++) { g.fillStyle = i === 0 ? '#b3261e' : '#d4cfc4'; g.fillRect(26 + i * 18, 20, 14, 18); }
    g.fillStyle = '#d4cfc4'; for (let i = 0; i < 3; i++) g.fillRect(380 + i * 34, 22, 26, 14);
    for (const cx of [100, w - 100]) {
      const cy = 142, R = 72;
      g.fillStyle = '#aaa69d'; g.beginPath(); g.arc(cx, cy, R + 6, 0, 6.2832); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(170,170,170,0.32)';
      for (let y = -R; y <= R; y += 5) for (let x = -R; x <= R; x += 5) if (x * x + y * y < R * R * 0.94) g.fillRect(cx + x, cy + y, 1.7, 1.7);
      g.fillStyle = '#2b2b2b'; g.beginPath(); g.arc(cx, cy, R * 0.26, 0, 6.2832); g.fill();
    }
    g.fillStyle = '#0e0e0f'; g.fillRect(196, 70, 120, 96);
    g.strokeStyle = '#8f8b82'; g.lineWidth = 3; g.strokeRect(196, 70, 120, 96);
    g.fillStyle = 'rgba(140,124,100,0.55)'; g.fillRect(208, 92, 96, 48);
    g.fillStyle = '#ece5d2'; g.beginPath(); g.arc(232, 116, 11, 0, 6.2832); g.fill(); g.beginPath(); g.arc(280, 116, 11, 0, 6.2832); g.fill();
    g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(232, 116, 4, 0, 6.2832); g.fill(); g.beginPath(); g.arc(280, 116, 4, 0, 6.2832); g.fill();
    g.fillStyle = '#d4cfc4'; for (let i = 0; i < 5; i++) g.fillRect(200 + i * 23, 176, 18, 20);
    g.fillStyle = '#e8e2cf'; g.font = '900 13px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('STEREO  CASSETTE', w / 2, 222);
  }));
  const vcrPaint = (emis) => (g, w, h) => {
    g.fillStyle = emis ? '#000' : '#232120'; g.fillRect(0, 0, w, h);
    if (!emis) {
      g.fillStyle = '#121110'; g.fillRect(120, 20, 210, 30); g.fillStyle = '#2d2b29'; g.fillRect(124, 24, 202, 4);
      g.fillStyle = '#8f8a80'; for (let i = 0; i < 6; i++) g.fillRect(124 + i * 34, 64, 26, 10);
      g.fillStyle = '#0a0a0a'; g.fillRect(372, 24, 110, 38);
      g.fillStyle = '#d8d2c4'; g.font = '700 13px Arial, sans-serif'; g.fillText('VIDEO', 24, 40);
      g.fillStyle = '#b3261e'; g.beginPath(); g.arc(30, 66, 4, 0, 6.2832); g.fill();
    }
    g.fillStyle = emis ? '#45ff78' : '#1f6b38'; g.font = '700 26px "Courier New", monospace'; g.fillText('12:00', 384, 53);
  };
  const vcrTex = tex(makeCanvas(512, 96, vcrPaint(false)));
  const vcrEmTex = tex(makeCanvas(512, 96, vcrPaint(true)));

  /* ───────────────────────── materials ───────────────────────── */
  const wallMat = new T.MeshStandardMaterial({ color: 0xe6d6bc, roughness: 0.92 });
  const furnMat = new T.MeshStandardMaterial({ map: darkWoodTex, roughness: 0.4 });
  wallMat.userData.envK = 0.25; furnMat.userData.envK = 0.7;
  const ceilMat = new T.MeshStandardMaterial({ color: 0xcdbb9a, roughness: 0.95 });
  const floorMat = new T.MeshStandardMaterial({ color: 0x7a4e2c, roughness: 0.6 });
  floorMat.userData.envK = 0.6;
  const paintMat = new T.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.5 });
  const brassMat = new T.MeshStandardMaterial({ color: 0xb08a4a, metalness: 1, roughness: 0.34 });
  const sheetMat = new T.MeshStandardMaterial({ color: 0xece2d0, roughness: 0.9 });
  const blanketMat = new T.MeshPhysicalMaterial({ map: blanketTex, roughness: 1, sheen: 1, sheenRoughness: 0.5, sheenColor: new T.Color(0.75, 0.55, 0.38), side: T.DoubleSide });
  blanketMat.onBeforeCompile = (sh) => {               // the duvet's underside is its cream lining
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n\tif (!gl_FrontFacing) diffuseColor.rgb = vec3(0.70, 0.62, 0.50);');
  };
  const tvBodyMat = new T.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.5 });
  const linenMat = new T.MeshStandardMaterial({ color: 0x24392f, roughness: 1 });
  const oakMat = new T.MeshStandardMaterial({ color: 0xb08350, roughness: 0.5 });      // the lighter furniture: desk and dresser
  oakMat.userData.envK = 0.6;
  const clayMat = new T.MeshStandardMaterial({ color: 0xb4623a, roughness: 0.85 });
  const denimMat = new T.MeshStandardMaterial({ color: 0x4a6386, roughness: 1, side: T.DoubleSide });
  // small things share three vertex-coloured materials, so a whole shelf of clutter is one draw call
  const matteMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, side: T.DoubleSide });
  const glossMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.3 });
  const metalMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 1 });
  glossMat.userData.envK = 0.9; matteMat.userData.envK = 0.3;
  const envMats = [brassMat, tvBodyMat, wallMat, furnMat, floorMat, oakMat, glossMat, metalMat, matteMat, paintMat];

  /* photo textures (CC0, Poly Haven), swapped in as they arrive; the drawn ones stand in until then */
  const loader = new T.TextureLoader();
  let envStale = false;
  function photo(name, srgb, rep, apply) {
    loader.load(texBase + name + '.jpg', (t) => {
      t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = Math.min(8, maxAniso);
      if (srgb) t.colorSpace = T.SRGBColorSpace;
      t.repeat.set(rep[0], rep[1]);
      apply(t); envStale = true;
    });
  }
  const set = (mats, key, extra) => (t) => mats.forEach((m) => { m[key] = t; if (extra) extra(m); m.needsUpdate = true; });
  // walls: painted plaster, warm cream, a little worn
  photo('plaster_diff', true, [1.6 / 1.8, 3.6 / 1.8], set([wallMat], 'map', (m) => { m.color.set(0xf4e2c6); }));
  photo('plaster_nor', false, [1.6 / 1.8, 3.6 / 1.8], set([wallMat], 'normalMap', (m) => { m.normalScale.set(0.7, 0.7); }));
  photo('plaster_rough', false, [1.6 / 1.8, 3.6 / 1.8], set([wallMat], 'roughnessMap', (m) => { m.roughness = 1; }));
  photo('wood_diff', true, [0.8 / 0.7, 0.8 / 0.7], set([furnMat], 'map', (m) => { m.color.set(0xd8b8a0); }));
  photo('wood_nor', false, [0.8 / 0.7, 0.8 / 0.7], set([furnMat], 'normalMap'));
  photo('wood_rough', false, [0.8 / 0.7, 0.8 / 0.7], set([furnMat], 'roughnessMap', (m) => { m.roughness = 0.8; }));
  photo('oak_diff', true, [0.8 / 0.9, 0.8 / 0.9], set([oakMat], 'map', (m) => { m.color.set(0xe2c6a4); }));
  photo('wood_nor', false, [0.8 / 0.9, 0.8 / 0.9], set([oakMat], 'normalMap', (m) => { m.normalScale.set(0.5, 0.5); }));
  // floor: old varnished boards
  photo('floor_diff', true, [0.9 / 2.2, 0.9 / 2.2], set([floorMat], 'map', (m) => { m.color.set(0xffffff); }));
  photo('floor_nor', false, [0.9 / 2.2, 0.9 / 2.2], set([floorMat], 'normalMap'));
  photo('floor_rough', false, [0.9 / 2.2, 0.9 / 2.2], set([floorMat], 'roughnessMap', (m) => { m.roughness = 0.85; }));
  photo('wool_nor', false, [5, 5], set([blanketMat, linenMat], 'normalMap', (m) => { m.normalScale.set(1.4, 1.4); }));
  photo('wool_rough', false, [5, 5], set([blanketMat, linenMat], 'roughnessMap'));
  photo('cotton_nor', false, [3.5, 3.5], set([sheetMat], 'normalMap', (m) => { m.normalScale.set(0.8, 0.8); }));
  photo('denim_diff', true, [1, 1], set([denimMat], 'map', (m) => { m.color.set(0xb9c4d8); }));
  photo('denim_nor', false, [1, 1], set([denimMat], 'normalMap', (m) => { m.normalScale.set(1.2, 1.2); }));

  /* ───────────────────────── geometry helpers ───────────────────────── */
  function bevelBox(w, h, d, r) {
    const g = new T.BoxGeometry(w, h, d, 3, 3, 3);
    if (r <= 0) return g;
    const p = g.attributes.position, n = g.attributes.normal;
    const Hh = [w / 2, h / 2, d / 2], I = Hh.map((q) => q - r), a = [0, 0, 0], c = V3(), v = V3();
    for (let i = 0; i < p.count; i++) {
      a[0] = p.getX(i); a[1] = p.getY(i); a[2] = p.getZ(i);
      for (let k = 0; k < 3; k++) if (Math.abs(Math.abs(a[k]) - Hh[k]) > 1e-7) a[k] = Math.sign(a[k]) * I[k];
      c.set(clamp(a[0], -I[0], I[0]), clamp(a[1], -I[1], I[1]), clamp(a[2], -I[2], I[2]));
      v.set(a[0], a[1], a[2]).sub(c);
      if (v.lengthSq() < 1e-14) v.fromBufferAttribute(n, i);
      v.normalize();
      n.setXYZ(i, v.x, v.y, v.z);
      p.setXYZ(i, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r);
    }
    return g;
  }
  function boxWU(x0, x1, y0, y1, z0, z1, su, sv, r) {
    su = su || 1.6; sv = sv || 3.6;
    const g = bevelBox(x1 - x0, y1 - y0, z1 - z0, r || 0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
      if (nx >= ny && nx >= nz) uv.setXY(i, p.getZ(i) / su, p.getY(i) / sv);
      else if (ny >= nz) uv.setXY(i, p.getX(i) / su, p.getZ(i) / sv);
      else uv.setXY(i, p.getX(i) / su, p.getY(i) / sv);
    }
    return g;
  }
  function roundedBox(w, h, d, r, sx, sy, sz) {
    const g = new T.BoxGeometry(w, h, d, sx || 5, sy || 5, sz || 5);
    const p = g.attributes.position, n = g.attributes.normal;
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, v = V3(), c = V3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz));
      v.sub(c);
      if (v.lengthSq() < 1e-12) v.fromBufferAttribute(n, i);
      v.normalize();
      n.setXYZ(i, v.x, v.y, v.z);
      p.setXYZ(i, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r);
    }
    return g;
  }
  /* Everything static is collected per material and merged into one mesh each (flush): a full room, few draw calls.
     at() places a piece of furniture: what is built inside it is built in its own space. */
  const batches = new Map();
  let xf = null;
  const M4 = (x, y, z, ry, rx, rz) => new T.Matrix4().compose(V3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')), V3(1, 1, 1));
  function at(x, y, z, ry, fn, rx, rz) {
    const prev = xf, m = M4(x, y, z, ry, rx, rz);
    xf = prev ? prev.clone().multiply(m) : m;
    fn();
    xf = prev;
  }
  function put(mat, g) {
    if (!g.index) { const n = g.attributes.position.count, ix = new Array(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(ix); }
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && !(k === 'color' && mat.vertexColors)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    if (xf) g.applyMatrix4(xf);
    let list = batches.get(mat);
    if (!list) batches.set(mat, list = []);
    list.push(g);
    return g;
  }
  function addMesh(m) {                                 // a mesh of its own (animated or with its own texture), placed like the rest
    m.updateMatrix();
    if (xf) { m.applyMatrix4(xf); m.updateMatrix(); }
    if (m.castShadow !== false) m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  function flush() {
    batches.forEach((list, mat) => {
      const m = new T.Mesh(mergeGeometries(list, false), mat);
      m.castShadow = true; m.receiveShadow = true; scene.add(m);
      list.forEach((g) => g.dispose());
    });
    batches.clear();
  }
  function addBox(x0, x1, y0, y1, z0, z1, mat, su, sv) {
    const shell = mat === wallMat || mat === ceilMat || mat === floorMat;
    const r = shell ? 0 : Math.min(0.007, 0.22 * Math.min(x1 - x0, y1 - y0, z1 - z0));
    return put(mat, boxWU(x0, x1, y0, y1, z0, z1, su, sv, r));
  }
  const wood = (x0, x1, y0, y1, z0, z1, mat) => addBox(x0, x1, y0, y1, z0, z1, mat || furnMat, 0.8, 0.8);
  const tintC = new T.Color();
  function tint(g, hex) {
    tintC.set(hex);
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = tintC.r; a[i * 3 + 1] = tintC.g; a[i * 3 + 2] = tintC.b; }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    return g;
  }
  const matte = (g, hex) => put(matteMat, tint(g, hex));
  const gloss = (g, hex) => put(glossMat, tint(g, hex));
  const metal = (g, hex) => put(metalMat, tint(g, hex));
  const CHROME = 0xc8c8cc, BRASS = 0xb08a4a;
  const mv = (g, x, y, z, ry, rx, rz) => { if (ry || rx || rz) g.applyMatrix4(M4(0, 0, 0, ry, rx, rz)); g.translate(x, y, z); return g; };
  const rbox = (w, h, d, r, x, y, z, ry, rx, rz) => mv(bevelBox(w, h, d, r), x, y, z, ry, rx, rz);
  const lathe = (pts, seg) => new T.LatheGeometry(pts.map((q) => new T.Vector2(q[0], q[1])), seg || 24);
  const cyl = (r0, r1, h, seg, open) => new T.CylinderGeometry(r0, r1, h, seg || 16, 1, !!open);
  const smooth = T.MathUtils.smoothstep;

  /* ───────────────────────── room shell ───────────────────────── */
  (function buildRoom() {
    const R = ROOM;
    // the back wall is one slab with the window cut out of it: no seams for the low sun to leak through
    const ws = new T.Shape(); ws.moveTo(R.xMin, 0); ws.lineTo(R.xMax, 0); ws.lineTo(R.xMax, R.yMax); ws.lineTo(R.xMin, R.yMax); ws.closePath();
    const wh = new T.Path(); wh.moveTo(WIN.x0, WIN.y0); wh.lineTo(WIN.x0, WIN.y1); wh.lineTo(WIN.x1, WIN.y1); wh.lineTo(WIN.x1, WIN.y0); wh.closePath(); ws.holes.push(wh);
    const wg = new T.ExtrudeGeometry(ws, { depth: WT, bevelEnabled: false }); wg.translate(0, 0, R.zBack - WT);
    const wp = wg.attributes.position, wn = wg.attributes.normal, wuv = wg.attributes.uv;
    for (let i = 0; i < wp.count; i++) {
      const nx = Math.abs(wn.getX(i)), ny = Math.abs(wn.getY(i)), nz = Math.abs(wn.getZ(i));
      if (nx >= ny && nx >= nz) wuv.setXY(i, wp.getZ(i) / 1.6, wp.getY(i) / 3.6);
      else if (ny >= nz) wuv.setXY(i, wp.getX(i) / 1.6, wp.getZ(i) / 3.6);
      else wuv.setXY(i, wp.getX(i) / 1.6, wp.getY(i) / 3.6);
    }
    put(wallMat, wg);
    addBox(R.xMin - WT, R.xMin, 0, R.yMax, R.zBack - WT, R.zFront + WT, wallMat);
    addBox(R.xMax, R.xMax + WT, 0, R.yMax, R.zBack - WT, R.zFront + WT, wallMat);
    addBox(R.xMin, R.xMax, 0, R.yMax, R.zFront, R.zFront + WT, wallMat);
    addBox(R.xMin - WT, R.xMax + WT, R.yMax, R.yMax + WT, R.zBack - WT, R.zFront + WT, ceilMat);
    addBox(R.xMin - WT, R.xMax + WT, -WT, 0, R.zBack - WT, R.zFront + WT, floorMat, 0.9, 0.9);
    // baseboard with a quarter-round shoe, and a slim picture rail under the ceiling
    wood(R.xMin, R.xMax, 0, 0.09, R.zBack, R.zBack + 0.016);
    wood(R.xMin, R.xMax, 0, 0.018, R.zBack + 0.016, R.zBack + 0.03);
    wood(R.xMin, R.xMin + 0.016, 0, 0.09, R.zBack, R.zFront);
    wood(R.xMin + 0.016, R.xMin + 0.03, 0, 0.018, R.zBack, R.zFront);
    wood(R.xMax - 0.016, R.xMax, 0, 0.09, R.zBack, R.zFront);
    wood(R.xMax - 0.03, R.xMax - 0.016, 0, 0.018, R.zBack, R.zFront);
    wood(R.xMin, R.xMax, R.yMax - 0.07, R.yMax, R.zBack, R.zBack + 0.018);
    wood(R.xMin, R.xMax, R.yMax - 0.03, R.yMax, R.zBack + 0.018, R.zBack + 0.038);
    wood(R.xMin, R.xMin + 0.018, R.yMax - 0.07, R.yMax, R.zBack, R.zFront);
    wood(R.xMin + 0.018, R.xMin + 0.038, R.yMax - 0.03, R.yMax, R.zBack, R.zFront);
    wood(R.xMax - 0.018, R.xMax, R.yMax - 0.07, R.yMax, R.zBack, R.zFront);
    wood(R.xMax - 0.038, R.xMax - 0.018, R.yMax - 0.03, R.yMax, R.zBack, R.zFront);
    // window frame, sill and muntins
    addBox(WIN.x0 - 0.06, WIN.x0, WIN.y0 - 0.06, WIN.y1 + 0.06, zOut, zIn, paintMat);
    addBox(WIN.x1, WIN.x1 + 0.06, WIN.y0 - 0.06, WIN.y1 + 0.06, zOut, zIn, paintMat);
    addBox(WIN.x0, WIN.x1, WIN.y1, WIN.y1 + 0.06, zOut, zIn, paintMat);
    addBox(WIN.x0 - 0.09, WIN.x1 + 0.09, WIN.y0 - 0.045, WIN.y0, zOut, zSill, paintMat);
    addBox(WIN.x0 - 0.07, WIN.x1 + 0.07, WIN.y0 - 0.1, WIN.y0 - 0.045, R.zBack, R.zBack + 0.018, paintMat);   // apron under the sill
    addBox(MUNT.x - MUNT.t, MUNT.x + MUNT.t, WIN.y0, WIN.y1, MUNT.z0, MUNT.z1, paintMat);
    addBox(WIN.x0, WIN.x1, MUNT.y - MUNT.t, MUNT.y + MUNT.t, MUNT.z0, MUNT.z1, paintMat);
    // a light switch on the wall by the desk, an outlet low on the left wall
    addBox(R.xMax - 0.006, R.xMax, 1.14, 1.255, -0.5, -0.428, paintMat, 0.2, 0.2);
    addBox(R.xMax - 0.016, R.xMax - 0.006, 1.185, 1.21, -0.47, -0.458, paintMat, 0.2, 0.2);
    addBox(R.xMin, R.xMin + 0.006, 0.26, 0.375, -0.2, -0.128, paintMat, 0.2, 0.2);
    for (const y of [0.29, 0.335]) for (const dz of [-0.008, 0.008]) matte(rbox(0.002, 0.012, 0.004, 0, R.xMin + 0.0065, y + 0.006, -0.164 + dz), 0x1a1612);
  })();
  const skyTex = tex(makeCanvas(512, 512, (g, w, h) => {
    const rnd = mulberry(17);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe2b0'); gr.addColorStop(0.6, '#ffd08c'); gr.addColorStop(1, '#f4b070');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {                        // a tree outside, out of focus
      const x = w * (0.05 + rnd() * 0.75), y = h * (0.05 + rnd() * 0.7), r = 18 + rnd() * 50;
      const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(70,62,30,0.38)'); rg.addColorStop(1, 'rgba(70,62,30,0)');
      g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    g.strokeStyle = 'rgba(60,45,30,0.35)'; g.lineWidth = 14; g.beginPath(); g.moveTo(w * 0.32, h); g.quadraticCurveTo(w * 0.36, h * 0.6, w * 0.3, h * 0.3); g.stroke();
  }));
  const skyMat = new T.MeshBasicMaterial({ color: 0xffffff, map: skyTex });
  const sky = new T.Mesh(new T.PlaneGeometry(3.4, 3.4), skyMat);
  sky.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, ROOM.zBack - 0.5);
  scene.add(sky);

  /* venetian blinds, tilted half open, raised a hand above the sill */
  const blindMat = new T.MeshStandardMaterial({ color: 0xeadfc6, roughness: 0.42, metalness: 0.15, side: T.DoubleSide, shadowSide: T.DoubleSide,
    emissive: new T.Color(1.0, 0.72, 0.4), emissiveIntensity: 0.22 });
  (function buildBlinds() {
    const W = BL.x1 - BL.x0, xc = (BL.x0 + BL.x1) / 2;
    SLATS.forEach((y, k) => {
      const g = new T.BoxGeometry(W, 0.0012, BL.depth, 1, 1, 2), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.0018 * (1 - Math.pow(p.getZ(i) / (BL.depth / 2), 2)));   // a slight crown
      g.rotateX(BL.tilt + (k === 6 || k === 17 ? 0.18 : 0));            // a couple of slats bent out of line
      g.translate(xc, y, BL.z); put(blindMat, g);
    });
    addBox(BL.x0 - 0.008, BL.x1 + 0.008, BL.top, BL.top + 0.05, BL.z - 0.026, BL.z + 0.026, blindMat);
    addBox(BL.x0, BL.x1, BL.bottom - 0.007, BL.bottom + 0.007, BL.z - 0.016, BL.z + 0.016, blindMat);
    for (const fx of [0.12, 0.5, 0.88]) for (const dz of [-1, 1]) matte(rbox(0.0024, BL.top - BL.bottom, 0.0012, 0, BL.x0 + W * fx, (BL.top + BL.bottom) / 2, BL.z + dz * 0.0135), 0xd9ccb0);
    matte(mv(cyl(0.004, 0.004, 0.62, 8), BL.x1 - 0.03, BL.top - 0.31, BL.z + 0.03), 0xd9ccb0);
    matte(mv(cyl(0.0012, 0.0012, 0.78, 5), BL.x0 + 0.035, BL.top - 0.39, BL.z + 0.03), 0xd9ccb0);        // the lift cord
    matte(mv(lathe([[0, 0], [0.006, 0.004], [0.007, 0.022], [0.003, 0.028], [0, 0.028]], 10), BL.x0 + 0.035, BL.top - 0.805, BL.z + 0.03), 0xe6dccb);
    // on the sill, under the blinds: a succulent, a green bottle, two cassettes
    const sx = WIN.x1 - 0.2, sz = ROOM.zBack - 0.004, sy = WIN.y0;
    put(clayMat, mv(lathe([[0, 0], [0.032, 0], [0.04, 0.07], [0.044, 0.072], [0.044, 0.085], [0.038, 0.085], [0.036, 0.075], [0, 0.075]]), sx, sy, sz));
    for (let k = 0; k < 14; k++) {
      const a = k * 2.39996, r = 0.01 + 0.0022 * k, lf = new T.SphereGeometry(1, 10, 8);
      lf.scale(0.012, 0.006, 0.026 - k * 0.0006);
      gloss(mv(lf, sx + Math.cos(a) * r, sy + 0.085 + 0.012 - k * 0.0006, sz + Math.sin(a) * r, -a + Math.PI / 2, 0.5 - k * 0.02), 0x7f9a7a);
    }
    gloss(mv(lathe([[0, 0], [0.026, 0], [0.028, 0.004], [0.028, 0.1], [0.022, 0.125], [0.011, 0.14], [0.011, 0.175], [0.013, 0.178], [0.013, 0.186], [0, 0.186]], 20), WIN.x0 + 0.16, sy, sz + 0.005), 0x2f5a3a);
    gloss(rbox(0.108, 0.016, 0.068, 0.002, WIN.x0 + 0.34, sy + 0.008, sz + 0.012, 0.3), 0xd8d2c4);
    gloss(rbox(0.108, 0.016, 0.068, 0.002, WIN.x0 + 0.345, sy + 0.0245, sz + 0.01, -0.12), 0x2b2b2b);
  })();

  /* ───────────────────────── bed ───────────────────────── */
  let bedSpots = null, duvetMesh = null;
  (function buildBed() {
    const hw = BED.w / 2, zH = BED.zHead, zF = zH + BED.len, PX = hw + 0.034;
    // frame: side rails and a foot rail hold the mattress, slats under it, two legs at the foot
    for (const sx of [-1, 1]) {
      wood(sx * (hw - 0.03) - 0.016, sx * (hw - 0.03) + 0.016, 0.17, 0.298, zH - 0.03, zF - 0.012);
      wood(sx * (hw - 0.05) - 0.028, sx * (hw - 0.05) + 0.028, 0, 0.29, zF - 0.075, zF - 0.02);
    }
    wood(-hw + 0.03, hw - 0.03, 0.17, 0.298, zF - 0.04, zF - 0.012);
    wood(-hw + 0.04, hw - 0.04, 0.262, 0.298, zH - 0.02, zF - 0.04);
    for (const sx of [-1, 1]) {                                                 // headboard: posts, rails, slats
      wood(sx * PX - 0.032, sx * PX + 0.032, 0, 0.98, zH - 0.066, zH);                    // the bed stands a hand off the wall, clear of the sill
      wood(sx * PX - 0.04, sx * PX + 0.04, 0.98, 1.006, zH - 0.069, zH + 0.007);
      put(furnMat, mv(new T.SphereGeometry(0.033, 20, 14), sx * PX, 1.032, zH - 0.033));
    }
    wood(-PX + 0.03, PX - 0.03, 0.83, 0.93, zH - 0.06, zH - 0.008);
    wood(-PX + 0.03, PX - 0.03, 0.46, 0.54, zH - 0.055, zH - 0.012);
    for (let k = 0; k < 5; k++) { const x = -0.36 + k * 0.18; wood(x - 0.032, x + 0.032, 0.54, 0.83, zH - 0.05, zH - 0.018); }
    // mattress in its fitted sheet; the pillow presses a hollow into it
    const PIL = { x: 0.015, z: zH + 0.3, rx: 0.33, rz: 0.21, sink: 0.022 };
    const MH = 0.22, mzc = zH + BED.len / 2;
    const mg = roundedBox(BED.w, MH, BED.len, 0.06, 28, 4, 56), mgp = mg.attributes.position;
    for (let i = 0; i < mgp.count; i++) {
      if (mgp.getY(i) < MH * 0.3) continue;
      const e = Math.hypot((mgp.getX(i) - PIL.x) / PIL.rx, (mgp.getZ(i) + mzc - PIL.z) / PIL.rz);
      mgp.setY(i, mgp.getY(i) - PIL.sink * (1 - smooth(e, 0.7, 1.25)));
    }
    mg.computeVertexNormals();
    const mattress = new T.Mesh(mg, sheetMat);
    mattress.position.set(0, BED.top - MH / 2, mzc); mattress.castShadow = true; mattress.receiveShadow = true; scene.add(mattress);

    // duvet: one continuous quilted sheet. It lies on the mattress, wraps its sides and foot and hangs in folds,
    // and at the head it is turned back on itself so the lining shows. Things set on it press it down.
    const yM = BED.top, xHalf = hw + 0.014, zFoot = zF + 0.014, rM = 0.06, th = 0.05, HANG = 0.21;
    const wrap = (c, edge) => {                       // distance across the surface -> [offset along, drop, angle]
      const ac = Math.abs(c), sg = Math.sign(c) || 1, flat = edge - rM;
      if (ac <= flat) return [c, 0, 0];
      const arc = ac - flat;
      if (arc <= rM * Math.PI / 2) { const q = arc / rM; return [sg * (flat + rM * Math.sin(q)), -rM * (1 - Math.cos(q)), sg * q]; }
      return [sg * edge, -rM - (arc - rM * Math.PI / 2), sg * Math.PI / 2];
    };
    const zWrap = (b) => { if (b <= zFoot - rM) return [b, 0, 0]; const r = wrap(b - (zFoot - 1.7), 1.7); return [r[0] + (zFoot - 1.7), r[1], r[2]]; };
    // the profile along the bed: the turned-back flap, the fold, then the body to the hem past the foot
    const zFold = zH + 0.6, zFlap = zFold + 0.33, prof = [];
    for (let i = 0; i <= 22; i++) { const t = i / 22, edge = Math.min(1, t / 0.12); prof.push([lerp(zFlap, zFold, t), th * (1.15 + 0.75 * Math.sin(edge * Math.PI / 2)), 1]); }
    for (let i = 1; i <= 12; i++) { const f = i / 12 * Math.PI; prof.push([zFold - 0.7 * th * Math.sin(f), 1.2 * th + 0.7 * th * Math.cos(f), 0]); }
    const zEnd = zFoot - rM + rM * Math.PI / 2 + HANG;
    for (let i = 1; i <= 96; i++) prof.push([lerp(zFold, zEnd, i / 96), 0.5 * th, 0]);
    let acc = 0; const sArc = prof.map((p, i) => (acc += i ? Math.hypot(p[0] - prof[i - 1][0], p[1] - prof[i - 1][1]) : 0));
    const AH = xHalf - rM + rM * Math.PI / 2 + HANG, NA = 80, NS = prof.length;
    const pos = new Float32Array(NS * (NA + 1) * 3), uvs = new Float32Array(NS * (NA + 1) * 2), up = new Float32Array(NS * (NA + 1));
    const ridge = (s2, a) => 0.045 * Math.exp(-Math.pow(s2 - 0.98 - 0.3 * a, 2) / 0.008) + 0.03 * Math.exp(-Math.pow(s2 - 1.42 + 0.24 * a, 2) / 0.006);
    for (let i = 0; i < NS; i++) {
      const [b, d, isFlap] = prof[i], sv = sArc[i], body = isFlap ? 0 : 1;
      for (let j = 0; j <= NA; j++) {
        const a = -AH + 2 * AH * j / NA;
        const wx = wrap(a, xHalf), wz = zWrap(b);
        const n = V3(Math.sin(wx[2]), Math.cos(wx[2]) * Math.cos(wz[2]), Math.sin(wz[2])).normalize();
        const hangX = clamp(-wx[1] / 0.14, 0, 1), hangZ = clamp(-wz[1] / 0.14, 0, 1), topness = Math.max(0, n.y);
        const q = 0.16, puff = Math.sqrt(Math.abs(Math.sin(Math.PI * a / q) * Math.sin(Math.PI * sv / q)));
        let off = d + th * 0.3 * (puff - 0.62) * (0.8 + 0.2 * Math.sin(a * 3.1 + sv * 2.3));
        off += topness * ((0.4 + 0.6 * body) * (0.018 * Math.sin(3.1 * a + 4.3 * sv + 0.5) + 0.01 * Math.sin(7.3 * a - 3.2 * sv)) + body * ridge(sv, a));
        off = Math.max(off, body ? 0.008 : 0.06);
        off += hangX * 0.016 * (1 + Math.sin(sv * 15.5 + a * 1.5)) + hangZ * 0.016 * (1 + Math.sin(a * 14.0 + 0.6));   // folds only swing outward, clear of the frame
        const k = (i * (NA + 1) + j);
        pos[k * 3] = wx[0] + n.x * off; pos[k * 3 + 1] = yM + wx[1] + wz[1] + n.y * off; pos[k * 3 + 2] = wz[0] + n.z * off;
        uvs[k * 2] = (a + AH) * 0.9; uvs[k * 2 + 1] = sv / 1.5; up[k] = topness;
      }
    }
    // things on the duvet press it down: find the lowest point under each footprint, settle it there, slope back out
    const spots = { sleeve: { x: -0.2, z: -0.72, w: 0.16, h: 0.16, rot: 0.35 }, record: { x: 0.19, z: -0.6, r: 0.152 } };
    const sdf = (sp, x, z) => {
      if (sp.r) return Math.hypot(x - sp.x, z - sp.z) - sp.r;
      const c = Math.cos(sp.rot), sn = Math.sin(sp.rot), lx = (x - sp.x) * c - (z - sp.z) * sn, lz = (x - sp.x) * sn + (z - sp.z) * c;
      const qx = Math.abs(lx) - sp.w, qz = Math.abs(lz) - sp.h;
      return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
    };
    const press = (sp, arr) => {
      let lo = Infinity;
      for (let k = 0; k < up.length; k++) if (up[k] > 0.8 && sdf(sp, arr[k * 3], arr[k * 3 + 2]) < 0) lo = Math.min(lo, arr[k * 3 + 1]);
      sp.y = lo - (sp.sink || 0.006);
      for (let k = 0; k < up.length; k++) {
        if (up[k] < 0.5) continue;
        const dd = sdf(sp, arr[k * 3], arr[k * 3 + 2]);
        if (dd < 0.07) arr[k * 3 + 1] = Math.min(arr[k * 3 + 1], sp.y + (dd > 0 ? 0.03 * smooth(dd, 0, 0.07) + dd * 0.15 : 0));
      }
    };
    Object.values(spots).forEach((sp) => press(sp, pos));
    bedSpots = spots;
    const idx = [];
    for (let i = 0; i < NS - 1; i++) for (let j = 0; j < NA; j++) {
      const A = i * (NA + 1) + j, B = A + NA + 1;
      idx.push(A, B, A + 1, A + 1, B, B + 1);
    }
    const normalsOf = (arr) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(arr, 3)); g.setIndex(idx); g.computeVertexNormals(); return g.attributes.normal.array; };
    const dg = new T.BufferGeometry();
    dg.setAttribute('position', new T.BufferAttribute(pos, 3)); dg.setAttribute('uv', new T.BufferAttribute(uvs, 2)); dg.setIndex(idx);
    dg.computeVertexNormals();
    // each puzzle presses its own hollow, kept as a morph target so the duvet can rise again when the puzzle is picked up
    const baseN = dg.attributes.normal.array, mPos = [], mNor = [];
    SPOTS.forEach((sp, m) => {
      const arr = pos.slice(), foot = { x: sp.x, z: sp.z, w: sp.s * 0.96, h: sp.s * 0.96, rot: sp.yaw, sink: 0.012 };
      press(foot, arr);
      sp.y = foot.y; sp.morph = m;
      const nrm = normalsOf(arr);
      for (let k = 0; k < arr.length; k++) { arr[k] -= pos[k]; nrm[k] -= baseN[k]; }
      mPos.push(new T.BufferAttribute(arr, 3)); mNor.push(new T.BufferAttribute(nrm, 3));
    });
    dg.morphAttributes.position = mPos; dg.morphAttributes.normal = mNor; dg.morphTargetsRelative = true;
    const duvet = new T.Mesh(dg, blanketMat);
    duvet.castShadow = true; duvet.receiveShadow = true; scene.add(duvet);
    duvet.morphTargetInfluences.fill(1);
    duvetMesh = duvet;

    // pillow: two halves sewn at the seam, the bottom one flat where it rests in the hollow it makes
    const half = (sgn, hh, flat) => {
      const qg = new T.PlaneGeometry(2, 2, 44, 30); qg.rotateX(-Math.PI / 2);
      const qp = qg.attributes.position, PW = 0.33, PD = 0.21;
      for (let i = 0; i < qp.count; i++) {
        const u = qp.getX(i), v = qp.getZ(i);
        const body = Math.max(0, 1 - Math.pow(Math.abs(u), 4)) * Math.max(0, 1 - Math.pow(Math.abs(v), 3.2));
        const tk = hh * Math.pow(body, flat);
        const crease = sgn > 0 ? 0.006 * Math.sin(Math.atan2(v, u) * 7.0) * Math.min(1, u * u + v * v) * (tk > 0 ? 1 : 0) : 0;
        const dent = sgn > 0 ? 0.022 * Math.exp(-((u - 0.15) * (u - 0.15) * 5 + (v - 0.1) * (v - 0.1) * 7)) : 0;      // where a head was
        qp.setXYZ(i, u * PW * (1 - 0.08 * (1 - v * v)), sgn * (tk + crease - dent), v * PD * (1 - 0.09 * (1 - u * u)));
      }
      if (sgn < 0) { const ix = qg.index.array; for (let k = 0; k < ix.length; k += 3) { const tmp = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = tmp; } }
      qg.computeVertexNormals();
      return qg;
    };
    const pillow = new T.Mesh(mergeGeometries([half(1, 0.125, 0.5), half(-1, PIL.sink + 0.004, 0.18)]), sheetMat);
    pillow.rotation.set(-0.04, 0.07, 0.01);
    pillow.position.set(PIL.x, yM + 0.002, PIL.z); pillow.castShadow = true; pillow.receiveShadow = true; scene.add(pillow);

    // a baseball cap hung on the bedpost, peak toward the room
    at(PX + 0.006, 0.992, zH - 0.02, -0.35, () => {
      const NAVY = 0x27496d;
      const dome = new T.SphereGeometry(0.09, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), dp = dome.attributes.position;
      for (let i = 0; i < dp.count; i++) {                                     // lower at the back, a flat front panel, six soft gores
        const x = dp.getX(i), y = dp.getY(i), z = dp.getZ(i), a = Math.atan2(x, z), fr = Math.max(0, z / 0.09);
        const k = 1 - 0.02 * Math.abs(Math.sin(a * 3));
        dp.setXYZ(i, x * k * 0.98, y * (0.74 + 0.12 * fr), z * k * 1.1);
      }
      dome.computeVertexNormals();
      matte(dome, NAVY);
      const NB = 18, NR = 6, bp = [], bi = [];                                 // the peak: a crescent, curved across and dipping forward
      for (let i = 0; i <= NB; i++) for (let j = 0; j <= NR; j++) {
        const a = -1.05 + 2.1 * i / NB, t = j / NR, r = 0.086 + t * 0.075 * Math.cos(a * 0.85);
        const x = Math.sin(a) * r, z = Math.cos(a) * r * 1.1;
        bp.push(x, 0.006 - 0.02 * (x / 0.09) * (x / 0.09) - 0.03 * t * t, z);
        if (i < NB && j < NR) { const k = i * (NR + 1) + j; bi.push(k, k + 1, k + NR + 1, k + 1, k + NR + 2, k + NR + 1); }
      }
      const brim = new T.BufferGeometry(); brim.setAttribute('position', new T.Float32BufferAttribute(bp, 3)); brim.setIndex(bi); brim.computeVertexNormals();
      matte(brim, 0x1f3b59);
      gloss(mv(new T.SphereGeometry(0.008, 8, 6), 0, 0.068, 0), 0xe8e2d2);
      matte(mv(new T.CircleGeometry(0.03, 16), 0, 0.04, 0.094, 0, -0.5), 0xe0a21b);      // a round felt patch on the front
    }, 0.42, 0.12);
    // under the bed: shoe boxes and a cardboard box, half pushed in
    const lid = (w, d, x, y, z, ry, col) => matte(rbox(w + 0.008, 0.03, d + 0.008, 0.003, x, y, z, ry), col);
    matte(rbox(0.33, 0.115, 0.2, 0.003, hw - 0.1, 0.0575, -1.2, 1.42), 0xb5562a); lid(0.33, 0.2, hw - 0.1, 0.105, -1.2, 1.42, 0xb9ad94);
    matte(rbox(0.33, 0.115, 0.2, 0.003, hw - 0.16, 0.0575, -0.93, 1.72), 0x27557f); lid(0.33, 0.2, hw - 0.16, 0.105, -0.93, 1.72, 0x27557f);
    matte(rbox(0.42, 0.15, 0.3, 0.004, hw - 0.12, 0.075, -0.47, 1.5), 0x9a7a54); lid(0.42, 0.3, hw - 0.118, 0.142, -0.474, 1.54, 0x8f7250);
    matte(rbox(0.33, 0.115, 0.2, 0.003, -hw + 0.13, 0.0575, -0.8, 1.66), 0x8a6b48); lid(0.33, 0.2, -hw + 0.13, 0.105, -0.8, 1.66, 0xb9ad94);
  })();

  /* ───────────────────────── TV, VCR, lava lamp ───────────────────────── */
  // the TV is off: a dead grey-green tube, a little paler toward the middle where the phosphor sits; the curved
  // glass over it (below) still picks up the room
  const tvScreenMat = new T.MeshStandardMaterial({ roughness: 0.55, map: tex(makeCanvas(128, 112, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.62);
    gr.addColorStop(0, '#3a403c'); gr.addColorStop(0.7, '#262b28'); gr.addColorStop(1, '#121513');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  })) });
  envMats.push(tvScreenMat);
  const tv = new T.Group();
  const vcrMat = new T.MeshStandardMaterial({ map: vcrTex, roughness: 0.5, emissive: new T.Color(1, 1, 1), emissiveMap: vcrEmTex, emissiveIntensity: 1.2 });
  const DESK = { x0: 0.64, x1: 1.76, z0: ROOM.zBack + 0.012, z1: ROOM.zBack + 0.59, top: 0.75 };
  (function buildTV() {
    const TX = 0.93, TY = DESK.top + 0.085 + 0.18, TZ = -1.77, RY = -0.24;
    at(TX, TY, TZ, RY, () => {
      put(tvBodyMat, roundedBox(0.46, 0.36, 0.34, 0.03));
      const bezG = new T.TorusGeometry(1, 0.08, 6, 4); bezG.rotateZ(Math.PI / 4); bezG.scale(0.218, 0.19, 0.12);        // a raised square bezel around the tube
      put(tvBodyMat, mv(bezG, -0.06, 0, 0.168));
      put(tvBodyMat, mv(roundedBox(0.44, 0.085, 0.3, 0.008, 3, 3, 3), 0, -0.18 - 0.0425, 0));
      for (const fx of [-0.18, 0.18]) put(tvBodyMat, mv(cyl(0.012, 0.014, 0.008, 10), fx, -0.184, 0.1));           // the set's feet on the VCR
      for (const y of [0.08, -0.01]) {
        metal(mv(cyl(0.022, 0.022, 0.02, 16), 0.165, y, 0.178, 0, Math.PI / 2), 0x8a8378);
        metal(rbox(0.005, 0.03, 0.006, 0.001, 0.165, y, 0.19), 0x8a8378);
      }
      for (let i = 0; i < 5; i++) metal(rbox(0.06, 0.004, 0.004, 0, 0.165, -0.08 - i * 0.014, 0.172), 0x8a8378);
      metal(mv(cyl(0.02, 0.026, 0.014, 12), 0, 0.186, -0.05), 0x2b2622);
      for (const sgn of [-1, 1]) metal(mv(cyl(0.002, 0.0035, 0.46, 6), sgn * 0.11, 0.38, -0.05, 0, 0, -sgn * 0.5), 0x8a8378);
    });
    const sg = new T.PlaneGeometry(0.3, 0.26, 16, 16), sgp = sg.attributes.position;
    for (let i = 0; i < sgp.count; i++) { const u = sgp.getX(i) / 0.15, v = sgp.getY(i) / 0.13; sgp.setZ(i, 0.013 * (1 - 0.55 * u * u) * (1 - 0.55 * v * v)); }
    sg.computeVertexNormals();
    const screen = new T.Mesh(sg, tvScreenMat); screen.position.set(-0.06, 0.0, 0.166); tv.add(screen);
    const glassMat = new T.MeshStandardMaterial({ color: 0x000000, roughness: 0.06, metalness: 0, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
    glassMat.userData.envK = 1.6; envMats.push(glassMat);
    const glass = new T.Mesh(sg, glassMat); glass.position.set(-0.06, 0.0, 0.1675); tv.add(glass);
    const vcrFace = new T.Mesh(new T.PlaneGeometry(0.43, 0.08), vcrMat); vcrFace.position.set(0, -0.18 - 0.0425, 0.1505); tv.add(vcrFace);
    tv.position.set(TX, TY, TZ); tv.rotation.y = RY;
    scene.add(tv);
  })();

  const lavaMat = new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uGain: { value: 1 } },
    vertexShader: `
      varying float vX; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec4 mc = modelViewMatrix * vec4(0.0, position.y, 0.0, 1.0);
        vX = mv.x - mc.x; vY = position.y; vN = normalMatrix * normal; vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vX; varying float vY; varying vec3 vN; varying vec3 vV; uniform float uTime; uniform float uGain;
      void main(){
        float y = clamp((vY - 0.13) / 0.29, 0.0, 1.0);
        vec2 p = vec2(vX, vY);
        float f = 0.0;
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          float ph = fi * 1.7 + 0.3;
          vec2 c = vec2(sin(uTime * (0.21 + fi * 0.05) + ph) * 0.017, 0.275 + 0.125 * sin(uTime * (0.16 + fi * 0.037) + ph * 2.1));
          float r = 0.016 + 0.006 * sin(fi * 2.3 + 1.0);
          vec2 dd = (p - c) * vec2(1.0, 0.75);
          f += r * r / (dot(dd, dd) + 1e-5);
        }
        f += 0.0006 / ((vY - 0.135) * (vY - 0.135) + 1e-4);
        float wax = smoothstep(0.9, 1.15, f);
        vec3 liquid = mix(vec3(1.0, 0.62, 0.10), vec3(0.95, 0.20, 0.04), y) * (2.4 - 1.5 * y);
        vec3 waxc = vec3(1.0, 0.16, 0.05) * (2.6 - 1.2 * y);
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        vec3 col = mix(liquid, waxc, wax) * (1.0 - 0.6 * fres) + fres * vec3(0.35, 0.2, 0.12);
        gl_FragColor = vec4(col * uGain, 1.0);
      }`
  });
  const lamp = new T.Group();
  const NS = { x0: -0.965, x1: -0.575, z0: ROOM.zBack + 0.015, z1: ROOM.zBack + 0.4, top: 0.56 };   // the nightstand, left of the bed
  const LAVA = { x: NS.x0 + 0.115, y: NS.top, z: NS.z0 + 0.12 };
  (function buildLamp() {
    put(brassMat, mv(lathe([[0, 0], [0.075, 0], [0.075, 0.012], [0.046, 0.12], [0.052, 0.13]], 28), LAVA.x, LAVA.y, LAVA.z));
    put(brassMat, mv(lathe([[0.032, 0.42], [0.021, 0.47], [0, 0.475]], 28), LAVA.x, LAVA.y, LAVA.z));
    const glass = new T.Mesh(lathe([[0.052, 0.13], [0.063, 0.2], [0.041, 0.4], [0.031, 0.42]], 28), lavaMat);
    lamp.add(glass);
    lamp.position.set(LAVA.x, LAVA.y, LAVA.z);
    scene.add(lamp);
  })();

  /* ───────────────────────── paper on the walls ───────────────────────── */
  const pinGeo = new T.SphereGeometry(0.008, 10, 6); pinGeo.scale(1, 1, 0.5);
  const posterMats = [];
  // wall: 0 back, 1 left, 2 right. (u, y) is the centre along the wall and its height; lift is how far off the plaster
  function onWall(wall, u, y, lift) {
    if (wall === 0) return M4(u, y, ROOM.zBack + lift, 0);
    if (wall === 1) return M4(ROOM.xMin + lift, y, u, Math.PI / 2);
    return M4(ROOM.xMax - lift, y, u, -Math.PI / 2);
  }
  function poster(t, w, h, wall, u, y, rz, opt) {       // paper that bellies off the wall a little, pinned or taped at the corners
    opt = opt || {};
    const g = new T.PlaneGeometry(w, h, 10, 10), p = g.attributes.position, belly = opt.flat ? 0 : 1;
    for (let i = 0; i < p.count; i++) {
      const a = p.getX(i) / (w / 2), v = p.getY(i) / (h / 2);
      p.setZ(i, belly * (0.005 * (1 - a * a) * (1 - v * v) + 0.007 * Math.pow(Math.max(0, -v), 3) * a * a + (opt.curl || 0) * Math.pow(Math.max(0, a * 0.5 + v * 0.5), 4)));
    }
    g.computeVertexNormals();
    const pm = new T.MeshStandardMaterial({ map: t, roughness: 0.55 }); posterMats.push(pm);
    const m = new T.Mesh(g, pm), lift = 0.003 + (opt.lift || 0);
    m.applyMatrix4(M4(0, 0, 0, 0, 0, rz || 0)); m.applyMatrix4(onWall(wall, u, y, lift));
    m.receiveShadow = true; m.castShadow = true; scene.add(m);
    const prev = xf; xf = onWall(wall, u, y, lift).multiply(M4(0, 0, 0, 0, 0, rz || 0));
    if (opt.pins) for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) gloss(mv(pinGeo.clone(), sx * (w / 2 - 0.02), sy * (h / 2 - 0.02), 0.003), opt.pins);
    if (opt.tape) for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) matte(mv(new T.PlaneGeometry(0.05, 0.018), sx * (w / 2 - 0.006), sy * (h / 2 - 0.004), 0.0012 + (sy < 0 ? 0.0012 * belly : 0), 0, 0, sx * sy * -0.7), 0xe9dcb8);
    xf = prev;
    return m;
  }
  function drawPosterRocket(g, w, h) {
    g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8392b'; g.fillRect(0, 0, w, h * 0.12); g.fillRect(0, h * 0.86, w, h * 0.14);
    g.save(); g.translate(w * 0.5, h * 0.5); g.rotate(0.5);
    g.fillStyle = '#27557f'; g.beginPath(); g.moveTo(0, -170); g.bezierCurveTo(52, -110, 52, 40, 40, 110); g.lineTo(-40, 110); g.bezierCurveTo(-52, 40, -52, -110, 0, -170); g.fill();
    g.fillStyle = '#c8392b'; g.beginPath(); g.moveTo(-40, 50); g.lineTo(-88, 140); g.lineTo(-40, 112); g.fill(); g.beginPath(); g.moveTo(40, 50); g.lineTo(88, 140); g.lineTo(40, 112); g.fill();
    g.fillStyle = '#e9dcc0'; g.beginPath(); g.arc(0, -60, 20, 0, 6.2832); g.fill(); g.fillRect(-44, 10, 88, 10);
    g.fillStyle = '#efb23c'; g.beginPath(); g.moveTo(-26, 114); g.lineTo(0, 216); g.lineTo(26, 114); g.fill();
    g.restore();
    g.fillStyle = '#1e1b2e'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 97) % w, h * 0.14 + ((i * 211) % (h * 0.7)), 1.6, 0, 6.2832); g.fill(); }
    g.fillStyle = '#f3e7cf'; g.textAlign = 'center'; g.font = '900 40px "Arial Black", Impact, sans-serif'; g.fillText('DESPEGUE', w / 2, h * 0.095, w - 30);
    g.font = '700 17px Arial, sans-serif'; g.fillText('CLUB DE CIENCIAS · 1986', w / 2, h * 0.945, w - 30);
  }
  function drawPosterSurf(g, w, h) {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#f3c66b'); sky.addColorStop(0.5, '#e8743a'); sky.addColorStop(1, '#8c2f5a');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fbe6a6'; g.beginPath(); g.arc(w * 0.5, h * 0.36, w * 0.2, 0, 6.2832); g.fill();
    ['#1f6f78', '#1a5560', '#153f4c', '#102c3a'].forEach((c, k) => {
      g.fillStyle = c; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, h * (0.52 + k * 0.09) + Math.sin(x / (34 + k * 9) + k * 1.7) * (16 - k * 2));
      g.lineTo(w, h); g.fill();
    });
    g.save(); g.translate(w * 0.62, h * 0.63); g.rotate(-0.5); g.fillStyle = '#f4ead4'; g.beginPath(); g.ellipse(0, 0, 80, 15, 0, 0, 6.2832); g.fill(); g.fillStyle = '#c8392b'; g.fillRect(-60, -3, 120, 6); g.restore();
    g.fillStyle = '#f4ead4'; g.textAlign = 'center'; g.font = 'italic 900 58px Georgia, serif'; g.fillText('Pacífico', w / 2, h * 0.9, w - 40);
    g.font = '700 15px Arial, sans-serif'; g.fillText('O L A S   D E L   S U R', w / 2, h * 0.95);
  }
  const pennantTex = tex(makeCanvas(512, 192, (g, w, h) => {
    const rnd = mulberry(7);
    g.fillStyle = '#1f5a4e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#efb23c'; g.fillRect(0, 0, 34, h);
    for (let i = 0; i < 5000; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)'; g.fillRect(rnd() * w, rnd() * h, 1, 2); }
    g.fillStyle = '#f3e2c0'; g.font = 'italic 900 62px "Arial Black", Impact, sans-serif'; g.textBaseline = 'middle'; g.fillText('TIBURONES', 52, h / 2 + 2, 300);
  }));
  const corkTex = tex(makeCanvas(512, 400, (g, w, h) => {
    const rnd = mulberry(203);
    g.fillStyle = '#b4875a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = ['rgba(70,42,20,0.35)', 'rgba(230,190,140,0.3)', 'rgba(120,80,45,0.4)'][(rnd() * 3) | 0]; const r = 0.6 + rnd() * 2.2; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, r, r * (0.5 + rnd()), rnd() * 3, 0, 6.2832); g.fill(); }
    const note = (x, y, ww, hh, rot, col, lines) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-ww / 2 + 3, -hh / 2 + 4, ww, hh);
      g.fillStyle = col; g.fillRect(-ww / 2, -hh / 2, ww, hh);
      g.fillStyle = 'rgba(40,40,70,0.7)'; for (let k = 0; k < lines; k++) g.fillRect(-ww / 2 + 8, -hh / 2 + 14 + k * 11, (ww - 16) * (0.5 + rnd() * 0.5), 2.5);
      g.restore();
    };
    note(92, 86, 120, 96, -0.06, '#f6efd9', 6); note(402, 300, 110, 84, 0.08, '#f2d36a', 5); note(250, 330, 150, 60, -0.03, '#e9dfc8', 3);
    g.save(); g.translate(140, 290); g.rotate(0.12); g.fillStyle = '#d9662b'; g.fillRect(-70, -26, 140, 52); g.fillStyle = '#f6efd9'; g.font = '900 20px Arial'; g.fillText('ADMITE 1', -56, -2); g.font = '11px Arial'; g.fillText('MATINÉ · FILA 7', -56, 16); g.restore();
    g.save(); g.translate(400, 96); g.rotate(-0.1); g.fillStyle = '#f6efd9'; g.fillRect(-64, -64, 128, 128); g.strokeStyle = '#27557f'; g.lineWidth = 2;
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(-56, -40 + k * 18); g.lineTo(56, -40 + k * 18); g.stroke(); }
    g.fillStyle = '#b8322a'; g.font = '700 14px Arial'; g.fillText('L  M  M  J  V', -50, -48); g.restore();
  }));
  const posterRocketTex = tex(makeCanvas(384, 544, drawPosterRocket));
  const posterSurfTex = tex(makeCanvas(448, 640, drawPosterSurf));
  (function wallPaper() {
    // back wall, right of the window: the big sun poster, a smaller one taped over its corner, a corkboard and a framed print over the desk
    poster(posterSunTex, 0.56, 0.84, 0, 0.67, 1.9, 0.012, { pins: 0xb3261e });
    poster(posterShapesTex, 0.36, 0.45, 0, 1.07, 1.5, -0.035, { tape: true, lift: 0.007, curl: 0.012 });
    const cx = 1.5, cy = 1.5, cw = 0.46, ch = 0.36, z0 = ROOM.zBack;
    const cork = new T.Mesh(new T.PlaneGeometry(cw, ch), new T.MeshStandardMaterial({ map: corkTex, roughness: 0.95 })); cork.position.set(cx, cy, z0 + 0.012); cork.receiveShadow = true; scene.add(cork);
    wood(cx - cw / 2 - 0.02, cx + cw / 2 + 0.02, cy + ch / 2, cy + ch / 2 + 0.02, z0, z0 + 0.02, oakMat);
    wood(cx - cw / 2 - 0.02, cx + cw / 2 + 0.02, cy - ch / 2 - 0.02, cy - ch / 2, z0, z0 + 0.02, oakMat);
    wood(cx - cw / 2 - 0.02, cx - cw / 2, cy - ch / 2, cy + ch / 2, z0, z0 + 0.02, oakMat);
    wood(cx + cw / 2, cx + cw / 2 + 0.02, cy - ch / 2, cy + ch / 2, z0, z0 + 0.02, oakMat);
    matte(rbox(cw, ch, 0.01, 0, cx, cy, z0 + 0.006), 0x8a6a48);
    const shots = [
      (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fb6d8'); gr.addColorStop(0.6, '#d8e4d8'); gr.addColorStop(0.61, '#2f7f9a'); gr.addColorStop(1, '#e6d2a0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#2b1d14'; g.fillRect(60, 120, 8, 30); g.fillRect(90, 115, 8, 35); },
      (g, w, h) => { g.fillStyle = '#c99a6a'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2a22'; [[40, 70], [80, 64], [120, 72]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 16, 0, 6.2832); g.fill(); g.fillRect(x - 20, y + 14, 40, 80); }); },
      (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f2a25a'); gr.addColorStop(1, '#6a3a4a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#c8392b'; g.fillRect(30, 110, 100, 26); g.fillRect(50, 92, 60, 22); g.fillStyle = '#111'; g.beginPath(); g.arc(52, 138, 10, 0, 6.2832); g.arc(108, 138, 10, 0, 6.2832); g.fill(); }
    ];
    const photoTex = tex(makeCanvas(512, 256, (g) => {            // three snapshots and a polaroid on one sheet
      shots.forEach((draw, k) => { g.save(); g.translate(k * 128, 0); g.fillStyle = '#f6f1e6'; g.fillRect(0, 0, 128, 160); g.translate(7, 7); g.scale(114 / 144, 146 / 184); draw(g, 144, 184); g.restore(); });
      g.save(); g.translate(384, 0); g.scale(128 / 200, 154 / 240); drawPolaroid(g, 200, 240); g.restore();
    }));
    const photoMat = new T.MeshStandardMaterial({ map: photoTex, roughness: 0.4 });
    const shot = (k, x, y, rz, w, h, v1) => {
      const g = new T.PlaneGeometry(w, h, 4, 4), p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { const v = p.getY(i) / (h / 2); p.setZ(i, 0.004 * Math.pow(Math.max(0, -v), 2)); uv.setXY(i, (k + uv.getX(i)) / 4, 1 - (1 - uv.getY(i)) * v1); }
      g.computeVertexNormals();
      put(photoMat, mv(g, x, y, z0 + 0.0135 + k * 0.0007, 0, 0, rz));
      gloss(mv(pinGeo.clone(), x + Math.sin(rz) * -(h / 2 - 0.012), y + Math.cos(rz) * (h / 2 - 0.012), z0 + 0.0155 + k * 0.0007), [0xb3261e, 0xefb23c, 0x27557f, 0xb3261e][k]);
    };
    shot(0, cx - 0.01, cy + 0.07, 0.07, 0.09, 0.1125, 160 / 256); shot(1, cx + 0.095, cy + 0.02, -0.06, 0.09, 0.1125, 160 / 256);
    shot(2, cx - 0.04, cy - 0.075, -0.1, 0.09, 0.1125, 160 / 256); shot(3, cx - 0.145, cy + 0.015, 0.05, 0.088, 0.106, 154 / 256);
    // framed, behind a black frame
    const fx = 1.5, fy = 2.08, fw2 = 0.38, fh = 0.52, fr = 0.022, z1 = z0 + 0.028;
    poster(posterBridgeTex, fw2, fh, 0, fx, fy, 0, { flat: true, lift: 0.009 });
    for (const b of [[fx - fw2 / 2 - fr, fx + fw2 / 2 + fr, fy + fh / 2, fy + fh / 2 + fr], [fx - fw2 / 2 - fr, fx + fw2 / 2 + fr, fy - fh / 2 - fr, fy - fh / 2], [fx - fw2 / 2 - fr, fx - fw2 / 2, fy - fh / 2, fy + fh / 2], [fx + fw2 / 2, fx + fw2 / 2 + fr, fy - fh / 2, fy + fh / 2]])
      gloss(rbox(b[1] - b[0], b[3] - b[2], z1 - z0, 0.004, (b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (z0 + z1) / 2), 0x15120f);
    // a calendar on a nail, left of the window
    const calTex = tex(makeCanvas(256, 384, (g, w, h) => {
      g.fillStyle = '#f3ecd9'; g.fillRect(0, 0, w, h);
      const sk = g.createLinearGradient(0, 0, 0, 170); sk.addColorStop(0, '#6f8fb4'); sk.addColorStop(1, '#f0c58a'); g.fillStyle = sk; g.fillRect(10, 10, w - 20, 160);
      g.fillStyle = '#2f6b4e'; g.beginPath(); g.moveTo(10, 170); g.lineTo(90, 70); g.lineTo(150, 130); g.lineTo(200, 90); g.lineTo(w - 10, 170); g.fill();
      g.fillStyle = '#f3ecd9'; g.beginPath(); g.moveTo(74, 90); g.lineTo(90, 70); g.lineTo(104, 92); g.fill();
      g.fillStyle = '#b8322a'; g.font = '900 26px "Arial Black", Arial'; g.textAlign = 'center'; g.fillText('MARZO 1986', w / 2, 206);
      g.fillStyle = '#2a2a33'; g.font = '700 15px Arial';
      for (let d = 1; d <= 31; d++) { const c = (d + 5) % 7, r = ((d + 5) / 7) | 0; g.fillStyle = c === 0 ? '#b8322a' : '#2a2a33'; g.fillText(String(d), 30 + c * 33, 240 + r * 27); }
      g.strokeStyle = '#b8322a'; g.lineWidth = 2.5; g.beginPath(); g.arc(30 + 4 * 33, 235 + 2 * 27, 13, 0, 6.2832); g.stroke();
    }));
    poster(calTex, 0.2, 0.3, 0, WIN.x0 - 0.2, 1.8, -0.02, { lift: 0.002 });
    metal(mv(cyl(0.003, 0.003, 0.012, 6), WIN.x0 - 0.2, 1.938, z0 + 0.006, 0, Math.PI / 2), 0x8a8378);
    // side walls
    poster(posterCometTex, 0.6, 0.85, 1, -0.95, 1.74, -0.015, { pins: 0xefb23c });
    poster(posterRocketTex, 0.36, 0.51, 1, -0.44, 1.5, 0.04, { tape: true, lift: 0.006, curl: 0.01 });
    poster(posterSurfTex, 0.5, 0.714, 2, -1.02, 1.78, 0.02, { pins: 0x27557f });
    // a felt pennant over the shelf
    const pg = new T.BufferGeometry();
    pg.setAttribute('position', new T.Float32BufferAttribute([0, 0.11, 0, 0, -0.11, 0, 0.62, 0, 0], 3));
    pg.setAttribute('uv', new T.Float32BufferAttribute([0, 1, 0, 0, 1, 0.5], 2)); pg.setIndex([0, 1, 2]); pg.computeVertexNormals();
    const pen = new T.Mesh(pg, new T.MeshStandardMaterial({ map: pennantTex, roughness: 1 })); pen.position.set(-1.5, 2.1, z0 + 0.003); pen.rotation.z = -0.06; pen.receiveShadow = true; scene.add(pen);
  })();

  /* ───────────────────────── bookshelf: records, tapes, books, a globe ───────────────────────── */
  function vhsBox(list, cx, y0, zFront, cell, lying, rz) {
    const TH = 0.025, HH = 0.188, D = 0.104;
    const g = lying ? new T.BoxGeometry(HH, TH, D) : new T.BoxGeometry(TH, HH, D);
    const uv = g.attributes.uv;
    const col = cell % VHS_COLS, row = ((cell / VHS_COLS) | 0) % VHS_ROWS;
    const u0 = col / VHS_COLS, u1 = (col + 1) / VHS_COLS, vTop = 1 - row * VHS_CH / VHS_H, vBot = 1 - (row + 1) * VHS_CH / VHS_H, vDark = VHS_PAD * 0.5 / VHS_H;
    for (let i = 0; i < uv.count; i++) {
      if (i >= 16 && i < 20) {
        const u = uv.getX(i), v = uv.getY(i);
        if (!lying) uv.setXY(i, lerp(u0, u1, u), lerp(vBot, vTop, v));
        else uv.setXY(i, lerp(u0, u1, 1 - v), lerp(vBot, vTop, u));
      } else uv.setXY(i, 0.5, vDark);
    }
    if (rz) g.rotateZ(rz);
    g.translate(cx, y0 + (lying ? TH / 2 : HH / 2 + (rz ? 0.004 : 0)), zFront - D / 2);
    list.push(g);
  }
  const RUBIK = ['#f4f1ea', '#f2c40f', '#c81d25', '#f26b1d', '#1f4fbf', '#1f9a4b'];
  const rubikMat = new T.MeshStandardMaterial({ roughness: 0.32, map: tex(makeCanvas(576, 384, (g) => {      // six faces a row, four scrambles
    const rnd = mulberry(5);
    g.fillStyle = '#0d0d0d'; g.fillRect(0, 0, 576, 384);
    for (let r = 0; r < 4; r++) for (let f = 0; f < 6; f++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { g.fillStyle = RUBIK[(rnd() * 6) | 0]; g.beginPath(); g.roundRect(f * 96 + 4.5 + a * 30, r * 96 + 4.5 + b * 30, 27, 27, 4); g.fill(); }
  })) });
  envMats.push(rubikMat);
  function rubik(row, s, x, y, z, ry, rx) {
    const g = roundedBox(s, s, s, s * 0.08, 4, 4, 4), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const f = (i / 25) | 0; uv.setXY(i, (f + uv.getX(i)) / 6, 1 - (row + 1 - uv.getY(i)) / 4); }
    put(rubikMat, mv(g, x, y + s / 2, z, ry, rx));
  }
  function bookRow(books, rnd, xa, xb, y, zf, lean) {
    let bx = xa, bc = (rnd() * BK_N) | 0;
    while (bx < xb) {
      const th = 0.022 + rnd() * 0.03, hh = 0.2 + rnd() * 0.08, dd = 0.15 + rnd() * 0.07;
      const g = new T.BoxGeometry(th, hh, dd), uv = g.attributes.uv, c = bc++ % BK_N;
      const u0 = c / BK_N, u1 = (c + 1) / BK_N, vb = 1 - BK_CH / BK_H, page = BK_PAD * 0.5 / BK_H;
      for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i), v = uv.getY(i);
        if (i >= 16 && i < 20) uv.setXY(i, lerp(u0, u1, u), lerp(vb, 1, v));
        else if (i < 8) uv.setXY(i, u0 + 3 / BK_W, lerp(vb, 1, 0.5));
        else uv.setXY(i, 0.5, page);
      }
      g.translate(bx + th / 2, y + hh / 2, zf - 0.014 - dd / 2 - rnd() * 0.012);
      books.push(g); bx += th + 0.0015;
    }
    if (lean) {
      const lg = new T.BoxGeometry(0.03, 0.24, 0.19), luv = lg.attributes.uv;
      for (let i = 0; i < luv.count; i++) { if (i >= 16 && i < 20) luv.setXY(i, lerp(3 / BK_N, 4 / BK_N, luv.getX(i)), lerp(1 - BK_CH / BK_H, 1, luv.getY(i))); else luv.setXY(i, 0.5, BK_PAD * 0.5 / BK_H); }
      lg.rotateZ(0.2); lg.translate(bx + 0.04, y + 0.12 + 0.004, zf - 0.12);
      books.push(lg);
    }
    return bx;
  }
  const LP_COLS = [0x1d3b45, 0xe9dfc8, 0xc8392b, 0x15120f, 0xe0a21b, 0x2f6b4e, 0x7a1f6a, 0xd8d2c4, 0x27557f, 0xe2571c, 0x3a2a22, 0xf1e8d4, 0x8c2f5a, 0x1f6f78];
  const vhsMat = new T.MeshStandardMaterial({ map: vhsTex, roughness: 0.55 }), bookMat = new T.MeshStandardMaterial({ map: bookTex, roughness: 0.75 });
  const SHELF = { x0: -1.76, x1: -0.99, z1: ROOM.zBack + 0.33, H: 1.5 };
  (function buildShelf() {
    const x0 = SHELF.x0, x1 = SHELF.x1, z0 = ROOM.zBack, z1 = SHELF.z1, H = SHELF.H, t = 0.022, floors = [0.07, 0.43, 0.79, 1.15];
    wood(x0, x0 + t, 0, H, z0, z1);
    wood(x1 - t, x1, 0, H, z0, z1);
    wood(x0 - 0.012, x1 + 0.012, H - t, H, z0, z1 + 0.014);
    wood(x0 + t, x1 - t, 0, 0.07, z0, z1 - 0.02);
    wood(x0 + t, x1 - t, 0.07, H - t, z0, z0 + 0.01);
    floors.forEach((y) => wood(x0 + t, x1 - t, y - t, y, z0 + 0.01, z1 - 0.006));
    const rnd = mulberry(61), list = [], books = [];
    let cell = 0;
    const row = (xa, xb, y) => {
      let x = xa;
      while (x + 0.026 < xb) {
        if (rnd() < 0.05 && x > xa + 0.12) { x += 0.03 + rnd() * 0.04; continue; }
        vhsBox(list, x + 0.0128, y, z1 - 0.012 - rnd() * 0.008, cell++, false, 0);
        x += 0.0262;
      }
      return x;
    };
    // bottom: LPs on edge, packed, the last few fallen against the rest
    let x = x0 + t + 0.006;
    while (x < x1 - t - 0.17) {
      const w = 0.0034 + rnd() * 0.0028, hgt = 0.312 + (rnd() < 0.12 ? 0.006 : 0);
      matte(mv(new T.BoxGeometry(w, hgt, 0.312), x + w / 2, floors[0] + hgt / 2, z1 - 0.008 - 0.156 - rnd() * 0.014), LP_COLS[(rnd() * LP_COLS.length) | 0]);
      x += w + 0.0007;
    }
    for (let k = 0; k < 5; k++) { const th = 0.17 + k * 0.012; matte(mv(new T.BoxGeometry(0.005, 0.312, 0.312), x + 0.004 + 0.156 * Math.sin(th) + k * 0.0075, floors[0] + 0.156 * Math.cos(th) + 0.0025, z1 - 0.17 - rnd() * 0.01, 0, 0, th), LP_COLS[(k * 3 + 2) % LP_COLS.length]); }
    // tapes, a cube and a lying stack
    const xe = row(x0 + t + 0.008, x0 + 0.5, floors[1]);
    vhsBox(list, xe + 0.02, floors[1], z1 - 0.02, cell++, false, 0.11);
    for (let k = 0; k < 4; k++) vhsBox(list, x1 - 0.14 + (rnd() - 0.5) * 0.012, floors[1] + k * 0.0252, z1 - 0.03 - rnd() * 0.012, cell++, true, 0);
    rubik(0, 0.057, x1 - 0.14, floors[1] + 4 * 0.0252, z1 - 0.09, 0.4);
    // books, one leaning
    const be = bookRow(books, rnd, x0 + t + 0.008, x0 + 0.52, floors[2], z1, true);
    // a little robot standing where the books end
    at(be + 0.15, floors[2], z1 - 0.12, -0.3, () => {
      gloss(rbox(0.05, 0.055, 0.035, 0.006, 0, 0.0675, 0), 0xc8392b);
      gloss(rbox(0.04, 0.034, 0.034, 0.006, 0, 0.115, 0), 0xd8d2c4);
      for (const sx of [-1, 1]) {
        gloss(rbox(0.016, 0.04, 0.02, 0.004, sx * 0.014, 0.02, 0), 0x2b2b2b);
        gloss(rbox(0.012, 0.045, 0.014, 0.004, sx * 0.033, 0.07, 0, 0, 0, sx * 0.15), 0xd8d2c4);
        gloss(mv(new T.SphereGeometry(0.005, 8, 6), sx * 0.01, 0.118, 0.0175), 0x15120f);
      }
      metal(mv(cyl(0.0012, 0.0012, 0.03, 5), 0, 0.146, 0), CHROME); gloss(mv(new T.SphereGeometry(0.0045, 8, 6), 0, 0.162, 0), 0xefb23c);
    });
    // top shelf: tapes, cassette cases stacked
    row(x0 + 0.26, x1 - t - 0.008, floors[3]);
    [0xd8d2c4, 0x2b2b2b, 0xc8392b, 0xd8d2c4, 0xe0a21b].forEach((c, k) => gloss(rbox(0.108, 0.016, 0.068, 0.002, x0 + 0.13 + (rnd() - 0.5) * 0.008, floors[3] + 0.008 + k * 0.0162, z1 - 0.06, (rnd() - 0.5) * 0.4), c));
    // on top: the globe, tapes lying with a cube on them
    for (let k = 0; k < 3; k++) vhsBox(list, x0 + 0.5 + (rnd() - 0.5) * 0.01, H + k * 0.0252, z1 - 0.04 - rnd() * 0.01, cell++, true, 0);
    rubik(1, 0.057, x0 + 0.5, H + 3 * 0.0252, z1 - 0.1, 0.5);
    put(vhsMat, mergeGeometries(list)); put(bookMat, mergeGeometries(books));
    at(x0 + 0.2, H, z1 - 0.16, 0.5, () => {
      put(furnMat, lathe([[0, 0], [0.07, 0], [0.07, 0.012], [0.032, 0.028], [0.011, 0.05], [0.009, 0.09]], 28));
      const ring = new T.TorusGeometry(0.114, 0.0034, 8, 56, Math.PI); ring.rotateZ(0.41 + Math.PI / 2);
      put(brassMat, mv(ring, 0, 0.2, 0));
      const globeMat = new T.MeshStandardMaterial({ map: globeTex, roughness: 0.36 }); envMats.push(globeMat);
      const ball = new T.Mesh(new T.SphereGeometry(0.105, 48, 32), globeMat); ball.position.y = 0.2; ball.rotation.set(0, 2.2, 0.41, 'YZX');
      addMesh(ball);
    });
    // two sleeves leaning on the shelf's side, on the floor
  })();

  /* ───────────────────────── nightstand ───────────────────────── */
  const comicTex = tex(makeCanvas(512, 320, (g) => {     // four covers on one sheet; titles are made up
    const C = [['#e0a21b', '#c8392b', 'ASTRO', '#1e1b2e'], ['#27557f', '#f1dfb8', 'RAYO', '#f2c14e'], ['#c8392b', '#f4efe3', 'ZONA 9', '#1a1a1a'], ['#2f6b4e', '#efb23c', 'KID COMETA', '#f4efe3']];
    C.forEach(([bg, fg, title, ink], k) => {
      const x = k * 128;
      g.fillStyle = bg; g.fillRect(x, 0, 128, 320);
      g.fillStyle = fg; g.beginPath(); g.arc(x + 64, 190, 46, 0, 6.2832); g.fill();
      g.fillStyle = ink; g.beginPath(); g.moveTo(x + 30, 250); g.lineTo(x + 64, 130); g.lineTo(x + 98, 250); g.fill();
      for (let i = 0; i < 9; i++) { g.strokeStyle = fg; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 64, 190); g.lineTo(x + 64 + Math.cos(i * 0.7) * 110, 190 + Math.sin(i * 0.7) * 110); g.stroke(); }
      g.fillStyle = ink; g.fillRect(x, 0, 128, 64); g.fillStyle = fg; g.font = '900 26px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.fillText(title, x + 64, 42, 116);
      g.fillStyle = '#f4efe3'; g.fillRect(x + 6, 276, 34, 36); g.fillStyle = '#1a1a1a'; g.font = '700 11px Arial'; g.fillText('N° ' + (12 + k * 7), x + 23, 298);
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.strokeRect(x + 1, 1, 126, 318);
    });
  }));
  const comicMat = new T.MeshStandardMaterial({ map: comicTex, roughness: 0.5 });
  function comics(n, x, y, z, ry, seed) {               // a stack of comics: pages as one block each, a cover on every one
    const rnd = mulberry(seed);
    for (let k = 0; k < n; k++) {
      const a = ry + (rnd() - 0.5) * 0.5, dx = (rnd() - 0.5) * 0.02, dz = (rnd() - 0.5) * 0.02, th = 0.004 + rnd() * 0.003;
      matte(rbox(0.17, th, 0.26, 0, x + dx, y + th / 2, z + dz, a), 0xe9dfc8);
      const c = new T.PlaneGeometry(0.17, 0.26), uv = c.attributes.uv, cell = (rnd() * 4) | 0;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (cell + uv.getX(i)) / 4);
      put(comicMat, mv(c, x + dx, y + th + 0.0004, z + dz, a, -Math.PI / 2));
      y += th + 0.0004;
    }
    return y;
  }
  const clockMat = new T.MeshStandardMaterial({ color: 0x000000, roughness: 0.3, emissive: new T.Color(1, 1, 1), emissiveIntensity: 1.6, emissiveMap: tex(makeCanvas(128, 48, (g, w, h) => {
    g.fillStyle = '#120403'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff3a1c'; g.font = '700 38px "Courier New", monospace'; g.textAlign = 'center'; g.fillText('6:47', w / 2, 37);
  })) });
  (function nightstand() {
    const x0 = NS.x0, x1 = NS.x1, z0 = NS.z0, z1 = NS.z1, top = NS.top, TEAL = 0x2f6f6a, t = 0.016, xc = (x0 + x1) / 2;
    gloss(rbox(x1 - x0 + 0.02, 0.022, z1 - z0 + 0.016, 0.006, xc, top - 0.011, (z0 + z1) / 2 + 0.004), TEAL);
    for (const x of [x0 + t / 2, x1 - t / 2]) gloss(rbox(t, top - 0.022 - 0.1, z1 - z0, 0.003, x, (top - 0.022 + 0.1) / 2, (z0 + z1) / 2), TEAL);
    gloss(rbox(x1 - x0 - 2 * t, top - 0.122, 0.008, 0, xc, (top - 0.022 + 0.1) / 2, z0 + 0.004), 0x285f5b);
    for (const y of [0.108, 0.385]) gloss(rbox(x1 - x0 - 2 * t, t, z1 - z0 - 0.008, 0.002, xc, y, (z0 + z1) / 2), TEAL);
    gloss(rbox(x1 - x0 - 2 * t - 0.006, 0.14, 0.016, 0.004, xc, 0.465, z1 - 0.004), 0x347a74);                 // drawer front, a touch proud
    metal(mv(lathe([[0, 0], [0.007, 0], [0.006, 0.012], [0.013, 0.018], [0.013, 0.024], [0, 0.027]], 14), xc, 0.465, z1 + 0.004, 0, Math.PI / 2), BRASS);
    for (const [lx, lz] of [[x0 + 0.03, z0 + 0.03], [x1 - 0.03, z0 + 0.03], [x0 + 0.03, z1 - 0.03], [x1 - 0.03, z1 - 0.03]]) put(furnMat, mv(cyl(0.017, 0.011, 0.1, 10), lx, 0.05, lz));
    comics(5, xc + 0.01, 0.116, z1 - 0.17, 1.5, 31);                                                          // in the cubby
    // flip clock, a mug, a paperback face down
    at(x1 - 0.1, top, z0 + 0.13, 0.42, () => {
      put(furnMat, rbox(0.14, 0.062, 0.075, 0.008, 0, 0.031, 0));
      const face = new T.Mesh(new T.PlaneGeometry(0.1, 0.038), clockMat); face.position.set(-0.008, 0.033, 0.0378); face.castShadow = false; addMesh(face);
      gloss(rbox(0.03, 0.006, 0.02, 0.002, 0.04, 0.064, 0), 0xd8d2c4);
    });
    at(x1 - 0.085, top, z1 - 0.085, 0.9, () => {
      gloss(lathe([[0, 0.004], [0.034, 0.004], [0.037, 0], [0.039, 0.092], [0.035, 0.092], [0.033, 0.008], [0, 0.008]], 24), 0xd6532b);
      const h = new T.TorusGeometry(0.024, 0.006, 8, 16, Math.PI); h.rotateZ(-Math.PI / 2);
      gloss(mv(h, 0.038, 0.048, 0), 0xd6532b);
      matte(mv(new T.CircleGeometry(0.0335, 20), 0, 0.074, 0, 0, -Math.PI / 2), 0x2a1408);
    });
    at(x0 + 0.15, top, z1 - 0.085, -0.25, () => {
      matte(rbox(0.11, 0.018, 0.175, 0.002, 0, 0.009, 0), 0xe9dfc8);
      gloss(rbox(0.112, 0.0012, 0.177, 0, 0, 0.0186, 0), 0x8c2f5a);
      gloss(rbox(0.004, 0.019, 0.177, 0, -0.056, 0.0095, 0), 0x8c2f5a);
    });
  })();

  /* ───────────────────────── desk, chair, what is on them ───────────────────────── */
  (function buildDesk() {
    const x0 = DESK.x0, x1 = DESK.x1, z0 = DESK.z0, z1 = DESK.z1, top = DESK.top, ped = x1 - 0.4;
    put(oakMat, boxWU(x0 - 0.012, x1 + 0.012, top - 0.03, top, z0, z1 + 0.012, 0.8, 0.8, 0.008));
    for (const lz of [z0 + 0.035, z1 - 0.035]) wood(x0 + 0.012, x0 + 0.057, 0, top - 0.03, lz - 0.0225, lz + 0.0225, oakMat);
    wood(x0 + 0.024, x0 + 0.046, 0.12, 0.16, z0 + 0.05, z1 - 0.05, oakMat);
    wood(x0 + 0.05, ped, top - 0.12, top - 0.03, z0 + 0.02, z0 + 0.038, oakMat);                               // modesty rail at the back
    wood(x0 + 0.05, ped, top - 0.1, top - 0.03, z1 - 0.05, z1 - 0.032, oakMat);                                // apron with the pencil drawer
    wood(x0 + 0.14, ped - 0.1, top - 0.094, top - 0.036, z1 - 0.032, z1 - 0.02, oakMat);
    metal(mv(cyl(0.008, 0.01, 0.014, 12), (x0 + 0.14 + ped - 0.1) / 2, top - 0.065, z1 - 0.013, 0, Math.PI / 2), BRASS);
    // drawer pedestal on the right
    wood(ped, ped + 0.018, 0.05, top - 0.03, z0 + 0.02, z1 - 0.02, oakMat);
    wood(x1 - 0.03, x1 - 0.012, 0.05, top - 0.03, z0 + 0.02, z1 - 0.02, oakMat);
    wood(ped + 0.018, x1 - 0.03, 0.05, 0.07, z0 + 0.02, z1 - 0.03, oakMat);
    wood(ped + 0.018, x1 - 0.03, 0.07, top - 0.03, z0 + 0.02, z0 + 0.03, oakMat);
    wood(ped + 0.01, x1 - 0.02, 0, 0.05, z0 + 0.04, z1 - 0.05, oakMat);
    [[0.08, 0.3, 0], [0.31, 0.5, 0.035], [0.51, 0.705, 0]].forEach(([ya, yb, pull]) => {                      // the middle drawer left a little open
      put(oakMat, boxWU(ped + 0.022, x1 - 0.034, ya, yb, z1 - 0.034 + pull, z1 - 0.016 + pull, 0.8, 0.8, 0.005));
      if (pull) { wood(ped + 0.03, ped + 0.04, ya + 0.02, yb - 0.01, z1 - 0.2, z1 - 0.03 + pull, oakMat); wood(x1 - 0.052, x1 - 0.042, ya + 0.02, yb - 0.01, z1 - 0.2, z1 - 0.03 + pull, oakMat); }
      const xm = (ped + x1) / 2 - 0.006, ym = (ya + yb) / 2 + 0.02;
      metal(rbox(0.09, 0.009, 0.007, 0.003, xm, ym, z1 + pull - 0.004), BRASS);
      for (const sx of [-0.04, 0.04]) metal(rbox(0.008, 0.008, 0.012, 0.002, xm + sx, ym, z1 + pull - 0.012), BRASS);
    });
    // boombox
    at(1.44, top, z0 + 0.17, -0.07, () => {
      gloss(mv(roundedBox(0.52, 0.25, 0.13, 0.022, 5, 5, 5), 0, 0.125, 0), 0x29292b);
      const face = new T.MeshStandardMaterial({ map: boomTex, roughness: 0.42, metalness: 0.2 }); envMats.push(face);
      const bf = new T.Mesh(new T.PlaneGeometry(0.5, 0.234), face); bf.position.set(0, 0.125, 0.0652); bf.castShadow = false; addMesh(bf);
      for (const sx of [-1, 1]) metal(mv(cyl(0.008, 0.008, 0.05, 10), sx * 0.17, 0.27, 0), CHROME);
      metal(mv(cyl(0.009, 0.009, 0.36, 12), 0, 0.296, 0, 0, 0, Math.PI / 2), CHROME);
      metal(mv(cyl(0.0025, 0.0035, 0.42, 6), 0.16, 0.42, -0.04, 0, 0, -0.55), CHROME);
      for (const sx of [-0.14, -0.08, 0.08, 0.14]) gloss(mv(cyl(0.013, 0.013, 0.012, 12), sx, 0.254, 0.03), 0x8a8378);
    });
    rubik(2, 0.057, x0 + 0.1, top, z1 - 0.07, 0.3);
    // cassettes in their cases, a spiral notebook with a pencil, a cup of pencils
    [0xc8392b, 0xd8d2c4, 0xe0a21b].forEach((band, k) => {
      const cx = 1.2, cz = z1 - 0.1, a = 0.25 - k * 0.18;
      gloss(rbox(0.11, 0.017, 0.07, 0.002, cx, top + 0.0085 + k * 0.0172, cz, a), 0xd9d4c8);
      if (k === 2) gloss(rbox(0.106, 0.001, 0.02, 0, cx + Math.sin(a) * -0.022, top + 0.0178 + k * 0.0172, cz - Math.cos(a) * 0.022, a), band);
    });
    gloss(rbox(0.102, 0.012, 0.064, 0.003, 1.1, top + 0.006, z1 - 0.19, -0.6), 0x2b2b2b);                    // one tape out of its case
    at(1.52, top, z1 - 0.13, 0.14, () => {
      gloss(rbox(0.26, 0.012, 0.18, 0.002, 0, 0.006, 0), 0x2c4a7a);
      matte(rbox(0.25, 0.0096, 0.172, 0, 0.002, 0.0058, 0), 0xece2d0);
      gloss(rbox(0.084, 0.0006, 0.04, 0, 0.065, 0.0124, -0.04), 0xeee6d2);
      for (let k = 0; k < 14; k++) { const ring = new T.TorusGeometry(0.0065, 0.0012, 5, 10); metal(mv(ring, -0.132, 0.006, -0.08 + k * 0.0123, Math.PI / 2), BRASS); }
      gloss(mv(cyl(0.0036, 0.0036, 0.17, 6), 0.02, 0.016, 0.01, 0.5, 0, Math.PI / 2), 0xe8b020);
    });
    gloss(mv(lathe([[0, 0.003], [0.03, 0.003], [0.033, 0], [0.035, 0.1], [0.031, 0.1], [0.029, 0.006], [0, 0.006]], 28), 1.7, top, z1 - 0.07), 0xb8802a);
    [[0.008, 0.006, 0.12, -0.1], [-0.01, 0.004, -0.08, 0.14], [0.002, -0.011, 0.06, 0.05], [-0.006, 0.01, -0.15, -0.06]].forEach(([dx, dz, ax, az], k) => {
      gloss(mv(cyl(0.0036, 0.0036, 0.17, 6), 1.7 + dx, top + 0.085, z1 - 0.07 + dz, 0, ax, az), k === 1 ? 0x2f5fa0 : k === 3 ? 0xc8392b : 0xe8b020);
    });
    // chair, pulled out and turned toward the room, a denim jacket over its back, headphones on the seat
    at(1.04, 0, -1.1, 0.42, () => {
      wood(-0.21, 0.21, 0.42, 0.455, -0.2, 0.2);
      put(linenMat, mv(roundedBox(0.39, 0.05, 0.37, 0.02, 6, 3, 6), 0, 0.476, 0));
      for (const sx of [-0.185, 0.185]) {
        wood(sx - 0.019, sx + 0.019, 0, 0.42, -0.194, -0.156);
        wood(sx - 0.019, sx + 0.019, 0, 0.92, 0.161, 0.199);
        wood(sx - 0.012, sx + 0.012, 0.15, 0.185, -0.156, 0.161);
      }
      wood(-0.166, 0.166, 0.22, 0.25, -0.187, -0.163);
      wood(-0.166, 0.166, 0.84, 0.91, 0.166, 0.194);
      wood(-0.166, 0.166, 0.62, 0.67, 0.168, 0.192);
      // the jacket: one sheet over the top rail, short in front, long behind, with the collar rolled and both sleeves hanging
      const NU = 26, NS = 44, JW = 0.25, Lf = 0.24, Rr = 0.03, Lb = 0.47, TOP = 0.905, ZC = 0.18, L = Lf + Math.PI * Rr + Lb;
      const jp = new Float32Array((NU + 1) * (NS + 1) * 3), ju = new Float32Array((NU + 1) * (NS + 1) * 2), ji = [];
      for (let i = 0; i <= NS; i++) for (let j = 0; j <= NU; j++) {
        const d = i / NS * L, u = -1 + 2 * j / NU, au = Math.abs(u);
        let y, z, side;
        if (d < Lf) { z = ZC - Rr; y = TOP - (Lf - d); side = -1; }
        else if (d < Lf + Math.PI * Rr) { const f = (d - Lf) / Rr; z = ZC - Rr * Math.cos(f); y = TOP + Rr * Math.sin(f); side = -Math.cos(f); }
        else { z = ZC + Rr; y = TOP - (d - Lf - Math.PI * Rr); side = 1; }
        const hang = clamp((TOP - y) / 0.12, 0, 1), over = Math.max(0, au - 0.74) / 0.26;                    // past the posts the cloth falls off the rail
        y -= 0.05 * over * over * (1 - hang) + 0.012 * au * au;
        z += side * (0.008 + hang * (0.011 * (1 + Math.sin(u * 8 + d * 13)) + 0.008 * (1 + Math.sin(u * 3 - d * 7)) + 0.03 * over));
        if (side > 0) z += 0.05 * Math.pow(clamp((TOP - y) / Lb, 0, 1), 2);                                  // the back swings out a little
        const k = i * (NU + 1) + j;
        jp[k * 3] = u * JW * (1 + 0.06 * hang); jp[k * 3 + 1] = y; jp[k * 3 + 2] = z;
        ju[k * 2] = u * JW / 0.3; ju[k * 2 + 1] = d / 0.3;
        if (i < NS && j < NU) ji.push(k, k + NU + 1, k + 1, k + 1, k + NU + 1, k + NU + 2);
      }
      const jg = new T.BufferGeometry();
      jg.setAttribute('position', new T.BufferAttribute(jp, 3)); jg.setAttribute('uv', new T.BufferAttribute(ju, 2)); jg.setIndex(ji); jg.computeVertexNormals();
      put(denimMat, jg);
      const collar = new T.TorusGeometry(0.09, 0.016, 8, 20, Math.PI * 1.1); collar.rotateX(Math.PI / 2); collar.rotateY(Math.PI * 0.95); collar.scale(1.25, 1.5, 0.5);
      put(denimMat, mv(collar, 0, TOP + 0.036, ZC + 0.03));
      for (const sx of [-1, 1]) {
        const c = new T.CatmullRomCurve3([V3(sx * 0.2, TOP - 0.03, ZC + 0.05), V3(sx * 0.262, TOP - 0.16, ZC + 0.075), V3(sx * 0.272, TOP - 0.36, ZC + 0.085), V3(sx * 0.25, TOP - 0.56, ZC + 0.07)]);
        const sl = new T.TubeGeometry(c, 14, 0.05, 10), p = sl.attributes.position, uv = sl.attributes.uv;
        for (let i = 0; i < p.count; i++) { const ty = clamp((TOP - p.getY(i)) / 0.56, 0, 1); p.setZ(i, ZC + 0.07 + (p.getZ(i) - ZC - 0.07) * (0.5 - 0.1 * ty) + 0.008 * Math.sin(ty * 16 + sx)); uv.setXY(i, uv.getX(i) * 2, uv.getY(i)); }
        sl.computeVertexNormals();
        put(denimMat, sl);
        matte(mv(cyl(0.008, 0.008, 0.004, 10), sx * 0.06, TOP - 0.1, ZC + Rr + 0.018, 0, Math.PI / 2), 0xb08a4a);
      }
      at(-0.03, 0.532, -0.02, 0, () => {
        metal(new T.TorusGeometry(0.075, 0.005, 8, 32, Math.PI), 0x8c8c90);
        for (const sx of [-1, 1]) { matte(mv(cyl(0.03, 0.03, 0.02, 20), sx * 0.075, -0.005, 0, 0, 0, Math.PI / 2), 0xd8642a); gloss(mv(cyl(0.022, 0.026, 0.012, 16), sx * 0.09, -0.005, 0, 0, 0, Math.PI / 2), 0x2b2b2b); }
      }, -Math.PI / 2 + 0.25, 0.5);
    });
  })();

  /* ───────────────────────── dresser on the left wall ───────────────────────── */
  (function dresser() {
    const x0 = ROOM.xMin + 0.02, x1 = x0 + 0.44, z0 = -1.3, z1 = -0.42, H = 0.78;
    put(oakMat, boxWU(x0 - 0.004, x1 + 0.016, H - 0.026, H, z0 - 0.012, z1 + 0.012, 0.8, 0.8, 0.008));
    wood(x0, x1, 0.06, H - 0.026, z0, z0 + 0.018, oakMat); wood(x0, x1, 0.06, H - 0.026, z1 - 0.018, z1, oakMat);
    wood(x0, x0 + 0.01, 0.06, H - 0.026, z0 + 0.018, z1 - 0.018, oakMat);
    wood(x0 + 0.01, x1 - 0.02, 0.06, 0.08, z0 + 0.018, z1 - 0.018, oakMat);
    wood(x0 + 0.03, x1 - 0.04, 0, 0.06, z0 + 0.03, z1 - 0.03, oakMat);
    [[0.085, 0.3, 0], [0.31, 0.515, 0], [0.525, 0.72, 0.085]].forEach(([ya, yb, pull], k) => {             // the top drawer left open, a T-shirt over its edge
      put(oakMat, boxWU(x1 - 0.02 + pull, x1 + pull, ya, yb, z0 + 0.022, z1 - 0.022, 0.8, 0.8, 0.005));
      if (pull) {
        for (const z of [z0 + 0.03, z1 - 0.04]) wood(x1 - 0.2, x1 - 0.018 + pull, ya + 0.02, yb - 0.015, z, z + 0.01, oakMat);
        wood(x1 - 0.2, x1 - 0.018 + pull, ya + 0.02, ya + 0.03, z0 + 0.03, z1 - 0.03, oakMat);
      }
      for (const fz of [0.25, 0.75]) put(furnMat, mv(lathe([[0, 0], [0.009, 0], [0.008, 0.012], [0.016, 0.02], [0.015, 0.028], [0, 0.031]], 14), x1 + pull, (ya + yb) / 2 + 0.01, lerp(z0, z1, fz), 0, 0, -Math.PI / 2));
      if (pull) {
        // cloth: lies in the drawer, breaks over the front edge, hangs
        const NUc = 14, NSc = 22, cp = new T.PlaneGeometry(1, 1, NUc, NSc), p = cp.attributes.position, zc = (z0 + z1) / 2 + 0.02, wd = 0.26;
        for (let i = 0; i < p.count; i++) {
          const u = p.getX(i) * 2, s = (p.getY(i) + 0.5) * 0.36, edge = x1 + pull - 0.008;
          let x, y;
          if (s < 0.14) { x = edge - 0.14 + s; y = yb + 0.006 + 0.012 * Math.sin(s * 30 + u * 2); }
          else if (s < 0.14 + 0.0188) { const f = (s - 0.14) / 0.012; x = edge + 0.012 * Math.sin(f); y = yb + 0.006 - 0.012 * (1 - Math.cos(f)); }
          else { x = edge + 0.012; y = yb - 0.006 - (s - 0.1588); }
          const hangk = clamp((s - 0.15) / 0.1, 0, 1);
          p.setXYZ(i, x + hangk * 0.006 * (1 + Math.sin(u * 5 + 1)), y - 0.03 * hangk * u * u - 0.02 * hangk * Math.max(0, -u), zc + u * wd / 2 * (1 - 0.12 * hangk) + 0.006 * Math.sin(s * 40));
        }
        cp.computeVertexNormals();
        matte(cp, 0xe8dcc4);
        matte(rbox(0.2, yb - ya - 0.05, z1 - z0 - 0.09, 0.02, x1 + pull - 0.125, (ya + yb) / 2 + 0.012, (z0 + z1) / 2), 0x6a7f96);      // what is folded inside
      }
    });
    // on top: folded jeans, a stack of comics, a trophy
    put(denimMat, mv(roundedBox(0.3, 0.05, 0.24, 0.02, 6, 3, 6), x0 + 0.21, H + 0.025, z0 + 0.19, 0.08));
    put(denimMat, mv(roundedBox(0.29, 0.045, 0.235, 0.02, 6, 3, 6), x0 + 0.215, H + 0.072, z0 + 0.195, -0.05));
    comics(7, x0 + 0.2, H, z1 - 0.2, 0.2, 77);
    at(x0 + 0.13, H, (z0 + z1) / 2 + 0.02, 0.3, () => {
      put(furnMat, rbox(0.085, 0.03, 0.085, 0.004, 0, 0.015, 0));
      metal(lathe([[0, 0.03], [0.026, 0.03], [0.022, 0.04], [0.007, 0.05], [0.006, 0.09], [0.012, 0.1], [0.034, 0.15], [0.04, 0.2], [0.037, 0.2], [0.03, 0.152], [0, 0.11]], 20), 0xc9a24a);
      for (const sx of [-1, 1]) { const h = new T.TorusGeometry(0.02, 0.0035, 6, 14, Math.PI); h.rotateZ(-sx * Math.PI / 2); metal(mv(h, sx * 0.036, 0.16, 0), 0xc9a24a); }
    });
  })();

  /* ───────────────────────── rug ───────────────────────── */
  const rugMat = new T.MeshStandardMaterial({ roughness: 1, color: 0xd8c0a4, map: tex(makeCanvas(1024, 1024, (g, w) => {
    // a braided rag rug: concentric braids, each a run of slanted strands
    const rnd = mulberry(83), cx = w / 2, R = w / 2, ring = 30;
    const COL = ['#6e3a26', '#a8957a', '#4e3424', '#3e5a54', '#8e6c34', '#663026', '#9a8a70', '#3e4658'];
    g.fillStyle = '#4a2e20'; g.fillRect(0, 0, w, w);
    for (let k = 0, r = ring / 2; r < R; k++, r += ring) {
      const col = COL[(k + ((rnd() * 2) | 0)) % COL.length];
      g.strokeStyle = col; g.lineWidth = ring; g.beginPath(); g.arc(cx, cx, r, 0, 6.2832); g.stroke();
      const n = Math.max(12, Math.floor(6.2832 * r / 9));
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.2832, side = i % 2 ? 1 : -1, ca = Math.cos(a), sa = Math.sin(a);
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(cx + ca * (r - ring * 0.45), cx + sa * (r - ring * 0.45));
        const a2 = a + side * 5 / r; g.lineTo(cx + Math.cos(a2) * (r + ring * 0.45), cx + Math.sin(a2) * (r + ring * 0.45)); g.stroke();
      }
    }
  })) });
  const RUG = { x: 0.94, z: -0.8, r: 0.5, h: 0.012 };
  const rug = new T.Mesh(new T.CylinderGeometry(RUG.r, RUG.r, RUG.h, 96, 1), rugMat);
  rug.position.set(RUG.x, RUG.h / 2, RUG.z); rug.receiveShadow = true; scene.add(rug);

  /* ───────────────────────── lived-in: plants, records, a skateboard, shoes, a bag ───────────────────────── */
  const dummy = new T.Object3D();
  const leafGeo = (w, h, curl, droop) => {                // a leaf plane with its base at the origin, curled back at the edges and the tip
    const g = new T.PlaneGeometry(w, h, 6, 6); g.translate(0, h / 2, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / h; p.setZ(i, -curl * x * x * w - droop * y * y * h); }
    g.computeVertexNormals();
    return g;
  };
  const heartTex = tex(makeCanvas(128, 128, (g) => {      // golden pothos
    const rnd = mulberry(3);
    const path = () => { g.beginPath(); g.moveTo(64, 112); g.bezierCurveTo(30, 122, 2, 80, 14, 50); g.bezierCurveTo(24, 24, 50, 14, 64, 4); g.bezierCurveTo(78, 14, 104, 24, 114, 50); g.bezierCurveTo(126, 80, 98, 122, 64, 112); g.closePath(); };
    const gr = g.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, '#3f8a3a'); gr.addColorStop(1, '#2c6a2c');
    path(); g.fillStyle = gr; g.fill();
    g.save(); path(); g.clip();
    for (let k = 0; k < 9; k++) { g.strokeStyle = 'rgba(226,214,120,' + (0.25 + rnd() * 0.3) + ')'; g.lineWidth = 2 + rnd() * 4; g.beginPath(); g.moveTo(64, 100); g.quadraticCurveTo(64 + (rnd() - 0.5) * 60, 60, 20 + rnd() * 88, 10 + rnd() * 40); g.stroke(); }
    g.strokeStyle = 'rgba(200,220,150,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 110); g.lineTo(64, 10); g.stroke();
    g.restore();
  }));
  const monsteraTex = tex(makeCanvas(512, 512, (g) => {
    const path = () => { g.beginPath(); g.moveTo(256, 470); g.bezierCurveTo(130, 500, 20, 380, 30, 250); g.bezierCurveTo(40, 110, 170, 30, 262, 22); g.bezierCurveTo(360, 30, 480, 110, 486, 250); g.bezierCurveTo(492, 390, 380, 500, 256, 470); g.closePath(); };
    const gr = g.createRadialGradient(256, 300, 20, 256, 260, 260); gr.addColorStop(0, '#3e7d32'); gr.addColorStop(1, '#22501f');
    path(); g.fillStyle = gr; g.fill();
    g.save(); path(); g.clip();
    g.strokeStyle = 'rgba(150,190,110,0.5)'; g.lineWidth = 3;
    for (let k = -6; k <= 6; k++) { if (!k) continue; g.beginPath(); g.moveTo(256, 260 - k * 4); g.quadraticCurveTo(256 + k * 22, 230 - Math.abs(k) * 8, 256 + k * 38, 120 + Math.abs(k) * 22); g.stroke(); }
    g.lineWidth = 7; g.beginPath(); g.moveTo(256, 470); g.lineTo(258, 30); g.stroke();
    g.globalCompositeOperation = 'destination-out';
    for (let k = -5; k <= 5; k++) {                          // fenestrations: slits from the edge toward the midrib, holes near it
      if (!k) continue;
      const a = -Math.PI / 2 + k * 0.27, ex = 256 + Math.cos(a) * 300, ey = 260 + Math.sin(a) * 300;
      g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(ex, ey); g.lineTo(256 + Math.cos(a) * 130, 260 + Math.sin(a) * 130); g.stroke();
      if (Math.abs(k) > 1 && Math.abs(k) < 5) { g.beginPath(); g.ellipse(256 + Math.cos(a) * 85, 260 + Math.sin(a) * 85, 14, 7, a, 0, 6.2832); g.fill(); }
    }
    g.restore();
  }));
  const leafMat = (t) => { const m = new T.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.5 }); envMats.push(m); return m; };
  const potheMat = leafMat(heartTex), monsteraMat = leafMat(monsteraTex);
  const stemMat = new T.MeshStandardMaterial({ color: 0x4c6e2e, roughness: 0.6 });
  const soilMat = new T.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 });
  function pot(r, h, x, y, z) {
    put(clayMat, mv(lathe([[0, 0], [r * 0.78, 0], [r, h * 0.86], [r * 1.1, h * 0.88], [r * 1.1, h], [r * 0.95, h], [r * 0.93, h * 0.9], [0, h * 0.9]], 28), x, y, z));
    put(soilMat, mv(new T.CircleGeometry(r * 0.92, 24), x, y + h * 0.86, z, 0, -Math.PI / 2));
    put(clayMat, mv(lathe([[0, 0], [r * 1.05, 0], [r * 1.2, 0.012], [r * 1.16, 0.016], [r * 0.9, 0.006], [0, 0.006]], 28), x, y, z));      // its saucer
  }
  const vines = [];                                     // trailing pothos: instanced heart leaves along curved vines
  function vine(pts, every, seed, size) {
    const rnd = mulberry(seed), curve = new T.CatmullRomCurve3(pts.map((q) => V3(q[0], q[1], q[2])));
    put(stemMat, new T.TubeGeometry(curve, 40, 0.0025, 4));
    const n = Math.floor(curve.getLength() / every);
    for (let i = 1; i <= n; i++) {
      const t = i / n, p = curve.getPoint(t), tg = curve.getTangent(t);
      const out = V3(rnd() - 0.5, 0.15, 1).normalize();
      dummy.position.copy(p); dummy.lookAt(p.clone().add(out)); dummy.rotateZ((i % 2 ? 1 : -1) * (0.9 + rnd() * 0.8) + Math.atan2(tg.x, -tg.y) * 0.3);
      const sc = size * (0.75 + rnd() * 0.5) * (1 - 0.35 * t); dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
      vines.push(dummy.matrix.clone());
    }
  }
  // a pothos on top of the bookshelf, spilling down its front and its side
  (function shelfPlant() {
    const x = SHELF.x1 - 0.13, z = ROOM.zBack + 0.2, y = SHELF.H;
    pot(0.07, 0.1, x, y, z);
    vine([[x - 0.03, y + 0.09, z + 0.04], [x - 0.06, y + 0.04, z + 0.13], [x - 0.08, y - 0.02, z + 0.165], [x - 0.1, y - 0.35, z + 0.17], [x - 0.06, y - 0.7, z + 0.18]], 0.045, 11, 0.06);
    vine([[x + 0.04, y + 0.09, z + 0.03], [x + 0.1, y + 0.05, z + 0.1], [x + 0.155, y - 0.04, z + 0.12], [x + 0.165, y - 0.3, z + 0.12], [x + 0.16, y - 0.52, z + 0.14]], 0.045, 13, 0.06);
    vine([[x - 0.05, y + 0.09, z - 0.01], [x - 0.14, y + 0.06, z + 0.06], [x - 0.24, y + 0.012, z + 0.1], [x - 0.33, y + 0.01, z + 0.15]], 0.045, 17, 0.055);
    for (let k = 0; k < 9; k++) { const a = k * 0.72; vines.push(new T.Matrix4().compose(V3(x + Math.cos(a) * 0.05, y + 0.11, z + Math.sin(a) * 0.05), new T.Quaternion().setFromEuler(new T.Euler(-1.0 + (k % 2) * 0.4, a, 0)), V3(0.06, 0.06, 0.06))); }
  })();
  const vineMesh = new T.InstancedMesh(leafGeo(1, 1, 0.12, 0.1), potheMat, vines.length);
  vines.forEach((m, i) => vineMesh.setMatrixAt(i, m));
  vineMesh.castShadow = true; vineMesh.receiveShadow = true; scene.add(vineMesh);
  // a monstera on the right, where the room opens
  (function monstera() {
    const x = 1.42, z = -0.14, rnd = mulberry(29);
    pot(0.14, 0.26, x, 0, z);
    for (let k = 0; k < 12; k++) {
      const a = k * 2.39996 + 0.4, r = 0.08 + rnd() * 0.24, h = 0.42 + rnd() * 0.62;
      const start = V3(x + Math.cos(a) * 0.03, 0.23, z + Math.sin(a) * 0.03), end = V3(Math.min(1.6, x + Math.cos(a) * r), h, z + Math.sin(a) * r * 0.9);
      const ctrl = V3((start.x + end.x) / 2, h + 0.08, (start.z + end.z) / 2);
      put(stemMat, new T.TubeGeometry(new T.QuadraticBezierCurve3(start, ctrl, end), 10, 0.006, 5));
      const out = V3(Math.cos(a), 0, Math.sin(a) * 0.8).normalize(), nrm = out.clone().multiplyScalar(0.55).add(V3(0, 0.85, 0)).normalize();
      dummy.position.copy(end); dummy.scale.setScalar(1); dummy.lookAt(end.clone().add(nrm));
      dummy.rotateZ((rnd() - 0.5) * 0.8 + Math.PI);
      const sc = 0.24 + rnd() * 0.16; dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
      const lg = leafGeo(1, 1, 0.08, 0.12); lg.applyMatrix4(dummy.matrix);
      put(monsteraMat, lg);
    }
  })();

  // album sleeves: two leaning on the shelf, a crate of them by the wall, one record out on the bed
  const albumArt = [
    (g, w, h) => { g.fillStyle = '#1d3b45'; g.fillRect(0, 0, w, h); for (let k = 0; k < 9; k++) { g.strokeStyle = k % 2 ? '#e0703a' : '#f0c75a'; g.lineWidth = 9; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, 70 + k * 20 + Math.sin(x / 26 + k) * 12); g.stroke(); } g.fillStyle = '#f4ead4'; g.font = '900 38px "Arial Black", Arial'; g.fillText('ONDA', 20, 50); },
    (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#120a2a'); gr.addColorStop(0.55, '#7a1f6a'); gr.addColorStop(1, '#ff7a3d'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,90,200,0.8)'; g.lineWidth = 2; for (let k = 0; k < 10; k++) { g.beginPath(); g.moveTo(0, 160 + k * k * 1.2); g.lineTo(w, 160 + k * k * 1.2); g.stroke(); } for (let k = -8; k <= 8; k++) { g.beginPath(); g.moveTo(w / 2 + k * 8, 160); g.lineTo(w / 2 + k * 60, h); g.stroke(); } g.fillStyle = '#ffe6f6'; g.font = 'italic 900 40px Arial'; g.fillText('NEÓN', 64, 100); },
    (g, w, h) => { g.fillStyle = '#e8e0d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(128, 120, 70, 0, 6.2832); g.fill(); g.fillStyle = '#e8e0d0'; g.fillRect(58, 112, 140, 10); g.fillStyle = '#c8392b'; g.beginPath(); g.arc(180, 70, 14, 0, 6.2832); g.fill(); g.fillStyle = '#1a1a1a'; g.font = '700 22px Georgia'; g.fillText('Retrato', 24, 236); },
    (g, w, h) => { g.fillStyle = '#efe2c0'; g.fillRect(0, 0, w, h); ['#c8392b', '#1f4f7a', '#e0a21b', '#2f6b4e'].forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.moveTo(30 + k * 50, 220); g.lineTo(80 + k * 50, 60 + k * 20); g.lineTo(130 + k * 50, 220); g.fill(); }); g.fillStyle = '#222'; g.font = '900 24px Arial'; g.fillText('LOS SURCOS', 24, 40); },
    (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6b04a'); gr.addColorStop(0.6, '#e2542e'); gr.addColorStop(1, '#3a1430'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(150, 150, 46, 0, 6.2832); g.fill(); g.fillStyle = '#1e0c1a'; g.fillRect(70, 110, 6, 140); for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(73, 110, 42, 9, k * 0.45 - 1.2, 0, 6.2832); g.fill(); } g.fillRect(0, 230, w, 26); g.fillStyle = '#fff1d6'; g.font = '800 26px Georgia'; g.fillText('Trópico', 140, 40); },
    (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a2f55'); gr.addColorStop(0.5, '#e07a3a'); gr.addColorStop(0.62, '#f4c27a'); gr.addColorStop(0.63, '#3a3a5a'); gr.addColorStop(1, '#1c1c30'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(255,210,150,' + (0.5 - k * 0.03) + ')'; g.fillRect(110 - k * 3, 165 + k * 6, 36 + k * 6, 2); } g.fillStyle = '#f4ead4'; g.font = 'italic 700 24px Georgia'; g.fillText('Atardecer', 20, 40); }
  ];
  const albumTex = tex(makeCanvas(768, 512, (g) => {     // six covers on one sheet
    const rnd = mulberry(47);
    albumArt.forEach((draw, k) => {
      g.save(); g.translate((k % 3) * 256, ((k / 3) | 0) * 256); g.beginPath(); g.rect(0, 0, 256, 256); g.clip();
      draw(g, 256, 256);
      g.fillStyle = 'rgba(255,245,225,0.08)'; for (let i = 0; i < 300; i++) g.fillRect(rnd() * 256, rnd() * 256, 1, 1);
      g.strokeStyle = 'rgba(255,250,240,0.25)'; g.lineWidth = 2; g.strokeRect(3, 3, 250, 250);
      g.restore();
    });
  }));
  const albumMat = new T.MeshStandardMaterial({ map: albumTex, roughness: 0.6 });
  function sleeve(art, m) {                              // m: where it is; its face looks along +z
    const prev = xf; xf = prev ? prev.clone().multiply(m) : m;
    matte(new T.BoxGeometry(0.315, 0.315, 0.004), 0xd8ceb8);
    const f = new T.PlaneGeometry(0.313, 0.313), uv = f.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ((art % 3) + uv.getX(i)) / 3, 1 - (((art / 3) | 0) + 1 - uv.getY(i)) / 2);
    put(albumMat, mv(f, 0, 0, 0.0023));
    xf = prev;
  }
  [[0, 0.24, 0.05], [3, 0.3, -0.04]].forEach(([art, lean, ry], k) => {
    const x = SHELF.x0 + 0.24 + k * 0.05, zb = SHELF.z1 + 0.016 + k * 0.012;
    sleeve(art, M4(x, 0.1575 * Math.cos(lean) + 0.002, zb + 0.1575 * Math.sin(lean), ry, -lean));
  });
  const recordTex = tex(makeCanvas(512, 512, (g, w) => {
    g.fillStyle = '#0c0c0d'; g.fillRect(0, 0, w, w);
    for (let r = 248; r > 80; r -= 2) { g.strokeStyle = 'rgba(255,255,255,' + (r % 22 < 2 ? 0.0 : 0.035 + 0.02 * Math.sin(r)) + ')'; g.lineWidth = 1; g.beginPath(); g.arc(256, 256, r, 0, 6.2832); g.stroke(); }
    g.fillStyle = '#e2a23a'; g.beginPath(); g.arc(256, 256, 70, 0, 6.2832); g.fill();
    g.fillStyle = '#3a2410'; g.font = '700 16px Georgia'; g.textAlign = 'center'; g.fillText('ATARDECER', 256, 236); g.font = '12px Georgia'; g.fillText('LADO A · 33⅓', 256, 290);
    g.fillStyle = '#0c0c0d'; g.beginPath(); g.arc(256, 256, 5, 0, 6.2832); g.fill();
  }));
  (function recordOnBed() {
    const sp = bedSpots.sleeve, rp = bedSpots.record;
    sleeve(5, M4(sp.x, sp.y + 0.002, sp.z, sp.rot, -Math.PI / 2));
    const recMat = new T.MeshStandardMaterial({ map: recordTex, roughness: 0.28, metalness: 0.1 }); recMat.userData.envK = 1.2; envMats.push(recMat);
    const rec = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.002, 72), [new T.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.4 }), recMat, recMat]);
    rec.position.set(rp.x, rp.y + 0.001, rp.z); rec.rotation.set(0, 0.6, 0); rec.castShadow = true; rec.receiveShadow = true; scene.add(rec);
  })();
  // a milk crate of records on the edge of the rug
  at(1.6, 0, -0.66, -Math.PI / 2 + 0.2, () => {
    const W = 0.36, D = 0.34, Hc = 0.27, BLUE = 0x2f6fa3, b = 0.012;
    at(0, 0, 0, 0, () => {
      gloss(rbox(W, b, D, 0.002, 0, b / 2, 0), BLUE);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) gloss(rbox(0.026, Hc, 0.026, 0.006, sx * (W / 2 - 0.013), Hc / 2, sz * (D / 2 - 0.013)), BLUE);
      for (const y of [0.02, Hc - 0.02]) {
        for (const sz of [-1, 1]) gloss(rbox(W, 0.04, b, 0.004, 0, y, sz * (D / 2 - b / 2)), BLUE);
        for (const sx of [-1, 1]) gloss(rbox(b, 0.04, D, 0.004, sx * (W / 2 - b / 2), y, 0), BLUE);
      }
      for (let k = 1; k < 6; k++) {
        for (const sz of [-1, 1]) gloss(rbox(0.016, Hc - 0.04, 0.006, 0.002, -W / 2 + k * W / 6, Hc / 2, sz * (D / 2 - 0.006)), BLUE);
        for (const sx of [-1, 1]) gloss(rbox(0.006, Hc - 0.04, 0.016, 0.002, sx * (W / 2 - 0.006), Hc / 2, -D / 2 + k * D / 6), BLUE);
      }
      for (const sz of [-1, 1]) gloss(rbox(W, 0.016, 0.006, 0.002, 0, Hc / 2, sz * (D / 2 - 0.006)), BLUE);
      for (const sx of [-1, 1]) gloss(rbox(0.006, 0.016, D, 0.002, sx * (W / 2 - 0.006), Hc / 2, 0), BLUE);
      // the records lean back together; the front two show their covers
      const rnd = mulberry(91), lean = 0.13;
      let z = -D / 2 + 0.014;
      for (let k = 0; k < 18; k++) {
        const w = 0.004 + rnd() * 0.003, dx = (rnd() - 0.5) * 0.012;
        matte(mv(new T.BoxGeometry(0.313, 0.313, w), dx, b + 0.157 * Math.cos(lean) + 0.001, z + 0.157 * Math.sin(lean), 0, -lean), LP_COLS[(rnd() * LP_COLS.length) | 0]);
        z += w + 0.0025 + rnd() * 0.003;
      }
      sleeve(1, M4(0.004, b + 0.1575 * Math.cos(lean) + 0.001, z + 0.1575 * Math.sin(lean), 0, -lean));
      sleeve(4, M4(-0.012, b + 0.1575 * Math.cos(lean + 0.2) + 0.001, z + 0.012 + 0.1575 * Math.sin(lean + 0.2), 0.04, -lean - 0.2));
    });
  });

  // a skateboard leaning on the left wall between the shelf and the dresser, graphic out
  (function skateboard() {
    const shape = new T.Shape(), L = 0.4, Wd = 0.1;
    shape.moveTo(-L + Wd, -Wd); shape.lineTo(L - Wd, -Wd); shape.absarc(L - Wd, 0, Wd, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-L + Wd, Wd); shape.absarc(-L + Wd, 0, Wd, Math.PI / 2, Math.PI * 1.5, false);
    const kick = (g) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const ax = Math.abs(p.getX(i)); if (ax > 0.27) p.setZ(i, p.getZ(i) + (ax - 0.27) * (ax - 0.27) * 2.2); } g.computeVertexNormals(); return g; };
    const deckG = kick(new T.ExtrudeGeometry(shape, { depth: 0.011, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 24 }));
    const graphic = tex(makeCanvas(512, 128, (g, w, h) => {
      g.translate(w, 0); g.scale(-1, 1);                    // the deck faces out mirrored, so the art is drawn mirrored
      g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, w, h);
      ['#f4b04a', '#e8743a', '#d0453a', '#8c2f5a'].forEach((c, k) => { g.fillStyle = c; g.fillRect(150 + k * 4, 20 + k * 22, 220 - k * 8, 14); });
      g.fillStyle = '#f4ead4'; g.font = 'italic 900 34px "Arial Black", Arial'; g.fillText('CARTAGO', 168, 118);
    }));
    graphic.repeat.set(1 / 0.8, 1 / 0.2); graphic.offset.set(0.5, 0.5);
    const deckMat = new T.MeshStandardMaterial({ map: graphic, roughness: 0.45 }); envMats.push(deckMat);
    const plyMat = new T.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.6 });
    // holder: stands on the floor at the wall, leaning back on it; board: length up, grip toward the wall, graphic out
    at(ROOM.xMin + 0.135, 0.44, -1.49, Math.PI / 2, () => at(0, 0, 0, Math.PI, () => {
      addMesh(new T.Mesh(deckG, [deckMat, plyMat]));
      matte(kick(new T.ShapeGeometry(shape, 24).translate(0, 0, 0.0135)), 0x151515);
      for (const tx of [-0.22, 0.22]) {
        metal(rbox(0.05, 0.17, 0.03, 0.004, tx, 0, -0.018), 0x9a9a9e);
        for (const ty of [-0.1, 0.1]) matte(mv(cyl(0.027, 0.027, 0.032, 18), tx, ty, -0.045), 0xe0782a);
      }
    }, 0, Math.PI / 2), -0.16);
  })();

  // a pair of canvas high-tops kicked off by the bed
  function sneaker(x, z, ry, lean) {
    at(x, RUG.h, z, ry, () => {
      const CANVAS = 0x1f2a3a, RUBBER = 0xe8e2d2, LACE = 0xf2ecdc;
      const hk = (t) => lerp(1.35, 0.5, smooth(t, 0.34, 0.86)) - 0.1 * Math.exp(-Math.pow((t - 0.4) / 0.08, 2));
      const topY = (zz) => 0.022 + 0.1 * hk((zz / 0.134 + 1) / 2);
      const sole = roundedBox(0.1, 0.028, 0.29, 0.012, 4, 2, 12), sp = sole.attributes.position;
      for (let i = 0; i < sp.count; i++) { const t = sp.getZ(i) / 0.145; sp.setX(i, sp.getX(i) * (0.86 + 0.14 * Math.cos(t * 1.3 - 0.35))); if (t > 0.6) sp.setY(i, sp.getY(i) + 0.012 * (t - 0.6) * (t - 0.6) / 0.16); }
      sole.computeVertexNormals();
      gloss(mv(sole, 0, 0.014, 0), RUBBER);
      const up = roundedBox(0.09, 0.1, 0.268, 0.036, 8, 8, 16), p = up.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const t = (p.getZ(i) / 0.134 + 1) / 2, y1 = (p.getY(i) + 0.05) * hk(t);
        p.setY(i, y1); p.setX(i, p.getX(i) * (0.88 + 0.12 * Math.sin(t * Math.PI)) * (1 - 0.2 * clamp(y1 / 0.13, 0, 1)));
      }
      up.computeVertexNormals();
      matte(mv(up, 0, 0.022, 0), CANVAS);
      const cap = new T.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(0.046, 0.04, 0.062);
      gloss(mv(cap, 0, 0.036, 0.078), RUBBER);                                                          // rubber toe cap
      matte(mv(cyl(0.027, 0.027, 0.004, 18), 0, topY(-0.072) - 0.003, -0.072, 0, 0.12).scale(1, 1, 1), 0x0e0f12);   // the opening
      matte(rbox(0.03, 0.005, 0.115, 0.002, 0, (topY(-0.03) + topY(0.06)) / 2 + 0.004, 0.015, 0, 0.55), LACE);        // tongue
      for (let k = 0; k < 6; k++) { const zz = -0.034 + k * 0.019; matte(rbox(0.05 - k * 0.002, 0.005, 0.006, 0.0015, 0, topY(zz) + 0.004, zz, k % 2 ? 0.25 : -0.25, 0.55), LACE); }
      gloss(mv(cyl(0.015, 0.015, 0.003, 14), -0.038, 0.105, -0.07, 0, 0, Math.PI / 2), RUBBER);           // ankle patch
    }, 0, lean || 0);
  }
  sneaker(0.71, -0.58, 0.45);
  sneaker(0.88, -0.42, 1.25);

  // comics left on the floor by the nightstand, where they were read
  comics(6, -0.84, 0, -1.4, 0.35, 55);
  comics(1, -0.72, 0, -1.14, -0.6, 56);

  // a model plane on fishing line, banking over the room
  (function plane() {
    const PM = [0.5, 2.1, -1.2, -0.9, 0.08, 0.3], OLIVE = 0x5d6b3c, YEL = 0xe0a21b;
    at(PM[0], PM[1], PM[2], PM[3], () => {
      gloss(mv(lathe([[0, 0], [0.012, 0.004], [0.021, 0.03], [0.023, 0.08], [0.02, 0.15], [0.012, 0.22], [0.005, 0.27], [0, 0.272]], 16), 0, 0, 0.1, 0, -Math.PI / 2), OLIVE);
      for (const sx of [-1, 1]) {
        const w = bevelBox(0.15, 0.005, 0.058, 0.002), wp = w.attributes.position;
        for (let i = 0; i < wp.count; i++) { const k = (wp.getX(i) * sx + 0.075) / 0.15; wp.setZ(i, wp.getZ(i) * (1 - 0.35 * k) - 0.008 * k); }      // tapered toward the tip
        w.computeVertexNormals();
        gloss(mv(w, sx * 0.08, -0.004 + 0.0055, 0.035, 0, 0, sx * 0.07), OLIVE);
        gloss(rbox(0.022, 0.0056, 0.036, 0.002, sx * 0.145, 0.0118, 0.028, 0, 0, sx * 0.07), YEL);
      }
      gloss(rbox(0.11, 0.004, 0.034, 0.0015, 0, 0.004, -0.148), OLIVE);
      gloss(rbox(0.004, 0.05, 0.04, 0.0015, 0, 0.03, -0.152, 0, -0.25), OLIVE);
      gloss(rbox(0.0044, 0.016, 0.03, 0.0015, 0, 0.05, -0.16, 0, -0.25), YEL);
      const can = new T.SphereGeometry(1, 14, 10); can.scale(0.011, 0.012, 0.034); gloss(mv(can, 0, 0.02, 0.028), 0x1d3b45);
      const spin = new T.ConeGeometry(0.012, 0.022, 14); gloss(mv(spin, 0, 0, 0.111, 0, Math.PI / 2), 0xb8322a);
      matte(rbox(0.12, 0.009, 0.002, 0, 0, 0, 0.106, 0, 0, 0.6), 0x2a2420);
    }, PM[4], PM[5]);
    const hook = V3(0, 0.024, 0.02).applyMatrix4(M4(PM[0], PM[1], PM[2], PM[3], PM[4], PM[5]));
    matte(mv(cyl(0.0007, 0.0007, ROOM.yMax - hook.y, 4), hook.x, (ROOM.yMax + hook.y) / 2, hook.z), 0xd9d4c8);
  })();

  // a backpack slumped against the right wall, by the desk
  at(ROOM.xMax - 0.165, 0, -1.08, -Math.PI / 2 + 0.12, () => {
    const RED = 0x9f3a26;
    const body = roundedBox(0.3, 0.42, 0.17, 0.07, 10, 12, 6), p = body.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const ty = (p.getY(i) + 0.21) / 0.42, x = p.getX(i) / 0.15;
      p.setX(i, p.getX(i) * (1 + 0.1 * (1 - ty) - 0.06 * ty));
      p.setZ(i, p.getZ(i) * (1 + 0.28 * (1 - ty) * (1 - ty)) + (p.getZ(i) > 0 ? 0.012 * Math.sin(ty * 9 + x * 2) * ty : 0));
      p.setY(i, p.getY(i) - 0.035 * ty * x * x - 0.02 * ty * ty);
    }
    body.computeVertexNormals();
    matte(mv(body, 0, 0.21, 0), RED);
    const pk = roundedBox(0.22, 0.19, 0.08, 0.035, 6, 6, 4), pp = pk.attributes.position;
    for (let i = 0; i < pp.count; i++) pp.setY(i, pp.getY(i) - 0.012 * Math.pow(pp.getX(i) / 0.11, 2) * (pp.getY(i) > 0 ? 1 : 0));
    pk.computeVertexNormals();
    matte(mv(pk, 0, 0.125, 0.105), 0x8a3020);
    matte(rbox(0.19, 0.006, 0.012, 0.002, 0, 0.2, 0.141), 0x1a1612); metal(rbox(0.012, 0.02, 0.004, 0.001, 0.07, 0.19, 0.148, 0, 0, 0.3), CHROME);
    const zip = new T.TorusGeometry(0.135, 0.004, 5, 24, Math.PI); zip.scale(1, 0.75, 1); matte(mv(zip, 0, 0.3, 0.075, 0, -0.5), 0x1a1612);
    const hd = new T.TorusGeometry(0.035, 0.007, 6, 14, Math.PI); matte(mv(hd, 0, 0.395, -0.03, Math.PI / 2, 0, 0), 0x1a1612);
    // one strap flopped out on the floor
    const strap = new T.TubeGeometry(new T.CatmullRomCurve3([V3(0.1, 0.36, -0.07), V3(0.2, 0.2, -0.03), V3(0.24, 0.03, 0.06), V3(0.2, 0.008, 0.2)]), 16, 0.016, 6), stp = strap.attributes.position;
    for (let i = 0; i < stp.count; i++) stp.setY(i, Math.max(0.004, stp.getY(i)));
    matte(strap, 0x1a1612);
  }, -0.13);

  // a basketball that rolled against the dresser
  (function ball() {
    const bt = tex(makeCanvas(512, 256, (g, w, h) => {
      const rnd = mulberry(13);
      g.fillStyle = '#c4601f'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16000; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(60,20,0,0.22)' : 'rgba(255,170,90,0.14)'; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
      g.strokeStyle = '#1a1210'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
      for (const x of [0, w / 2, w]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (const x of [w / 4, 3 * w / 4]) { g.beginPath(); for (let y = 0; y <= h; y += 4) { const xx = x + Math.sin(y / h * Math.PI) * 46 * (x < w / 2 ? 1 : -1) - (x < w / 2 ? 46 : -46); if (y === 0) g.moveTo(xx, y); else g.lineTo(xx, y); } g.stroke(); g.beginPath(); for (let y = 0; y <= h; y += 4) { const xx = x - Math.sin(y / h * Math.PI) * 46 * (x < w / 2 ? 1 : -1) + (x < w / 2 ? 46 : -46); if (y === 0) g.moveTo(xx, y); else g.lineTo(xx, y); } g.stroke(); }
    }));
    const m = new T.Mesh(new T.SphereGeometry(0.12, 40, 28), new T.MeshStandardMaterial({ map: bt, roughness: 0.7 }));
    m.position.set(-1.63, 0.12, -0.286); m.rotation.set(0.5, 0.8, 0.3); addMesh(m);
  })();
  flush();
  photo('wool_nor', false, [9, 9], set([rugMat], 'normalMap', (m) => { m.normalScale.set(1.6, 1.6); }));
  photo('cotton_nor', false, [2, 2], set(posterMats, 'normalMap', (m) => { m.normalScale.set(0.12, 0.12); }));

  /* ───────────────────────── lights ───────────────────────── */
  const hemi = new T.HemisphereLight(0xffffff, 0xffffff, 1); scene.add(hemi);
  const sun = new T.SpotLight(0xffffff, 10, 0, 0.03, 0.2, 0);
  sun.position.copy(SUN_POS); sun.target.position.copy(G0).addScaledVector(SUN_DIR, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 36; sun.shadow.camera.far = 50; sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.01; sun.shadow.radius = 2.5;
  scene.add(sun, sun.target);
  const fill = new T.DirectionalLight(0xa9bfe6, 0.3); fill.position.set(1.4, 2.4, 4); scene.add(fill);
  const bounce = new T.PointLight(0xff9a55, 2, 4, 2); bounce.position.set(0.25, 0.42, 0.25); scene.add(bounce);
  const lampLight = new T.PointLight(0xff5a20, 1.5, 4, 2); lampLight.position.set(LAVA.x + 0.03, LAVA.y + 0.33, LAVA.z + 0.12); scene.add(lampLight);
  const roomLamp = new T.SpotLight(0xffb066, 8, 0, 1.0, 1, 2);       // the ceiling light's worth of warm fill, from the right front
  roomLamp.position.set(1.45, 2.5, 1.5); roomLamp.target.position.set(-0.5, 0.7, -1.9);
  roomLamp.castShadow = true; roomLamp.shadow.mapSize.set(1024, 1024); roomLamp.shadow.camera.near = 0.4; roomLamp.shadow.camera.far = 8;
  roomLamp.shadow.bias = -0.0006; roomLamp.shadow.normalBias = 0.02; roomLamp.shadow.radius = 5;
  scene.add(roomLamp, roomLamp.target);

  /* ───────────────────────── the puzzles: an Axis Cube, a 3×3 and a 2×2 ───────────────────────── */
  const FACE_N = [V3(1, 0, 0), V3(-1, 0, 0), V3(0, 1, 0), V3(0, -1, 0), V3(0, 0, 1), V3(0, 0, -1)];
  const FACE_COL = ['#1e96f0', '#19c96a', '#d9f531', '#f4f1ea', '#ff641f', '#ef2b45'].map((h) => new T.Color(h));
  const CUT = 1 / 3, GAP = 0.012, STK_M = 0.048, STK_R = 0.05, STK_H = 0.014, STK_RIM = 0.014;

  function polytope(planes) {
    const n = planes.length, verts = [];
    const c23 = V3(), c31 = V3(), c12 = V3();
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
      const n1 = planes[i].n, n2 = planes[j].n, n3 = planes[k].n;
      c23.crossVectors(n2, n3);
      const det = n1.dot(c23);
      if (Math.abs(det) < 1e-8) continue;
      c31.crossVectors(n3, n1); c12.crossVectors(n1, n2);
      const p = V3().addScaledVector(c23, planes[i].d).addScaledVector(c31, planes[j].d).addScaledVector(c12, planes[k].d).multiplyScalar(1 / det);
      let ok = true;
      for (let m = 0; m < n; m++) { if (planes[m].n.dot(p) - planes[m].d > 1e-6) { ok = false; break; } }
      if (!ok) continue;
      let dup = false;
      for (const v of verts) { if (v.distanceToSquared(p) < 1e-10) { dup = true; break; } }
      if (!dup) verts.push(p);
    }
    const faces = [];
    for (let m = 0; m < n; m++) {
      const pl = planes[m];
      const pts = verts.filter((v) => Math.abs(pl.n.dot(v) - pl.d) < 1e-5);
      if (pts.length < 3) continue;
      const c = V3(); pts.forEach((p) => c.add(p)); c.multiplyScalar(1 / pts.length);
      let u = null;
      for (const p of pts) { const d = p.clone().sub(c); if (d.lengthSq() > 1e-10) { u = d.normalize(); break; } }
      if (!u) continue;
      const w = V3().crossVectors(pl.n, u);
      const sorted = pts.map((p) => { const d = p.clone().sub(c); return { p, a: Math.atan2(d.dot(w), d.dot(u)) }; }).sort((a, b) => a.a - b.a).map((o) => o.p);
      let area = 0;
      for (let i = 1; i + 1 < sorted.length; i++) area += V3().crossVectors(sorted[i].clone().sub(sorted[0]), sorted[i + 1].clone().sub(sorted[0])).length() * 0.5;
      if (area < 1e-5) continue;
      faces.push({ plane: pl, pts: sorted });
    }
    return { verts, faces };
  }
  function bevelPlanes(poly) {
    const out = [], F = poly.faces;
    for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
      const shared = F[i].pts.filter((p) => F[j].pts.indexOf(p) >= 0);
      if (shared.length < 2) continue;
      const n1 = F[i].plane.n, n2 = F[j].plane.n, dot = n1.dot(n2);
      if (dot > 0.92) continue;
      const o1 = F[i].plane.kind === 'outer', o2 = F[j].plane.kind === 'outer';
      const w = (o1 && o2) ? 0.06 : (o1 || o2) ? 0.034 : 0.022;
      const nb = n1.clone().add(n2).normalize();
      out.push({ n: nb, d: nb.dot(shared[0]) - w * Math.sqrt(Math.max(0.02, (1 - dot) / 2)), kind: 'bevel' });
    }
    return out;
  }
  function clip2D(poly, nx, ny, c) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  function inset2D(poly, m) {
    let out = poly.slice();
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      let ex = b[0] - a[0], ey = b[1] - a[1];
      const l = Math.hypot(ex, ey);
      if (l < 1e-9) continue;
      ex /= l; ey /= l;
      out = clip2D(out, -ey, ex, -ey * a[0] + ex * a[1] + m);
      if (out.length < 3) return null;
    }
    const res = [];
    for (const p of out) { const q = res[res.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6) res.push(p); }
    if (res.length > 1 && Math.hypot(res[0][0] - res[res.length - 1][0], res[0][1] - res[res.length - 1][1]) < 1e-6) res.pop();
    if (res.length < 3) return null;
    let area = 0;
    for (let i = 0; i < res.length; i++) { const a = res[i], b = res[(i + 1) % res.length]; area += a[0] * b[1] - b[0] * a[1]; }
    return area * 0.5 > 2e-3 ? res : null;
  }
  function roundOutline(poly, r, steps) {
    const out = [], n = poly.length;
    for (let i = 0; i < n; i++) {
      const p0 = poly[(i + n - 1) % n], p = poly[i], p1 = poly[(i + 1) % n];
      const a0 = Math.atan2(-(p[0] - p0[0]), p[1] - p0[1]);
      let a1 = Math.atan2(-(p1[0] - p[0]), p1[1] - p[1]);
      while (a1 < a0) a1 += Math.PI * 2;
      for (let k = 0; k <= steps; k++) { const a = a0 + (a1 - a0) * k / steps; out.push([p[0] + r * Math.cos(a), p[1] + r * Math.sin(a), Math.cos(a), Math.sin(a)]); }
    }
    return out;
  }
  function geoFrom(pos, nor, col) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    if (col) g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return g;
  }

  const bodyMat = new T.MeshPhysicalMaterial({ color: 0x0b0b0d, roughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const stickerMat = new T.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.18 });
  stickerMat.onBeforeCompile = (sh) => {
    // fluorescent plastic: a little of its own colour comes back even in shade
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * 0.16;');
  };
  envMats.push(bodyMat, stickerMat);

  /* A puzzle is a cube cut across three turning axes, into three layers each (two on the 2×2). On the Axis Cube
     the axes are tilted inside the cube; on the other two they are square to its faces. Each puzzle keeps its
     own pieces and its own history of turns, its place on the bed and the pose it floats in. */
  const ROT = [[1, 0, 0, 0, 0, -1, 0, 1, 0], [0, 0, 1, 0, 1, 0, -1, 0, 0], [0, -1, 0, 1, 0, 0, 0, 0, 1]];
  const mul3 = (A, B) => { const C = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return C; };
  const tr3 = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
  const apply3 = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
  const m4 = new T.Matrix4(), tmpV = V3();
  const cellOf = (p) => apply3(p.M, p.cell0);
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const AX_TILTED = [V3(2, 2, -1).multiplyScalar(1 / 3), V3(2, -1, 2).multiplyScalar(1 / 3), V3(1, -2, -2).multiplyScalar(1 / 3)];
  const AX_SQUARE = [V3(1, 0, 0), V3(0, 1, 0), V3(0, 0, 1)];
  // tilt: how it is turned toward the viewer when it floats. The Axis Cube barely, so its mechanism stays square to
  // the screen under its askew shell; the other two in the usual three-quarter view, top and right face showing.
  const KINDS = {
    axis: { axes: AX_TILTED, n: 3, tilt: [0.16, -0.22], scale: CUBE_SCALE },
    cube3: { axes: AX_SQUARE, n: 3, tilt: [0.46, -0.6], scale: CUBE_SCALE * 0.92 },
    cube2: { axes: AX_SQUARE, n: 2, tilt: [0.46, -0.6], scale: CUBE_SCALE * 0.8 }
  };
  function makePuzzle(spot) {
    const kind = KINDS[spot.key], AX = kind.axes, n = kind.n;
    const P = {
      key: spot.key, spot, n, axes: AX, scale: kind.scale, group: new T.Group(), pieces: [],
      BAS: [AX[0].x, AX[1].x, AX[2].x, AX[0].y, AX[1].y, AX[2].y, AX[0].z, AX[1].z, AX[2].z],
      sim: { history: [], queue: 0, target: 'solved', cur: null, last: null, fast: false, onIdle: null }, qAnim: new T.Quaternion(),
      tilt: new T.Quaternion().setFromEuler(new T.Euler(kind.tilt[0], kind.tilt[1], 0)),
      restQ: new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), spot.yaw), restPos: V3(), playQ: new T.Quaternion(),
      lift: 0, liftV: 0, liftT: 0, ex: 0, exV: 0, exT: 0, press: 0, pressT: 0, pull: 0, pullT: 0
    };
    P.BAS_T = tr3(P.BAS); P.tiltInv = P.tilt.clone().invert(); P.playQ.copy(P.restQ);
    // presented with its mechanism square to the screen: one turning axis up, one to the right, one at the viewer
    const zv = V3().crossVectors(AX[1], AX[0]);
    P.present = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().set(
      AX[1].x, AX[1].y, AX[1].z, 0, AX[0].x, AX[0].y, AX[0].z, 0, zv.x, zv.y, zv.z, 0, 0, 0, 0, 1));
    const cells = n === 3 ? [-1, 0, 1] : [-1, 1];
    for (const i of cells) for (const j of cells) for (const k of cells) {
      if (!i && !j && !k) continue;
      const planes = FACE_N.map((nn, f) => ({ n: nn, d: 1, kind: 'outer', face: f }));
      [i, j, k].forEach((c, a) => {
        const ax = AX[a];
        if (n === 2) planes.push({ n: c > 0 ? ax.clone().negate() : ax.clone(), d: -GAP, kind: 'cut' });
        else if (c === 1) planes.push({ n: ax.clone().negate(), d: -(CUT + GAP), kind: 'cut' });
        else if (c === -1) planes.push({ n: ax.clone(), d: -(CUT + GAP), kind: 'cut' });
        else { planes.push({ n: ax.clone(), d: CUT - GAP, kind: 'cut' }); planes.push({ n: ax.clone().negate(), d: CUT - GAP, kind: 'cut' }); }
      });
      const raw = polytope(planes);
      if (raw.faces.length < 4) continue;
      const fin = polytope(planes.concat(bevelPlanes(raw)));
      const bp = [], bn = [];
      for (const f of fin.faces) {
        const nn = f.plane.n;
        for (let t = 1; t + 1 < f.pts.length; t++) for (const q of [f.pts[0], f.pts[t], f.pts[t + 1]]) { bp.push(q.x, q.y, q.z); bn.push(nn.x, nn.y, nn.z); }
      }
      const sp = [], sn = [], sc = [];
      for (const f of raw.faces) {
        if (f.plane.kind !== 'outer') continue;
        const nn = f.plane.n, col = FACE_COL[f.plane.face];
        const U = (Math.abs(nn.y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0)).cross(nn).normalize(), W = V3().crossVectors(nn, U), O = f.pts[0];
        const poly = f.pts.map((p) => { const d = p.clone().sub(O); return [d.dot(U), d.dot(W)]; });
        const core = inset2D(poly, STK_M + STK_R);
        if (!core) continue;
        const top = roundOutline(core, STK_R, 6), base = roundOutline(core, STK_R + STK_RIM, 6);
        const P3 = (q, h) => O.clone().addScaledVector(U, q[0]).addScaledVector(W, q[1]).addScaledVector(nn, h);
        let mx = 0, my = 0; top.forEach((q) => { mx += q[0]; my += q[1]; }); mx /= top.length; my /= top.length;
        const C = P3([mx, my], STK_H);
        const push = (v, nv) => { sp.push(v.x, v.y, v.z); sn.push(nv.x, nv.y, nv.z); sc.push(col.r, col.g, col.b); };
        for (let t = 0; t < top.length; t++) {
          const a = top[t], b = top[(t + 1) % top.length], a2 = base[t], b2 = base[(t + 1) % top.length];
          const Av = P3(a, STK_H), Bv = P3(b, STK_H), A2 = P3(a2, 0), B2 = P3(b2, 0);
          push(C, nn); push(Av, nn); push(Bv, nn);
          const na = V3().addScaledVector(U, a[2]).addScaledVector(W, a[3]).multiplyScalar(STK_H).addScaledVector(nn, STK_RIM).normalize();
          const nb = V3().addScaledVector(U, b[2]).addScaledVector(W, b[3]).multiplyScalar(STK_H).addScaledVector(nn, STK_RIM).normalize();
          push(Av, na); push(A2, na); push(B2, nb);
          push(Av, na); push(B2, nb); push(Bv, nb);
        }
      }
      const group = new T.Group();
      const body = new T.Mesh(geoFrom(bp, bn), bodyMat); body.castShadow = true; body.receiveShadow = true; group.add(body);
      if (sp.length) { const st = new T.Mesh(geoFrom(sp, sn, sc), stickerMat); st.castShadow = true; st.receiveShadow = true; group.add(st); }
      P.group.add(group);
      P.pieces.push({ group, cell0: [i, j, k], M: [1, 0, 0, 0, 1, 0, 0, 0, 1], qBase: new T.Quaternion(), verts: fin.verts });
    }
    const core = new T.Mesh(new T.SphereGeometry(0.46, 24, 16), bodyMat); core.castShadow = true; P.group.add(core);
    scene.add(P.group);
    return P;
  }
  function quatFromM(P, M, out) {
    const R = mul3(mul3(P.BAS, M), P.BAS_T);
    m4.set(R[0], R[1], R[2], 0, R[3], R[4], R[5], 0, R[6], R[7], R[8], 0, 0, 0, 0, 1);
    return out.setFromRotationMatrix(m4);
  }
  function nextMove(P) {
    const sim = P.sim;
    if (sim.target === 'scrambled') {
      if (sim.queue <= 0) return null;
      let m;
      do { m = { axis: Math.floor(Math.random() * 3), side: Math.random() < 0.5 ? -1 : 1, dir: Math.random() < 0.5 ? -1 : 1 }; }
      while (sim.last && m.axis === sim.last.axis && m.side === sim.last.side);
      sim.queue--; sim.history.push(m);
      return { axis: m.axis, side: m.side, dir: m.dir, dur: sim.fast ? 0.075 : 0.16 };
    }
    if (!sim.history.length) return null;
    const h = sim.history.pop();
    return { axis: h.axis, side: h.side, dir: -h.dir, dur: sim.fast ? 0.06 : 0.135 };
  }
  function stepMoves(P, dt) {
    const sim = P.sim;
    if (!sim.cur) {
      const m = nextMove(P);
      if (!m) { if (sim.onIdle) sim.onIdle(); return; }
      m.t = 0; m.parts = P.pieces.filter((p) => cellOf(p)[m.axis] === m.side);
      sim.cur = m;
    }
    const m = sim.cur;
    m.t += dt / m.dur;
    const e = m.t >= 1 ? 1 : ease(m.t);
    P.qAnim.setFromAxisAngle(P.axes[m.axis], m.dir * Math.PI / 2 * e);
    for (const p of m.parts) p.group.quaternion.copy(P.qAnim).multiply(p.qBase);
    if (m.t >= 1) {
      const R = m.dir > 0 ? ROT[m.axis] : tr3(ROT[m.axis]);
      for (const p of m.parts) { p.M = mul3(R, p.M); quatFromM(P, p.M, p.qBase); p.group.quaternion.copy(p.qBase); }
      sim.last = m; sim.cur = null; P.qAnim.identity();
    }
  }
  function settle(P) {                                  // where it rests: on its lowest point, in the hollow it makes in the duvet
    let lo = Infinity;
    for (const p of P.pieces) for (const v of p.verts) { tmpV.copy(v).applyQuaternion(p.qBase).applyQuaternion(P.restQ); if (tmpV.y < lo) lo = tmpV.y; }
    P.restPos.set(P.spot.x, P.spot.y - lo * P.spot.s, P.spot.z);
  }
  const puzzles = SPOTS.map(makePuzzle);
  puzzles.forEach((P) => { settle(P); P.group.position.copy(P.restPos); P.group.quaternion.copy(P.restQ); P.group.scale.setScalar(P.spot.s); });
  const beam = { pos: CUBE_HOME.clone() };             // where the floating puzzle stands in the sun, for its shadow in the haze

  /* ───────────────────────── dust ───────────────────────── */
  const DUST_BOX = { min: V3(-1.3, 0.3, -1.9), size: V3(2.6, 2.2, 3.4) };
  const LIGHT_GLSL = `
    uniform sampler2D tMask; uniform vec3 uLightPos; uniform vec3 uSunDir; uniform vec4 uCurt; uniform float uCurtZ;
    uniform vec3 uCubePos; uniform float uCubeR;
    float beamAt(vec3 p){
      float k = (uCurtZ - uLightPos.z) / (p.z - uLightPos.z);
      vec2 q = uLightPos.xy + (p.xy - uLightPos.xy) * k;
      vec2 uv = (q - uCurt.xy) / uCurt.zw;
      float m = textureLod(tMask, uv, 0.0).r * step(uCurtZ, p.z);
      vec3 pc = uCubePos - p;
      float along = dot(pc, -uSunDir);
      vec3 perp = pc + uSunDir * along;
      float sh = along > 0.0 ? smoothstep(uCubeR * 0.72, uCubeR * 1.08, length(perp)) : 1.0;
      return m * sh;
    }`;
  const lightUniforms = {
    tMask: { value: maskTex }, uLightPos: { value: SUN_POS }, uSunDir: { value: SUN_DIR },
    uCurt: { value: new T.Vector4(CURT.x0, CURT.y0, CW, CH) }, uCurtZ: { value: CURT.z },
    uCubePos: { value: beam.pos }, uCubeR: { value: 0.001 }
  };
  // Dust as it looks in a real sunbeam: motes too small to see until the sun catches them, then specks of a pixel
  // or two, brightest when the light comes toward the eye (they scatter forward, like haze against the sun) and
  // nearly gone when it does not. They hang in uneven clouds, drift on slow air currents and rise a little in the
  // warm light; a few flat flakes turn and glint softly. The ones close to the lens are out of focus: wide, flat,
  // very faint discs, their light spread over the disc. No sparkle, no glow halo, nothing outside the light.
  const dustMat = new T.ShaderMaterial({
    uniforms: Object.assign({
      uTime: { value: 0 }, uPx: { value: 800 }, uMinPx: { value: 1.6 }, uBoxMin: { value: DUST_BOX.min }, uBoxSize: { value: DUST_BOX.size },
      uColor: { value: new T.Color(1, 0.86, 0.62) }, uGain: { value: 1 }, uAmbient: { value: 0 }, uFocus: { value: 2.6 },
      uPuff: { value: new T.Vector4(0, 0, 0, -100) }
    }, lightUniforms),
    vertexShader: LIGHT_GLSL + `
      attribute vec4 aSeed;
      uniform float uTime; uniform float uPx; uniform float uMinPx; uniform vec3 uBoxMin; uniform vec3 uBoxSize; uniform vec4 uPuff; uniform float uFocus;
      varying float vI; varying float vFocus;
      void main(){
        vec3 p = position; float t = uTime;
        // slow air: a broad drift that differs from mote to mote, a faint rise, and a small Brownian tremble
        p.x += sin(t * 0.045 * (0.5 + aSeed.x) + aSeed.y * 6.283) * 0.14 + sin(t * 1.7 + aSeed.z * 40.0) * 0.0025;
        p.z += cos(t * 0.038 * (0.5 + aSeed.y) + aSeed.z * 6.283) * 0.14 + sin(t * 1.3 + aSeed.x * 40.0) * 0.0025;
        p.y += t * (0.004 + 0.006 * aSeed.z) + sin(t * 0.06 + aSeed.w * 6.283) * 0.05 + sin(t * 1.9 + aSeed.y * 40.0) * 0.002;
        p = uBoxMin + mod(p - uBoxMin, uBoxSize);
        float age = t - uPuff.w;                                   // a tap on the puzzle stirs the air around it
        vec3 dp = p - uPuff.xyz; float dl = length(dp) + 1e-4;
        p += dp / dl * 0.18 * exp(-dl * 2.0) * (1.0 - exp(-age * 4.0)) * exp(-age * 0.45) * step(0.0, age);
        float lit = beamAt(p);
        // uneven clouds: a slow, coarse density field decides which motes are there at all
        float n = 0.5 + 0.22 * (sin(p.x * 2.1 + t * 0.03) + sin(p.y * 1.6 + p.z * 2.7 - t * 0.025)) + 0.12 * sin(p.z * 4.3 + p.x * 3.1 + aSeed.w * 2.0);
        float present = smoothstep(0.42, 0.78, n) * step(aSeed.x, 0.82);
        // forward scattering (Henyey-Greenstein, g = 0.6), normalised to 1 for light seen side-on
        vec3 toEye = normalize(cameraPosition - p);
        float g = 0.6, ct = dot(uSunDir, toEye);
        float phase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * ct, 1.5) / 0.51;
        // a few flat flakes turn and catch the light now and then
        float flake = step(0.88, aSeed.y) * (0.55 + 0.45 * sin(t * (0.6 + aSeed.z * 1.4) + aSeed.w * 30.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float depth = max(0.05, -mv.z);
        float corePx = (0.0011 + 0.0026 * aSeed.w * aSeed.w) * uPx / depth;          // the speck itself
        float blurPx = uPx * 0.0038 * abs(depth - uFocus) / depth;                  // the lens, focused on the puzzle
        float px = max(uMinPx, sqrt(corePx * corePx + blurPx * blurPx));
        gl_PointSize = min(px, 48.0);
        vFocus = clamp((px - 3.0) / 7.0, 0.0, 1.0);
        // a speck's light is spread over the pixels it covers, so a blurred mote is dim and a sub-pixel one faint
        vI = lit * present * phase * (1.0 + 0.9 * flake) * min(1.0, (corePx * corePx) / (px * px) * 2.2) * (px > 47.0 ? 0.0 : 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uGain; uniform float uAmbient;
      varying float vI; varying float vFocus;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        float speck = exp(-r * r * 3.2);                                            // in focus: a tiny soft dot
        float disc = smoothstep(1.0, 0.8, r) * (0.8 + 0.2 * r);                     // out of focus: a flat disc, a touch brighter at the rim
        float shape = mix(speck, disc * 0.55, vFocus);
        vec3 c = uColor * uGain * (vI * 1.5 + uAmbient) * shape;
        gl_FragColor = vec4(c, 1.0);
      }`,
    blending: T.AdditiveBlending, depthWrite: false, transparent: true
  });
  const dust = (function () {
    const N = 14000, rnd = mulberry(99);
    const pos = new Float32Array(N * 3), seed = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = DUST_BOX.min.x + rnd() * DUST_BOX.size.x;
      pos[i * 3 + 1] = DUST_BOX.min.y + rnd() * DUST_BOX.size.y;
      pos[i * 3 + 2] = DUST_BOX.min.z + rnd() * DUST_BOX.size.z;
      seed[i * 4] = rnd(); seed[i * 4 + 1] = rnd(); seed[i * 4 + 2] = rnd(); seed[i * 4 + 3] = rnd();
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new T.BufferAttribute(seed, 4));
    const pts = new T.Points(g, dustMat); pts.frustumCulled = false;
    scene.add(pts);
    return pts;
  })();

  /* ───────────────────────── post: light shafts, bloom, grade ───────────────────────── */
  const FS_VERT = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const fsGeo = new T.BufferGeometry();
  fsGeo.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const fsMesh = new T.Mesh(fsGeo, null); fsMesh.frustumCulled = false;
  const fsScene = new T.Scene(); fsScene.add(fsMesh);
  const fsCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  function pass(mat, target) { fsMesh.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }
  const fsOpts = { vertexShader: FS_VERT, depthTest: false, depthWrite: false };

  const aoMat = new T.ShaderMaterial(Object.assign({
    uniforms: { tDepth: { value: null }, uProjInv: { value: camera.projectionMatrixInverse }, uProj: { value: camera.projectionMatrix }, uTexel: { value: new T.Vector2() }, uRadius: { value: 0.3 }, uStrength: { value: 1 } },
    fragmentShader: `
      uniform sampler2D tDepth; uniform mat4 uProjInv; uniform mat4 uProj; uniform vec2 uTexel; uniform float uRadius; uniform float uStrength;
      varying vec2 vUv;
      vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).r; vec4 p = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
      float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      void main(){
        if (texture2D(tDepth, vUv).r >= 0.99999) { gl_FragColor = vec4(1.0); return; }
        vec3 P = vpos(vUv);
        vec3 pl = vpos(vUv - vec2(uTexel.x, 0.0)), pr = vpos(vUv + vec2(uTexel.x, 0.0));
        vec3 pd = vpos(vUv - vec2(0.0, uTexel.y)), pu = vpos(vUv + vec2(0.0, uTexel.y));
        vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl;
        vec3 dy = abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd;
        vec3 N = normalize(cross(dx, dy));
        vec2 rad = min(vec2(uProj[0][0], uProj[1][1]) * 0.5 * uRadius / -P.z, vec2(0.12));
        float occ = 0.0, a0 = ign(gl_FragCoord.xy) * 6.2832;
        for (int i = 0; i < 12; i++) {
          float t = (float(i) + 0.5) / 12.0, a = a0 + float(i) * 2.39996;
          vec3 v = vpos(vUv + vec2(cos(a), sin(a)) * rad * t) - P;
          float dist = length(v);
          occ += max(0.0, dot(N, v) / (dist + 1e-4) - 0.1) * (1.0 - smoothstep(uRadius * 0.45, uRadius, dist));
        }
        gl_FragColor = vec4(vec3(clamp(1.0 - occ / 12.0 * 1.7 * uStrength, 0.0, 1.0)), 1.0);
      }`
  }, fsOpts));
  const shaftMat = new T.ShaderMaterial(Object.assign({
    uniforms: Object.assign({
      tColor: { value: null }, tDepth: { value: null }, uProjInv: { value: camera.projectionMatrixInverse }, uViewInv: { value: camera.matrixWorld },
      tAO: { value: null }, uAOTexel: { value: new T.Vector2() },
      uCamPos: { value: camera.position }, uSunColor: { value: new T.Color(1, 0.8, 0.5) }, uStrength: { value: 2.5 }, uTime: { value: 0 }, uSMax: { value: 5.2 }, uFrame: { value: 0 }
    }, lightUniforms),
    fragmentShader: LIGHT_GLSL + `
      uniform sampler2D tColor; uniform sampler2D tDepth; uniform mat4 uProjInv; uniform mat4 uViewInv; uniform vec3 uCamPos;
      uniform sampler2D tAO; uniform vec2 uAOTexel;
      uniform vec3 uSunColor; uniform float uStrength; uniform float uTime; uniform float uSMax; uniform float uFrame;
      varying vec2 vUv;
      float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      void main(){
        float ao = 0.25 * (texture2D(tAO, vUv + vec2(-1.0, -1.0) * uAOTexel).r + texture2D(tAO, vUv + vec2(1.0, -1.0) * uAOTexel).r
                         + texture2D(tAO, vUv + vec2(-1.0, 1.0) * uAOTexel).r + texture2D(tAO, vUv + vec2(1.0, 1.0) * uAOTexel).r);
        vec3 col = texture2D(tColor, vUv).rgb * ao;
        float depth = texture2D(tDepth, vUv).r;
        vec4 vp = uProjInv * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0); vp /= vp.w;
        vec3 wp = (uViewInv * vec4(vp.xyz, 1.0)).xyz;
        vec3 rd = wp - uCamPos; float tScene = length(rd); rd /= tScene;
        // the beam is a sheared box behind the blinds: march only where the view ray is inside it
        float s0 = (uCamPos.z - uCurtZ) / uSunDir.z, ds = rd.z / uSunDir.z;
        vec3 a = vec3((uCamPos.xy - uSunDir.xy * s0 - uCurt.xy) / uCurt.zw, s0);
        vec3 b = vec3((rd.xy - uSunDir.xy * ds) / uCurt.zw, ds);
        b = mix(b, vec3(1e-5), vec3(lessThan(abs(b), vec3(1e-5))));
        vec3 tA = (vec3(-0.08, -0.08, 0.0) - a) / b, tB = (vec3(1.08, 1.08, uSMax) - a) / b;
        vec3 tmn = min(tA, tB), tmx = max(tA, tB);
        float t0 = max(max(tmn.x, tmn.y), max(tmn.z, 0.0));
        float t1 = min(min(tmx.x, tmx.y), min(tmx.z, tScene));
        vec3 scat = vec3(0.0);
        if (t1 > t0) {
          const int N = 30;
          float dt = (t1 - t0) / float(N), j = ign(gl_FragCoord.xy + 5.588238 * uFrame), acc = 0.0;
          for (int i = 0; i < N; i++) {
            vec3 p = uCamPos + rd * (t0 + (float(i) + j) * dt);
            float n = 0.5 + 0.25 * (sin(p.x * 2.9 + 1.7 * sin(p.y * 1.3 + uTime * 0.10)) + sin(p.y * 3.7 + p.z * 1.1 + 1.3 * sin(p.z * 1.9 - uTime * 0.07)));
            acc += beamAt(p) * (0.45 + 1.2 * n * n);
          }
          float ct = dot(rd, -uSunDir), g = 0.4;
          float phase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * ct, 1.5) * 0.25;
          scat = uSunColor * uStrength * acc * dt * phase;
        }
        gl_FragColor = vec4(col + scat, 1.0);
      }`
  }, fsOpts));
  const downMat = new T.ShaderMaterial(Object.assign({
    uniforms: { tSrc: { value: null }, uTexel: { value: new T.Vector2() }, uFirst: { value: 0 }, uThr: { value: 1 } },
    fragmentShader: `
      uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uFirst; uniform float uThr; varying vec2 vUv;
      vec3 S(float x, float y){ return texture2D(tSrc, vUv + vec2(x, y) * uTexel).rgb; }
      void main(){
        vec3 e = S(0.,0.);
        vec3 col = e * 0.125 + (S(-2.,2.) + S(2.,2.) + S(-2.,-2.) + S(2.,-2.)) * 0.03125
                 + (S(0.,2.) + S(-2.,0.) + S(2.,0.) + S(0.,-2.)) * 0.0625 + (S(-1.,1.) + S(1.,1.) + S(-1.,-1.) + S(1.,-1.)) * 0.125;
        if (uFirst > 0.5) { col = min(col, vec3(30.0)); float l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col *= smoothstep(uThr * 0.55, uThr * 1.9, l); }
        gl_FragColor = vec4(max(col, 0.0), 1.0);
      }`
  }, fsOpts));
  const upMat = new T.ShaderMaterial(Object.assign({
    uniforms: { tSrc: { value: null }, uTexel: { value: new T.Vector2() } },
    fragmentShader: `
      uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
      vec3 S(float x, float y){ return texture2D(tSrc, vUv + vec2(x, y) * uTexel).rgb; }
      void main(){
        vec3 c = S(-1.,1.) + S(1.,1.) + S(-1.,-1.) + S(1.,-1.) + 2.0 * (S(0.,1.) + S(-1.,0.) + S(1.,0.) + S(0.,-1.)) + 4.0 * S(0.,0.);
        gl_FragColor = vec4(c / 16.0, 1.0);
      }`,
    blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor
  }, fsOpts));
  const finalMat = new T.ShaderMaterial(Object.assign({
    uniforms: { tColor: { value: null }, tBloom: { value: null }, uBloom: { value: 0.5 }, uExposure: { value: 1 }, uVignette: { value: 0.5 }, uTime: { value: 0 }, uFade: { value: 0 },
      uTint: { value: new T.Color(1, 1, 1) }, uLift: { value: new T.Color(0, 0, 0) }, uSat: { value: 1 }, uContrast: { value: 0 }, uBlack: { value: 0 } },
    fragmentShader: `
      uniform sampler2D tColor; uniform sampler2D tBloom; uniform float uBloom; uniform float uExposure; uniform float uVignette; uniform float uTime; uniform float uFade;
      uniform vec3 uTint; uniform vec3 uLift; uniform float uSat; uniform float uContrast; uniform float uBlack;
      varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main(){
        vec3 c = texture2D(tColor, vUv).rgb + texture2D(tBloom, vUv).rgb * uBloom;
        vec2 q = vUv - 0.5;
        c *= mix(1.0, smoothstep(0.95, 0.25, length(q) * 1.15), uVignette);
        c = aces(c * uExposure);
        c = pow(c, vec3(1.0 / 2.2));
        c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, uSat) * uTint;
        c = clamp((c - uBlack) / (1.0 - uBlack), 0.0, 1.0);          // set the black point
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));               // an S-curve on brightness alone: deeper shadows, brighter lights, the colours left as they are
        c = clamp(c * (mix(lum, lum * lum * (3.0 - 2.0 * lum), uContrast) / max(lum, 1e-4)), 0.0, 1.0);
        c = uLift + c * (1.0 - uLift);
        c += (h21(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * 0.02 * (0.25 + 0.75 * smoothstep(0.0, 0.35, dot(c, vec3(0.2126, 0.7152, 0.0722))));   // grain, kept out of the blacks
        gl_FragColor = vec4(c * uFade, 1.0);
      }`
  }, fsOpts));

  let sceneRT = null, compRT = null, aoRT = null, bloomRT = [];
  function makeTargets(w, h) {
    if (sceneRT) { sceneRT.depthTexture.dispose(); sceneRT.dispose(); compRT.dispose(); aoRT.dispose(); bloomRT.forEach((r) => r.dispose()); }
    const depthTex = new T.DepthTexture(w, h);
    sceneRT = new T.WebGLRenderTarget(w, h, { type: RT_TYPE, samples: 4, depthTexture: depthTex });
    compRT = new T.WebGLRenderTarget(w, h, { type: RT_TYPE, depthBuffer: false });
    aoRT = new T.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), { depthBuffer: false });
    bloomRT = [];
    let bw = w, bh = h;
    for (let i = 0; i < 6; i++) {
      bw = Math.max(2, Math.floor(bw / 2)); bh = Math.max(2, Math.floor(bh / 2));
      bloomRT.push(new T.WebGLRenderTarget(bw, bh, { type: RT_TYPE, depthBuffer: false }));
      if (Math.min(bw, bh) <= 8) break;
    }
  }

  /* ───────────────────────── reflections on the cube ───────────────────────── */
  const pmrem = new T.PMREMGenerator(renderer);
  const cubeRT = new T.WebGLCubeRenderTarget(128, { type: RT_TYPE });
  const cubeCam = new T.CubeCamera(0.05, 30, cubeRT);
  cubeCam.position.copy(CUBE_HOME);
  let envRT = null;
  function captureEnv() {
    puzzles.forEach((P) => { P.group.visible = false; }); dust.visible = false;
    renderer.autoClear = true;
    cubeCam.update(renderer, scene);
    renderer.autoClear = false;
    puzzles.forEach((P) => { P.group.visible = true; }); dust.visible = true;
    const next = pmrem.fromCubemap(cubeRT.texture);
    envMats.forEach((m) => { m.envMap = next.texture; m.needsUpdate = true; });
    if (envRT) envRT.dispose();
    envRT = next;
  }

  /* ───────────────────────── the look: dusk ───────────────────────── */
  // A dark room with one hard source: little ambient, so what the sun and the lava lamp do not reach
  // falls to black; the grade sets a black point and adds an S-curve on top.
  const LOOK = { exposure: 1.06, sunCol: [1.0, 0.76, 0.48], sunI: 9.0, hemiSky: [0.46, 0.33, 0.26], hemiGnd: [0.22, 0.12, 0.07], hemiI: 0.3, fillI: 0.08, vol: 0.4,
    winCol: [1.0, 0.8, 0.52], winI: 3.2, glow: 0.75, vignette: 0.66, bloom: 0.3, thr: 1.5, dust: 0.5, bounce: 1.15, lamp: 1.0, env: 0.8,
    room: 6.5, ao: 1.25, tint: [1.03, 0.985, 0.9], lift: [0.003, 0.0015, 0.0005], sat: 0.88, contrast: 0.55, black: 0.02 };
  const look = { envDirty: true, lamp: 1 };
  function applyLook() {
    const L = (k) => LOOK[k], sc = LOOK.sunCol, wc = LOOK.winCol;
    sun.color.setRGB(sc[0], sc[1], sc[2]); sun.intensity = L('sunI');
    hemi.color.setRGB.apply(hemi.color, LOOK.hemiSky); hemi.groundColor.setRGB.apply(hemi.groundColor, LOOK.hemiGnd); hemi.intensity = L('hemiI');
    fill.intensity = L('fillI'); bounce.intensity = L('bounce');
    skyMat.color.setRGB(wc[0] * L('winI'), wc[1] * L('winI'), wc[2] * L('winI'));
    shaftMat.uniforms.uSunColor.value.setRGB(sc[0], sc[1], sc[2]); shaftMat.uniforms.uStrength.value = L('vol');
    dustMat.uniforms.uGain.value = L('dust') * 1.6; dustMat.uniforms.uColor.value.setRGB(sc[0], sc[1] * 1.04, sc[2] * 1.1);
    finalMat.uniforms.uExposure.value = L('exposure'); finalMat.uniforms.uVignette.value = L('vignette'); finalMat.uniforms.uBloom.value = L('bloom');
    downMat.uniforms.uThr.value = L('thr');
    lavaMat.uniforms.uGain.value = L('lamp'); look.lamp = L('lamp');
    envMats.forEach((m) => { m.envMapIntensity = L('env') * (m.userData.envK || 1); });
    roomLamp.intensity = L('room'); aoMat.uniforms.uStrength.value = L('ao'); finalMat.uniforms.uSat.value = L('sat');
    finalMat.uniforms.uTint.value.setRGB.apply(finalMat.uniforms.uTint.value, LOOK.tint);
    finalMat.uniforms.uLift.value.setRGB.apply(finalMat.uniforms.uLift.value, LOOK.lift);
    finalMat.uniforms.uContrast.value = L('contrast'); finalMat.uniforms.uBlack.value = L('black');
  }

  /* ───────────────────────── camera and sizing ───────────────────────── */
  const CAM_TARGET = V3(0, 0.98, -0.9);                 // below the cube, so the cube sits in the upper half and the bed fills the lower
  const ORBIT = { yaw: 0.62, pitchMin: 0.08, pitchMax: 0.42, rMin: 2.1, rMax: 2.8 };   // how far the room can be looked around; every value keeps the camera inside the walls
  const orbit = { yaw: 0, pitch: 0.2, yawT: 0, pitchT: 0.2, r: 2.6 };
  let resScale = 1;
  function resize() {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * resScale);
    renderer.setSize(w, h, false);
    makeTargets(renderer.domElement.width, renderer.domElement.height);
    camera.aspect = w / h;
    const tanV = clamp(Math.max(0.46, 0.29 / camera.aspect), 0.2, 0.66);
    camera.fov = 2 * Math.atan(tanV) * 180 / Math.PI;
    camera.updateProjectionMatrix();
    dustMat.uniforms.uPx.value = renderer.domElement.height / (2 * tanV);
    dustMat.uniforms.uMinPx.value = 1.3 * renderer.getPixelRatio();
  }
  window.addEventListener('resize', resize);

  /* ───────────────────────── touch ───────────────────────── */
  // The room opens looking down at the bed, where the three puzzles rest. A tap on one picks it up: it floats
  // into the light, the camera drops to face it and the rings appear.
  //
  // The rings make a grid laid out like the puzzle's face: three by three, or two by two for the 2×2. A swipe
  // sideways turns the horizontal layer of the row it starts in; a swipe up or down turns the vertical slice of
  // the column it starts in. Rows and columns run edge to edge, so a swipe can start far from any ring, and its
  // first few pixels say which of the two it is.
  //
  // A turn follows the finger, keeps its momentum when let go, slows on friction, and once it has lost its force
  // it stamps onto the nearest quarter turn (an underdamped spring, so it lands with a small click). How many
  // quarters a flick travels is up to the physics. Swiping the puzzle itself flips the whole thing the same way,
  // about its own axis: a sideways swipe turns it about its vertical axis, an up or down swipe about its horizontal
  // one (the first few pixels decide which, and the other direction only gives it a small wobble that springs
  // back). It follows the finger, coasts, and stamps onto the next quarter turn, so it always lands square to the
  // rings with a clear layer to turn; the camera leans a little into the flip. Holding it still opens it; when
  // the hold completes it scrambles (or solves) in one go and closes again; dragging away before that cancels.
  // A tap on one of its faces turns that face to the front, square to the rings, ready to be played.
  // A long swipe straight down on it puts it back on the bed, and the camera rises to choose again.
  const Q = Math.PI / 2, TURN_PX = 105, AIM_PX = 8, FRICTION = 2.6, SNAP_VEL = 2.2, STIFF = 260, DAMP = 2 * Math.sqrt(260) * 0.6, HOLD = 0.8;
  const SPIN_K = 0.0105, SPIN_FRICTION = 2.6, SPIN_SNAP_VEL = 2.0, SPIN_STIFF = 170, SPIN_DAMP = 2 * Math.sqrt(170) * 0.6, SWIPE_PX = 9, SWIPE_T = 0.25;
  const WOB_K = 0.3, WOB_MAX = 0.16, WOB_STIFF = 140, WOB_DAMP = 2 * Math.sqrt(140) * 0.55;
  const dots = Array.from(host.querySelectorAll('.dot')).map((el) => ({ el, r: +el.dataset.r, c: +el.dataset.c }));
  const line = (kind, i) => ({ pos: kind === 'layer' ? 1 - i : i - 1, dots: dots.filter((d) => (kind === 'layer' ? d.r : d.c) === i) });
  const RINGS = { layer: [0, 1, 2].map((i) => line('layer', i)), slice: [0, 1, 2].map((i) => line('slice', i)) };   // rows top to bottom, columns left to right
  let A = null, lastA = null;                           // the puzzle in hand, and the last one that was
  const view = { v: 0, vel: 0, target: 0 };             // 0: looking down at the bed to choose; 1: facing the puzzle in hand
  const SELECT = { cam: V3(0, 2.0, 0.45), tgt: V3(0, 0.58, -0.57) };   // over the foot of the bed, looking down at the three
  const ptr = { id: null, mode: '', x: 0, y: 0, x0: 0, y0: 0, t0: 0, tPrev: 0, v: 0, aim: null, hit: null, armed: false };
  const bob = { off: V3(), vel: V3() };
  const turn = { phase: 'idle', ring: null, kind: '', axis: 0, side: 0, sgn: 1, ang: 0, vel: 0, target: 0, notch: 0, parts: [], q: new T.Quaternion() };
  const hold = { on: false, t: 0, fired: false };
  const seq = { running: false, P: null };
  const vT = V3(), camUp = V3(), camRight = V3(), axW = V3(), scr = V3();
  // The whole puzzle's flip, kept in the frame its tilt sits in. base is the square pose it starts from; a flip
  // turns it by ang about one axis of that frame (x for up/down, y for sideways), with w its angular speed, and
  // wob is the small give about the other axis. q is the result. A face tap instead springs q straight to a
  // pose (qsnap), with vel its angular velocity.
  const X_AX = V3(1, 0, 0), Y_AX = V3(0, 1, 0);
  const rot = { phase: 'idle', q: new T.Quaternion(), base: new T.Quaternion(), axis: Y_AX, other: X_AX, ang: 0, w: 0, target: 0, notch: 0, wob: 0, wobV: 0, vel: V3(), qTarget: new T.Quaternion() };
  const qa = new T.Quaternion(), qw = new T.Quaternion();
  const dq = new T.Quaternion(), qe = new T.Quaternion(), eV = V3();
  const POSES = (function () {                          // the 24 ways a mechanism sits square to the screen
    const gens = [new T.Quaternion().setFromAxisAngle(V3(1, 0, 0), Q), new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), Q)], out = [new T.Quaternion()];
    for (let i = 0; i < out.length; i++) for (const g of gens) { const q = g.clone().multiply(out[i]); if (!out.some((o) => Math.abs(o.dot(q)) > 0.999)) out.push(q); }
    return out;
  })();
  const kick = { yaw: 0, pitch: 0 };                    // the camera leaning into the spin
  // Putting it down is deliberate: a pull straight down (within about 20° of vertical) that travels a third of the
  // screen. The first stretch is free, so an ordinary downward spin never starts it; after that the puzzle stops
  // spinning with the finger and sinks toward the bed instead, and past the mark, letting go puts it down.
  const DOCK = { lean: 0.38, dead: () => Math.max(80, 0.12 * window.innerHeight), arm: () => Math.max(230, 0.34 * window.innerHeight) };
  let clock0 = 0;

  function recoil(k) { if (A) { vT.copy(A.group.position).sub(camera.position).normalize(); bob.vel.addScaledVector(vT, k); } }
  function turnBy(v, h) {                               // advance q by the angular velocity v over h seconds (the face tap's spring)
    const w = v.length();
    if (w * h > 1e-7) rot.q.premultiply(dq.setFromAxisAngle(eV.copy(v).multiplyScalar(1 / w), w * h)).normalize();
  }
  function nearestPose(q) {
    let best = POSES[0], bd = -1;
    for (const p of POSES) { const d = Math.abs(p.dot(q)); if (d > bd) { bd = d; best = p; } }
    return best;
  }
  function composeRot() { rot.q.copy(qw.setFromAxisAngle(rot.other, rot.wob)).multiply(qa.setFromAxisAngle(rot.axis, rot.ang)).multiply(rot.base); }
  function beginFlip() {                                // caught in flight: the finger takes over the same flip; otherwise a fresh one
    if (rot.phase === 'spin' || rot.phase === 'snap') { rot.phase = 'drag'; rot.locked = true; return false; }
    rot.base.copy(nearestPose(rot.q)); rot.ang = 0; rot.w = 0; rot.notch = 0; rot.wob = 0; rot.wobV = 0; rot.vel.set(0, 0, 0);
    rot.phase = 'drag'; rot.locked = false; composeRot();
    return true;
  }
  function lockFlip(sideways) { rot.axis = sideways ? Y_AX : X_AX; rot.other = sideways ? X_AX : Y_AX; rot.locked = true; }
  function startSpinSnap() { rot.target = Math.round((rot.ang + rot.w * 0.12) / Q) * Q; rot.phase = 'snap'; }
  function landFlip() {
    rot.base.copy(nearestPose(qa.setFromAxisAngle(rot.axis, rot.target).multiply(rot.base)));
    rot.ang = 0; rot.w = 0; rot.phase = 'idle'; composeRot();
    haptic.select(); recoil(0.22);
  }
  function updateSpin(dt) {
    if (rot.phase === 'qsnap') {                        // a face tap: spring the whole orientation to the chosen pose
      const steps = Math.ceil(dt / 0.008), h = dt / steps;
      let err = 0;
      for (let k = 0; k < steps; k++) {
        qe.copy(rot.qTarget).multiply(dq.copy(rot.q).invert());
        if (qe.w < 0) qe.set(-qe.x, -qe.y, -qe.z, -qe.w);
        const sn = Math.hypot(qe.x, qe.y, qe.z); err = 2 * Math.atan2(sn, qe.w);
        if (sn > 1e-7) eV.set(qe.x, qe.y, qe.z).multiplyScalar(err / sn); else eV.set(0, 0, 0);
        rot.vel.addScaledVector(eV, SPIN_STIFF * 0.7 * h).addScaledVector(rot.vel, -SPIN_DAMP * 0.84 * h);
        turnBy(rot.vel, h);
      }
      if (err < 0.004 && rot.vel.length() < 0.06) {
        rot.q.copy(rot.qTarget); rot.base.copy(rot.qTarget); rot.vel.set(0, 0, 0); rot.phase = 'idle';
        haptic.select(); recoil(0.22);
      }
      return;
    }
    if (rot.phase === 'idle') return;
    if (rot.phase === 'drag') rot.w *= Math.exp(-8 * dt);                       // the estimate fades if the finger rests
    else if (rot.phase === 'spin') {
      rot.ang += rot.w * dt; rot.w *= Math.exp(-SPIN_FRICTION * dt);
      if (Math.abs(rot.w) < SPIN_SNAP_VEL) startSpinSnap();
    } else if (rot.phase === 'snap') {
      const steps = Math.ceil(dt / 0.008), h = dt / steps;
      for (let k = 0; k < steps; k++) { rot.w += (-SPIN_STIFF * (rot.ang - rot.target) - SPIN_DAMP * rot.w) * h; rot.ang += rot.w * h; }
    }
    if (rot.phase !== 'drag') {                         // the wobble springs back once the finger is off
      const steps = Math.ceil(dt / 0.008), h = dt / steps;
      for (let k = 0; k < steps; k++) { rot.wobV += (-WOB_STIFF * rot.wob - WOB_DAMP * rot.wobV) * h; rot.wob += rot.wobV * h; }
    }
    const notch = Math.round(rot.ang / Q);                // a tick at every quarter it passes
    if (notch !== rot.notch) { rot.notch = notch; if (rot.phase === 'spin') haptic.select(); }
    if (rot.phase === 'snap' && Math.abs(rot.ang - rot.target) < 0.002 && Math.abs(rot.w) < 0.05 && Math.abs(rot.wob) < 0.002) { landFlip(); return; }
    composeRot();
  }

  function onScreen(P) {                                // a puzzle's centre and radius in CSS pixels
    scr.copy(P.group.position).project(camera);
    const cx = (scr.x + 1) / 2 * window.innerWidth, cy = (1 - scr.y) / 2 * window.innerHeight;
    vT.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(P.group.scale.x * 1.7).add(P.group.position).project(camera);
    return { x: cx, y: cy, r: Math.max(40, Math.abs((vT.x + 1) / 2 * window.innerWidth - cx)) };
  }
  function pickAt(x, y) {                               // the resting puzzle under a tap
    let best = null, bd = Infinity;
    for (const P of puzzles) { const c = onScreen(P), d = Math.hypot(x - c.x, y - c.y); if (d < c.r * 1.15 && d < bd) { bd = d; best = P; } }
    return best;
  }
  function aimAt(x, y) {                                // the row and the column a touch falls in, and the ring where they cross
    const out = { layer: null, slice: null, dot: null };
    if (!A) return out;
    const pad = host.querySelector('.pad').getBoundingClientRect();
    if (x < pad.left - 60 || x > pad.right + 60) return out;
    const at = (d) => { const b = d.el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
    const live = (list) => list.filter((r) => A.n === 3 || r.pos !== 0);        // a 2×2 has no middle row or column
    const rows = live(RINGS.layer).map((r) => ({ r, v: at(r.dots[0])[1] })), cols = live(RINGS.slice).map((r) => ({ r, v: at(r.dots[0])[0] }));
    if (y < rows[0].v - Math.max(56, (rows[1].v - rows[0].v) * 0.9)) return out;   // the grid's reach starts a little above its top row
    const within = (list, v) => list.find((q, k) => k === list.length - 1 || v < (q.v + list[k + 1].v) / 2).r;
    out.layer = within(rows, y); out.slice = within(cols, x);
    out.dot = out.layer.dots.find((d) => out.slice.dots.indexOf(d) >= 0);
    return out;
  }
  function clearAim() { if (ptr.aim) { ptr.aim.dot.el.classList.remove('aim'); ptr.aim = null; } }
  function record(P, axis, side, n) {                   // keep the history short: fold repeated turns of one layer together
    const sim = P.sim;
    let sum = n;
    while (sim.history.length) { const h = sim.history[sim.history.length - 1]; if (h.axis !== axis || h.side !== side) break; sum += h.dir; sim.history.pop(); }
    const k = ((sum % 4) + 4) % 4;
    if (k === 1 || k === 2) for (let j = 0; j < k; j++) sim.history.push({ axis, side, dir: 1 });
    else if (k === 3) sim.history.push({ axis, side, dir: -1 });
    sim.target = sim.history.length ? 'scrambled' : 'solved'; sim.queue = 0; sim.last = null;
  }
  function beginTurn(kind, r) {
    if (!A || seq.running) return false;
    if (turn.phase !== 'idle') finishTurn(true);
    camUp.setFromMatrixColumn(camera.matrixWorld, 1); camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    const ref = kind === 'layer' ? camUp : camRight;
    let axis = 0, bd = 0;
    for (let k = 0; k < 3; k++) { const d = axW.copy(A.axes[k]).applyQuaternion(A.group.quaternion).dot(ref); if (Math.abs(d) > Math.abs(bd)) { bd = d; axis = k; } }
    const sgn = bd < 0 ? -1 : 1;
    Object.assign(turn, { kind, ring: r, P: A, axis, sgn, side: sgn * r.pos, ang: 0, vel: 0, notch: 0, phase: 'drag' });
    turn.parts = A.pieces.filter((p) => cellOf(p)[axis] === turn.side);
    for (const d of r.dots) d.el.classList.add('on');   // the whole row or column lights up
    return true;
  }
  function startSnap() { turn.target = Math.round((turn.ang + turn.vel * 0.12) / Q) * Q; turn.phase = 'snap'; }
  function finishTurn(instant) {
    if (turn.phase === 'idle') return;
    const n = Math.round((instant ? turn.ang : turn.target) / Q), k = ((n % 4) + 4) % 4;
    for (let j = 0; j < k; j++) for (const p of turn.parts) p.M = mul3(ROT[turn.axis], p.M);
    for (const p of turn.parts) { quatFromM(turn.P, p.M, p.qBase); p.group.quaternion.copy(p.qBase); }
    if (k) record(turn.P, turn.axis, turn.side, k === 3 ? -1 : k);
    turn.q.identity(); for (const d of turn.ring.dots) d.el.classList.remove('on'); turn.phase = 'idle'; turn.parts = [];
    if (!instant) { haptic.select(); recoil(0.22); }       // the stamp: a click and a small recoil
  }
  function updateTurn(dt) {
    if (turn.phase === 'idle') return;
    if (turn.phase === 'spin') {
      turn.ang += turn.vel * dt; turn.vel *= Math.exp(-FRICTION * dt);
      if (Math.abs(turn.vel) < SNAP_VEL) startSnap();
    } else if (turn.phase === 'snap') {
      const steps = Math.ceil(dt / 0.008), h = dt / steps;
      for (let k = 0; k < steps; k++) { turn.vel += (-STIFF * (turn.ang - turn.target) - DAMP * turn.vel) * h; turn.ang += turn.vel * h; }
      if (Math.abs(turn.ang - turn.target) < 0.002 && Math.abs(turn.vel) < 0.05) { turn.ang = turn.target; finishTurn(false); return; }
    }
    const notch = Math.round(turn.ang / Q);              // a tick at every quarter it passes
    if (notch !== turn.notch) { turn.notch = notch; if (turn.phase !== 'snap') haptic.select(); }
    turn.q.setFromAxisAngle(turn.P.axes[turn.axis], turn.ang);
    for (const p of turn.parts) p.group.quaternion.copy(turn.q).multiply(p.qBase);
  }
  function runSequence() {                              // open, scramble or solve in one go, close
    if (!A || seq.running) return;
    if (turn.phase !== 'idle') finishTurn(true);
    const sim = A.sim;
    if (sim.history.length) { sim.target = 'solved'; sim.queue = 0; }
    else { sim.target = 'scrambled'; sim.queue = (A.n === 2 ? 12 : 20) + Math.floor(Math.random() * 5); }
    sim.fast = true; seq.running = true; seq.P = A; A.exT = 1; host.classList.add('busy');
  }
  puzzles.forEach((P) => {
    P.sim.onIdle = () => {
      if (!seq.running || seq.P !== P) return;
      seq.running = false; seq.P = null; P.sim.fast = false; P.exT = 0; host.classList.remove('busy');
      haptic.complete();
    };
  });
  function cancelHold() { hold.on = false; if (A && !seq.running) A.exT = 0; }
  // A tap on a face: find the face under the finger, then of the 24 square poses take the one that turns it most
  // toward the viewer (the closest such pose to where it is now), and let the spin spring carry it there.
  const tapRay = new T.Raycaster(), tapNdc = new T.Vector2(), faceN = V3(), gq = new T.Quaternion();
  function faceTap(x, y) {
    if (!A) return false;
    tapNdc.set(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    tapRay.setFromCamera(tapNdc, camera);
    const hit = tapRay.intersectObject(A.group, true).find((h) => h.face && h.object.geometry.type !== 'SphereGeometry');
    if (!hit) return false;
    faceN.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    if (faceN.dot(tapRay.ray.direction) > 0) faceN.negate();          // the face seen is the one facing the finger, whatever its winding
    faceN.applyQuaternion(A.group.getWorldQuaternion(gq).invert());
    let best = null, bs = -Infinity;
    for (const pose of POSES) {
      const v = eV.copy(faceN).applyQuaternion(A.present).applyQuaternion(pose).applyQuaternion(A.tilt);
      const score = v.z + 0.02 * Math.abs(pose.dot(rot.q));
      if (score > bs) { bs = score; best = pose; }
    }
    if (Math.abs(best.dot(rot.q)) > 0.9995) return false;   // that face is already the front one
    rot.qTarget.copy(best); rot.vel.set(0, 0, 0); rot.wob = 0; rot.wobV = 0; rot.phase = 'qsnap';
    haptic.select();
    return true;
  }
  function nudge() {
    if (!A) return;
    recoil(0.6); bob.vel.y += 0.25;
    dustMat.uniforms.uPuff.value.set(A.group.position.x, A.group.position.y, A.group.position.z, clock0);
  }
  function pick(P) {                                    // off the bed and into the light
    if (!P || A) return false;
    A = lastA = P; P.liftT = 1; view.target = 1;
    rot.q.identity(); rot.base.identity(); rot.ang = 0; rot.w = 0; rot.wob = 0; rot.wobV = 0; rot.vel.set(0, 0, 0); rot.phase = 'idle';
    host.classList.add('play'); host.classList.toggle('two', P.n === 2);
    haptic.select();
    return true;
  }
  function putDown() {                                  // back to its hollow; the camera rises to choose again
    if (!A || seq.running) return false;
    if (turn.phase !== 'idle') finishTurn(true);
    cancelHold(); clearAim();
    settle(A); A.liftT = 0; A.exT = 0; A.pullT = 0;
    rot.phase = 'idle'; rot.w = 0; rot.vel.set(0, 0, 0);
    A = null; view.target = 0; orbit.yawT = 0; orbit.pitchT = 0.2;
    host.classList.remove('play');
    haptic.select();
    return true;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (ptr.id !== null) return;
    ptr.id = e.pointerId; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    ptr.x = ptr.x0 = e.clientX; ptr.y = ptr.y0 = e.clientY; ptr.t0 = ptr.tPrev = performance.now(); ptr.v = 0; ptr.armed = false; ptr.hit = null;
    if (!A) { ptr.mode = 'tap'; ptr.hit = pickAt(e.clientX, e.clientY); }
    else {
      const c = onScreen(A), onIt = Math.hypot(e.clientX - c.x, e.clientY - c.y) < c.r;
      if (onIt && seq.running) { ptr.mode = 'spin'; beginFlip(); }
      else if (onIt) { ptr.mode = 'hold'; Object.assign(hold, { on: true, t: 0, fired: false }); }
      else {
        const aim = seq.running ? null : aimAt(e.clientX, e.clientY);
        if (aim && aim.dot) { ptr.mode = 'aim'; ptr.aim = aim; aim.dot.el.classList.add('aim'); }
        else ptr.mode = 'look';
      }
    }
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    ptr.x = e.clientX; ptr.y = e.clientY;
    const now = performance.now(), dtm = Math.max(0.004, (now - ptr.tPrev) / 1000); ptr.tPrev = now;
    const mx = ptr.x - ptr.x0, my = ptr.y - ptr.y0;
    if (ptr.mode === 'tap') { if (Math.hypot(mx, my) > 12) ptr.hit = null; return; }
    if (!A) return;
    if (ptr.mode === 'aim') {                              // the first few pixels say which way the swipe goes
      if (Math.hypot(mx, my) < AIM_PX) return;
      const kind = Math.abs(mx) >= Math.abs(my) ? 'layer' : 'slice', r = ptr.aim[kind];
      clearAim();
      if (r && beginTurn(kind, r)) {
        const d = kind === 'layer' ? mx : my;
        ptr.mode = 'turn'; turn.ang = turn.sgn * d / TURN_PX * Q;
        ptr.v = d / Math.max(0.016, (now - ptr.t0) / 1000);
      } else {                                              // nothing to turn that way: look around instead
        ptr.mode = 'look';
        orbit.yawT = clamp(orbit.yawT - mx * 0.0042, -ORBIT.yaw, ORBIT.yaw);
        orbit.pitchT = clamp(orbit.pitchT + my * 0.003, ORBIT.pitchMin, ORBIT.pitchMax);
      }
    } else if (ptr.mode === 'turn' && turn.phase === 'drag') {
      const d = turn.kind === 'layer' ? dx : dy;
      turn.ang += turn.sgn * d / TURN_PX * Q;
      ptr.v = lerp(ptr.v, d / dtm, 0.5);
    } else if (ptr.mode === 'hold') {
      if (hold.on && !hold.fired) {
        // a hold is a finger that stays put: as soon as it drags, the hold is off and the puzzle spins with it
        // (a little more travel is allowed once the hold has taken, so a resting finger can tremble)
        if (Math.hypot(mx, my) > (hold.t < SWIPE_T ? SWIPE_PX : SWIPE_PX * 2)) { cancelHold(); ptr.mode = 'spin'; if (beginFlip()) lockFlip(Math.abs(mx) >= Math.abs(my)); }
      }
    } else if (ptr.mode === 'spin') {
      const down = my > 0 && Math.abs(mx) < DOCK.lean * my && !seq.running, dead = DOCK.dead(), arm = DOCK.arm();
      const pull = down ? clamp((my - dead) / (arm - dead), 0, 1.12) : 0, armed = down && my > arm;
      if (!rot.locked) { if (Math.hypot(mx, my) < SWIPE_PX) return; lockFlip(Math.abs(mx) >= Math.abs(my)); }
      const grip = SPIN_K * (1 - 0.88 * Math.min(1, pull));           // the more it is pulled down, the less it flips
      const sideways = rot.axis === Y_AX, d = (sideways ? dx : dy) * grip, c = (sideways ? dy : dx) * grip;
      rot.ang += d;
      rot.wob = clamp(rot.wob + c * WOB_K, -WOB_MAX, WOB_MAX);         // across the flip, only a little give
      rot.w = lerp(rot.w, d / dtm, 0.45);
      composeRot();
      A.pullT = pull;
      if (armed !== ptr.armed) { ptr.armed = armed; haptic.select(); }
    } else if (ptr.mode === 'look') {
      orbit.yawT = clamp(orbit.yawT - dx * 0.0042, -ORBIT.yaw, ORBIT.yaw);
      orbit.pitchT = clamp(orbit.pitchT + dy * 0.003, ORBIT.pitchMin, ORBIT.pitchMax);
    }
  });
  function release(e) {
    if (e.pointerId !== ptr.id) return;
    const up = e.type === 'pointerup';
    if (ptr.mode === 'tap') { if (ptr.hit && up) pick(ptr.hit); }
    else if (!A) { /* it was put down mid-gesture */ }
    else if (ptr.mode === 'turn' && turn.phase === 'drag') {
      if (performance.now() - ptr.tPrev > 80 || !up) ptr.v = 0;   // the finger stopped before lifting
      turn.vel = turn.sgn * ptr.v / TURN_PX * Q;
      if (Math.abs(turn.vel) > SNAP_VEL) turn.phase = 'spin'; else startSnap();
    } else if (ptr.mode === 'spin') {
      A.pullT = 0;
      if (ptr.armed && up && putDown()) { /* down it goes */ }
      else {
        if (performance.now() - ptr.tPrev > 90 || !up) rot.w = 0;
        if (Math.abs(rot.w) > SPIN_SNAP_VEL) rot.phase = 'spin'; else startSpinSnap();
      }
    } else if (ptr.mode === 'hold' && hold.on && !hold.fired) {
      const quick = hold.t < 0.3;                         // measured on the hold's own clock: a tap is a press the puzzle had barely begun to open for
      cancelHold(); if (quick && !faceTap(ptr.x, ptr.y)) nudge();
    }
    hold.on = false; clearAim();
    ptr.id = null; ptr.mode = ''; ptr.hit = null; ptr.armed = false; canvas.classList.remove('dragging');
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); orbit.r = clamp(orbit.r + e.deltaY * 0.0015, ORBIT.rMin, ORBIT.rMax); }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (putDown()) e.preventDefault(); }
    else if (A && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); runSequence(); }
    else if (!A && e.key >= '1' && e.key <= '3') { e.preventDefault(); pick(puzzles[+e.key - 1]); }
  });

  /* ───────────────────────── frame ───────────────────────── */
  const pieceDir = V3(), sway = new T.Quaternion(), swayE = new T.Euler(), home = V3(), camPlay = V3(), camSel = V3(), camTgt = V3();
  let last = performance.now(), frames = 0, slowAcc = 0, slowN = 0;
  function frame(now) {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    const t = now / 1000; clock0 = t;
    const amp = reduceMotion ? 0.4 : 1;

    // look
    if (envStale) { envStale = false; look.envDirty = true; }
    if (look.envDirty) { captureEnv(); look.envDirty = false; }

    // the puzzle in hand: rings, spin, sequences, hold
    if (A) {
      if (!seq.running) updateTurn(dt);
      updateSpin(dt);
      stepMoves(A, dt);
      if (hold.on && !hold.fired) {
        hold.t += dt;
        const k = clamp((hold.t - 0.12) / (HOLD - 0.12), 0, 1);
        A.exT = 0.7 * k * k;
        if (hold.t >= HOLD) { hold.fired = true; haptic.complete(); runSequence(); }
      }
    }
    bob.vel.addScaledVector(bob.off, -26 * dt).multiplyScalar(Math.exp(-3.4 * dt));
    bob.off.addScaledVector(bob.vel, dt);

    // camera: over the bed to choose, in front of the puzzle to play, and the way between
    orbit.yaw += (orbit.yawT - orbit.yaw) * Math.min(1, dt * 6); orbit.pitch += (orbit.pitchT - orbit.pitch) * Math.min(1, dt * 6);
    if (!A) eV.set(0, 0, 0);                             // the flip as the screen sees it: the camera leans a little the same way
    else if (rot.phase === 'qsnap') eV.copy(rot.vel).applyQuaternion(A.tilt);
    else eV.copy(rot.axis).multiplyScalar(rot.w).applyQuaternion(A.tilt);
    const lean = reduceMotion || rot.phase === 'idle' ? 0 : 1;
    kick.yaw += (clamp(-eV.y * 0.02, -0.06, 0.06) * lean - kick.yaw) * Math.min(1, dt * 4);
    kick.pitch += (clamp(eV.x * 0.012, -0.035, 0.035) * lean - kick.pitch) * Math.min(1, dt * 4);
    const yaw = clamp(orbit.yaw + kick.yaw, -ORBIT.yaw, ORBIT.yaw) + (reduceMotion ? 0 : Math.sin(t * 0.17) * 0.018);
    const pitch = clamp(orbit.pitch + kick.pitch, ORBIT.pitchMin, ORBIT.pitchMax) + (reduceMotion ? 0 : Math.sin(t * 0.13 + 1) * 0.008);
    camPlay.set(CAM_TARGET.x + orbit.r * Math.sin(yaw) * Math.cos(pitch), CAM_TARGET.y + orbit.r * Math.sin(pitch), CAM_TARGET.z + orbit.r * Math.cos(yaw) * Math.cos(pitch));
    camSel.set(SELECT.cam.x + Math.sin(t * 0.21) * 0.014 * amp, SELECT.cam.y, SELECT.cam.z + Math.sin(t * 0.17 + 1) * 0.012 * amp);
    view.vel += ((view.target - view.v) * 22 - view.vel * 8.6) * dt; view.v += view.vel * dt;
    const ve = smooth(clamp(view.v, 0, 1), 0, 1);
    camera.position.lerpVectors(camSel, camPlay, ve);
    camera.lookAt(camTgt.lerpVectors(SELECT.tgt, CAM_TARGET, ve));
    camera.updateMatrixWorld();

    // the puzzles: at rest in their hollows, or up in the light facing the camera, and the way between
    swayE.set(Math.sin(t * 0.37) * 0.02 * amp, Math.sin(t * 0.29 + 1) * 0.025 * amp, 0); sway.setFromEuler(swayE);
    for (const P of puzzles) {
      P.liftV += ((P.liftT - P.lift) * 30 - P.liftV * 9.5) * dt; P.lift += P.liftV * dt;
      const k = smooth(clamp(P.lift, 0, 1), 0, 1);
      P.pressT = (P === A && hold.on && !hold.fired) || ptr.hit === P ? 1 : 0;
      P.press += (P.pressT - P.press) * Math.min(1, dt * 18);
      P.pull += (P.pullT - P.pull) * Math.min(1, dt * 14);
      if (P === A) P.playQ.copy(camera.quaternion).multiply(sway).multiply(P.tilt).multiply(rot.q).multiply(P.present);
      home.set(CUBE_HOME.x + Math.sin(t * 0.41) * 0.012 * amp, CUBE_HOME.y + (Math.sin(t * 0.9) * 0.03 + Math.sin(t * 0.53 + 1) * 0.015) * amp - P.pull * 0.3, CUBE_HOME.z);
      if (P === A) home.add(bob.off);
      P.group.position.lerpVectors(P.restPos, home, k);
      P.group.quaternion.slerpQuaternions(P.restQ, P.playQ, k);
      P.group.scale.setScalar(lerp(P.spot.s, P.scale, k) * (1 - (k > 0.5 ? 0.035 : 0.06) * P.press) * (1 - 0.1 * Math.min(1, P.pull)));
      P.exV += ((P.exT - P.ex) * 90 - P.exV * 13) * dt; P.ex += P.exV * dt;
      const ex = Math.max(0, P.ex);
      for (const p of P.pieces) {
        if (ex < 1e-4) { p.group.position.set(0, 0, 0); continue; }
        const c = cellOf(p);
        pieceDir.set(0, 0, 0).addScaledVector(P.axes[0], c[0]).addScaledVector(P.axes[1], c[1]).addScaledVector(P.axes[2], c[2]).multiplyScalar(ex * 0.44);
        if (P.sim.cur && P.sim.cur.parts.indexOf(p) >= 0) pieceDir.applyQuaternion(P.qAnim);
        else if (turn.phase !== 'idle' && turn.parts.indexOf(p) >= 0) pieceDir.applyQuaternion(turn.q);
        p.group.position.copy(pieceDir);
      }
      duvetMesh.morphTargetInfluences[P.spot.morph] = 1 - smooth(P.lift, 0.02, 0.45);   // the duvet rises again as it leaves
    }
    dustMat.uniforms.uFocus.value = camera.position.distanceTo(A ? A.group.position : camTgt);   // the lens focuses on what is being looked at
    const B = A || lastA;
    if (B) { beam.pos.copy(B.group.position); lightUniforms.uCubeR.value = B.group.scale.x * (1.25 + Math.max(0, B.ex) * 0.4); }

    // props
    lavaMat.uniforms.uTime.value = t;
    vcrMat.emissiveIntensity = Math.floor(t * 1.2) % 2 ? 1.3 : 0.12;
    lampLight.intensity = (0.7 + 0.06 * Math.sin(t * 0.7)) * (0.6 + 0.4 * (look.lamp || 1));
    dustMat.uniforms.uTime.value = t; shaftMat.uniforms.uTime.value = t; shaftMat.uniforms.uFrame.value = reduceMotion ? 0 : frames % 64; finalMat.uniforms.uTime.value = t;
    finalMat.uniforms.uFade.value = Math.min(1, finalMat.uniforms.uFade.value + dt * 1.6);

    // render: scene → light shafts → bloom → grade
    renderer.setRenderTarget(sceneRT); renderer.clear(); renderer.render(scene, camera);
    aoMat.uniforms.tDepth.value = sceneRT.depthTexture; aoMat.uniforms.uTexel.value.set(1 / sceneRT.width, 1 / sceneRT.height);
    pass(aoMat, aoRT);
    shaftMat.uniforms.tAO.value = aoRT.texture; shaftMat.uniforms.uAOTexel.value.set(1 / aoRT.width, 1 / aoRT.height);
    shaftMat.uniforms.tColor.value = sceneRT.texture; shaftMat.uniforms.tDepth.value = sceneRT.depthTexture;
    pass(shaftMat, compRT);
    let src = compRT;
    for (let i = 0; i < bloomRT.length; i++) {
      downMat.uniforms.tSrc.value = src.texture; downMat.uniforms.uTexel.value.set(1 / src.width, 1 / src.height); downMat.uniforms.uFirst.value = i === 0 ? 1 : 0;
      pass(downMat, bloomRT[i]); src = bloomRT[i];
    }
    for (let i = bloomRT.length - 2; i >= 0; i--) {
      upMat.uniforms.tSrc.value = bloomRT[i + 1].texture; upMat.uniforms.uTexel.value.set(1 / bloomRT[i + 1].width, 1 / bloomRT[i + 1].height);
      pass(upMat, bloomRT[i]);
    }
    finalMat.uniforms.tColor.value = compRT.texture; finalMat.uniforms.tBloom.value = bloomRT[0].texture;
    pass(finalMat, null);

    // drop resolution a step if the device cannot keep up
    frames++; api.frames = frames;
    if (frames > 40) {
      slowAcc += dt; slowN++;
      if (slowN >= 80) { if (slowAcc / slowN > 0.03 && resScale > 0.55) { resScale -= 0.15; resize(); } slowAcc = 0; slowN = 0; }
    }
  }

  function jump(n, P) {         // apply n random turns at once (used to check a scrambled shape)
    P = P || A || puzzles[1];
    for (let i = 0; i < n; i++) {
      const m = { axis: Math.floor(Math.random() * 3), side: Math.random() < 0.5 ? -1 : 1, dir: Math.random() < 0.5 ? -1 : 1 };
      const R = m.dir > 0 ? ROT[m.axis] : tr3(ROT[m.axis]);
      P.pieces.filter((p) => cellOf(p)[m.axis] === m.side).forEach((p) => { p.M = mul3(R, p.M); quatFromM(P, p.M, p.qBase); p.group.quaternion.copy(p.qBase); });
      P.sim.history.push(m);
    }
    P.sim.target = 'scrambled'; P.sim.queue = 0;
    if (P !== A) settle(P);
  }
  const api = {                                         // QA hook: drive the scene from a test
    frames: 0, cam: camera, orbit, look, puzzles, view, turn, rot, kick, ptr, hold, seq, poses: POSES.length, aimAt, onScreen, jump, putDown, faceTap,
    active: () => A, pick: (key) => pick(puzzles.find((P) => P.key === key)), toggle: runSequence,
    setExplode: (v) => { if (A) { A.exT = v; A.ex = v; A.exV = 0; } },
    flick: (kind, pos, pxPerSec, px) => {               // a swipe on a ring: px of drag, then a release at pxPerSec
      const r = RINGS[kind].find((q) => q.pos === pos);
      if (!r || !beginTurn(kind, r)) return false;
      turn.ang = turn.sgn * (px || 0) / TURN_PX * Q; turn.vel = turn.sgn * pxPerSec / TURN_PX * Q;
      if (Math.abs(turn.vel) > SNAP_VEL) turn.phase = 'spin'; else startSnap();
      return true;
    }
  };
  window.__axis = api;
  puzzles.forEach((P) => P.pieces.forEach((p) => quatFromM(P, p.M, p.qBase)));
  applyLook();
  resize();
  let disposed = false;
  let rafId = requestAnimationFrame(frame);

  return function dispose() {
    disposed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    if (window.__axis === api) delete window.__axis;
    if (sceneRT) { sceneRT.depthTexture.dispose(); sceneRT.dispose(); compRT.dispose(); aoRT.dispose(); bloomRT.forEach((r) => r.dispose()); }
    cubeRT.dispose(); if (envRT) envRT.dispose(); pmrem.dispose();
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    renderer.dispose(); renderer.forceContextLoss();
    host.classList.remove('axis', 'busy', 'play', 'two');
    host.innerHTML = '';
  };
}
