// PS2 Fiori: a self-loading concrete mixer as an item in a PS2-era inventory screen. Ported from Marcos's artifact
// (the Self-Loading Mixer page) as it was; the markup lives in components/ps2-fiori/Inventory.tsx and this mounts the
// scene and the controls on it. Every element is found inside `root`, by id, as the artifact had them.
//
// The look (0.2.0, Marcos's references: a pixel keypad, a line-art widget screen, a retro desktop): the scene renders
// at 448 px tall and is scaled up without smoothing, so every line is a fat pixel. Surfaces are cel-shaded in a few flat
// bands of paper and ink, each piece drawn with an ink outline (a back-face hull a fixed number of pixels wide, plus
// the hard edges as lines), over a paper floor with a ruled grid, a sky of pastel waves and ink leaves drifting down.
// Motion is springy: the item pops in past its size and settles, hops when it is loaded and squashes when it mixes.
import * as THREE from 'three';
import { haptic } from '../histok/haptic';

const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

export const THEME_KEY = 'ps2-item-theme';
const THEMES = {
  light: { sky: '#cfe6e8', wave: '#f3ecdc', wave2: '#e9dfc8', fog: '#efe7d4', floor: '#efe7d4', grid: '#2b2a2e', gridA: .14,
           ring: '#2b2a2e', leaf: '#2b2a2e', ped: '#f3ecdc', shadow: .34 },
  dark:  { sky: '#1f1e22', wave: '#2b2a30', wave2: '#26252a', fog: '#26252a', floor: '#26252a', grid: '#f3ecdc', gridA: .16,
           ring: '#f3ecdc', leaf: '#f3ecdc', ped: '#3a3940', shadow: .5 },
};
const DESC = 'A 4×4 mixer that loads, doses, mixes and pours by itself. One operator, no batching plant. The drum never stops turning.';

/* ---------- Cel shader: flat bands of light, a hard highlight, dithered to 5 bits a channel ---------- */
const VS = `
varying vec2 vUv; varying vec3 vN; varying vec2 vEnv;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vN = n;
  vec3 r = reflect(normalize(mv.xyz), n);
  float m = 2.0 * sqrt(r.x*r.x + r.y*r.y + (r.z + 1.0)*(r.z + 1.0));
  vEnv = r.xy / m + 0.5;
  gl_Position = projectionMatrix * mv;
}`;
const DITHER = `
float bayer(vec2 p){
  int i = int(mod(p.x, 4.0)) + int(mod(p.y, 4.0)) * 4;
  float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  return m[i] / 16.0;
}
vec3 quant(vec3 c){ return floor(c * 31.0 + bayer(gl_FragCoord.xy)) / 31.0; }`;
const FS = `
uniform sampler2D uMap; uniform sampler2D uEnv; uniform float uUseMap; uniform vec3 uColor;
uniform float uSpec; uniform float uOpacity; uniform vec3 uEmis;
uniform vec3 uL1; uniform vec3 uL2; uniform vec3 uShade; uniform vec3 uRim;
varying vec2 vUv; varying vec3 vN; varying vec2 vEnv;
${DITHER}
void main(){
  vec4 t = vec4(1.0);
  if (uUseMap > 0.5) t = texture2D(uMap, vUv);
  vec3 n = normalize(vN);
  float d = dot(n, uL1);
  float band = d > 0.45 ? 1.0 : d > 0.0 ? 0.82 : 0.66;
  vec3 col = t.rgb * uColor * mix(uShade, vec3(1.0), band);
  col += uRim * step(0.55, dot(n, uL2));
  float hi = step(0.78, texture2D(uEnv, vEnv).r) * uSpec;
  col = mix(col, vec3(1.0, 0.99, 0.95), hi * 0.55) + uEmis;
  float a = clamp(uOpacity * t.a + hi * 0.4, 0.0, 1.0);
  gl_FragColor = vec4(quant(col), a);
}`;
// the outline: the back faces pushed out along their normals by a fixed number of the scene's own pixels
const HULL_VS = `
uniform vec2 uRes; uniform float uW;
void main(){
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vec2 off = (projectionMatrix * vec4(n, 0.0)).xy;
  float l = length(off);
  if (l > 1e-5) clip.xy += off / l * uW * clip.w * 2.0 / uRes;
  gl_Position = clip;
}`;
const HULL_FS = 'uniform vec3 uInk; void main(){ gl_FragColor = vec4(uInk, 1.0); }';

