// The Cubes: four puzzles (an Axis Cube, a classic 3×3, a 2×2 and a Ghost Cube) in a home
// library at dusk, a lamp on and an iMac glowing, a low sun coming through the blinds. Plain three.js, no React: the
// page mounts it into one element and the artifact build bundles the same file.
//
//   const dispose = mountAxisCube(host);   // builds the canvas and the rings inside host
//
// The room opens looking down at the ottoman, where the puzzles rest on its leather. Tap one: it
// floats up into the light and the camera drops to face it. A grid of rings, laid
// out like its face (3×3, or 2×2 for the 2×2), turns it: swipe sideways across a row
// to turn that horizontal layer, up or down along a column to turn that vertical
// slice; a turn keeps its momentum and snaps onto a quarter turn as it slows. Swipe the
// puzzle itself: it flips about its own vertical or horizontal axis and lands square to
// the screen. Tap a face: it turns to the front. Hold it: it opens and scrambles or
// solves in one go (drag away to cancel). A long swipe straight down on it puts it back on the ottoman.
// Drag anywhere else: look around.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { haptic } from '../histok/haptic';
import { makeSound } from './sound';
import { makeHint } from './hint';
import { GLYPH } from './glyph';


const HUD = `
<canvas id="stage" tabindex="0" aria-label="Cuatro cubos sobre el otomano de una biblioteca, al atardecer. Tocá uno para usarlo; deslizá los aros para girar sus capas; mantenelo para armarlo o desarmarlo; deslizalo hacia abajo para dejarlo."></canvas>
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

let carried = null;   // what the puzzles and the camera were doing when the scene was last taken down, handed to the next mount


/* The scene is built in slices, the page handed back between them, and so are the GPU's programs before the first
   frame: a phone takes a moment over each, and done in one go they held the page up for seconds, the welcome's
   Start with it. So mounting returns at once; what it returns takes the scene down, whenever it is called. */
const QUIT = {};
export function mountAxisCube(host, opts) {
  let stop = null, quit = false;
  build(host, opts, () => quit).then((d) => { if (quit) d(); else stop = d; }, (e) => { if (e !== QUIT) throw e; });
  return function () { quit = true; if (stop) { const d = stop; stop = null; d(); } };
}

async function build(host, opts, quitting) {
  const texBase = (opts && opts.texBase) || '/kit/axis-cube/tex/';
  // Three looks of the same room. a, analogue: shot on film, with a lens. b, brush: the same light, inked and painted
  // like an anime background. c, classic: a cel-era night, city light through the blinds, coloured shadows.
  const STYLE = opts && (opts.look === 'b' || opts.look === 'c') ? opts.look : 'a';
  // A lab is a build for trying something before it reaches the app: the high-score snippet, opening on the last turn
  // of a solve. sidebar: in the screen's amber. sideb (Side-B): dressed as a friendly old Mac, cream paper and
  // charcoal ink, windows with striped title bars, keys with a lip; on the screen, a window on a dark desktop. The
  // app itself wears Side-B's Mac.
  const LAB = opts && (opts.lab === 'sidebar' || opts.lab === 'sideb') ? opts.lab : null;
  const MAC = LAB !== 'sidebar';
  host.classList.add('axis'); if (MAC) host.classList.add('mac');
  host.innerHTML = HUD;

  const T = THREE;
  const $ = (s) => host.querySelector(s);
  /* The loader is in the page before this script is: a black screen and a bar that fills on a curve of its own.
     When the room can be shown (drawn a few times, every photograph in) the bar is taken from where it has got to,
     run to its end, and the black lifts. If the room cannot be shown at all the black lifts at once, for the message. */
  // every sound the room makes (lib/axis-cube/sound.js); silent until the first touch. The page can hand its own in,
  // already awake from a tap on the install screen; then it is the page's to dispose of
  const ownSound = !(opts && opts.sound), sound = ownSound ? makeSound() : opts.sound;
  const hint = makeHint();                             // after a turn: was it a step toward solved? (lib/axis-cube/hint.js)
  const loaderEl = (opts && opts.loader) || null;
  const t0 = performance.now();
  let pendingPhotos = 0, shown = false, gone = false;
  function reveal(atOnce) {
    shown = true;
    if (!atOnce) sound.ready();                            // the notes of the end of loading, as the bar runs out and the black lifts
    if (opts && typeof opts.onShown === 'function' && !atOnce) { try { opts.onShown(); } catch (e) { /* the host's own business */ } }
    if (!loaderEl) return;
    const fill = loaderEl.querySelector('.track i');
    // After the welcome's Start the bar starts empty (it waited, still, under the welcome) and is seen to run all the
    // way, however ready the room already was: at least 0.85 s from the press, which reads as a fast load rather than
    // as a bar that was simply there full. Otherwise it runs out from wherever it has got to.
    const go = typeof window.__axisGo === 'number' ? window.__axisGo : -1e9;
    const run = Math.max(0.24, 0.85 - (performance.now() - go) / 1000);
    if (fill && !atOnce) {
      const at = getComputedStyle(fill).transform;
      fill.style.animation = 'none'; fill.style.transform = at && at !== 'none' ? at : 'translateX(-100%)';
      void fill.offsetWidth;
      fill.style.transition = 'transform ' + run.toFixed(2) + 's cubic-bezier(0.3, 0.55, 0.3, 1)'; fill.style.transform = 'translateX(0)';
    }
    setTimeout(() => {
      if (gone) return;
      loaderEl.classList.add('out');
      setTimeout(() => { if (!gone) loaderEl.hidden = true; }, 650);
    }, atOnce ? 0 : run * 1000 + 20);
  }
  function fail(msg) { const el = $('#fallback'); el.hidden = false; el.textContent = msg; reveal(true); }

  const canvas = $('#stage');
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
  } catch (e) { fail('Este navegador no pudo iniciar WebGL.'); return () => { host.innerHTML = ''; }; }
  if (!renderer.capabilities.isWebGL2) { fail('Hace falta WebGL 2 para ver esta escena.'); renderer.dispose(); return () => { host.innerHTML = ''; }; }
  // A slice of work ends after a few milliseconds (or at once, after something known to be slow), and the page gets a
  // turn: a tap waits at most that long. The turn is taken through a message, not a timer, so that a page opened in
  // the background, where timers are slowed to a second, still builds. If the scene is taken down meanwhile, what
  // there is of it goes (bail), and the build stops.
  const handBack = typeof scheduler !== 'undefined' && scheduler && typeof scheduler.yield === 'function'
    ? () => scheduler.yield()
    : (() => { const ch = new MessageChannel(), waiting = []; ch.port1.onmessage = () => { const go = waiting.shift(); if (go) go(); }; return () => new Promise((go) => { waiting.push(go); ch.port2.postMessage(0); }); })();
  let sliceAt = performance.now();
  let bail = () => {
    try { renderer.dispose(); renderer.forceContextLoss(); } catch { /* already gone */ }
    hint.dispose(); if (ownSound) sound.dispose();
    host.classList.remove('axis', 'mac'); host.innerHTML = '';
  };
  async function slice(now) {
    if (!now && performance.now() - sliceAt < 8) return;
    await handBack();
    sliceAt = performance.now();
    if (quitting()) { bail(); throw QUIT; }
  }

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
  // a home library, in metres: 3.6 wide, 4.2 deep, 2.6 to the ceiling; the window in the back wall, a sideboard under it
  const ROOM = { xMin: -1.8, xMax: 1.8, yMax: 2.6, zBack: -2.0, zFront: 2.2 };
  const WT = 0.12;                                               // wall thickness
  const WIN = { x0: -0.74, x1: 0.28, y0: 0.96, y1: 2.14 };       // opening in the back wall
  const CURT = { x0: WIN.x0 - 0.21, x1: WIN.x1 + 0.21, y0: WIN.y0 - 0.38, y1: WIN.y1 + 0.10, z: -1.90 };
  const CW = CURT.x1 - CURT.x0, CH = CURT.y1 - CURT.y0;
  const CUBE_HOME = V3(0, 1.3, -0.9);
  const CUBE_SCALE = 0.265;                                      // the room came down to real size; the cube keeps its size on screen
  const G0 = V3(-0.3, 1.8, CURT.z);                              // where the main beam crosses the mask plane: the sun is low
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
  const BL = { x0: WIN.x0 + 0.012, x1: WIN.x1 - 0.012, z: ROOM.zBack + 0.055, top: WIN.y1 - 0.02, bottom: WIN.y0 + 0.23, pitch: 0.034, depth: 0.025, tilt: 0.85 };
  const SLATS = [];
  for (let y = BL.top - 0.06; y > BL.bottom + 0.02; y -= BL.pitch) SLATS.push(y);
  // where the puzzles rest on the ottoman's cushion: three in a shallow V, two behind and one in front, and the
  // Ghost Cube behind them, in the gap between the back two (s is half their size at rest).
  // The layout is written at the size it was first drawn and then drawn in by REST toward the point the camera
  // looks at from above (REST_AT): the puzzles are that much smaller and closer together, and the camera over the
  // ottoman comes in by the same share (SELECT, further down). So on screen they are the size and in the places
  // they were, and the ottoman is that much bigger around them: room for more puzzles. In the hand a puzzle is
  // the size it always was (KINDS' scale).
  const REST = 0.85, REST_AT = { x: 0, z: -0.13 };
  const SPOTS = [
    { key: 'cube2', x: -0.19, z: -0.225, yaw: 0.22, s: 0.066 },
    { key: 'axis', x: 0.01, z: -0.005, yaw: -0.1, s: 0.078 },
    { key: 'cube3', x: 0.18, z: -0.2, yaw: -0.28, s: 0.078 },
    { key: 'ghost', x: -0.012, z: -0.3, yaw: -1.12, s: 0.064 }      // turned to show the faces it is known by: the X to the right, the bars on top
  ].map((sp) => ({ ...sp, x: REST_AT.x + (sp.x - REST_AT.x) * REST, z: REST_AT.z + (sp.z - REST_AT.z) * REST, s: sp.s * REST }));

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

  /* The brush and classic looks are painted like animation cels: every surface is one flat colour with a single
     shadow tone, no photographed grain, no reflections. Their materials are made here instead of the physical ones;
     everything a physical material has that paint does not is left out. The ramp is the edge of the shadow: lit
     wherever a surface faces a light by more than a few degrees, with two texels of softness so the edge does not crawl. */
  const TOON = STYLE !== 'a';
  const toonRamp = (() => {
    const n = 64, d = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) { const v = clamp(((i + 0.5) / n - 0.56) / 0.035, 0, 1); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = Math.round(v * 255); d[i * 4 + 3] = 255; }
    const t = new T.DataTexture(d, n, 1); t.minFilter = t.magFilter = T.LinearFilter; t.needsUpdate = true; return t;
  })();
  const PHYSICAL_ONLY = ['roughness', 'metalness', 'clearcoat', 'clearcoatRoughness'];
  function M(p, physical) {
    if (!TOON) return physical ? new T.MeshPhysicalMaterial(p) : new T.MeshStandardMaterial(p);
    const q = { gradientMap: toonRamp };
    for (const k in p) if (PHYSICAL_ONLY.indexOf(k) < 0) q[k] = p[k];
    return new T.MeshToonMaterial(q);
  }

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
  await slice();
  const maskTex = tex(maskCanvas, { srgb: false, nomip: true });
  maskTex.wrapS = maskTex.wrapT = T.ClampToEdgeWrapping;
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

  /* the framed print: an original composition, drawn here */
  await slice();
  const printTex = tex(makeCanvas(512, 704, (g, w, h) => {
    const rnd = mulberry(131);
    g.fillStyle = '#ece2cc'; g.fillRect(0, 0, w, h);
    const X = 58, Y = 60, W = w - 2 * X, H = h * 0.66;
    g.save(); g.beginPath(); g.rect(X, Y, W, H); g.clip();
    g.fillStyle = '#e4d6b8'; g.fillRect(X, Y, W, H);
    // a low sun, three arches walking across, a dark hill, a string of notes
    g.fillStyle = '#c9541e'; g.beginPath(); g.arc(X + W * 0.68, Y + H * 0.3, W * 0.2, 0, 6.2832); g.fill();
    g.fillStyle = '#e0a12e'; g.beginPath(); g.arc(X + W * 0.68, Y + H * 0.3, W * 0.115, 0, 6.2832); g.fill();
    const arch = (x, y, r, t, col) => { g.strokeStyle = col; g.lineWidth = t; g.lineCap = 'butt'; g.beginPath(); g.moveTo(x - r, y + r * 1.5); g.lineTo(x - r, y); g.arc(x, y, r, Math.PI, 0); g.lineTo(x + r, y + r * 1.5); g.stroke(); };
    arch(X + W * 0.27, Y + H * 0.58, W * 0.15, 30, '#1c1a17');
    arch(X + W * 0.27, Y + H * 0.58, W * 0.065, 14, '#1f5d5a');
    arch(X + W * 0.6, Y + H * 0.7, W * 0.11, 22, '#8a2f1c');
    g.fillStyle = '#1c1a17'; g.beginPath(); g.moveTo(X, Y + H * 0.86);
    g.bezierCurveTo(X + W * 0.3, Y + H * 0.7, X + W * 0.55, Y + H * 0.98, X + W, Y + H * 0.78); g.lineTo(X + W, Y + H); g.lineTo(X, Y + H); g.fill();
    g.fillStyle = '#1f5d5a'; g.beginPath(); g.ellipse(X + W * 0.2, Y + H * 0.2, W * 0.1, W * 0.045, -0.5, 0, 6.2832); g.fill();
    g.strokeStyle = '#1c1a17'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X + W * 0.08, Y + H * 0.42);
    for (let k = 1; k <= 9; k++) g.lineTo(X + W * (0.08 + k * 0.095), Y + H * (0.42 + (k % 2 ? -0.035 : 0.03) + (rnd() - 0.5) * 0.02));
    g.stroke();
    for (let k = 0; k < 7; k++) { g.fillStyle = k % 3 ? '#1c1a17' : '#c9541e'; g.beginPath(); g.arc(X + W * (0.1 + k * 0.13), Y + H * (0.1 + 0.05 * Math.sin(k * 1.9)), 5.5, 0, 6.2832); g.fill(); }
    for (let i = 0; i < 9000; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(60,40,20,0.05)' : 'rgba(255,250,235,0.05)'; g.fillRect(X + rnd() * W, Y + rnd() * H, 1.5, 1.5); }
    g.restore();
    g.fillStyle = '#1c1a17'; g.textAlign = 'center';
    g.font = '900 46px Georgia, "Times New Roman", serif'; g.fillText('JAZZ EN EL VALLE', w / 2, Y + H + 78, w - 110);
    g.font = '600 15px Arial, sans-serif'; g.fillText('F E S T I V A L   D E   V E R A N O   ·   1 9 6 2', w / 2, Y + H + 112, w - 110);
    g.fillStyle = '#c9541e'; g.fillRect(w / 2 - 28, Y + H + 130, 56, 5);
  }));

  /* books: one atlas, a spine per cell (cloth, dust jackets, paperbacks), page edges in the strip at the bottom; titles are made up */
  await slice();
  const BK_N = 32, BK_CW = 40, BK_CH = 320, BK_PAD = 32, BK_W = BK_N * BK_CW, BK_H = BK_CH + BK_PAD;
  const bookTex = tex(makeCanvas(BK_W, BK_H, (g) => {
    const rnd = mulberry(71), pick = (a) => a[(rnd() * a.length) | 0];
    const WORDS = ['Cuentos', 'Historia', 'El mar', 'Poemas', 'Atlas', 'Viajes', 'Ensayos', 'La ciudad', 'Jazz', 'Cine', 'Arquitectura', 'El jardín', 'Diseño', 'Ajedrez', 'Las horas', 'Tipografía',
      'Fotografía', 'Mapas', 'El río', 'Sur', 'Cartas', 'Teatro', 'Música', 'Botánica', 'Los días', 'Geometría', 'El faro', 'Crónicas', 'Pintura', 'Astronomía', 'Novela', 'El viento'];
    const CLOTH = ['#5e1c18', '#1c3428', '#1f2a46', '#4e3c2a', '#6e5119', '#34253a', '#7a664c', '#262626', '#8a4020', '#6a2418', '#5a4026', '#2a3550'];
    const JACKET = ['#d9cdb0', '#e3d8bc', '#cfc09e', '#d6ccb4', '#c8b994', '#ddd0b0', '#b9a888'];
    const PAPER = ['#c95a26', '#1f5f5a', '#c9962a', '#a3261e', '#22406a', '#191715', '#d9cfb6', '#8a3a22', '#6a3450', '#d6c8a6', '#2c4a6a', '#b4442a', '#a87a2a', '#6e2a1c'];
    const INK = ['#1c1a17', '#8a2f1c', '#1f3a5a', '#2b4a36'];
    for (let c = 0; c < BK_N; c++) {
      const x = c * BK_CW, kind = c % 3 === 0 ? 0 : rnd() < 0.55 ? 1 : 2, word = WORDS[c % WORDS.length];
      let fg;
      if (kind === 0) {                                        // cloth, gold bands and a gold title
        g.fillStyle = pick(CLOTH); g.fillRect(x, 0, BK_CW, BK_CH);
        fg = rnd() < 0.7 ? '#c9a45a' : '#e8dcc0'; g.fillStyle = fg;
        for (const y of [24, 31, BK_CH - 38, BK_CH - 31]) g.fillRect(x + 3, y, BK_CW - 6, 2.2);
        g.font = 'italic 700 15px Georgia, serif';
      } else if (kind === 1) {                                 // a paper jacket: cream, a block of colour, dark type
        g.fillStyle = pick(JACKET); g.fillRect(x, 0, BK_CW, BK_CH);
        const col = pick(PAPER);
        if (rnd() < 0.6) { g.fillStyle = col; g.fillRect(x, rnd() < 0.5 ? 0 : BK_CH - 70, BK_CW, 70); }
        else { g.fillStyle = col; g.fillRect(x, 96, BK_CW, 5); g.fillRect(x, BK_CH - 90, BK_CW, 5); }
        fg = pick(INK); g.fillStyle = fg; g.font = '700 14px Georgia, serif';
        g.beginPath(); g.arc(x + BK_CW / 2, BK_CH - 18, 4, 0, 6.2832); g.fill();
      } else {                                                 // a paperback: one flat colour, sans type, a band
        const col = pick(PAPER); g.fillStyle = col; g.fillRect(x, 0, BK_CW, BK_CH);
        const light = ['#d9cfb6', '#d6c8a6', '#c9962a'].indexOf(col) >= 0;
        fg = light ? '#1c1a17' : '#f1e9d6'; g.fillStyle = fg;
        if (rnd() < 0.6) { g.globalAlpha = 0.85; g.fillRect(x, 40 + rnd() * 30, BK_CW, 3 + rnd() * 14); g.globalAlpha = 1; }
        g.fillRect(x + BK_CW / 2 - 5, BK_CH - 24, 10, 10);
        g.font = '900 14px "Arial Narrow", Arial, sans-serif';
      }
      g.save(); g.translate(x + BK_CW / 2 + 5, BK_CH - 62); g.rotate(-Math.PI / 2);
      g.fillStyle = fg; g.fillText(kind === 2 ? word.toUpperCase() : word, 0, 0, BK_CH - 150);
      g.restore();
      for (let k = 0; k < 340; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,240,210,0.06)'; g.fillRect(x + rnd() * BK_CW, rnd() * BK_CH, 1, 1 + rnd() * 2); }
      const sh = g.createLinearGradient(x, 0, x + BK_CW, 0);     // the spine is rounded: it darkens toward both edges
      sh.addColorStop(0, 'rgba(0,0,0,0.42)'); sh.addColorStop(0.2, 'rgba(0,0,0,0)'); sh.addColorStop(0.5, 'rgba(255,240,215,0.06)'); sh.addColorStop(0.8, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.42)');
      g.fillStyle = sh; g.fillRect(x, 0, BK_CW, BK_CH);
      if (kind !== 2 || rnd() < 0.4) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, 0, BK_CW, 3); g.fillRect(x, BK_CH - 3, BK_CW, 3); }
    }
    g.fillStyle = '#e4d9c0'; g.fillRect(0, BK_CH, BK_W, BK_PAD);
    for (let y = BK_CH; y < BK_H; y += 2) { g.fillStyle = 'rgba(120,100,70,0.25)'; g.fillRect(0, y, BK_W, 1); }
  }));

  /* covers: one sheet for the records, the CDs and the magazines; every title is made up */
  const albumArt = [
    (g, w, h) => { g.fillStyle = '#1d3b45'; g.fillRect(0, 0, w, h); for (let k = 0; k < 9; k++) { g.strokeStyle = k % 2 ? '#e0703a' : '#f0c75a'; g.lineWidth = 9; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, 70 + k * 20 + Math.sin(x / 26 + k) * 12); g.stroke(); } g.fillStyle = '#f4ead4'; g.font = '900 38px "Arial Black", Arial'; g.fillText('ONDA', 20, 50); },
    (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#120a2a'); gr.addColorStop(0.55, '#7a1f6a'); gr.addColorStop(1, '#ff7a3d'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,90,200,0.8)'; g.lineWidth = 2; for (let k = 0; k < 10; k++) { g.beginPath(); g.moveTo(0, 160 + k * k * 1.2); g.lineTo(w, 160 + k * k * 1.2); g.stroke(); } for (let k = -8; k <= 8; k++) { g.beginPath(); g.moveTo(w / 2 + k * 8, 160); g.lineTo(w / 2 + k * 60, h); g.stroke(); } g.fillStyle = '#ffe6f6'; g.font = 'italic 900 40px Arial'; g.fillText('NEÓN', 64, 100); },
    (g, w, h) => { g.fillStyle = '#e8e0d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(128, 120, 70, 0, 6.2832); g.fill(); g.fillStyle = '#e8e0d0'; g.fillRect(58, 112, 140, 10); g.fillStyle = '#c8392b'; g.beginPath(); g.arc(180, 70, 14, 0, 6.2832); g.fill(); g.fillStyle = '#1a1a1a'; g.font = '700 22px Georgia'; g.fillText('Retrato', 24, 236); },
    (g, w, h) => { g.fillStyle = '#efe2c0'; g.fillRect(0, 0, w, h); ['#c8392b', '#1f4f7a', '#e0a21b', '#2f6b4e'].forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.moveTo(30 + k * 50, 220); g.lineTo(80 + k * 50, 60 + k * 20); g.lineTo(130 + k * 50, 220); g.fill(); }); g.fillStyle = '#222'; g.font = '900 24px Arial'; g.fillText('LOS SURCOS', 24, 40); },
    (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6b04a'); gr.addColorStop(0.6, '#e2542e'); gr.addColorStop(1, '#3a1430'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(150, 150, 46, 0, 6.2832); g.fill(); g.fillStyle = '#1e0c1a'; g.fillRect(70, 110, 6, 140); for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(73, 110, 42, 9, k * 0.45 - 1.2, 0, 6.2832); g.fill(); } g.fillRect(0, 230, w, 26); g.fillStyle = '#fff1d6'; g.font = '800 26px Georgia'; g.fillText('Trópico', 140, 40); },
    (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a2f55'); gr.addColorStop(0.5, '#e07a3a'); gr.addColorStop(0.62, '#f4c27a'); gr.addColorStop(0.63, '#3a3a5a'); gr.addColorStop(1, '#1c1c30'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(255,210,150,' + (0.5 - k * 0.03) + ')'; g.fillRect(110 - k * 3, 165 + k * 6, 36 + k * 6, 2); } g.fillStyle = '#f4ead4'; g.font = 'italic 700 24px Georgia'; g.fillText('Atardecer', 20, 40); },
    (g, w, h) => { g.fillStyle = '#0f0f10'; g.fillRect(0, 0, w, h); ['#d9662b', '#e0a12e', '#ece4d0', '#1f6f6a', '#b3261e'].forEach((c, k) => { g.strokeStyle = c; g.lineWidth = 9; g.beginPath(); g.arc(128, 136, 96 - k * 17, 0.4 + k * 0.5, 5.2 + k * 0.3); g.stroke(); }); g.fillStyle = '#ece4d0'; g.font = '900 24px "Arial Black", Arial'; g.fillText('ÓRBITA', 16, 36); },
    (g, w, h) => { g.fillStyle = '#e9dfc8'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 60, 0, 220); gr.addColorStop(0, '#1d3f6a'); gr.addColorStop(1, '#6fa0b8'); g.fillStyle = gr; g.fillRect(28, 64, 200, 150); g.fillStyle = '#e9dfc8'; for (let k = 0; k < 5; k++) g.fillRect(28, 96 + k * 26, 200, 4); g.fillStyle = '#c9541e'; g.fillRect(150, 64, 26, 150); g.fillStyle = '#1c1a17'; g.font = 'italic 700 26px Georgia, serif'; g.fillText('Bossa azul', 28, 46); g.font = '600 11px Arial'; g.fillText('TRÍO DEL PUERTO', 28, 238); },
    // magazines
    (g, w, h) => { g.fillStyle = '#efe7d6'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 70, 0, h); gr.addColorStop(0, '#d98a3a'); gr.addColorStop(1, '#5a2a3a'); g.fillStyle = gr; g.fillRect(0, 70, w, h - 70); g.fillStyle = '#1c1a17'; g.fillRect(40, 120, 176, 100); g.fillStyle = '#e0a12e'; g.fillRect(52, 132, 60, 76); g.fillStyle = '#b3261e'; g.font = '900 56px "Arial Black", Impact, sans-serif'; g.fillText('RITMO', 10, 56, w - 20); g.fillStyle = '#fff6e0'; g.font = '700 13px Arial'; g.fillText('LOS 50 DISCOS DEL AÑO', 12, 240, w - 24); },
    (g, w, h) => { g.fillStyle = '#e3b21c'; g.fillRect(0, 0, w, h); g.fillStyle = '#141414'; g.fillRect(0, 0, w, 62); g.fillStyle = '#e3b21c'; g.font = '900 30px "Arial Black", Arial'; g.fillText('ALTA FIDELIDAD', 8, 42, w - 16); g.fillStyle = '#141414'; g.fillRect(34, 86, 188, 104); g.fillStyle = '#3a3a3c'; g.fillRect(42, 94, 172, 40); g.fillStyle = '#7ad67a'; g.fillRect(150, 104, 54, 16); g.fillStyle = '#141414'; g.font = '700 14px Arial'; g.fillText('PRUEBA: 12 LECTORES DE CD', 12, 214, w - 24); g.font = '12px Arial'; g.fillText('Guía de parlantes · N.º 87', 12, 236, w - 24); },
    (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1b3a66'); gr.addColorStop(1, '#0d1a30'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#f1e9d6'; g.font = '900 44px "Arial Black", Arial'; g.fillText('PANTALLA', 10, 50, w - 20); g.fillStyle = '#d9662b'; g.fillRect(10, 62, w - 20, 5); g.fillStyle = '#e9dfc8'; g.fillRect(48, 92, 160, 112); g.fillStyle = '#1b3a66'; g.fillRect(58, 102, 140, 78); g.fillStyle = '#e0a12e'; g.font = '700 13px Arial'; g.fillText('ESTRENOS DE INVIERNO', 12, 236, w - 24); },
    (g, w, h) => { g.fillStyle = '#2f5a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8c8a0'; g.beginPath(); g.moveTo(0, 200); g.lineTo(90, 96); g.lineTo(150, 160); g.lineTo(200, 112); g.lineTo(w, 190); g.lineTo(w, h); g.lineTo(0, h); g.fill(); g.fillStyle = '#7a8a5a'; g.fillRect(0, 196, w, 60); g.fillStyle = '#f1e9d6'; g.font = 'italic 900 50px Georgia, serif'; g.fillText('Ruta 90', 12, 56, w - 24); g.font = '700 12px Arial'; g.fillText('SEIS CAMINOS DE MONTAÑA', 12, 246, w - 24); }
  ];
  const CV_C = 4, CV_R = 3;
  const coverTex = tex(makeCanvas(CV_C * 256, CV_R * 256, (g) => {
    const rnd = mulberry(47);
    albumArt.forEach((draw, k) => {
      g.save(); g.translate((k % CV_C) * 256, ((k / CV_C) | 0) * 256); g.beginPath(); g.rect(0, 0, 256, 256); g.clip();
      draw(g, 256, 256);
      g.fillStyle = 'rgba(255,245,225,0.08)'; for (let i = 0; i < 300; i++) g.fillRect(rnd() * 256, rnd() * 256, 1, 1);
      g.strokeStyle = 'rgba(255,250,240,0.22)'; g.lineWidth = 2; g.strokeRect(3, 3, 250, 250);
      g.restore();
    });
  }));
  await slice();
  const recordTex = tex(makeCanvas(512, 512, (g, w) => {
    g.fillStyle = '#0c0c0d'; g.fillRect(0, 0, w, w);
    for (let r = 248; r > 80; r -= 2) { g.strokeStyle = 'rgba(255,255,255,' + (r % 22 < 2 ? 0.0 : 0.035 + 0.02 * Math.sin(r)) + ')'; g.lineWidth = 1; g.beginPath(); g.arc(256, 256, r, 0, 6.2832); g.stroke(); }
    g.fillStyle = '#e2a23a'; g.beginPath(); g.arc(256, 256, 70, 0, 6.2832); g.fill();
    g.fillStyle = '#3a2410'; g.font = '700 16px Georgia'; g.textAlign = 'center'; g.fillText('ATARDECER', 256, 236); g.font = '12px Georgia'; g.fillText('LADO A · 33⅓', 256, 290);
    g.fillStyle = '#0c0c0d'; g.beginPath(); g.arc(256, 256, 5, 0, 6.2832); g.fill();
  }));
  // a compact disc: the play side up is rare, so this is the label side, silver with a ring of type
  await slice();
  const discTex = tex(makeCanvas(256, 256, (g, w) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
    const gr = g.createConicGradient(0.6, 128, 128);
    ['#d9d9de', '#f4f0e6', '#b9c6d8', '#e9d9c0', '#cfd4dc', '#f2ead8', '#b8bcc8', '#d9d9de'].forEach((c, k, a) => gr.addColorStop(k / (a.length - 1), c));
    g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, 6.2832); g.fill();
    g.fillStyle = '#c9541e'; g.beginPath(); g.arc(128, 128, 118, 0.2, 2.2); g.arc(128, 128, 60, 2.2, 0.2, true); g.fill();
    g.fillStyle = '#1c1a17'; g.font = '700 15px Arial'; g.textAlign = 'center'; g.fillText('ÓRBITA', 128, 62); g.font = '9px Arial'; g.fillText('DISCO COMPACTO · 1994', 128, 212);
    g.fillStyle = '#9a9aa2'; g.beginPath(); g.arc(128, 128, 38, 0, 6.2832); g.fill();
    g.fillStyle = '#e6e6ea'; g.beginPath(); g.arc(128, 128, 30, 0, 6.2832); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.arc(128, 128, 15, 0, 6.2832); g.fill();
  }));

  /* the hi-fi: black separates, white lettering, a lit display each (the second canvas is what glows) */
  const ampPaint = (emis) => (g, w, h) => {
    g.fillStyle = emis ? '#000' : '#17181a'; g.fillRect(0, 0, w, h);
    if (!emis) {
      for (let y = 0; y < h; y += 2) { g.fillStyle = 'rgba(255,255,255,' + (0.012 + 0.012 * Math.sin(y * 1.7)) + ')'; g.fillRect(0, y, w, 1); }   // brushed
      g.fillStyle = '#0c0c0d'; g.fillRect(18, 44, 30, 30); g.fillStyle = '#2a2b2e'; g.fillRect(21, 47, 24, 24);
      g.fillStyle = '#c9c6bd'; g.font = '600 9px Arial, sans-serif'; g.fillText('POWER', 17, 90);
      g.fillStyle = '#060606'; g.beginPath(); g.arc(78, 92, 8, 0, 6.2832); g.fill(); g.fillStyle = '#c9c6bd'; g.fillText('PHONES', 62, 114);
      ['BASS', 'TREBLE', 'BALANCE'].forEach((t, k) => {
        const cx = 140 + k * 52, cy = 80;
        g.fillStyle = '#0a0a0b'; g.beginPath(); g.arc(cx, cy, 15, 0, 6.2832); g.fill(); g.fillStyle = '#2d2e31'; g.beginPath(); g.arc(cx, cy, 12, 0, 6.2832); g.fill();
        g.strokeStyle = '#d8d5cc'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(k - 1) * 11, cy - Math.cos(k - 1) * 11); g.stroke();
        g.fillStyle = '#c9c6bd'; g.fillText(t, cx - g.measureText(t).width / 2, 112);
      });
      ['PHONO', 'CD', 'TUNER', 'TAPE', 'AUX'].forEach((t, k) => {
        const x = 130 + k * 40; g.fillStyle = '#0a0a0b'; g.fillRect(x, 24, 32, 12); g.fillStyle = '#2a2b2e'; g.fillRect(x + 1, 25, 30, 10);
        g.fillStyle = '#c9c6bd'; g.fillText(t, x + 16 - g.measureText(t).width / 2, 48);
      });
      g.fillStyle = '#d8d5cc'; g.font = '700 12px Arial, sans-serif'; g.fillText('AMPLIFICADOR ESTÉREO  A-70', 18, 26);
      g.font = '600 9px Arial, sans-serif'; g.fillText('VOLUME', 424, 122);
      g.strokeStyle = '#8a877e'; g.lineWidth = 1.5;
      for (let k = 0; k <= 10; k++) { const a = -2.3 + k * 0.46; g.beginPath(); g.moveTo(444 + Math.sin(a) * 44, 66 - Math.cos(a) * 44); g.lineTo(444 + Math.sin(a) * 49, 66 - Math.cos(a) * 49); g.stroke(); }
    }
    g.fillStyle = emis ? '#ff3a1a' : '#5a1a10'; g.beginPath(); g.arc(33, 32, 3.2, 0, 6.2832); g.fill();
    g.fillStyle = emis ? '#4dff7a' : '#1c5a2c'; g.fillRect(130 + 40 + 12, 19, 8, 3);
  };
  const cdpPaint = (emis) => (g, w, h) => {
    g.fillStyle = emis ? '#000' : '#17181a'; g.fillRect(0, 0, w, h);
    if (!emis) {
      for (let y = 0; y < h; y += 2) { g.fillStyle = 'rgba(255,255,255,' + (0.012 + 0.012 * Math.sin(y * 1.7)) + ')'; g.fillRect(0, y, w, 1); }
      g.fillStyle = '#0c0c0d'; g.fillRect(18, 38, 30, 26); g.fillStyle = '#2a2b2e'; g.fillRect(21, 41, 24, 20);
      g.fillStyle = '#060607'; g.fillRect(70, 26, 190, 24); g.fillStyle = '#232427'; g.fillRect(70, 26, 190, 3); g.fillStyle = '#0e0e0f'; g.fillRect(72, 46, 186, 3);   // the tray
      g.fillStyle = '#d8d5cc'; g.font = '700 11px Arial, sans-serif'; g.fillText('LECTOR DE DISCO COMPACTO', 70, 18);
      g.font = '600 8px Arial, sans-serif'; g.fillStyle = '#c9c6bd'; g.fillText('1 BIT · 8× OVERSAMPLING', 70, 64);
      g.fillStyle = '#050505'; g.fillRect(286, 20, 126, 40);
      for (let k = 0; k < 6; k++) { const x = 286 + k * 21; g.fillStyle = '#0a0a0b'; g.fillRect(x, 70, 18, 10); g.fillStyle = '#2d2e31'; g.fillRect(x + 1, 71, 16, 8); }
      for (let k = 0; k < 3; k++) { const x = 430 + k * 26; g.fillStyle = '#0a0a0b'; g.fillRect(x, 26, 22, 14); g.fillStyle = '#34353a'; g.fillRect(x + 1, 27, 20, 12); }
      g.fillStyle = '#c9c6bd'; g.fillText('▶  ❙❙  ■', 438, 52); g.fillText('OPEN/CLOSE', 72, 82);
    }
    g.fillStyle = emis ? '#ffb040' : '#4a3210'; g.font = '700 22px "Courier New", monospace'; g.fillText('3', 294, 47); g.fillText('12:47', 334, 47);
    g.font = '600 7px Arial, sans-serif'; g.fillText('TRACK', 292, 29); g.fillText('MIN   SEC', 336, 29);
    if (emis) { g.fillStyle = '#ffb040'; for (let k = 0; k < 9; k++) g.fillRect(294 + k * 12, 53, 8, 3); }
    g.fillStyle = emis ? '#ff3a1a' : '#5a1a10'; g.beginPath(); g.arc(33, 30, 3, 0, 6.2832); g.fill();
  };
  const hifiMat = (w, h, paint) => {
    const m = M({ map: tex(makeCanvas(w, h, paint(false))), roughness: 0.45, metalness: 0.3,
      emissive: new T.Color(1, 1, 1), emissiveMap: tex(makeCanvas(w, h, paint(true))), emissiveIntensity: 2.2 });
    return m;
  };
  const ampMat = hifiMat(512, 132, ampPaint), cdpMat = hifiMat(512, 96, cdpPaint);
  // the portable CD player's lid, and the cordless phone's face
  await slice();
  const discmanTex = tex(makeCanvas(256, 256, (g, w) => {
    g.fillStyle = '#4a4c52'; g.fillRect(0, 0, w, w);
    const gr = g.createRadialGradient(128, 118, 20, 128, 118, 130); gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#111214'; g.lineWidth = 3; g.beginPath(); g.arc(128, 116, 104, 0, 6.2832); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.beginPath(); g.arc(128, 116, 100, 0, 6.2832); g.stroke();
    g.fillStyle = '#0d0e10'; g.beginPath(); g.ellipse(128, 70, 50, 20, 0, 0, 6.2832); g.fill();             // the window in the lid
    g.fillStyle = 'rgba(190,200,215,0.35)'; g.beginPath(); g.ellipse(128, 70, 46, 17, 0, 3.5, 5.6); g.fill();
    g.fillStyle = '#c9c6bd'; g.font = '700 12px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('DISCO COMPACTO PORTÁTIL', 128, 150, 180);
    g.font = '600 9px Arial, sans-serif'; g.fillText('ANTICHOQUE 10 s  ·  MEGA GRAVES', 128, 168, 180);
    g.fillStyle = '#0a0a0b'; g.fillRect(60, 222, 136, 22); g.fillStyle = '#5b6b52'; g.fillRect(64, 225, 60, 16);
    g.fillStyle = '#1a2216'; g.font = '700 12px "Courier New", monospace'; g.textAlign = 'left'; g.fillText('07 2:31', 68, 237);
    for (let k = 0; k < 3; k++) { g.fillStyle = '#3a3b40'; g.fillRect(134 + k * 20, 226, 16, 14); }
  }));
  await slice();
  const phoneTex = tex(makeCanvas(96, 320, (g, w, h) => {
    g.fillStyle = '#2b2a28'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0c0c0c'; for (let k = 0; k < 4; k++) g.fillRect(30, 20 + k * 7, 36, 3);
    g.fillStyle = '#56644a'; g.fillRect(18, 60, 60, 26); g.fillStyle = '#1a2216'; g.font = '700 11px "Courier New", monospace'; g.fillText('CANAL 3', 22, 78);
    g.fillStyle = '#b3261e'; g.fillRect(18, 98, 26, 14); g.fillStyle = '#3a7a4a'; g.fillRect(52, 98, 26, 14);
    const K = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    g.font = '700 13px Arial, sans-serif'; g.textAlign = 'center';
    K.forEach((t, k) => { const x = 16 + (k % 3) * 24, y = 126 + ((k / 3) | 0) * 30; g.fillStyle = '#d8d2c4'; g.beginPath(); g.roundRect(x, y, 18, 20, 5); g.fill(); g.fillStyle = '#1c1a17'; g.fillText(t, x + 9, y + 15); });
    g.fillStyle = '#0c0c0c'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(36 + k * 12, 268, 2, 0, 6.2832); g.fill(); }
    g.fillStyle = '#8a877e'; g.font = '600 8px Arial, sans-serif'; g.fillText('INALÁMBRICO', 48, 296);
  }));
  // a rubber plant's leaf: dark, thick, a pale midrib
  await slice();
  const ficusTex = tex(makeCanvas(128, 256, (g, w, h) => {
    const path = () => { g.beginPath(); g.moveTo(64, 252); g.bezierCurveTo(8, 214, 2, 96, 40, 34); g.quadraticCurveTo(56, 10, 64, 2); g.quadraticCurveTo(72, 10, 88, 34); g.bezierCurveTo(126, 96, 120, 214, 64, 252); g.closePath(); };
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#1f4a22'); gr.addColorStop(0.5, '#2c6a30'); gr.addColorStop(1, '#1b4220');
    path(); g.fillStyle = gr; g.fill();
    g.save(); path(); g.clip();
    g.strokeStyle = 'rgba(150,190,120,0.22)'; g.lineWidth = 1.2;
    for (let k = 0; k < 16; k++) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(64, 240 - k * 14); g.quadraticCurveTo(64 + s * 30, 230 - k * 14, 64 + s * 62, 206 - k * 14); g.stroke(); }
    g.strokeStyle = 'rgba(190,215,150,0.75)'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(64, 252); g.lineTo(64, 6); g.stroke();
    g.restore();
  }));
  // what glows: a lamp's glass is one strip, from where its profile starts to where it ends
  const glassTex = (stops) => tex(makeCanvas(4, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0); stops.forEach(([p, c]) => gr.addColorStop(p, c));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }), { nomip: true });

  /* ───────────────────────── materials ───────────────────────── */
  await slice();
  const wallMat = M({ color: 0x5a4d40, roughness: 0.94 });      // dark plaster, olive-brown
  const furnMat = M({ color: 0x6b4630, roughness: 0.5 });       // walnut: the shelving, the sideboard, the tables
  const roseMat = M({ color: 0x4a2414, roughness: 0.38 });      // rosewood plywood: the shells of the chair and the ottoman
  wallMat.userData.envK = 0.2; furnMat.userData.envK = 0.55; roseMat.userData.envK = 0.8;
  const ceilMat = M({ color: 0x6a5e4c, roughness: 0.95 });
  const floorMat = M({ color: 0x6a4426, roughness: 0.6 });
  floorMat.userData.envK = 0.6;
  const paintMat = M({ color: 0x2a2019, roughness: 0.45 });     // the window's joinery, dark like the wood
  const brassMat = M({ color: 0xb08a4a, metalness: 1, roughness: 0.34 });
  const leatherMat = M({ color: 0x9a5a2c, roughness: 0.5 });    // cognac leather
  leatherMat.userData.envK = 0.9;
  const clayMat = M({ color: 0xb4623a, roughness: 0.85 });
  const rugMat = M({ color: 0xa48a62, roughness: 1 });          // jute
  const bookMat = M({ map: bookTex, roughness: 0.72 });
  const coverMat = M({ map: coverTex, roughness: 0.5 });
  const printMat = M({ map: printTex, roughness: 0.6 });
  // small things share three vertex-coloured materials, so a whole shelf of clutter is one draw call
  const matteMat = M({ vertexColors: true, roughness: 0.86, side: T.DoubleSide });
  const glossMat = M({ vertexColors: true, roughness: 0.3 });
  const metalMat = M({ vertexColors: true, roughness: 0.22, metalness: 1 });
  glossMat.userData.envK = 0.9; matteMat.userData.envK = 0.3; metalMat.userData.envK = 1.5;
  const envMats = [brassMat, wallMat, furnMat, roseMat, floorMat, glossMat, metalMat, matteMat, paintMat, leatherMat, coverMat, ampMat, cdpMat];

  /* photo textures (CC0, Poly Haven), swapped in as they arrive; the flat colours stand in until then */
  const loader = new T.TextureLoader();
  let envStale = false;
  function photo(name, srgb, rep, apply) {
    pendingPhotos++;
    loader.load(texBase + name + '.jpg', (t) => {
      t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = Math.min(8, maxAniso);
      if (srgb) t.colorSpace = T.SRGBColorSpace;
      t.repeat.set(rep[0], rep[1]);
      try { renderer.initTexture(t); } catch { /* sent up when first drawn instead */ }   // decoded and sent up now, in its own turn, not with the others in some later frame
      apply(t); envStale = true; pendingPhotos--;
    }, undefined, () => { pendingPhotos--; });          // a photograph that does not come leaves its flat colour; the room still opens
  }
  // Until its photograph comes, a slot holds a single texel that changes nothing (white, a flat normal, full
  // roughness): the material is made with every slot it will have, so a photograph arriving only swaps a texture and
  // never makes the GPU build a new program, which on a phone holds the page up for a moment each time.
  const texel = (rgba, srgb) => { const t = new T.DataTexture(new Uint8Array(rgba), 1, 1); if (srgb) t.colorSpace = T.SRGBColorSpace; t.needsUpdate = true; return t; };
  const STAND_IN = { map: texel([255, 255, 255, 255], true), normalMap: texel([128, 128, 255, 255]), roughnessMap: texel([255, 255, 255, 255]) };
  const set = (mats, key, extra) => {
    mats.forEach((m) => { if (!m[key] && STAND_IN[key]) { m[key] = STAND_IN[key]; m.needsUpdate = true; } });
    return (t) => mats.forEach((m) => { m[key] = t; if (extra) extra(m); m.needsUpdate = true; });
  };
  if (!TOON) {
  // walls: painted plaster, a dark warm olive, a little worn
  photo('plaster_diff', true, [1.6 / 1.8, 3.6 / 1.8], set([wallMat], 'map', (m) => { m.color.set(0x8f7d66); }));
  photo('plaster_nor', false, [1.6 / 1.8, 3.6 / 1.8], set([wallMat], 'normalMap', (m) => { m.normalScale.set(0.8, 0.8); }));
  photo('plaster_rough', false, [1.6 / 1.8, 3.6 / 1.8], set([wallMat], 'roughnessMap', (m) => { m.roughness = 1; }));
  // walnut veneer, its grain running up the uprights (the shelves are cut across it)
  photo('walnut_diff', true, [0.8 / 0.6, 0.8 / 0.6], set([furnMat], 'map', (m) => { m.color.setRGB(1.0, 0.72, 0.5); }));
  photo('walnut_nor', false, [0.8 / 0.6, 0.8 / 0.6], set([furnMat], 'normalMap', (m) => { m.normalScale.set(0.6, 0.6); }));
  photo('walnut_rough', false, [0.8 / 0.6, 0.8 / 0.6], set([furnMat], 'roughnessMap', (m) => { m.roughness = 0.7; }));
  photo('wood_diff', true, [0.8 / 0.5, 0.8 / 0.5], set([roseMat], 'map', (m) => { m.color.set(0xc8a890); }));
  photo('wood_nor', false, [0.8 / 0.5, 0.8 / 0.5], set([roseMat], 'normalMap', (m) => { m.normalScale.set(0.5, 0.5); }));
  photo('wood_rough', false, [0.8 / 0.5, 0.8 / 0.5], set([roseMat], 'roughnessMap', (m) => { m.roughness = 0.6; }));
  // floor: old varnished boards, gone dark
  photo('floor_diff', true, [0.9 / 2.2, 0.9 / 2.2], set([floorMat], 'map', (m) => { m.color.set(0xb09a86); }));
  photo('floor_nor', false, [0.9 / 2.2, 0.9 / 2.2], set([floorMat], 'normalMap'));
  photo('floor_rough', false, [0.9 / 2.2, 0.9 / 2.2], set([floorMat], 'roughnessMap', (m) => { m.roughness = 0.85; }));
  // leather: creased, a little shiny where it is worn. Its sheet has a stitched seam; the cushions map the plain part
  photo('leather_diff', true, [1, 1], set([leatherMat], 'map', (m) => { m.color.setRGB(1.9, 1.25, 0.74); }));
  photo('leather_nor', false, [1, 1], set([leatherMat], 'normalMap', (m) => { m.normalScale.set(1.5, 1.5); }));
  photo('leather_rough', false, [1, 1], set([leatherMat], 'roughnessMap', (m) => { m.roughness = 0.72; }));
  photo('jute_diff', true, [1, 1], set([rugMat], 'map', (m) => { m.color.setRGB(1.0, 0.9, 0.74); }));
  photo('jute_nor', false, [1, 1], set([rugMat], 'normalMap', (m) => { m.normalScale.set(1.8, 1.8); }));
  photo('cotton_nor', false, [2, 2], set([printMat], 'normalMap', (m) => { m.normalScale.set(0.15, 0.15); }));
  } else {
    // painted: lighter and cleaner than the photographed surfaces, as colours mixed for a cel are
    wallMat.color.set(0x9c9076); ceilMat.color.set(0xa39a80); furnMat.color.set(0x8e5c36); roseMat.color.set(0x5e2e1a); floorMat.color.set(0x7c5030);
    paintMat.color.set(0x3c2b20); leatherMat.color.set(0xba672e); rugMat.color.set(0xb99b6a); clayMat.color.set(0xc66b3c); brassMat.color.set(0xcaa252);
  }
  // real printed matter (public domain and open access, each credited in tex/CREDITS.md): the covers sheet, same cells, and the framed print.
  // The drawn ones above stand in until these arrive
  const printed = (m) => (t) => { t.wrapS = t.wrapT = T.ClampToEdgeWrapping; m.map = t; m.needsUpdate = true; };
  photo('covers', true, [1, 1], printed(coverMat));
  photo('print', true, [1, 1], printed(printMat));

  /* ───────────────────────── geometry helpers ───────────────────────── */
  await slice();
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
      m.castShadow = !(TOON && mat === blindMat);         // painted, the blinds let the sun through whole: a hundred thin stripes of shadow are noise on a cel, one clean shape of light is not
      m.receiveShadow = true; scene.add(m);
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
    // a light switch on the right wall past the shelving, an outlet low on the left wall
    addBox(R.xMax - 0.006, R.xMax, 1.14, 1.255, 1.55, 1.622, paintMat, 0.2, 0.2);
    addBox(R.xMax - 0.016, R.xMax - 0.006, 1.185, 1.21, 1.58, 1.592, paintMat, 0.2, 0.2);
    addBox(R.xMin, R.xMin + 0.006, 0.26, 0.375, -0.2, -0.128, paintMat, 0.2, 0.2);
    for (const y of [0.29, 0.335]) for (const dz of [-0.008, 0.008]) matte(rbox(0.002, 0.012, 0.004, 0, R.xMin + 0.0065, y + 0.006, -0.164 + dz), 0x1a1612);
  })();
  await slice();
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
  await slice();
  const blindMat = M({ color: 0xeadfc6, roughness: 0.42, metalness: 0.15, side: T.DoubleSide, shadowSide: T.DoubleSide,
    emissive: new T.Color(1.0, 0.72, 0.4), emissiveIntensity: 0.08 });
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

  /* ───────────────────────── leather: the ottoman the puzzles rest on, and the lounge chair ───────────────────────── */
  await slice();
  const dummy = new T.Object3D();
  const rod = (a, b, r0, r1, seg) => {                  // a bar from a to b
    const d = V3().subVectors(b, a), g = cyl(r1 === undefined ? r0 : r1, r0, d.length(), seg || 10);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.clone().normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return g;
  };
  // A cushion is a pillow on a rounded rectangle: steep sides, a crowned top, pulled down at its buttons with creases
  // running out of them. bend lifts its ends to follow the curved shell it sits in. (u, v) run -1..1 across it.
  function cushionField(w, d, H, btns, seed, bend) {
    const rnd = mulberry(seed), ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
    return (u, v) => {
      const x = u * Math.sqrt(1 - 0.2 * v * v) * w / 2, z = v * Math.sqrt(1 - 0.2 * u * u) * d / 2;
      const e = Math.min(1, Math.pow(Math.pow(Math.abs(u), 10) + Math.pow(Math.abs(v), 10), 0.1));
      const body = Math.pow(1 - Math.pow(e, 5), 0.45), top = smooth(body, 0.7, 0.98);
      let y = H * body + H * 0.16 * top * (1 - 0.5 * (u * u + v * v));
      y += top * (0.003 * Math.sin(x * 23 + z * 9 + ph[0]) + 0.002 * Math.sin(z * 31 - x * 12 + ph[1]));
      y += 0.0025 * (1 - top) * body * Math.sin((u + v) * 26 + ph[3]) * Math.sin((u - v) * 21);       // the sides pucker where the welt gathers them
      for (const b of btns) {
        const dx = x - b[0], dz = z - b[1], r = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
        y -= top * b[2] * (Math.exp(-r * r / 0.0011) + 0.42 * Math.exp(-r * r / 0.011));
        const ring = (r / 0.055) * Math.exp(1 - r / 0.055);
        y += top * 0.0042 * ring * Math.cos(a * 7 + ph[2] + 2.2 * Math.sin(a * 2 + b[0] * 9));
      }
      return [x, y + (bend || 0) * x * x, z];
    };
  }
  const LEATHER_UV = [0.3, 0.02, 0.66, 0.96];          // the plain part of the hide, clear of its seam
  function gridArrays(f, NU, NV, flipUV) {
    const n = (NU + 1) * (NV + 1), pos = new Float32Array(n * 3), uvs = new Float32Array(n * 2), idx = [];
    for (let i = 0; i <= NV; i++) for (let j = 0; j <= NU; j++) {
      const u = -1 + 2 * j / NU, v = -1 + 2 * i / NV, p = f(u, v), k = i * (NU + 1) + j;
      pos[k * 3] = p[0]; pos[k * 3 + 1] = p[1]; pos[k * 3 + 2] = p[2];
      const a = flipUV ? v : u, b = flipUV ? u : v;
      uvs[k * 2] = LEATHER_UV[0] + (a * 0.5 + 0.5) * LEATHER_UV[2]; uvs[k * 2 + 1] = LEATHER_UV[1] + (b * 0.5 + 0.5) * LEATHER_UV[3];
      if (i < NV && j < NU) { const B = k + NU + 1; idx.push(k, B, k + 1, k + 1, B, B + 1); }
    }
    return { pos, uvs, idx };
  }
  function gridGeo(a) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(a.pos, 3)); g.setAttribute('uv', new T.BufferAttribute(a.uvs, 2)); g.setIndex(a.idx);
    g.computeVertexNormals();
    return g;
  }
  function welt(f, e, r) {                              // the piped seam that runs round a cushion's side
    const pts = [];
    for (let k = 0; k < 160; k++) {
      const a = k / 160 * 6.2832, c = Math.cos(a), s = Math.sin(a);
      const p = f(e * Math.sign(c) * Math.pow(Math.abs(c), 0.2), e * Math.sign(s) * Math.pow(Math.abs(s), 0.2));
      pts.push(V3(p[0], p[1], p[2]));
    }
    const g = new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 220, r, 6, true), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, LEATHER_UV[0] + 0.05 + uv.getY(i) * 0.04, 0.1 + uv.getX(i) * 0.8);
    return g;
  }
  function button(f, b) {                               // a leather-covered button, down in its hollow
    const u = b[3], v = b[4], p = f(u, v), g = new T.SphereGeometry(0.0115, 14, 8, 0, 6.2832, 0, Math.PI / 2), uv = g.attributes.uv;
    g.scale(1, 0.42, 1);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + uv.getX(i) * 0.05, 0.5 + uv.getY(i) * 0.05);
    return mv(g, p[0], p[1] - 0.0005, p[2]);
  }
  // buttons are given in metres from the cushion's centre; this adds where they are in (u, v), near enough
  const btnsOf = (w, d, list) => list.map((b) => [b[0], b[1], b[2], b[0] / (w / 2), b[1] / (d / 2)]);
  function cushion(w, d, H, list, seed, bend, NU, NV) {
    const btns = btnsOf(w, d, list), f = cushionField(w, d, H, btns, seed, bend);
    put(leatherMat, gridGeo(gridArrays(f, NU || 44, NV || 36)));
    put(leatherMat, welt(f, 0.955, 0.0034));
    btns.forEach((b) => put(leatherMat, button(f, b)));
  }
  function plyPanel(w, len, th, bend, r) {              // a moulded plywood shell: a rounded board, curved up across its width
    const g = new T.BoxGeometry(w, th, len, 30, 1, 26), p = g.attributes.position, hx = w / 2 - r, hz = len / 2 - r;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), z = p.getZ(i);
      const cx = clamp(x, -hx, hx), cz = clamp(z, -hz, hz), dx = x - cx, dz = z - cz, dl = Math.hypot(dx, dz);
      if (dl > r) { x = cx + dx / dl * r; z = cz + dz / dl * r; }
      p.setXYZ(i, x, p.getY(i) + bend * x * x, z);
    }
    g.computeVertexNormals();
    return g;
  }
  const ALU = 0xb4b6ba, BLACK = 0x141210;
  function starBase(n, R, hubY, topY, rot) {            // a swivel base: a hub, tapered legs down to their glides, a column
    for (let k = 0; k < n; k++) {
      const a = rot + k * 2 * Math.PI / n, len = R - 0.012, g = new T.BoxGeometry(len, 0.02, 0.04, 8, 2, 2), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const t = clamp(p.getX(i) / len + 0.5, 0, 1), yy = p.getY(i), zz = p.getZ(i) * (1 - 0.5 * t);
        p.setXYZ(i, 0.012 + len * t, yy * (1 - 0.35 * t) * (1 - 0.5 * Math.pow(Math.abs(zz) / 0.02, 2)) + hubY - (hubY - 0.034) * Math.pow(t, 1.25), zz);
      }
      g.computeVertexNormals();
      metal(mv(g, 0, 0, 0, a), ALU);
      matte(mv(cyl(0.012, 0.015, 0.022, 12), Math.cos(a) * (R - 0.012), 0.011, -Math.sin(a) * (R - 0.012)), BLACK);
    }
    metal(mv(lathe([[0, -0.03], [0.03, -0.03], [0.036, -0.02], [0.036, 0.012], [0.026, 0.024], [0.022, 0.03]], 20), 0, hubY, 0), ALU);
    metal(mv(cyl(0.02, 0.02, topY - hubY - 0.02, 16), 0, (topY + hubY + 0.02) / 2, 0), ALU);
    gloss(mv(cyl(0.028, 0.028, 0.03, 16), 0, topY - 0.022, 0), BLACK);
    gloss(rbox(0.2, 0.008, 0.2, 0.003, 0, topY - 0.004, 0, Math.PI / 4), BLACK);
  }
  await slice();
  const RUG = { x: 0.06, z: -0.16, w: 2.2, d: 1.62, h: 0.012 };
  const OTT = { x: 0.0, z: -0.12, ry: 0.07, w: 0.68, d: 0.56, shell: 0.30, bend: 0.3 };
  let cushionMesh = null;                                // the ottoman's cushion: the one mesh whose morph targets are the puzzles' dents
  (function buildOttoman() {
    at(OTT.x, RUG.h, OTT.z, OTT.ry, () => {
      starBase(4, 0.29, 0.1, OTT.shell - 0.014, Math.PI / 4);
      put(roseMat, mv(plyPanel(OTT.w + 0.016, OTT.d + 0.016, 0.014, OTT.bend, 0.11), 0, OTT.shell - 0.007, 0));
    });
    // the cushion, built where it stands so that things can be pressed into it
    const btns = btnsOf(OTT.w, OTT.d, [[0, -0.005, 0.02]]);
    const f = cushionField(OTT.w, OTT.d, 0.105, btns, 5, OTT.bend), NU = 132, NV = 110;
    const a = gridArrays(f, NU, NV), pos = a.pos, M = M4(OTT.x, RUG.h + OTT.shell, OTT.z, OTT.ry), v = V3();
    for (let k = 0; k < pos.length; k += 3) { v.set(pos[k], pos[k + 1], pos[k + 2]).applyMatrix4(M); pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z; }
    const dg = gridGeo(a), up = dg.attributes.normal.array.filter((q, k) => k % 3 === 1);
    const prev = xf; xf = M;
    put(leatherMat, welt(f, 0.955, 0.0036)); put(leatherMat, button(f, btns[0]));
    xf = prev;
    // things on the cushion press it down: find the lowest point under each footprint, settle it there, slope back out
    const sdf = (sp, x, z) => {
      const c = Math.cos(sp.rot), sn = Math.sin(sp.rot), lx = (x - sp.x) * c - (z - sp.z) * sn, lz = (x - sp.x) * sn + (z - sp.z) * c;
      const qx = Math.abs(lx) - sp.w, qz = Math.abs(lz) - sp.h;
      return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
    };
    const press = (sp, arr) => {
      let lo = Infinity;
      for (let k = 0; k < up.length; k++) if (up[k] > 0.8 && sdf(sp, arr[k * 3], arr[k * 3 + 2]) < 0) lo = Math.min(lo, arr[k * 3 + 1]);
      sp.y = lo - sp.sink;
      for (let k = 0; k < up.length; k++) {
        if (up[k] < 0.5) continue;
        const dd = sdf(sp, arr[k * 3], arr[k * 3 + 2]);
        // under the footprint the leather lies flat; around it, it climbs back in a short curve, a little proud at the lip where the foam is squeezed out
        if (dd < 0.085) arr[k * 3 + 1] = Math.min(arr[k * 3 + 1], sp.y + (dd > 0 ? (sp.sink + 0.012) * smooth(dd, 0, 0.085) + dd * 0.1 : 0));
      }
    };
    const normalsOf = (arr) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(arr, 3)); g.setIndex(a.idx); g.computeVertexNormals(); return g.attributes.normal.array; };
    // each puzzle presses its own hollow, kept as a morph target so the leather can rise again when the puzzle is picked up
    const baseN = dg.attributes.normal.array, mPos = [], mNor = [];
    SPOTS.forEach((sp, m) => {
      const arr = pos.slice(), foot = { x: sp.x, z: sp.z, w: sp.s * 0.97, h: sp.s * 0.97, rot: sp.yaw, sink: 0.021 };
      press(foot, arr);
      sp.y = foot.y; sp.morph = m;
      const nrm = normalsOf(arr);
      for (let k = 0; k < arr.length; k++) { arr[k] -= pos[k]; nrm[k] -= baseN[k]; }
      mPos.push(new T.BufferAttribute(arr, 3)); mNor.push(new T.BufferAttribute(nrm, 3));
    });
    dg.morphAttributes.position = mPos; dg.morphAttributes.normal = mNor; dg.morphTargetsRelative = true;
    const cush = new T.Mesh(dg, leatherMat);
    cush.castShadow = true; cush.receiveShadow = true; scene.add(cush);
    cush.morphTargetInfluences.fill(1);
    cushionMesh = cush;
  })();

  // the lounge chair: three moulded shells (seat, back, headrest) each with its cushion, padded arms, a five-star swivel base
  await slice();
  const CHAIR = { x: 0.8, z: -0.46, ry: -1.12 };
  (function buildChair() {
    at(CHAIR.x, RUG.h, CHAIR.z, CHAIR.ry, () => {
      starBase(5, 0.34, 0.095, 0.262, 0.3);
      const rec = 1.12, upY = Math.sin(rec), upZ = -Math.cos(rec);          // the back leans; (upY, upZ) runs up along it
      at(0, 0.292, 0.03, 0, () => {                                        // seat
        put(roseMat, plyPanel(0.6, 0.54, 0.014, 0.42, 0.1));
        at(0, 0.007, 0.005, 0, () => cushion(0.56, 0.52, 0.1, [[-0.13, 0.02, 0.018], [0.13, 0.02, 0.018]], 11, 0.42));
      }, -0.2);
      const B0 = [0.335, -0.3], B1 = [B0[0] + 0.165 * upY, B0[1] + 0.165 * upZ], B2 = [B1[0] + 0.3 * upY, B1[1] + 0.3 * upZ];
      at(0, B1[0], B1[1], 0, () => {                                       // lower back
        put(roseMat, plyPanel(0.6, 0.33, 0.014, 0.5, 0.09));
        at(0, 0.007, 0, 0, () => cushion(0.56, 0.31, 0.085, [[-0.13, 0, 0.016], [0.13, 0, 0.016]], 12, 0.5, 44, 26));
        for (const sx of [-1, 1]) gloss(rbox(0.036, 0.012, 0.5, 0.004, sx * 0.13, -0.018 + 0.5 * 0.13 * 0.13, -0.15), BLACK);      // the two steel spines that tie back to headrest
      }, rec);
      at(0, B2[0], B2[1], 0, () => {                                       // headrest
        put(roseMat, plyPanel(0.6, 0.22, 0.014, 0.5, 0.08));
        at(0, 0.007, 0, 0, () => cushion(0.56, 0.2, 0.08, [[-0.13, 0, 0.014], [0.13, 0, 0.014]], 13, 0.5, 44, 20));
      }, rec);
      for (const sx of [-1, 1]) {                                          // arms: a curved board, a pad, a bracket down to the seat
        at(sx * 0.352, 0.505, -0.07, 0, () => {
          put(roseMat, mv(plyPanel(0.105, 0.46, 0.012, 0, 0.04), 0, -0.006, 0));
          cushion(0.1, 0.44, 0.04, [], 14 + sx, 0, 14, 40);
        }, -0.1, sx * -0.1);
        gloss(rbox(0.012, 0.19, 0.06, 0.004, sx * 0.318, 0.41, -0.1, 0, 0, sx * 0.28), BLACK);
        gloss(rbox(0.012, 0.06, 0.2, 0.004, sx * 0.318, 0.47, -0.25, 0, -0.9), BLACK);
      }
    });
  })();

  /* ───────────────────────── the library: walnut shelving, books, records, compact discs ───────────────────────── */
  function book(th, hh, dd, c, lying) {                 // its spine looks along +z; pages show on the other edges
    const g = lying ? new T.BoxGeometry(hh, th, dd) : new T.BoxGeometry(th, hh, dd), uv = g.attributes.uv;
    const u0 = c / BK_N, u1 = (c + 1) / BK_N, vb = 1 - BK_CH / BK_H, page = BK_PAD * 0.5 / BK_H;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      if (i >= 16 && i < 20) { if (lying) uv.setXY(i, lerp(u0, u1, 1 - v), lerp(vb, 1, u)); else uv.setXY(i, lerp(u0, u1, u), lerp(vb, 1, v)); }
      else if (lying ? (i >= 8 && i < 16) : i < 8) uv.setXY(i, lerp(u0, u1, 0.5), lerp(vb, 1, 0.155));
      else uv.setXY(i, 0.5, page);
    }
    return g;
  }
  function standBooks(rnd, xa, xb, y, zf, hmax, tall) {  // a run of books standing; runs of one height and one cloth are a series
    let x = xa;
    for (;;) {
      const n = 1 + ((rnd() * rnd() * 7) | 0), c0 = (rnd() * BK_N) | 0, series = rnd() < 0.35;
      const hh = Math.min(hmax, (tall ? 0.23 : 0.175) + rnd() * (tall ? 0.075 : 0.1)), th = 0.014 + rnd() * rnd() * 0.036, dd = 0.12 + rnd() * 0.07 + (tall ? 0.03 : 0), push = rnd() * 0.022;
      for (let k = 0; k < n; k++) {
        const t2 = series ? th : clamp(th * (0.7 + rnd() * 0.7), 0.012, 0.055), h2 = series ? hh : Math.min(hmax, hh * (0.93 + rnd() * 0.12));
        if (x + t2 > xb) return x;
        put(bookMat, mv(book(t2, h2, dd, series ? c0 : (c0 + k * 7) % BK_N), x + t2 / 2, y + h2 / 2, zf - 0.012 - push - dd / 2 - (series ? 0 : rnd() * 0.006)));
        x += t2 + 0.0007;
      }
    }
  }
  function leanBook(rnd, x, y, zf, hmax) {              // one more, fallen against the row to its left
    const th = 0.02 + rnd() * 0.02, hh = Math.min(hmax, 0.2 + rnd() * 0.06), dd = 0.15, a = 0.14 + rnd() * 0.12, g = book(th, hh, dd, (rnd() * BK_N) | 0);
    g.translate(th / 2, hh / 2, 0); g.rotateZ(a); g.translate(x + hh * Math.sin(a) + 0.0015, y, zf - 0.02 - dd / 2);
    put(bookMat, g);
    return x + hh * Math.sin(a) + th * Math.cos(a) + 0.004;
  }
  function flatStack(rnd, cx, y, zf, n, big) {           // books lying on each other, spines out; returns the height of the pile
    let yy = y;
    for (let k = 0; k < n; k++) {
      const th = 0.016 + rnd() * 0.03, len = (big ? 0.26 : 0.2) + rnd() * 0.05 - k * 0.006, dd = (big ? 0.2 : 0.14) + rnd() * 0.04;
      put(bookMat, mv(book(th, len, dd, (rnd() * BK_N) | 0, true), cx + (rnd() - 0.5) * 0.014, yy + th / 2, zf - 0.016 - dd / 2 - rnd() * 0.012, (rnd() - 0.5) * 0.16));
      yy += th;
    }
    return yy;
  }
  await slice();
  const CD_COL = [0xe9e4d8, 0xe9e4d8, 0xf1ecde, 0x141414, 0x141414, 0xd9662b, 0x1f6f6a, 0xb3261e, 0x22406a, 0xd9a62a, 0xe9e4d8, 0x2b2b2b, 0x7a3a5a, 0xdcd6c6, 0x141414, 0xe9e4d8];
  const CD = { t: 0.0104, h: 0.125, d: 0.142 };          // a jewel case
  function cdRow(rnd, xa, xb, y, zf) {                  // jewel cases standing, spines out
    let x = xa;
    while (x + CD.t < xb) {
      if (rnd() < 0.03) { x += 0.006 + rnd() * 0.01; continue; }
      gloss(mv(new T.BoxGeometry(CD.t - 0.0005, CD.h, CD.d), x + CD.t / 2, y + CD.h / 2, zf - 0.014 - CD.d / 2 - rnd() * 0.005), CD_COL[(rnd() * CD_COL.length) | 0]);
      x += CD.t;
    }
    return x;
  }
  function cdPile(rnd, cx, y, zf, n) {                  // and a pile of them lying flat
    for (let k = 0; k < n; k++) gloss(mv(new T.BoxGeometry(CD.d, CD.t - 0.0005, CD.h), cx + (rnd() - 0.5) * 0.008, y + CD.t / 2 + k * CD.t, zf - 0.02 - CD.h / 2 - rnd() * 0.008, (rnd() - 0.5) * 0.14), CD_COL[(rnd() * CD_COL.length) | 0]);
    return y + n * CD.t;
  }
  const LP_COLS = [0x1d3b45, 0xe9dfc8, 0xc8392b, 0x15120f, 0xe0a21b, 0x2f6b4e, 0x7a1f6a, 0xd8d2c4, 0x27557f, 0xe2571c, 0x3a2a22, 0xf1e8d4, 0x8c2f5a, 0x1f6f78, 0xe9dfc8, 0x15120f, 0xd8ceb8, 0x2a2a2a];
  function lpRow(rnd, xa, xb, y, zf, lean) {             // records on edge, packed; the last few fallen against the rest
    let x = xa;
    const end = xb - (lean ? 0.1 + lean * 0.01 : 0.003);
    while (x < end) {
      const w = rnd() < 0.05 ? 0.012 + rnd() * 0.012 : 0.0032 + rnd() * 0.003, hgt = 0.314 + (rnd() < 0.15 ? 0.004 : 0);
      matte(mv(new T.BoxGeometry(w, hgt, 0.314), x + w / 2, y + hgt / 2, zf - 0.008 - 0.157 - rnd() * 0.014), LP_COLS[(rnd() * LP_COLS.length) | 0]);
      x += w + 0.0006;
    }
    for (let k = 0; k < (lean || 0); k++) {
      const th = 0.15 + k * 0.014;
      matte(mv(new T.BoxGeometry(0.005, 0.314, 0.314), x + 0.004 + 0.157 * Math.sin(th) + k * 0.0075, y + 0.157 * Math.cos(th) + 0.0025, zf - 0.17 - rnd() * 0.01, 0, 0, th), LP_COLS[(rnd() * LP_COLS.length) | 0]);
    }
  }
  function coverPlane(cell, w, h) {                     // a printed cover from the sheet, lying in XZ, its top toward -z
    const g = new T.PlaneGeometry(w, h), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ((cell % CV_C) + uv.getX(i)) / CV_C, 1 - (((cell / CV_C) | 0) + 1 - uv.getY(i)) / CV_R);
    g.rotateX(-Math.PI / 2);
    return g;
  }
  function sleeve(art, m) {                              // a record in its sleeve; m: where it is, its face looking along +z
    const prev = xf; xf = prev ? prev.clone().multiply(m) : m;
    matte(new T.BoxGeometry(0.315, 0.315, 0.004), 0xd8ceb8);
    put(coverMat, mv(coverPlane(art, 0.313, 0.313), 0, 0, 0.0023, 0, Math.PI / 2));
    xf = prev;
  }
  function cdCase(art, x, y, z, ry, open) {             // a jewel case lying flat, its booklet showing through the lid
    at(x, y, z, ry, () => {
      gloss(rbox(CD.d, CD.t * 0.55, CD.h, 0.001, 0, CD.t * 0.275, 0), 0x18181a);
      gloss(rbox(0.012, CD.t * 0.6, CD.h, 0.001, -CD.d / 2 + 0.006, CD.t * 0.3, 0), 0x0c0c0d);           // the hinge edge
      if (open) {                                        // the lid swung open beside it, the tray's hub showing where the disc was
        at(-CD.d / 2, CD.t * 0.5, 0, 0, () => {
          gloss(rbox(CD.d, 0.003, CD.h, 0.001, -CD.d / 2, 0.0015, 0), 0x2a2a2e);
          put(coverMat, mv(coverPlane(art, 0.12, 0.12), -CD.d / 2 + 0.004, 0.0033, 0));
        }, 0, 0.03);
        gloss(mv(cyl(0.0075, 0.0075, 0.003, 16), 0.006, CD.t * 0.55 + 0.0015, 0), 0x0c0c0d);
        gloss(mv(new T.RingGeometry(0.02, 0.058, 40), 0.006, CD.t * 0.55 + 0.0004, 0, 0, -Math.PI / 2), 0x101011);
      } else {
        put(coverMat, mv(coverPlane(art, 0.12, 0.12), 0.005, CD.t * 0.55 + 0.0006, 0));
        gloss(rbox(CD.d, 0.003, CD.h, 0.001, 0, CD.t * 0.55 + 0.0022, 0), 0x26262a);
        put(coverMat, mv(coverPlane(art, 0.12, 0.12), 0.005, CD.t * 0.55 + 0.004, 0));
      }
    });
  }
  // shelving, built in its own space: it runs along x from xs[0], stands against z = 0 and faces +z
  await slice();
  const SH = { D: 0.34, t: 0.022, base: 0.07, ys: [0.78, 1.12, 1.46, 1.8, 2.14], cap: 2.48 };
  function shelving(xs, lower, seed) {
    const D = SH.D, t = SH.t, L0 = xs[0], L1 = xs[xs.length - 1], rnd = mulberry(seed);
    xs.forEach((x) => wood(clamp(x - t / 2, L0, L1 - t), clamp(x - t / 2, L0, L1 - t) + t, 0, SH.cap, 0, D));
    wood(L0, L1, SH.base, SH.cap, 0, 0.008);
    matte(mv(new T.BoxGeometry(L1 - L0, SH.base, D - 0.04), (L0 + L1) / 2, SH.base / 2, (D - 0.04) / 2), 0x1a130e);          // the plinth, set back
    wood(L0, L1, SH.cap - t, SH.cap, 0, D + 0.004);
    wood(L0, L1, SH.cap, ROOM.yMax, 0, D - 0.012);                                                                       // closed up to the ceiling
    for (let c = 0; c < xs.length - 1; c++) {
      const xa = xs[c] + t / 2, xb = xs[c + 1] - t / 2, kind = lower[c];
      if (!kind) continue;
      SH.ys.forEach((y) => wood(xa, xb, y - t, y, 0.008, D - 0.004));
      wood(xa, xb, SH.base, SH.base + t, 0.008, D - 0.004);
      const y0 = SH.base + t, y1 = SH.ys[0] - t;
      if (kind === 'door') {                             // a pair of doors, a brass knob each
        const mid = (xa + xb) / 2;
        wood(xa + 0.002, mid - 0.0015, y0 + 0.002, y1 - 0.002, D - 0.024, D - 0.004);
        wood(mid + 0.0015, xb - 0.002, y0 + 0.002, y1 - 0.002, D - 0.024, D - 0.004);
        for (const sx of [-1, 1]) put(brassMat, mv(lathe([[0, 0], [0.005, 0], [0.004, 0.008], [0.009, 0.013], [0.01, 0.018], [0.007, 0.022], [0, 0.023]], 14), mid + sx * 0.03, 0.6, D - 0.004, 0, Math.PI / 2));
      } else {                                           // two rows of records
        const ym = y0 + (y1 - y0) / 2 + t / 2;
        wood(xa, xb, ym - t, ym, 0.008, D - 0.004);
        lpRow(rnd, xa + 0.004, xb, y0, D, rnd() < 0.5 ? 4 : 0);
        lpRow(rnd, xa + 0.004, xb, ym, D, rnd() < 0.6 ? 3 : 0);
      }
    }
    return rnd;
  }
  // small things for the shelves
  const vase = (x, y, z, s, col, shape) => (col === BRASS ? (g) => put(brassMat, g) : (g) => gloss(g, col))(mv(lathe((shape === 1
    ? [[0, 0], [0.03, 0], [0.05, 0.03], [0.055, 0.08], [0.035, 0.13], [0.016, 0.16], [0.016, 0.2], [0.022, 0.21], [0.018, 0.21], [0.012, 0.2], [0, 0.2]]
    : shape === 2 ? [[0, 0], [0.035, 0], [0.07, 0.02], [0.085, 0.05], [0.088, 0.062], [0.082, 0.062], [0.066, 0.024], [0.03, 0.01], [0, 0.01]]
      : [[0, 0], [0.032, 0], [0.04, 0.01], [0.044, 0.1], [0.04, 0.15], [0.03, 0.165], [0.026, 0.165], [0.034, 0.145], [0.036, 0.1], [0, 0.02]]).map((q) => [q[0] * s, q[1] * s]), 28), x, y, z));
  function photoFrame(x, y, z, ry, tone) {               // a small standing frame, leaning back on its strut
    at(x, y, z, ry, () => {
      at(0, 0, 0, 0, () => {
        put(brassMat, rbox(0.1, 0.13, 0.008, 0.002, 0, 0.065, 0));
        matte(rbox(0.082, 0.112, 0.002, 0, 0, 0.065, 0.0045), 0xe6dccb);
        matte(rbox(0.06, 0.085, 0.002, 0, 0, 0.068, 0.0052), tone);
      }, -0.2);
      matte(rbox(0.03, 0.1, 0.003, 0, 0, 0.048, -0.035, 0, 0.42), 0x2a1c12);
    });
  }
  const bookend = (x, y, z, dir) => { metal(rbox(0.003, 0.14, 0.1, 0.001, x, y + 0.07, z), 0x2a2a2c); metal(rbox(0.09, 0.002, 0.1, 0.0005, x - dir * 0.045, y + 0.001, z), 0x2a2a2c); };
  // one shelf, between xa and xb, filled by a recipe
  function stock(rnd, kind, xa, xb, y) {
    const D = SH.D, hm = 0.3, a = xa + 0.004, b = xb - 0.004;
    if (kind === 'books') { const x = standBooks(rnd, a, b - 0.09, y, D, hm); if (rnd() < 0.7) leanBook(rnd, x, y, D, 0.26); }
    else if (kind === 'full') standBooks(rnd, a, b, y, D, hm);
    else if (kind === 'tall') { const x = standBooks(rnd, a, b - 0.12, y, D, hm, true); leanBook(rnd, x, y, D, 0.29); }
    else if (kind === 'stackL') { const top = flatStack(rnd, a + 0.14, y, D, 4 + ((rnd() * 3) | 0), true); vase(a + 0.13, top, D - 0.14, 0.7, 0x2b2622, 2); standBooks(rnd, a + 0.3, b, y, D, hm); }
    else if (kind === 'stackR') { const x = standBooks(rnd, a, b - 0.3, y, D, hm); bookend(x + 0.003, y, D - 0.1, -1); const top = flatStack(rnd, b - 0.14, y, D, 3 + ((rnd() * 3) | 0), true); if (rnd() < 0.5) put(brassMat, mv(new T.SphereGeometry(0.028, 20, 14), b - 0.14, top + 0.028, D - 0.13)); }
    else if (kind === 'vase') { const x = standBooks(rnd, a, b - 0.24, y, D, hm); bookend(x + 0.003, y, D - 0.1, -1); vase(b - 0.1, y, D - 0.15, 1.1, 0xc9b99a, 0); }
    else if (kind === 'vaseL') { vase(a + 0.09, y, D - 0.15, 1.15, 0x8a3a1c, 1); standBooks(rnd, a + 0.2, b, y, D, hm); }
    else if (kind === 'frame') { const x = standBooks(rnd, a, b - 0.2, y, D, hm); leanBook(rnd, x, y, D, 0.25); photoFrame(b - 0.07, y, D - 0.1, -0.25, 0x6a5a4a); }
    else if (kind === 'cds') {                           // two tiers of compact discs, a pile on top where the second tier stops
      cdRow(rnd, a, b, y, D);
      const xe = cdRow(rnd, a, a + (b - a) * (0.45 + rnd() * 0.25), y + CD.h, D);
      cdPile(rnd, Math.min(b - 0.075, xe + 0.085), y + CD.h, D, 3 + ((rnd() * 5) | 0));
    } else if (kind === 'cdsBooks') {
      const xm = a + (b - a) * 0.5; cdRow(rnd, a, xm, y, D); cdRow(rnd, a, xm - 0.06, y + CD.h, D);
      standBooks(rnd, xm + 0.004, b, y, D, hm);
    } else if (kind === 'boxes') {                       // archive boxes and a short run of books
      for (let k = 0; k < 2; k++) { matte(rbox(0.11, 0.26, 0.27, 0.003, a + 0.06 + k * 0.116, y + 0.13, D - 0.15), k ? 0x4a3c2c : 0x5a4a36); matte(rbox(0.05, 0.03, 0.002, 0, a + 0.06 + k * 0.116, y + 0.1, D - 0.014), 0xd8ceb8); }
      standBooks(rnd, a + 0.25, b, y, D, hm);
    }
  }
  // back wall, right of the window: two bays, the first one where the phone looks
  await slice();
  const BAY = { x0: 0.52, x1: 1.46 };
  at(BAY.x0, 0, ROOM.zBack, 0, () => {
    const xs = [0, 0.47, 0.94], rnd = shelving(xs, ['door', 'door'], 91), t = SH.t;
    const plan = [['', 'tall'], ['cds', 'books'], ['books', 'cdsBooks'], ['stackR', 'full'], ['full', 'vaseL']];
    plan.forEach((row, r) => row.forEach((kind, c) => { if (kind) stock(rnd, kind, xs[c] + t / 2, xs[c + 1] - t / 2, SH.ys[r]); }));
  });
  // right wall, corner to front: the corner bay is blind behind the other unit
  await slice();
  at(ROOM.xMax, 0, ROOM.zBack, -Math.PI / 2, () => {
    const xs = [0, 0.34, 1.08, 1.82, 2.56, 3.3], rnd = shelving(xs, [null, 'door', 'lp', 'lp', 'door'], 93), t = SH.t;
    const plan = [[null, 'tall', 'stackL', '', 'boxes'], [null, 'books', 'full', 'vase', 'books'], [null, 'full', 'frame', 'books', 'cds'], [null, 'vaseL', 'books', 'stackR', 'full'], [null, 'boxes', 'full', 'books', '']];
    plan.forEach((row, r) => row.forEach((kind, c) => { if (kind) stock(rnd, kind, xs[c] + t / 2, xs[c + 1] - t / 2, SH.ys[r]); }));
    // a globe at eye level, on its own shelf
    at((xs[3] + xs[4]) / 2, SH.ys[0], SH.D - 0.16, 0.5, () => {
      put(furnMat, lathe([[0, 0], [0.07, 0], [0.07, 0.012], [0.032, 0.028], [0.011, 0.05], [0.009, 0.09]], 28));
      const ring = new T.TorusGeometry(0.114, 0.0034, 8, 56, Math.PI); ring.rotateZ(0.41 + Math.PI / 2);
      put(brassMat, mv(ring, 0, 0.2, 0));
      const globeMat = M({ map: globeTex, roughness: 0.36 }); envMats.push(globeMat);
      const ball = new T.Mesh(new T.SphereGeometry(0.105, 48, 32), globeMat); ball.position.y = 0.2; ball.rotation.set(0, 2.2, 0.41, 'YZX');
      addMesh(ball).castShadow = true;
    });
    flatStack(rnd, xs[3] + 0.14, SH.ys[0], SH.D, 3, true);
  });

  /* ───────────────────────── the sideboard under the window, and the hi-fi on it ───────────────────────── */
  await slice();
  const SB = { x0: -1.72, x1: 0.46, z0: ROOM.zBack + 0.012, D: 0.46, y0: 0.2, top: 0.78 };
  (function buildSideboard() {
    const rnd = mulberry(61), L = SB.x1 - SB.x0, D = SB.D, y0 = SB.y0, y1 = SB.top, t = 0.02, X = [0, 0.73, 1.46, L];
    at(SB.x0, 0, SB.z0, 0, () => {
      wood(-0.006, L + 0.006, y1 - 0.024, y1, 0, D + 0.008);
      wood(0, L, y0, y0 + t, 0, D);
      wood(0, L, y0 + t, y1 - 0.024, 0, 0.008);
      X.forEach((x) => { const a = clamp(x - t / 2, 0, L - t); wood(a, a + t, y0 + t, y1 - 0.024, 0.008, D); });
      // two sliding doors, one running behind the other, a round finger pull in each
      wood(0.022, 0.75, y0 + t + 0.003, y1 - 0.027, D - 0.02, D - 0.004);
      wood(0.73, 1.45, y0 + t + 0.003, y1 - 0.027, D - 0.038, D - 0.022);
      for (const [px, pz] of [[0.68, D - 0.004], [0.8, D - 0.022]]) {
        gloss(mv(cyl(0.017, 0.017, 0.002, 24), px, 0.5, pz + 0.0004, 0, Math.PI / 2), 0x120c08);
        put(brassMat, mv(new T.TorusGeometry(0.018, 0.0022, 8, 28), px, 0.5, pz + 0.001));
      }
      // the open bay: records, a few fallen over, a box of 45s
      lpRow(rnd, X[2] + t / 2 + 0.004, X[2] + 0.49, y0 + t, D - 0.02, 0);
      matte(rbox(0.19, 0.19, 0.2, 0.003, L - 0.115, y0 + t + 0.095, D - 0.16), 0x5a3c26);
      for (let k = 0; k < 34; k++) matte(mv(new T.BoxGeometry(0.0034, 0.18, 0.18), L - 0.2 + 0.012 + k * 0.0047, y0 + t + 0.1 + (k % 5 === 2 ? 0.006 : 0), D - 0.16), LP_COLS[(rnd() * LP_COLS.length) | 0]);
      // legs: turned, tapered, a brass ferrule at the foot; a rail between them front and back
      for (const lx of [0.09, L / 2, L - 0.09]) for (const lz of [0.06, D - 0.06]) {
        put(furnMat, mv(cyl(0.022, 0.013, y0 - 0.03, 14), lx, 0.03 + (y0 - 0.03) / 2, lz));
        put(brassMat, mv(cyl(0.0135, 0.012, 0.03, 14), lx, 0.015, lz));
      }
      for (const lz of [0.06, D - 0.06]) wood(0.09, L - 0.09, y0 - 0.045, y0 - 0.005, lz - 0.009, lz + 0.009);
    });
  })();
  await slice();
  const acrylMat = M({ color: 0x40362c, roughness: 0.22, transparent: true, opacity: 0.16, depthWrite: false });
  acrylMat.userData.envK = 0.8; envMats.push(acrylMat);
  const recordMat = M({ map: recordTex, roughness: 0.32 }); recordMat.userData.envK = 1.2; envMats.push(recordMat);
  let vinyl = null;
  const TT = { x: -0.24, y: SB.top, z: SB.z0 + 0.25 };
  (function buildHifi() {
    // the turntable: a walnut plinth, a black deck, the platter turning under a smoked lid
    at(TT.x, TT.y, TT.z, 0, () => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) gloss(mv(cyl(0.02, 0.022, 0.012, 14), sx * 0.185, 0.006, sz * 0.145), BLACK);
      put(furnMat, boxWU(-0.225, 0.225, 0.012, 0.052, -0.18, 0.18, 0.8, 0.8, 0.004));
      gloss(rbox(0.444, 0.008, 0.354, 0.003, 0, 0.055, 0), 0x1a1a1c);
      const PX = -0.045, PY = 0.059;
      metal(mv(lathe([[0, 0], [0.153, 0], [0.153, 0.016], [0.15, 0.02], [0, 0.02]], 56), PX, PY, 0), ALU);
      matte(mv(cyl(0.147, 0.147, 0.003, 48), PX, PY + 0.0215, 0), 0x0f0f10);
      const rg = new T.CircleGeometry(0.151, 72); rg.rotateX(-Math.PI / 2);
      vinyl = new T.Mesh(rg, recordMat); vinyl.position.set(PX, PY + 0.0245, 0); addMesh(vinyl);
      metal(mv(cyl(0.0035, 0.0035, 0.014, 10), PX, PY + 0.03, 0), ALU);
      // tonearm: its pivot at the back right, the arm reaching the record's outer tracks, a counterweight behind
      const piv = V3(0.168, PY + 0.05, -0.105), tip = V3(0.035, PY + 0.034, 0.09), back = piv.clone().addScaledVector(V3().subVectors(piv, tip).normalize(), 0.062);
      metal(mv(cyl(0.024, 0.026, 0.012, 20), piv.x, PY + 0.006, piv.z), ALU);
      metal(mv(cyl(0.008, 0.008, 0.04, 12), piv.x, PY + 0.03, piv.z), ALU);
      metal(mv(cyl(0.013, 0.013, 0.014, 16), piv.x, piv.y, piv.z), 0x2a2a2c);
      metal(rod(tip, piv, 0.0036), ALU); metal(rod(piv, back, 0.004), ALU);
      metal(rod(back.clone().lerp(piv, 0.55), back, 0.014, 0.014, 18), 0x3a3a3e);
      gloss(rbox(0.018, 0.007, 0.03, 0.002, tip.x - 0.004, tip.y - 0.002, tip.z + 0.008, -0.62), BLACK);                  // headshell and cartridge
      gloss(rbox(0.012, 0.012, 0.016, 0.002, tip.x - 0.006, tip.y - 0.011, tip.z + 0.012, -0.62), 0x8a2a1c);
      metal(mv(cyl(0.004, 0.004, 0.03, 8), 0.2, PY + 0.02, -0.02), ALU); gloss(rbox(0.03, 0.006, 0.008, 0.002, 0.2, PY + 0.036, -0.02), BLACK);     // the arm rest
      for (let k = 0; k < 2; k++) gloss(rbox(0.03, 0.006, 0.018, 0.002, -0.19 + k * 0.036, PY + 0.003, 0.152), k ? 0x2c2c2e : 0x3a3a3c);                // start/stop, 33/45
      gloss(rbox(0.012, 0.004, 0.09, 0.001, 0.196, PY + 0.001, 0.105), 0x0a0a0a); metal(rbox(0.02, 0.01, 0.012, 0.002, 0.196, PY + 0.006, 0.09), ALU);   // pitch slider
      gloss(mv(new T.SphereGeometry(0.003, 8, 6), -0.205, PY + 0.003, 0.11), 0xff5a2a);
      // the lid: five sheets of smoked acrylic
      const lid = mergeGeometries([rbox(0.444, 0.003, 0.354, 0, 0, 0.09, 0), rbox(0.444, 0.09, 0.003, 0, 0, 0.045, 0.1755), rbox(0.444, 0.09, 0.003, 0, 0, 0.045, -0.1755),
        rbox(0.003, 0.09, 0.354, 0, 0.2205, 0.045, 0), rbox(0.003, 0.09, 0.354, 0, -0.2205, 0.045, 0)]);
      const lm = new T.Mesh(lid, acrylMat); lm.position.y = PY; lm.castShadow = false; addMesh(lm); lm.receiveShadow = false;
      for (const sx of [-1, 1]) gloss(rbox(0.03, 0.02, 0.012, 0.002, sx * 0.15, PY + 0.012, -0.183), BLACK);              // hinges
    });
    // amplifier, the CD player on top of it
    at(0.235, SB.top, SB.z0 + 0.22, 0, () => {
      const unit = (w, h, d, y0, mat) => {
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) gloss(mv(cyl(0.016, 0.018, 0.012, 12), sx * (w / 2 - 0.04), y0 + 0.006, sz * (d / 2 - 0.04)), BLACK);
        gloss(rbox(w, h, d, 0.004, 0, y0 + 0.012 + h / 2, 0), 0x151516);
        put(mat, mv(new T.PlaneGeometry(w - 0.008, h - 0.008), 0, y0 + 0.012 + h / 2, d / 2 + 0.0006));
        for (let k = 0; k < 12; k++) matte(rbox(0.16, 0.0006, 0.004, 0, -0.08, y0 + 0.012 + h + 0.0002, -d / 2 + 0.05 + k * 0.012), 0x050505);       // vents
        return y0 + 0.012 + h;
      };
      const y1 = unit(0.43, 0.11, 0.3, 0, ampMat);
      const ky = 0.012 + 0.11 * 0.5, kx = (444 / 512 - 0.5) * 0.422;
      metal(mv(cyl(0.023, 0.024, 0.02, 32), kx, ky, 0.15 + 0.01, 0, Math.PI / 2), 0x38383c);                                 // the volume knob
      matte(rbox(0.002, 0.012, 0.001, 0, kx - 0.008, ky + 0.012, 0.1705, 0, 0, 0.6), 0xe6e2d8);
      const y2 = unit(0.43, 0.085, 0.28, y1, cdpMat);
      cdCase(6, -0.08, y2, 0.02, 0.35); cdCase(1, -0.075, y2 + CD.t, 0.025, 0.1);
      matte(rbox(0.05, 0.016, 0.16, 0.006, 0.12, y2 + 0.008, 0.02, -0.3), 0x1c1c1e);                                         // its remote
      for (let k = 0; k < 8; k++) gloss(rbox(0.008, 0.002, 0.008, 0.001, 0.12 + ((k % 2) - 0.5) * 0.016, y2 + 0.0165, 0.02 - 0.05 + ((k / 2) | 0) * 0.02, -0.3), k === 0 ? 0xb3261e : 0x8a877e);
    });
    // a pair of small speakers: walnut boxes, black cloth grilles
    const speaker = (x, y, z, ry) => at(x, y, z, ry, () => {
      put(furnMat, boxWU(-0.1, 0.1, 0, 0.3, -0.11, 0.1, 0.8, 0.8, 0.005));
      matte(rbox(0.184, 0.284, 0.014, 0.006, 0, 0.15, 0.104), 0x0e0d0c);
      matte(mv(cyl(0.052, 0.052, 0.004, 28), 0, 0.105, 0.1105, 0, Math.PI / 2), 0x121110);
      matte(mv(cyl(0.02, 0.02, 0.004, 20), 0, 0.225, 0.1105, 0, Math.PI / 2), 0x121110);
      put(brassMat, rbox(0.022, 0.006, 0.002, 0.0005, 0, 0.022, 0.1115));
    });
    speaker(SB.x0 + 0.17, SB.top, SB.z0 + 0.2, 0.22);
    // between the speaker and the iMac: three big books lying, a brass bowl on them
    const st = flatStack(mulberry(41), SB.x0 + 0.52, SB.top, SB.z0 + 0.36, 3, true);
    vase(SB.x0 + 0.52, st, SB.z0 + 0.2, 0.9, BRASS, 2);
    speaker(BAY.x0 + 0.13, SH.ys[0], ROOM.zBack + 0.16, -0.12);
    // by the second speaker: a pile of discs, a photograph
    cdPile(mulberry(9), BAY.x0 + 0.33, SH.ys[0], ROOM.zBack + SH.D, 11);
    photoFrame(BAY.x0 + 0.4, SH.ys[0], ROOM.zBack + 0.1, -0.3, 0x5a4a3c);
    // two sleeves on the floor, leaning on the sideboard where the records are
    sleeve(0, M4(SB.x1 - 0.5, 0.1515, SB.z0 + SB.D + 0.0215, 0, -0.3));
    sleeve(3, M4(SB.x1 - 0.41, 0.1515, SB.z0 + SB.D + 0.0295, 0, -0.3));
  })();

  /* ───────────────────────── the arc lamp over the chair, and the iMac on the sideboard ───────────────────────── */
  await slice();
  const ARC = { x: 1.24, z: -1.13, gx: 0.64, gy: 1.66, gz: -1.3, R: 0.16 };
  // The first iMac (1998), in Bondi blue: translucent, so its insides show through the back. It stands on the
  // sideboard under the window, to the left of a puzzle in hand, turned 33° toward the middle of the room: past
  // square to the camera, so the camera sees its face nearly full and a little of the blue shell behind its left side.
  // Its screen carries the top scores, as an arcade machine's do: amber dots on black. Turned so, it is deeper than
  // the sideboard by a hair: its back stands just clear of the wall, and one front corner over the edge by a centimetre.
  // Its right front corner swings toward the turntable; it stands far enough left to keep 4 cm from the lid.
  const IMAC = { x: -0.78, y: SB.top, z: SB.z0 + 0.2, ry: 33 * Math.PI / 180 };
  const lampGlass = (stops) => {
    const m = M({ color: 0x200a02, roughness: 0.2, side: T.DoubleSide, emissive: new T.Color(1, 1, 1), emissiveMap: glassTex(stops), emissiveIntensity: 2 });
    m.userData.envK = 0.7; envMats.push(m);
    m.onBeforeCompile = (sh) => {                         // lit glass is brightest where it faces you and deepens toward its edge
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= mix(0.3, 1.0, pow(abs(dot(normalize(vNormal), normalize(vViewPosition))), 1.4));');
    };
    return m;
  };
  const globeMat = lampGlass([[0, '#a82e03'], [0.3, '#d23c04'], [0.62, '#f04a06'], [0.86, '#ff5e10'], [1, '#ff8a30']]);
  const bulbMat = new T.MeshBasicMaterial({ color: new T.Color(5, 3.2, 1.5) });
  const lampMats = [globeMat];
  (function buildLamps() {
    const dx = ARC.gx - ARC.x, dz = ARC.gz - ARC.z, reach = Math.hypot(dx, dz), R = ARC.R;
    at(ARC.x, 0, ARC.z, Math.atan2(-dz, dx), () => {
      metal(lathe([[0, 0], [0.16, 0], [0.166, 0.008], [0.16, 0.022], [0.12, 0.04], [0.05, 0.052], [0.02, 0.056], [0.018, 0.09], [0, 0.09]], 48), CHROME);
      const top = ARC.gy + R + 0.05;
      const curve = new T.CatmullRomCurve3([[0, 0.06], [-0.03, 0.6], [-0.035, 1.2], [0.05, 1.7], [0.25, 1.99], [0.47, 2.03], [reach - 0.04, 1.96], [reach, top]].map((q) => V3(q[0], q[1], 0)), false, 'catmullrom', 0.5);
      metal(new T.TubeGeometry(curve, 96, 0.0105, 12), CHROME);
      metal(mv(cyl(0.014, 0.014, 0.05, 12), -0.033, 0.92, 0), CHROME);                               // the sleeve where the arc telescopes
      gloss(mv(lathe([[0, 0.05], [0.012, 0.05], [0.014, 0.03], [0.04, 0.012], [0.046, 0], [0.044, -0.012], [0, -0.012]], 24), reach, ARC.gy + R, 0), BLACK);
      // the globe: orange glass, open underneath, lit from inside
      const phi0 = 0.2, phi1 = 2.22, prof = [];
      for (let k = 0; k <= 30; k++) { const p = lerp(phi0, phi1, k / 30); prof.push([R * Math.sin(p), R * Math.cos(p)]); }
      prof.push([R * Math.sin(phi1) - 0.004, R * Math.cos(phi1) - 0.002]);
      const globe = new T.Mesh(lathe(prof, 56), globeMat); globe.position.set(reach, ARC.gy, 0); addMesh(globe);
      const open = new T.Mesh(new T.CircleGeometry(R * Math.sin(phi1) - 0.006, 40), bulbMat); open.rotation.x = Math.PI / 2; open.position.set(reach, ARC.gy + R * Math.cos(phi1) + 0.012, 0); addMesh(open);
      // its cord, down the stem and off to the wall
      matte(new T.TubeGeometry(new T.CatmullRomCurve3([V3(0.1, 0.02, 0.02), V3(0.2, 0.004, 0.1), V3(0.24, 0.004, 0.3), V3(0.1, 0.004, 0.42)]), 24, 0.003, 5), BLACK);
    });
  })();

  // The iMac (1998), in Bondi blue, laid out as its plastics are. A hood of frosted ice over the face and the front of
  // the top, with the screen in it. A skirt of the same ice all the way round the
  // bottom, carrying the speakers, the CD tray and the power button at the front and a door on the right side. And
  // between them the blue, translucent, over the sides and the round back, the tube and its cage showing through.
  // From the side it is a rounded wedge: the face leans back a little, the top runs back almost level and then falls
  // in one long curve to a back that is deepest low down, and the line between the blue and the skirt climbs from
  // the face to the back. From above, the sides draw in toward the back. On the fall of the back: three vents, and
  // the handle.
  await slice();
  const bondiMat = M({ color: 0x0480a2, roughness: 0.16, transparent: true, opacity: 0.74, side: T.DoubleSide, depthWrite: false, emissive: new T.Color(0, 0.045, 0.06) });
  const bondiRimMat = M({ color: 0x3fb0ac, roughness: 0.2, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false, emissive: new T.Color(0.02, 0.07, 0.07) });   // the blue's front edge, greener where the plastic is thick
  const iceMat = M({ color: 0xcbd4d8, roughness: 0.34, transparent: true, opacity: 0.9, side: T.DoubleSide });
  // the tube's glass: only what it reflects, the room, added over the screen (black adds nothing of its own). It
  // reflects the room as it was caught, lamps and all, and not each light on its own, which only made pin-pricks: its
  // glare is the arc lamp's orange globe, which its curve brings onto it (see the tube). Its room is set once the
  // room has been caught (see captureGlass).
  const crtGlassMat = new T.MeshBasicMaterial({ color: 0x000000, combine: T.AddOperation, reflectivity: 0.3, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
  bondiMat.userData.envK = 1.1; bondiRimMat.userData.envK = 1; iceMat.userData.envK = 0.9;
  envMats.push(bondiMat, bondiRimMat, iceMat);
  // The screen keeps the top five as an arcade machine does, in its own coarse pixels (160 × 120) and in one colour,
  // yellow on black, with a tube's glow and its lines. At the top, the game's mark: a cube's face of 3 × 3 squares of
  // 9 × 9 pixels, filled or drawn as an outline. It stands two turns from solved (the middle row and the middle
  // column turned); close up it solves itself, a turn at a time, until every square is filled: each turn empties its
  // line, then fills it again a square at a time, so the line is seen to move. Beside it THE CUBES, TOP 5, PLAYERS. Under them the
  // five, the first one lit up, dark letters on a yellow bar. Until there is a stopwatch to beat them, the five are
  // the machine's own, as on any arcade.
  // Side-B: the screen's ink is charcoal and its ground cream paper (the stylesheet's --mac-ink and --mac-paper)
  const CRT = MAC ? { w: 160, h: 120, px: 8, ink: '#2a2b2f', off: '#ebe4d1' } : { w: 160, h: 120, px: 8, ink: '#ffcf3d', off: '#070604' };
  // the page's own pixel letters (keys, cards, the version): the screen's ink; in Side-B the paper, darkened to ink
  // by the stylesheet wherever they sit on paper, so one drawing serves both ways round
  const PIX = MAC ? CRT.off : CRT.ink;
  // Each puzzle has its own five, kept on the device (a lab starts from the machine's own every time). Until there are
  // solves to beat them, the five are the machine's own, as on any arcade: the 3×3's times, and the others' scaled
  // to how long each takes.
  const two = (v) => String(v).padStart(2, '0');
  const tableSec = (str) => { const m = /^(\d+):(\d\d)\.(\d\d)$/.exec(str); return m ? +m[1] * 60 + +m[2] + +m[3] / 100 : Infinity; };
  const tableTime = (sec) => { const cs = Math.round(sec * 100); return Math.floor(cs / 6000) + ':' + two(Math.floor(cs / 100) % 60) + '.' + two(cs % 100); };
  const BOARD_NAME = { axis: 'AXIS', cube3: '3X3', cube2: '2X2', ghost: 'GHOST' };
  const SEED = [[48.52, 'AXS'], [63.17, 'GST'], [75.9, 'CUB'], [92.44, 'TWO'], [118.06, 'MIX']];
  const SEED_PACE = { axis: 1.55, cube3: 1, cube2: 0.42, ghost: 2.4 };
  const STORE = 'axis-cube-top5';
  const BOARDS = {};
  for (const key of Object.keys(BOARD_NAME)) BOARDS[key] = SEED.map(([sec, ini]) => [tableTime(sec * SEED_PACE[key]), ini]);
  if (!LAB) {
    try {
      const kept = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (kept && typeof kept === 'object') for (const key of Object.keys(BOARDS)) {
        const rows = kept[key];
        if (Array.isArray(rows) && rows.length === 5 && rows.every((e) => Array.isArray(e) && /^\d+:\d\d\.\d\d$/.test(e[0]) && /^[A-Z]{1,3}$/.test(e[1]))) BOARDS[key] = rows;
      }
    } catch { /* nothing kept, or no storage: the machine's own five */ }
  }
  const keepBoards = () => { if (!LAB) try { localStorage.setItem(STORE, JSON.stringify(BOARDS)); } catch { /* no storage: kept until the page closes */ } };
  let shownKey = 'cube3';                                // the five on the screen: the puzzle in hand's, else the last one held
  // A new entry in a five (see "a new entry"). While its initials are typed it is not in the table yet: it floats over
  // the blurred Mac, with the keyboard. Once kept, it takes its place and its row stays lit; until then the first row is.
  const lab = { on: false, placing: false, done: false, key: 'cube3', rank: -1, time: '', letters: '', mine: -1, blink: true, blinkT: 0, merge: -1 };
  function board() {
    const key = lab.on ? lab.key : shownKey;
    return { key, rows: BOARDS[key], lit: lab.done && lab.key === key ? lab.mine : 0, entry: -1 };
  }
  const entryInitials = () => [0, 1, 2].map((i) => lab.letters[i] || (i === lab.letters.length && !lab.blink ? ' ' : '_')).join('');
  // The merge: once the flying row has settled on its place, it passes into the screen pixel by pixel. Its bar of
  // 111 × 13 of the screen's pixels is the same grid in both; each pixel has its own moment (a fixed scatter), and as
  // the merge runs it goes out of the flying row and comes on in the screen at once.
  const mergeAt = (i, j) => { const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return v - Math.floor(v); };
  function rowLetters(text) {                          // the dark letters of a row on its bar, as bar cells
    const set = new Set();
    for (let c = 0; c < text.length; c++) {
      const rows = GLYPH[text[c]]; if (!rows) continue;
      for (let r = 0; r < 7; r++) for (let i = 0; i < 5; i++) if (rows[r] & (16 >> i)) set.add((4 + c * 7 + i) + ',' + (3 + r));
    }
    return set;
  }
  // The mark mixed: which squares are filled (1) and which an outline (0). Then its solve, square by square: at t
  // seconds after the camera sets off for the screen (or, with a new entry, after its row has merged into the
  // screen), square k becomes filled or an outline. The middle row empties and fills again
  // from the left; a pause; the middle column empties and fills again from the top.
  const MARK0 = [1, 0, 1, 0, 1, 0, 1, 0, 1];
  const MARK_SOLVE = [[0.25, 3, 0], [0.25, 4, 0], [0.25, 5, 0], [0.47, 3, 1], [0.65, 4, 0], [0.83, 5, 1],
    [1.55, 1, 0], [1.55, 4, 0], [1.55, 7, 0], [1.77, 1, 1], [1.95, 4, 1], [2.13, 7, 1]];
  const markAt = (n) => { const m = MARK0.slice(); for (let i = 0; i < n; i++) m[MARK_SOLVE[i][1]] = MARK_SOLVE[i][2]; return m; };
  // Side-B's screen: a dark desktop and on it one window of cream paper, its corners rounded off a pixel, an ink line
  // round it a pixel in, and a title bar of stripes with a close box and THE CUBES on a clear patch. Its rows are
  // where the amber table's are, so the row that flies in lands the same way.
  function macWindow(g, w, h, lit) {
    const u = w / CRT.w, v = h / CRT.h, x0 = 3, y0 = 3, x1 = 156, y1 = 116;
    const fill = (col, ax, ay, bw, bh) => { g.fillStyle = col; g.fillRect(ax * u, ay * v, bw * u, bh * v); };
    fill(CRT.ink, 0, 0, CRT.w, CRT.h);
    fill(CRT.off, x0 + 1, y0, x1 - x0 - 1, y1 - y0 + 1); fill(CRT.off, x0, y0 + 1, x1 - x0 + 1, y1 - y0 - 1);
    for (let y = y0 + 4; y <= y0 + 11; y += 2) fill(CRT.ink, x0 + 3, y, x1 - x0 - 5, 1);   // the title bar's stripes
    fill(CRT.off, 46, y0 + 3, 68, 10); fill(CRT.off, 9, y0 + 3, 11, 10);   // clear patches: the title's, the close box's
    const line = (ax, ay, bx2, by2) => lit.push([ax, ay, bx2 - ax + 1, by2 - ay + 1]);
    line(x0 + 2, y0 + 1, x1 - 2, y0 + 1); line(x0 + 2, y1 - 1, x1 - 2, y1 - 1); line(x0 + 1, y0 + 2, x0 + 1, y1 - 2); line(x1 - 1, y0 + 2, x1 - 1, y1 - 2);
    line(x0 + 2, y0 + 13, x1 - 2, y0 + 13);
    line(11, y0 + 4, 17, y0 + 4); line(11, y0 + 10, 17, y0 + 10); line(11, y0 + 4, 11, y0 + 10); line(17, y0 + 4, 17, y0 + 10);
    for (let c = 0; c < 9; c++) { const rows = GLYPH['THE CUBES'[c]]; if (!rows) continue; for (let r = 0; r < 7; r++) for (let i = 0; i < 5; i++) if (rows[r] & (16 >> i)) lit.push([49 + c * 7 + i, y0 + 4 + r, 1, 1]); }
  }
  function drawScreen(g, w, h, step) {
    const lit = [], dark = [];                          // pixels lit; pixels left dark on something lit (the first row's letters)
    if (MAC) macWindow(g, w, h, lit);
    else {
      const bg = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.62);
      bg.addColorStop(0, '#0d0b08'); bg.addColorStop(1, '#000'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    }
    const text = (str, x, y, into) => {                 // a letter every 7 pixels: 5 wide and a gap of 2
      for (let c = 0; c < str.length; c++) {
        const rows = GLYPH[str[c]]; if (!rows) continue;
        for (let r = 0; r < 7; r++) for (let i = 0; i < 5; i++) if (rows[r] & (16 >> i)) into.push([x + c * 7 + i, y + r, 1, 1]);
      }
    };
    // the heading: the mark (31 wide: three squares of 9 and 2 between), 10 of air, and the three words (61 wide)
    const bd = board(), name = BOARD_NAME[bd.key] || '';
    const bx = MAC ? Math.round((CRT.w - (31 + 10 + Math.max(33, name.length * 7 - 2))) / 2) : Math.round((CRT.w - (31 + 10 + 61)) / 2), by = MAC ? 19 : 10, tx = bx + 41;   // the Mac: THE CUBES is the window's title
    markAt(step || 0).forEach((full, k) => {
      const x0 = bx + (k % 3) * 11, y0 = by + Math.floor(k / 3) * 11;
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const edge = r === 0 || r === 8 || c === 0 || c === 8, corner = (r === 0 || r === 8) && (c === 0 || c === 8);
        if (!corner && (full || edge)) lit.push([x0 + c, y0 + r, 1, 1]);
      }
    });
    if (MAC) { text('TOP 5', tx, by + 5, lit); text(name, tx, by + 17, lit); }
    else { text('THE CUBES', tx, by, lit); text('TOP 5', tx, by + 12, lit); text('PLAYERS', tx, by + 24, lit); }
    // the five: rank, time, initials; one of them on a bar of light (see board)
    const x = Math.round((CRT.w - (15 * 7 - 2)) / 2);
    bd.rows.forEach((e, k) => {
      const y = 55 + k * 12, into = k === bd.lit ? dark : lit;
      if (k === bd.lit && lab.merge >= 0 && lab.merge < 1) {   // merging in: only the pixels whose moment has come
        const letters = rowLetters(String(k + 1) + '  ' + e[0] + '  ' + e[1]);
        for (let j = 0; j < 13; j++) for (let i = 0; i < 111; i++) if (mergeAt(i, j) < lab.merge) (letters.has(i + ',' + j) ? dark : lit).push([x - 4 + i, y - 3 + j, 1, 1]);
        return;
      }
      if (k === bd.lit) lit.push([x - 4, y - 3, 103 + 8, 13]);
      text(String(k + 1), x, y, into); text(e[0], x + 21, y, into); text(k === bd.entry ? entryInitials() : e[1], x + 84, y, into);
    });
    const u = w / CRT.w, v = h / CRT.h;
    g.beginPath();
    for (const [px, py, pw, ph] of lit) g.rect(px * u, py * v, pw * u, ph * v);
    g.fillStyle = CRT.ink;
    if (!MAC) { g.shadowColor = CRT.ink; g.shadowBlur = 14; g.fill(); g.shadowBlur = 0; }   // amber glows; charcoal on paper does not
    g.fill();
    g.beginPath();
    for (const [px, py, pw, ph] of dark) g.rect(px * u, py * v, pw * u, ph * v);
    g.fillStyle = CRT.off; g.fill();
    g.fillStyle = MAC ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.26)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);    // the scan lines
    // a tube's picture: darker toward its edges, and its corners rounded off softly into the dark
    const vg = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.68);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, MAC ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.5)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    const r = w * 0.07, x0 = w * 0.012, y0 = h * 0.016, x1 = w - x0, y1 = h - y0;
    g.beginPath(); g.rect(-w, -h, 3 * w, 3 * h);
    g.moveTo(x0 + r, y0); g.arcTo(x1, y0, x1, y1, r); g.arcTo(x1, y1, x0, y1, r); g.arcTo(x0, y1, x0, y0, r); g.arcTo(x0, y0, x1, y0, r); g.closePath();
    g.save(); g.shadowColor = '#000'; g.shadowBlur = w * 0.02; g.fillStyle = '#000'; g.fill('evenodd'); g.restore();
  }
  const screenCanvas = makeCanvas(CRT.w * CRT.px, CRT.h * CRT.px, (g, w, h) => drawScreen(g, w, h, 0));
  const screenTex = tex(screenCanvas);
  const screenMat = new T.MeshBasicMaterial({ map: screenTex, color: new T.Color().setScalar(MAC ? 1.0 : 1.6) });
  await slice();
  // The tube's face is a cap of a sphere 42 cm round, set back in the opening: its corners 5 cm in, its middle 1.4 cm.
  // A dark funnel runs from the opening down to it. The picture on it swells a little at the middle, as a tube's does.
  // So curved, it catches the arc lamp: seen from in front, the orange globe to the right lies on the glass as a
  // bright blob, the glare, right of the middle.
  const TUBE = { R: 0.42, a: 0.136, b: 0.102, z0: -0.05 };
  TUBE.sag = TUBE.R - Math.sqrt(TUBE.R * TUBE.R - TUBE.a * TUBE.a - TUBE.b * TUBE.b);   // the middle over the corners
  const tubeZ = (x, y) => Math.sqrt(TUBE.R * TUBE.R - x * x - y * y) - (TUBE.R - TUBE.sag);
  let screenMesh = null, glassMesh = null;
  (function buildIMac() {
    // Sizes in metres. The shell is a stack of sections from the face (t = 0) to the back (t = 1), each a
    // superellipse, |x/a|^n + |y/b|^n = 1 (a rounded rectangle for a large n, an ellipse for n = 2), wider at the
    // bottom than at the top, squarer at the face and rounder toward the back. Near the face each section leans back
    // with it.
    const H = 0.372, D = 0.42, ZF = 0.2, LEAN = 0.17, HM = 0.33 * H, FEET = 0.01, LIP = 0.012;
    const T_WHITE = 0.018, T_RIM = 0.1, CAP0 = 0.32, CAP1 = 0.5;           // where the hood's edge, the blue's thick front edge and the hood's top end
    const JS = 10, JB = 22, JC = 10, J = JS + JB + JC, NR = 2 * J;            // points up each side: in the skirt, in the blue, under the hood's top
    const sgnPow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
    const ell = (s, e) => (s <= 0 ? 1 : s >= 1 ? 0 : Math.pow(1 - Math.pow(s, e), 1 / e));   // 1, falling to 0 in a round end
    const prof = (t) => {
      const w = 0.19 * (1 - 0.18 * t) * ell((t - 0.48) / 0.52, 2.3);
      return {
        t, z: ZF - t * D, lean: LEAN * (1 - smooth(t, 0, 0.55)),
        yb: HM * (1 - ell((t - 0.9) / 0.1, 2)),                                // the bottom is flat, and rounds up only at the very back
        yt: HM + (H * (1 - 0.085 * t) - HM) * ell((t - 0.35) / 0.65, 1.95),    // the top: nearly level, then the long fall
        wb: w, wt: w * (0.975 - 0.26 * t),                                       // the sides lean in toward the top
        nt: 8 - 5.2 * t, nb: 10 - 6 * t,
      };
    };
    const seamY = (t) => H * (0.186 + 0.2 * t);                                 // the top of the skirt
    const capX = (q) => q.wt * (0.18 + 0.68 * ell((q.t - CAP0) / (CAP1 - CAP0), 2));   // the side edge of the hood's top, drawing in to a round end
    // the right half of a section: a from -π/2 (the bottom middle) to π/2 (the top middle)
    const sec = (q, a) => {
      const sn = Math.sin(a), n = sn > 0 ? q.nt : q.nb;
      const Y = sgnPow(sn, 2 / n), X = Math.pow(Math.max(0, Math.cos(a)), 2 / n);
      return [lerp(q.wb, q.wt, (Y + 1) / 2) * X, (q.yb + q.yt) / 2 + ((q.yt - q.yb) / 2) * Y];
    };
    const aAtY = (q, y) => {
      const Y = clamp((y - (q.yb + q.yt) / 2) / Math.max(1e-6, (q.yt - q.yb) / 2), -1, 1);
      return Math.asin(sgnPow(Y, (Y > 0 ? q.nt : q.nb) / 2));
    };
    const aAtX = (q, x) => { let lo = 0, hi = Math.PI / 2; for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (sec(q, m)[0] > x) lo = m; else hi = m; } return (lo + hi) / 2; };
    // a point of a section in the iMac's space; d moves it forward, square to the leaning face
    const place = (q, x, y, d) => V3(x, FEET + y * Math.cos(q.lean) + d * Math.sin(q.lean), q.z - y * Math.sin(q.lean) + d * Math.cos(q.lean));
    // The points of each section are spaced so that one of them falls on the top of the skirt and one on the edge of
    // the hood's top: the plastics then part along the mesh's own lines, cleanly.
    const angles = (q) => {
      const as = Math.min(aAtY(q, seamY(q.t)), Math.PI / 2 - 0.3);
      const ac = clamp(aAtX(q, capX(q)), as + 0.1, Math.PI / 2 - 0.05);
      const out = [];
      for (let j = 0; j <= J; j++) out.push(j <= JS ? lerp(-Math.PI / 2, as, j / JS) : j <= JS + JB ? lerp(as, ac, (j - JS) / JB) : lerp(ac, Math.PI / 2, (j - JS - JB) / JC));
      return out;
    };
    const rings = [];
    const addRing = (t, e, d) => {
      const q = prof(t), qq = e ? Object.assign({}, q, { yb: q.yb + e, yt: q.yt - e, wb: q.wb - e, wt: q.wt - e }) : q;
      rings.push({ q, d, half: angles(q).map((a) => sec(qq, a)) });
    };
    for (let k = 4; k >= 1; k--) { const ph = (k / 4) * Math.PI / 2; addRing(0, LIP * (1 - Math.cos(ph)), LIP * Math.sin(ph)); }   // the face's edge, rolled over
    const base = [];
    for (let k = 0; k < 22; k++) base.push(0.6 * (1 - Math.cos((k / 22) * Math.PI / 2)));       // close together at the face
    for (let k = 0; k < 26; k++) base.push(0.6 + 0.4 * Math.sin((k / 26) * Math.PI / 2));       // and round the back's end
    const keep = [T_WHITE, T_RIM, CAP1];
    base.filter((t) => keep.every((s) => Math.abs(t - s) > 0.004)).concat(keep).sort((a, b) => a - b).forEach((t) => addRing(t, 0, 0));
    // the surface: each section round from the bottom middle, up the right, over the top and down the left; the back
    // closes on one point
    const pos = [];
    rings.forEach((r) => {
      for (let j = 0; j <= J; j++) { const p = place(r.q, r.half[j][0], r.half[j][1], r.d); pos.push(p.x, p.y, p.z); }
      for (let j = J - 1; j >= 1; j--) { const p = place(r.q, -r.half[j][0], r.half[j][1], r.d); pos.push(p.x, p.y, p.z); }
    });
    const tip = place(prof(1), 0, HM, 0); pos.push(tip.x, tip.y, tip.z);
    const LIPS = 4, idx = { ice: [], rim: [], blue: [] };
    const plastic = (i, m) => {
      const r = rings[i], r2 = rings[i + 1];
      if (i < LIPS || r.q.t < T_WHITE - 1e-6) return 'ice';                     // the hood's edge round the face
      const j = m < J ? m : 2 * J - 1 - m;
      // the middle of the quad against the skirt's top, for the back, where the skirt runs over the narrowing sections
      const yc = (r.half[j][1] + r.half[j + 1][1] + r2.half[j][1] + r2.half[j + 1][1]) / 4;
      if (j < JS || yc < seamY((r.q.t + r2.q.t) / 2)) return 'ice';
      if (j >= JS + JB && r2.q.t <= CAP1 + 1e-6) return 'ice';                   // the hood's top
      return r.q.t < T_RIM - 1e-6 ? 'rim' : 'blue';
    };
    for (let i = 0; i < rings.length - 1; i++) for (let m = 0; m < NR; m++) {
      const a = i * NR + m, b = i * NR + ((m + 1) % NR), c = (i + 1) * NR + m, d = (i + 1) * NR + ((m + 1) % NR);
      idx[plastic(i, m)].push(a, c, b, b, c, d);
    }
    const last = (rings.length - 1) * NR, tipI = rings.length * NR;
    for (let m = 0; m < NR; m++) idx.ice.push(last + m, tipI, last + ((m + 1) % NR));
    // normals from the whole surface, so that the shading runs on across the parting lines
    const whole = new T.BufferGeometry();
    whole.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    whole.setIndex(idx.ice.concat(idx.rim, idx.blue)); whole.computeVertexNormals();
    const part = (list) => { const g = new T.BufferGeometry(); g.setAttribute('position', whole.attributes.position.clone()); g.setAttribute('normal', whole.attributes.normal.clone()); g.setIndex(list); return g; };
    // shapes on the shell: a point on the top half at a given t and x, or on a side at a given t and height; and the
    // way out from it
    const onTop = (t, x) => { const q = prof(t), p = sec(q, aAtX(q, Math.abs(x))); return place(q, Math.sign(x) * p[0], p[1], 0); };
    const onSide = (t, y, s) => { const q = prof(t), p = sec(q, aAtY(q, y)); return place(q, s * p[0], p[1], 0); };
    const outOf = (f, u, v, up) => {
      const e = 0.0015, du = f(u + e, v).sub(f(u - e, v)), dv = f(u, v + e).sub(f(u, v - e));
      const n = new T.Vector3().crossVectors(du, dv).normalize();
      return n.dot(up) < 0 ? n.negate() : n;
    };
    const top = (t, x, off) => onTop(t, x).add(outOf(onTop, t, x, V3(0, 1, 0)).multiplyScalar(off));
    const right = (t, y, off) => onSide(t, y, 1).add(outOf((a, b) => onSide(a, b, 1), t, y, V3(1, 0, 0)).multiplyScalar(off));
    const rrShape = (w, h, r, cx, cy) => {
      const s = new T.Shape(), x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
      s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
      s.lineTo(x1, y1 - r); s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
      s.lineTo(x0 + r, y1); s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
      s.lineTo(x0, y0 + r); s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
      return s;
    };
    const flat = (shape, z) => new T.ShapeGeometry(shape, 6).translate(0, 0, z);
    const own = (mat, g) => { const m = new T.Mesh(g, mat); return addMesh(m); };
    at(IMAC.x, IMAC.y, IMAC.z, IMAC.ry, () => {
      // the shell, ice first: the three share a place, so they are drawn in the order they are made, and the blue,
      // which does not hide what is behind it, goes over the ice it covers
      own(iceMat, part(idx.ice)); own(bondiRimMat, part(idx.rim)); own(bondiMat, part(idx.blue));
      // The face, in its own leaning plane (y up it from the bottom edge, z out of it): ice, with the opening for the
      // tube; the opening's edge in a light grey, the tube's black surround, and the screen.
      const SW = 0.305, SH = 0.236, SY = 0.215, SR = 0.012;
      at(0, FEET + LIP * Math.sin(LEAN), ZF + LIP * Math.cos(LEAN), 0, () => {
        const r0 = rings[0], outline = [];
        for (let j = 0; j <= J; j++) outline.push(new T.Vector2(r0.half[j][0], r0.half[j][1]));
        for (let j = J - 1; j >= 1; j--) outline.push(new T.Vector2(-r0.half[j][0], r0.half[j][1]));
        const face = new T.Shape(outline), hole = rrShape(SW, SH, SR, 0, SY);
        face.holes.push(hole);
        own(iceMat, new T.ShapeGeometry(face, 8));
        const edge = hole.getPoints(8), wpos = [], widx = [];
        edge.forEach((p) => wpos.push(p.x, p.y, 0, p.x, p.y, -0.016));
        for (let k = 0; k < edge.length - 1; k++) { const a = 2 * k, b = 2 * k + 2; widx.push(a, a + 1, b, b, a + 1, b + 1); }
        const wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(wpos, 3)); wg.setIndex(widx); wg.computeVertexNormals();
        matte(wg, 0xa3b0b7);
        const screen = (z0, mat) => {                     // the tube's face (TUBE)
          const g = new T.PlaneGeometry(2 * TUBE.a, 2 * TUBE.b, 40, 30), q = g.attributes.position, uv = g.attributes.uv;
          for (let i = 0; i < q.count; i++) {
            const x = q.getX(i) / TUBE.a, y = q.getY(i) / TUBE.b, k = 1 - 0.06 * (1 - (x * x + y * y) / 2);
            q.setZ(i, tubeZ(q.getX(i), q.getY(i)));
            uv.setXY(i, 0.5 + 0.5 * x * k, 0.5 + 0.5 * y * k);
          }
          g.computeVertexNormals();
          const m = new T.Mesh(g, mat); m.position.set(0, SY + 0.002, z0); m.castShadow = false; return addMesh(m);
        };
        screenMesh = screen(TUBE.z0, screenMat);
        glassMesh = screen(TUBE.z0 + 0.001, crtGlassMat);
        // the dark funnel from the opening, behind its light grey edge, down to the tube's rim: ray by ray from the
        // middle, the opening's rounded rectangle to the tube's edge
        (function funnel() {
          const N = 128, A = SW / 2, B = SH / 2, out = [], inn = [];
          for (let k = 0; k < N; k++) {
            const t = (k / N) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
            let d = Math.min(A / Math.max(1e-6, Math.abs(c)), B / Math.max(1e-6, Math.abs(sn)));
            let px = d * c, py = d * sn;
            if (Math.abs(px) > A - SR && Math.abs(py) > B - SR) {                // in a corner: onto its round
              const cx = Math.sign(px) * (A - SR), cy = Math.sign(py) * (B - SR), bb = c * cx + sn * cy;
              d = bb + Math.sqrt(Math.max(0, bb * bb - (cx * cx + cy * cy - SR * SR))); px = d * c; py = d * sn;
            }
            out.push(px, SY + py, -0.016);
            const e = 0.995 * Math.min(TUBE.a / Math.max(1e-6, Math.abs(c)), TUBE.b / Math.max(1e-6, Math.abs(sn))), ix = e * c, iy = e * sn;
            inn.push(ix, SY + 0.002 + iy, TUBE.z0 + tubeZ(ix, iy) - 0.0005);
          }
          const pos = [], idx = [];
          for (let k = 0; k < N; k++) { pos.push(out[3 * k], out[3 * k + 1], out[3 * k + 2], inn[3 * k], inn[3 * k + 1], inn[3 * k + 2]); }
          for (let k = 0; k < N; k++) { const a = 2 * k, b = 2 * ((k + 1) % N); idx.push(a, b, a + 1, b, b + 1, a + 1); }   // facing out of the opening
          const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); fg.setIndex(idx); fg.computeVertexNormals();
          gloss(fg, 0x15191c);
        })();
        // the line where the hood meets the skirt
        matte(rbox(0.33, 0.0016, 0.0012, 0, 0, seamY(0), 0.0004), 0x9eaaaf);
        // on the skirt: the speakers at the corners, the CD tray in the middle with its slot, the power button
        for (const sx of [-1, 1]) {
          gloss(flat(rrShape(0.062, 0.038, 0.0175, sx * 0.145, 0.037), 0.0008), 0x17869b);
          for (let k = 0; k < 4; k++) matte(rbox(0.046, 0.0014, 0.0006, 0, sx * 0.145, 0.026 + k * 0.0075, 0.0013), 0x0b5664);   // the grille
        }
        gloss(flat(rrShape(0.152, 0.024, 0.007, 0, 0.044), 0.0005), 0x7f8b91);
        gloss(flat(rrShape(0.148, 0.02, 0.005, 0, 0.044), 0.0008), 0xaeb9bd);
        gloss(flat(rrShape(0.026, 0.0036, 0.0018, 0, 0.044), 0.0012), 0x2a3135);
        gloss(new T.CircleGeometry(0.0065, 24).translate(0.093, 0.036, 0.0008), 0xb4bec2);
        gloss(new T.TorusGeometry(0.0065, 0.0009, 6, 24).translate(0.093, 0.036, 0.0009), 0x87939a);
        // inside, seen through the blue: the tube, square at its face and drawing in to the round neck
        const bulb = [], NB = 40;
        for (let k = 0; k <= 16; k++) {
          const d = -0.017 - (k / 16) * 0.3, f = smooth(-d, 0.06, 0.3), sc = 1 - 0.82 * f, n = lerp(5, 2, f);
          for (let m = 0; m < NB; m++) { const a = (m / NB) * Math.PI * 2; bulb.push(0.156 * sc * sgnPow(Math.cos(a), 2 / n), SY + 0.12 * sc * sgnPow(Math.sin(a), 2 / n), d); }
        }
        const bidx = [];
        for (let k = 0; k < 16; k++) for (let m = 0; m < NB; m++) { const a = k * NB + m, b = k * NB + ((m + 1) % NB); bidx.push(a, b, a + NB, b, b + NB, a + NB); }
        const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.Float32BufferAttribute(bulb, 3)); bg.setIndex(bidx); bg.computeVertexNormals();
        matte(bg, 0x161a1d);
        matte(mv(cyl(0.024, 0.024, 0.06, 16), 0, SY, -0.345, 0, Math.PI / 2), 0x2a2f33);
      }, -LEAN);
      // the chassis on the floor of the skirt
      matte(rbox(0.26, 0.008, 0.28, 0.003, 0, FEET + 0.03, ZF - 0.17), 0x7d878b);
      // On the fall of the back, three vents, and below them the handle: a loop of ice round a dark hollow, with the
      // grip across it. Each is drawn along the shell.
      const strip = (pts, r, hex, closed) => matte(new T.TubeGeometry(new T.CatmullRomCurve3(pts, !!closed), pts.length * 3, r, 8, !!closed), hex);
      for (const tv of [0.585, 0.635, 0.685]) {
        const xv = prof(tv).wt * 0.62, pts = [];
        for (let k = 0; k <= 16; k++) pts.push(top(tv, lerp(-xv, xv, k / 16), 0.0008));
        strip(pts, 0.0046, 0x0a3a46);
      }
      const TH = 0.81, A = 0.058, B = 0.033, Lt = onTop(TH + 0.002, 0).distanceTo(onTop(TH - 0.002, 0)) / 0.004;
      const loop = (s, off) => { const pts = []; for (let k = 0; k < 48; k++) { const w = (k / 48) * Math.PI * 2; pts.push(top(TH + sgnPow(Math.sin(w), 2 / 3.2) * B * s / Lt, sgnPow(Math.cos(w), 2 / 3.2) * A * s, off)); } return pts; };
      const rim = loop(0.94, 0.0015), cpos = [], cidx = [], cc = top(TH, 0, 0.0015);
      cpos.push(cc.x, cc.y, cc.z); rim.forEach((p) => cpos.push(p.x, p.y, p.z));
      for (let k = 0; k < rim.length; k++) cidx.push(0, 1 + k, 1 + ((k + 1) % rim.length));
      const cg = new T.BufferGeometry(); cg.setAttribute('position', new T.Float32BufferAttribute(cpos, 3)); cg.setIndex(cidx); cg.computeVertexNormals();
      matte(cg, 0x073946);
      put(glossMat, tint(new T.TubeGeometry(new T.CatmullRomCurve3(loop(1, 0.004), true), 144, 0.0065, 8, true), 0xcdd6d9));
      const grip = []; for (let k = 0; k <= 12; k++) grip.push(top(TH, lerp(-A * 0.86, A * 0.86, k / 12), 0.006));
      put(glossMat, tint(new T.TubeGeometry(new T.CatmullRomCurve3(grip), 36, 0.0085, 10), 0xcdd6d9));
      // the door on the skirt's right side, and the blue round of its latch
      const door = []; for (let k = 0; k < 40; k++) { const w = (k / 40) * Math.PI * 2; door.push(right(0.5 + sgnPow(Math.cos(w), 2 / 5) * 0.13, 0.052 + sgnPow(Math.sin(w), 2 / 5) * 0.035, 0.0008)); }
      strip(door, 0.0017, 0xe2e8ea, true);
      const latch = right(0.52, 0.054, 0.001), ln = outOf((a, b) => onSide(a, b, 1), 0.52, 0.054, V3(1, 0, 0)), lq = new T.Quaternion().setFromUnitVectors(V3(0, 1, 0), ln);
      gloss(cyl(0.013, 0.013, 0.004, 24).applyQuaternion(lq).translate(latch.x, latch.y, latch.z), 0x1a8aa3);
      gloss(cyl(0.0055, 0.0055, 0.005, 16).applyQuaternion(lq).translate(latch.x, latch.y, latch.z), 0x15262c);
      // the foot that folds out under the face, four small feet, and the cord down behind the sideboard
      gloss(rbox(0.1, 0.008, 0.05, 0.003, 0, 0.004, ZF - 0.035), 0x1b8ca4);
      for (const [fx, fz] of [[-0.13, ZF - 0.05], [0.13, ZF - 0.05], [-0.1, ZF - 0.33], [0.1, ZF - 0.33]]) gloss(mv(cyl(0.011, 0.013, 0.01, 12), fx, 0.005, fz), 0xb9c3c6);
      matte(new T.TubeGeometry(new T.CatmullRomCurve3([V3(0.03, FEET + 0.04, ZF - D + 0.03), V3(0.05, FEET + 0.005, ZF - D + 0.005), V3(0.1, -0.02, ZF - D - 0.008), V3(0.18, -0.06, ZF - D - 0.01)]), 20, 0.003, 5), 0xd9dddf);
    });
  })();

  /* ───────────────────────── a rug, a print, a plant ───────────────────────── */
  await slice();
  (function buildRug() {
    // jute, bound at its edge; it does not lie quite flat
    const g = new T.BoxGeometry(RUG.w, RUG.h, RUG.d, 44, 1, 32), p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), top = p.getY(i) > 0 ? 1 : 0;
      if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, x / 0.36, z / 0.36); else uv.setXY(i, (x + z) / 0.36, p.getY(i) / 0.36);
      if (top) p.setY(i, p.getY(i) + 0.001 * Math.sin(x * 5.1 + 1) * Math.sin(z * 4.3) + 0.0006 * Math.sin(x * 13 + z * 9));
    }
    g.computeVertexNormals();
    put(rugMat, mv(g, RUG.x, RUG.h / 2, RUG.z));
    const hw = RUG.w / 2, hd = RUG.d / 2, pts = [], r = 0.03;
    for (const [cx, cz, a0] of [[hw - r, hd - r, 0], [-hw + r, hd - r, 1], [-hw + r, -hd + r, 2], [hw - r, -hd + r, 3]]) for (let k = 0; k <= 4; k++) { const a = (a0 + k / 4) * Math.PI / 2; pts.push(V3(RUG.x + cx + Math.cos(a) * r, RUG.h * 0.6, RUG.z + cz + Math.sin(a) * r)); }
    matte(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true, 'catmullrom', 0.01), 200, 0.0085, 6, true), 0x6a5236);
  })();
  await slice();
  const glassMat = M({ color: 0x000000, roughness: 0.05, metalness: 0, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
  glassMat.userData.envK = 1.4; envMats.push(glassMat);
  (function buildPrint() {
    // framed behind glass, on the wall left of the window
    const px = -1.36, py = 1.56, pw = 0.5, ph = pw * 704 / 512, fr = 0.016, z0 = ROOM.zBack;
    put(printMat, mv(new T.PlaneGeometry(pw, ph), px, py, z0 + 0.012));
    matte(rbox(pw + 0.01, ph + 0.01, 0.01, 0, px, py, z0 + 0.005), 0x2a2019);
    for (const b of [[px - pw / 2 - fr, px + pw / 2 + fr, py + ph / 2, py + ph / 2 + fr], [px - pw / 2 - fr, px + pw / 2 + fr, py - ph / 2 - fr, py - ph / 2], [px - pw / 2 - fr, px - pw / 2, py - ph / 2, py + ph / 2], [px + pw / 2, px + pw / 2 + fr, py - ph / 2, py + ph / 2]])
      gloss(rbox(b[1] - b[0], b[3] - b[2], 0.03, 0.003, (b[0] + b[1]) / 2, (b[2] + b[3]) / 2, z0 + 0.015), 0x120e0b);
    const gm = new T.Mesh(new T.PlaneGeometry(pw, ph), glassMat); gm.position.set(px, py, z0 + 0.016); scene.add(gm);
  })();
  await slice();
  const leafGeo = (w, h, curl, droop) => {                // a leaf plane with its base at the origin, curled back at the edges and the tip
    const g = new T.PlaneGeometry(w, h, 6, 8); g.translate(0, h / 2, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / h; p.setZ(i, -curl * x * x * w - droop * y * y * h); }
    g.computeVertexNormals();
    return g;
  };
  const leafMat = M({ map: ficusTex, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.34 });
  leafMat.userData.envK = 0.9; envMats.push(leafMat);
  const barkMat = M({ color: 0x4a3a26, roughness: 0.8 });
  const soilMat = M({ color: 0x1c130c, roughness: 1 });
  (function rubberPlant() {
    // a tall rubber plant by the left wall, three stems out of one glazed planter on a walnut stand
    const x = -1.4, z = -0.24, rnd = mulberry(29), PH = 0.14;
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; put(furnMat, rod(V3(x + Math.cos(a) * 0.17, 0, z + Math.sin(a) * 0.17), V3(x + Math.cos(a) * 0.12, PH + 0.1, z + Math.sin(a) * 0.12), 0.011, 0.016)); }
    put(furnMat, mv(new T.TorusGeometry(0.145, 0.012, 8, 40), x, PH - 0.012, z, 0, Math.PI / 2));
    gloss(mv(lathe([[0, 0.006], [0.12, 0], [0.15, 0.012], [0.172, 0.1], [0.176, 0.29], [0.17, 0.3], [0.158, 0.3], [0.156, 0.28], [0, 0.28]], 48), x, PH, z), 0x8a7a5e);
    put(soilMat, mv(new T.CircleGeometry(0.157, 32), x, PH + 0.262, z, 0, -Math.PI / 2));
    const stems = [[0.0, 0.0, 1.78, 0.1, -0.02], [0.06, 0.05, 1.42, 0.2, 0.16], [-0.05, -0.04, 1.12, -0.06, -0.2]];
    stems.forEach(([ox, oz, top, lx, lz], s) => {
      const base = V3(x + ox, PH + 0.26, z + oz), end = V3(clamp(x + ox + lx, -1.7, 1), top, z + oz + lz);
      const curve = new T.CatmullRomCurve3([base, base.clone().lerp(end, 0.35).add(V3(lx * 0.25, 0, lz * 0.25)), base.clone().lerp(end, 0.72).add(V3(-lx * 0.1, 0, -lz * 0.1)), end]);
      put(barkMat, new T.TubeGeometry(curve, 30, 0.011 - s * 0.0015, 7));
      const n = 16 + ((top - 0.9) * 14 | 0);
      for (let i = 0; i < n; i++) {
        const t = 0.16 + 0.84 * (i / (n - 1)), p = curve.getPoint(t), a = i * 2.39996 + s * 1.3, young = smooth(t, 0.6, 1);
        const el = lerp(0.05, 1.0, young) + (rnd() - 0.5) * 0.4, len = lerp(0.32, 0.2, young) * (0.85 + rnd() * 0.3);
        let ox2 = Math.cos(a), oz2 = Math.sin(a);
        if (p.x + ox2 * len < ROOM.xMin + 0.08) ox2 = Math.abs(ox2) * 0.4;             // nothing grows into the wall
        const dir = V3(ox2 * Math.cos(el), Math.sin(el), oz2 * Math.cos(el)).normalize();
        const nrm = V3(0, 1, 0).addScaledVector(dir, -dir.y).normalize(), side = V3().crossVectors(dir, nrm);
        const lg = leafGeo(len * 0.56, len, 0.1, 0.3 - 0.24 * young);
        lg.applyMatrix4(new T.Matrix4().makeBasis(side, dir, nrm).setPosition(p.x + dir.x * 0.03, p.y + dir.y * 0.03, p.z + dir.z * 0.03));
        put(leafMat, lg);
        put(barkMat, rod(p, p.clone().addScaledVector(dir, 0.034), 0.003, 0.0025, 5));
      }
    });
  })();

  /* ───────────────────────── lived in, in the nineties: a Discman, discs out of their cases, magazines, a cordless phone ───────────────────────── */
  await slice();
  const discmanMat = M({ map: discmanTex, roughness: 0.36 }); discmanMat.userData.envK = 1; envMats.push(discmanMat);
  const discMat = M({ map: discTex, roughness: 0.16, metalness: 0.85 }); discMat.userData.envK = 0.9; envMats.push(discMat);
  const phoneMat = M({ map: phoneTex, roughness: 0.5 });
  const cdDisc = (x, y, z, ry, rx) => { const g = new T.RingGeometry(0.0075, 0.06, 56, 1); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + p.getX(i) / 0.122, 0.5 - p.getZ(i) / 0.122); put(discMat, mv(g, x, y, z, ry, rx)); };
  function magazines(rnd, x, y, z, ry, covers) {         // a pile of magazines, none square to the next
    let yy = y;
    covers.forEach((cv, k) => {
      const th = 0.004 + rnd() * 0.003, r = ry + (rnd() - 0.5) * 0.5, ox = (rnd() - 0.5) * 0.03, oz = (rnd() - 0.5) * 0.03;
      matte(rbox(0.21, th, 0.275, 0.0008, x + ox, yy + th / 2, z + oz, r), 0xe6dfd0);
      put(coverMat, mv(coverPlane(cv, 0.208, 0.273), x + ox, yy + th + 0.0004, z + oz, r));
      yy += th + 0.0006;
    });
    return yy;
  }
  await slice();
  (function nineties() {
    const rnd = mulberry(303), Y = RUG.h + 0.0016;
    at(0, 0, -0.09, 0, () => {
      // on the rug, in front of the ottoman: the Discman, its headphones, the lead between them
      at(-0.25, Y, 0.44, 0.5, () => {
        gloss(mv(roundedBox(0.134, 0.027, 0.146, 0.012, 6, 3, 6), 0, 0.0135, 0), 0x3c3e44);
        const top = new T.CircleGeometry(0.062, 48); top.rotateX(-Math.PI / 2);
        put(discmanMat, mv(top, 0, 0.0294, -0.004));
        gloss(mv(cyl(0.064, 0.066, 0.004, 48), 0, 0.027, -0.004), 0x4a4c52);
        for (let k = 0; k < 4; k++) gloss(rbox(0.014, 0.005, 0.006, 0.001, -0.03 + k * 0.02, 0.016, 0.0735), k === 0 ? 0xd8d2c4 : 0x8a877e);     // play, stop, skip
        gloss(rbox(0.006, 0.008, 0.02, 0.001, 0.0675, 0.014, 0.02), 0x8a877e);                                                             // the volume wheel
        metal(mv(cyl(0.003, 0.003, 0.012, 8), 0.07, 0.013, -0.03, 0, 0, Math.PI / 2), 0xb08a4a);                                                // the jack
      });
      const hp = V3(-0.02, Y, 0.56);
      at(hp.x, hp.y, hp.z, -0.5, () => {
        const band = new T.TorusGeometry(0.078, 0.0022, 6, 40, Math.PI * 1.08); band.rotateZ(-Math.PI * 0.04);
        metal(mv(band, 0, 0.03, -0.004, 0, -1.28), 0x8a8c90);
        for (const sx of [-1, 1]) {
          at(sx * 0.078, 0.0, 0.0, 0, () => {
            matte(mv(cyl(0.031, 0.033, 0.016, 28), 0, 0.008, 0), 0x17171a);                    // foam pad
            gloss(mv(cyl(0.024, 0.026, 0.01, 24), 0, 0.021, 0), 0x25262a);                     // the driver's cap
            gloss(rbox(0.008, 0.006, 0.03, 0.002, 0, 0.028, -0.012), 0x25262a);
          }, sx * 0.0, sx * -0.12);
        }
      });
      const lead = [V3(-0.25 + 0.07 * Math.cos(0.5) - 0.03 * Math.sin(0.5), Y + 0.013, 0.44 - 0.07 * Math.sin(0.5) - 0.03 * Math.cos(0.5)), V3(-0.16, Y + 0.002, 0.345), V3(-0.11, Y + 0.002, 0.41), V3(-0.17, Y + 0.002, 0.52), V3(-0.13, Y + 0.004, 0.565), V3(-0.108, Y + 0.012, 0.546)];
      matte(new T.TubeGeometry(new T.CatmullRomCurve3(lead), 48, 0.0013, 5), 0x0c0c0c);
      // to the right: three discs out, one case open, its disc on the rug, the booklet of another unfolded
      cdCase(7, 0.3, Y, 0.42, -0.35, true);
      cdDisc(0.2, Y + 0.0012, 0.56, 0.4, 0);
      cdCase(2, 0.42, Y, 0.55, 0.5); cdCase(5, 0.415, Y + CD.t * 0.55 + 0.0052, 0.565, 0.18);
      at(0.56, Y, 0.38, -0.2, () => {                      // a booklet, open face down, tented on its fold
        for (const sx of [-1, 1]) at(0, 0.0218, 0, 0, () => { matte(rbox(0.12, 0.0012, 0.12, 0, sx * 0.0595, 0, 0), 0xe9e2d2); put(coverMat, mv(coverPlane(sx > 0 ? 3 : 6, 0.118, 0.118), sx * 0.0595, 0.0008, 0)); }, 0, sx * -0.18);
      });
    });
    // behind the ottoman, by the sideboard: the magazines, a mug gone cold on top
    const mt = magazines(rnd, -0.62, 0.001, -1.22, 0.3, [10, 8, 11, 9, 8]);
    at(-0.6, mt, -1.2, 1.1, () => {
      gloss(lathe([[0, 0], [0.034, 0], [0.038, 0.004], [0.04, 0.085], [0.037, 0.085], [0.035, 0.008], [0, 0.008]], 28), 0xc9541e);
      gloss(mv(new T.CircleGeometry(0.0355, 24), 0, 0.06, 0, 0, -Math.PI / 2), 0x1a0f08);
      const h = new T.TorusGeometry(0.024, 0.0055, 8, 20, Math.PI); h.rotateZ(-Math.PI / 2);
      gloss(mv(h, 0.04, 0.044, 0), 0xc9541e);
    });
    magazines(rnd, 0.3, RUG.h + 0.0015, -0.8, -0.9, [9, 11]);
  })();
  // a side table by the chair's arm, under the arc lamp: the cordless phone on its base, a glass, a paperback face down
  await slice();
  (function sideTable() {
    const sx = 0.5, sz = -1.17, TOP = 0.5;
    at(sx, 0, sz, 0, () => {
      gloss(lathe([[0, 0], [0.16, 0], [0.165, 0.006], [0.15, 0.014], [0.06, 0.03], [0.022, 0.07], [0.017, 0.2], [0.017, 0.44], [0.04, TOP - 0.03], [0.1, TOP - 0.022], [0, TOP - 0.022]], 40), BLACK);
      put(furnMat, mv(lathe([[0, 0], [0.215, 0], [0.228, 0.006], [0.23, 0.016], [0.224, 0.022], [0, 0.022]], 56), 0, TOP - 0.022, 0));
      // the phone: a charging base, the handset lying in it, two antennas
      at(-0.07, TOP, -0.06, 0.5, () => {
        const base = bevelBox(0.1, 0.03, 0.2, 0.006), bp = base.attributes.position;
        for (let i = 0; i < bp.count; i++) if (bp.getY(i) > 0) bp.setY(i, bp.getY(i) + (0.06 - bp.getZ(i)) * 0.09);
        base.computeVertexNormals();
        gloss(mv(base, 0, 0.015, 0), 0x2b2a28);
        at(0, 0.043, 0.0, 0, () => {
          gloss(mv(roundedBox(0.054, 0.026, 0.19, 0.012, 4, 3, 8), 0, 0, 0), 0x333230);
          put(phoneMat, mv(new T.PlaneGeometry(0.044, 0.17), 0, 0.0134, 0, 0, -Math.PI / 2));
          matte(rod(V3(0.018, 0.004, -0.092), V3(0.02, 0.012, -0.15), 0.0035, 0.003, 8), BLACK);
        }, -0.09);
        metal(rod(V3(-0.036, 0.03, -0.085), V3(-0.05, 0.19, -0.11), 0.0022, 0.0015, 6), CHROME);
        gloss(mv(new T.SphereGeometry(0.0025, 8, 6), 0.03, 0.036, 0.085), 0xff3a1a);
      });
      gloss(lathe([[0, 0], [0.03, 0], [0.034, 0.004], [0.036, 0.1], [0.034, 0.1], [0.032, 0.012], [0, 0.012]].map((q) => [q[0], q[1] + TOP]), 24).translate(0.1, 0, -0.08), 0x6a4a2a);
      const bk = book(0.022, 0.18, 0.115, 13, true); put(bookMat, mv(bk, 0.04, TOP + 0.011, 0.11, 2.2));
      cdCase(0, -0.1, TOP, 0.13, -0.6);
    });
  })();
  // by the left wall: a tower of compact discs, a slot each
  await slice();
  (function cdTower() {
    const rnd = mulberry(77), H = 1.06;
    at(ROOM.xMin + 0.012, 0, -1.12, Math.PI / 2, () => {
      gloss(rbox(0.21, 0.02, 0.18, 0.004, 0, 0.01, 0.09), BLACK);
      for (const sx of [-1, 1]) gloss(rbox(0.014, H, 0.15, 0.003, sx * 0.086, 0.02 + H / 2, 0.08), BLACK);
      gloss(rbox(0.186, H, 0.006, 0, 0, 0.02 + H / 2, 0.008), 0x0c0b0a);
      gloss(rbox(0.2, 0.014, 0.165, 0.004, 0, 0.02 + H + 0.007, 0.085), BLACK);
      for (let k = 0; k < 62; k++) {
        const y = 0.034 + k * 0.0166;
        for (const sx of [-1, 1]) gloss(rbox(0.006, 0.002, 0.12, 0, sx * 0.076, y - 0.0012, 0.08), 0x1c1a18);
        if (rnd() < 0.14 || k > 58) continue;
        gloss(mv(new T.BoxGeometry(CD.d, CD.t - 0.0006, CD.h), (rnd() - 0.5) * 0.004, y + CD.t / 2, 0.012 + CD.h / 2 + 0.012 + rnd() * 0.01), CD_COL[(rnd() * CD_COL.length) | 0]);
      }
      cdPile(rnd, 0.01, 0.02 + H + 0.014, 0.16, 4);
    });
  })();
  await slice();
  flush();

  /* ───────────────────────── lights ───────────────────────── */
  // dusk: a low sun through the blinds, dim; the room is lit by the arc lamp and the iMac's screen and falls off to black away from them
  await slice();
  const hemi = new T.HemisphereLight(0xffffff, 0xffffff, 1); scene.add(hemi);
  const sun = new T.SpotLight(0xffffff, 10, 0, 0.03, 0.2, 0);
  sun.position.copy(SUN_POS); sun.target.position.copy(G0).addScaledVector(SUN_DIR, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = true;
  sun.shadow.camera.near = 36; sun.shadow.camera.far = 50; sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.01; sun.shadow.radius = 2.5;
  scene.add(sun, sun.target);
  const fill = new T.DirectionalLight(0xa9bfe6, 0.3); fill.position.set(1.4, 2.4, 4); scene.add(fill);
  const bounce = new T.PointLight(0xff9a55, 2, 4, 2); bounce.position.set(0.3, 0.4, 0.35); scene.add(bounce);       // what the sun's patch on the rug gives back
  // the arc lamp: most of its light falls out of the open underside of the globe, the rest glows through the glass
  const arcSpot = new T.SpotLight(0xffffff, 10, 0, 1.15, 0.9, 2);
  arcSpot.position.set(ARC.gx, ARC.gy - 0.03, ARC.gz); arcSpot.target.position.set(ARC.gx - 0.22, 0, ARC.gz + 0.4);
  arcSpot.castShadow = true; arcSpot.shadow.mapSize.set(1024, 1024); arcSpot.shadow.autoUpdate = false; arcSpot.shadow.needsUpdate = true; arcSpot.shadow.camera.near = 0.2; arcSpot.shadow.camera.far = 6;
  arcSpot.shadow.bias = -0.0008; arcSpot.shadow.normalBias = 0.02; arcSpot.shadow.radius = 5;
  scene.add(arcSpot, arcSpot.target);
  const arcGlow = new T.PointLight(0xffffff, 2, 5, 2); arcGlow.position.set(ARC.gx, ARC.gy, ARC.gz); scene.add(arcGlow);
  // the iMac's screen: yellow on black, so a little warm light, on what is in front of it. A spot just off the middle
  // of the glass, pointing out square to the leaning face, with a cone too wide to see the edge of: the room in front
  // is in it, while the glass and the face round it are behind it, so neither shows it back nor lights up with it.
  const screenLight = new T.SpotLight(0xffd06a, 1, 2.4, Math.PI / 2 - 0.02, 0.25, 2);
  const glassOut = V3(0, Math.sin(0.17), Math.cos(0.17)).applyAxisAngle(V3(0, 1, 0), IMAC.ry);
  screenLight.position.set(IMAC.x, IMAC.y + 0.228, IMAC.z).addScaledVector(V3(Math.sin(IMAC.ry), 0, Math.cos(IMAC.ry)), 0.2);
  screenLight.target.position.copy(screenLight.position).add(glassOut);
  scene.add(screenLight, screenLight.target);

  /* ───────────────────────── the puzzles: an Axis Cube, a 3×3, a 2×2 and a Ghost Cube ───────────────────────── */
  await slice();
  const FACE_N = [V3(1, 0, 0), V3(-1, 0, 0), V3(0, 1, 0), V3(0, -1, 0), V3(0, 0, 1), V3(0, 0, -1)];
  const FACE_COL = ['#1e96f0', '#19c96a', '#d9f531', '#f4f1ea', '#ff641f', '#ef2b45'].map((h) => new T.Color(h));
  const CUT = 1 / 3, GAP = 0.012, STK_M = 0.048, STK_R = 0.05, STK_H = 0.014, STK_RIM = 0.014;
  const HOLLOW = 0.082, HOLLOW_R = 0.028, HOLLOW_COL = new T.Color(0.02, 0.02, 0.024);   // the Ghost Cube's stickers are white outlines: how wide the band is, and the dark that shows through

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

  const bodyMat = M({ color: 0x0b0b0d, roughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.35 }, true);
  const stickerMat = M({ vertexColors: true, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.18 }, true);
  stickerMat.onBeforeCompile = (sh) => {
    // fluorescent plastic: a little of its own colour comes back even in shade
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * 0.16;');
  };
  envMats.push(bodyMat, stickerMat);

  /* A puzzle is a cube cut across three turning axes, into three layers each (two on the 2×2). On the Axis Cube
     the axes are tilted inside the cube; on the 3×3 and the 2×2 they are square to its faces. On the Ghost Cube
     one axis runs close to the cube's long diagonal, and in the solved cube the three layers along it are each
     turned by its own angle about it: the outer two about 27° either way from the middle one. So the cuts across
     the layers do not run on from one layer to the next: on a face they break at each layer's edge, which is
     what makes its Xs and its long six-sided pieces. To turn anything else the layers are first brought into
     line (and the cube is then no cube). Each sticker is a thick white frame round black, the shape of its face:
     it is solved by shape alone. Each puzzle keeps its own pieces and its own history of turns, its place on the ottoman and the pose
     it floats in. */
  const ROT = [[1, 0, 0, 0, 0, -1, 0, 1, 0], [0, 0, 1, 0, 1, 0, -1, 0, 0], [0, -1, 0, 1, 0, 0, 0, 0, 1]];
  const mul3 = (A, B) => { const C = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return C; };
  const tr3 = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
  const apply3 = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
  const m4 = new T.Matrix4(), tmpV = V3();
  const cellOf = (p) => apply3(p.M, p.cell0);
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const AX_TILTED = [V3(2, 2, -1).multiplyScalar(1 / 3), V3(2, -1, 2).multiplyScalar(1 / 3), V3(1, -2, -2).multiplyScalar(1 / 3)];
  const AX_SQUARE = [V3(1, 0, 0), V3(0, 1, 0), V3(0, 0, 1)];
  // The Ghost Cube's mechanism, measured from a photograph of one: its three faces in view were squared up, and the
  // layers' axis, its place in the cube and each layer's turn were fitted until the seams lay on the photograph's.
  // The axis the layers are stacked on is AX[0]; the other two are the middle layer's.
  const GHOST_UP = V3(-0.607, 0.484, 0.63).normalize();
  const GHOST_E1 = V3().crossVectors(GHOST_UP, V3(0, 1, 0)).normalize(), GHOST_E2 = V3().crossVectors(GHOST_UP, GHOST_E1);
  const GHOST_MID = T.MathUtils.degToRad(63.3);
  const AX_GHOST = [GHOST_UP,
    GHOST_E1.clone().multiplyScalar(Math.cos(GHOST_MID)).addScaledVector(GHOST_E2, Math.sin(GHOST_MID)),
    GHOST_E1.clone().multiplyScalar(-Math.sin(GHOST_MID)).addScaledVector(GHOST_E2, Math.cos(GHOST_MID))];
  // tilt: how it is turned toward the viewer when it floats. The Axis Cube and the Ghost Cube barely, so their
  // mechanisms stay square to the screen under their askew shells; the other two in the usual three-quarter view,
  // top and right face showing. stk: a puzzle's own stickers (see SK below).
  const KINDS = {
    axis: { axes: AX_TILTED, n: 3, tilt: [0.16, -0.22], scale: CUBE_SCALE },
    cube3: { axes: AX_SQUARE, n: 3, tilt: [0.46, -0.6], scale: CUBE_SCALE * 0.92 },
    cube2: { axes: AX_SQUARE, n: 2, tilt: [0.46, -0.6], scale: CUBE_SCALE * 0.8 },
    // off: where the cube's centre is, seen from the mechanism's. twist: in the solved cube, how far the bottom, the
    // middle and the top layer along AX[0] are turned about it
    ghost: { axes: AX_GHOST, n: 3, tilt: [0.16, -0.22], scale: CUBE_SCALE * 0.92, off: V3(0.034, 0.075, -0.038), twist: [-27.5, 0, 26.7].map(T.MathUtils.degToRad), hollow: true, stk: { m: 0.04, r: 0.02, band: 0.078, hr: 0.012 } }
  };
  function makePuzzle(spot) {
    const kind = KINDS[spot.key], AX = kind.axes, n = kind.n;
    const SK = Object.assign({ m: STK_M, r: STK_R, band: HOLLOW, hr: HOLLOW_R }, kind.stk);   // the stickers: margin to the piece's edge, corner radius, and for a hollow one its band and inner radius
    const P = {
      key: spot.key, spot, n, axes: AX, scale: kind.scale, group: new T.Group(), pieces: [],
      BAS: [AX[0].x, AX[1].x, AX[2].x, AX[0].y, AX[1].y, AX[2].y, AX[0].z, AX[1].z, AX[2].z],
      sim: { history: [], queue: 0, target: 'solved', cur: null, last: null, fast: false, onIdle: null }, qAnim: new T.Quaternion(),
      tilt: new T.Quaternion().setFromEuler(new T.Euler(kind.tilt[0], kind.tilt[1], 0)),
      restQ: new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), spot.yaw), restPos: V3(), playQ: new T.Quaternion(),
      lift: 0, liftV: 0, liftT: 0, ex: 0, exV: 0, exT: 0, press: 0, pressT: 0, pull: 0, pullT: 0,
      twist: kind.twist || null, tw: 1, twV: 0          // tw: how far its layers are turned out of line, 1 in the solved cube, 0 to turn anything else
    };
    P.BAS_T = tr3(P.BAS); P.tiltInv = P.tilt.clone().invert(); P.playQ.copy(P.restQ);
    // presented with its mechanism square to the screen: one turning axis up, one to the right, one at the viewer
    const zv = V3().crossVectors(AX[1], AX[0]);
    P.present = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().set(
      AX[1].x, AX[1].y, AX[1].z, 0, AX[0].x, AX[0].y, AX[0].z, 0, zv.x, zv.y, zv.z, 0, 0, 0, 0, 1));
    const cells = n === 3 ? [-1, 0, 1] : [-1, 1];
    for (const i of cells) for (const j of cells) for (const k of cells) {
      if (!i && !j && !k) continue;
      // a piece is cut with the layers in line, so from the cube as it stands once its own layer has been turned back
      const back = P.twist && P.twist[i + 1] ? new T.Quaternion().setFromAxisAngle(AX[0], -P.twist[i + 1]) : null;
      const planes = FACE_N.map((nn, f) => ({ n: back ? nn.clone().applyQuaternion(back) : nn, d: 1 + (kind.off ? nn.dot(kind.off) : 0), kind: 'outer', face: f }));
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
        const nn = f.plane.n, col = kind.hollow ? FACE_COL[3] : FACE_COL[f.plane.face];
        const U = (Math.abs(nn.y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0)).cross(nn).normalize(), W = V3().crossVectors(nn, U), O = f.pts[0];
        const poly = f.pts.map((p) => { const d = p.clone().sub(O); return [d.dot(U), d.dot(W)]; });
        const core = inset2D(poly, SK.m + SK.r);
        if (!core) continue;
        const top = roundOutline(core, SK.r, 6), base = roundOutline(core, SK.r + STK_RIM, 6);
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
        const mid = kind.hollow ? inset2D(poly, SK.m + SK.band + SK.hr) : null;   // a hollow sticker: its middle is the body showing through. Too small a sticker stays whole
        if (mid) {
          const ring = roundOutline(mid, SK.hr, 4), H = STK_H + 0.003;
          let cx = 0, cy = 0; ring.forEach((q) => { cx += q[0]; cy += q[1]; }); cx /= ring.length; cy /= ring.length;
          const Cm = P3([cx, cy], H);
          for (let t = 0; t < ring.length; t++) for (const v of [Cm, P3(ring[t], H), P3(ring[(t + 1) % ring.length], H)]) { sp.push(v.x, v.y, v.z); sn.push(nn.x, nn.y, nn.z); sc.push(HOLLOW_COL.r, HOLLOW_COL.g, HOLLOW_COL.b); }
        }
      }
      const group = new T.Group();
      const body = new T.Mesh(geoFrom(bp, bn), bodyMat); body.castShadow = true; body.receiveShadow = true; group.add(body);
      if (sp.length) { const st = new T.Mesh(geoFrom(sp, sn, sc), stickerMat); st.castShadow = true; st.receiveShadow = true; group.add(st); }
      // where layers turn out of line, a piece hangs in a holder that carries its layer's turn
      const holder = P.twist ? new T.Group() : null;
      if (holder) { holder.add(group); P.group.add(holder); } else P.group.add(group);
      P.pieces.push({ group, holder, cell0: [i, j, k], M: [1, 0, 0, 0, 1, 0, 0, 0, 1], qBase: new T.Quaternion(), verts: fin.verts });
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
      sound.step();
    }
  }
  const twistQ = new T.Quaternion();
  const atHome = (P) => P.pieces.every((p) => p.M[0] === 1 && p.M[4] === 1 && p.M[8] === 1);   // every piece where it started, the way it started
  function settle(P) {                                  // where it rests: on its lowest point, in the hollow it makes in the cushion
    let lo = Infinity;
    const out = P.twist && atHome(P);                    // solved, it rests as the cube, its layers turned out of line
    for (const p of P.pieces) {
      const tq = out ? twistQ.setFromAxisAngle(P.axes[0], P.twist[cellOf(p)[0] + 1]) : null;
      for (const v of p.verts) { tmpV.copy(v).applyQuaternion(p.qBase); if (tq) tmpV.applyQuaternion(tq); tmpV.applyQuaternion(P.restQ); if (tmpV.y < lo) lo = tmpV.y; }
    }
    P.restPos.set(P.spot.x, P.spot.y - lo * P.spot.s, P.spot.z);
  }
  await slice();
  const puzzles = SPOTS.map(makePuzzle);
  puzzles.forEach((P) => { settle(P); P.group.position.copy(P.restPos); P.group.quaternion.copy(P.restQ); P.group.scale.setScalar(P.spot.s); });
  await slice();
  const beam = { pos: CUBE_HOME.clone() };             // where the floating puzzle stands in the sun, for its shadow in the haze

  /* ───────────────────────── dust ───────────────────────── */
  const DUST_BOX = { min: V3(-1.1, 0.1, -1.9), size: V3(2.6, 2.1, 3.6) };
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
  // Dust: five sheets of specks drifting across the view, lit only where the sunbeam is (they are multiplied by the
  // light the shaft pass finds in the air along each ray, so nothing shows outside the beam or behind what blocks
  // it). They stand at five distances: the furthest are points, many and slow; each nearer sheet is larger, sparser
  // and a little faster; the nearest are small soft discs, out of focus. Each speck keeps a phase so it brightens and
  // dims as a flake turning would. It is one small texture read five times in the last pass: no particles to move
  // and nothing drawn over the room.
  const dustTex = (() => {
    const S = 512, d = new Uint8Array(S * S * 4), rnd = mulberry(99);
    const stamp = (cx, cy, reach, fn) => {                // write around a point, wrapping at the edges so the sheet tiles
      for (let y = Math.floor(cy - reach); y <= Math.ceil(cy + reach); y++) for (let x = Math.floor(cx - reach); x <= Math.ceil(cx + reach); x++) {
        fn((((y % S) + S) % S * S + ((x % S) + S) % S) * 4, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
      }
    };
    for (let i = 0; i < 96; i++) {                         // red: the specks, soft round dots; blue under each one: its phase
      const cx = rnd() * S, cy = rnd() * S, sg = 0.7 + rnd() * rnd() * 0.9, v = 80 + rnd() * 175, ph = Math.round(rnd() * 255);
      stamp(cx, cy, sg * 3, (k, r) => { d[k] = Math.min(255, d[k] + v * Math.exp(-r * r / (2 * sg * sg))); d[k + 2] = ph; });
    }
    for (let i = 0; i < 12; i++) {                         // green: a few flat discs, for the dust nearest the lens. Small: a wide blur reads as a smear on the glass
      const cx = rnd() * S, cy = rnd() * S, R = 4.5 + rnd() * 4, v = 50 + rnd() * 70;
      stamp(cx, cy, R + 2, (k, r) => { d[k + 1] = Math.min(255, d[k + 1] + v * (1 - smooth(r, R - 2, R + 1)) * (0.8 + 0.2 * r / R)); });
    }
    for (let k = 3; k < d.length; k += 4) d[k] = 255;
    const t = new T.DataTexture(d, S, S);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  })();

  /* ───────────────────────── post: light shafts, bloom, grade ───────────────────────── */
  await slice();
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
  // The light in the air is soft, so it is marched at half resolution, on its own; a small pass then lays it over the
  // room with the ambient occlusion.
  const shaftMat = new T.ShaderMaterial(Object.assign({
    uniforms: Object.assign({
      tDepth: { value: null }, uProjInv: { value: camera.projectionMatrixInverse }, uViewInv: { value: camera.matrixWorld },
      uCamPos: { value: camera.position }, uSunColor: { value: new T.Color(1, 0.8, 0.5) }, uStrength: { value: 2.5 }, uTime: { value: 0 }, uSMax: { value: 5.2 }, uFrame: { value: 0 }
    }, lightUniforms),
    fragmentShader: LIGHT_GLSL + `
      uniform sampler2D tDepth; uniform mat4 uProjInv; uniform mat4 uViewInv; uniform vec3 uCamPos;
      uniform vec3 uSunColor; uniform float uStrength; uniform float uTime; uniform float uSMax; uniform float uFrame;
      varying vec2 vUv;
      float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      void main(){
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
          const int N = 20;
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
        gl_FragColor = vec4(scat, 1.0);
      }`
  }, fsOpts));
  const compMat = new T.ShaderMaterial(Object.assign({
    uniforms: { tColor: { value: null }, tAO: { value: null }, tShaft: { value: null }, uHalfTexel: { value: new T.Vector2() } },
    fragmentShader: `
      uniform sampler2D tColor; uniform sampler2D tAO; uniform sampler2D tShaft; uniform vec2 uHalfTexel; varying vec2 vUv;
      void main(){                                                      // four taps between the half-size texels: a tent that also takes the grain off the march
        vec2 o = uHalfTexel;
        vec4 q = texture2D(tShaft, vUv + vec2(-o.x, -o.y)) + texture2D(tShaft, vUv + vec2(o.x, -o.y)) + texture2D(tShaft, vUv + vec2(-o.x, o.y)) + texture2D(tShaft, vUv + vec2(o.x, o.y));
        float ao = 0.25 * (texture2D(tAO, vUv + vec2(-o.x, -o.y)).r + texture2D(tAO, vUv + vec2(o.x, -o.y)).r + texture2D(tAO, vUv + vec2(-o.x, o.y)).r + texture2D(tAO, vUv + vec2(o.x, o.y)).r);
        gl_FragColor = vec4(texture2D(tColor, vUv).rgb * ao + q.rgb * 0.25, 1.0);
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
  // The lens: what is nearer or farther than the subject goes soft, by the circle of confusion of a real lens
  // (proportional to |1/focus - 1/depth|). Gathered at half resolution on a golden-angle spiral; bright points
  // weigh more, so out-of-focus lights open into discs. The alpha carries how blurred the pixel is.
  const DEPTH_GLSL = `
    uniform sampler2D tDepth; uniform vec2 uNF; uniform float uFocus; uniform float uAperture; uniform float uMaxPx;
    uniform vec2 uSubject; uniform vec2 uTan; uniform float uSubjectR; uniform float uField;
    float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).r; return uNF.x * uNF.y / (uNF.y - d * (uNF.y - uNF.x)); }
    float cocAt(vec2 uv, float z){                                       // sharp at the subject's distance, and softer again to its sides, as an old lens is away from where it was aimed
      float side = max(0.0, length((uv * 2.0 - 1.0 - uSubject) * uTan) * z - uSubjectR);
      float d = abs(1.0 / uFocus - 1.0 / z), sd = uField * min(side, 0.7);
      return min(uMaxPx, uAperture * sqrt(d * d + sd * sd));
    }`;
  const lensUniforms = { tDepth: { value: null }, uNF: { value: new T.Vector2(camera.near, camera.far) }, uFocus: { value: 2.6 }, uAperture: { value: 0 }, uMaxPx: { value: 8 },
    uSubject: { value: new T.Vector2() }, uTan: { value: new T.Vector2(0.46, 0.46) }, uSubjectR: { value: 0.6 }, uField: { value: 0 } };
  const subjV = new T.Vector3();
  const dofMat = new T.ShaderMaterial(Object.assign({
    uniforms: Object.assign({ tColor: { value: null }, uTexel: { value: new T.Vector2() }, uStep: { value: 1 } }, lensUniforms),
    fragmentShader: DEPTH_GLSL + `
      uniform sampler2D tColor; uniform vec2 uTexel; uniform float uStep; varying vec2 vUv;
      float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      void main(){
        float z0 = viewZ(vUv), c0 = cocAt(vUv, z0);
        vec3 col = texture2D(tColor, vUv).rgb; float tot = 1.0;
        vec2 pq = mod(floor(gl_FragCoord.xy), 2.0);
        float r = 1.2, a = (pq.x + 2.0 * pq.y) * 0.6 + ign(gl_FragCoord.xy) * 0.25;   // four turns of the spiral on a 2×2 pattern, which the fill pass then averages
        for (int i = 0; i < 16; i++) {
          a += 2.39996;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * uTexel * r;
          vec3 sm = min(texture2D(tColor, uv).rgb, vec3(24.0));
          float zs = viewZ(uv), cs = cocAt(uv, zs);
          if (zs > z0) cs = min(cs, c0 * 2.0);                       // what is behind does not bleed over what is sharp in front
          float m = smoothstep(r - 0.5, r + 0.5, cs), w = 1.0 + dot(sm, vec3(0.5));
          col += mix(col / tot, sm, m) * w; tot += w;
          r += uStep / r;
        }
        gl_FragColor = vec4(col / tot, c0 / uMaxPx);
      }`
  }, fsOpts));
  const dofFillMat = new T.ShaderMaterial(Object.assign({                 // the gather is sparse and dithered; a small tent filter fills it in
    uniforms: { tSrc: { value: null }, uTexel: { value: new T.Vector2() } },
    fragmentShader: `
      uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
      void main(){
        vec4 c = texture2D(tSrc, vUv) * 0.25;
        c += (texture2D(tSrc, vUv + vec2(1.0, 0.0) * uTexel) + texture2D(tSrc, vUv - vec2(1.0, 0.0) * uTexel) + texture2D(tSrc, vUv + vec2(0.0, 1.0) * uTexel) + texture2D(tSrc, vUv - vec2(0.0, 1.0) * uTexel)) * 0.125;
        c += (texture2D(tSrc, vUv + vec2(1.0, 1.0) * uTexel) + texture2D(tSrc, vUv - vec2(1.0, 1.0) * uTexel) + texture2D(tSrc, vUv + vec2(1.0, -1.0) * uTexel) + texture2D(tSrc, vUv - vec2(1.0, -1.0) * uTexel)) * 0.0625;
        gl_FragColor = c;
      }`
  }, fsOpts));
  // The grade. For the analogue look it is film: halation (the bloom comes back red-orange), a trace of colour
  // fringing toward the corners, shadows that lean green-blue under warm lights, and grain that sits in the
  // midtones. The other two looks take the same grade without grain, and are inked and painted afterwards.
  const finalMat = new T.ShaderMaterial(Object.assign({
    uniforms: Object.assign({ tColor: { value: null }, tBlur: { value: null }, tBloom: { value: null }, uBloom: { value: 0.5 }, uExposure: { value: 1 }, uVignette: { value: 0.5 }, uTime: { value: 0 }, uFade: { value: 0 },
      uTint: { value: new T.Color(1, 1, 1) }, uLift: { value: new T.Color(0, 0, 0) }, uSat: { value: 1 }, uContrast: { value: 0 }, uBlack: { value: 0 },
      uDof: { value: 0 }, uHalation: { value: 0 }, uCA: { value: 0 }, uCAMin: { value: 1e-7 }, uGrain: { value: 0.02 }, uSplit: { value: new T.Vector3() }, uWarm: { value: new T.Vector3() },
      tShaft: { value: null }, tDust: { value: dustTex }, uDust: { value: 0 }, uAspect: { value: 1 }, uPan: { value: new T.Vector2() } }, lensUniforms),
    fragmentShader: DEPTH_GLSL + `
      uniform sampler2D tColor; uniform sampler2D tBlur; uniform sampler2D tBloom; uniform float uBloom; uniform float uExposure; uniform float uVignette; uniform float uTime; uniform float uFade;
      uniform vec3 uTint; uniform vec3 uLift; uniform float uSat; uniform float uContrast; uniform float uBlack;
      uniform float uDof; uniform float uHalation; uniform float uCA; uniform float uCAMin; uniform float uGrain; uniform vec3 uSplit; uniform vec3 uWarm;
      uniform sampler2D tShaft; uniform sampler2D tDust; uniform float uDust; uniform float uAspect; uniform vec2 uPan;
      varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      // p: the view, one unit tall, slid by where the camera looks. Each sheet is the same texture turned, scaled and set
      // drifting up and across at its own pace, with a slow sway: the further the sheet, the smaller and the slower.
      vec4 sheet(vec2 p, float t, float turn, float scale, vec2 drift, float swayT, vec2 at){
        float cs = cos(turn), sn = sin(turn);
        return texture2D(tDust, vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y) * scale + drift * t + 0.016 * vec2(sin(t * swayT), cos(t * swayT * 0.83 + at.x * 5.0)) + at);
      }
      float glint(vec4 s, float t, float rate){ return s.r * (0.55 + 0.45 * sin(t * rate + s.b * 6.2832)); }
      float motes(vec2 p, float t){
        float m = 0.5 * glint(sheet(p, t, 0.0, 5.6, vec2(0.010, -0.030), 0.23, vec2(0.0, 0.0)), t, 0.8);       // furthest: points
        m += 0.7 * glint(sheet(p, t, 0.65, 4.2, vec2(-0.014, -0.034), 0.19, vec2(0.21, 0.63)), t, 0.7);
        m += 1.0 * glint(sheet(p, t, -0.4, 3.1, vec2(0.012, -0.036), 0.21, vec2(0.57, 0.12)), t, 0.6);
        m += 0.75 * glint(sheet(p, t, 1.24, 2.3, vec2(-0.016, -0.034), 0.16, vec2(0.37, 0.81)), t, 0.5);       // near: larger and softer
        m += 0.16 * sheet(p, t, -1.0, 1.7, vec2(0.013, -0.026), 0.13, vec2(0.5, 0.29)).g;                      // nearest the lens: small soft discs
        return m;
      }
      void main(){
        vec2 q = vUv - 0.5;
        vec3 sh = texture2D(tColor, vUv).rgb, c = sh;
        float m = 0.0;                                                  // how far out of focus this pixel is: sharp where in focus, the gathered blur where not
        if (uDof > 0.5) {
          vec4 b = texture2D(tBlur, vUv);
          m = smoothstep(0.7, 2.6, max(cocAt(vUv, viewZ(vUv)), b.a * uMaxPx * 0.8));
          c = mix(sh, b.rgb, m);
        }
        vec2 o = q * dot(q, q) * uCA * 6.0;
        if (dot(o, o) > uCAMin) {                                       // colour fringing: only toward the corners is it wide enough to see
          c.r = mix(texture2D(tColor, vUv + o).r, texture2D(tBlur, vUv + o).r, m);
          c.b = mix(texture2D(tColor, vUv - o).b, texture2D(tBlur, vUv - o).b, m);
        }
        if (uDust > 0.0) c += texture2D(tShaft, vUv).rgb * motes(vec2(vUv.x * uAspect, vUv.y) + uPan, uTime) * uDust;
        vec3 bl = texture2D(tBloom, vUv).rgb;
        c += bl * uBloom + bl * vec3(1.0, 0.26, 0.08) * uHalation;
        c *= mix(1.0, smoothstep(0.95, 0.25, length(q) * 1.15), uVignette);
        c = aces(c * uExposure);
        c = pow(c, vec3(1.0 / 2.2));
        c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, uSat) * uTint;
        c = clamp((c - uBlack) / (1.0 - uBlack), 0.0, 1.0);          // set the black point
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));               // an S-curve on brightness alone: deeper shadows, brighter lights, the colours left as they are
        c = clamp(c * (mix(lum, lum * lum * (3.0 - 2.0 * lum), uContrast) / max(lum, 1e-4)), 0.0, 1.0);
        lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c += uSplit * (1.0 - lum) * (1.0 - lum) * smoothstep(0.0, 0.12, lum) + uWarm * lum * lum;   // split toning: one colour into the shadows, another into the lights
        c = uLift + c * (1.0 - uLift);
        if (uGrain > 0.0) {                                             // film grain: strongest in the midtones, a little different in each layer
          vec2 gp = gl_FragCoord.xy + fract(uTime) * 91.7;
          vec3 gn = vec3(h21(gp), h21(gp + 17.3), h21(gp + 41.9)) - 0.5;
          gn = mix(vec3(gn.g), gn, 0.45);
          c += gn * uGrain * (0.3 + 0.7 * smoothstep(0.0, 0.3, lum) * (1.0 - 0.6 * smoothstep(0.55, 1.0, lum)));
        }
        gl_FragColor = vec4(clamp(c, 0.0, 1.0) * uFade, 1.0);
      }`
  }, fsOpts));
  // Ink and paint, for the brush and classic looks. The surfaces are already flat (their materials are cel paint), so
  // the paint pass only rounds what is left: every pixel takes, from each pair of opposite neighbours, the one closer
  // to its own colour, which keeps edges and loses specks. Ink: a line wherever the depth buffer breaks. The buffer
  // is linear across a flat surface on screen, so its second difference is zero on any plane, small on a crease and
  // large on an edge against something further back. Edges are judged as a share of the distance and creases are
  // kept only close by, so the drawing gets simpler the further away it is. Then the print: grain, and for the
  // classic look the specks of an old film print.
  const styleMat = new T.ShaderMaterial(Object.assign({
    uniforms: { tColor: { value: null }, tDepth: { value: null }, uTexel: { value: new T.Vector2() }, uTime: { value: 0 },
      uPaint: { value: 0 }, uBands: { value: 0 }, uInk: { value: 0 }, uInkPx: { value: 1 }, uInkAng: { value: 0.001 }, uInkCol: { value: new T.Color(0.1, 0.05, 0.03) },
      uNF: { value: new T.Vector2(camera.near, camera.far) }, uPen: { value: 2.4 }, uSil: { value: new T.Vector2(0.012, 0.03) }, uFold: { value: new T.Vector2(2.6, 3.8) },
      uGrain: { value: 0 }, uSpecks: { value: 0 }, uSpeckPx: { value: 2 } },
    fragmentShader: `
      uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uTexel; uniform float uTime; uniform float uSpeckPx;
      uniform float uPaint; uniform float uBands; uniform float uInk; uniform float uInkPx; uniform float uInkAng; uniform vec3 uInkCol;
      uniform vec2 uNF; uniform float uPen; uniform vec2 uSil; uniform vec2 uFold;
      uniform float uGrain; uniform float uSpecks;
      varying vec2 vUv;
      float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      vec3 pickNear(vec3 c0, vec2 o){ vec3 a = texture2D(tColor, vUv + o).rgb, b = texture2D(tColor, vUv - o).rgb; vec3 da = a - c0, db = b - c0; return dot(da, da) < dot(db, db) ? a : b; }
      void main(){
        vec3 c0 = texture2D(tColor, vUv).rgb, c = c0;
        if (uPaint > 0.0) {
          vec2 r = uTexel * uPaint;
          c += pickNear(c0, r * vec2(1.0, 0.0)) + pickNear(c0, r * vec2(0.0, 1.0)) + pickNear(c0, r * vec2(0.7, 0.7)) + pickNear(c0, r * vec2(-0.7, 0.7))
             + pickNear(c0, r * vec2(0.5, 0.19)) + pickNear(c0, r * vec2(-0.19, 0.5)) + pickNear(c0, r * vec2(0.36, -0.36)) + pickNear(c0, r * vec2(0.19, 0.5) * 1.6);
          c /= 9.0;
        }
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
        if (uBands > 0.0) {                                             // a few flat tones, with a soft step between them
          float t = lum * uBands, f = fract(t);
          float q = (floor(t) + smoothstep(0.32, 0.68, f)) / uBands;
          c *= mix(1.0, q / max(lum, 1e-4), 0.75);
        }
        if (uInk > 0.0) {
          float d0 = texture2D(tDepth, vUv).r;
          float z0 = uNF.x * uNF.y / (uNF.y - d0 * (uNF.y - uNF.x));
          float wpx = max(1.0, floor(uInkPx * clamp(uPen / z0, 0.6, 1.5) + 0.5));   // the pen: bold on what is close, a hairline on what is far. Whole pixels, so both neighbours are read at the same distance
          vec2 dx = vec2(uTexel.x * wpx, 0.0), dy = vec2(0.0, uTexel.y * wpx);
          float lap = abs(texture2D(tDepth, vUv - dx).r + texture2D(tDepth, vUv + dx).r - 2.0 * d0) + abs(texture2D(tDepth, vUv - dy).r + texture2D(tDepth, vUv + dy).r - 2.0 * d0);
          float rel = lap / max(1e-6, 1.0 - d0);                          // how far the surface breaks here, as a share of its distance
          float outline = smoothstep(uSil.x, uSil.y, rel);                // an edge against what is behind it. Far away it takes a bigger step to earn a line, so a shelf of books becomes one shape
          float fold = smoothstep(0.5, 1.2, rel / (uInkAng * wpx)) * (1.0 - smoothstep(uFold.x, uFold.y, z0));   // a crease with no step: drawn only on what is near
          c = mix(c, uInkCol, max(outline, fold) * uInk);
        }
        vec2 gp = gl_FragCoord.xy + fract(uTime) * 91.7;
        c += (h21(gp) - 0.5) * uGrain;
        if (uSpecks > 0.0) {                                            // dust and a scratch on the print, changing twelve times a second
          float fr = floor(uTime * 12.0);
          vec2 fo = vec2(mod(fr * 7.0, 61.0), mod(fr * 13.0, 47.0));
          vec2 cell = floor(gl_FragCoord.xy / uSpeckPx);
          float sa = h21(cell + fo * 17.0), sb = h21(cell.yx * 1.7 + fo.yx * 5.3 + 11.1);   // two coarse hashes make one fine one; the bands stay clear of zero, where a float hash piles up
          c += uSpecks * (vec3(0.5, 0.48, 0.42) * step(0.70, sa) * step(sa, 0.71) * step(0.2, sb) * step(sb, 0.204) - vec3(0.2) * step(0.40, sa) * step(sa, 0.41) * step(0.6, sb) * step(sb, 0.603));
          float sx = h21(fo + 3.7), on = step(0.9, h21(fo.yx + 9.1));
          c += vec3(0.1) * on * uSpecks * smoothstep(uSpeckPx * 0.6, 0.0, abs(gl_FragCoord.x - sx / uTexel.x)) * step(0.4, h21(vec2(floor(gl_FragCoord.y / (uSpeckPx * 6.0)), fo.x)));
        }
        gl_FragColor = vec4(c, 1.0);
      }`
  }, fsOpts));

  let sceneRT = null, compRT = null, aoRT = null, shaftRT = null, dofRT = null, dofRT2 = null, ldrRT = null, bloomRT = [];
  function makeTargets(w, h) {
    if (sceneRT) { sceneRT.depthTexture.dispose(); sceneRT.dispose(); compRT.dispose(); aoRT.dispose(); shaftRT.dispose(); dofRT.dispose(); dofRT2.dispose(); if (ldrRT) ldrRT.dispose(); bloomRT.forEach((r) => r.dispose()); }
    const depthTex = new T.DepthTexture(w, h);
    sceneRT = new T.WebGLRenderTarget(w, h, { type: RT_TYPE, samples: 4, depthTexture: depthTex });
    compRT = new T.WebGLRenderTarget(w, h, { type: RT_TYPE, depthBuffer: false });
    aoRT = new T.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), { depthBuffer: false });
    shaftRT = new T.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), { type: RT_TYPE, depthBuffer: false });
    dofRT = new T.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), { type: RT_TYPE, depthBuffer: false });
    dofRT2 = new T.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), { type: RT_TYPE, depthBuffer: false });
    ldrRT = STYLE === 'a' ? null : new T.WebGLRenderTarget(w, h, { depthBuffer: false });
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
  if (!TOON) crtGlassMat.envMap = cubeRT.texture;       // until the screen catches its own
  let envRT = null;
  function captureEnv() {
    if (TOON) return;                                    // paint does not reflect
    puzzles.forEach((P) => { P.group.visible = false; }); glassMesh.visible = false;   // the glass reads this very capture
    renderer.autoClear = true;
    cubeCam.update(renderer, scene);
    glassMesh.visible = true;
    renderer.autoClear = false;
    puzzles.forEach((P) => { P.group.visible = true; });
    const next = pmrem.fromCubemap(cubeRT.texture);
    envMats.forEach((m) => { m.envMap = next.texture; m.needsUpdate = true; });
    if (envRT) envRT.dispose();
    envRT = next;
  }

  /* ───────────────────────── the looks ───────────────────────── */
  // The base is the room at dusk with its lamp on: almost no ambient, so what the lamps and the low sun do not
  // reach falls to black. Each look changes what it needs on top of that.
  const LOOK_BASE = { exposure: 1.0, sunCol: [1.0, 0.7, 0.42], sunI: 5.0, hemiSky: [0.3, 0.24, 0.22], hemiGnd: [0.16, 0.09, 0.05], hemiI: 0.16, fillCol: [0.66, 0.75, 0.9], fillI: 0.05, vol: 0.26,
    winCol: [1.0, 0.74, 0.46], winI: 1.1, vignette: 0.7, bloom: 0.34, thr: 1.4, dust: 0.3, bounceCol: [1.0, 0.6, 0.33], bounce: 1.1, env: 0.7,
    arcCol: [1.0, 0.62, 0.32], arcI: 12, arcGlow: 1.8, screenCol: [1.0, 0.82, 0.42], screenI: 0.55, glass: 2.6,
    ao: 1.25, tint: [1.03, 0.985, 0.9], lift: [0.003, 0.0015, 0.0005], sat: 0.9, contrast: 0.55, black: 0.02,
    dof: 0, dofMax: 9, field: 0.2, halation: 0, ca: 0, grain: 0.02, split: [0, 0, 0], warm: [0, 0, 0],
    paint: 0, bands: 0, ink: 0, inkPx: 1.2, inkCol: [0.1, 0.05, 0.03], specks: 0 };
  const LOOKS = {
    // analogue: a fast lens focused on the subject, and negative film: halation, fringing, green-blue in the shadows, grain
    a: { dof: 0.038, dofMax: 8, halation: 0.34, ca: 0.6, grain: 0.05, split: [-0.006, 0.006, 0.012], warm: [0.012, 0.004, -0.014], lift: [0.012, 0.009, 0.007], black: 0.012,
      contrast: 0.5, sat: 0.94, bloom: 0.4, thr: 1.25, vignette: 0.74 },
    // brush: the same dusk, brighter and more saturated as a painted background is, flattened into strokes and a few tones, inked
    // brush: late afternoon as a cel painter would mix it. The shadow side of everything is one lavender-brown tone (the
    // ambient), the sun and the lamps cut flat shapes of light, and nothing falls to black
    b: { dof: 0.012, dofMax: 4, field: 0.12, exposure: 0.92, sunI: 3.0, sunCol: [1.0, 0.86, 0.66], hemiI: 1.15, hemiSky: [0.56, 0.52, 0.78], hemiGnd: [0.46, 0.4, 0.52], fillI: 0.0, bounce: 0.4,
      arcI: 4.5, arcGlow: 0.5, screenI: 0.35, glass: 2.2, ao: 0.55, vol: 0.12, dust: 0.16,
      sat: 1.12, contrast: 0.3, black: 0.0, lift: [0.01, 0.006, 0.012], tint: [1.03, 0.995, 0.95], warm: [0.015, 0.004, -0.012], split: [-0.004, 0.0, 0.014],
      vignette: 0.28, bloom: 0.34, thr: 1.15, halation: 0.1, ca: 0.3, grain: 0.03,
      paint: 1.3, bands: 0, ink: 1, inkPx: 1.5, inkCol: [0.15, 0.08, 0.09] },
    // classic: the same cels at night. Moonlight and the city through the blinds, magenta from the street, the lamps
    // the only warm thing; shadows are deep blue, never black
    c: { sunCol: [0.46, 0.64, 1.0], sunI: 2.6, vol: 0.2, winCol: [0.75, 0.86, 1.0], winI: 0.85, hemiSky: [0.2, 0.3, 0.56], hemiGnd: [0.2, 0.16, 0.34], hemiI: 1.25, fillCol: [1.0, 0.32, 0.72], fillI: 0.5, bounceCol: [0.4, 0.56, 1.0], bounce: 0.25,
      arcCol: [1.0, 0.6, 0.28], arcI: 6.5, arcGlow: 1.1, screenCol: [1.0, 0.8, 0.4], screenI: 0.7, glass: 2.8, ao: 0.6,
      dof: 0.014, dofMax: 5, field: 0.12, exposure: 0.95, sat: 1.18, contrast: 0.5, black: 0.0, lift: [0.0, 0.008, 0.026], tint: [0.98, 1.0, 1.05], split: [-0.014, 0.012, 0.05], warm: [0.03, 0.0, -0.02],
      bloom: 0.6, thr: 0.9, halation: 0.12, ca: 0.7, vignette: 0.42, grain: 0.05, specks: 1, paint: 1.3, bands: 0, ink: 1, inkPx: 1.5, inkCol: [0.04, 0.05, 0.13], dust: 0.2 }
  };
  const LOOK = Object.assign({}, LOOK_BASE, LOOKS[STYLE]);
  if (STYLE === 'c') skyMat.map = tex(makeCanvas(256, 256, (g, w, h) => {      // out of the window at night: a city, out of focus
    const rnd = mulberry(23);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1230'); gr.addColorStop(0.6, '#1b2c5a'); gr.addColorStop(1, '#3a2a5e');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const COLS = ['255,120,190', '90,220,230', '255,190,110', '150,170,255', '255,90,90'];
    for (let i = 0; i < 46; i++) {
      const x = rnd() * w, y = h * (0.25 + rnd() * 0.75), r = 5 + rnd() * 13, col = COLS[(rnd() * COLS.length) | 0];
      const rg = g.createRadialGradient(x, y, r * 0.6, x, y, r); rg.addColorStop(0, 'rgba(' + col + ',' + (0.35 + rnd() * 0.4) + ')'); rg.addColorStop(1, 'rgba(' + col + ',0)');
      g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }));
  const look = { envDirty: true, lamp: 1 };
  let baseExposure = 1;                                 // the look's own; close to the screen it comes down
  function applyLook() {
    const L = (k) => LOOK[k], sc = LOOK.sunCol, wc = LOOK.winCol;
    sun.color.setRGB(sc[0], sc[1], sc[2]); sun.intensity = L('sunI');
    hemi.color.setRGB.apply(hemi.color, LOOK.hemiSky); hemi.groundColor.setRGB.apply(hemi.groundColor, LOOK.hemiGnd); hemi.intensity = L('hemiI');
    fill.color.setRGB.apply(fill.color, LOOK.fillCol); fill.intensity = L('fillI'); bounce.color.setRGB.apply(bounce.color, LOOK.bounceCol); bounce.intensity = L('bounce');
    skyMat.color.setRGB(wc[0] * L('winI'), wc[1] * L('winI'), wc[2] * L('winI'));
    shaftMat.uniforms.uSunColor.value.setRGB(sc[0], sc[1], sc[2]); shaftMat.uniforms.uStrength.value = L('vol');
    finalMat.uniforms.uDust.value = L('dust') * 13;
    baseExposure = L('exposure'); finalMat.uniforms.uExposure.value = baseExposure; finalMat.uniforms.uVignette.value = L('vignette'); finalMat.uniforms.uBloom.value = L('bloom');
    downMat.uniforms.uThr.value = L('thr');
    arcSpot.color.setRGB.apply(arcSpot.color, LOOK.arcCol); arcSpot.intensity = L('arcI');
    arcGlow.color.setRGB.apply(arcGlow.color, LOOK.arcCol); arcGlow.intensity = L('arcGlow');
    screenLight.color.setRGB.apply(screenLight.color, LOOK.screenCol); screenLight.intensity = L('screenI');
    lampMats.forEach((m) => { m.emissiveIntensity = L('glass'); });
    envMats.forEach((m) => { m.envMapIntensity = L('env') * (m.userData.envK || 1); });
    aoMat.uniforms.uStrength.value = L('ao'); finalMat.uniforms.uSat.value = L('sat');
    finalMat.uniforms.uTint.value.setRGB.apply(finalMat.uniforms.uTint.value, LOOK.tint);
    finalMat.uniforms.uLift.value.setRGB.apply(finalMat.uniforms.uLift.value, LOOK.lift);
    finalMat.uniforms.uContrast.value = L('contrast'); finalMat.uniforms.uBlack.value = L('black');
    finalMat.uniforms.uDof.value = LOOK.dof > 0 ? 1 : 0; finalMat.uniforms.uHalation.value = L('halation');
    finalMat.uniforms.uGrain.value = STYLE === 'a' ? L('grain') : 0;                       // the inked looks get their grain after the ink
    finalMat.uniforms.uSplit.value.fromArray(LOOK.split); finalMat.uniforms.uWarm.value.fromArray(LOOK.warm);
    const su = styleMat.uniforms;
    su.uPaint.value = L('paint'); su.uBands.value = L('bands'); su.uInk.value = L('ink'); su.uInkCol.value.setRGB.apply(su.uInkCol.value, LOOK.inkCol);
    su.uGrain.value = L('grain'); su.uSpecks.value = L('specks');
  }

  /* ───────────────────────── camera and sizing ───────────────────────── */
  const CAM_TARGET = V3(0, 0.98, -0.9);                 // below the cube, so the cube sits in the upper half and the ottoman fills the lower
  const ORBIT = { yaw: 0.42, pitchMin: 0.08, pitchMax: 0.42, rMin: 2.1, rMax: 2.8 };   // how far the room can be looked around; every value keeps the camera inside the walls and clear of the shelving
  const orbit = { yaw: 0, pitch: 0.2, yawT: 0, pitchT: 0.2, r: 2.6 };
  let resScale = 1, resizeDue = false, shadowHold = 8;
  // The canvas fills its frame, and the frame is not the window: the page is a rounded frame on a black screen,
  // clear of the phone's bars (vvv, docs/ux-playbook.md). So everything measured on screen is measured against the
  // canvas's own box, in CSS pixels.
  const box = { x: 0, y: 0, w: 1, h: 1 };
  function measure() {
    const b = canvas.getBoundingClientRect();
    box.x = b.left; box.y = b.top; box.w = Math.max(1, Math.round(b.width)); box.h = Math.max(1, Math.round(b.height));
  }
  function resize() {
    measure();
    const w = box.w, h = box.h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * resScale);
    renderer.setSize(w, h, false);
    makeTargets(renderer.domElement.width, renderer.domElement.height);
    camera.aspect = w / h;
    const tanV = clamp(Math.max(0.46, 0.29 / camera.aspect), 0.2, 0.66);
    camera.fov = 2 * Math.atan(tanV) * 180 / Math.PI;
    camera.updateProjectionMatrix();
    const hp = renderer.domElement.height, pr = renderer.getPixelRatio();
    lensUniforms.uAperture.value = LOOK.dof * hp; lensUniforms.uMaxPx.value = LOOK.dofMax * pr;
    lensUniforms.uTan.value.set(tanV * camera.aspect, tanV); lensUniforms.uField.value = LOOK.field;
    dofMat.uniforms.uStep.value = (Math.pow(LOOK.dofMax * pr, 2) - 1.44) / 32;             // the sixteen taps of the gather reach the widest blur
    finalMat.uniforms.uCAMin.value = Math.pow(0.35 / hp, 2); finalMat.uniforms.uAspect.value = camera.aspect;
    finalMat.uniforms.uCA.value = LOOK.ca * 0.0016;
    const inkStep = Math.max(1, LOOK.inkPx * pr * 0.5);                                    // in device pixels, never less than one
    styleMat.uniforms.uPaint.value = LOOK.paint * pr * 0.5; styleMat.uniforms.uInkPx.value = inkStep; styleMat.uniforms.uSpeckPx.value = Math.max(1, Math.round(1.5 * pr));
    styleMat.uniforms.uInkAng.value = 2 * tanV / hp;                                       // the angle one pixel covers
  }
  window.addEventListener('resize', resize);
  // The frame moves when the browser's bars do, with no resize of the window. A new size is taken up at the start
  // of the next frame (see resizeDue); a new place only needs measuring.
  const frameWatch = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
    const w = box.w, h = box.h;
    measure();
    if (box.w !== w || box.h !== h) resizeDue = true;
  }) : null;
  if (frameWatch) frameWatch.observe(canvas);

  /* ───────────────────────── touch ───────────────────────── */
  // The room opens looking down at the ottoman, where the puzzles rest. A tap on one picks it up: it floats
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
  // A tap on one of its faces turns that face to the front, square to the rings, ready to be played; two taps, on it
  // or anywhere off the grid of rings, flip it round. A tap on the grid and, right after it, a slide turns two layers
  // as one: the row or column under the finger and the middle one.
  // A long swipe straight down on it puts it back on the ottoman, and the camera rises to choose again.
  const Q = Math.PI / 2, TURN_PX = 105, AIM_PX = 12, FRICTION = 2.6, SNAP_VEL = 2.2, STIFF = 260, DAMP = 2 * Math.sqrt(260) * 0.6, HOLD = 0.8;
  const SPIN_K = 0.0105, SPIN_FRICTION = 2.6, SPIN_SNAP_VEL = 2.0, SPIN_STIFF = 170, SPIN_DAMP = 2 * Math.sqrt(170) * 0.6, SWIPE_PX = 9, SWIPE_T = 0.25;
  // Which way a slide goes is read once it has gone this far (LOCK_PX for the whole puzzle; AIM_PX for a ring), from
  // where it started. A thumb drawn sideways bends into a diagonal, so sideways wins unless the slide is clearly up or
  // down: up to about 55 degrees from level it counts as sideways.
  const LOCK_PX = 14, SIDE_BIAS = 0.7;
  const sideways = (mx, my) => Math.abs(mx) >= SIDE_BIAS * Math.abs(my);
  const WOB_K = 0.3, WOB_MAX = 0.16, WOB_STIFF = 140, WOB_DAMP = 2 * Math.sqrt(140) * 0.55;
  const dots = Array.from(host.querySelectorAll('.dot')).map((el) => ({ el, r: +el.dataset.r, c: +el.dataset.c }));
  const line = (kind, i) => ({ pos: kind === 'layer' ? 1 - i : i - 1, dots: dots.filter((d) => (kind === 'layer' ? d.r : d.c) === i) });
  const RINGS = { layer: [0, 1, 2].map((i) => line('layer', i)), slice: [0, 1, 2].map((i) => line('slice', i)) };   // rows top to bottom, columns left to right
  let A = null, lastA = null;                           // the puzzle in hand, and the last one that was
  const view = { v: 0, vel: 0, target: 0 };             // 0: looking down at the ottoman to choose; 1: facing the puzzle in hand
  const SELECT = { cam: V3(0, 1.52, 0.52), tgt: V3(REST_AT.x, 0.44, REST_AT.z) };   // over the rug, looking down at the puzzles on the ottoman
  SELECT.cam.sub(SELECT.tgt).multiplyScalar(REST).add(SELECT.tgt);       // in by as much as the puzzles at rest are smaller: see REST
  const ptr = { id: null, mode: '', x: 0, y: 0, x0: 0, y0: 0, t0: 0, tPrev: 0, v: 0, aim: null, hit: null, armed: false, wide: false };
  const bob = { off: V3(), vel: V3() };
  const turn = { phase: 'idle', ring: null, rings: [], kind: '', axis: 0, side: 0, sides: [], sgn: 1, ang: 0, vel: 0, target: 0, notch: 0, parts: [], q: new T.Quaternion() };
  const hold = { on: false, t: 0, fired: false };
  const seq = { running: false, P: null, auto: null };   // auto: a puzzle just picked, to be mixed up once it is in front
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
  // spinning with the finger and sinks toward the ottoman instead, and past the mark, letting go puts it down.
  const DOCK = { lean: 0.38, dead: () => Math.max(80, 0.12 * box.h), arm: () => Math.max(230, 0.34 * box.h) };

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
    haptic.select(); recoil(0.22); sound.flip();
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
        haptic.select(); recoil(0.22); sound.flip();
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
    if (rot.phase !== 'drag' && rot.phase !== 'happy') {   // the wobble springs back once the finger is off (the happy one is its own)
      const steps = Math.ceil(dt / 0.008), h = dt / steps;
      for (let k = 0; k < steps; k++) { rot.wobV += (-WOB_STIFF * rot.wob - WOB_DAMP * rot.wobV) * h; rot.wob += rot.wobV * h; }
    }
    const notch = Math.round(rot.ang / Q);                // a tick at every quarter it passes
    if (notch !== rot.notch) { rot.notch = notch; if (rot.phase === 'spin') { haptic.select(); sound.tick(); } }
    if (rot.phase === 'snap' && Math.abs(rot.ang - rot.target) < 0.002 && Math.abs(rot.w) < 0.05 && Math.abs(rot.wob) < 0.002) { landFlip(); return; }
    composeRot();
  }

  function onScreen(P) {                                // a puzzle's centre and radius in CSS pixels, where a touch would report them
    scr.copy(P.group.position).project(camera);
    const cx = box.x + (scr.x + 1) / 2 * box.w, cy = box.y + (1 - scr.y) / 2 * box.h;
    vT.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(P.group.scale.x * 1.7).add(P.group.position).project(camera);
    return { x: cx, y: cy, r: Math.max(40, Math.abs(box.x + (vT.x + 1) / 2 * box.w - cx)) };
  }
  function pickAt(x, y) {                               // the resting puzzle under a tap
    let best = null, bd = Infinity;
    for (const P of puzzles) { const c = onScreen(P), d = Math.hypot(x - c.x, y - c.y); if (d < c.r * 1.15 && d < bd) { bd = d; best = P; } }
    return best;
  }
  function aimAt(x, y) {                                // the row and the column a touch falls in, and the ring where they cross
    const out = { layer: null, slice: null, dot: null };
    if (!A) return out;
    const at = (d) => { const b = d.el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
    const live = (list) => list.filter((r) => A.n === 3 || r.pos !== 0);        // a 2×2 has no middle row or column
    const rows = live(RINGS.layer).map((r) => ({ r, v: at(r.dots[0])[1] })), cols = live(RINGS.slice).map((r) => ({ r, v: at(r.dots[0])[0] }));
    // the grid answers within its rings and a little past the outer ones, by most of the space between two rings;
    // beyond that, a slide turns the whole puzzle
    const reach = Math.max(36, (rows[1].v - rows[0].v) * 0.7);
    if (x < cols[0].v - reach || x > cols[cols.length - 1].v + reach || y < rows[0].v - reach || y > rows[rows.length - 1].v + reach) return out;
    const within = (list, v) => list.find((q, k) => k === list.length - 1 || v < (q.v + list[k + 1].v) / 2).r;
    out.layer = within(rows, y); out.slice = within(cols, x);
    out.dot = out.layer.dots.find((d) => out.slice.dots.indexOf(d) >= 0);
    return out;
  }
  function clearAim() { if (ptr.aim) { ptr.aim.dot.el.classList.remove('aim'); ptr.aim = null; } }
  function record(P, axis, side, n) {                   // keep the history short: fold repeated turns of one layer together
    const sim = P.sim, h = sim.history;
    // turns about one axis do not get in each other's way, so the turn folds into the last turns of its own layer even
    // past others of that axis (a wide turn and its undoing leave the history as it was)
    let sum = n, i = h.length - 1;
    const others = [];
    for (; i >= 0 && h[i].axis === axis; i--) { if (h[i].side === side) sum += h[i].dir; else others.unshift(h[i]); }
    h.length = i + 1; h.push(...others);
    const k = ((sum % 4) + 4) % 4;
    if (k === 1 || k === 2) for (let j = 0; j < k; j++) sim.history.push({ axis, side, dir: 1 });
    else if (k === 3) sim.history.push({ axis, side, dir: -1 });
    sim.target = sim.history.length ? 'scrambled' : 'solved'; sim.queue = 0; sim.last = null;
  }
  // wide: a double tap and a slide on the grid turns two layers as one, the row or column under the finger and the
  // middle one (from the middle row or column, the outer one on the finger's side of it: toward is +1 or -1, as a
  // ring's pos). A 2×2 has no middle: it turns the one layer.
  function beginTurn(kind, r, wide, toward) {
    if (!A || seq.running) return false;
    if (turn.phase !== 'idle') finishTurn(true);
    camUp.setFromMatrixColumn(camera.matrixWorld, 1); camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    const ref = kind === 'layer' ? camUp : camRight;
    let axis = 0, bd = 0;
    for (let k = 0; k < 3; k++) { const d = axW.copy(A.axes[k]).applyQuaternion(A.group.quaternion).dot(ref); if (Math.abs(d) > Math.abs(bd)) { bd = d; axis = k; } }
    const sgn = bd < 0 ? -1 : 1;
    const rings = [r];
    if (wide && A.n === 3) rings.push(RINGS[kind].find((q) => q.pos === (r.pos === 0 ? (toward || 1) : 0)));
    const outer = rings.find((q) => q.pos !== 0) || r;    // the turn's own side, its note: the outer layer's
    Object.assign(turn, { kind, ring: r, rings, P: A, axis, sgn, side: sgn * outer.pos, sides: rings.map((q) => sgn * q.pos), ang: 0, vel: 0, notch: 0, phase: 'drag' });
    turn.parts = A.pieces.filter((p) => turn.sides.indexOf(cellOf(p)[axis]) >= 0);
    for (const q of rings) for (const d of q.dots) d.el.classList.add('on');   // the whole row or column lights up (both, for a wide turn)
    return true;
  }
  function startSnap() { turn.target = Math.round((turn.ang + turn.vel * 0.12) / Q) * Q; turn.phase = 'snap'; }
  function finishTurn(instant) {
    if (turn.phase === 'idle') return;
    const n = Math.round((instant ? turn.ang : turn.target) / Q), k = ((n % 4) + 4) % 4;
    const turnIt = () => { for (let j = 0; j < k; j++) for (const p of turn.parts) p.M = mul3(ROT[turn.axis], p.M); };
    const was = turn.P.sim.history.length;
    const judged = !instant && k ? hint.judge(turn.P, turnIt) : (turnIt(), null);
    for (const p of turn.parts) { quatFromM(turn.P, p.M, p.qBase); p.group.quaternion.copy(p.qBase); }
    if (k) for (const sd of turn.sides) record(turn.P, turn.axis, sd, k === 3 ? -1 : k);
    if (k && !instant) {                                // the clock: a turn of a layer by hand; the last one stops it, and the puzzle celebrates
      startClock(turn.P);
      if (atHome(turn.P)) { const before = runOf(turn.P).state; stopClock(turn.P, 'done'); if (before === 'timing') { celebrate(turn.P); offerEntry(turn.P); } }
    }
    // closer: by the puzzle's own measure, or, where that is not exact, by undoing a turn of the known way back
    const closer = !!judged && (judged.closer || (!judged.exact && turn.P.sim.history.length < was));
    turn.q.identity(); for (const q of turn.rings) for (const d of q.dots) d.el.classList.remove('on'); turn.phase = 'idle'; turn.parts = [];
    if (!instant) { haptic.select(); recoil(0.22); sound.turn(turn.axis * 2 + (turn.side > 0 ? 1 : 0), k !== 0, turn.P.key, closer); }   // the stamp: a click, a small recoil, and the face's note: up if closer, down if not
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
    if (notch !== turn.notch) { turn.notch = notch; if (turn.phase !== 'snap') { haptic.select(); sound.tick(); } }
    turn.q.setFromAxisAngle(turn.P.axes[turn.axis], turn.ang);
    for (const p of turn.parts) p.group.quaternion.copy(turn.q).multiply(p.qBase);
  }
  function runSequence(mix) {                           // open, scramble or solve in one go, close (mix: always scramble)
    if (!A || seq.running) return;
    if (turn.phase !== 'idle') finishTurn(true);
    const sim = A.sim;
    if (atHome(A)) sim.history.length = 0;              // solved by hand along another way: it is solved, so it mixes
    if (sim.history.length && !mix) { sim.target = 'solved'; sim.queue = 0; runOf(A).state = 'over'; }
    else { sim.target = 'scrambled'; sim.queue = (A.n === 2 ? 12 : 20) + Math.floor(Math.random() * 5); runOf(A).state = 'mixing'; }
    sim.fast = true; seq.running = true; seq.P = A; A.exT = 1; host.classList.add('busy');
    sound.wobble(true);
  }
  puzzles.forEach((P) => {
    P.sim.onIdle = () => {
      if (!seq.running || seq.P !== P) return;
      seq.running = false; seq.P = null; P.sim.fast = false; P.exT = 0; host.classList.remove('busy');
      haptic.complete(); sound.wobble(false);
      const r = runOf(P);
      if (r.state === 'mixing') { r.state = 'ready'; r.t = 0; } else if (r.state === 'over') r.state = 'mixit';
    };
  });
  function cancelHold() { hold.on = false; if (A && !seq.running) A.exT = 0; }
  // A tap on a face: find the face under the finger, then of the 24 square poses take the one that turns it most
  // toward the viewer (the closest such pose to where it is now), and let the spin spring carry it there.
  const tapRay = new T.Raycaster(), tapNdc = new T.Vector2(), faceN = V3(), gq = new T.Quaternion();
  function faceTap(x, y) {
    if (!A) return false;
    tapNdc.set((x - box.x) / box.w * 2 - 1, -((y - box.y) / box.h) * 2 + 1);
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
    haptic.select(); sound.swish();
    return true;
  }
  // A tap on the puzzle brings that face to the front; two taps, quickly and in about the same place, turn it round so
  // the face at the back comes to the front. So a tap waits that long to see whether a second follows.
  const DOUBLE_MS = 260, DOUBLE_PX = 44;
  let tapWait = null;
  function tapPuzzle(x, y) {
    const now = performance.now();
    if (tapWait && now - tapWait.t < DOUBLE_MS && Math.hypot(x - tapWait.x, y - tapWait.y) < DOUBLE_PX) {
      clearTimeout(tapWait.timer); tapWait = null; flipRound(x); return;
    }
    if (tapWait) clearTimeout(tapWait.timer);
    const w = { x, y, t: now };
    w.timer = setTimeout(() => { if (tapWait !== w) return; tapWait = null; if (A && !faceTap(x, y)) nudge(); }, DOUBLE_MS);
    tapWait = w;
  }
  // Two taps anywhere off the grid of rings flip the puzzle round as two taps on it do. On the grid, a tap and then,
  // quickly and in about the same place, a touch that slides turns two layers at once (see beginTurn).
  let outsideTap = null, gridTap = null;
  function tapOutside(x, y, now) {                      // now: the event's own time, true however busy the page is
    if (outsideTap && now - outsideTap.t < DOUBLE_MS && Math.hypot(x - outsideTap.x, y - outsideTap.y) < DOUBLE_PX) { outsideTap = null; flipRound(x); return; }
    outsideTap = { x, y, t: now };
  }
  function flipRound(x) {                               // half a turn about the upright, the way of the side tapped
    if (!A || seq.running) return;
    rot.base.copy(nearestPose(rot.phase === 'qsnap' ? rot.qTarget : rot.q));
    rot.ang = 0; rot.w = 0; rot.wob = 0; rot.wobV = 0; rot.vel.set(0, 0, 0); rot.notch = 0;
    lockFlip(true);
    rot.target = (x < onScreen(A).x ? -1 : 1) * Math.PI;
    rot.phase = 'snap'; composeRot();
    haptic.select(); sound.swish();
  }
  // Solved by hand, the puzzle is happy. It crouches, jumps and turns a whole turn about the upright in the air,
  // lands with a squash, bounces twice, smaller each time, and rocks from side to side, a wag that dies away.
  // Bi-li-li-li-lo-lu-li in the air, in its own voice, and -lup as it lands. About two seconds in all.
  const HAPPY = { crouch: 0.14, air: 0.66, b1: 0.3, b2: 0.18, H: 0.25, dip: 0.035, rock: 1.0 }, ROCK = V3(0, 0, 1);
  const happy = { on: false, t: 0, dir: 1, P: null, y: 0, q: 0, qv: 0, stage: 0, sang: false, spin: false };
  function celebrate(P) {
    if (P !== A) return;
    rot.base.copy(nearestPose(rot.phase === 'qsnap' ? rot.qTarget : rot.q));
    rot.ang = 0; rot.w = 0; rot.wob = 0; rot.wobV = 0; rot.vel.set(0, 0, 0); rot.notch = 0;
    lockFlip(true); rot.other = ROCK; rot.phase = 'happy'; composeRot();   // its wobble a rock about the line of sight
    Object.assign(happy, { on: true, t: 0, dir: Math.random() < 0.5 ? -1 : 1, P, stage: 0, sang: false, spin: true });
    haptic.select();
  }
  function updateHappy(dt) {
    const H = HAPPY, h = happy;
    let qT = 0;
    if (h.on && (h.P !== A || !A)) {                     // put down or changed mid-way: it stops where it is, square
      if (h.spin && rot.phase === 'happy') { rot.base.copy(nearestPose(rot.q)); rot.ang = 0; rot.wob = 0; rot.wobV = 0; rot.other = X_AX; rot.phase = 'idle'; composeRot(); }
      h.on = false; h.y = 0;
    }
    if (h.on) {
      h.t += dt;
      if (h.spin && rot.phase !== 'happy') h.spin = false;   // taken in hand: the turn is the hand's now
      const t1 = H.crouch, t2 = t1 + H.air, t3 = t2 + H.b1, t4 = t3 + H.b2, t = h.t;
      if (!h.sang && t >= t2 - 0.56) { h.sang = true; sound.cheer(h.P.key); }   // its last note on the landing
      if (t < t1) { const u = smooth(t / t1, 0, 1); h.y = -H.dip * u; qT = 0.16 * u; }
      else if (t < t2) {
        const u = (t - t1) / H.air;
        if (h.stage < 1) { h.stage = 1; h.qv -= 4.2; }    // the spring off: a stretch
        h.y = -H.dip * (1 - u) + H.H * 4 * u * (1 - u);
        if (h.spin) { const e = u * u * u * (u * (u * 6 - 15) + 10); rot.ang = h.dir * Math.PI * 2 * e; }
      } else if (t < t3) {
        const u = (t - t2) / H.b1;
        if (h.stage < 2) { h.stage = 2; h.qv += 5.2; haptic.complete(); if (h.spin) rot.ang = h.dir * Math.PI * 2; }   // down: a squash
        h.y = H.H * 0.22 * 4 * u * (1 - u);
      } else if (t < t4) {
        const u = (t - t3) / H.b2;
        if (h.stage < 3) { h.stage = 3; h.qv += 2.4; haptic.select(); }
        h.y = H.H * 0.06 * 4 * u * (1 - u);
      } else {
        if (h.stage < 4) { h.stage = 4; h.qv += 1.0; h.y = 0; }
        if (t > t2 + H.rock && Math.abs(h.q) < 0.004) {
          if (h.spin && rot.phase === 'happy') { rot.ang = 0; rot.wob = 0; rot.wobV = 0; rot.other = X_AX; rot.phase = 'idle'; composeRot(); }
          h.on = false;
        }
      }
      if (h.spin && t >= t2) { const r = t - t2; rot.wob = r < H.rock ? -h.dir * 0.17 * Math.sin(Math.PI * 2 * 2.4 * r) * Math.exp(-2.6 * r) : 0; rot.wobV = 0; }   // the wag, from the landing
    }
    const steps = Math.ceil(dt / 0.008), k = dt / steps;   // the squash: stretched up (below 0) or pressed down (above)
    for (let i = 0; i < steps; i++) { h.qv += (-320 * (h.q - qT) - 13 * h.qv) * k; h.q += h.qv * k; }
  }
  const squashV = V3();
  function squash(P) {                                  // pressed along the upright, as wide again across it
    if (Math.abs(happy.q) < 1e-4) return;
    squashV.copy(Y_AX).applyQuaternion(qw.copy(rot.base).invert()).applyQuaternion(qa.copy(P.present).invert());
    const ax = Math.abs(squashV.x), ay = Math.abs(squashV.y), az = Math.abs(squashV.z), dn = 1 - happy.q, out = 1 + happy.q * 0.5;
    P.group.scale.multiply(squashV.set(lerp(out, dn, ax), lerp(out, dn, ay), lerp(out, dn, az)));
  }
  function nudge() {
    if (!A) return;
    recoil(0.6); bob.vel.y += 0.25;
  }
  function pick(P) {                                    // off the cushion and into the light
    if (!P || A) return false;
    A = lastA = P; P.liftT = 1; view.target = 1;
    rot.q.identity(); rot.base.identity(); rot.ang = 0; rot.w = 0; rot.wob = 0; rot.wobV = 0; rot.vel.set(0, 0, 0); rot.phase = 'idle';
    host.classList.add('play'); host.classList.toggle('two', P.n === 2);
    // A puzzle is always played from mixed up: one picked up solved scrambles itself, as a hold does, once it is in
    // front. One left half solved keeps its turns.
    if (!P.sim.history.length || atHome(P)) { P.sim.history.length = 0; seq.auto = P; runOf(P).state = 'mixing'; }
    haptic.select(); sound.pick(P.key); hint.warm(P);
    return true;
  }
  function putDown() {                                  // back to its hollow; the camera rises to choose again
    if (!A || seq.running) return false;
    if (turn.phase !== 'idle') finishTurn(true);
    cancelHold(); clearAim(); seq.auto = null;
    stopClock(A, 'paused');
    if (runOf(A).state === 'mixing') runOf(A).state = 'ready';   // put down before it began to mix: it is as it was
    settle(A); A.liftT = 0; A.exT = 0; A.pullT = 0;
    rot.phase = 'idle'; rot.w = 0; rot.vel.set(0, 0, 0);
    A = null; view.target = 0; orbit.yawT = 0; orbit.pitchT = 0.2;
    host.classList.remove('play');
    haptic.select(); sound.drop();
    return true;
  }
  // The screen, close. A tap on the iMac takes the camera to its screen, square on, the screen four fifths of the
  // frame across (or two thirds up and down, on a wide one) so that the Mac's face is seen round it, and the room
  // beyond the Mac fades to dark. A tap, a pull down
  // or a slide to the right brings the room back; the pull and the slide draw it back with the finger first.
  const SCR_W = 0.272, SCR_H = 0.204, SCR_R = 0.016;
  const crt = { v: 0, vel: 0, target: 0, e: 0, held: false, at: V3(), n: V3(), cam: V3(), edge: [], hit: null, step: 0, stepT: 0, up: V3(), look: V3(), fast: false, k: 0, kv: 0 };
  (function placeScreen() {
    screenMesh.updateMatrixWorld();
    crt.at.set(0, 0, TUBE.sag + 0.001).applyMatrix4(screenMesh.matrixWorld);   // the middle of the tube's face
    crt.up.set(0, 1, 0).transformDirection(screenMesh.matrixWorld);
    crt.n.set(0, 0, 1).transformDirection(screenMesh.matrixWorld);
    // its outline, a rounded rectangle: the dark is cut round it
    [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sy], k) => {
      for (let i = 0; i <= 5; i++) {
        const a = (k + i / 5) * Math.PI / 2;
        crt.edge.push(V3(sx * (SCR_W / 2 - SCR_R) + SCR_R * Math.cos(a), sy * (SCR_H / 2 - SCR_R) + SCR_R * Math.sin(a), 0.002).applyMatrix4(screenMesh.matrixWorld));
      }
    });
    // what a tap finds it by: a box round the whole iMac, never drawn
    const hitBox = new T.Mesh(new T.BoxGeometry(0.4, 0.4, 0.46), new T.MeshBasicMaterial());
    hitBox.position.set(0, 0.2, -0.01); hitBox.updateMatrix();
    hitBox.applyMatrix4(M4(IMAC.x, IMAC.y, IMAC.z, IMAC.ry)); hitBox.updateMatrixWorld(true);
    crt.hit = hitBox;
  })();
  const shroud = document.createElement('div'); shroud.className = 'shroud'; canvas.after(shroud);
  const scrRay = new T.Raycaster(), scrNdc = new T.Vector2(), shP = V3();
  let shroudOn = false;
  function onIMac(x, y) {
    scrNdc.set((x - box.x) / box.w * 2 - 1, -((y - box.y) / box.h) * 2 + 1);
    scrRay.setFromCamera(scrNdc, camera);
    return scrRay.intersectObject(crt.hit, false).length > 0;
  }
  // What the screen's glass reflects: the room as the screen sees it, caught from just in front of the glass the first
  // time the screen is opened (until then, the room as the puzzle sees it). The puzzles are left out, as in the room's
  // own capture: the one in hand steps aside while the screen is close.
  let glassEnv = null;
  function captureGlass() {
    if (TOON || glassEnv) return;
    glassEnv = new T.WebGLCubeRenderTarget(256, { type: RT_TYPE, generateMipmaps: true, minFilter: T.LinearMipmapLinearFilter });
    const cam = new T.CubeCamera(0.02, 30, glassEnv);
    cam.position.copy(crt.at).addScaledVector(crt.n, 0.03);
    puzzles.forEach((P) => { P.group.visible = false; }); glassMesh.visible = false;
    renderer.autoClear = true; cam.update(renderer, scene); renderer.autoClear = false;
    puzzles.forEach((P) => { P.group.visible = true; }); glassMesh.visible = true;
    crtGlassMat.envMap = glassEnv.texture; crtGlassMat.needsUpdate = true;
  }
  const ASIDE = V3(0.55, 0.15, 0.35);                   // where the puzzle in hand goes while the screen is close: out of the camera's way
  function openScreen() {
    if (crt.target === 1) return false;
    captureGlass();
    crt.target = 1; host.classList.add('crt');
    if (pending) { crt.fast = true; startEntry(pending); pending = null; }   // a new entry: a quick zoom, straight to the keyboard
    else if (LAB && !lab.done) { crt.fast = true; startEntry(null); }      // a lab offers one anyway, once, so the keyboard can be tried
    haptic.select(); sound.swish();
    return true;
  }
  function closeScreen() {
    if (crt.target === 0 || lab.placing) return false;  // a row on its way in finishes first (it takes half a second)
    if (lab.on) { closeConfirm(); lab.on = false; host.classList.remove('entry'); redrawScreen(); }   // left without initials: no entry
    crt.target = 0; crt.held = false; crt.fast = false; host.classList.remove('crt');
    haptic.select(); sound.swish();
    return true;
  }
  const redrawScreen = () => { drawScreen(screenCanvas.getContext('2d'), screenCanvas.width, screenCanvas.height, crt.step); screenTex.needsUpdate = true; };

  /* The machine's line, at the top right of the frame in the screen's letters: what the puzzle in hand is doing and,
     once it is being solved, its clock. INSERT CUBE with none in hand; MIXING... while it mixes itself; READY; then
     the clock, minutes, seconds and hundredths, from the first turn of a layer (a turn of the whole puzzle does not
     count). The clock stops when the puzzle is put down or the app is left, and goes on at its next turn of a layer.
     A hold that solves it shows GAME OVER while it solves, then MIX IT. Solved by hand, the clock stops on its time. */
  const hud = document.createElement('canvas'); hud.className = 'hud'; hud.setAttribute('aria-live', 'polite'); shroud.after(hud);
  let hudText = '';
  const runOf = (P) => P.run || (P.run = { state: 'ready', t: 0, t0: 0 });
  const clock = (sec) => { const cs = Math.min(99 * 6000 + 5999, Math.floor(sec * 100)); return two(Math.floor(cs / 6000)) + ':' + two(Math.floor(cs / 100) % 60) + ':' + two(cs % 100); };
  function hudLine() {
    if (crt.target === 1) return lab.on ? 'CONGRATS!!' : 'BACK';   // close to the screen: the way back (a tap on it), or the cheer for a new entry
    if (!A) return 'INSERT CUBE';
    const r = runOf(A);
    if (r.state === 'mixing') return 'MIXING...';
    if (r.state === 'over') return 'GAME OVER';
    if (r.state === 'mixit') return 'MIX IT';
    if (r.state === 'timing') return clock((performance.now() - r.t0) / 1000);
    if (r.state === 'paused' || r.state === 'done') return clock(r.t);
    return 'READY';
  }
  // The Mac's boxes (the line at the top right, the version): a word on paper in an ink line with its corners rounded
  // off, and an ink lip under it and to its right; inverted (ink, its word and line in paper) for the clock.
  function macBox(c, text, S, inv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3), tw = text.length * 7 - 2, bw = tw + 10, bh = 13, w = (bw + 1) * S, h = (bh + 1) * S;
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.style.width = w + 'px'; }
    if (c.height !== Math.round(h * dpr)) { c.height = Math.round(h * dpr); c.style.height = h + 'px'; }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const fg = inv ? CRT.off : CRT.ink, bg = inv ? CRT.ink : CRT.off, px = (x, y, pw, ph) => g.rect(x * S, y * S, pw * S, ph * S);
    g.fillStyle = CRT.ink; g.beginPath(); px(2, bh, bw - 1, 1); px(bw, 2, 1, bh - 1); g.fill();   // the lip
    g.fillStyle = bg; g.beginPath(); px(1, 1, bw - 2, bh - 2); g.fill();
    g.fillStyle = inv ? CRT.off : CRT.ink; g.beginPath(); px(1, 0, bw - 2, 1); px(1, bh - 1, bw - 2, 1); px(0, 1, 1, bh - 2); px(bw - 1, 1, 1, bh - 2); g.fill();
    g.fillStyle = fg; g.beginPath();
    for (let i = 0; i < text.length; i++) { const rows = GLYPH[text[i]]; if (!rows) continue; for (let r = 0; r < 7; r++) for (let j = 0; j < 5; j++) if (rows[r] & (16 >> j)) px(5 + i * 7 + j, 3 + r, 1, 1); }
    g.fill();
  }
  function drawHud() {
    const text = hudLine(); if (text === hudText) return;
    hudText = text;
    if (MAC) {
      macBox(hud, text, 2, /^\d/.test(text));
      if (!/^\d/.test(text)) hud.setAttribute('aria-label', text);
      if (text === 'BACK') { hud.setAttribute('role', 'button'); hud.tabIndex = 0; } else { hud.removeAttribute('role'); hud.removeAttribute('tabindex'); }
      return;
    }
    const S = 2, pad = 8, dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = (text.length * 7 - 2) * S + pad * 2, h = 7 * S + pad * 2;
    if (hud.width !== Math.round(w * dpr)) { hud.width = Math.round(w * dpr); hud.style.width = w + 'px'; }
    if (hud.height !== Math.round(h * dpr)) { hud.height = Math.round(h * dpr); hud.style.height = h + 'px'; }
    const g = hud.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const chip = /^\d/.test(text);                       // the clock is a bar of light with dark figures; words are lit letters
    if (chip) { g.fillStyle = CRT.ink; g.shadowColor = CRT.ink; g.shadowBlur = 6; g.fillRect(pad - 5, pad - 5, w - 2 * pad + 10, h - 2 * pad + 10); g.shadowBlur = 0; }
    g.beginPath();
    for (let c = 0; c < text.length; c++) {
      const rows = GLYPH[text[c]]; if (!rows) continue;
      for (let r = 0; r < 7; r++) for (let i = 0; i < 5; i++) if (rows[r] & (16 >> i)) g.rect(pad + (c * 7 + i) * S, pad + r * S, S, S);
    }
    if (chip) { g.fillStyle = CRT.off; g.fill(); }
    else {
      g.fillStyle = '#000'; g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = 8; g.fill(); g.fill();   // a dark halo, so it reads on a light patch of the room
      g.fillStyle = CRT.ink; g.shadowColor = CRT.ink; g.shadowBlur = 5; g.fill(); g.shadowBlur = 0; g.fill();
    }
    if (!/^\d/.test(text)) hud.setAttribute('aria-label', text);   // the words, not every hundredth of the clock
    if (text === 'BACK') { hud.setAttribute('role', 'button'); hud.tabIndex = 0; } else { hud.removeAttribute('role'); hud.removeAttribute('tabindex'); }
  }
  hud.addEventListener('click', () => { if (hudText === 'BACK') closeScreen(); });
  hud.addEventListener('keydown', (e) => { if (hudText === 'BACK' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); closeScreen(); } });
  function startClock(P) {                              // a layer has turned: the clock runs, from naught or on from where it stopped
    const r = runOf(P), now = performance.now();
    if (r.state === 'ready') { r.t = 0; r.t0 = now; r.state = 'timing'; }
    else if (r.state === 'paused') { r.t0 = now - r.t * 1000; r.state = 'timing'; }
  }
  function stopClock(P, to) { const r = runOf(P); if (r.state === 'timing') { r.t = (performance.now() - r.t0) / 1000; r.state = to; } }
  const onHidden = () => { if (document.hidden && A) stopClock(A, 'paused'); };
  document.addEventListener('visibilitychange', onHidden);

  /* A new entry in a puzzle's five. A solve by hand fast enough for it brings the screen up once the puzzle has
     celebrated (a lab offers one anyway, with a sample time, so the keyboard can be tried). Under the screen, a
     keyboard of the screen's letters types the initials: three letters, DEL takes one back, END keeps them. */
  let drawLine = () => {}, openConfirm = () => {}, closeConfirm = () => false, drawChip = () => {}, launchChip = () => {}, placeChip = () => {}, chipC_reset = () => {}, drawChipMerge = () => {};
  const fly = { on: false, p: 0, v: 0, w: 0, wv: 0, landed: false, bx: 0, by: 0, bw: 1 };
  // where row k of the five sits on the screen as the camera sees it now, in the page's pixels: its middle and the
  // width of its bar of light (the table draws it 111 of the screen's 160 pixels wide, 12 apart from row 55)
  const rowV = V3();
  function rowOnScreen(rank) {
    const at = (px, py) => {
      let xn = px / CRT.w * 2 - 1, yn = 1 - py / CRT.h * 2;
      const k = 1 - 0.06 * (1 - (xn * xn + yn * yn) / 2); xn /= k; yn /= k;   // the picture's swell, undone
      rowV.set(xn * TUBE.a, yn * TUBE.b, tubeZ(xn * TUBE.a, yn * TUBE.b)).applyMatrix4(screenMesh.matrixWorld).project(camera);
      return [box.x + (rowV.x + 1) / 2 * box.w, box.y + (1 - rowV.y) / 2 * box.h];
    };
    const cx = 80.5, cy = 58.5 + 12 * rank, l = at(cx - 55.5, cy), r = at(cx + 55.5, cy), c = at(cx, cy);
    return { x: c[0], y: c[1], w: Math.hypot(r[0] - l[0], r[1] - l[1]) };
  }
  {
    const kb = document.createElement('div'); kb.className = 'kb'; kb.setAttribute('role', 'group'); kb.setAttribute('aria-label', 'Initials');
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(['DEL', 'END']).forEach((k) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = k === 'END' ? 'key end' : 'key'; b.setAttribute('aria-label', k === 'DEL' ? 'Delete' : k === 'END' ? 'Done' : k);
      const c = document.createElement('canvas'), S = k.length > 1 ? 2 : 3, dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = (k.length * 7 - 2) * S, h = 7 * S;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
      const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.beginPath();
      for (let i = 0; i < k.length; i++) { const rows = GLYPH[k[i]]; for (let r = 0; r < 7; r++) for (let j = 0; j < 5; j++) if (rows[r] & (16 >> j)) g.rect((i * 7 + j) * S, r * S, S, S); }
      g.fillStyle = PIX; g.fill();
      b.appendChild(c); b.addEventListener('click', () => typeKey(k)); kb.appendChild(b);
    });
    kb.addEventListener('touchstart', () => {}, { passive: true });   // so that iOS shows a key as pressed
    if (MAC) kb.prepend(macTitle('INITIALS'));            // Side-B: the keys in a window of their own
    hud.after(kb);
    // the entry, not placed yet: its time and the three places for initials, floating over the blurred Mac
    const line = document.createElement('div'); line.className = 'entry-line'; line.setAttribute('aria-live', 'polite');
    const chipC = document.createElement('canvas'); chipC.className = 'chip';
    const ini = document.createElement('canvas'); ini.className = 'ini';
    line.append(chipC, ini); kb.before(line);
    chipC_reset = () => { chipC.style.transform = ''; };
    drawLine = () => { drawPixels(ini, entryInitials(), 3, 10, 6); line.setAttribute('aria-label', lab.time + ' ' + (lab.letters || 'no initials yet')); };
    // a bar of light with dark figures, three times the screen's pixels: the clock while initials are typed, then the
    // whole row (rank, time, initials) with the table's own margins round it, so that it lands on its row exactly
    const GLOW = 6;
    drawChip = (text, padX, padY) => {
      const S = 3, dpr = Math.min(window.devicePixelRatio || 1, 3), tw = (text.length * 7 - 2) * S, th = 7 * S;
      const w = tw + 2 * (padX + GLOW), h = th + 2 * (padY + GLOW);
      chipC.width = Math.round(w * dpr); chipC.height = Math.round(h * dpr); chipC.style.width = w + 'px'; chipC.style.height = h + 'px';
      const g = chipC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (MAC) {                                         // Side-B: a rim of paper round the ink bar, as the window is round its row
        g.fillStyle = CRT.off; g.fillRect(3, 0, w - 6, h); g.fillRect(0, 3, w, h - 6);
        g.fillStyle = CRT.ink; g.fillRect(GLOW, GLOW, w - 2 * GLOW, h - 2 * GLOW);
      } else { g.fillStyle = CRT.ink; g.shadowColor = CRT.ink; g.shadowBlur = 8; g.fillRect(GLOW, GLOW, w - 2 * GLOW, h - 2 * GLOW); g.shadowBlur = 0; }
      g.beginPath();
      for (let i = 0; i < text.length; i++) { const rows = GLYPH[text[i]]; if (!rows) continue; for (let r = 0; r < 7; r++) for (let j = 0; j < 5; j++) if (rows[r] & (16 >> j)) g.rect(GLOW + padX + (i * 7 + j) * S, GLOW + padY + r * S, S, S); }
      g.fillStyle = CRT.off; g.fill();
    };
    // YES: the row goes into the Mac. It leaves the line and lands on its row of the table on the screen, wherever
    // the camera has that row as it goes in: on a spring, heavy enough to overshoot and squash a little where it lands.
    // A swoosh as it goes, bo-lup as it lands, and there the screen takes it over.
    // the flying row, merging out: only the pixels whose moment has not come
    drawChipMerge = (text, k) => {
      const S = 3, dpr = Math.min(window.devicePixelRatio || 1, 3), g = chipC.getContext('2d'), letters = rowLetters(text);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, chipC.width / dpr, chipC.height / dpr);
      const on = new Path2D(), off = new Path2D();
      for (let j = 0; j < 13; j++) for (let i = 0; i < 111; i++) if (mergeAt(i, j) >= k) (letters.has(i + ',' + j) ? off : on).rect(GLOW + i * S, GLOW + j * S, S, S);
      g.fillStyle = CRT.ink; g.fill(on); g.fillStyle = CRT.off; g.fill(off);
    };
    launchChip = () => {
      chipC.style.transform = '';
      const b = chipC.getBoundingClientRect();
      if (!b.width) { Object.assign(fly, { on: false, p: 1, landed: true }); placedEntry(); return; }
      Object.assign(fly, { on: true, p: 0, v: 0, w: 0, wv: 0, landed: false, bx: b.left + b.width / 2, by: b.top + b.height / 2, bw: b.width - 2 * GLOW });
      sound.swoosh();
    };
    placeChip = (t) => {
      const p = fly.p, arc = -14 * Math.sin(Math.PI * clamp(p, 0, 1)), sc = lerp(1, t.w / fly.bw, p), sq = fly.w;
      chipC.style.transform = 'translate(' + ((t.x - fly.bx) * p).toFixed(1) + 'px,' + ((t.y - fly.by) * p + arc).toFixed(1) + 'px) scale(' + (sc * (1 + sq)).toFixed(3) + ',' + (sc * (1 - sq)).toFixed(3) + ')';
    };
    // END asks first, on a card in the screen's letters: the initials and the time on a bar of light, SAVE?, YES or NO
    const wrap = document.createElement('div'); wrap.className = 'confirm-wrap';
    const card = document.createElement('div'); card.className = 'confirm'; card.setAttribute('role', 'alertdialog'); card.setAttribute('aria-label', 'Save?');
    const head = document.createElement('div'); head.className = 'confirm-head'; const headC = document.createElement('canvas'); head.append(headC);
    const ask = MAC ? macTitle('SAVE?') : pixelCanvas('SAVE?', 4, 0, 0); ask.classList.add('confirm-ask');
    const row = document.createElement('div'); row.className = 'confirm-row';
    const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'confirm-yes'; yes.setAttribute('aria-label', 'Yes'); yes.append(pixelCanvas('YES', 4, 0, 0));
    const no = document.createElement('button'); no.type = 'button'; no.className = 'confirm-no'; no.setAttribute('aria-label', 'No'); no.append(pixelCanvas('NO', 4, 0, 0));
    row.append(yes, no); card.append(head, ask, row); wrap.append(card); kb.after(wrap);
    wrap.addEventListener('touchstart', () => {}, { passive: true });
    yes.addEventListener('click', () => keepEntry());
    no.addEventListener('click', () => closeConfirm());
    wrap.addEventListener('click', (e) => { if (e.target === wrap) closeConfirm(); });   // a tap beside the card is a no
    openConfirm = () => {
      if (!lab.letters) return;
      drawPixels(headC, lab.letters + '  ' + lab.time, 3, 0, 0);
      wrap.classList.add('open'); haptic.select(); sound.tick();
    };
    closeConfirm = () => { if (!wrap.classList.contains('open')) return false; wrap.classList.remove('open'); haptic.select(); return true; };
  }
  function drawPixels(c, text, S, pad, glow) {          // the machine's letters into a canvas of their size
    const dpr = Math.min(window.devicePixelRatio || 1, 3), w = (text.length * 7 - 2) * S + pad * 2, h = 7 * S + pad * 2;
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.style.width = w + 'px'; }
    if (c.height !== Math.round(h * dpr)) { c.height = Math.round(h * dpr); c.style.height = h + 'px'; }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); g.beginPath();
    for (let i = 0; i < text.length; i++) {
      const rows = GLYPH[text[i]]; if (!rows) continue;
      for (let r = 0; r < 7; r++) for (let j = 0; j < 5; j++) if (rows[r] & (16 >> j)) g.rect(pad + (i * 7 + j) * S, pad + r * S, S, S);
    }
    g.fillStyle = PIX;
    if (glow && !MAC) { g.shadowColor = CRT.ink; g.shadowBlur = glow; g.fill(); g.shadowBlur = 0; }
    g.fill();
  }
  // Side-B's title bar: stripes across, and the title on a clear patch in the middle
  function macTitle(text) {
    const bar = document.createElement('div'); bar.className = 'mac-title';
    const pad = document.createElement('span'); pad.append(pixelCanvas(text, 2, 0, 0)); bar.append(pad);
    return bar;
  }
  /* The version, at the bottom right while a puzzle is chosen, in the machine's letters. A tap opens the list of every
     change, from the app's own changelog: newest first, in the machine's colours. It closes with CLOSE at its foot, a
     pull down from its top, a slide to the right, or a push on past its end. */
  function pixelCanvas(text, S, pad, glow) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3), w = (text.length * 7 - 2) * S + pad * 2, h = 7 * S + pad * 2;
    const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.beginPath();
    for (let i = 0; i < text.length; i++) {
      const rows = GLYPH[text[i]]; if (!rows) continue;
      for (let r = 0; r < 7; r++) for (let j = 0; j < 5; j++) if (rows[r] & (16 >> j)) g.rect(pad + (i * 7 + j) * S, pad + r * S, S, S);
    }
    if (glow && !MAC) { g.fillStyle = '#000'; g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = glow + 3; g.fill(); g.fill(); }   // over the room: a dark halo, so they read on a light patch of it
    g.fillStyle = PIX;
    if (glow && !MAC) { g.shadowColor = CRT.ink; g.shadowBlur = glow; g.fill(); g.shadowBlur = 0; }
    g.fill();
    return c;
  }
  const VERSION = LAB ? '' : (opts && opts.version) || '';   // a lab is a snippet, not the app: no version, no list of changes
  let logEl = null, logOpen = false;
  if (VERSION) {
    const vb = document.createElement('button'); vb.type = 'button'; vb.className = 'ver'; vb.setAttribute('aria-label', 'Version ' + VERSION + ': the changes');
    if (MAC) { const c = document.createElement('canvas'); macBox(c, 'V' + VERSION, 2, false); vb.appendChild(c); }
    else vb.appendChild(pixelCanvas('V' + VERSION, 2, 8, 5));
    vb.addEventListener('click', openLog);
    hud.after(vb);
  }
  // The changelog read for the list. Each version: what Marcos said (his ask or his bug report), Claude's own line,
  // and the details, a tap away. Versions are grouped by their era (0.6, 0.5 …), newest first; the newest era is open
  // and the others fold, so the very first version is a few taps from the top, not a long scroll away.
  function inlineMd(el, str) {                          // **bold**, `code`, and a link's text
    const re = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\([^)]+\)/g; let at = 0, m;
    while ((m = re.exec(str))) {
      if (m.index > at) el.append(str.slice(at, m.index));
      const n = document.createElement(m[1] ? 'strong' : m[2] ? 'code' : 'span'); n.textContent = m[1] || m[2] || m[3]; el.append(n);
      at = re.lastIndex;
    }
    if (at < str.length) el.append(str.slice(at));
  }
  function mdBlock(lines, box) {                       // paragraphs and nested points
    let stack = [];
    for (const l of lines) {
      if (!l.trim()) continue;
      const li = /^(\s*)- (.*)$/.exec(l);
      if (li) {
        const depth = Math.floor(li[1].length / 2);
        while (stack.length > depth + 1) stack.pop();
        while (stack.length < depth + 1) { const ul = document.createElement('ul'), up = stack[stack.length - 1]; ((up && up.lastElementChild) || up || box).append(ul); stack.push(ul); }
        const item = document.createElement('li'); inlineMd(item, li[2]); stack[stack.length - 1].append(item);
      } else { stack = []; const p = document.createElement('p'); inlineMd(p, l.trim()); box.append(p); }
    }
  }
  function parseLog(md) {
    const out = []; let cur = null, inBug = false;
    for (const l of md.split('\n')) {
      const h = /^## (\d+\.\d+\.\d+) · (.+)$/.exec(l);
      if (h) { cur = { ver: h[1], date: h[2], said: [], claude: [], more: [] }; out.push(cur); inBug = false; continue; }
      if (/^## /.test(l)) { cur = null; continue; }
      if (!cur) continue;
      let m;
      if ((m = /^\*\*Claude:\*\*\s*(.*)$/.exec(l))) { cur.claude.push(m[1]); inBug = false; }
      else if ((m = /^Asked by Marcos,? (.*?): "(.*)"\s*$/.exec(l))) { cur.said.push({ text: m[2], bug: false }); inBug = false; }
      else if ((m = /^- \*\*Bug fix\.\*\* Marcos,? (.*?): "(.*)"\s*$/.exec(l))) { cur.said.push({ text: m[2], bug: true }); inBug = true; }
      else if (inBug && /^\s{2,}- /.test(l)) cur.more.push(l.replace(/^\s{2}/, ''));   // the bug's cause and don't, as details
      else { if (/^\S/.test(l)) inBug = false; cur.more.push(l); }
    }
    return out;
  }
  function logEntries(md) {
    const frag = document.createDocumentFragment(), eras = new Map();
    for (const e of parseLog(md)) { const k = e.ver.split('.').slice(0, 2).join('.'); if (!eras.has(k)) eras.set(k, []); eras.get(k).push(e); }
    let first = true;
    eras.forEach((list, k) => {
      const era = document.createElement('section'); era.className = first ? 'era open' : 'era';
      const head = document.createElement('button'); head.type = 'button'; head.className = 'era-head'; head.setAttribute('aria-expanded', String(first));
      head.append(pixelCanvas('V' + k, 3, 0, 0)); const n = document.createElement('span'); n.textContent = list.length + (list.length === 1 ? ' update' : ' updates'); head.append(n);
      head.addEventListener('click', () => { const open = era.classList.toggle('open'); head.setAttribute('aria-expanded', String(open)); haptic.select(); });
      const box = document.createElement('div'); box.className = 'era-list';
      for (const e of list) {
        const a = document.createElement('article'); a.className = 'rel';
        const t = document.createElement('h3'); t.textContent = e.ver; const d = document.createElement('span'); d.textContent = e.date; t.append(d); a.append(t);
        for (const q of e.said) {
          const p = document.createElement('p'); p.className = 'said'; const b = document.createElement('b'); b.textContent = q.bug ? 'Marcos said (bug)' : 'Marcos said'; p.append(b, ' “' + q.text + '”'); a.append(p);
        }
        const claude = e.claude.length ? e.claude : (e.more.map((l) => /^- (.*)$/.exec(l)).filter(Boolean).slice(0, 1).map((m) => m[1]));
        for (const c of claude) { const p = document.createElement('p'); p.className = 'claude'; const b = document.createElement('b'); b.textContent = 'Claude'; p.append(b, ' '); inlineMd(p, c); a.append(p); }
        if (e.more.some((l) => l.trim())) {
          const more = document.createElement('button'); more.type = 'button'; more.className = 'more'; more.textContent = 'More';
          const det = document.createElement('div'); det.className = 'details'; mdBlock(e.more, det);
          more.addEventListener('click', () => { const open = a.classList.toggle('open'); more.textContent = open ? 'Less' : 'More'; });
          a.append(more, det);
        }
        box.append(a);
      }
      era.append(head, box); frag.append(era); first = false;
    });
    return frag;
  }
  function openLog() {
    if (!logEl) {
      logEl = document.createElement('div'); logEl.className = 'log'; logEl.setAttribute('role', 'dialog'); logEl.setAttribute('aria-label', 'Changes');
      const sc = document.createElement('div'); sc.className = 'log-scroll';
      const title = MAC ? macTitle('CHANGES') : pixelCanvas('CHANGES', 3, 0, 6); title.classList.add('log-title');
      const body = document.createElement('div'); body.className = 'log-body'; body.textContent = 'LOADING...';
      const close = document.createElement('button'); close.type = 'button'; close.className = 'log-close'; close.setAttribute('aria-label', 'Close');
      close.append(pixelCanvas('CLOSE', 2, 0, 0)); close.addEventListener('click', closeLog);
      // CLOSE sits under a line drawn across the text's width: the list scrolls under it, never into the paper round it
      const foot = document.createElement('div'); foot.className = 'log-foot'; foot.append(close);
      sc.append(title, body); logEl.append(sc, foot); host.append(logEl);
      sheetGestures(logEl, sc);
      const src = (opts && opts.changelog) || '', fill = (md) => { body.textContent = ''; body.append(logEntries(md)); };
      if (/^(\/|https?:)/.test(src)) fetch(src).then((r) => (r.ok ? r.text() : Promise.reject(r.status))).then(fill).catch(() => { body.textContent = 'The list could not be loaded.'; });
      else fill(src);
      void logEl.offsetWidth;                           // placed below the frame first, so that it rises
    }
    logEl.classList.add('open'); logOpen = true; haptic.select(); sound.swish();
  }
  function closeLog() {
    if (!logOpen) return false;
    logOpen = false; logEl.style.transition = ''; logEl.style.transform = ''; logEl.classList.remove('open'); haptic.select();
    return true;
  }
  function sheetGestures(el, sc) {                     // pull down from its top, slide right, or push on past its end: it follows, and goes past a mark
    let g = null;
    el.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      g = { x: t.clientX, y: t.clientY, top: sc.scrollTop <= 0, end: sc.scrollTop >= sc.scrollHeight - sc.clientHeight - 1, mode: '', d: 0 };
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (!g) return;
      const t = e.touches[0], dx = t.clientX - g.x, dy = t.clientY - g.y;
      if (!g.mode) {
        if (Math.hypot(dx, dy) < 8) return;
        g.mode = dx > Math.abs(dy) ? 'side' : g.top && dy > 0 ? 'down' : g.end && dy < 0 ? 'past' : 'scroll';
      }
      if (g.mode === 'scroll') return;
      e.preventDefault();
      g.d = Math.max(0, g.mode === 'side' ? dx : g.mode === 'down' ? dy : -dy);
      el.style.transition = 'none';
      el.style.transform = g.mode === 'side' ? 'translateX(' + g.d + 'px)' : g.mode === 'down' ? 'translateY(' + g.d * 0.7 + 'px)' : 'translateY(' + -Math.min(48, g.d * 0.25) + 'px)';
    }, { passive: false });
    const end = () => {
      if (!g) return;
      const go = g.mode && g.mode !== 'scroll' && g.d > (g.mode === 'past' ? 110 : 80);
      if (go) closeLog(); else { el.style.transition = ''; el.style.transform = ''; }
      g = null;
    };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  }

  // The Sidebar opens as if the puzzle in hand were just being finished: the 3×3 in hand, one turn from solved, its
  // clock past a minute. A moment after the room comes in, the last turn goes home, the clock stops on a time good for
  // the top five, and the camera goes to the iMac's screen, where the new entry is typed. Put the puzzle down (or take
  // another) and the hands have it.
  const fin = { stage: 0, t: 0, P: null, touched: false };
  function labFinaleSetup() {
    const P = puzzles.find((q) => q.key === 'cube3'); if (!P) return;
    applyMoves(P, [{ axis: 1, side: 1, dir: 1 }]);
    pick(P);
    view.v = 1; view.vel = 0; P.lift = 1; P.liftV = 0;    // already in hand when the room comes in
    Object.assign(fin, { stage: 1, t: 0, P, touched: false });
  }
  function labFinale(dt) {
    if (!fin.stage || !shown) return;
    const P = fin.P;
    if (A !== P) { fin.stage = 0; return; }
    fin.t += dt;
    if (fin.stage === 1) { const r = runOf(P); r.state = 'timing'; r.t0 = performance.now() - 64.6 * 1000; Object.assign(fin, { stage: 2, t: 0 }); }
    else if (fin.stage === 2) {
      if (runOf(P).state === 'done') fin.stage = 0;     // his own last turn: the celebration is on, and the entry after it
      else if (!fin.touched) fin.t = 0;                  // a first touch first: before one, a browser lets nothing be heard
      else if (fin.t > 1.2 && turn.phase === 'idle') { P.sim.target = 'solved'; P.sim.queue = 0; fin.stage = 3; }
    }
    else if (fin.stage === 3 && !P.sim.cur && !P.sim.history.length && atHome(P)) {
      stopClock(P, 'done'); runOf(P).t = 66.84;          // a time for third place, whatever the frame rate made of the last seconds
      celebrate(P); offerEntry(P); fin.stage = 0;
    }
  }
  // A solve by hand that makes its puzzle's five: once the cube has celebrated and settled, a beat, and the screen.
  // Put down before that, the chance is gone. A lab makes one whatever the time, with a sample time if it is slow.
  let pending = null;
  const rankIn = (key, sec) => BOARDS[key].findIndex((e) => sec < tableSec(e[0]));
  function offerEntry(P) {
    let sec = runOf(P).t;
    if (rankIn(P.key, sec) < 0) { if (!LAB) return; sec = 67.42; }
    pending = { P, key: P.key, sec, t: 0 };
  }
  function updatePending(dt) {
    if (!pending) return;
    if (A !== pending.P) { pending = null; return; }
    if (happy.on || crt.target === 1) pending.t = 0;
    else if ((pending.t += dt) > 0.5) openScreen();
  }
  function startEntry(p) {
    if (lab.on) return;
    const key = p ? p.key : 'cube3', sec = p ? p.sec : 67.42;
    shownKey = key;
    Object.assign(lab, { on: true, done: false, key, rank: rankIn(key, sec), time: tableTime(sec), letters: '', blink: true, blinkT: performance.now() });
    // the keyboard, the clock's bar and the places for initials come with the quick zoom; the mark waits mixed for YES
    drawChip(clock(sec), 5, 5); drawLine(); redrawScreen(); chipC_reset();
    host.classList.add('entry');
  }
  function typeKey(k) {
    if (!lab.on) return;
    if (k === 'END') { openConfirm(); return; }
    if (k === 'DEL') { if (!lab.letters) return; lab.letters = lab.letters.slice(0, -1); }
    else if (lab.letters.length < 3) lab.letters += k;
    else return;
    lab.blink = true; lab.blinkT = performance.now();
    haptic.select(); sound.tick(); drawLine();
  }
  // YES: the keyboard goes, the Mac comes clear and the camera goes in to the screen, and the entry, now its row of the
  // table, goes into the Mac with it (see launchChip). The mark on the screen solves itself as the camera goes.
  function keepEntry() {
    if (!lab.on || !lab.letters || lab.placing) return;
    lab.placing = true; crt.stepT = 0;
    closeConfirm(); haptic.complete();
    host.classList.add('placing'); host.classList.remove('entry');
    drawChip(String(lab.rank + 1) + '  ' + lab.time + '  ' + lab.letters.padEnd(3, ' '), 12, 9);
    launchChip();
  }
  function placedEntry() {                             // arriving on its row: the merge begins, its 8-bit run on the bo-lup's second note
    if (!lab.placing || lab.merge >= 0) return;
    const rows = BOARDS[lab.key]; rows.splice(lab.rank, 0, [lab.time, lab.letters]); rows.length = 5; keepBoards();
    Object.assign(lab, { done: true, mine: lab.rank, merge: 0 });
    sound.merge(0.075);
  }
  function mergedEntry() {                             // merged: the row is the screen's own
    Object.assign(lab, { on: false, placing: false, merge: -1 }); fly.on = false;
    redrawScreen(); host.classList.remove('placing'); chipC_reset();
  }
  // a keyboard of the computer's own types the initials too: letters, Backspace, Enter (then Enter again, or Escape)
  const onKey = (e) => {
    if (!lab.on || crt.target !== 1) return;
    const confirming = host.querySelector('.confirm-wrap.open');
    if (e.key === 'Enter') { e.preventDefault(); if (confirming) keepEntry(); else typeKey('END'); }
    else if (e.key === 'Escape' && confirming) { e.preventDefault(); e.stopPropagation(); closeConfirm(); }
    else if (confirming) return;
    else if (e.key === 'Backspace') { e.preventDefault(); typeKey('DEL'); }
    else if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); typeKey(e.key.toUpperCase()); }
  };
  window.addEventListener('keydown', onKey, true);
  // The dark round the Mac: a soft ellipse, clear over the screen and its bezel, darkening across the Mac's face, and
  // beyond it only so far that the room still shows, out of focus (the lens opens up close to the screen, see the
  // aperture). The scene places it on the screen as it is seen now; the stylesheet draws it.
  const SHROUD = 0.45;                                  // how dark it gets beyond the Mac (the exposure darkens it too)
  function updateShroud() {
    const k = smooth(crt.e, 0.05, 0.85);
    if (k < 0.002) { if (shroudOn) { shroudOn = false; shroud.style.opacity = '0'; } return; }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const q of crt.edge) {
      shP.copy(q).project(camera);
      const x = (shP.x + 1) / 2 * box.w, y = (1 - shP.y) / 2 * box.h;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    const st = shroud.style;
    st.setProperty('--cx', ((x0 + x1) / 2).toFixed(1) + 'px'); st.setProperty('--cy', ((y0 + y1) / 2 + (y1 - y0) * 0.12).toFixed(1) + 'px');
    st.setProperty('--rx', ((x1 - x0) * 0.78).toFixed(1) + 'px'); st.setProperty('--ry', ((y1 - y0) * 0.95).toFixed(1) + 'px');
    st.opacity = (k * SHROUD).toFixed(3);
    shroudOn = true;
  }

  canvas.addEventListener('pointerdown', () => { if (fin.stage === 2) { fin.touched = true; fin.t = 0; } }, true);   // the Sidebar's opening: a touch, and the time from it
  canvas.addEventListener('pointerdown', (e) => {
    measure();                                         // where the canvas is now: its frame can have moved since the last resize
    if (ptr.id !== null) return;
    ptr.id = e.pointerId; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    ptr.x = ptr.x0 = e.clientX; ptr.y = ptr.y0 = e.clientY; ptr.t0 = ptr.tPrev = performance.now(); ptr.v = 0; ptr.armed = false; ptr.hit = null;
    if (crt.target === 1) { ptr.mode = 'screen'; crt.held = true; }    // close on the screen, every touch is for coming back
    else if (!A) { ptr.mode = 'tap'; ptr.hit = pickAt(e.clientX, e.clientY); }
    else {
      const c = onScreen(A), onIt = Math.hypot(e.clientX - c.x, e.clientY - c.y) < c.r;
      if (onIt && seq.running) { ptr.mode = 'spin'; beginFlip(); }
      else if (onIt) { ptr.mode = 'hold'; Object.assign(hold, { on: true, t: 0, fired: false }); }
      else {
        const aim = seq.running ? null : aimAt(e.clientX, e.clientY);
        if (aim && aim.dot) {
          ptr.mode = 'aim'; ptr.aim = aim; aim.dot.el.classList.add('aim');
          ptr.wide = !!gridTap && e.timeStamp - gridTap.t < DOUBLE_MS && Math.hypot(e.clientX - gridTap.x, e.clientY - gridTap.y) < DOUBLE_PX;
          gridTap = null;
        }
        else ptr.mode = seq.running ? 'look' : 'outside';                 // outside the rings: a slide turns the whole puzzle, as on it
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
    if (ptr.mode === 'screen') {                          // a pull down or a slide to the right draws the room back with the finger
      crt.v = 1 - 0.35 * Math.min(1, Math.max(0, mx, my) / 320); crt.vel = 0;
      return;
    }
    if (!A) return;
    if (ptr.mode === 'outside') {                         // a touch beside the grid: once it slides, it turns the puzzle round
      if (Math.hypot(mx, my) < SWIPE_PX) return;
      ptr.mode = 'spin'; beginFlip();                       // which way it turns is read a little further on
      return;
    }
    if (ptr.mode === 'aim') {                              // the first few pixels say which way the swipe goes
      if (Math.hypot(mx, my) < AIM_PX) return;
      const kind = sideways(mx, my) ? 'layer' : 'slice', r = ptr.aim[kind];
      let toward = 1;
      if (ptr.wide && r && r.pos === 0) {                  // from the middle: the outer one on the finger's side
        const b = r.dots[0].el.getBoundingClientRect(), mid = kind === 'layer' ? b.top + b.height / 2 : b.left + b.width / 2;
        toward = kind === 'layer' ? (ptr.y0 < mid ? 1 : -1) : (ptr.x0 > mid ? 1 : -1);
      }
      clearAim();
      if (r && beginTurn(kind, r, ptr.wide, toward)) {
        const d = kind === 'layer' ? mx : my;
        ptr.mode = 'turn'; turn.ang = turn.sgn * d / TURN_PX * Q;
        ptr.v = d / Math.max(0.016, (now - ptr.t0) / 1000);
      } else {                                              // nothing to turn that way: the puzzle turns round instead
        ptr.mode = 'spin'; beginFlip();
      }
    } else if (ptr.mode === 'turn' && turn.phase === 'drag') {
      const d = turn.kind === 'layer' ? dx : dy;
      turn.ang += turn.sgn * d / TURN_PX * Q;
      ptr.v = lerp(ptr.v, d / dtm, 0.5);
    } else if (ptr.mode === 'hold') {
      if (hold.on && !hold.fired) {
        // a hold is a finger that stays put: as soon as it drags, the hold is off and the puzzle spins with it
        // (a little more travel is allowed once the hold has taken, so a resting finger can tremble)
        if (Math.hypot(mx, my) > (hold.t < SWIPE_T ? SWIPE_PX : SWIPE_PX * 2)) { cancelHold(); ptr.mode = 'spin'; beginFlip(); }
      }
    } else if (ptr.mode === 'spin') {
      const down = my > 0 && Math.abs(mx) < DOCK.lean * my && !seq.running, dead = DOCK.dead(), arm = DOCK.arm();
      const pull = down ? clamp((my - dead) / (arm - dead), 0, 1.12) : 0, armed = down && my > arm;
      if (!rot.locked) { if (Math.hypot(mx, my) < LOCK_PX) return; lockFlip(sideways(mx, my)); }
      const grip = SPIN_K * (1 - 0.88 * Math.min(1, pull));           // the more it is pulled down, the less it flips
      const across = rot.axis === Y_AX, d = (across ? dx : dy) * grip, c = (across ? dy : dx) * grip;
      rot.ang += d;
      rot.wob = clamp(rot.wob + c * WOB_K, -WOB_MAX, WOB_MAX);         // across the flip, only a little give
      rot.w = lerp(rot.w, d / dtm, 0.45);
      composeRot();
      A.pullT = pull;
      if (armed !== ptr.armed) { ptr.armed = armed; haptic.select(); sound.arm(); }
    } else if (ptr.mode === 'look') {
      orbit.yawT = clamp(orbit.yawT - dx * 0.0042, -ORBIT.yaw, ORBIT.yaw);
      orbit.pitchT = clamp(orbit.pitchT + dy * 0.003, ORBIT.pitchMin, ORBIT.pitchMax);
    }
  });
  function release(e) {
    if (e.pointerId !== ptr.id) return;
    const up = e.type === 'pointerup';
    const still = Math.hypot(ptr.x - ptr.x0, ptr.y - ptr.y0) < 12;
    if (ptr.mode === 'screen') {
      crt.held = false;
      if (up && ((still && !lab.on) || Math.max(ptr.x - ptr.x0, ptr.y - ptr.y0) > 64)) closeScreen();   // else it springs back (and while initials are typed, a tap beside the keys does nothing)
    }
    else if (ptr.mode === 'tap') { if (ptr.hit && up) pick(ptr.hit); else if (up && still && onIMac(ptr.x, ptr.y)) openScreen(); }
    else if (!A) { /* it was put down mid-gesture */ }
    else if (ptr.mode === 'outside' || ptr.mode === 'look') {   // 'look': beside the puzzle while it mixes itself up
      if (up && still && onIMac(ptr.x, ptr.y)) openScreen();
      else if (up && still && ptr.mode === 'outside') tapOutside(ptr.x, ptr.y, e.timeStamp);
    }
    else if (ptr.mode === 'aim') { if (up && still && !ptr.wide) gridTap = { x: ptr.x, y: ptr.y, t: e.timeStamp }; }   // a tap on the grid: a slide right after it is wide
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
      cancelHold(); if (quick) tapPuzzle(ptr.x, ptr.y);
    }
    hold.on = false; clearAim();
    ptr.id = null; ptr.mode = ''; ptr.hit = null; ptr.armed = false; ptr.wide = false; canvas.classList.remove('dragging');
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); orbit.r = clamp(orbit.r + e.deltaY * 0.0015, ORBIT.rMin, ORBIT.rMax); }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (closeLog() || closeScreen() || putDown()) e.preventDefault(); }
    else if (A && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); runSequence(); }
    else if (!A && e.key >= '1' && e.key <= String(puzzles.length)) { e.preventDefault(); pick(puzzles[+e.key - 1]); }
  });

  /* ───────────────────────── frame ───────────────────────── */
  const pieceDir = V3(), sway = new T.Quaternion(), swayE = new T.Euler(), home = V3(), camPlay = V3(), camSel = V3(), camTgt = V3();
  let last = performance.now(), frames = 0, slowAcc = 0, slowN = 0;
  function frame(now) {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);
    if (resizeDue) { resizeDue = false; resize(); }      // a change of resolution clears the canvas, so it is made before this frame is drawn, never after one
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    const t = now / 1000;
    const amp = reduceMotion ? 0.4 : 1;
    // A screen of the page's own can be in front (the welcome, the install screen): the room is built behind it all
    // the same, but the loader is not lifted until it is gone, and once the room is ready it is not drawn either
    const held = !!(opts && typeof opts.hold === 'function' && opts.hold());
    if (!shown && frames >= 3 && pendingPhotos === 0) host.dataset.room = 'ready';      // for the page: the room is ready to come in
    if (held && !shown && frames >= 3 && pendingPhotos === 0) return;
    if (!held && !shown && frames >= 3 && pendingPhotos === 0) reveal();       // the screen in front has just gone and the room was waiting: the bar starts its run now, while this frame is drawn

    // look
    if (envStale) { envStale = false; look.envDirty = true; }
    if (look.envDirty) { captureEnv(); look.envDirty = false; }

    // a solve that made its five: the screen, once the cube has settled; and the five on the screen, the puzzle in hand's
    updatePending(dt);
    if (A && !lab.on && shownKey !== A.key) { shownKey = A.key; redrawScreen(); }
    // the puzzle in hand: rings, spin, sequences, hold
    if (A) {
      if (!seq.running) updateTurn(dt);
      updateHappy(dt); updateSpin(dt);
      stepMoves(A, dt);
      if (fin.stage) labFinale(dt);
      if (seq.auto === A && view.v > 0.92 && !seq.running) { seq.auto = null; cancelHold(); runSequence(true); }
      if (hold.on && !hold.fired) {
        hold.t += dt;
        const k = clamp((hold.t - 0.12) / (HOLD - 0.12), 0, 1);
        A.exT = 0.7 * k * k;
        if (hold.t >= HOLD) { hold.fired = true; haptic.complete(); runSequence(); }
      }
    }
    // what is heard of all that: the growl of a hold filling, and the air of whatever is spinning
    sound.charge(A && hold.on && !hold.fired ? clamp((hold.t - 0.12) / (HOLD - 0.12), 0, 1) : 0);
    sound.wind(A ? clamp((Math.max(rot.phase === 'idle' ? 0 : rot.phase === 'qsnap' ? rot.vel.length() : Math.abs(rot.w), turn.phase === 'idle' ? 0 : Math.abs(turn.vel)) - 2.5) / 13, 0, 1) : 0);
    bob.vel.addScaledVector(bob.off, -26 * dt).multiplyScalar(Math.exp(-3.4 * dt));
    bob.off.addScaledVector(bob.vel, dt);

    // camera: over the ottoman to choose, in front of the puzzle to play, and the way between
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
    camSel.set(SELECT.cam.x + Math.sin(t * 0.21) * 0.014 * REST * amp, SELECT.cam.y, SELECT.cam.z + Math.sin(t * 0.17 + 1) * 0.012 * REST * amp);
    view.vel += ((view.target - view.v) * 22 - view.vel * 8.6) * dt; view.v += view.vel * dt;
    const ve = smooth(clamp(view.v, 0, 1), 0, 1);
    camera.position.lerpVectors(camSel, camPlay, ve);
    camera.lookAt(camTgt.lerpVectors(SELECT.tgt, CAM_TARGET, ve));
    // the screen, close: the camera goes square on to it, near enough for it to fill the frame
    if (!crt.held) { const ks = crt.fast ? 95 : 30, kd = crt.fast ? 18.5 : 10.4; crt.vel += ((crt.target - crt.v) * ks - crt.vel * kd) * dt; crt.v += crt.vel * dt; }
    crt.e = smooth(clamp(crt.v, 0, 1), 0, 1);
    if (crt.e > 1e-4) {
      const tanV = Math.tan(camera.fov * Math.PI / 360), tanH = tanV * camera.aspect;
      let dist = Math.max(SCR_W / 2 / (0.8 * tanH), SCR_H / 2 / (0.66 * tanV));
      {                                                  // typing: the screen higher, the keyboard under it; else in to the screen, square on and closer
        const kT = lab.on && !lab.placing ? 0 : 1;
        crt.kv += ((kT - crt.k) * 60 - crt.kv * 13) * dt; crt.k += crt.kv * dt;
        dist *= lerp(1, 0.9, crt.k);
      }
      crt.cam.copy(crt.at).addScaledVector(crt.n, dist); crt.look.copy(crt.at);
      { const lift = 0.19 * 2 * dist * tanV * (1 - crt.k); crt.cam.addScaledVector(crt.up, -lift); crt.look.addScaledVector(crt.up, -lift); }
      camera.position.lerp(crt.cam, crt.e); camera.lookAt(camTgt.lerp(crt.look, crt.e));
    }
    // close up, the screen is what the camera exposes for, as a camera pointed at a screen does: the screen brighter,
    // the exposure down, so the screen glows and the room round it falls darker
    screenMat.color.setScalar(MAC ? lerp(1.0, 1.3, crt.e) : lerp(1.6, 2.4, crt.e));   // paper is bright already
    finalMat.uniforms.uExposure.value = baseExposure * lerp(1, 0.58, crt.e);
    // the mark solves itself from the moment the camera sets off, a square at a time (MARK_SOLVE); with a new entry,
    // once the row has dropped into the screen and merged; closed, it is mixed again
    crt.stepT = crt.target === 1 && !lab.on ? crt.stepT + dt : 0;
    let step = crt.step;
    if (crt.e < 0.01) step = 0;
    else if (crt.target === 1) { step = 0; while (step < MARK_SOLVE.length && MARK_SOLVE[step][0] <= crt.stepT) step++; }
    if (step !== crt.step) { crt.step = step; redrawScreen(); }
    if (lab.on && crt.e > 0.01) {                        // the place being typed blinks
      const bl = Math.floor((performance.now() - lab.blinkT) / 400) % 2 === 0;
      if (bl !== lab.blink) { lab.blink = bl; drawLine(); }
    }
    if (fly.on) {                                        // the row's way into the Mac: a spring with a little weight, hardly past its mark, and the merge as it arrives
      const sub = Math.ceil(dt / 0.008), h = dt / sub;
      for (let k = 0; k < sub; k++) {
        fly.v += (120 * (1 - fly.p) - 18 * fly.v) * h; fly.p += fly.v * h;
        fly.wv += (-520 * fly.w - 16 * fly.wv) * h; fly.w += fly.wv * h;
      }
      if (!fly.landed && fly.p >= 0.96) { fly.landed = true; fly.wv = 0.8; sound.bolup(); haptic.select(); placedEntry(); }   // arriving: bo-lup, and it starts going in
      camera.updateMatrixWorld(); placeChip(rowOnScreen(lab.done ? lab.mine : lab.rank));
      if (fly.landed && Math.abs(1 - fly.p) < 0.003 && Math.abs(fly.v) < 0.03 && Math.abs(fly.w) < 0.003) fly.on = false;
    }
    if (lab.merge >= 0) {                                // the merge, 0.3 s: pixel by pixel, out of the flying row and into the screen
      lab.merge = Math.min(1, lab.merge + dt / 0.3);
      camera.updateMatrixWorld(); placeChip(rowOnScreen(lab.mine));
      drawChipMerge(String(lab.mine + 1) + '  ' + lab.time + '  ' + lab.letters.padEnd(3, ' '), lab.merge); redrawScreen();
      if (lab.merge >= 1) mergedEntry();
    }
    drawHud();
    if (api.peek) { camera.position.fromArray(api.peek.from); camera.lookAt(camTgt.fromArray(api.peek.at)); }   // a test's own view of something in the room
    camera.updateMatrixWorld();
    updateShroud();

    // the puzzles: at rest in their hollows, or up in the light facing the camera, and the way between
    swayE.set(Math.sin(t * 0.37) * 0.02 * amp, Math.sin(t * 0.29 + 1) * 0.025 * amp, 0); sway.setFromEuler(swayE);
    for (const P of puzzles) {
      P.liftV += ((P.liftT - P.lift) * 30 - P.liftV * 9.5) * dt; P.lift += P.liftV * dt;
      if (P.lift > 0.5) P.air = true; else if (P.air && P.liftT === 0 && P.lift < 0.07) { P.air = false; sound.land(); }   // back on the cushion
      const k = smooth(clamp(P.lift, 0, 1), 0, 1);
      P.pressT = (P === A && hold.on && !hold.fired) || ptr.hit === P ? 1 : 0;
      P.press += (P.pressT - P.press) * Math.min(1, dt * 18);
      P.pull += (P.pullT - P.pull) * Math.min(1, dt * 14);
      if (P === A) P.playQ.copy(camera.quaternion).multiply(sway).multiply(P.tilt).multiply(rot.q).multiply(P.present);
      home.set(CUBE_HOME.x + Math.sin(t * 0.41) * 0.012 * amp, CUBE_HOME.y + (Math.sin(t * 0.9) * 0.03 + Math.sin(t * 0.53 + 1) * 0.015) * amp - P.pull * 0.3, CUBE_HOME.z);
      if (P === A) { home.add(bob.off); home.y += happy.y; if (crt.e > 0) home.addScaledVector(ASIDE, crt.e); }
      P.group.position.lerpVectors(P.restPos, home, k);
      P.group.quaternion.slerpQuaternions(P.restQ, P.playQ, k);
      P.group.scale.setScalar(lerp(P.spot.s, P.scale, k) * (1 - (k > 0.5 ? 0.035 : 0.06) * P.press) * (1 - 0.1 * Math.min(1, P.pull)));
      if (P === A && happy.on) squash(P);
      P.exV += ((P.exT - P.ex) * 90 - P.exV * 13) * dt; P.ex += P.exV * dt;
      const ex = Math.max(0, P.ex);
      if (P.twist) {
        // Solved and left alone, the layers stand turned out of line and the puzzle is a cube. Anything but a turn of
        // those layers themselves needs them in line first, so they spring into line as it starts, quickly; and
        // they spring back out when the last piece is home again.
        const across = (turn.phase !== 'idle' && turn.P === P && turn.axis !== 0) || !!P.sim.cur || (seq.running && seq.P === P);
        const to = !across && atHome(P) ? 1 : 0, stiff = to ? 420 : 1500, damp = to ? 26 : 70;
        const steps = Math.ceil(dt / 0.008), h = dt / steps;
        for (let q = 0; q < steps; q++) { P.twV += ((to - P.tw) * stiff - P.twV * damp) * h; P.tw += P.twV * h; }
        for (const p of P.pieces) p.holder.quaternion.setFromAxisAngle(P.axes[0], P.twist[cellOf(p)[0] + 1] * P.tw);
      }
      for (const p of P.pieces) {
        if (ex < 1e-4) { p.group.position.set(0, 0, 0); continue; }
        const c = cellOf(p);
        pieceDir.set(0, 0, 0).addScaledVector(P.axes[0], c[0]).addScaledVector(P.axes[1], c[1]).addScaledVector(P.axes[2], c[2]).multiplyScalar(ex * 0.44);
        if (P.sim.cur && P.sim.cur.parts.indexOf(p) >= 0) pieceDir.applyQuaternion(P.qAnim);
        else if (turn.phase !== 'idle' && turn.parts.indexOf(p) >= 0) pieceDir.applyQuaternion(turn.q);
        p.group.position.copy(pieceDir);
      }
      cushionMesh.morphTargetInfluences[P.spot.morph] = 1 - smooth(P.lift, 0.02, 0.45);   // the cushion rises again as it leaves
    }
    // the lens is aimed at the puzzle in hand, or at the three at rest: sharp at its distance and within its own size, softer to every side of it
    camera.updateMatrixWorld();
    subjV.copy(api.peek ? camTgt : A ? A.group.position : puzzles[1].group.position);
    if (crt.e > 0) subjV.lerp(eV.copy(crt.at).addScaledVector(crt.n, -TUBE.sag / 2), crt.e);   // close on the screen, it is the screen: focused through the depth of its curve
    subjV.applyMatrix4(camera.matrixWorldInverse);
    const focus = Math.max(0.3, -subjV.z), fk = Math.max(Math.min(1, dt * 5), crt.e);   // on the way to the screen, the focus keeps up
    const subjR = lerp(A ? A.group.scale.x * (1.45 + Math.max(0, A.ex) * 0.5) : puzzles.reduce((m, P) => Math.max(m, P.group.position.distanceTo(puzzles[1].group.position) + P.group.scale.x * 1.45), 0), 0.2, crt.e);
    lensUniforms.uFocus.value += (focus - lensUniforms.uFocus.value) * fk;
    lensUniforms.uSubject.value.x += (subjV.x / (focus * lensUniforms.uTan.value.x) - lensUniforms.uSubject.value.x) * fk;
    lensUniforms.uSubject.value.y += (subjV.y / (focus * lensUniforms.uTan.value.y) - lensUniforms.uSubject.value.y) * fk;
    lensUniforms.uSubjectR.value += (subjR - lensUniforms.uSubjectR.value) * fk;
    lensUniforms.uAperture.value = LOOK.dof * renderer.domElement.height * lerp(0.55 * REST, 1, ve) * lerp(1, 1.8, crt.e);   // and wide open close to the screen, so the room round the Mac melts into bokeh    // stopped down a little for the close view from above, and by REST more: closer in, the same lens would blur more
    const B = A || lastA;
    if (B) { beam.pos.copy(B.group.position); lightUniforms.uCubeR.value = B.group.scale.x * (1.25 + Math.max(0, B.ex) * 0.4); }

    // props
    vinyl.rotation.y = -t * 3.49;                        // 33⅓ turns a minute
    shaftMat.uniforms.uTime.value = t; shaftMat.uniforms.uFrame.value = reduceMotion ? 0 : frames % 64; finalMat.uniforms.uTime.value = t;
    finalMat.uniforms.uFade.value = Math.min(1, finalMat.uniforms.uFade.value + dt * 1.6);

    if (api.dry) { frames++; api.frames = frames; if (!shown && !held) reveal(); return; }   // a test can run the motion without drawing it
    // the dust slides with where the camera looks, so it reads as air in the room and not as marks on the glass
    camera.getWorldDirection(subjV);
    finalMat.uniforms.uPan.value.set(Math.atan2(subjV.x, -subjV.z), Math.asin(clamp(subjV.y, -1, 1))).multiplyScalar(0.5 / lensUniforms.uTan.value.y);
    // shadows are drawn again only while something that casts one is moving: both lights then, one each frame in turn;
    // with every puzzle at rest they are left as they are
    const moving = !!A || seq.running || puzzles.some((P) => P.sim.cur || Math.abs(P.lift - P.liftT) > 0.002 || Math.abs(P.liftV) > 0.002);
    if (moving) shadowHold = 6;
    if (shadowHold > 0) { shadowHold--; (frames & 1 ? sun : arcSpot).shadow.needsUpdate = true; }
    // render: scene → light shafts → lens → bloom → grade → ink and paint
    renderer.setRenderTarget(sceneRT); renderer.clear(); renderer.render(scene, camera);
    aoMat.uniforms.tDepth.value = sceneRT.depthTexture; aoMat.uniforms.uTexel.value.set(1 / sceneRT.width, 1 / sceneRT.height);
    pass(aoMat, aoRT);
    shaftMat.uniforms.tDepth.value = sceneRT.depthTexture;
    pass(shaftMat, shaftRT);
    compMat.uniforms.tColor.value = sceneRT.texture; compMat.uniforms.tAO.value = aoRT.texture; compMat.uniforms.tShaft.value = shaftRT.texture;
    compMat.uniforms.uHalfTexel.value.set(0.5 / aoRT.width, 0.5 / aoRT.height);
    pass(compMat, compRT);
    lensUniforms.tDepth.value = sceneRT.depthTexture;
    if (LOOK.dof > 0) {
      dofMat.uniforms.tColor.value = compRT.texture; dofMat.uniforms.uTexel.value.set(1 / compRT.width, 1 / compRT.height);
      pass(dofMat, dofRT);
      dofFillMat.uniforms.tSrc.value = dofRT.texture; dofFillMat.uniforms.uTexel.value.set(1 / dofRT.width, 1 / dofRT.height);
      pass(dofFillMat, dofRT2);
    }
    let src = compRT;
    for (let i = 0; i < bloomRT.length; i++) {
      downMat.uniforms.tSrc.value = src.texture; downMat.uniforms.uTexel.value.set(1 / src.width, 1 / src.height); downMat.uniforms.uFirst.value = i === 0 ? 1 : 0;
      pass(downMat, bloomRT[i]); src = bloomRT[i];
    }
    for (let i = bloomRT.length - 2; i >= 0; i--) {
      upMat.uniforms.tSrc.value = bloomRT[i + 1].texture; upMat.uniforms.uTexel.value.set(1 / bloomRT[i + 1].width, 1 / bloomRT[i + 1].height);
      pass(upMat, bloomRT[i]);
    }
    finalMat.uniforms.tColor.value = compRT.texture; finalMat.uniforms.tBlur.value = dofRT2.texture; finalMat.uniforms.tBloom.value = bloomRT[0].texture; finalMat.uniforms.tShaft.value = shaftRT.texture;
    pass(finalMat, ldrRT);
    if (ldrRT) {
      styleMat.uniforms.tColor.value = ldrRT.texture; styleMat.uniforms.tDepth.value = sceneRT.depthTexture;
      styleMat.uniforms.uTexel.value.set(1 / ldrRT.width, 1 / ldrRT.height); styleMat.uniforms.uTime.value = t;
      pass(styleMat, null);
    }

    // drop resolution a step if the device cannot keep up
    frames++; api.frames = frames;
    if (!shown && !held && ((frames >= 3 && pendingPhotos === 0) || now - t0 > 9000)) reveal();
    if (frames > 40) {
      slowAcc += dt; slowN++;
      if (slowN >= 80) { if (slowAcc / slowN > 0.03 && resScale > 0.55) { resScale -= 0.15; resizeDue = true; } slowAcc = 0; slowN = 0; }
    }
  }

  function applyMoves(P, moves) {   // lay a list of turns down at once
    for (const m of moves) {
      const R = m.dir > 0 ? ROT[m.axis] : tr3(ROT[m.axis]);
      P.pieces.filter((p) => cellOf(p)[m.axis] === m.side).forEach((p) => { p.M = mul3(R, p.M); quatFromM(P, p.M, p.qBase); p.group.quaternion.copy(p.qBase); });
      P.sim.history.push({ axis: m.axis, side: m.side, dir: m.dir });
    }
    if (moves.length) { P.sim.target = 'scrambled'; P.sim.queue = 0; }
    if (P !== A) settle(P);
  }
  function jump(n, P) {         // apply n random turns at once (used to check a scrambled shape)
    const moves = [];
    for (let i = 0; i < n; i++) moves.push({ axis: Math.floor(Math.random() * 3), side: Math.random() < 0.5 ? -1 : 1, dir: Math.random() < 0.5 ? -1 : 1 });
    applyMoves(P || A || puzzles[1], moves);
  }
  const api = {                                         // QA hook: drive the scene from a test
    frames: 0, dry: false, style: STYLE, toon: TOON, shown: () => shown, cam: camera, orbit, look, puzzles, view, turn, rot, happy, fin, kick, ptr, hold, seq, poses: POSES.length, aimAt, onScreen, jump, putDown, faceTap, applyMoves,
    active: () => A, pick: (key) => pick(puzzles.find((P) => P.key === key)), toggle: runSequence, sound, makeSound, hint,
    screen: { open: openScreen, close: closeScreen, state: crt, onIMac, canvas: screenCanvas, lab, type: (k) => typeKey(k), fly,
      rowOnScreen }, hud: () => hudLine(),
    setExplode: (v) => { if (A) { A.exT = v; A.ex = v; A.exV = 0; } },
    flick: (kind, pos, pxPerSec, px, wide, toward) => {   // a swipe on a ring: px of drag, then a release at pxPerSec (wide: with the middle)
      const r = RINGS[kind].find((q) => q.pos === pos);
      if (!r || !beginTurn(kind, r, wide, toward)) return false;
      turn.ang = turn.sgn * (px || 0) / TURN_PX * Q; turn.vel = turn.sgn * pxPerSec / TURN_PX * Q;
      if (Math.abs(turn.vel) > SNAP_VEL) turn.phase = 'spin'; else startSnap();
      return true;
    }
  };
  window.__axis = api;
  puzzles.forEach((P) => P.pieces.forEach((p) => quatFromM(P, p.M, p.qBase)));
  if (carried) {                                        // the look was changed: the puzzles stay as they were left, and so does the camera
    puzzles.forEach((P, i) => { if (carried.moves[i] && carried.moves[i].length) applyMoves(P, carried.moves[i]); });
    orbit.yaw = orbit.yawT = carried.yaw; orbit.pitch = orbit.pitchT = carried.pitch; orbit.r = carried.r;
    carried = null;
  }
  applyLook();
  resize();
  let disposed = false, rafId = 0;
  function dispose() {
    disposed = true; gone = true;
    carried = { moves: puzzles.map((P) => P.sim.history.map((m) => ({ axis: m.axis, side: m.side, dir: m.dir }))), yaw: orbit.yawT, pitch: orbit.pitchT, r: orbit.r };
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onHidden);
    window.removeEventListener('keydown', onKey, true);
    if (frameWatch) frameWatch.disconnect();
    if (ownSound) sound.dispose(); else sound.quiet();
    hint.dispose();
    if (window.__axis === api) delete window.__axis;
    if (sceneRT) { sceneRT.depthTexture.dispose(); sceneRT.dispose(); compRT.dispose(); aoRT.dispose(); shaftRT.dispose(); dofRT.dispose(); dofRT2.dispose(); if (ldrRT) ldrRT.dispose(); bloomRT.forEach((r) => r.dispose()); }
    cubeRT.dispose(); if (envRT) envRT.dispose(); if (glassEnv) glassEnv.dispose(); pmrem.dispose();
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    renderer.dispose(); renderer.forceContextLoss();
    host.classList.remove('axis', 'busy', 'play', 'two', 'crt', 'entry', 'placing');
    host.innerHTML = '';
  }
  bail = dispose;

  /* Before the first frame, everything the GPU will need is made, one thing at a time with the page handed back in
     between: the reflections' stand-in, the textures, the program of each thing in the room as it is drawn, and the
     passes after it. The first frame then only draws. */
  async function warm() {
    // the reflections get a stand-in of the same kind and size as the real ones, so the materials that reflect are
    // made with it and the first capture of the room only swaps it
    if (!TOON) {
      const blank = new T.WebGLCubeRenderTarget(128, { type: RT_TYPE });
      blank.clear(renderer, true, true, false);
      const first = pmrem.fromCubemap(blank.texture);
      blank.dispose();
      envMats.forEach((m) => { m.envMap = first.texture; m.needsUpdate = true; });
      envRT = first;
      await slice(true);
    }
    const mats = new Set(), texs = new Set(), things = [];
    scene.traverse((o) => { if (o.material) { things.push(o); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m)); } });
    const texOf = (v) => { if (v && v.isTexture && !v.isRenderTargetTexture && v.version > 0) texs.add(v); };
    mats.forEach((m) => { for (const k in m) texOf(m[k]); if (m.uniforms) for (const k in m.uniforms) texOf(m.uniforms[k] && m.uniforms[k].value); });
    for (const t of texs) { renderer.initTexture(t); await slice(); }
    // Making a program only queues it with the GPU, which compiles it in its own time, and the page then waits for
    // all of them at the first frame that draws with them. So each one is waited for here, alone, before the next:
    // where the GPU can say when a program is done without making the page wait (KHR_parallel_shader_compile), the
    // page asks it now and then and gets on with other things; where it can't, asking for the program's uniforms
    // makes the page wait for that one program only.
    const parallel = renderer.extensions.has('KHR_parallel_shader_compile');
    const later = (ms) => new Promise((go) => setTimeout(go, ms));
    const compile = async (o, cam, into, target) => {
      const n = renderer.info.programs.length;
      renderer.setRenderTarget(target); renderer.compile(o, cam, into);
      const fresh = renderer.info.programs.slice(n);
      for (const p of fresh) {
        if (parallel) { while (!p.isReady()) await later(8); if (quitting()) { bail(); throw QUIT; } }
        p.getUniforms();
        await slice(true);
      }
      if (!fresh.length) await slice();
    };
    for (const o of things) await compile(o, camera, scene, sceneRT);
    const passes = [[aoMat, aoRT], [shaftMat, shaftRT], [compMat, compRT], [dofMat, dofRT], [dofFillMat, dofRT2], [downMat, bloomRT[1] || null], [upMat, bloomRT[0] || null], [finalMat, ldrRT]];
    if (ldrRT) passes.push([styleMat, null]);
    for (const [m, target] of passes) { fsMesh.material = m; await compile(fsScene, fsCam, fsScene, target); }
    renderer.setRenderTarget(null);
    // and the first capture of the room for the reflections, so that the first frame has only itself to draw
    if (look.envDirty) { captureEnv(); look.envDirty = false; envStale = false; await slice(true); }
  }
  await warm();
  if (LAB) labFinaleSetup();
  rafId = requestAnimationFrame(frame);
  return dispose;
}
