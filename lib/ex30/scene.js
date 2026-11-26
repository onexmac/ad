// The EX30 in a studio: the car built from lib/ex30/model, lit by soft boxes, turned with a finger.
// Plain three.js, no React: the page mounts it into one element.
//
//   const car = mountEx30(host, { loader, paints, onReady });   // builds the canvas inside host
//   car.setPaint('onyx'); car.setView('side'); car.setLamps(false); car.dispose();
//
// Drag to turn the car, pinch or scroll to come closer, two fingers to slide the view; a double tap goes back to the
// opening view. The car's frame is millimetres with x running back from the front axle; the scene's is metres, y up.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildCar } from './model/build.js';
import { DIM, XF, XR } from './model/body.js';

const CENTRE = (XF + XR) / 2000;       // the car's middle, in metres along its length
const TARGET = new THREE.Vector3(0, 0.74, 0);

/** The views the bar offers: the direction the camera looks from (azimuth from the nose, degrees; elevation). */
export const VIEWS = {
  front34: { az: -38, el: 13, d: 0.9 }, front: { az: 0, el: 6, d: 0.62 }, side: { az: -90, el: 5, d: 1 }, rear34: { az: -142, el: 14, d: 0.9 },
  rear: { az: 180, el: 7, d: 0.62 }, top: { az: -90, el: 88, d: 1 },
};

function studio(renderer) {
  // What the paint reflects: a long soft box overhead, strips down each side, a glow ahead and behind, a grey floor.
  const s = new THREE.Scene();
  const lit = (w, h, k, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * 1.02), side: THREE.DoubleSide })); m.position.set(...pos); m.rotation.set(...rot); s.add(m); };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  const pos = dome.geometry.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const t = pos.getY(i) / 30, k = t < 0 ? 0.16 + 0.1 * (1 + t) : 0.26 - 0.2 * Math.min(t * 1.6, 1); col[i * 3] = col[i * 3 + 1] = k; col[i * 3 + 2] = k * 1.04; }
  dome.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); s.add(dome);
  lit(10, 3.6, 7.5, [0, 6, 0], [Math.PI / 2, 0, 0]);
  lit(12, 1.1, 5, [0, 2.6, 6.5], [0, Math.PI, 0]); lit(12, 1.1, 5, [0, 2.6, -6.5], [0, 0, 0]);
  lit(12, 0.5, 2.4, [0, 0.9, 7.5], [0, Math.PI, 0]); lit(12, 0.5, 2.4, [0, 0.9, -7.5], [0, 0, 0]);
  lit(5, 2.4, 3.2, [-9, 2.4, 0], [0, Math.PI / 2, 0]); lit(5, 2.4, 2.4, [9, 2.4, 0], [0, -Math.PI / 2, 0]);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.2, 0.21) })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; s.add(floor);
  const pm = new THREE.PMREMGenerator(renderer), env = pm.fromScene(s, 0.035).texture;
  pm.dispose(); s.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return env;
}