function canvasTex(w, h, draw, { repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function spaced(g, text, cx, y, sp) {
  const chars = [...text], ws = chars.map((c) => g.measureText(c).width);
  let x = cx - (ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1)) / 2;
  g.textAlign = 'left';
  chars.forEach((c, i) => { g.fillText(c, x, y); x += ws[i] + sp; });
}
function lathe(pts, segs, phiStart = Math.PI) {
  const v2 = pts.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(v2, segs, phiStart, Math.PI * 2);
  const s = [0];
  for (let j = 1; j < v2.length; j++) s.push(s[j - 1] + v2[j].distanceTo(v2[j - 1]));
  const L = s[s.length - 1], uv = geo.attributes.uv, n = v2.length;
  for (let i = 0; i <= segs; i++) for (let j = 0; j < n; j++) uv.setY(i * n + j, s[j] / L);
  uv.needsUpdate = true;
  return geo;
}

/**
 * Mounts the mixer in `root` (the page's markup). `opts.paused()` says when the keys should be left alone (the list of
 * changes is open). Returns `dispose`.
 */
export function mountMixer(root, opts = {}) {
  THREE.ColorManagement.enabled = false;
  const $ = (s) => root.querySelector(s);
  const html = document.documentElement;
  const off = [];                                        // every listener, timer and observer, undone by dispose
  const on = (el, type, fn, o) => { el.addEventListener(type, fn, o); off.push(() => el.removeEventListener(type, fn, o)); };
  let alive = true, raf = 0;

  /* ---------- Theme ---------- */
  let theme = html.dataset.theme === 'dark' ? 'dark' : 'light';

  /* ---------- Panel text ---------- */
  root.querySelectorAll('.seg').forEach((s) => {
    const v = +s.dataset.v;
    s.innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${i < v ? 'on' : ''}" style="--n:${i}"></i>`).join('');
  });
  const descEl = $('#desc');
  const typeDesc = (n) => { descEl.innerHTML = `<span>${DESC.slice(0, n)}</span>${n < DESC.length ? '<span class="caret"></span>' : ''}<span class="rest">${DESC.slice(n)}</span>`; };
  typeDesc(0);

  /* ---------- Renderer ---------- */
  const INTERNAL_H = 448;
  const stage = $('#stage'), glCanvas = $('#gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, powerPreference: 'low-power' });
  } catch {
    stage.insertAdjacentHTML('beforeend', '<div class="nogl">This device could not start WebGL.</div>');
    return { dispose() {} };
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 900);

  const envTex = canvasTex(64, 64, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
    let gr = g.createLinearGradient(0, 30, 0, 64);
    gr.addColorStop(0, 'rgba(60,110,255,0)'); gr.addColorStop(.35, 'rgba(90,130,230,.16)'); gr.addColorStop(1, 'rgba(10,20,60,0)');
    g.fillStyle = gr; g.fillRect(0, 30, 64, 34);
    gr = g.createRadialGradient(20, 17, 0, 20, 17, 17);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    gr = g.createLinearGradient(12, 0, 22, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(12, 6, 10, 52);
    gr = g.createLinearGradient(45, 0, 54, 0);
    gr.addColorStop(0, 'rgba(140,220,255,0)'); gr.addColorStop(.5, 'rgba(140,220,255,.38)'); gr.addColorStop(1, 'rgba(140,220,255,0)');
    g.fillStyle = gr; g.fillRect(45, 10, 9, 44);
  });

  const L1 = new THREE.Vector3(-.45, .6, .68).normalize();
  const L2 = new THREE.Vector3(.92, .08, -.25).normalize();
  const INK = new THREE.Color('#2b2a2e');
  const res = new THREE.Vector2(1, 1);                  // the drawing buffer's size, for the outline's width
  const hullMat = new THREE.ShaderMaterial({
    uniforms: { uRes: { value: res }, uW: { value: 1.25 }, uInk: { value: INK } },
    vertexShader: HULL_VS, fragmentShader: HULL_FS, side: THREE.BackSide,
  });
  const lineMat = new THREE.LineBasicMaterial({ color: INK });
  function ps2Mat({ map = null, color = '#ffffff', spec = .5, opacity = 1, transparent = false, side = THREE.FrontSide,
                    shade = '#b9ae9c', rim = '#000000', emis = '#000000' } = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: map }, uUseMap: { value: map ? 1 : 0 }, uEnv: { value: envTex }, uColor: { value: new THREE.Color(color) },
        uSpec: { value: spec }, uOpacity: { value: opacity }, uEmis: { value: new THREE.Color(emis) },
        uL1: { value: L1 }, uL2: { value: L2 }, uShade: { value: new THREE.Color(shade) }, uRim: { value: new THREE.Color(rim) },
      },
      vertexShader: VS, fragmentShader: FS, transparent, side, depthWrite: !transparent,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });
  }
  // ink it: a hull for the silhouette, lines on the hard edges
  function ink(mesh, { hull = true, edges = 38 } = {}) {
    if (hull) { const h = new THREE.Mesh(mesh.geometry, hullMat); h.renderOrder = -1; mesh.add(h); }
    if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, edges), lineMat));
    return mesh;
  }

  /* ---------- Scene frame ---------- */
  const S = 2.2;                       // item scale (model is in metres)
  const PIVOT_Y = -3.8 + 1.6 * S;      // wheels float 1.2 above the pedestal top (-5)
  const pivot = new THREE.Group(); pivot.position.y = PIVOT_Y; scene.add(pivot);
  const item = new THREE.Group(); item.scale.setScalar(S); item.position.set(-.7 * S, -1.6 * S, 0); pivot.add(item);

  const anim = { drum: null, arm: null, bucket: null, load: null, rams: [], beacon: null, glow: null, parts: null };

  function buildMixer() {
    const M = {
      body:   ps2Mat({ color: '#f3ecdc', spec: .6 }),
      body2:  ps2Mat({ color: '#ddd3bd', spec: .3 }),
      dark:   ps2Mat({ color: '#4a4850', spec: .25, shade: '#8a8590' }),
      black:  ps2Mat({ color: '#2b2a2e', spec: .2, shade: '#9a96a0' }),
      red:    ps2Mat({ color: '#f4a988', spec: .5 }),
      chrome: ps2Mat({ color: '#cfd3d6', spec: 1.0 }),
      glass:  ps2Mat({ color: '#9fd6dc', spec: 1.0, opacity: .55, transparent: true, shade: '#d0e6e8' }),
      lamp:   ps2Mat({ color: '#fff6d8', spec: .3, emis: '#3a3020' }),
      tail:   ps2Mat({ color: '#f2b8c6', spec: .3, emis: '#301018' }),
      load:   ps2Mat({ color: '#c8b48e', spec: 0 }),
    };
    const add = (geo, mat, x = 0, y = 0, z = 0, parent = item, inked = true) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m);
      if (inked && !(mat.transparent)) ink(m);
      return m;
    };
    const boxMM = (x0, x1, y0, y1, z0, z1, mat, parent = item) => add(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, parent);
    const decal = (tex, w, h, x, y, z, ry = 0) => { const m = add(new THREE.PlaneGeometry(w, h), ps2Mat({ map: tex, spec: 0, transparent: true, shade: '#ffffff' }), x, y, z, item, false); m.rotation.y = ry; return m; };

    // textures
    const drumTex = canvasTex(256, 128, (g, W, H) => {
      g.fillStyle = '#f3ecdc'; g.fillRect(0, 0, W, H);
      const stripe = (x0, w, col) => { for (const o of [-W, 0, W]) { g.fillStyle = col; g.beginPath();
        g.moveTo(x0 + o, H); g.lineTo(x0 + o + w, H); g.lineTo(x0 + o + w + H * 1.6, 0); g.lineTo(x0 + o + H * 1.6, 0); g.closePath(); g.fill(); } };
      for (const x0 of [0, 128]) { stripe(x0 - 5, 40, '#2b2a2e'); stripe(x0, 30, '#f4a988'); }
      g.fillStyle = '#2b2a2e'; g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6); [44, 82].forEach((y) => g.fillRect(0, y, W, 2));
    });
    const treadTex = canvasTex(64, 16, (g, w, h) => {
      g.fillStyle = '#2b2a2e'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a5760';
      for (let x = 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 4, h / 2); g.lineTo(x, h); g.lineTo(x + 3, h); g.lineTo(x + 7, h / 2); g.lineTo(x + 3, 0); g.closePath(); g.fill(); }
    }, { repeat: true });
    treadTex.repeat.set(5, 1);
    const brandTex = canvasTex(256, 128, (g) => {
      g.fillStyle = '#f4a988'; g.fillRect(10, 22, 9, 70);
      g.fillStyle = '#2b2a2e'; g.font = '66px Anton, Impact, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('MAZA', 30, 92);
      g.font = '700 17px "Chakra Petch", sans-serif'; g.fillStyle = '#4a4850';
      spaced(g, 'MZ-20  ·  4×4', 110, 118, 2);
    });
    const hazardTex = canvasTex(128, 32, (g, w, h) => {
      g.fillStyle = '#2b2a2e'; g.fillRect(0, 0, w, h); g.fillStyle = '#f3cf7a';
      for (let x = -h; x < w + h; x += 16) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 8, h); g.lineTo(x + 8 + h, 0); g.lineTo(x + h, 0); g.closePath(); g.fill(); }
    });
    const louverTex = canvasTex(64, 32, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = '#2b2a2e';
      for (let y = 4; y < h - 2; y += 5) g.fillRect(4, y, w - 8, 2);
    });

    /* chassis & running gear */
    boxMM(-2.6, 2.2, .72, 1.0, -.5, .5, M.body2);
    boxMM(1.8, 2.3, .7, 1.35, -1.02, 1.02, M.body);
    decal(hazardTex, 1.9, .42, 2.302, 1.0, 0, Math.PI / 2);
    boxMM(2.28, 2.31, 1.1, 1.22, .72, .92, M.tail); boxMM(2.28, 2.31, 1.1, 1.22, -.92, -.72, M.tail);
    const tread = ps2Mat({ map: treadTex, spec: .1, shade: '#9a96a0' }), wall = ps2Mat({ color: '#2b2a2e', spec: .15, shade: '#9a96a0' });
    for (const x of [-1.25, 1.25]) {
      boxMM(x - .1, x + .1, .5, .7, -1.0, 1.0, M.dark);
      for (const z of [-.93, .93]) {
        const tire = add(new THREE.CylinderGeometry(.6, .6, .45, 12), [tread, wall, wall], x, .6, z); tire.rotation.x = Math.PI / 2;
        const rim = add(new THREE.CylinderGeometry(.33, .33, .47, 10), M.body, x, .6, z); rim.rotation.x = Math.PI / 2;
        const hub = add(new THREE.CylinderGeometry(.1, .1, .5, 6), M.dark, x, .6, z); hub.rotation.x = Math.PI / 2;
        const fender = add(new THREE.CylinderGeometry(.72, .72, .52, 8, 1, true, Math.PI / 2, Math.PI), ps2Mat({ color: '#f3ecdc', spec: .3, side: THREE.DoubleSide }), x, .6, z);
        fender.rotation.x = Math.PI / 2;
      }
    }

    /* front body + cab */
    boxMM(-2.85, -1.5, .75, 1.6, -.98, .98, M.body);
    boxMM(-2.96, -2.8, .68, .95, -1.0, 1.0, M.dark);
    boxMM(-2.87, -2.84, 1.3, 1.45, .55, .82, M.lamp); boxMM(-2.87, -2.84, 1.3, 1.45, -.82, -.55, M.lamp);
    decal(brandTex, 1.15, .575, -2.17, 1.17, .985);
    decal(brandTex, 1.15, .575, -2.17, 1.17, -.985, Math.PI);
    boxMM(-2.3, -1.9, .42, .48, .96, 1.12, M.dark);
    boxMM(-2.75, -1.6, 1.6, 1.72, -.35, .95, M.body);
    for (const [x, z] of [[-2.75, -.35], [-2.75, .95], [-1.6, -.35], [-1.6, .95]]) boxMM(x - .05, x + .05, 1.6, 2.86, z - .05, z + .05, M.body);
    boxMM(-2.84, -1.5, 2.84, 2.97, -.43, 1.03, M.body);
    boxMM(-2.05, -1.72, 1.72, 2.3, .05, .6, M.dark);
    boxMM(-2.2, -1.75, 1.72, 1.9, .05, .6, M.dark);
    const wheel = add(new THREE.TorusGeometry(.17, .03, 4, 10), M.black, -2.38, 2.12, .32); wheel.rotation.set(0, Math.PI / 2, 0); wheel.rotation.x = .5;
    const cabGlass = boxMM(-2.72, -1.63, 1.72, 2.84, -.32, .92, M.glass); cabGlass.renderOrder = 2;
    boxMM(-2.98, -2.76, 2.54, 2.58, .94, .98, M.black); boxMM(-3.02, -2.97, 2.25, 2.6, .94, 1.14, M.black);
    anim.beacon = add(new THREE.CylinderGeometry(.08, .08, .13, 8), ps2Mat({ color: '#f4a988', spec: .6, emis: '#3a1400' }), -1.7, 3.04, .85);
    anim.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,190,90,1)'); gr.addColorStop(.35, 'rgba(255,140,30,.6)'); gr.addColorStop(1, 'rgba(255,120,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }),
      color: '#ffffff', transparent: true, depthWrite: false, opacity: .6 }));
    anim.glow.position.set(-1.7, 3.06, .85); anim.glow.scale.setScalar(.7); item.add(anim.glow);

    /* engine bay */
    boxMM(-1.5, -.98, .95, 1.62, -.95, .95, M.body);
    decal(louverTex, .44, .4, -1.24, 1.3, .955);
    decal(louverTex, .44, .4, -1.24, 1.3, -.955, Math.PI);

    /* drum */
    const DRUM = [[0, -.06], [.35, 0], [.8, .35], [1.05, .9], [1.1, 1.35], [1.02, 1.95], [.75, 2.55], [.5, 2.95], [.47, 3.1], [.4, 3.13], [.38, 2.92]];
    const drumG = new THREE.Group(); drumG.position.set(-.9, 1.85, 0); drumG.rotation.z = THREE.MathUtils.degToRad(-77); item.add(drumG);
    anim.drum = add(lathe(DRUM, 16), ps2Mat({ map: drumTex, spec: .7 }), 0, 0, 0, drumG);
    add(new THREE.CylinderGeometry(.22, .22, .12, 8), M.dark, 0, -.08, 0, drumG);
    boxMM(-1.02, -.78, .98, 1.82, -.32, .32, M.dark);
    boxMM(1.42, 1.74, .98, 1.72, -.7, .7, M.dark);
    const hopper = add(new THREE.CylinderGeometry(.72, .38, .55, 4, 1, true), ps2Mat({ color: '#ddd3bd', spec: .3, side: THREE.DoubleSide }), 2.3, 3.06, 0);
    hopper.rotation.y = Math.PI / 4;
    const chute = boxMM(-.5, .5, -.04, .04, -.18, .18, M.dark); chute.position.set(2.55, 2.12, -.5); chute.rotation.set(0, .5, -.75);

    /* loading shovel */
    const arm = new THREE.Group(); arm.position.set(2.05, 1.0, 0); item.add(arm); anim.arm = arm;
    for (const z of [-.95, .95]) { const g = new THREE.BoxGeometry(2.5, .17, .12); g.translate(1.25, 0, 0); add(g, M.body, 0, 0, z, arm); }
    const cross = add(new THREE.CylinderGeometry(.06, .06, 1.9, 6), M.dark, 2.15, 0, 0, arm); cross.rotation.x = Math.PI / 2;
    const bucket = new THREE.Group(); item.add(bucket); anim.bucket = bucket;
    const outer = [[0, 0], [-.15, -.4], [-.1, -.75], [.1, -.95], [.5, -1.0], [1.1, -.98]];
    const inner = [[1.1, -.92], [.5, -.93], [.14, -.88], [-.03, -.72], [-.08, -.4], [.07, 0]];
    const shellG = new THREE.ExtrudeGeometry(new THREE.Shape(outer.concat(inner).map(([x, y]) => new THREE.Vector2(x, y))), { depth: 1.8, bevelEnabled: false });
    shellG.translate(0, 0, -.9);
    add(shellG, ps2Mat({ color: '#f3ecdc', spec: .4 }), 0, 0, 0, bucket);
    const sideG = new THREE.ExtrudeGeometry(new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y))), { depth: .05, bevelEnabled: false });
    add(sideG, M.body2, 0, 0, -.93, bucket); add(sideG, M.body2, 0, 0, .88, bucket);
    boxMM(1.02, 1.16, -1.0, -.94, -.9, .9, M.dark, bucket);
    anim.load = boxMM(.1, 1.0, -.92, -.55, -.85, .85, M.load, bucket); anim.load.visible = false;
    for (const z of [-.8, .8]) {
      const barrel = add(new THREE.CylinderGeometry(.075, .075, 1, 6), M.red, 0, 0, z);
      const rod = add(new THREE.CylinderGeometry(.035, .035, 1, 6), M.chrome, 0, 0, z);
      anim.rams.push({ barrel, rod, z });
    }

    /* aggregate particles */
    const PN = 40, pp = new Float32Array(PN * 3).fill(-99), pv = new Float32Array(PN * 3), pl = new Float32Array(PN);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: .4, color: '#8a7a5c', transparent: true, depthWrite: false }));
    pts.frustumCulled = false; item.add(pts);
    anim.parts = { pp, pv, pl, pg, n: PN, next: 0 };
  }

  /* shovel pose: θ = arm angle, φ = bucket angle (radians) */
  const PIV = new THREE.Vector2(2.05, 1.0), ARM = 2.5, RAM_BASE = new THREE.Vector2(2.2, 1.35);
  const UP = new THREE.Vector3(0, 1, 0), tA = new THREE.Vector3(), tB = new THREE.Vector3(), tD = new THREE.Vector3(), tQ = new THREE.Quaternion();
  const RAISED = THREE.MathUtils.degToRad(71), PHI_REST = 1.25;
  function poseShovel(theta, phi) {
    anim.arm.rotation.z = theta;
    anim.bucket.position.set(PIV.x + Math.cos(theta) * ARM, PIV.y + Math.sin(theta) * ARM, 0);
    anim.bucket.rotation.z = phi;
    const ax = PIV.x + Math.cos(theta) * 1.3, ay = PIV.y + Math.sin(theta) * 1.3;
    for (const r of anim.rams) {
      tA.set(RAM_BASE.x, RAM_BASE.y, r.z); tB.set(ax, ay, r.z);
      tD.subVectors(tB, tA); const len = tD.length(); tD.normalize();
      tQ.setFromUnitVectors(UP, tD);
      r.barrel.quaternion.copy(tQ); r.barrel.scale.set(1, len * .62, 1); r.barrel.position.copy(tA).addScaledVector(tD, len * .31);
      r.rod.quaternion.copy(tQ); r.rod.scale.set(1, len * .5, 1); r.rod.position.copy(tA).addScaledVector(tD, len * .75);
    }
  }
  function bucketPoint(lx, ly) {
    const b = anim.bucket, c = Math.cos(b.rotation.z), s = Math.sin(b.rotation.z);
    return [b.position.x + lx * c - ly * s, b.position.y + lx * s + ly * c];
  }

  /* ---------- Pedestal, floor, sky, leaves ---------- */
  const pedMat = ps2Mat({ color: '#f3ecdc', spec: .2 });
  const ped = ink(new THREE.Mesh(new THREE.CylinderGeometry(9, 9.8, 2, 6), pedMat), { edges: 20 }); ped.position.y = -6; scene.add(ped);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#2b2a2e', transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(7.7, 8.5, 6), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = -4.97; scene.add(ring);
  const discTex = canvasTex(128, 128, (g) => {
    g.translate(64, 64); g.strokeStyle = '#fff';
    g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 2); g.stroke();
    g.setLineDash([6, 5]); g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 51, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 38, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 24; i++) { g.save(); g.rotate(i * Math.PI / 12); g.fillStyle = '#fff'; g.fillRect(-1, -62, 2, i % 3 ? 4 : 9); g.restore(); }
  });
  const discMat = new THREE.MeshBasicMaterial({ map: discTex, color: '#2b2a2e', transparent: true, opacity: .55, depthWrite: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(7.4, 24), discMat); disc.rotation.x = -Math.PI / 2; disc.position.y = -4.96; scene.add(disc);
  const blobG = new THREE.Group(); blobG.position.y = -4.94; scene.add(blobG);
  const blobMat = new THREE.MeshBasicMaterial({
    map: canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(43,42,46,1)'); gr.addColorStop(.62, 'rgba(43,42,46,.9)'); gr.addColorStop(.66, 'rgba(43,42,46,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }),
    transparent: true, opacity: .34, depthWrite: false });
  const blob = new THREE.Mesh(new THREE.CircleGeometry(1, 16), blobMat);
  blob.rotation.x = -Math.PI / 2; blob.scale.set(8.2, 3.6, 1); blobG.add(blob);

  const gridMat = new THREE.ShaderMaterial({
    uniforms: { uBase: { value: new THREE.Color() }, uGrid: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uA: { value: .7 } },
    vertexShader: `varying vec3 vW; varying float vD;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uBase; uniform vec3 uGrid; uniform vec3 uFog; uniform float uA; varying vec3 vW; varying float vD;
      ${DITHER}
      void main(){ vec2 c = vW.xz / 4.0; vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
        float line = 1.0 - min(min(g.x, g.y), 1.0);
        float near = exp(-length(vW.xz) * 0.02);
        vec3 col = mix(uBase, uGrid, line * uA * (0.35 + 0.65 * near));
        col = mix(col, uFog, smoothstep(60.0, 260.0, vD));
        gl_FragColor = vec4(quant(col), 1.0); }`,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), gridMat); floor.rotation.x = -Math.PI / 2; floor.position.y = -7; scene.add(floor);

  // the sky: pastel waves, drawn small and scaled up square-edged like the rest
  const skyCanvas = document.createElement('canvas'); skyCanvas.width = 72; skyCanvas.height = 128;
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.magFilter = skyTex.minFilter = THREE.NearestFilter; skyTex.generateMipmaps = false;
  scene.background = skyTex;
  function drawSky(T) {
    const g = skyCanvas.getContext('2d'), W = 72, H = 128;
    g.fillStyle = T.sky; g.fillRect(0, 0, W, H);
    // the horizon sits about a fifth of the way down on a wide screen, so the waves live above it
    g.fillStyle = T.wave; g.beginPath(); g.moveTo(0, 9); g.bezierCurveTo(18, 2, 34, 18, 72, 6); g.lineTo(72, 15); g.bezierCurveTo(40, 26, 22, 10, 0, 18); g.closePath(); g.fill();
    g.fillStyle = T.wave2; g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(24, 16, 44, 30, 72, 20); g.lineTo(72, 128); g.lineTo(0, 128); g.closePath(); g.fill();
    skyTex.needsUpdate = true;
  }

  // leaves: ink flecks that drift down and sway
  const N = 46, sp = new Float32Array(N * 3), spv = new Float32Array(N), sph = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 7;
    sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = -5 + Math.random() * 18; sp[i * 3 + 2] = Math.sin(a) * r; spv[i] = .8 + Math.random() * 1.2; sph[i] = Math.random() * 6.28;
  }
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparkMat = new THREE.PointsMaterial({ size: .36, color: '#2b2a2e', transparent: true, opacity: .85, depthWrite: false });
  scene.add(new THREE.Points(sparkGeo, sparkMat));

  function applyTheme(t) {
    theme = t; html.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch { /* private mode: the theme just isn't remembered */ }
    const T = THEMES[t];
    drawSky(T);
    gridMat.uniforms.uBase.value.set(T.floor); gridMat.uniforms.uGrid.value.set(T.grid);
    gridMat.uniforms.uFog.value.set(T.fog); gridMat.uniforms.uA.value = T.gridA;
    ringMat.color.set(T.ring); discMat.color.set(T.ring); sparkMat.color.set(T.leaf);
    pedMat.uniforms.uColor.value.set(T.ped); blobMat.opacity = T.shadow;
    $('#themeLbl').textContent = t === 'dark' ? 'Paper' : 'Ink';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', T.sky);
  }

  /* ---------- Layout: centre the item in the free area ---------- */
  const panel = $('#panel'), hud = $('#hud');
  const SPAN_Y = 18.5, SPAN_X = 18, CY = -1.3, EL = THREE.MathUtils.degToRad(13);
  let baseD = 60, zoom = 1, zoomS = 1;
  function layout() {
    const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight;
    renderer.setPixelRatio(INTERNAL_H / h);
    renderer.setSize(w, h, true);
    renderer.getDrawingBufferSize(res);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const pr = panel.getBoundingClientRect(), hr = hud.getBoundingClientRect();
    const wide = w >= 860;
    const fx0 = 0, fx1 = wide ? pr.left - 12 : w, fy0 = hr.bottom + 6, fy1 = wide ? h - 10 : pr.top - 6;
    const cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
    const P = camera.projectionMatrix.elements;
    P[8] = (w / 2 - cx) * 2 / w;
    P[9] = -(h / 2 - cy) * 2 / h;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fy = Math.max(.2, (fy1 - fy0) / h), fxr = Math.max(.2, (fx1 - fx0) / w);
    baseD = Math.max(SPAN_Y / (2 * t * fy), SPAN_X / (2 * t * camera.aspect * fxr));
    html.style.setProperty('--fx', cx + 'px'); html.style.setProperty('--fy', cy + 'px'); html.style.setProperty('--ft', fy0 + 'px');
  }

  /* ---------- Interaction ---------- */
  const clock = new THREE.Clock(); let time = 0;
  let yaw = -.65, pitch = .05, yawVel = 0, dragging = false, lastInteract = -10;
  let autoSpin = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#bSpin').setAttribute('aria-pressed', String(autoSpin));
  const pointers = new Map(); let pinch0 = 0, zoom0 = 1;
  const pdist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const hint = $('#hint');
  on(stage, 'pointerdown', (e) => {
    try { stage.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { pinch0 = pdist(); zoom0 = zoom; }
    dragging = true; yawVel = 0; lastInteract = time; stage.classList.add('grabbing'); hint.classList.add('gone');
  });
  on(stage, 'pointermove', (e) => {
    const p = pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 1) { yaw += dx * .011; pitch = clamp(pitch + dy * .005, -.3, .45); yawVel = dx * .011 * 60; }
    else if (pointers.size === 2 && pinch0 > 0) zoom = clamp(zoom0 * pinch0 / pdist(), .55, 1.5);
    lastInteract = time;
  });
  const up = (e) => {
    pointers.delete(e.pointerId);
    if (e.type === 'pointercancel') yawVel = 0;            // the system took the touch: no fling from it
    if (!pointers.size) { dragging = false; stage.classList.remove('grabbing'); }
    else pinch0 = 0;                                       // one finger left of a pinch: it turns again, no jump
    lastInteract = time;
  };
  on(stage, 'pointerup', up); on(stage, 'pointercancel', up);
  on(stage, 'wheel', (e) => { e.preventDefault(); zoom = clamp(zoom * (1 + e.deltaY * .0012), .55, 1.5); }, { passive: false });

  let loadT = -1, loaded = false, mixT = 1, poured = 1.8;
  const CAP = 9;
  const toastEl = $('#toast'); let toastTimer;
  function toast(msg, ok = false) {
    $('#toastMsg').textContent = msg; toastEl.classList.toggle('ok', ok); $('#toastTitle').textContent = ok ? 'System' : 'System warning';
    if (ok) haptic.select(); else haptic.error();
    toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200); }
  function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function setMeter() { $('#mVal').textContent = poured.toFixed(1); $('#mBar').style.transform = 'scaleX(' + (poured / CAP) + ')'; }
  function load() {
    if (loadT >= 0) return;
    if (loaded) { toast('The drum is full. Mix it first ✕'); return; }
    loadT = 0; $('#bLoad').classList.add('busy'); haptic.select();
  }
  function mix() {
    if (loadT >= 0) { toast('Still loading. Hold on'); return; }
    if (!loaded) { toast('The drum is empty. Load it first △'); return; }
    loaded = false; mixT = 0; yawVel += 6; toastEl.classList.remove('on'); hop.v -= 5.5; haptic.complete();
    retrigger($('#meter'), 'bump');
    poured = Math.round((poured + 1.8) * 10) / 10;
    retrigger($('#flash'), 'on'); retrigger($('#pop'), 'on');
    if (poured > CAP + .01) { poured = 1.8; const t = setTimeout(() => toast('Slab poured. Meter reset', true), 900); off.push(() => clearTimeout(t)); }
    setMeter();
  }
  function toggleSpin() { haptic.select(); autoSpin = !autoSpin; $('#bSpin').setAttribute('aria-pressed', String(autoSpin)); if (autoSpin) lastInteract = -10; }
  const flip = () => { haptic.select(); applyTheme(theme === 'dark' ? 'light' : 'dark'); retrigger(root, 'jelly'); };
  on($('#bMix'), 'click', mix); on($('#bLoad'), 'click', load); on($('#bSpin'), 'click', toggleSpin); on($('#bTheme'), 'click', flip);
  on(window, 'keydown', (e) => {
    if (opts.paused && opts.paused()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'x') mix(); else if (k === 'l' || k === 't') load(); else if (k === 'g') toggleSpin(); else if (k === 'm') flip();
  });

  /* ---------- Frame ---------- */
  let intro = 0;
  const hop = { x: 1, v: 0 };                           // the item's squash: a spring around 1
  const pop = (t) => (t >= 1.6 ? 1 : 1 - Math.exp(-5 * t) * Math.cos(10.5 * t));   // pops in past its size, settles
  const target = new THREE.Vector3(0, CY, 0);
  function spawnParticles() {
    const P = anim.parts;
    for (let k = 0; k < 3; k++) {
      const i = P.next; P.next = (P.next + 1) % P.n;
      const [x, y] = bucketPoint(.45 + Math.random() * .4, -.35);
      P.pp[i * 3] = x; P.pp[i * 3 + 1] = y; P.pp[i * 3 + 2] = (Math.random() - .5) * 1.4;
      P.pv[i * 3] = -1.2 - Math.random() * 1.2; P.pv[i * 3 + 1] = -.5 - Math.random(); P.pv[i * 3 + 2] = 0; P.pl[i] = .8;
    }
  }
  function frame() {
    if (!alive) return;
    const dt = Math.min(clock.getDelta(), .05); time += dt;
    if (!dragging) {
      yaw += yawVel * dt;
      const idle = time - lastInteract > 1.3;
      const goal = autoSpin && idle ? .45 : 0;
      yawVel += (goal - yawVel) * (1 - Math.exp(-dt * (goal ? 1.4 : 3.2)));
      if (idle) pitch += (.05 - pitch) * (1 - Math.exp(-dt * 1.2));
    }
    intro = Math.min(1, intro + dt / .9);
    const ei = ease(intro);
    mixT = Math.min(1, mixT + dt / 2.4);
    const mixing = mixT < 1 ? Math.sin(mixT * Math.PI) : 0;
    const bob = Math.sin(time * 1.4) * .25;
    const shake = mixing * .06;
    pivot.position.set((Math.random() - .5) * shake, PIVOT_Y + bob + (Math.random() - .5) * shake, 0);
    pivot.rotation.set(pitch, yaw - (1 - ei) * 4, 0);
    pivot.scale.setScalar(Math.max(.001, pop(time)));
    hop.v += (-260 * (hop.x - 1) - 11 * hop.v) * dt; hop.x += hop.v * dt;
    item.scale.set(S * (1 + (1 - hop.x) * .5), S * hop.x, S * (1 + (1 - hop.x) * .5));
    blobG.rotation.y = yaw - (1 - ei) * 4; blob.scale.set(8.2 * (1 - bob * .05), 3.6 * (1 - bob * .05), 1);
    // drum always turns; faster while mixing
    anim.drum.rotation.y += dt * (1.3 + mixing * 9);
    // loading sequence
    if (loadT >= 0) {
      loadT = Math.min(1, loadT + dt / 3.6);
      const t = loadT;
      let theta, phi;
      if (t < .28) { const k = ease(seg(t, 0, .28)); theta = lerp(RAISED, 0, k); phi = lerp(PHI_REST, 0, k); }
      else if (t < .40) { const k = ease(seg(t, .28, .40)); theta = 0; phi = lerp(0, .75, k); }
      else if (t < .78) { const k = ease(seg(t, .40, .78)); theta = lerp(0, RAISED, k); phi = lerp(.75, 1.0, k); }
      else if (t < .90) { const k = ease(seg(t, .78, .90)); theta = RAISED; phi = lerp(1.0, 2.9, k); }
      else { const k = ease(seg(t, .90, 1)); theta = RAISED; phi = lerp(2.9, PHI_REST, k); }
      anim.load.visible = t > .33 && t < .86;
      if (t > .83 && t < .9) spawnParticles();
      poseShovel(theta, phi);
      if (t >= 1) { loadT = -1; loaded = true; hop.v += 3.2; $('#bLoad').classList.remove('busy'); toast('Loaded. Now mix it ✕', true); }
    }
    // particles
    const P = anim.parts;
    for (let i = 0; i < P.n; i++) {
      if (P.pl[i] <= 0) continue;
      P.pl[i] -= dt; P.pv[i * 3 + 1] -= 9.8 * dt;
      P.pp[i * 3] += P.pv[i * 3] * dt; P.pp[i * 3 + 1] += P.pv[i * 3 + 1] * dt;
      if (P.pl[i] <= 0 || P.pp[i * 3 + 1] < 2.6) { P.pl[i] = 0; P.pp[i * 3 + 1] = -99; }
    }
    P.pg.attributes.position.needsUpdate = true;
    // beacon
    const blink = Math.max(0, Math.sin(time * 7));
    anim.beacon.material.uniforms.uEmis.value.setRGB(.45 + blink * .55, .18 + blink * .3, 0);
    anim.glow.material.opacity = blink * .6; anim.glow.scale.setScalar(.5 + blink * .5);
    // ambience
    disc.rotation.z = time * .2; ring.rotation.z = -time * .1;
    for (let i = 0; i < N; i++) { sp[i * 3 + 1] -= spv[i] * dt; sp[i * 3] += Math.sin(time * 1.7 + sph[i]) * dt * .8; if (sp[i * 3 + 1] < -5) sp[i * 3 + 1] = 13; }
    sparkGeo.attributes.position.needsUpdate = true;
    // camera
    zoomS += (zoom - zoomS) * (1 - Math.exp(-dt * 8));
    const D = baseD * zoomS;
    camera.position.set(0, CY + Math.sin(EL) * D, Math.cos(EL) * D);
    camera.lookAt(target);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  /* ---------- Start: the brand decal draws in Anton and Chakra Petch, so wait for them (2.5 s at most) ---------- */
  (async () => {
    try {
      await Promise.race([
        Promise.all(['66px Anton', '700 17px "Chakra Petch"', '12px "Share Tech Mono"'].map((f) => document.fonts.load(f))),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch { /* draw with the fallback faces */ }
    if (!alive) return;
    buildMixer();
    poseShovel(RAISED, PHI_REST);
    applyTheme(theme);
    setMeter();
    layout();
    on(window, 'resize', layout);
    const ro = new ResizeObserver(layout); ro.observe(panel); ro.observe(stage); off.push(() => ro.disconnect());
    let typed = 0;
    const typer = setInterval(() => { typed = Math.min(DESC.length, typed + 1); typeDesc(typed); if (typed >= DESC.length) clearInterval(typer); }, 22);
    off.push(() => clearInterval(typer));
    root.classList.add('ready');
    if (opts.onReady) opts.onReady();
    frame();
  })();

  return {
    dispose() {
      alive = false; cancelAnimationFrame(raf); clearTimeout(toastTimer);
      off.forEach((f) => f()); off.length = 0;
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of mats) { for (const v of Object.values(m.uniforms || {})) if (v.value && v.value.isTexture) v.value.dispose(); if (m.map) m.map.dispose(); m.dispose(); }
      });
      skyTex.dispose(); envTex.dispose(); hullMat.dispose(); lineMat.dispose(); renderer.dispose();
    },
  };
}
