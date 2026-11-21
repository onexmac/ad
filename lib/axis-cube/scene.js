// Axis Cube: a 3×3 puzzle cut on tilted axes, floating in a small room at dusk,
// light coming through the curtain. Plain three.js, no React: the page mounts it
// into one element and the artifact build bundles the same file.
//
//   const dispose = mountAxisCube(host);   // builds the canvas and the HUD inside host
//
// Tap the cube: scramble / solve. Drag the cube: spin it. Drag the room: look
// around. Hold the cube: it opens into its 26 pieces.
import * as THREE from 'three';
import { haptic } from '../histok/haptic';

const STAGE_DARK = '#0c0705';
const STAGE_LIGHT = '#cdb48f';

const HUD = `
<canvas id="stage" tabindex="0" aria-label="Axis Cube flotando en un cuarto. Tocá el cubo para desarmarlo o armarlo."></canvas>
<div class="hud">
  <div class="top">
    <div class="mark chip"><b>AXIS CUBE</b><span id="state" aria-live="polite">26 piezas · armado</span></div>
    <button class="toggle chip" id="theme" type="button" aria-label="Cambiar a modo claro">
      <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"></circle><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"></path></svg>
      <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z"></path></svg>
    </button>
  </div>
  <div class="hint chip" id="hint">
    <span><b>Tocá</b> desarma / arma</span>
    <span><b>Arrastrá</b> gira</span>
    <span><b>Mantené</b> separa</span>
  </div>
</div>
<div class="fallback" id="fallback" hidden></div>`;