function shadowTexture() {
  // The dark under the car: a soft pool the shape of its floor, deeper where the tyres stand.
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  const blob = (x, y, rx, ry, a) => { g.save(); g.translate(x, y); g.scale(rx, ry); const r = g.createRadialGradient(0, 0, 0, 0, 0, 1); r.addColorStop(0, `rgba(0,0,0,${a})`); r.addColorStop(0.55, `rgba(0,0,0,${a * 0.62})`); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(-1, -1, 2, 2); g.restore(); };
  // the canvas spans 6.4 m by 3.2 m about the car's middle: 80 px to the metre
  for (const dx of [-110, -55, 0, 55, 110]) blob(256 + dx, 128, 120, 96, 0.5);
  const ax = (x) => 256 + (x / 1000 - CENTRE) * 80;
  for (const x of [0, DIM.WB]) for (const sy of [-1, 1]) blob(ax(x), 128 + sy * 64, 34, 22, 0.75);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const css = (el, name, fallback) => (getComputedStyle(el).getPropertyValue(name) || fallback).trim();

export function mountEx30(host, opts = {}) {
  let quit = false, api = null;
  const state = { paint: opts.paint || 'onyx', lamps: true };
  const handle = {
    dispose() { quit = true; if (api) api.dispose(); },
    setPaint(id) { state.paint = id; if (api) api.setPaint(id); },
    setView(v) { if (api) api.setView(v); },
    setLamps(on) { state.lamps = on; if (api) api.setLamps(on); },
  };
  build(host, opts, state, () => quit).then((a) => { if (quit) a.dispose(); else api = a; }, (e) => { if (e !== QUIT) { console.error(e); if (opts.onFail) opts.onFail(String(e && e.message || e)); } });
  return handle;
}
const QUIT = {};

async function build(host, opts, state, quitting) {
  const canvas = document.createElement('canvas'); canvas.className = 'ex-canvas'; canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Volvo EX30 en 3D. Arrastrá para girarlo, pellizcá para acercarte.');
  host.appendChild(canvas);
  const fail = (msg) => { canvas.remove(); if (opts.onFail) opts.onFail(msg); };
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { fail('Este navegador no pudo iniciar WebGL.'); return { dispose() {} }; }
  if (!renderer.capabilities.isWebGL2) { renderer.dispose(); fail('Hace falta WebGL 2 para ver el modelo.'); return { dispose() {} }; }
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const ground = css(host, '--stage', '#0d0e10');
  const scene = new THREE.Scene(); scene.background = new THREE.Color(ground);
  scene.environment = studio(renderer);
  const progress = (p) => { if (opts.onProgress) opts.onProgress(p); };
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  progress(0.06); await frame(); if (quitting()) { renderer.dispose(); canvas.remove(); throw QUIT; }

  /* ---- the car ---- */
  const { parts, stats } = await buildCar({ onStep: async (d, t) => { progress(0.06 + 0.84 * (d / t)); await frame(); if (quitting()) { renderer.dispose(); canvas.remove(); throw QUIT; } } });
  const paints = opts.paints || {};
  const paintOf = (id) => paints[id] || { color: '#0b0c0e', metal: 0.6, rough: 0.36 };
  const P0 = paintOf(state.paint);
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: P0.color, metalness: P0.metal, roughness: P0.rough, clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 1.1 }),
    gloss: new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: 0.1, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.03 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0b1014, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.62, depthWrite: false, envMapIntensity: 1.3 }),
    clad: new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.78, metalness: 0 }),
    under: new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 1 }),
    liner: new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 1, side: THREE.DoubleSide }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x15171b, roughness: 0.04, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.38, depthWrite: false }),
    lensRed: new THREE.MeshPhysicalMaterial({ color: 0x3c0808, roughness: 0.05, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.5, depthWrite: false }),
    housing: new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.35, metalness: 0.7 }),
    housingRed: new THREE.MeshStandardMaterial({ color: 0x1c0404, roughness: 0.4, metalness: 0.4 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xf2f6ff, toneMapped: false }),
    lampRed: new THREE.MeshBasicMaterial({ color: 0xff1c12, toneMapped: false }),
    line: new THREE.MeshBasicMaterial({ color: 0x020203, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe6e8ea, metalness: 1, roughness: 0.09 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0x9aa6b0, metalness: 1, roughness: 0.03 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.86 }),
    alloy: new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.2, envMapIntensity: 1.2 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x4a4d52, metalness: 0.9, roughness: 0.5 }),
    cabin: new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.92 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.96 }),
    screen: new THREE.MeshBasicMaterial({ color: 0x15202b }),
    plate: new THREE.MeshStandardMaterial({ color: 0xe9e9e5, roughness: 0.55 }),
    inside: new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.BackSide }),
  };
  const car = new THREE.Group(); car.position.x = -CENTRE; scene.add(car);
  const lampMeshes = [];
  for (const p of parts) {
    const n = p.position.length / 3, pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = p.position[i * 3] / 1000; pos[i * 3 + 1] = p.position[i * 3 + 2] / 1000; pos[i * 3 + 2] = -p.position[i * 3 + 1] / 1000; nrm[i * 3] = p.normal[i * 3]; nrm[i * 3 + 1] = p.normal[i * 3 + 2]; nrm[i * 3 + 2] = -p.normal[i * 3 + 1]; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setIndex(new THREE.BufferAttribute(p.index, 1));
    const mesh = new THREE.Mesh(g, M[p.material] || M.clad); mesh.name = p.name;
    if (p.material === 'glass') mesh.renderOrder = 3; if (p.material === 'lens' || p.material === 'lensRed') mesh.renderOrder = 4;
    if (p.material === 'lamp' || p.material === 'lampRed') lampMeshes.push(mesh);
    car.add(mesh);
    // seen through the glass, the back of a panel is dark, not paint
    if (p.name === 'body paint' || p.name === 'body gloss') { const back = new THREE.Mesh(g, M.inside); back.name = p.name + ' inside'; car.add(back); }
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);
  const floorTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,255,255,0.11)'); r.addColorStop(0.5, 'rgba(255,255,255,0.045)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; scene.add(floor);

  /* ---- the camera ---- */
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 120);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(TARGET); controls.enableDamping = true; controls.dampingFactor = 0.085; controls.rotateSpeed = 0.62; controls.zoomSpeed = 0.9; controls.panSpeed = 0.6;
  controls.minPolarAngle = 0.02; controls.maxPolarAngle = Math.PI / 2 - 0.035; controls.screenSpacePanning = true;
  let fit = 8;
  const place = (v, dist) => { const az = (v.az * Math.PI) / 180, el = (v.el * Math.PI) / 180, d = dist; return new THREE.Vector3(TARGET.x - Math.cos(az) * Math.cos(el) * d, TARGET.y + Math.sin(el) * d, TARGET.z - Math.sin(az) * Math.cos(el) * d); };
  let dirty = true, fly = null;
  function resize() {
    const r = host.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // far enough that the car fits across the frame whichever way it is turned, and not lost in a wide one
    const half = (camera.fov * Math.PI) / 360, across = Math.atan(Math.tan(half) * camera.aspect);
    fit = Math.max(2.3 / Math.tan(across), 1.5 / Math.tan(half));
    controls.minDistance = 1.6; controls.maxDistance = fit * 1.9;
    dirty = true;
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  camera.position.copy(place(VIEWS.front34, fit * VIEWS.front34.d)); controls.update();
  controls.addEventListener('change', () => { dirty = true; });
  controls.addEventListener('start', () => { fly = null; canvas.classList.add('dragging'); });
  controls.addEventListener('end', () => canvas.classList.remove('dragging'));
  let lastTap = 0;
  const onTap = (e) => { if (e.pointerType === 'mouse') return; const now = performance.now(); if (now - lastTap < 320) api.setView('front34'); lastTap = now; };
  const onDbl = () => api.setView('front34');
  canvas.addEventListener('pointerup', onTap); canvas.addEventListener('dblclick', onDbl);

  let raf = 0, shown = false;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (fly) {
      const t = Math.min((now - fly.t0) / fly.ms, 1), k = 1 - Math.pow(1 - t, 3);
      // swing round the car rather than cut through it: angles and distance, not a straight line
      const az = fly.a0 + fly.da * k, el = fly.e0 + (fly.e1 - fly.e0) * k, d = fly.d0 + (fly.d1 - fly.d0) * k;
      controls.target.lerpVectors(fly.g0, TARGET, k);
      camera.position.set(controls.target.x - Math.cos(az) * Math.cos(el) * d, controls.target.y + Math.sin(el) * d, controls.target.z - Math.sin(az) * Math.cos(el) * d);
      if (t >= 1) fly = null; dirty = true;
    }
    if (controls.update() || dirty) { dirty = false; renderer.render(scene, camera); if (!shown) { shown = true; progress(1); if (opts.onReady) opts.onReady(stats); } }
  }
  // the GPU's programs are made before the first frame is asked for, so the frame that lifts the loader is whole
  try { await renderer.compileAsync(scene, camera); } catch (e) { /* older WebGL: the first frame compiles them */ }
  if (quitting()) { ro.disconnect(); renderer.dispose(); canvas.remove(); throw QUIT; }
  raf = requestAnimationFrame(loop);

  const api = {
    setPaint(id) { const p = paintOf(id); M.paint.color.set(p.color); M.paint.metalness = p.metal; M.paint.roughness = p.rough; dirty = true; },
    setLamps(on) { for (const m of lampMeshes) m.visible = on; dirty = true; },
    setView(name) {
      const v = VIEWS[name]; if (!v) return;
      const off = camera.position.clone().sub(controls.target), d0 = off.length(), e0 = Math.asin(THREE.MathUtils.clamp(off.y / d0, -1, 1)), a0 = Math.atan2(-off.z, -off.x);
      let da = (v.az * Math.PI) / 180 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      fly = { t0: performance.now(), ms: 900, a0, da, e0, e1: (v.el * Math.PI) / 180, d0, d1: fit * v.d, g0: controls.target.clone() };
    },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      canvas.removeEventListener('pointerup', onTap); canvas.removeEventListener('dblclick', onDbl);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      for (const m of Object.values(M)) m.dispose();
      if (scene.environment) scene.environment.dispose();
      renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* already gone */ }
      canvas.remove();
    },
  };
  if (!state.lamps) api.setLamps(false);
  return api;
}
