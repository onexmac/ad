// Axis Cube: a 3×3 puzzle cut on tilted axes, floating in a small room at dusk,
// light coming through the blinds. Plain three.js, no React: the page mounts it
// into one element and the artifact build bundles the same file.
//
//   const dispose = mountAxisCube(host);   // builds the canvas and the HUD inside host
//
// Rings: the left column turns the cube's horizontal layers (swipe sideways), the
// row turns its vertical slices (swipe up or down); a turn keeps its momentum and
// snaps onto a quarter turn as it slows. Hold the cube: it opens and scrambles or
// solves in one go (slide off it to cancel). Drag anywhere else: look around.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { haptic } from '../histok/haptic';


const HUD = `
<canvas id="stage" tabindex="0" aria-label="Axis Cube flotando en un cuarto. Deslizá los aros para girar sus capas; mantené el cubo para armarlo o desarmarlo."></canvas>
<div class="pad" aria-hidden="true">
  <span class="dot l0" data-kind="layer" data-i="0"></span>
  <span class="dot l1" data-kind="layer" data-i="1"></span>
  <span class="dot l2" data-kind="layer" data-i="2"></span>
  <span class="dot s0" data-kind="slice" data-i="0"></span>
  <span class="dot s1" data-kind="slice" data-i="1"></span>
  <span class="dot s2" data-kind="slice" data-i="2"></span>
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
  const ROOM = { xMin: -2.7, xMax: 2.7, yMax: 3.5, zBack: -2.0, zFront: 5.0 };
  const WT = 0.12;                                               // wall thickness
  const WIN = { x0: -1.15, x1: -0.05, y0: 1.9, y1: 3.3 };        // opening in the back wall
  const CURT = { x0: -1.36, x1: 0.16, y0: 1.52, y1: 3.40, z: -1.90 };
  const CW = CURT.x1 - CURT.x0, CH = CURT.y1 - CURT.y0;
  const CUBE_HOME = V3(0, 1.3, 0);
  const CUBE_SCALE = 0.31;
  const G0 = V3(-0.56, 2.5, CURT.z);                             // where the main beam crosses the mask plane
  const SUN_DIR = CUBE_HOME.clone().sub(G0).normalize();         // direction the light travels
  const SUN_POS = G0.clone().addScaledVector(SUN_DIR, -42);
  const kx = SUN_DIR.x / SUN_DIR.z, ky = SUN_DIR.y / SUN_DIR.z;
  const toCurt = (x, y, z) => [x + (CURT.z - z) * kx, y + (CURT.z - z) * ky];
  const zOut = ROOM.zBack - WT - 0.01, zIn = ROOM.zBack + 0.03, zSill = ROOM.zBack + 0.09;
  const OPEN = {                                                  // window opening as seen by the light, on the mask plane
    x0: Math.max(toCurt(WIN.x0, 0, zOut)[0], toCurt(WIN.x0, 0, zIn)[0]),
    x1: Math.min(toCurt(WIN.x1, 0, zOut)[0], toCurt(WIN.x1, 0, zIn)[0]),
    y0: Math.max(toCurt(0, WIN.y0, zOut)[1], toCurt(0, WIN.y0, zSill)[1]),
    y1: Math.min(toCurt(0, WIN.y1, zOut)[1], toCurt(0, WIN.y1, zIn)[1])
  };
  const OPENC = (OPEN.x0 + OPEN.x1) / 2;
  const MUNT = { x: -0.6, y: 2.6, t: 0.02, z0: ROOM.zBack - 0.08, z1: ROOM.zBack - 0.04 };
  const BL = { x0: WIN.x0 + 0.012, x1: WIN.x1 - 0.012, z: ROOM.zBack + 0.055, top: WIN.y1 - 0.02, bottom: 2.16, pitch: 0.034, depth: 0.025, tilt: 0.42 };
  const SLATS = [];
  for (let y = BL.top - 0.06; y > BL.bottom + 0.02; y -= BL.pitch) SLATS.push(y);

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
  const envMats = [brassMat, tvBodyMat, wallMat, furnMat, floorMat];

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
  // walls: vertical cedar boards, stained darker and redder, varnished
  // walls: painted plaster, warm cream, a little worn
  photo('plaster_diff', true, [1.6 / 1.8, 3.6 / 1.8], set([wallMat], 'map', (m) => { m.color.set(0xf4e2c6); }));
  photo('plaster_nor', false, [1.6 / 1.8, 3.6 / 1.8], set([wallMat], 'normalMap', (m) => { m.normalScale.set(0.7, 0.7); }));
  photo('plaster_rough', false, [1.6 / 1.8, 3.6 / 1.8], set([wallMat], 'roughnessMap', (m) => { m.roughness = 1; }));
  photo('wood_diff', true, [0.8 / 0.7, 0.8 / 0.7], set([furnMat], 'map', (m) => { m.color.set(0xd8b8a0); }));
  photo('wood_nor', false, [0.8 / 0.7, 0.8 / 0.7], set([furnMat], 'normalMap'));
  photo('wood_rough', false, [0.8 / 0.7, 0.8 / 0.7], set([furnMat], 'roughnessMap', (m) => { m.roughness = 0.8; }));
  // floor: old varnished boards
  photo('floor_diff', true, [0.9 / 2.2, 0.9 / 2.2], set([floorMat], 'map', (m) => { m.color.set(0xffffff); }));
  photo('floor_nor', false, [0.9 / 2.2, 0.9 / 2.2], set([floorMat], 'normalMap'));
  photo('floor_rough', false, [0.9 / 2.2, 0.9 / 2.2], set([floorMat], 'roughnessMap', (m) => { m.roughness = 0.85; }));
  photo('wool_nor', false, [7, 7], set([blanketMat, linenMat], 'normalMap', (m) => { m.normalScale.set(1.4, 1.4); }));
  photo('wool_rough', false, [7, 7], set([blanketMat, linenMat], 'roughnessMap'));
  photo('cotton_nor', false, [5, 5], set([sheetMat], 'normalMap', (m) => { m.normalScale.set(0.8, 0.8); }));

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
  function addBox(x0, x1, y0, y1, z0, z1, mat, su, sv, parent) {
    const shell = mat === wallMat || mat === ceilMat || mat === floorMat;
    const r = shell ? 0 : Math.min(0.007, 0.22 * Math.min(x1 - x0, y1 - y0, z1 - z0));
    const m = new T.Mesh(boxWU(x0, x1, y0, y1, z0, z1, su, sv, r), mat);
    m.castShadow = true; m.receiveShadow = true;
    (parent || scene).add(m);
    return m;
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

  /* ───────────────────────── room shell ───────────────────────── */
  (function buildRoom() {
    const R = ROOM;
    addBox(R.xMin, WIN.x0, 0, R.yMax, R.zBack - WT, R.zBack, wallMat);
    addBox(WIN.x1, R.xMax, 0, R.yMax, R.zBack - WT, R.zBack, wallMat);
    addBox(WIN.x0, WIN.x1, 0, WIN.y0, R.zBack - WT, R.zBack, wallMat);
    addBox(WIN.x0, WIN.x1, WIN.y1, R.yMax, R.zBack - WT, R.zBack, wallMat);
    addBox(R.xMin - WT, R.xMin, 0, R.yMax, R.zBack - WT, R.zFront + WT, wallMat);
    addBox(R.xMax, R.xMax + WT, 0, R.yMax, R.zBack - WT, R.zFront + WT, wallMat);
    addBox(R.xMin, R.xMax, 0, R.yMax, R.zFront, R.zFront + WT, wallMat);
    addBox(R.xMin - WT, R.xMax + WT, R.yMax, R.yMax + WT, R.zBack - WT, R.zFront + WT, ceilMat);
    addBox(R.xMin - WT, R.xMax + WT, -WT, 0, R.zBack - WT, R.zFront + WT, floorMat, 0.9, 0.9);
    // trim
    addBox(R.xMin, R.xMax, 0, 0.11, R.zBack, R.zBack + 0.02, furnMat, 0.8, 0.8);
    addBox(R.xMin, R.xMax, R.yMax - 0.12, R.yMax, R.zBack, R.zBack + 0.022, furnMat, 0.8, 0.8);          // crown molding
    addBox(R.xMin, R.xMax, R.yMax - 0.06, R.yMax, R.zBack + 0.022, R.zBack + 0.05, furnMat, 0.8, 0.8);
    addBox(R.xMin, R.xMin + 0.022, R.yMax - 0.12, R.yMax, R.zBack, R.zFront, furnMat, 0.8, 0.8);
    addBox(R.xMin + 0.022, R.xMin + 0.05, R.yMax - 0.06, R.yMax, R.zBack, R.zFront, furnMat, 0.8, 0.8);
    addBox(R.xMax - 0.022, R.xMax, R.yMax - 0.12, R.yMax, R.zBack, R.zFront, furnMat, 0.8, 0.8);
    addBox(R.xMax - 0.05, R.xMax - 0.022, R.yMax - 0.06, R.yMax, R.zBack, R.zFront, furnMat, 0.8, 0.8);
    addBox(R.xMin, R.xMin + 0.02, 0, 0.11, R.zBack, R.zFront, furnMat, 0.8, 0.8);
    addBox(R.xMax - 0.02, R.xMax, 0, 0.11, R.zBack, R.zFront, furnMat, 0.8, 0.8);
    // window frame, sill and muntins
    addBox(WIN.x0 - 0.06, WIN.x0, WIN.y0 - 0.06, WIN.y1 + 0.06, zOut, zIn, paintMat);
    addBox(WIN.x1, WIN.x1 + 0.06, WIN.y0 - 0.06, WIN.y1 + 0.06, zOut, zIn, paintMat);
    addBox(WIN.x0, WIN.x1, WIN.y1, WIN.y1 + 0.06, zOut, zIn, paintMat);
    addBox(WIN.x0 - 0.09, WIN.x1 + 0.09, WIN.y0 - 0.05, WIN.y0, zOut, zSill, paintMat);
    addBox(MUNT.x - MUNT.t, MUNT.x + MUNT.t, WIN.y0, WIN.y1, MUNT.z0, MUNT.z1, paintMat);
    addBox(WIN.x0, WIN.x1, MUNT.y - MUNT.t, MUNT.y + MUNT.t, MUNT.z0, MUNT.z1, paintMat);
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
  const sky = new T.Mesh(new T.PlaneGeometry(4, 4), skyMat);
  sky.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, ROOM.zBack - 0.5);
  scene.add(sky);

  /* venetian blinds, tilted half open, raised a hand above the sill */
  const blindMat = new T.MeshStandardMaterial({ color: 0xeadfc6, roughness: 0.42, metalness: 0.15, side: T.DoubleSide, shadowSide: T.DoubleSide,
    emissive: new T.Color(1.0, 0.72, 0.4), emissiveIntensity: 0.22 });
  (function buildBlinds() {
    const W = BL.x1 - BL.x0, xc = (BL.x0 + BL.x1) / 2, list = [];
    SLATS.forEach((y, k) => {
      const g = new T.BoxGeometry(W, 0.0012, BL.depth, 1, 1, 2), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.0018 * (1 - Math.pow(p.getZ(i) / (BL.depth / 2), 2)));   // a slight crown
      g.rotateX(BL.tilt + (k === 7 || k === 21 ? 0.18 : 0));            // a couple of slats bent out of line
      g.translate(xc, y, BL.z); list.push(g);
    });
    const slats = new T.Mesh(mergeGeometries(list), blindMat); slats.castShadow = true; slats.receiveShadow = true; scene.add(slats);
    addBox(BL.x0 - 0.008, BL.x1 + 0.008, BL.top, BL.top + 0.05, BL.z - 0.026, BL.z + 0.026, blindMat);
    addBox(BL.x0, BL.x1, BL.bottom - 0.007, BL.bottom + 0.007, BL.z - 0.016, BL.z + 0.016, blindMat);
    const cord = new T.MeshStandardMaterial({ color: 0xd9ccb0, roughness: 0.9 });
    for (const fx of [0.12, 0.5, 0.88]) for (const dz of [-1, 1]) addBox(BL.x0 + W * fx - 0.0012, BL.x0 + W * fx + 0.0012, BL.bottom, BL.top, BL.z + dz * 0.0135 - 0.0006, BL.z + dz * 0.0135 + 0.0006, cord, 0.2, 0.2);
    const wand = new T.Mesh(new T.CylinderGeometry(0.004, 0.004, 0.62, 8), cord); wand.position.set(BL.x1 - 0.03, BL.top - 0.31, BL.z + 0.03); scene.add(wand);
    // a succulent on the sill, under the blinds
    const P = (a) => a.map((q) => new T.Vector2(q[0], q[1]));
    const clay = new T.MeshStandardMaterial({ color: 0xb4623a, roughness: 0.85 });
    const pot = new T.Mesh(new T.LatheGeometry(P([[0, 0], [0.032, 0], [0.04, 0.07], [0.044, 0.072], [0.044, 0.085], [0.038, 0.085], [0.036, 0.075], [0, 0.075]]), 24), clay);
    pot.position.set(-0.86, WIN.y0, ROOM.zBack + 0.045); pot.castShadow = pot.receiveShadow = true; scene.add(pot);
    const leafM = new T.MeshStandardMaterial({ color: 0x7f9a7a, roughness: 0.5 });
    for (let k = 0; k < 14; k++) {
      const a = k * 2.39996, r = 0.01 + 0.0022 * k, lf = new T.Mesh(new T.SphereGeometry(1, 10, 8), leafM);
      lf.scale.set(0.012, 0.006, 0.026 - k * 0.0006); lf.position.set(-0.86 + Math.cos(a) * r, WIN.y0 + 0.085 + 0.012 - k * 0.0006, ROOM.zBack + 0.045 + Math.sin(a) * r);
      lf.rotation.set(0.5 - k * 0.02, -a + Math.PI / 2, 0, 'YXZ'); lf.castShadow = true; scene.add(lf);
    }
  })();

  /* bed */
  let bedSpots = null;
  (function buildBed() {
    addBox(-0.86, 0.86, 0.06, 0.26, -1.96, 1.5, furnMat, 0.8, 0.8);
    for (const sx of [-1, 1]) {                                                 // headboard: posts, rails, slats
      addBox(sx * 0.92 - 0.035, sx * 0.92 + 0.035, 0, 1.12, -2.0, -1.92, furnMat, 0.8, 0.8);
      addBox(sx * 0.92 - 0.045, sx * 0.92 + 0.045, 1.12, 1.15, -2.0, -1.91, furnMat, 0.8, 0.8);
      const fin = new T.Mesh(new T.SphereGeometry(0.036, 20, 14), furnMat); fin.position.set(sx * 0.92, 1.18, -1.955); fin.castShadow = true; fin.receiveShadow = true; scene.add(fin);
    }
    addBox(-0.885, 0.885, 0.96, 1.07, -1.995, -1.935, furnMat, 0.8, 0.8);
    addBox(-0.885, 0.885, 0.55, 0.64, -1.99, -1.94, furnMat, 0.8, 0.8);
    for (let k = 0; k < 7; k++) { const x = -0.66 + k * 0.22; addBox(x - 0.03, x + 0.03, 0.64, 0.96, -1.985, -1.95, furnMat, 0.8, 0.8); }
    // mattress in its fitted sheet; the pillow presses a hollow into it
    const PIL = { x: 0.02, z: -1.6, rx: 0.3, rz: 0.2, sink: 0.024 };
    const mg = roundedBox(1.66, 0.3, 3.4, 0.07, 40, 4, 90), mgp = mg.attributes.position;
    for (let i = 0; i < mgp.count; i++) {
      if (mgp.getY(i) < 0.1) continue;
      const e = Math.hypot((mgp.getX(i) - PIL.x) / PIL.rx, (mgp.getZ(i) + 0.23 - PIL.z) / PIL.rz);
      mgp.setY(i, mgp.getY(i) - PIL.sink * (1 - T.MathUtils.smoothstep(e, 0.7, 1.25)));
    }
    const mattress = new T.Mesh(mg, sheetMat);
    mattress.position.set(0, 0.40, -0.23); mattress.castShadow = true; mattress.receiveShadow = true; scene.add(mattress);

    // duvet: one continuous quilted sheet. It lies on the mattress, wraps its sides and foot and hangs in folds,
    // and at the head it is turned back on itself so the lining shows. Things set on it press it down.
    const yM = 0.55, xHalf = 0.83, zFoot = 1.47, rM = 0.07, th = 0.055;
    const wrap = (c, edge) => {                       // distance across the surface -> [offset along, drop, angle]
      const ac = Math.abs(c), sg = Math.sign(c) || 1, flat = edge - rM;
      if (ac <= flat) return [c, 0, 0];
      const arc = ac - flat;
      if (arc <= rM * Math.PI / 2) { const q = arc / rM; return [sg * (flat + rM * Math.sin(q)), -rM * (1 - Math.cos(q)), sg * q]; }
      return [sg * edge, -rM - (arc - rM * Math.PI / 2), sg * Math.PI / 2];
    };
    const zWrap = (b) => { if (b <= zFoot - rM) return [b, 0, 0]; const r = wrap(b - (zFoot - 1.7), 1.7); return [r[0] + (zFoot - 1.7), r[1], r[2]]; };
    // the profile along the bed: the turned-back flap, the fold, then the body to the hem past the foot
    const zFold = -1.05, zFlap = -0.66, prof = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24, edge = Math.min(1, t / 0.12); prof.push([lerp(zFlap, zFold, t), th * (1.15 + 0.75 * Math.sin(edge * Math.PI / 2)), 1]); }
    for (let i = 1; i <= 12; i++) { const f = i / 12 * Math.PI; prof.push([zFold - 0.7 * th * Math.sin(f), 1.2 * th + 0.7 * th * Math.cos(f), 0]); }
    const zEnd = zFoot - rM + rM * Math.PI / 2 + 0.16;
    for (let i = 1; i <= 120; i++) prof.push([lerp(zFold, zEnd, i / 120), 0.5 * th, 0]);
    let acc = 0; const sArc = prof.map((p, i) => (acc += i ? Math.hypot(p[0] - prof[i - 1][0], p[1] - prof[i - 1][1]) : 0));
    const NA = 96, AH = 1.0, NS = prof.length;
    const pos = new Float32Array(NS * (NA + 1) * 3), uvs = new Float32Array(NS * (NA + 1) * 2), up = new Float32Array(NS * (NA + 1));
    const ridge = (s2, a) => 0.055 * Math.exp(-Math.pow(s2 - 1.3 - 0.32 * a, 2) / 0.011) + 0.035 * Math.exp(-Math.pow(s2 - 1.95 + 0.22 * a, 2) / 0.007);
    for (let i = 0; i < NS; i++) {
      const [b, d, isFlap] = prof[i], sv = sArc[i], body = isFlap ? 0 : 1;
      for (let j = 0; j <= NA; j++) {
        const a = -AH + 2 * AH * j / NA;
        const wx = wrap(a, xHalf), wz = zWrap(b);
        const n = V3(Math.sin(wx[2]), Math.cos(wx[2]) * Math.cos(wz[2]), Math.sin(wz[2])).normalize();
        const hangX = clamp(-wx[1] / 0.16, 0, 1), hangZ = clamp(-wz[1] / 0.16, 0, 1), topness = Math.max(0, n.y);
        const q = 0.21, puff = Math.sqrt(Math.abs(Math.sin(Math.PI * a / q) * Math.sin(Math.PI * sv / q)));
        let off = d + th * 0.32 * (puff - 0.62) * (0.8 + 0.2 * Math.sin(a * 3.1 + sv * 2.3));
        off += topness * ((0.4 + 0.6 * body) * (0.022 * Math.sin(2.1 * a + 3.3 * sv + 0.5) + 0.012 * Math.sin(5.3 * a - 2.2 * sv)) + body * ridge(sv, a));
        off = Math.max(off, body ? 0.008 : 0.06);
        off += hangX * 0.032 * Math.sin(sv * 12.5 + a * 1.5) + hangZ * 0.03 * Math.sin(a * 11.0 + 0.6);
        const k = (i * (NA + 1) + j);
        pos[k * 3] = wx[0] + n.x * off; pos[k * 3 + 1] = yM + wx[1] + wz[1] + n.y * off; pos[k * 3 + 2] = wz[0] + n.z * off;
        uvs[k * 2] = (a + AH) * 0.9; uvs[k * 2 + 1] = sv / 1.9; up[k] = topness;
      }
    }
    // things on the duvet press it down: find the lowest point under each footprint, settle it there, slope back out
    const spots = { sleeve: { x: -0.44, z: 0.8, w: 0.16, h: 0.16, rot: 0.35 }, record: { x: -0.1, z: 0.95, r: 0.15 } };
    const sdf = (sp, x, z) => {
      if (sp.r) return Math.hypot(x - sp.x, z - sp.z) - sp.r;
      const c = Math.cos(sp.rot), sn = Math.sin(sp.rot), lx = (x - sp.x) * c - (z - sp.z) * sn, lz = (x - sp.x) * sn + (z - sp.z) * c;
      const qx = Math.abs(lx) - sp.w, qz = Math.abs(lz) - sp.h;
      return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
    };
    Object.values(spots).forEach((sp) => {
      let lo = Infinity;
      for (let k = 0; k < up.length; k++) if (up[k] > 0.8 && sdf(sp, pos[k * 3], pos[k * 3 + 2]) < 0) lo = Math.min(lo, pos[k * 3 + 1]);
      sp.y = lo - 0.008;
      for (let k = 0; k < up.length; k++) {
        if (up[k] < 0.5) continue;
        const dd = sdf(sp, pos[k * 3], pos[k * 3 + 2]);
        if (dd < 0.07) pos[k * 3 + 1] = Math.min(pos[k * 3 + 1], sp.y + (dd > 0 ? 0.03 * T.MathUtils.smoothstep(dd, 0, 0.07) + dd * 0.15 : 0));
      }
    });
    bedSpots = spots;
    const idx = [];
    for (let i = 0; i < NS - 1; i++) for (let j = 0; j < NA; j++) {
      const A = i * (NA + 1) + j, B = A + NA + 1;
      idx.push(A, B, A + 1, A + 1, B, B + 1);
    }
    const dg = new T.BufferGeometry();
    dg.setAttribute('position', new T.BufferAttribute(pos, 3)); dg.setAttribute('uv', new T.BufferAttribute(uvs, 2)); dg.setIndex(idx);
    dg.computeVertexNormals();
    const duvet = new T.Mesh(dg, blanketMat);
    duvet.castShadow = true; duvet.receiveShadow = true; scene.add(duvet);

    // pillow: two halves sewn at the seam, the bottom one flat where it rests in the hollow it makes
    const half = (sgn, hh, flat) => {
      const qg = new T.PlaneGeometry(2, 2, 44, 30); qg.rotateX(-Math.PI / 2);
      const qp = qg.attributes.position, PW = 0.33, PD = 0.22;
      for (let i = 0; i < qp.count; i++) {
        const u = qp.getX(i), v = qp.getZ(i);
        const body = Math.max(0, 1 - Math.pow(Math.abs(u), 4)) * Math.max(0, 1 - Math.pow(Math.abs(v), 3.2));
        const tk = hh * Math.pow(body, flat);
        const crease = sgn > 0 ? 0.006 * Math.sin(Math.atan2(v, u) * 7.0) * Math.min(1, u * u + v * v) * (tk > 0 ? 1 : 0) : 0;
        qp.setXYZ(i, u * PW * (1 - 0.08 * (1 - v * v)), sgn * (tk + crease), v * PD * (1 - 0.09 * (1 - u * u)));
      }
      if (sgn < 0) { const ix = qg.index.array; for (let k = 0; k < ix.length; k += 3) { const tmp = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = tmp; } }
      qg.computeVertexNormals();
      return qg;
    };
    const pillow = new T.Mesh(mergeGeometries([half(1, 0.1, 0.5), half(-1, PIL.sink + 0.006, 0.18)]), sheetMat);
    pillow.rotation.set(-0.04, 0.06, 0.01);
    pillow.position.set(PIL.x, yM - PIL.sink + PIL.sink + 0.004, PIL.z); pillow.castShadow = true; pillow.receiveShadow = true; scene.add(pillow);
  })();

  /* nightstands, TV, lava lamp, posters */

  const tvScreenMat = new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform float uTime;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main(){
        vec2 c = vUv * 2.0 - 1.0;
        vec2 q = abs(c) - vec2(0.88, 0.86) + 0.2;
        float d = length(max(q, 0.0)) - 0.2;
        float inside = smoothstep(0.02, -0.02, d);
        float tf = floor(uTime * 24.0);
        vec2 px = floor(vUv * vec2(140.0, 105.0));
        float n = mix(h21(px + tf * 17.13), h21(floor(px * 0.5) + tf * 3.1), 0.35);
        float scan = 0.82 + 0.18 * sin(vUv.y * 105.0 * 3.14159);
        float bar = 1.0 - 0.35 * smoothstep(0.1, 0.0, abs(fract(vUv.y + uTime * 0.11) - 0.5));
        float vig = 1.0 - 0.4 * dot(c, c);
        vec3 col = vec3(0.72, 0.82, 1.0) * (0.12 + n) * scan * bar * vig * 1.5;
        gl_FragColor = vec4(mix(vec3(0.012, 0.011, 0.010), col, inside), 1.0);
      }`
  });
  const tv = new T.Group();
  const vcrMat = new T.MeshStandardMaterial({ map: vcrTex, roughness: 0.5, emissive: new T.Color(1, 1, 1), emissiveMap: vcrEmTex, emissiveIntensity: 1.2 });
  (function buildTV() {
    const body = new T.Mesh(roundedBox(0.46, 0.36, 0.34, 0.03), tvBodyMat); body.castShadow = true; body.receiveShadow = true; tv.add(body);
    const sg = new T.PlaneGeometry(0.3, 0.26, 16, 16), sgp = sg.attributes.position;
    for (let i = 0; i < sgp.count; i++) { const u = sgp.getX(i) / 0.15, v = sgp.getY(i) / 0.13; sgp.setZ(i, 0.013 * (1 - 0.55 * u * u) * (1 - 0.55 * v * v)); }
    sg.computeVertexNormals();
    const screen = new T.Mesh(sg, tvScreenMat); screen.position.set(-0.06, 0.0, 0.166); tv.add(screen);
    const glassMat = new T.MeshStandardMaterial({ color: 0x000000, roughness: 0.06, metalness: 0, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
    glassMat.userData.envK = 1.6; envMats.push(glassMat);
    const glass = new T.Mesh(sg, glassMat); glass.position.set(-0.06, 0.0, 0.1675); tv.add(glass);
    const bezG = new T.TorusGeometry(1, 0.08, 6, 4); bezG.rotateZ(Math.PI / 4);
    const bez = new T.Mesh(bezG, tvBodyMat);                                  // a raised square bezel around the tube
    bez.scale.set(0.218, 0.19, 0.12); bez.position.set(-0.06, 0, 0.168); tv.add(bez);
    const knobMat = new T.MeshStandardMaterial({ color: 0x8a8378, metalness: 0.6, roughness: 0.4 }); envMats.push(knobMat);
    for (const y of [0.08, -0.01]) {
      const k = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.02, 16), knobMat);
      k.rotation.x = Math.PI / 2; k.position.set(0.165, y, 0.178); tv.add(k);
    }
    for (let i = 0; i < 5; i++) { const s = new T.Mesh(new T.BoxGeometry(0.06, 0.004, 0.004), knobMat); s.position.set(0.165, -0.08 - i * 0.014, 0.172); tv.add(s); }
    for (const sgn of [-1, 1]) {
      const a = new T.Mesh(new T.CylinderGeometry(0.0035, 0.0035, 0.46, 6), knobMat);
      a.position.set(sgn * 0.11, 0.38, -0.05); a.rotation.z = -sgn * 0.5; tv.add(a);
    }
    const vcrBody = new T.Mesh(roundedBox(0.44, 0.085, 0.3, 0.008, 3, 3, 3), tvBodyMat); vcrBody.position.set(0, -0.18 - 0.0425, 0); vcrBody.castShadow = vcrBody.receiveShadow = true; tv.add(vcrBody);
    const vcrFace = new T.Mesh(new T.PlaneGeometry(0.43, 0.08), vcrMat); vcrFace.position.set(0, -0.18 - 0.0425, 0.1505); tv.add(vcrFace);
    tv.position.set(1.2, 0.75 + 0.085 + 0.18, -1.76); tv.rotation.y = -0.2;
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
  (function buildLamp() {
    const P = (a) => a.map((q) => new T.Vector2(q[0], q[1]));
    const base = new T.Mesh(new T.LatheGeometry(P([[0, 0], [0.075, 0], [0.075, 0.012], [0.046, 0.12], [0.052, 0.13]]), 28), brassMat);
    const glass = new T.Mesh(new T.LatheGeometry(P([[0.052, 0.13], [0.063, 0.2], [0.041, 0.4], [0.031, 0.42]]), 28), lavaMat);
    const cap = new T.Mesh(new T.LatheGeometry(P([[0.032, 0.42], [0.021, 0.47], [0, 0.475]]), 28), brassMat);
    base.castShadow = true; cap.castShadow = true;
    lamp.add(base, glass, cap);
    lamp.position.set(1.62, 0.75, -1.8);
    scene.add(lamp);
  })();
  const pinGeo = new T.SphereGeometry(0.009, 10, 6); pinGeo.scale(1, 1, 0.5);
  const pinMat = new T.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.3 });
  const posterMats = [];
  function poster(t, w, h, opt) {                       // paper that bellies off the wall a little, pinned at the corners
    opt = opt || {};
    const g = new T.PlaneGeometry(w, h, 10, 10), p = g.attributes.position, belly = opt.flat ? 0 : 1;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w / 2), v = p.getY(i) / (h / 2);
      p.setZ(i, belly * (0.006 * (1 - u * u) * (1 - v * v) + 0.007 * Math.pow(Math.max(0, -v), 3) * u * u));
    }
    g.computeVertexNormals();
    const pm = new T.MeshStandardMaterial({ map: t, roughness: 0.55 }); posterMats.push(pm);
    const m = new T.Mesh(g, pm);
    m.receiveShadow = true; m.castShadow = true;
    if (opt.pins) for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const pin = new T.Mesh(pinGeo, pinMat); pin.position.set(sx * (w / 2 - 0.022), sy * (h / 2 - 0.022), 0.003); m.add(pin); }
    scene.add(m);
    return m;
  }
  const sunP = poster(posterSunTex, 0.8, 1.2, { pins: true }); sunP.position.set(0.72, 2.5, ROOM.zBack + 0.004); sunP.rotation.z = 0.012;
  const cometP = poster(posterCometTex, 0.66, 0.93, { pins: true }); cometP.position.set(-2.12, 2.28, ROOM.zBack + 0.004); cometP.rotation.z = -0.018;
  const shapesP = poster(posterShapesTex, 0.8, 1.0, { pins: true }); shapesP.position.set(ROOM.xMax - 0.004, 2.15, -0.55); shapesP.rotation.y = -Math.PI / 2;
  (function framedPoster() {                             // framed, behind glass-less black frame, over the desk
    const x = 2.08, y = 2.3, w = 0.62, h = 0.85, fw = 0.026, z0 = ROOM.zBack, z1 = ROOM.zBack + 0.03;
    poster(posterBridgeTex, w, h, { flat: true }).position.set(x, y, z0 + 0.012);
    const frameMat = new T.MeshStandardMaterial({ color: 0x15120f, roughness: 0.45 }); envMats.push(frameMat);
    addBox(x - w / 2 - fw, x + w / 2 + fw, y + h / 2, y + h / 2 + fw, z0, z1, frameMat);
    addBox(x - w / 2 - fw, x + w / 2 + fw, y - h / 2 - fw, y - h / 2, z0, z1, frameMat);
    addBox(x - w / 2 - fw, x - w / 2, y - h / 2, y + h / 2, z0, z1, frameMat);
    addBox(x + w / 2, x + w / 2 + fw, y - h / 2, y + h / 2, z0, z1, frameMat);
    const pol = poster(polaroidTex, 0.11, 0.132, { flat: true }); pol.position.set(2.53, 2.18, z0 + 0.004); pol.rotation.z = -0.05;
  })();

  /* bookshelf of tapes, globe and two Rubik's cubes */
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
  function rubik(seed, s) {
    const rnd = mulberry(seed);
    const mats = [0, 1, 2, 3, 4, 5].map(() => {
      const m = new T.MeshStandardMaterial({ roughness: 0.32, map: tex(makeCanvas(96, 96, (g) => {
        g.fillStyle = '#0d0d0d'; g.fillRect(0, 0, 96, 96);
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { g.fillStyle = RUBIK[(rnd() * 6) | 0]; g.beginPath(); g.roundRect(4.5 + a * 30, 4.5 + b * 30, 27, 27, 4); g.fill(); }
      })) });
      envMats.push(m);
      return m;
    });
    const m = new T.Mesh(roundedBox(s, s, s, s * 0.08, 4, 4, 4), mats); m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  (function buildShelf() {
    const x0 = -1.94, x1 = -0.98, z0 = ROOM.zBack, z1 = ROOM.zBack + 0.32, H = 1.22, t = 0.025, floors = [0.08, 0.47, 0.86];
    addBox(x0, x0 + t, 0, H, z0, z1, furnMat, 0.8, 0.8);
    addBox(x1 - t, x1, 0, H, z0, z1, furnMat, 0.8, 0.8);
    addBox(x0 - 0.01, x1 + 0.01, H - t, H, z0, z1 + 0.012, furnMat, 0.8, 0.8);
    addBox(x0 + t, x1 - t, 0, 0.08, z0, z1, furnMat, 0.8, 0.8);
    addBox(x0 + t, x1 - t, 0.08, H - t, z0, z0 + 0.012, furnMat, 0.8, 0.8);
    floors.slice(1).forEach((y) => addBox(x0 + t, x1 - t, y - t, y, z0, z1 - 0.008, furnMat, 0.8, 0.8));
    const rnd = mulberry(61), list = [];
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
    row(x0 + t + 0.008, x1 - t - 0.008, floors[0]);
    // the middle shelf holds books: different heights and depths, a little out of line
    const books = [];
    let bx = x0 + t + 0.008, bc = 0;
    while (bx < x0 + t + 0.56) {
      const th = 0.022 + rnd() * 0.03, hh = 0.2 + rnd() * 0.08, dd = 0.15 + rnd() * 0.07;
      const g = new T.BoxGeometry(th, hh, dd), uv = g.attributes.uv, c = bc++ % BK_N;
      const u0 = c / BK_N, u1 = (c + 1) / BK_N, vb = 1 - BK_CH / BK_H, page = BK_PAD * 0.5 / BK_H;
      for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i), v = uv.getY(i);
        if (i >= 16 && i < 20) uv.setXY(i, lerp(u0, u1, u), lerp(vb, 1, v));
        else if (i < 8) uv.setXY(i, u0 + 3 / BK_W, lerp(vb, 1, 0.5));
        else uv.setXY(i, 0.5, page);
      }
      g.translate(bx + th / 2, floors[1] + hh / 2, z1 - 0.014 - dd / 2 - rnd() * 0.012);
      books.push(g); bx += th + 0.0015;
    }
    const lean = new T.BoxGeometry(0.03, 0.24, 0.19), luv = lean.attributes.uv;
    for (let i = 0; i < luv.count; i++) { if (i >= 16 && i < 20) luv.setXY(i, lerp(3 / BK_N, 4 / BK_N, luv.getX(i)), lerp(1 - BK_CH / BK_H, 1, luv.getY(i))); else luv.setXY(i, 0.5, BK_PAD * 0.5 / BK_H); }
    lean.rotateZ(-0.2); lean.translate(bx + 0.04, floors[1] + 0.12 + 0.004, z1 - 0.12);
    books.push(lean);
    const bookMesh = new T.Mesh(mergeGeometries(books), new T.MeshStandardMaterial({ map: bookTex, roughness: 0.75 }));
    bookMesh.castShadow = true; bookMesh.receiveShadow = true; scene.add(bookMesh);
    row(x0 + t + 0.008, x1 - t - 0.1, floors[2]);
    for (let k = 0; k < 3; k++) vhsBox(list, x1 - 0.56 + (rnd() - 0.5) * 0.01, H + k * 0.0252, z1 - 0.02 - rnd() * 0.01, cell++, true, 0);
    const vhs = new T.Mesh(mergeGeometries(list), new T.MeshStandardMaterial({ map: vhsTex, roughness: 0.55 }));
    vhs.castShadow = true; vhs.receiveShadow = true; scene.add(vhs);
    rubik(5, 0.057).position.set(x1 - 0.16, floors[1] + 0.0285, z1 - 0.1);
    const c2 = rubik(9, 0.057); c2.position.set(x1 - 0.1, H + 0.0285, z1 - 0.12); c2.rotation.y = 0.5;
    // globe on its stand
    const globe = new T.Group();
    const P = (a) => a.map((q) => new T.Vector2(q[0], q[1]));
    const foot = new T.Mesh(new T.LatheGeometry(P([[0, 0], [0.07, 0], [0.07, 0.012], [0.032, 0.028], [0.011, 0.05], [0.009, 0.09]]), 28), furnMat);
    const globeMat = new T.MeshStandardMaterial({ map: globeTex, roughness: 0.36 }); envMats.push(globeMat);
    const ball = new T.Mesh(new T.SphereGeometry(0.105, 48, 32), globeMat); ball.position.y = 0.2; ball.rotation.set(0, 2.2, 0.41, 'YZX');
    const ring = new T.Mesh(new T.TorusGeometry(0.114, 0.0034, 8, 56, Math.PI), brassMat); ring.position.y = 0.2; ring.rotation.z = 0.41 + Math.PI / 2;
    [foot, ball, ring].forEach((m) => { m.castShadow = true; m.receiveShadow = true; globe.add(m); });
    globe.position.set(x0 + 0.24, H, z1 - 0.15); globe.rotation.y = 0.5;
    scene.add(globe);
  })();
  (function buildDesk() {
    const x0 = 0.95, x1 = 2.27, z0 = ROOM.zBack + 0.01, z1 = ROOM.zBack + 0.58, top = 0.75;
    addBox(x0, x1, top - 0.032, top, z0, z1, furnMat, 0.8, 0.8);
    for (const [lx, lz] of [[x0 + 0.03, z0 + 0.03], [x1 - 0.03, z0 + 0.03], [x0 + 0.03, z1 - 0.03], [x1 - 0.03, z1 - 0.03]]) addBox(lx - 0.022, lx + 0.022, 0, top - 0.032, lz - 0.022, lz + 0.022, furnMat, 0.8, 0.8);
    addBox(x0 + 0.05, x1 - 0.05, top - 0.13, top - 0.032, z1 - 0.05, z1 - 0.03, furnMat, 0.8, 0.8);
    addBox(x0 + 0.52, x1 - 0.08, top - 0.122, top - 0.042, z1 - 0.03, z1 - 0.014, furnMat, 0.5, 0.5);
    const knob = new T.Mesh(new T.SphereGeometry(0.014, 12, 8), brassMat); knob.position.set((x0 + 0.52 + x1 - 0.08) / 2, top - 0.082, z1 - 0.006); scene.add(knob);
    // boombox
    const boom = new T.Group();
    const bodyM = new T.MeshStandardMaterial({ color: 0x29292b, roughness: 0.42, metalness: 0.25 }); envMats.push(bodyM);
    const face = new T.MeshStandardMaterial({ map: boomTex, roughness: 0.42, metalness: 0.2 }); envMats.push(face);
    const chrome = new T.MeshStandardMaterial({ color: 0xc8c8cc, metalness: 1, roughness: 0.22 }); envMats.push(chrome);
    const bb = new T.Mesh(roundedBox(0.52, 0.25, 0.13, 0.022, 5, 5, 5), bodyM); bb.position.y = 0.125;
    const bf = new T.Mesh(new T.PlaneGeometry(0.5, 0.234), face); bf.position.set(0, 0.125, 0.0652);
    boom.add(bb, bf);
    for (const sx of [-1, 1]) { const post = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.05, 10), chrome); post.position.set(sx * 0.17, 0.27, 0); boom.add(post); }
    const handle = new T.Mesh(new T.CylinderGeometry(0.009, 0.009, 0.36, 12), chrome); handle.rotation.z = Math.PI / 2; handle.position.set(0, 0.296, 0); boom.add(handle);
    const ant = new T.Mesh(new T.CylinderGeometry(0.0025, 0.0035, 0.42, 6), chrome); ant.position.set(0.16, 0.42, -0.04); ant.rotation.z = -0.55; boom.add(ant);
    boom.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    boom.position.set(1.99, top, z0 + 0.2); boom.rotation.y = -0.06;
    scene.add(boom);
    rubik(13, 0.057).position.set(1.5, top + 0.0285, z0 + 0.48);
    // chair, turned a little toward the room
    const chair = new T.Group();
    const cushion = linenMat;
    addBox(-0.22, 0.22, 0.43, 0.465, -0.21, 0.21, furnMat, 0.8, 0.8, chair);
    const seat = new T.Mesh(roundedBox(0.4, 0.05, 0.38, 0.018, 4, 3, 4), cushion); seat.position.y = 0.488; seat.castShadow = seat.receiveShadow = true; chair.add(seat);
    for (const [lx, lz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) addBox(lx - 0.019, lx + 0.019, 0, 0.43, lz - 0.019, lz + 0.019, furnMat, 0.8, 0.8, chair);
    for (const sx of [-0.19, 0.19]) addBox(sx - 0.019, sx + 0.019, 0.465, 0.95, 0.161, 0.199, furnMat, 0.8, 0.8, chair);
    addBox(-0.17, 0.17, 0.86, 0.93, 0.168, 0.192, furnMat, 0.8, 0.8, chair);
    addBox(-0.17, 0.17, 0.66, 0.72, 0.168, 0.192, furnMat, 0.8, 0.8, chair);
    chair.position.set(1.62, 0, -1.12); chair.rotation.y = 0.3;
    scene.add(chair);
    // cassettes in their cases, a spiral notebook with a pencil, a cup of pencils
    const jCard = (seed, band) => tex(makeCanvas(128, 80, (g, w, h) => {
      const rnd = mulberry(seed);
      g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h); g.fillStyle = band; g.fillRect(0, 0, w, 22);
      g.fillStyle = 'rgba(30,30,40,0.8)'; for (let k = 0; k < 4; k++) g.fillRect(8, 32 + k * 11, 30 + rnd() * 80, 3);
    }));
    ['#c8392b', '#2f6fa3', '#e0a21b'].forEach((band, k) => {
      const caseMat = new T.MeshStandardMaterial({ map: jCard(40 + k, band), roughness: 0.25 }); envMats.push(caseMat);
      const cg = new T.BoxGeometry(0.11, 0.017, 0.07), cu = cg.attributes.uv;
      for (let i = 0; i < cu.count; i++) if (!(i >= 8 && i < 12)) cu.setXY(i, 0.5, 0.9);
      const cs = new T.Mesh(cg, caseMat); cs.position.set(1.79, top + 0.0085 + k * 0.0172, z0 + 0.43); cs.rotation.y = 0.25 - k * 0.18;
      cs.castShadow = cs.receiveShadow = true; scene.add(cs);
    });
    const nb = new T.Group();
    const coverMat = new T.MeshStandardMaterial({ roughness: 0.7, map: tex(makeCanvas(256, 180, (g, w, h) => {
      g.fillStyle = '#2c4a7a'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 2000; k++) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
      g.fillStyle = '#eee6d2'; g.fillRect(150, 26, 84, 40); g.fillStyle = '#2c4a7a'; g.fillRect(158, 38, 60, 2); g.fillRect(158, 48, 44, 2);
    })) });
    coverMat.map.offset.set(0.5, 0.5);
    addBox(-0.13, 0.13, 0, 0.012, -0.09, 0.09, coverMat, 0.26, 0.18, nb);
    addBox(-0.124, 0.128, 0.001, 0.0105, -0.087, 0.087, sheetMat, 0.3, 0.3, nb);
    for (let k = 0; k < 14; k++) { const ring = new T.Mesh(new T.TorusGeometry(0.0065, 0.0012, 5, 10), brassMat); ring.rotation.x = Math.PI / 2; ring.rotation.y = Math.PI / 2; ring.position.set(-0.132, 0.006, -0.08 + k * 0.0123); nb.add(ring); }
    const pencilMat = new T.MeshStandardMaterial({ color: 0xe8b020, roughness: 0.45 });
    const pencil = new T.Mesh(new T.CylinderGeometry(0.0036, 0.0036, 0.17, 6), pencilMat); pencil.rotation.z = Math.PI / 2; pencil.rotation.y = 0.5; pencil.position.set(0.02, 0.016, 0.01); nb.add(pencil);
    nb.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    nb.position.set(2.0, top, z0 + 0.42); nb.rotation.y = 0.14; scene.add(nb);
    const P2 = (a) => a.map((q) => new T.Vector2(q[0], q[1]));
    const glaze = new T.MeshStandardMaterial({ color: 0xb8802a, roughness: 0.28 }); envMats.push(glaze);
    const cup = new T.Mesh(new T.LatheGeometry(P2([[0, 0.003], [0.03, 0.003], [0.033, 0], [0.035, 0.1], [0.031, 0.1], [0.029, 0.006], [0, 0.006]]), 28), glaze);
    cup.position.set(2.2, top, z0 + 0.5); cup.castShadow = cup.receiveShadow = true; scene.add(cup);
    [[0.008, 0.006, 0.12, -0.1], [-0.01, 0.004, -0.08, 0.14], [0.002, -0.011, 0.06, 0.05], [-0.006, 0.01, -0.15, -0.06]].forEach(([dx, dz, ax, az], k) => {
      const pc = new T.Mesh(new T.CylinderGeometry(0.0036, 0.0036, 0.17, 6), k === 1 ? new T.MeshStandardMaterial({ color: 0x2f5fa0, roughness: 0.4 }) : pencilMat);
      pc.position.set(2.2 + dx, top + 0.085, z0 + 0.5 + dz); pc.rotation.set(ax, 0, az); pc.castShadow = true; scene.add(pc);
    });
  })();
  (function wallBits() {                                // a light switch by the desk, an outlet by the shelf
    const z = ROOM.zBack;
    addBox(2.47, 2.542, 1.16, 1.275, z, z + 0.006, paintMat, 0.2, 0.2);
    addBox(2.5, 2.512, 1.205, 1.23, z + 0.006, z + 0.016, paintMat, 0.2, 0.2);
    addBox(-2.6, -2.528, 0.26, 0.375, z, z + 0.006, paintMat, 0.2, 0.2);
    const slot = new T.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.8 });
    for (const y of [0.29, 0.335]) for (const dx of [-0.008, 0.008]) addBox(-2.564 + dx - 0.002, -2.564 + dx + 0.002, y, y + 0.012, z + 0.0055, z + 0.0065, slot, 0.2, 0.2);
  })();
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
  const rug = new T.Mesh(new T.CylinderGeometry(0.56, 0.56, 0.012, 96, 1), rugMat);
  rug.position.set(1.45, 0.006, -0.25); rug.receiveShadow = true; scene.add(rug);

  /* ───────────────────────── lived-in: plants, records, a skateboard, photos ───────────────────────── */
  const dummy = new T.Object3D();
  const leafGeo = (w, h, curl, droop) => {                // a leaf plane with its base at the origin, curled back at the edges and the tip
    const g = new T.PlaneGeometry(w, h, 6, 6); g.translate(0, h / 2, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / h; p.setZ(i, -curl * x * x * w - droop * y * y * h); }
    g.computeVertexNormals();
    return g;
  };
  const heartTex = tex(makeCanvas(128, 128, (g) => {      // golden pothos
    const path = () => { g.beginPath(); g.moveTo(64, 112); g.bezierCurveTo(30, 122, 2, 80, 14, 50); g.bezierCurveTo(24, 24, 50, 14, 64, 4); g.bezierCurveTo(78, 14, 104, 24, 114, 50); g.bezierCurveTo(126, 80, 98, 122, 64, 112); g.closePath(); };
    const gr = g.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, '#3f8a3a'); gr.addColorStop(1, '#2c6a2c');
    path(); g.fillStyle = gr; g.fill();
    g.save(); path(); g.clip();
    for (let k = 0; k < 9; k++) { g.strokeStyle = 'rgba(226,214,120,' + (0.25 + Math.random() * 0.3) + ')'; g.lineWidth = 2 + Math.random() * 4; g.beginPath(); g.moveTo(64, 100); g.quadraticCurveTo(64 + (Math.random() - 0.5) * 60, 60, 20 + Math.random() * 88, 10 + Math.random() * 40); g.stroke(); }
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
  const clayMat = new T.MeshStandardMaterial({ color: 0xb4623a, roughness: 0.85 });
  const soilMat = new T.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 });
  const P3 = (a) => a.map((q) => new T.Vector2(q[0], q[1]));
  function pot(r, h, x, y, z) {
    const m = new T.Mesh(new T.LatheGeometry(P3([[0, 0], [r * 0.78, 0], [r, h * 0.86], [r * 1.1, h * 0.88], [r * 1.1, h], [r * 0.95, h], [r * 0.93, h * 0.9], [0, h * 0.9]]), 28), clayMat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m);
    const soil = new T.Mesh(new T.CircleGeometry(r * 0.92, 24), soilMat); soil.rotation.x = -Math.PI / 2; soil.position.set(x, y + h * 0.86, z); scene.add(soil);
  }
  const vines = [];                                     // trailing pothos: instanced heart leaves along curved vines
  function vine(pts, every, seed, size) {
    const rnd = mulberry(seed), curve = new T.CatmullRomCurve3(pts.map((q) => V3(q[0], q[1], q[2])));
    const tube = new T.Mesh(new T.TubeGeometry(curve, 40, 0.0025, 4), stemMat); tube.castShadow = true; scene.add(tube);
    const n = Math.floor(curve.getLength() / every);
    for (let i = 1; i <= n; i++) {
      const t = i / n, p = curve.getPoint(t), tg = curve.getTangent(t);
      const out = V3(rnd() - 0.5, 0.15, 1).normalize();
      dummy.position.copy(p); dummy.lookAt(p.clone().add(out)); dummy.rotateZ((i % 2 ? 1 : -1) * (0.9 + rnd() * 0.8) + Math.atan2(tg.x, -tg.y) * 0.3);
      const sc = size * (0.75 + rnd() * 0.5) * (1 - 0.35 * t); dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
      vines.push(dummy.matrix.clone());
    }
  }
  // a pothos on top of the bookshelf, spilling down its front
  (function shelfPlant() {
    const x = -1.12, z = ROOM.zBack + 0.2, y = 1.22;
    pot(0.07, 0.1, x, y, z);
    vine([[x - 0.03, y + 0.09, z + 0.04], [x - 0.06, y + 0.04, z + 0.13], [x - 0.08, y - 0.02, z + 0.16], [x - 0.1, y - 0.35, z + 0.17], [x - 0.06, y - 0.62, z + 0.18]], 0.045, 11, 0.06);
    vine([[x + 0.04, y + 0.09, z + 0.03], [x + 0.1, y + 0.03, z + 0.12], [x + 0.14, y - 0.2, z + 0.14], [x + 0.13, y - 0.45, z + 0.15]], 0.045, 13, 0.06);
    for (let k = 0; k < 7; k++) { const a = k * 0.9; vines.push(new T.Matrix4().compose(V3(x + Math.cos(a) * 0.05, y + 0.11, z + Math.sin(a) * 0.05), new T.Quaternion().setFromEuler(new T.Euler(-1.0 + (k % 2) * 0.4, a, 0)), V3(0.06, 0.06, 0.06))); }
  })();
  const vineMesh = new T.InstancedMesh(leafGeo(1, 1, 0.12, 0.1), potheMat, vines.length);
  vines.forEach((m, i) => vineMesh.setMatrixAt(i, m));
  vineMesh.castShadow = true; vineMesh.receiveShadow = true; scene.add(vineMesh);
  // a monstera in the far corner past the desk
  (function monstera() {
    const x = 2.47, z = ROOM.zBack + 0.32, rnd = mulberry(29);
    pot(0.16, 0.3, x, 0, z);
    for (let k = 0; k < 13; k++) {
      const a = k * 2.39996 + 0.4, r = 0.1 + rnd() * 0.32, h = 0.45 + rnd() * 0.7;
      const start = V3(x + Math.cos(a) * 0.03, 0.27, z + Math.sin(a) * 0.03), end = V3(x + Math.cos(a) * r, h, z + Math.sin(a) * r * 0.8);
      const ctrl = V3((start.x + end.x) / 2, h + 0.08, (start.z + end.z) / 2);
      const st = new T.Mesh(new T.TubeGeometry(new T.QuadraticBezierCurve3(start, ctrl, end), 10, 0.006, 5), stemMat); st.castShadow = true; scene.add(st);
      const out = V3(Math.cos(a), 0, Math.sin(a) * 0.8).normalize(), nrm = out.clone().multiplyScalar(0.55).add(V3(0, 0.85, 0)).normalize();
      const leaf = new T.Mesh(leafGeo(1, 1, 0.08, 0.12), monsteraMat);
      leaf.position.copy(end); leaf.lookAt(end.clone().add(nrm));
      leaf.rotateZ(-Math.atan2(out.x, out.z) * 0 + (rnd() - 0.5) * 0.8 + Math.PI);
      const sc = 0.32 + rnd() * 0.2; leaf.scale.set(sc, sc, sc);
      leaf.castShadow = true; leaf.receiveShadow = true; scene.add(leaf);
    }
  })();

  // album sleeves leaning on the shelf, one record out on the bed
  const albumArt = [
    (g, w, h) => { g.fillStyle = '#1d3b45'; g.fillRect(0, 0, w, h); for (let k = 0; k < 9; k++) { g.strokeStyle = k % 2 ? '#e0703a' : '#f0c75a'; g.lineWidth = 9; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, 70 + k * 20 + Math.sin(x / 26 + k) * 12); g.stroke(); } g.fillStyle = '#f4ead4'; g.font = '900 38px "Arial Black", Arial'; g.fillText('ONDA', 20, 50); },
    (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#120a2a'); gr.addColorStop(0.55, '#7a1f6a'); gr.addColorStop(1, '#ff7a3d'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,90,200,0.8)'; g.lineWidth = 2; for (let k = 0; k < 10; k++) { g.beginPath(); g.moveTo(0, 160 + k * k * 1.2); g.lineTo(w, 160 + k * k * 1.2); g.stroke(); } for (let k = -8; k <= 8; k++) { g.beginPath(); g.moveTo(w / 2 + k * 8, 160); g.lineTo(w / 2 + k * 60, h); g.stroke(); } g.fillStyle = '#ffe6f6'; g.font = 'italic 900 40px Arial'; g.fillText('NEÓN', 64, 100); },
    (g, w, h) => { g.fillStyle = '#e8e0d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(128, 120, 70, 0, 6.2832); g.fill(); g.fillStyle = '#e8e0d0'; g.fillRect(58, 112, 140, 10); g.fillStyle = '#c8392b'; g.beginPath(); g.arc(180, 70, 14, 0, 6.2832); g.fill(); g.fillStyle = '#1a1a1a'; g.font = '700 22px Georgia'; g.fillText('Retrato', 24, 236); },
    (g, w, h) => { g.fillStyle = '#efe2c0'; g.fillRect(0, 0, w, h); ['#c8392b', '#1f4f7a', '#e0a21b', '#2f6b4e'].forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.moveTo(30 + k * 50, 220); g.lineTo(80 + k * 50, 60 + k * 20); g.lineTo(130 + k * 50, 220); g.fill(); }); g.fillStyle = '#222'; g.font = '900 24px Arial'; g.fillText('LOS SURCOS', 24, 40); },
    (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6b04a'); gr.addColorStop(0.6, '#e2542e'); gr.addColorStop(1, '#3a1430'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(150, 150, 46, 0, 6.2832); g.fill(); g.fillStyle = '#1e0c1a'; g.fillRect(70, 110, 6, 140); for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(73, 110, 42, 9, k * 0.45 - 1.2, 0, 6.2832); g.fill(); } g.fillRect(0, 230, w, 26); g.fillStyle = '#fff1d6'; g.font = '800 26px Georgia'; g.fillText('Trópico', 140, 40); },
    (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a2f55'); gr.addColorStop(0.5, '#e07a3a'); gr.addColorStop(0.62, '#f4c27a'); gr.addColorStop(0.63, '#3a3a5a'); gr.addColorStop(1, '#1c1c30'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(255,210,150,' + (0.5 - k * 0.03) + ')'; g.fillRect(110 - k * 3, 165 + k * 6, 36 + k * 6, 2); } g.fillStyle = '#f4ead4'; g.font = 'italic 700 24px Georgia'; g.fillText('Atardecer', 20, 40); }
  ].map((draw) => tex(makeCanvas(256, 256, (g, w, h) => { draw(g, w, h); g.fillStyle = 'rgba(255,245,225,0.08)'; for (let k = 0; k < 300; k++) g.fillRect(Math.random() * w, Math.random() * h, 1, 1); g.strokeStyle = 'rgba(255,250,240,0.25)'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6); })));
  const sleeveEdge = new T.MeshStandardMaterial({ color: 0xd8ceb8, roughness: 0.8 });
  function sleeve(art) {
    const front = new T.MeshStandardMaterial({ map: albumArt[art], roughness: 0.6 });
    const m = new T.Mesh(new T.BoxGeometry(0.315, 0.315, 0.004), [sleeveEdge, sleeveEdge, sleeveEdge, sleeveEdge, front, sleeveEdge]);
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
    return m;
  }
  [[-1.72, 0], [-1.69, 1], [-1.66, 2], [-1.62, 3], [-1.58, 4]].forEach(([x, art], k) => {
    const m = sleeve(art), lean = 0.2 + k * 0.012;
    m.rotation.set(-lean, (k - 2) * 0.03, 0);
    m.position.set(x + k * 0.006, 0.1575 * Math.cos(lean) + 0.002, -1.68 + 0.012 + 0.1575 * Math.sin(lean) + k * 0.009);
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
    const sl = sleeve(5); sl.rotation.order = 'YXZ'; sl.rotation.set(-Math.PI / 2, sp.rot, 0); sl.position.set(sp.x, sp.y + 0.002, sp.z);
    const recMat = new T.MeshStandardMaterial({ map: recordTex, roughness: 0.28, metalness: 0.1 }); recMat.userData.envK = 1.2; envMats.push(recMat);
    const rec = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.002, 72), [new T.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.4 }), recMat, recMat]);
    rec.position.set(rp.x, rp.y + 0.001, rp.z); rec.rotation.set(0, 0.6, 0); rec.castShadow = true; rec.receiveShadow = true; scene.add(rec);
  })();

  // a skateboard leaning on the wall by the shelf, graphic out
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
    const deck = new T.Mesh(deckG, [deckMat, plyMat]);
    const grip = new T.Mesh(kick(new T.ShapeGeometry(shape, 24).translate(0, 0, 0.0135)), new T.MeshStandardMaterial({ color: 0x151515, roughness: 1 }));
    const board = new T.Group(); board.add(deck, grip);
    const metal = new T.MeshStandardMaterial({ color: 0x9a9a9e, metalness: 1, roughness: 0.35 }); envMats.push(metal);
    const wheelM = new T.MeshStandardMaterial({ color: 0xe0782a, roughness: 0.5 });
    for (const tx of [-0.22, 0.22]) {
      const truck = new T.Mesh(new T.BoxGeometry(0.05, 0.17, 0.03), metal); truck.position.set(tx, 0, -0.018); board.add(truck);
      for (const ty of [-0.1, 0.1]) { const wh = new T.Mesh(new T.CylinderGeometry(0.027, 0.027, 0.032, 18), wheelM); wh.position.set(tx, ty, -0.045); board.add(wh); }
    }
    board.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const holder = new T.Group(); holder.add(board);
    board.rotation.set(0, Math.PI, Math.PI / 2);            // length up, grip toward the wall, graphic out
    holder.rotation.x = -0.16;                             // leaning back on the wall
    holder.position.set(-2.26, 0.44, ROOM.zBack + 0.13);
    scene.add(holder);
  })();

  // snapshots taped above the desk
  (function snapshots() {
    const shots = [
      (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fb6d8'); gr.addColorStop(0.6, '#d8e4d8'); gr.addColorStop(0.61, '#2f7f9a'); gr.addColorStop(1, '#e6d2a0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#2b1d14'; g.fillRect(60, 120, 8, 30); g.fillRect(90, 115, 8, 35); },
      (g, w, h) => { g.fillStyle = '#c99a6a'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2a22'; [[40, 70], [80, 64], [120, 72]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 16, 0, 6.2832); g.fill(); g.fillRect(x - 20, y + 14, 40, 80); }); },
      (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f2a25a'); gr.addColorStop(1, '#6a3a4a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#c8392b'; g.fillRect(30, 110, 100, 26); g.fillRect(50, 92, 60, 22); g.fillStyle = '#111'; g.beginPath(); g.arc(52, 138, 10, 0, 6.2832); g.arc(108, 138, 10, 0, 6.2832); g.fill(); }
    ];
    const tape = new T.MeshStandardMaterial({ color: 0xf1e6c8, roughness: 0.8, transparent: true, opacity: 0.6 });
    [[1.32, 1.74, 0.07], [1.47, 1.8, -0.05], [1.6, 1.71, 0.11]].forEach(([x, y, rz], k) => {
      const t = tex(makeCanvas(160, 200, (g, w, h) => { g.fillStyle = '#f6f1e6'; g.fillRect(0, 0, w, h); g.save(); g.translate(8, 8); shots[k](g, w - 16, h - 16); g.restore(); g.fillStyle = 'rgba(255,240,210,0.15)'; g.fillRect(0, 0, w, h); }));
      const ph = poster(t, 0.1, 0.125, { flat: true }); ph.position.set(x, y, ROOM.zBack + 0.003 + k * 0.0006); ph.rotation.z = rz;
      const tp = new T.Mesh(new T.PlaneGeometry(0.04, 0.014), tape); tp.position.set(0, 0.058, 0.0008); tp.rotation.z = 0.1; ph.add(tp);
    });
  })();

  // headphones left on the chair
  (function headphones() {
    const g = new T.Group();
    const band = new T.Mesh(new T.TorusGeometry(0.075, 0.005, 8, 32, Math.PI), new T.MeshStandardMaterial({ color: 0x8c8c90, metalness: 1, roughness: 0.3 })); g.add(band);
    const foam = new T.MeshStandardMaterial({ color: 0xd8642a, roughness: 1 });
    for (const sx of [-1, 1]) { const cup = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.02, 20), foam); cup.rotation.z = Math.PI / 2; cup.position.set(sx * 0.075, -0.005, 0); g.add(cup); }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.rotation.set(-Math.PI / 2 + 0.25, 0, 0.5); g.position.set(1.6, 0.545, -1.1);
    scene.add(g);
  })();
  photo('wool_nor', false, [9, 9], set([rugMat], 'normalMap', (m) => { m.normalScale.set(1.6, 1.6); }));
  photo('cotton_nor', false, [2, 2], set(posterMats, 'normalMap', (m) => { m.normalScale.set(0.12, 0.12); }));

  /* ───────────────────────── lights ───────────────────────── */
  const hemi = new T.HemisphereLight(0xffffff, 0xffffff, 1); scene.add(hemi);
  const sun = new T.SpotLight(0xffffff, 10, 0, 0.026, 0.2, 0);
  sun.position.copy(SUN_POS); sun.target.position.copy(G0).addScaledVector(SUN_DIR, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 36; sun.shadow.camera.far = 52; sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.012; sun.shadow.radius = 2.5;
  scene.add(sun, sun.target);
  const fill = new T.DirectionalLight(0xa9bfe6, 0.3); fill.position.set(1.4, 2.4, 4); scene.add(fill);
  const bounce = new T.PointLight(0xff9a55, 2, 5, 2); bounce.position.set(0.3, 0.36, 0.9); scene.add(bounce);
  const lampLight = new T.PointLight(0xff5a20, 1.5, 5, 2); lampLight.position.set(1.62, 1.08, -1.7); scene.add(lampLight);
  const tvLight = new T.PointLight(0xa8c0ff, 0.5, 3.5, 2); tvLight.position.set(1.12, 1.05, -1.42); scene.add(tvLight);
  const roomLamp = new T.SpotLight(0xffb066, 8, 0, 0.95, 1, 2);       // a lamp off to the right, out of frame
  roomLamp.position.set(2.3, 3.2, 1.7); roomLamp.target.position.set(-0.9, 0.8, -1.9);
  roomLamp.castShadow = true; roomLamp.shadow.mapSize.set(1024, 1024); roomLamp.shadow.camera.near = 0.5; roomLamp.shadow.camera.far = 10;
  roomLamp.shadow.bias = -0.0006; roomLamp.shadow.normalBias = 0.02; roomLamp.shadow.radius = 5;
  scene.add(roomLamp, roomLamp.target);

  /* ───────────────────────── Axis Cube ───────────────────────── */
  const AXV = [V3(2, 2, -1).multiplyScalar(1 / 3), V3(2, -1, 2).multiplyScalar(1 / 3), V3(1, -2, -2).multiplyScalar(1 / 3)];
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

  const cube = new T.Group();
  const pieces = [];
  (function buildCube() {
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      if (!i && !j && !k) continue;
      const planes = FACE_N.map((n, f) => ({ n, d: 1, kind: 'outer', face: f }));
      [i, j, k].forEach((c, a) => {
        const ax = AXV[a];
        if (c === 1) planes.push({ n: ax.clone().negate(), d: -(CUT + GAP), kind: 'cut' });
        else if (c === -1) planes.push({ n: ax.clone(), d: -(CUT + GAP), kind: 'cut' });
        else { planes.push({ n: ax.clone(), d: CUT - GAP, kind: 'cut' }); planes.push({ n: ax.clone().negate(), d: CUT - GAP, kind: 'cut' }); }
      });
      const raw = polytope(planes);
      if (raw.faces.length < 4) continue;
      const fin = polytope(planes.concat(bevelPlanes(raw)));
      const bp = [], bn = [];
      for (const f of fin.faces) {
        const n = f.plane.n;
        for (let t = 1; t + 1 < f.pts.length; t++) for (const q of [f.pts[0], f.pts[t], f.pts[t + 1]]) { bp.push(q.x, q.y, q.z); bn.push(n.x, n.y, n.z); }
      }
      const sp = [], sn = [], sc = [];
      let nStk = 0;
      for (const f of raw.faces) {
        if (f.plane.kind !== 'outer') continue;
        const n = f.plane.n, col = FACE_COL[f.plane.face];
        const U = (Math.abs(n.y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0)).cross(n).normalize(), W = V3().crossVectors(n, U), O = f.pts[0];
        const poly = f.pts.map((p) => { const d = p.clone().sub(O); return [d.dot(U), d.dot(W)]; });
        const core = inset2D(poly, STK_M + STK_R);
        if (!core) continue;
        nStk++;
        const top = roundOutline(core, STK_R, 6), base = roundOutline(core, STK_R + STK_RIM, 6);
        const P3 = (q, h) => O.clone().addScaledVector(U, q[0]).addScaledVector(W, q[1]).addScaledVector(n, h);
        let mx = 0, my = 0; top.forEach((q) => { mx += q[0]; my += q[1]; }); mx /= top.length; my /= top.length;
        const C = P3([mx, my], STK_H);
        const push = (v, nn) => { sp.push(v.x, v.y, v.z); sn.push(nn.x, nn.y, nn.z); sc.push(col.r, col.g, col.b); };
        for (let t = 0; t < top.length; t++) {
          const a = top[t], b = top[(t + 1) % top.length], a2 = base[t], b2 = base[(t + 1) % top.length];
          const A = P3(a, STK_H), B = P3(b, STK_H), A2 = P3(a2, 0), B2 = P3(b2, 0);
          push(C, n); push(A, n); push(B, n);
          const na = V3().addScaledVector(U, a[2]).addScaledVector(W, a[3]).multiplyScalar(STK_H).addScaledVector(n, STK_RIM).normalize();
          const nb = V3().addScaledVector(U, b[2]).addScaledVector(W, b[3]).multiplyScalar(STK_H).addScaledVector(n, STK_RIM).normalize();
          push(A, na); push(A2, na); push(B2, nb);
          push(A, na); push(B2, nb); push(B, nb);
        }
      }
      const group = new T.Group();
      const body = new T.Mesh(geoFrom(bp, bn), bodyMat); body.castShadow = true; body.receiveShadow = true; group.add(body);
      if (sp.length) { const st = new T.Mesh(geoFrom(sp, sn, sc), stickerMat); st.castShadow = true; st.receiveShadow = true; group.add(st); }
      cube.add(group);
      pieces.push({ group, cell0: [i, j, k], M: [1, 0, 0, 0, 1, 0, 0, 0, 1], qBase: new T.Quaternion(), stickers: nStk });
    }
    const core = new T.Mesh(new T.SphereGeometry(0.46, 24, 16), bodyMat); core.castShadow = true; cube.add(core);
  })();
  cube.scale.setScalar(CUBE_SCALE);
  cube.position.copy(CUBE_HOME);
  // Presented to the camera with its mechanism square to the screen: one turning axis points up, one right,
  // one at the viewer, so the rings' layers and slices are the ones you see. The outer cube sits askew, as an Axis Cube does.
  const PRESENT = (function () {
    const z = V3().crossVectors(AXV[1], AXV[0]);
    return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().set(
      AXV[1].x, AXV[1].y, AXV[1].z, 0, AXV[0].x, AXV[0].y, AXV[0].z, 0, z.x, z.y, z.z, 0, 0, 0, 0, 1));
  })();
  const TILT = new T.Quaternion().setFromEuler(new T.Euler(0.16, -0.22, 0));   // a little turned, so it reads in depth
  scene.add(cube);

  /* moves: a 3×3 mechanism whose axes are tilted inside the cube */
  const ROT = [[1, 0, 0, 0, 0, -1, 0, 1, 0], [0, 0, 1, 0, 1, 0, -1, 0, 0], [0, -1, 0, 1, 0, 0, 0, 0, 1]];
  const mul3 = (A, B) => { const C = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return C; };
  const tr3 = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
  const apply3 = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
  const BAS = [AXV[0].x, AXV[1].x, AXV[2].x, AXV[0].y, AXV[1].y, AXV[2].y, AXV[0].z, AXV[1].z, AXV[2].z];
  const BAS_T = tr3(BAS);
  const m4 = new T.Matrix4();
  function quatFromM(M, out) {
    const R = mul3(mul3(BAS, M), BAS_T);
    m4.set(R[0], R[1], R[2], 0, R[3], R[4], R[5], 0, R[6], R[7], R[8], 0, 0, 0, 0, 1);
    return out.setFromRotationMatrix(m4);
  }
  const cellOf = (p) => apply3(p.M, p.cell0);
  const sim = { history: [], queue: 0, target: 'solved', cur: null, last: null };
  const qAnim = new T.Quaternion();
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function nextMove() {
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
  function stepMoves(dt) {
    if (!sim.cur) {
      const m = nextMove();
      if (!m) { if (sim.onIdle) sim.onIdle(); return; }
      m.t = 0; m.parts = pieces.filter((p) => cellOf(p)[m.axis] === m.side);
      sim.cur = m;
    }
    const m = sim.cur;
    m.t += dt / m.dur;
    const e = m.t >= 1 ? 1 : ease(m.t);
    qAnim.setFromAxisAngle(AXV[m.axis], m.dir * Math.PI / 2 * e);
    for (const p of m.parts) p.group.quaternion.copy(qAnim).multiply(p.qBase);
    if (m.t >= 1) {
      const R = m.dir > 0 ? ROT[m.axis] : tr3(ROT[m.axis]);
      for (const p of m.parts) { p.M = mul3(R, p.M); quatFromM(p.M, p.qBase); p.group.quaternion.copy(p.qBase); }
      sim.last = m; sim.cur = null; qAnim.identity();
    }
  }

  /* ───────────────────────── dust ───────────────────────── */
  const DUST_BOX = { min: V3(-1.5, 0.4, -1.9), size: V3(2.7, 3.0, 4.1) };
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
    uCubePos: { value: cube.position }, uCubeR: { value: CUBE_SCALE * 1.25 }
  };
  const dustMat = new T.ShaderMaterial({
    uniforms: Object.assign({
      uTime: { value: 0 }, uPx: { value: 800 }, uMinPx: { value: 1.6 }, uBoxMin: { value: DUST_BOX.min }, uBoxSize: { value: DUST_BOX.size },
      uColor: { value: new T.Color(1, 0.86, 0.62) }, uGain: { value: 1 }, uAmbient: { value: 0.004 },
      uPuff: { value: new T.Vector4(0, 0, 0, -100) }
    }, lightUniforms),
    vertexShader: LIGHT_GLSL + `
      attribute vec4 aSeed;
      uniform float uTime; uniform float uPx; uniform float uMinPx; uniform vec3 uBoxMin; uniform vec3 uBoxSize; uniform vec4 uPuff;
      varying float vLit; varying float vTw; varying float vPx;
      void main(){
        vec3 p = position; float t = uTime;
        p.x += sin(t * 0.11 * (0.5 + aSeed.x) + aSeed.y * 6.283) * 0.2 + sin(t * 0.37 + aSeed.z * 20.0) * 0.02;
        p.z += cos(t * 0.09 * (0.5 + aSeed.y) + aSeed.z * 6.283) * 0.2 + sin(t * 0.29 + aSeed.x * 20.0) * 0.02;
        p.y += t * 0.014 * (aSeed.x - 0.42) + sin(t * 0.13 + aSeed.w * 6.283) * 0.08;
        p = uBoxMin + mod(p - uBoxMin, uBoxSize);
        float age = t - uPuff.w;                                   // a tap on the cube stirs the air around it
        vec3 dp = p - uPuff.xyz; float dl = length(dp) + 1e-4;
        p += dp / dl * 0.28 * exp(-dl * 1.6) * (1.0 - exp(-age * 5.0)) * exp(-age * 0.55) * step(0.0, age);
        vLit = beamAt(p);
        vTw = pow(0.5 + 0.5 * sin(t * (1.1 + aSeed.x * 2.6) + aSeed.y * 40.0), 10.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float px = (0.0048 + 0.0095 * aSeed.w * aSeed.w) * uPx / max(0.05, -mv.z);
        vPx = px / uMinPx; gl_PointSize = clamp(px, uMinPx, 64.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uGain; uniform float uAmbient;
      varying float vLit; varying float vTw; varying float vPx;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d) * 2.0;
        float core = smoothstep(1.0, 0.0, r); core *= core;
        float gl1 = max(0.0, 1.0 - abs(d.x) * 16.0) * max(0.0, 1.0 - abs(d.y) * 2.2);
        float gl2 = max(0.0, 1.0 - abs(d.y) * 16.0) * max(0.0, 1.0 - abs(d.x) * 2.2);
        float small = min(1.0, vPx);
        float big = clamp(4.5 / max(vPx, 1.0), 0.08, 1.0);
        float b = vLit * (1.0 + 2.2 * vTw) + uAmbient;
        vec3 c = uColor * uGain * b * (core * big * big * 1.4 + (gl1 + gl2) * vTw * 0.2) * small;
        gl_FragColor = vec4(c, 1.0);
      }`,
    blending: T.AdditiveBlending, depthWrite: false, transparent: true
  });
  const dust = (function () {
    const N = 9000, rnd = mulberry(99);
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
      uCamPos: { value: camera.position }, uSunColor: { value: new T.Color(1, 0.8, 0.5) }, uStrength: { value: 2.5 }, uTime: { value: 0 }, uSMax: { value: 6.6 }, uFrame: { value: 0 }
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
      uTint: { value: new T.Color(1, 1, 1) }, uLift: { value: new T.Color(0, 0, 0) }, uSat: { value: 1 } },
    fragmentShader: `
      uniform sampler2D tColor; uniform sampler2D tBloom; uniform float uBloom; uniform float uExposure; uniform float uVignette; uniform float uTime; uniform float uFade;
      uniform vec3 uTint; uniform vec3 uLift; uniform float uSat;
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
        c = uLift + c * (1.0 - uLift);
        c += (h21(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * 0.022;
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
    cube.visible = false; dust.visible = false;
    renderer.autoClear = true;
    cubeCam.update(renderer, scene);
    renderer.autoClear = false;
    cube.visible = true; dust.visible = true;
    const next = pmrem.fromCubemap(cubeRT.texture);
    envMats.forEach((m) => { m.envMap = next.texture; m.needsUpdate = true; });
    if (envRT) envRT.dispose();
    envRT = next;
  }

  /* ───────────────────────── the look: dusk ───────────────────────── */
  const LOOK = { exposure: 1.08, sunCol: [1.0, 0.74, 0.44], sunI: 8.5, hemiSky: [0.46, 0.33, 0.26], hemiGnd: [0.22, 0.12, 0.07], hemiI: 0.6, fillI: 0.2, vol: 0.45,
    winCol: [1.0, 0.8, 0.52], winI: 3.2, glow: 0.75, vignette: 0.62, bloom: 0.3, thr: 1.5, dust: 0.55, bounce: 2.2, lamp: 1.0, env: 1.0,
    room: 13, ao: 1.0, tint: [1.04, 0.98, 0.88], lift: [0.03, 0.017, 0.008], sat: 0.9 };
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
  }

  /* ───────────────────────── camera and sizing ───────────────────────── */
  const CAM_TARGET = V3(0, 1.22, 0);
  const ORBIT = { yaw: 0.62, pitchMin: 0.06, pitchMax: 0.42, rMin: 2.7, rMax: 4.3 };   // how far the room can be looked around
  const orbit = { yaw: 0, pitch: 0.2, yawT: 0, pitchT: 0.2, r: 3.55 };
  let resScale = 1;
  function resize() {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * resScale);
    renderer.setSize(w, h, false);
    makeTargets(renderer.domElement.width, renderer.domElement.height);
    camera.aspect = w / h;
    const tanV = clamp(Math.max(0.43, 0.25 / camera.aspect), 0.2, 0.6);
    camera.fov = 2 * Math.atan(tanV) * 180 / Math.PI;
    camera.updateProjectionMatrix();
    dustMat.uniforms.uPx.value = renderer.domElement.height / (2 * tanV);
    dustMat.uniforms.uMinPx.value = 1.3 * renderer.getPixelRatio();
  }
  window.addEventListener('resize', resize);

  /* ───────────────────────── touch ───────────────────────── */
  // A turn follows the finger, keeps its momentum when let go, slows on friction, and once it has lost its force
  // it stamps onto the nearest quarter turn (an underdamped spring, so it lands with a small click). How many
  // quarters a flick travels is up to the physics. Holding the cube opens it; when the hold completes it
  // scrambles (or solves) in one go and closes again; sliding off the cube before that cancels.
  const Q = Math.PI / 2, TURN_PX = 105, HIT = 54, FRICTION = 2.6, SNAP_VEL = 2.2, STIFF = 260, DAMP = 2 * Math.sqrt(260) * 0.6, HOLD = 0.8;
  const dots = Array.from(host.querySelectorAll('.dot'));
  const ptr = { id: null, mode: '', x: 0, y: 0, x0: 0, y0: 0, t0: 0, tPrev: 0, v: 0 };
  const bob = { off: V3(), vel: V3(), press: 0 };
  let explode = 0, explodeV = 0, explodeT = 0;
  const turn = { phase: 'idle', dot: null, kind: '', axis: 0, side: 0, sgn: 1, ang: 0, vel: 0, target: 0, notch: 0, parts: [], q: new T.Quaternion() };
  const hold = { on: false, t: 0, fired: false };
  const seq = { running: false };
  const vT = V3(), camUp = V3(), camRight = V3(), axW = V3(), scr = V3();
  let clock0 = 0;

  function cubeOnScreen() {                             // the cube's centre and radius in CSS pixels
    scr.copy(cube.position).project(camera);
    const cx = (scr.x + 1) / 2 * window.innerWidth, cy = (1 - scr.y) / 2 * window.innerHeight;
    vT.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(CUBE_SCALE * 1.7).add(cube.position).project(camera);
    return { x: cx, y: cy, r: Math.max(44, Math.abs((vT.x + 1) / 2 * window.innerWidth - cx)) };
  }
  function dotAt(x, y) {                                // the nearest ring within a generous reach
    let best = null, bd = HIT;
    for (const d of dots) {
      const b = d.getBoundingClientRect(), dd = Math.hypot(x - (b.left + b.width / 2), y - (b.top + b.height / 2));
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  }
  function record(axis, side, n) {                      // keep the history short: fold repeated turns of one layer together
    let sum = n;
    while (sim.history.length) { const h = sim.history[sim.history.length - 1]; if (h.axis !== axis || h.side !== side) break; sum += h.dir; sim.history.pop(); }
    const k = ((sum % 4) + 4) % 4;
    if (k === 1 || k === 2) for (let j = 0; j < k; j++) sim.history.push({ axis, side, dir: 1 });
    else if (k === 3) sim.history.push({ axis, side, dir: -1 });
    sim.target = sim.history.length ? 'scrambled' : 'solved'; sim.queue = 0; sim.last = null;
  }
  function beginTurn(dot) {
    if (seq.running) return false;
    if (turn.phase !== 'idle') finishTurn(true);
    const kind = dot.dataset.kind, i = +dot.dataset.i;
    camUp.setFromMatrixColumn(camera.matrixWorld, 1); camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    const ref = kind === 'layer' ? camUp : camRight;
    let axis = 0, bd = 0;
    for (let k = 0; k < 3; k++) { const d = axW.copy(AXV[k]).applyQuaternion(cube.quaternion).dot(ref); if (Math.abs(d) > Math.abs(bd)) { bd = d; axis = k; } }
    const sgn = bd < 0 ? -1 : 1;
    Object.assign(turn, { kind, dot, axis, sgn, side: kind === 'layer' ? sgn * (1 - i) : sgn * (i - 1), ang: 0, vel: 0, notch: 0, phase: 'drag' });
    turn.parts = pieces.filter((p) => cellOf(p)[axis] === turn.side);
    dot.classList.add('on');
    return true;
  }
  function startSnap() { turn.target = Math.round((turn.ang + turn.vel * 0.12) / Q) * Q; turn.phase = 'snap'; }
  function finishTurn(instant) {
    if (turn.phase === 'idle') return;
    const n = Math.round((instant ? turn.ang : turn.target) / Q), k = ((n % 4) + 4) % 4;
    for (let j = 0; j < k; j++) for (const p of turn.parts) p.M = mul3(ROT[turn.axis], p.M);
    for (const p of turn.parts) { quatFromM(p.M, p.qBase); p.group.quaternion.copy(p.qBase); }
    if (k) record(turn.axis, turn.side, k === 3 ? -1 : k);
    turn.q.identity(); turn.dot.classList.remove('on'); turn.phase = 'idle'; turn.parts = [];
    if (!instant) {                                     // the stamp: a click and a small recoil
      haptic.select();
      vT.copy(cube.position).sub(camera.position).normalize(); bob.vel.addScaledVector(vT, 0.22);
    }
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
    turn.q.setFromAxisAngle(AXV[turn.axis], turn.ang);
    for (const p of turn.parts) p.group.quaternion.copy(turn.q).multiply(p.qBase);
  }
  function runSequence() {                              // open, scramble or solve in one go, close
    if (turn.phase !== 'idle') finishTurn(true);
    if (sim.history.length) { sim.target = 'solved'; sim.queue = 0; }
    else { sim.target = 'scrambled'; sim.queue = 20 + Math.floor(Math.random() * 5); }
    sim.fast = true; seq.running = true; explodeT = 1; host.classList.add('busy');
  }
  sim.onIdle = () => {
    if (!seq.running) return;
    seq.running = false; sim.fast = false; explodeT = 0; host.classList.remove('busy');
    haptic.complete();
  };
  function cancelHold() { hold.on = false; if (!seq.running) explodeT = 0; }
  function nudge() {
    vT.copy(cube.position).sub(camera.position).normalize();
    bob.vel.addScaledVector(vT, 0.6).add(axW.set(0, 0.25, 0));
    dustMat.uniforms.uPuff.value.set(cube.position.x, cube.position.y, cube.position.z, clock0);
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (ptr.id !== null) return;
    ptr.id = e.pointerId; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    ptr.x = ptr.x0 = e.clientX; ptr.y = ptr.y0 = e.clientY; ptr.t0 = ptr.tPrev = performance.now(); ptr.v = 0;
    const dot = dotAt(e.clientX, e.clientY);
    if (dot && beginTurn(dot)) ptr.mode = 'turn';
    else {
      const c = cubeOnScreen();
      if (!seq.running && Math.hypot(e.clientX - c.x, e.clientY - c.y) < c.r) { ptr.mode = 'hold'; Object.assign(hold, { on: true, t: 0, fired: false }); }
      else ptr.mode = 'look';
    }
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    ptr.x = e.clientX; ptr.y = e.clientY;
    const now = performance.now(), dtm = Math.max(0.004, (now - ptr.tPrev) / 1000); ptr.tPrev = now;
    if (ptr.mode === 'turn' && turn.phase === 'drag') {
      const d = turn.kind === 'layer' ? dx : dy;
      turn.ang += turn.sgn * d / TURN_PX * Q;
      ptr.v = lerp(ptr.v, d / dtm, 0.5);
    } else if (ptr.mode === 'hold') {
      if (hold.on && !hold.fired) { const c = cubeOnScreen(); if (Math.hypot(ptr.x - c.x, ptr.y - c.y) > c.r * 1.35) cancelHold(); }
    } else if (ptr.mode === 'look') {
      orbit.yawT = clamp(orbit.yawT - dx * 0.0042, -ORBIT.yaw, ORBIT.yaw);
      orbit.pitchT = clamp(orbit.pitchT + dy * 0.003, ORBIT.pitchMin, ORBIT.pitchMax);
    }
  });
  function release(e) {
    if (e.pointerId !== ptr.id) return;
    if (ptr.mode === 'turn' && turn.phase === 'drag') {
      if (performance.now() - ptr.tPrev > 80 || e.type === 'pointercancel') ptr.v = 0;   // the finger stopped before lifting
      turn.vel = turn.sgn * ptr.v / TURN_PX * Q;
      if (Math.abs(turn.vel) > SNAP_VEL) turn.phase = 'spin'; else startSnap();
    } else if (ptr.mode === 'hold' && hold.on && !hold.fired) {
      const quick = performance.now() - ptr.t0 < 220;
      cancelHold(); if (quick) nudge();
    }
    hold.on = false;
    ptr.id = null; ptr.mode = ''; canvas.classList.remove('dragging');
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); orbit.r = clamp(orbit.r + e.deltaY * 0.0015, ORBIT.rMin, ORBIT.rMax); }, { passive: false });
  canvas.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !seq.running) { e.preventDefault(); runSequence(); } });

  /* ───────────────────────── frame ───────────────────────── */
  const pieceDir = V3(), sway = new T.Quaternion(), swayE = new T.Euler();
  let last = performance.now(), frames = 0, slowAcc = 0, slowN = 0;
  function frame(now) {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    const t = now / 1000; clock0 = t;

    // look
    if (envStale) { envStale = false; look.envDirty = true; }
    if (look.envDirty) { captureEnv(); look.envDirty = false; }

    // cube: rings, sequences, hold, float, press, explode
    if (!seq.running) updateTurn(dt);
    stepMoves(dt);
    if (hold.on && !hold.fired) {
      hold.t += dt;
      const k = clamp((hold.t - 0.12) / (HOLD - 0.12), 0, 1);
      explodeT = 0.7 * k * k;
      if (hold.t >= HOLD) { hold.fired = true; haptic.complete(); runSequence(); }
    }
    bob.vel.addScaledVector(bob.off, -26 * dt).multiplyScalar(Math.exp(-3.4 * dt));
    bob.off.addScaledVector(bob.vel, dt);
    const amp = reduceMotion ? 0.4 : 1;
    cube.position.set(CUBE_HOME.x + bob.off.x + Math.sin(t * 0.41) * 0.012 * amp, CUBE_HOME.y + bob.off.y + (Math.sin(t * 0.9) * 0.03 + Math.sin(t * 0.53 + 1) * 0.015) * amp, CUBE_HOME.z + bob.off.z);
    const pressT = (hold.on && !hold.fired) ? 1 : 0;
    bob.press += (pressT - bob.press) * Math.min(1, dt * 18);
    cube.scale.setScalar(CUBE_SCALE * (1 - 0.035 * bob.press));
    explodeV += ((explodeT - explode) * 90 - explodeV * 13) * dt; explode += explodeV * dt;
    const ex = Math.max(0, explode);
    for (const p of pieces) {
      if (ex < 1e-4) { p.group.position.set(0, 0, 0); continue; }
      const c = cellOf(p);
      pieceDir.set(0, 0, 0).addScaledVector(AXV[0], c[0]).addScaledVector(AXV[1], c[1]).addScaledVector(AXV[2], c[2]).multiplyScalar(ex * 0.44);
      if (sim.cur && sim.cur.parts.indexOf(p) >= 0) pieceDir.applyQuaternion(qAnim);
      else if (turn.phase !== 'idle' && turn.parts.indexOf(p) >= 0) pieceDir.applyQuaternion(turn.q);
      p.group.position.copy(pieceDir);
    }
    lightUniforms.uCubeR.value = CUBE_SCALE * (1.25 + ex * 0.4);

    // camera
    orbit.yaw += (orbit.yawT - orbit.yaw) * Math.min(1, dt * 6); orbit.pitch += (orbit.pitchT - orbit.pitch) * Math.min(1, dt * 6);
    const yaw = orbit.yaw + (reduceMotion ? 0 : Math.sin(t * 0.17) * 0.018), pitch = orbit.pitch + (reduceMotion ? 0 : Math.sin(t * 0.13 + 1) * 0.008);
    camera.position.set(CAM_TARGET.x + orbit.r * Math.sin(yaw) * Math.cos(pitch), CAM_TARGET.y + orbit.r * Math.sin(pitch), CAM_TARGET.z + orbit.r * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(CAM_TARGET);
    camera.updateMatrixWorld();
    swayE.set(Math.sin(t * 0.37) * 0.02 * amp, Math.sin(t * 0.29 + 1) * 0.025 * amp, 0);
    cube.quaternion.copy(camera.quaternion).multiply(sway.setFromEuler(swayE)).multiply(TILT).multiply(PRESENT);

    // props
    tvScreenMat.uniforms.uTime.value = t; lavaMat.uniforms.uTime.value = t;
    tvLight.intensity = 0.42 + 0.16 * Math.sin(t * 31.0) * Math.sin(t * 17.3);
    vcrMat.emissiveIntensity = Math.floor(t * 1.2) % 2 ? 1.3 : 0.12;
    lampLight.intensity = (1.5 + 0.12 * Math.sin(t * 0.7)) * (0.6 + 0.4 * (look.lamp || 1));
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

  function jump(n) {            // apply n random turns at once (used to check the scrambled shape)
    for (let i = 0; i < n; i++) {
      const m = { axis: Math.floor(Math.random() * 3), side: Math.random() < 0.5 ? -1 : 1, dir: Math.random() < 0.5 ? -1 : 1 };
      const R = m.dir > 0 ? ROT[m.axis] : tr3(ROT[m.axis]);
      pieces.filter((p) => cellOf(p)[m.axis] === m.side).forEach((p) => { p.M = mul3(R, p.M); quatFromM(p.M, p.qBase); p.group.quaternion.copy(p.qBase); });
      sim.history.push(m);
    }
    sim.target = 'scrambled'; sim.queue = 0;
  }
  const api = {
    frames: 0, sim, cube, cam: camera, orbit, pieces, look, jump, turn, hold, seq, ex: () => explode, toggle: runSequence,
    setExplode: (v) => { explodeT = v; explode = v; explodeV = 0; },
    flick: (kind, i, pxPerSec, px) => {                 // QA: a swipe on a ring, px of drag then a release at pxPerSec
      const dot = dots.find((d) => d.dataset.kind === kind && +d.dataset.i === i);
      if (!dot || !beginTurn(dot)) return false;
      turn.ang = turn.sgn * (px || 0) / TURN_PX * Q; turn.vel = turn.sgn * pxPerSec / TURN_PX * Q;
      if (Math.abs(turn.vel) > SNAP_VEL) turn.phase = 'spin'; else startSnap();
      return true;
    }
  };
  window.__axis = api;   // QA hook: drive the cube from a test
  pieces.forEach((p) => quatFromM(p.M, p.qBase));
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
    host.classList.remove('axis', 'busy');
    host.innerHTML = '';
  };
}