export function mountAxisCube(host) {
  host.classList.add('axis', 'dark');
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
  const G0 = V3(-0.56, 2.5, CURT.z);                             // where the main beam crosses the curtain
  const SUN_DIR = CUBE_HOME.clone().sub(G0).normalize();         // direction the light travels
  const SUN_POS = G0.clone().addScaledVector(SUN_DIR, -42);
  const kx = SUN_DIR.x / SUN_DIR.z, ky = SUN_DIR.y / SUN_DIR.z;
  const toCurt = (x, y, z) => [x + (CURT.z - z) * kx, y + (CURT.z - z) * ky];
  const zOut = ROOM.zBack - WT - 0.01, zIn = ROOM.zBack + 0.03, zSill = ROOM.zBack + 0.09;
  const OPEN = {                                                  // window opening as seen by the light, on the curtain plane
    x0: Math.max(toCurt(WIN.x0, 0, zOut)[0], toCurt(WIN.x0, 0, zIn)[0]),
    x1: Math.min(toCurt(WIN.x1, 0, zOut)[0], toCurt(WIN.x1, 0, zIn)[0]),
    y0: Math.max(toCurt(0, WIN.y0, zOut)[1], toCurt(0, WIN.y0, zSill)[1]),
    y1: Math.min(toCurt(0, WIN.y1, zOut)[1], toCurt(0, WIN.y1, zIn)[1])
  };
  const OPENC = (OPEN.x0 + OPEN.x1) / 2;
  const MUNT = { x: -0.6, y: 2.6, t: 0.02, z0: ROOM.zBack - 0.08, z1: ROOM.zBack - 0.04 };
  const gapL = (y) => OPENC - (0.235 + 0.028 * Math.sin(y * 1.7 + 1.0)) + 0.008 * Math.sin(y * 6.0);
  const gapR = (y) => OPENC + (0.235 + 0.028 * Math.sin(y * 1.3 + 2.2)) + 0.008 * Math.sin(y * 5.0 + 1.0);
  const SLITS = [
    { x: OPEN.x0 + 0.075, w: 0.017, y0: 2.02, y1: 3.2 },
    { x: OPEN.x0 + 0.185, w: 0.011, y0: 2.5, y1: 3.3 },
    { x: OPEN.x1 - 0.185, w: 0.013, y0: 1.95, y1: 2.95 },
    { x: OPEN.x1 - 0.07, w: 0.010, y0: 2.3, y1: 3.3 }
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
  function drawWoodBump(g, w, h, planks) {
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, w, h);
    const pw = w / planks;
    for (let i = 0; i <= planks; i++) {
      const x = i * pw;
      const gr = g.createLinearGradient(x - 5, 0, x + 5, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - 5, 0, 10, h);
    }
  }
  const woodTex = tex(makeCanvas(1024, 1024, (g, w, h) => drawWood(g, w, h, mulberry(7), [132, 78, 40], 8)), { repeat: true });
  const woodBump = tex(makeCanvas(512, 512, (g, w, h) => drawWoodBump(g, w, h, 8)), { repeat: true, srgb: false });
  const darkWoodTex = tex(makeCanvas(512, 512, (g, w, h) => drawWood(g, w, h, mulberry(21), [82, 46, 24], 3)), { repeat: true });
  const carpetTex = tex(makeCanvas(256, 256, (g, w, h) => {
    const rnd = mulberry(3);
    g.fillStyle = '#5a2c1b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = rnd();
      g.fillStyle = v < 0.5 ? 'rgba(25,10,5,0.22)' : 'rgba(190,110,70,0.14)';
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
  }), { repeat: true });
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

  /* Curtain: transparency for the cloth, backlit glow, and the light mask used by the rays and the dust. */
  function curtainPaths(g, S, fill) {
    const cx = (x) => (x - CURT.x0) / CW * S, cy = (y) => (1 - (y - CURT.y0) / CH) * S;
    g.fillStyle = fill; g.strokeStyle = fill; g.lineCap = 'round';
    g.beginPath();
    const N = 40;
    for (let i = 0; i <= N; i++) { const y = CURT.y0 - 0.05 + (CH + 0.1) * i / N; const X = cx(gapL(y)), Y = cy(y); if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y); }
    for (let i = N; i >= 0; i--) { const y = CURT.y0 - 0.05 + (CH + 0.1) * i / N; g.lineTo(cx(gapR(y)), cy(y)); }
    g.closePath(); g.fill();
    SLITS.forEach((s, k) => {
      g.lineWidth = Math.max(1, s.w / CW * S);
      g.beginPath();
      for (let i = 0; i <= 24; i++) { const y = s.y0 + (s.y1 - s.y0) * i / 24; const X = cx(s.x + 0.006 * Math.sin(y * 4.0 + k * 1.7)), Y = cy(y); if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y); }
      g.stroke();
    });
    return { cx, cy };
  }
  const curtainAlphaTex = tex(makeCanvas(1024, 1024, (g, w) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, w);
    curtainPaths(g, w, '#000');
  }), { srgb: false });
  function muntinShadow() {
    const a = toCurt(MUNT.x - MUNT.t, 0, MUNT.z1)[0], b = toCurt(MUNT.x + MUNT.t, 0, MUNT.z0)[0];
    const c = toCurt(0, MUNT.y - MUNT.t, MUNT.z0)[1], d = toCurt(0, MUNT.y + MUNT.t, MUNT.z1)[1];
    return { vx0: a, vx1: b, hy0: c, hy1: d };
  }
  const maskCanvas = (function () {
    const big = makeCanvas(512, 512, (g, S) => {
      const cx = (x) => (x - CURT.x0) / CW * S, cy = (y) => (1 - (y - CURT.y0) / CH) * S;
      g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
      g.save();
      g.beginPath(); g.rect(cx(OPEN.x0), cy(OPEN.y1), (OPEN.x1 - OPEN.x0) / CW * S, (OPEN.y1 - OPEN.y0) / CH * S); g.clip();
      g.fillStyle = 'rgb(5,5,5)'; g.fillRect(0, 0, S, S);                 // light that seeps through the cloth
      for (let x = CURT.x0; x < CURT.x1; x += 6.2832 / 38) { g.fillStyle = 'rgba(255,255,255,0.035)'; g.fillRect(cx(x), 0, 0.02 / CW * S, S); }
      curtainPaths(g, S, '#fff');
      const m = muntinShadow();
      g.fillStyle = '#000';
      g.fillRect(cx(m.vx0), 0, (m.vx1 - m.vx0) / CW * S, S);
      g.fillRect(0, cy(m.hy1), S, (m.hy1 - m.hy0) / CH * S);
      g.restore();
    });
    return makeCanvas(160, 160, (g, S) => { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(big, 0, 0, S, S); });
  })();
  const maskTex = tex(maskCanvas, { srgb: false, nomip: true });
  maskTex.wrapS = maskTex.wrapT = T.ClampToEdgeWrapping;
  const curtainGlowTex = tex(makeCanvas(512, 512, (g, S) => {
    const cx = (x) => (x - CURT.x0) / CW * S, cy = (y) => (1 - (y - CURT.y0) / CH) * S;
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
    const x0 = cx(OPEN.x0), x1 = cx(OPEN.x1), y0 = cy(OPEN.y1), y1 = cy(OPEN.y0);
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, '#ffd9a0'); gr.addColorStop(0.6, '#ffc888'); gr.addColorStop(1, '#f2a868');
    g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (let x = CURT.x0; x < CURT.x1; x += 6.2832 / 38) {                 // folds: thicker cloth lets less light through
      const X = cx(x + 0.07);
      const fg = g.createLinearGradient(X - 9, 0, X + 9, 0);
      fg.addColorStop(0, 'rgba(60,25,5,0)'); fg.addColorStop(0.5, 'rgba(60,25,5,0.55)'); fg.addColorStop(1, 'rgba(60,25,5,0)');
      g.fillStyle = fg; g.fillRect(X - 9, y0, 18, y1 - y0);
    }
    const m = muntinShadow();
    g.fillStyle = 'rgba(30,12,4,0.8)';
    g.fillRect(cx(m.vx0) - 2, y0, (m.vx1 - m.vx0) / CW * S + 4, y1 - y0);
    g.fillRect(x0, cy(m.hy1) - 2, x1 - x0, (m.hy1 - m.hy0) / CH * S + 4);
    const eg = g.createLinearGradient(x0, 0, x1, 0);                       // soft falloff at the frame
    eg.addColorStop(0, 'rgba(0,0,0,0.9)'); eg.addColorStop(0.06, 'rgba(0,0,0,0)'); eg.addColorStop(0.94, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,0.9)');
    g.fillStyle = eg; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }));

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

  /* ───────────────────────── materials ───────────────────────── */
  const wallMat = new T.MeshStandardMaterial({ map: woodTex, bumpMap: woodBump, bumpScale: 1.2, roughness: 0.6 });
  const furnMat = new T.MeshStandardMaterial({ map: darkWoodTex, roughness: 0.48 });
  const ceilMat = new T.MeshStandardMaterial({ color: 0xcdbb9a, roughness: 0.95 });
  const floorMat = new T.MeshStandardMaterial({ map: carpetTex, roughness: 1 });
  const paintMat = new T.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.5 });
  const brassMat = new T.MeshStandardMaterial({ color: 0xb08a4a, metalness: 1, roughness: 0.34 });
  const sheetMat = new T.MeshStandardMaterial({ color: 0xece2d0, roughness: 0.9 });
  const blanketMat = new T.MeshPhysicalMaterial({ map: blanketTex, roughness: 1, sheen: 1, sheenRoughness: 0.5, sheenColor: new T.Color(0.75, 0.55, 0.38) });
  const tvBodyMat = new T.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.5 });
  const envMats = [brassMat, tvBodyMat];

  /* ───────────────────────── geometry helpers ───────────────────────── */
  function boxWU(x0, x1, y0, y1, z0, z1, su, sv) {
    su = su || 1.6; sv = sv || 3.6;
    const g = new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
      if (nx > 0.5) uv.setXY(i, p.getZ(i) / su, p.getY(i) / sv);
      else if (ny > 0.5) uv.setXY(i, p.getX(i) / su, p.getZ(i) / sv);
      else uv.setXY(i, p.getX(i) / su, p.getY(i) / sv);
    }
    return g;
  }
  function addBox(x0, x1, y0, y1, z0, z1, mat, su, sv, parent) {
    const m = new T.Mesh(boxWU(x0, x1, y0, y1, z0, z1, su, sv), mat);
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
    addBox(R.xMin, R.xMax, R.yMax - 0.09, R.yMax, R.zBack, R.zBack + 0.03, furnMat, 0.8, 0.8);
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
  const skyMat = new T.MeshBasicMaterial({ color: 0xffffff });
  const sky = new T.Mesh(new T.PlaneGeometry(4, 4), skyMat);
  sky.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, ROOM.zBack - 0.5);
  scene.add(sky);

  /* curtain */
  const curtainMat = new T.MeshStandardMaterial({
    color: 0xd9c49c, roughness: 0.95, side: T.DoubleSide, alphaMap: curtainAlphaTex, alphaTest: 0.5, alphaToCoverage: true,
    emissive: new T.Color(1, 1, 1), emissiveMap: curtainGlowTex, emissiveIntensity: 1.0, shadowSide: T.DoubleSide
  });
  (function buildCurtain() {
    const g = new T.PlaneGeometry(CW, CH, 200, 30);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + (CURT.x0 + CURT.x1) / 2, y = p.getY(i) + (CURT.y0 + CURT.y1) / 2;
      const v = (y - CURT.y0) / CH;
      const amp = 0.016 + 0.024 * (1 - v);
      const z = amp * (Math.sin(x * 38 + 0.7 * Math.sin(y * 2.1)) * 0.62 + Math.sin(x * 71 + 1.3 + y * 0.8) * 0.24);
      p.setXYZ(i, x, y, CURT.z + z);
    }
    g.computeVertexNormals();
    const m = new T.Mesh(g, curtainMat);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    const rod = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, CW + 0.24, 12), brassMat);
    rod.rotation.z = Math.PI / 2; rod.position.set((CURT.x0 + CURT.x1) / 2, CURT.y1 + 0.012, CURT.z - 0.01);
    scene.add(rod);
    for (const sx of [-1, 1]) {
      const f = new T.Mesh(new T.SphereGeometry(0.03, 14, 10), brassMat);
      f.position.set((CURT.x0 + CURT.x1) / 2 + sx * (CW / 2 + 0.13), CURT.y1 + 0.012, CURT.z - 0.01);
      scene.add(f);
    }
  })();

  /* bed */
  (function buildBed() {
    addBox(-0.86, 0.86, 0.06, 0.26, -1.96, 1.5, furnMat, 0.8, 0.8);
    addBox(-0.9, 0.9, 0.06, 1.18, -2.0, -1.93, furnMat, 0.8, 0.8);            // headboard
    const mat = new T.Mesh(roundedBox(1.66, 0.3, 3.4, 0.07, 8, 4, 12), sheetMat);
    mat.position.set(0, 0.40, -0.23); mat.castShadow = true; mat.receiveShadow = true; scene.add(mat);
    // blanket: rounded slab with soft wrinkles; stripes run across the bed
    const W = 1.76, H = 0.38, L = 2.68, r = 0.09, top = 0.625, zc = 0.2;
    const g = new T.BoxGeometry(W, H, L, 46, 6, 90);
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    const hx = W / 2 - r, hy = H / 2 - r, hz = L / 2 - r, v = V3(), c = V3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz));
      v.sub(c).normalize();
      let x = c.x + v.x * r, y = c.y + v.y * r + (top - H / 2), z = c.z + v.z * r + zc;
      let nx = v.x, ny = v.y, nz = v.z;
      if (ny > 0.5) {
        const a = 0.011 * Math.sin(x * 7.0 + z * 2.3), b = 0.007 * Math.sin(z * 9.0 - x * 3.1 + 1.0), d = 0.0035 * Math.sin(x * 19.0 + z * 13.0);
        y += a + b + d;
        const dx = 0.011 * 7.0 * Math.cos(x * 7.0 + z * 2.3) - 0.007 * 3.1 * Math.cos(z * 9.0 - x * 3.1 + 1.0) + 0.0035 * 19 * Math.cos(x * 19.0 + z * 13.0);
        const dz = 0.011 * 2.3 * Math.cos(x * 7.0 + z * 2.3) + 0.007 * 9.0 * Math.cos(z * 9.0 - x * 3.1 + 1.0) + 0.0035 * 13 * Math.cos(x * 19.0 + z * 13.0);
        nx -= dx * ny; nz -= dz * ny;
        const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      } else if (Math.abs(ny) < 0.5) {
        const wv = 0.012 * Math.sin((x + z) * 9.0) * clamp((top - y) / 0.3, 0, 1);
        x += nx * wv; z += nz * wv;
      }
      p.setXYZ(i, x, y, z); n.setXYZ(i, nx, ny, nz);
      uv.setXY(i, (x + y) * 0.9, (z + Math.max(0, nz) * (top - y)) / 1.9);
    }
    const blanket = new T.Mesh(g, blanketMat);
    blanket.castShadow = true; blanket.receiveShadow = true; scene.add(blanket);
    // pillow
    const pg = new T.SphereGeometry(1, 36, 22);
    const pp = pg.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i);
      const sp = (t, e) => Math.sign(t) * Math.pow(Math.abs(t), e);
      pp.setXYZ(i, sp(x, 0.55) * 0.4, sp(y, 1.0) * 0.1 * (1 + 0.25 * (1 - Math.abs(sp(x, 0.55)))), sp(z, 0.55) * 0.24);
    }
    pg.computeVertexNormals();
    const pillow = new T.Mesh(pg, sheetMat);
    pillow.position.set(0.02, 0.65, -1.56); pillow.rotation.y = 0.06; pillow.castShadow = true; pillow.receiveShadow = true; scene.add(pillow);
  })();

  /* nightstands, TV, lava lamp, posters */
  function nightstand(x0, x1) {
    addBox(x0, x1, 0, 0.62, -1.98, -1.5, furnMat, 0.8, 0.8);
    addBox(x0 + 0.04, x1 - 0.04, 0.36, 0.56, -1.5, -1.488, furnMat, 0.5, 0.5);
    const k = new T.Mesh(new T.SphereGeometry(0.018, 12, 8), brassMat); k.position.set((x0 + x1) / 2, 0.46, -1.475); scene.add(k);
  }
  nightstand(-1.44, -0.92); nightstand(0.92, 1.44);

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
  (function buildTV() {
    const body = new T.Mesh(roundedBox(0.46, 0.36, 0.34, 0.03), tvBodyMat); body.castShadow = true; body.receiveShadow = true; tv.add(body);
    const screen = new T.Mesh(new T.PlaneGeometry(0.3, 0.26), tvScreenMat); screen.position.set(-0.06, 0.0, 0.1715); tv.add(screen);
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
    tv.position.set(-1.17, 0.62 + 0.18, -1.74); tv.rotation.y = 0.32;
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
    lamp.position.set(1.16, 0.62, -1.72);
    scene.add(lamp);
  })();
  function poster(t, x, y, w, h) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: t, roughness: 0.42 }));
    m.position.set(x, y, ROOM.zBack + 0.006); m.receiveShadow = true; scene.add(m);
  }
  poster(posterSunTex, 0.72, 2.5, 0.8, 1.2);
  poster(posterShapesTex, -2.0, 2.2, 0.8, 1.0);

  /* ───────────────────────── lights ───────────────────────── */
  const hemi = new T.HemisphereLight(0xffffff, 0xffffff, 1); scene.add(hemi);
  const sun = new T.SpotLight(0xffffff, 10, 0, 0.026, 0.2, 0);
  sun.position.copy(SUN_POS); sun.target.position.copy(G0).addScaledVector(SUN_DIR, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 36; sun.shadow.camera.far = 52; sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.012; sun.shadow.radius = 2.5;
  scene.add(sun, sun.target);
  const fill = new T.DirectionalLight(0xa9bfe6, 0.3); fill.position.set(1.4, 2.4, 4); scene.add(fill);
  const bounce = new T.PointLight(0xff9a55, 2, 5, 2); bounce.position.set(0.3, 0.36, 0.9); scene.add(bounce);
  const lampLight = new T.PointLight(0xff5a20, 1.5, 5, 2); lampLight.position.set(1.16, 0.95, -1.62); scene.add(lampLight);
  const tvLight = new T.PointLight(0xa8c0ff, 0.5, 3.5, 2); tvLight.position.set(-1.0, 0.85, -1.4); scene.add(tvLight);

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
  cube.quaternion.setFromEuler(new T.Euler(0.44, -Math.PI / 4, 0, 'XYZ'));
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
      return { axis: m.axis, side: m.side, dir: m.dir, dur: 0.16 };
    }
    if (!sim.history.length) return null;
    const h = sim.history.pop();
    return { axis: h.axis, side: h.side, dir: -h.dir, dur: 0.135 };
  }
  const stateEl = $('#state');
  let stateText = '';
  function setState(s) { if (s !== stateText) { stateText = s; stateEl.textContent = '26 piezas · ' + s; } }
  function stepMoves(dt) {
    if (!sim.cur) {
      const m = nextMove();
      if (!m) { setState(sim.history.length ? 'desarmado' : 'armado'); return; }
      m.t = 0; m.parts = pieces.filter((p) => cellOf(p)[m.axis] === m.side);
      sim.cur = m;
      setState(sim.target === 'scrambled' ? 'desarmando…' : 'armando…');
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
  function toggle() {
    if (sim.target === 'solved') { sim.target = 'scrambled'; sim.queue = 18 + Math.floor(Math.random() * 5); }
    else { sim.target = 'solved'; sim.queue = 0; }
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
        float b = vLit * (1.05 + 9.0 * vTw) + uAmbient;
        vec3 c = uColor * uGain * b * (core * big * big * 1.4 + (gl1 + gl2) * vTw * 0.8) * small;
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

  const shaftMat = new T.ShaderMaterial(Object.assign({
    uniforms: Object.assign({
      tColor: { value: null }, tDepth: { value: null }, uProjInv: { value: camera.projectionMatrixInverse }, uViewInv: { value: camera.matrixWorld },
      uCamPos: { value: camera.position }, uSunColor: { value: new T.Color(1, 0.8, 0.5) }, uStrength: { value: 2.5 }, uTime: { value: 0 }, uSMax: { value: 6.6 }, uFrame: { value: 0 }
    }, lightUniforms),
    fragmentShader: LIGHT_GLSL + `
      uniform sampler2D tColor; uniform sampler2D tDepth; uniform mat4 uProjInv; uniform mat4 uViewInv; uniform vec3 uCamPos;
      uniform vec3 uSunColor; uniform float uStrength; uniform float uTime; uniform float uSMax; uniform float uFrame;
      varying vec2 vUv;
      float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      void main(){
        vec3 col = texture2D(tColor, vUv).rgb;
        float depth = texture2D(tDepth, vUv).r;
        vec4 vp = uProjInv * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0); vp /= vp.w;
        vec3 wp = (uViewInv * vec4(vp.xyz, 1.0)).xyz;
        vec3 rd = wp - uCamPos; float tScene = length(rd); rd /= tScene;
        // the beam is a sheared box behind the curtain: march only where the view ray is inside it
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
    uniforms: { tColor: { value: null }, tBloom: { value: null }, uBloom: { value: 0.5 }, uExposure: { value: 1 }, uVignette: { value: 0.5 }, uTime: { value: 0 }, uFade: { value: 0 } },
    fragmentShader: `
      uniform sampler2D tColor; uniform sampler2D tBloom; uniform float uBloom; uniform float uExposure; uniform float uVignette; uniform float uTime; uniform float uFade;
      varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main(){
        vec3 c = texture2D(tColor, vUv).rgb + texture2D(tBloom, vUv).rgb * uBloom;
        vec2 q = vUv - 0.5;
        c *= mix(1.0, smoothstep(0.95, 0.25, length(q) * 1.15), uVignette);
        c = aces(c * uExposure);
        c = pow(c, vec3(1.0 / 2.2));
        c += (h21(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * 0.022;
        gl_FragColor = vec4(c * uFade, 1.0);
      }`
  }, fsOpts));

  let sceneRT = null, compRT = null, bloomRT = [];
  function makeTargets(w, h) {
    if (sceneRT) { sceneRT.depthTexture.dispose(); sceneRT.dispose(); compRT.dispose(); bloomRT.forEach((r) => r.dispose()); }
    const depthTex = new T.DepthTexture(w, h);
    sceneRT = new T.WebGLRenderTarget(w, h, { type: RT_TYPE, samples: 4, depthTexture: depthTex });
    compRT = new T.WebGLRenderTarget(w, h, { type: RT_TYPE, depthBuffer: false });
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

  /* ───────────────────────── looks: dark (default) and light ───────────────────────── */
  const LOOKS = {
    dark: { exposure: 1.0, sunCol: [1.0, 0.74, 0.44], sunI: 8.5, hemiSky: [0.46, 0.33, 0.26], hemiGnd: [0.22, 0.12, 0.07], hemiI: 0.5, fillI: 0.35, vol: 1.0,
      winCol: [1.0, 0.8, 0.52], winI: 3.2, glow: 0.75, vignette: 0.62, bloom: 0.4, thr: 1.3, dust: 1.0, bounce: 2.2, lamp: 1.0, env: 1.0 },
    light: { exposure: 1.0, sunCol: [1.0, 0.9, 0.74], sunI: 7.5, hemiSky: [0.98, 0.9, 0.8], hemiGnd: [0.6, 0.44, 0.3], hemiI: 2.4, fillI: 0.9, vol: 0.8,
      winCol: [1.0, 0.94, 0.82], winI: 4.5, glow: 1.1, vignette: 0.22, bloom: 0.3, thr: 1.8, dust: 0.8, bounce: 2.4, lamp: 0.6, env: 1.0 }
  };
  const look = { mix: 0, target: 0, envDirty: false };
  const mixA = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  function applyLook(t) {
    const A = LOOKS.dark, B = LOOKS.light, L = (k) => lerp(A[k], B[k], t);
    const sc = mixA(A.sunCol, B.sunCol, t), wc = mixA(A.winCol, B.winCol, t);
    sun.color.setRGB(sc[0], sc[1], sc[2]); sun.intensity = L('sunI');
    hemi.color.setRGB.apply(hemi.color, mixA(A.hemiSky, B.hemiSky, t)); hemi.groundColor.setRGB.apply(hemi.groundColor, mixA(A.hemiGnd, B.hemiGnd, t)); hemi.intensity = L('hemiI');
    fill.intensity = L('fillI'); bounce.intensity = L('bounce');
    skyMat.color.setRGB(wc[0] * L('winI'), wc[1] * L('winI'), wc[2] * L('winI'));
    curtainMat.emissiveIntensity = L('glow');
    shaftMat.uniforms.uSunColor.value.setRGB(sc[0], sc[1], sc[2]); shaftMat.uniforms.uStrength.value = L('vol');
    dustMat.uniforms.uGain.value = L('dust') * 1.6; dustMat.uniforms.uColor.value.setRGB(sc[0], sc[1] * 1.04, sc[2] * 1.1);
    finalMat.uniforms.uExposure.value = L('exposure'); finalMat.uniforms.uVignette.value = L('vignette'); finalMat.uniforms.uBloom.value = L('bloom');
    downMat.uniforms.uThr.value = L('thr');
    lavaMat.uniforms.uGain.value = L('lamp'); look.lamp = L('lamp');
    envMats.forEach((m) => { m.envMapIntensity = L('env'); });
  }
  const root = host, themeBtn = $('#theme');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function setLook(name, instant) {
    look.target = name === 'light' ? 1 : 0;
    if (instant) look.mix = look.target;
    look.envDirty = true;
    root.classList.toggle('dark', name !== 'light');
    if (themeMeta) themeMeta.setAttribute('content', name === 'light' ? STAGE_LIGHT : STAGE_DARK);
    themeBtn.setAttribute('aria-label', name === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
    try { localStorage.setItem('axis-look', name); } catch (e) { /* storage is optional */ }
  }
  let savedLook = 'dark';
  try { savedLook = localStorage.getItem('axis-look') === 'light' ? 'light' : 'dark'; } catch (e) { /* default stays dark */ }
  themeBtn.addEventListener('click', () => { setLook(look.target === 1 ? 'dark' : 'light'); });

  /* ───────────────────────── camera and sizing ───────────────────────── */
  const CAM_TARGET = V3(0, 1.22, 0);
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
  const ptr = { id: null, x: 0, y: 0, x0: 0, y0: 0, t0: 0, tPrev: 0, moved: false, onCube: false, holding: false, timer: 0 };
  const spin = { vel: V3(), idle: 1 };
  const bob = { off: V3(), vel: V3(), press: 0 };
  let explode = 0, explodeV = 0, explodeT = 0;
  const ray = new T.Raycaster(), ndc = new T.Vector2(), sph = new T.Sphere();
  const hint = $('#hint');
  let hintTimer = 0;
  function interacted() { if (!hintTimer) hintTimer = setTimeout(() => hint.classList.add('gone'), 5200); }
  function hitCube(x, y) {
    ndc.set(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    sph.set(cube.position, CUBE_SCALE * (1.75 + explode * 0.5));
    return ray.ray.intersectsSphere(sph);
  }
  const qT = new T.Quaternion(), vT = V3(), vR = V3(), UP = V3(0, 1, 0);
  canvas.addEventListener('pointerdown', (e) => {
    if (ptr.id !== null) return;
    ptr.id = e.pointerId; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    ptr.x = ptr.x0 = e.clientX; ptr.y = ptr.y0 = e.clientY; ptr.t0 = ptr.tPrev = performance.now();
    ptr.moved = false; ptr.holding = false; ptr.onCube = hitCube(e.clientX, e.clientY);
    canvas.classList.add('dragging');
    if (ptr.onCube) {
      spin.vel.set(0, 0, 0); spin.idle = 0;
      ptr.timer = setTimeout(() => { if (ptr.id !== null && !ptr.moved) { ptr.holding = true; explodeT = 1; haptic.drag(); } }, 380);
    }
    interacted();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    ptr.x = e.clientX; ptr.y = e.clientY;
    if (!ptr.moved && Math.hypot(ptr.x - ptr.x0, ptr.y - ptr.y0) > 7) { ptr.moved = true; if (!ptr.holding) clearTimeout(ptr.timer); }
    if (!ptr.moved) return;
    const now = performance.now(), dtm = Math.max(0.004, (now - ptr.tPrev) / 1000); ptr.tPrev = now;
    if (ptr.onCube) {
      const k = 0.0085;
      vR.setFromMatrixColumn(camera.matrixWorld, 0);
      vT.copy(UP).multiplyScalar(dx * k).addScaledVector(vR, dy * k);
      const ang = vT.length();
      if (ang > 1e-6) {
        qT.setFromAxisAngle(vT.clone().multiplyScalar(1 / ang), ang);
        cube.quaternion.premultiply(qT).normalize();
        spin.vel.lerp(vT.multiplyScalar(1 / dtm), 0.45);
      }
    } else {
      orbit.yawT = clamp(orbit.yawT - dx * 0.0042, -0.62, 0.62);
      orbit.pitchT = clamp(orbit.pitchT + dy * 0.003, 0.06, 0.42);
    }
  });
  function release(e) {
    if (e.pointerId !== ptr.id) return;
    clearTimeout(ptr.timer);
    const quick = performance.now() - ptr.t0 < 450;
    if (ptr.holding) { explodeT = 0; }
    else if (!ptr.moved && ptr.onCube && quick && e.type === 'pointerup') { tapCube(); }
    if (ptr.onCube && performance.now() - ptr.tPrev > 90) spin.vel.set(0, 0, 0);
    ptr.id = null; ptr.holding = false; canvas.classList.remove('dragging');
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); orbit.r = clamp(orbit.r + e.deltaY * 0.0015, 2.7, 4.3); }, { passive: false });
  canvas.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tapCube(); interacted(); } });
  let clock0 = 0;
  function tapCube() {
    toggle();
    vT.copy(cube.position).sub(camera.position).normalize();
    bob.vel.addScaledVector(vT, 0.9).add(vR.set(0, 0.35, 0));
    dustMat.uniforms.uPuff.value.set(cube.position.x, cube.position.y, cube.position.z, clock0);
    haptic.select();
  }

  /* ───────────────────────── frame ───────────────────────── */
  const IDLE_AXIS = V3(0.22, 1, 0.1).normalize();
  const pieceDir = V3();
  let last = performance.now(), frames = 0, slowAcc = 0, slowN = 0;
  function frame(now) {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    const t = now / 1000; clock0 = t;

    // look
    if (look.mix !== look.target) {
      look.mix += clamp(look.target - look.mix, -dt * 1.4, dt * 1.4);
      if (Math.abs(look.target - look.mix) < 1e-3) look.mix = look.target;
    }
    applyLook(look.mix * look.mix * (3 - 2 * look.mix));
    if (look.envDirty && look.mix === look.target) { captureEnv(); look.envDirty = false; }

    // cube: moves, spin, float, press, explode
    stepMoves(dt);
    if (!(ptr.id !== null && ptr.onCube && ptr.moved)) {
      const w = spin.vel.length();
      if (w > 1e-4) { qT.setFromAxisAngle(vT.copy(spin.vel).multiplyScalar(1 / w), w * dt); cube.quaternion.premultiply(qT); }
      spin.vel.multiplyScalar(Math.exp(-2.2 * dt));
      if (ptr.id === null) spin.idle = Math.min(1, spin.idle + dt * 0.45);
      qT.setFromAxisAngle(IDLE_AXIS, (reduceMotion ? 0.04 : 0.2) * spin.idle * dt); cube.quaternion.premultiply(qT).normalize();
    }
    bob.vel.addScaledVector(bob.off, -26 * dt).multiplyScalar(Math.exp(-3.4 * dt));
    bob.off.addScaledVector(bob.vel, dt);
    const amp = reduceMotion ? 0.4 : 1;
    cube.position.set(CUBE_HOME.x + bob.off.x + Math.sin(t * 0.41) * 0.012 * amp, CUBE_HOME.y + bob.off.y + (Math.sin(t * 0.9) * 0.045 + Math.sin(t * 0.53 + 1) * 0.02) * amp, CUBE_HOME.z + bob.off.z);
    const pressT = (ptr.id !== null && ptr.onCube && !ptr.holding) ? 1 : 0;
    bob.press += (pressT - bob.press) * Math.min(1, dt * 18);
    cube.scale.setScalar(CUBE_SCALE * (1 - 0.035 * bob.press));
    explodeV += ((explodeT - explode) * 90 - explodeV * 13) * dt; explode += explodeV * dt;
    const ex = Math.max(0, explode);
    for (const p of pieces) {
      if (ex < 1e-4) { p.group.position.set(0, 0, 0); continue; }
      const c = cellOf(p);
      pieceDir.set(0, 0, 0).addScaledVector(AXV[0], c[0]).addScaledVector(AXV[1], c[1]).addScaledVector(AXV[2], c[2]).multiplyScalar(ex * 0.44);
      if (sim.cur && sim.cur.parts.indexOf(p) >= 0) pieceDir.applyQuaternion(qAnim);
      p.group.position.copy(pieceDir);
    }
    lightUniforms.uCubeR.value = CUBE_SCALE * (1.25 + ex * 0.4);

    // camera
    orbit.yaw += (orbit.yawT - orbit.yaw) * Math.min(1, dt * 6); orbit.pitch += (orbit.pitchT - orbit.pitch) * Math.min(1, dt * 6);
    const yaw = orbit.yaw + (reduceMotion ? 0 : Math.sin(t * 0.17) * 0.018), pitch = orbit.pitch + (reduceMotion ? 0 : Math.sin(t * 0.13 + 1) * 0.008);
    camera.position.set(CAM_TARGET.x + orbit.r * Math.sin(yaw) * Math.cos(pitch), CAM_TARGET.y + orbit.r * Math.sin(pitch), CAM_TARGET.z + orbit.r * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(CAM_TARGET);

    // props
    tvScreenMat.uniforms.uTime.value = t; lavaMat.uniforms.uTime.value = t;
    tvLight.intensity = 0.42 + 0.16 * Math.sin(t * 31.0) * Math.sin(t * 17.3);
    lampLight.intensity = (1.5 + 0.12 * Math.sin(t * 0.7)) * (0.6 + 0.4 * (look.lamp || 1));
    dustMat.uniforms.uTime.value = t; shaftMat.uniforms.uTime.value = t; shaftMat.uniforms.uFrame.value = reduceMotion ? 0 : frames % 64; finalMat.uniforms.uTime.value = t;
    finalMat.uniforms.uFade.value = Math.min(1, finalMat.uniforms.uFade.value + dt * 1.6);

    // render: scene → light shafts → bloom → grade
    renderer.setRenderTarget(sceneRT); renderer.clear(); renderer.render(scene, camera);
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
  const api = { frames: 0, toggle: tapCube, setLook, sim, cube, orbit, pieces, look, jump, step: stepMoves, setExplode: (v) => { explodeT = v; explode = v; explodeV = 0; } };
  window.__axis = api;   // QA hook: drive the cube from a test
  pieces.forEach((p) => quatFromM(p.M, p.qBase));
  setLook(savedLook, true);
  applyLook(look.mix);
  resize();
  let disposed = false;
  let rafId = requestAnimationFrame(frame);

  return function dispose() {
    disposed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    clearTimeout(hintTimer); clearTimeout(ptr.timer);
    if (window.__axis === api) delete window.__axis;
    if (sceneRT) { sceneRT.depthTexture.dispose(); sceneRT.dispose(); compRT.dispose(); bloomRT.forEach((r) => r.dispose()); }
    cubeRT.dispose(); if (envRT) envRT.dispose(); pmrem.dispose();
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    renderer.dispose(); renderer.forceContextLoss();
    host.classList.remove('axis', 'dark');
    host.innerHTML = '';
  };
}
