// Puts the EX30 together: the skin cut into its parts, the lines between panels, and everything bolted on.
//
//   const { parts } = buildCar();   // each part: { name, material, position, normal, index } in the car's frame, mm
//
// `onStep(done, total)` is called between slices of work, and may return a promise: the page hands the thread back
// there so its loading screen stays alive.
import { DIM, body, bodyNormal, castBody, skinY, skinZ, skinXFront, skinXRear, floorZ, top, roofTop } from './body.js';
import { skin, cut, refine, part, Mesh } from './shell.js';
import { PART, PART_NAME, cuts, LINES, HANDLES } from './features.js';
import { smoothLine, clamp, smoothstep } from './curves.js';
import { wheel } from './wheel.js';
import { cabin } from './cabin.js';

const N = [0, 0, 0];

/** A loose list of triangles being gathered into one part. */
export class Soup {
  constructor() { this.p = []; this.n = []; this.i = []; }
  get count() { return this.p.length / 3; }
  v(x, y, z, nx, ny, nz) { this.p.push(x, y, z); this.n.push(nx, ny, nz); return this.p.length / 3 - 1; }
  tri(a, b, c) { this.i.push(a, b, c); }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
  /** A grid of points rows x cols (row-major indices), as quads; `flip` turns its faces over. */
  grid(ids, rows, cols, flip = false, wrap = false) {
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < (wrap ? cols : cols - 1); c++) {
      const a = ids[r * cols + c], b = ids[r * cols + ((c + 1) % cols)], d = ids[(r + 1) * cols + c], e = ids[(r + 1) * cols + ((c + 1) % cols)];
      if (flip) { this.i.push(a, d, e, a, e, b); } else { this.i.push(a, b, e, a, e, d); }
    }
  }
  /** Adds another soup, moved by a function of each point and normal. */
  add(o, move) {
    const base = this.count, q = [0, 0, 0, 0, 0, 0];
    for (let k = 0; k < o.p.length; k += 3) {
      q[0] = o.p[k]; q[1] = o.p[k + 1]; q[2] = o.p[k + 2]; q[3] = o.n[k]; q[4] = o.n[k + 1]; q[5] = o.n[k + 2];
      if (move) move(q);
      this.p.push(q[0], q[1], q[2]); this.n.push(q[3], q[4], q[5]);
    }
    const flip = move && move.flips;
    for (let k = 0; k < o.i.length; k += 3) { if (flip) this.i.push(o.i[k] + base, o.i[k + 2] + base, o.i[k + 1] + base); else this.i.push(o.i[k] + base, o.i[k + 1] + base, o.i[k + 2] + base); }
    return this;
  }
  /** Normals worked out from the triangles themselves, smoothed across shared points. */
  smooth() {
    const n = new Float64Array(this.p.length), p = this.p;
    for (let k = 0; k < this.i.length; k += 3) {
      const a = this.i[k] * 3, b = this.i[k + 1] * 3, c = this.i[k + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const o of [a, b, c]) { n[o] += nx; n[o + 1] += ny; n[o + 2] += nz; }
    }
    for (let k = 0; k < n.length; k += 3) { const l = Math.hypot(n[k], n[k + 1], n[k + 2]) || 1; this.n[k] = n[k] / l; this.n[k + 1] = n[k + 1] / l; this.n[k + 2] = n[k + 2] / l; }
    return this;
  }
  done(name, material) { return { name, material, position: new Float32Array(this.p), normal: new Float32Array(this.n), index: new Uint32Array(this.i) }; }
}
/** Mirrors a soup's points across the car's centre line. */
export const mirrorY = Object.assign((q) => { q[1] = -q[1]; q[4] = -q[4]; }, { flips: true });

/** The nearest point of the skin to a point close to it, and the normal there. */
function onSkin(p, lift = 0) {
  for (let k = 0; k < 4; k++) { const d = body(p[0], p[1], p[2]); bodyNormal(p[0], p[1], p[2], N); p[0] -= N[0] * d; p[1] -= N[1] * d; p[2] -= N[2] * d; }
  bodyNormal(p[0], p[1], p[2], N);
  return [p[0] + N[0] * lift, p[1] + N[1] * lift, p[2] + N[2] * lift, N[0], N[1], N[2]];
}

/** A flat strip of the given width laid along a path of points on the skin. */
export function ribbon(soup, pts, w, lift = 0.5) {
  const on = pts.map((p) => onSkin(p.slice(), lift)), n = on.length, ids = [];
  for (let i = 0; i < n; i++) {
    const a = on[Math.max(i - 1, 0)], b = on[Math.min(i + 1, n - 1)], c = on[i];
    let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
    let sx = c[4] * tz - c[5] * ty, sy = c[5] * tx - c[3] * tz, sz = c[3] * ty - c[4] * tx;
    const l = Math.hypot(sx, sy, sz) || 1; sx *= w / 2 / l; sy *= w / 2 / l; sz *= w / 2 / l;
    ids.push(soup.v(c[0] - sx, c[1] - sy, c[2] - sz, c[3], c[4], c[5]), soup.v(c[0] + sx, c[1] + sy, c[2] + sz, c[3], c[4], c[5]));
  }
  for (let i = 0; i < n - 1; i++) soup.quad(ids[i * 2], ids[i * 2 + 2], ids[i * 2 + 3], ids[i * 2 + 1]);
}

/** A path given in one of the car's views, as points on the skin, no further apart than `step`. */
export function viewPath(view, pts, { smooth = false, closed = false, step = 9, sideSign = 1 } = {}) {
  let line = smooth ? smoothLine(pts, 6, closed) : pts.slice();
  if (closed && !smooth) line = line.concat([line[0]]);
  const fine = [];
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], b = line[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) fine.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  fine.push(line[line.length - 1]);
  const out = [];
  for (const [u, v] of fine) {
    let p;
    if (view === 'side') p = [u, skinY(u, v) * sideSign, v];
    else if (view === 'top') p = [u, v, skinZ(u, v)];
    else if (view === 'front') p = [skinXFront(v === undefined ? 0 : u, v), u, v];
    else p = [skinXRear(u, v), u, v];
    if (p.every(Number.isFinite)) out.push(p);
  }
  return out;
}

/** A closed blob: a rounded box (a superellipsoid), its half-sizes along three given axes, about a centre. */
export function blob(soup, c, ax, ay, az, pow = 2.6, nu = 28, nv = 18, shape = null) {
  const ids = [], sg = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e), e = 2 / pow;
  for (let j = 0; j <= nv; j++) {
    const ph = -Math.PI / 2 + (Math.PI * j) / nv;
    for (let i = 0; i < nu; i++) {
      const th = (2 * Math.PI * i) / nu;
      let u = sg(Math.cos(ph), e) * sg(Math.cos(th), e), v = sg(Math.cos(ph), e) * sg(Math.sin(th), e), w = sg(Math.sin(ph), e);
      if (shape) [u, v, w] = shape(u, v, w);
      ids.push(soup.v(c[0] + ax[0] * u + ay[0] * v + az[0] * w, c[1] + ax[1] * u + ay[1] * v + az[1] * w, c[2] + ax[2] * u + ay[2] * v + az[2] * w, 0, 0, 1));
    }
  }
  soup.grid(ids, nv + 1, nu, false, true);
}

/* ---- parts bolted on ---- */

function archLiners() {
  const s = new Soup(), R = DIM.ARCH_R + 2, yIn = 590;
  for (const xa of [0, DIM.WB]) for (const sgn of [1, -1]) {
    const ids = [], steps = 56, cols = 3;
    let rows = 0;
    for (let k = 0; k <= steps; k++) {
      const ph = (-0.42 + (k / steps) * (Math.PI + 0.84)), cx = xa + R * Math.cos(ph), cz = DIM.ARCH_Z + R * Math.sin(ph);
      if (cz < floorZ(cx) + 4) continue;
      const yo = skinY(cx, cz); if (!Number.isFinite(yo)) continue;
      const nx = -Math.cos(ph), nz = -Math.sin(ph);
      ids.push(s.v(cx, sgn * (yo - 1), cz, nx, 0, nz), s.v(cx, sgn * (yo - 60), cz, nx, 0, nz), s.v(cx, sgn * yIn, cz, nx, 0, nz)); rows++;
    }
    s.grid(ids, rows, cols, sgn > 0);
    // the well's inner wall
    const hub = s.v(xa, sgn * yIn, DIM.ARCH_Z, 0, sgn, 0), ring = [];
    for (let k = 0; k <= 40; k++) { const ph = -0.5 + (k / 40) * (Math.PI + 1.0); ring.push(s.v(xa + R * Math.cos(ph), sgn * yIn, Math.max(DIM.ARCH_Z + R * Math.sin(ph), 200), 0, sgn, 0)); }
    for (let k = 0; k < 40; k++) { if (sgn > 0) s.tri(hub, ring[k + 1], ring[k]); else s.tri(hub, ring[k], ring[k + 1]); }
  }
  return s.done('arch liners', 'liner');
}

/** How far back the rear window's glass is at height z, `a` out from the centre line. */
function glassX(a, z) { let lo = 3030, hi = 3330; for (let i = 0; i < 26; i++) { const m = 0.5 * (lo + hi); if (top(m, a) > z) lo = m; else hi = m; } return 0.5 * (lo + hi); }

function spoiler() {
  // The roof runs on past the rear window as a lip: its top carries the roof's own line, its underside tucks back to the glass.
  const s = new Soup(), A = 600, cols = 61, sec = [];
  for (let c = 0; c < cols; c++) {
    const a = -A + (2 * A * c) / (cols - 1), aa = Math.abs(a), fade = 1 - Math.pow(aa / A, 6);
    const tipX = 3158 - 96 * (aa / A) * (aa / A), x0 = tipX - 210;
    const row = [];
    for (let k = 0; k <= 8; k++) { const x = x0 + ((tipX - x0) * k) / 8; row.push([x, a, Math.max(roofTop(x, aa), top(x, aa) + 1.2) + 2.5 * smoothstep(0, 0.4, k / 8)]); }
    const zt = row[8][2];
    row.push([tipX + 3, a, zt - 4], [tipX - 1, a, zt - 10]);
    // back under to the glass
    const zg = zt - 20 - 44 * fade; row.push([glassX(aa, zg) + 5, a, zg + 2], [glassX(aa, zg - 14) - 3, a, zg - 14]);
    sec.push(row);
  }
  const rows = sec[0].length, ids = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const p = sec[c][r]; ids.push(s.v(p[0], p[1], p[2], 0, 0, 1)); }
  s.grid(ids, rows, cols, false);
  return s.smooth().done('spoiler', 'gloss');
}

function mirrors() {
  const shell = new Soup(), glass = new Soup(), foot = new Soup();
  for (const sgn of [1, -1]) {
    const yb = skinY(760, 1010);
    // the head: a rounded wedge, taller toward its outer end, leaning back
    const c = [776, sgn * (yb + 118), 1128];
    blob(shell, c, [98, sgn * 10, 6], [0, sgn * 62, 4], [0, sgn * -6, 56], 2.9, 30, 18, (u, v, w) => [u, v, w * (0.82 + 0.18 * v) + 0.06 * u]);
    // the glass, on the face that looks back
    const g = [];
    for (let i = 0; i < 24; i++) { const t = (i / 24) * Math.PI * 2, e = 0.78; const cu = Math.sign(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), e), su = Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), e); g.push(glass.v(c[0] + 99.5, c[1] + sgn * (4 + 52 * cu), c[2] + 2 + 44 * su, 1, 0, 0)); }
    const gc = glass.v(c[0] + 99.5, c[1] + sgn * 4, c[2] + 2, 1, 0, 0);
    for (let i = 0; i < 24; i++) { if (sgn > 0) glass.tri(gc, g[i], g[(i + 1) % 24]); else glass.tri(gc, g[(i + 1) % 24], g[i]); }
    // the arm, from the door up to the head
    const steps = 10, ring = 12, ids = [];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, cx = 758 + 18 * t, cy = yb - 6 + (118 - 20) * t * t * 0.9 + 26 * t, cz = 1000 + 84 * t, rx = 46 - 8 * t, ry = 20 - 5 * t;
      for (let i = 0; i < ring; i++) { const th = (i / ring) * Math.PI * 2; ids.push(foot.v(cx + rx * Math.cos(th), sgn * (cy + ry * Math.sin(th)), cz + 10 * Math.cos(th) * (1 - t), 0, 0, 1)); }
    }
    foot.grid(ids, steps + 1, ring, sgn < 0, true);
  }
  return [shell.smooth().done('mirror shells', 'gloss'), glass.done('mirror glass', 'mirror'), foot.smooth().done('mirror arms', 'gloss')];
}

function handles() {
  const s = new Soup(), back = new Soup();
  for (const [hx, hz] of HANDLES) for (const sgn of [1, -1]) {
    const y = skinY(hx, hz);
    blob(s, [hx, sgn * (y + 9), hz], [124, 0, 0], [0, sgn * 13, 0], [0, 0, 21], 3.4, 24, 12);
    ribbon(back, [[hx - 118, sgn * y, hz - 20], [hx - 60, sgn * y, hz - 20], [hx, sgn * y, hz - 20], [hx + 60, sgn * y, hz - 20], [hx + 118, sgn * y, hz - 20]], 20, 0.6);
  }
  return [s.smooth().done('door handles', 'paint'), back.done('handle recesses', 'line')];
}

function lines() {
  const dark = new Soup(), gloss = new Soup();
  for (const L of LINES) {
    const target = L.material === 'gloss' ? gloss : dark;
    if (L.view === 'side') {
      for (const sgn of [1, -1]) {
        if (L.only === 'left' && sgn > 0) continue; if (L.only === 'right' && sgn < 0) continue;
        ribbon(target, viewPath('side', L.pts, { smooth: L.smooth, closed: L.closed, sideSign: sgn }), L.w);
      }
    } else ribbon(target, viewPath(L.view, L.pts, { smooth: L.smooth, closed: L.closed }), L.w);
  }
  // the bonnet's rear edge is under the wipers' cover; the cover's own edge shows as a line across the scuttle
  return [dark.done('panel lines', 'line'), gloss.done('gloss lines', 'gloss')];
}

/** An arc of the skin round a corner of the car at height z: looked for from a point inside, between two bearings (degrees from straight back, toward the side). */
function cornerArc(px, py, z, deg0, deg1, n, forward = false) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = ((deg0 + ((deg1 - deg0) * i) / n) * Math.PI) / 180, dx = (forward ? -1 : 1) * Math.cos(t), dy = Math.sin(t) * Math.sign(py || 1);
    const d = castBody(px, py, z, dx, dy, 0, 0, 900); if (Number.isFinite(d)) out.push([px + dx * d, py + dy * d, z]);
  }
  return out;
}

function lamps() {
  const white = new Soup(), red = new Soup();
  for (const sgn of [1, -1]) {
    // tail, lower: a column of short bars round the corner
    for (let k = 0; k < 9; k++) { const z = 893 + k * 23; ribbon(red, cornerArc(3200, sgn * 700, z, 22, 78, 10), 11, -6); }
    // tail, upper: bars stepping up the pillar
    for (let k = 0; k < 8; k++) { const z = 1186 + k * 21, t = (z - 1170) / 190; ribbon(red, cornerArc(3120 - 190 * t, sgn * (560 - 40 * t), z, 28, 72, 8), 10, -6); }
    // head: the hammer's bar along the blade, in segments, and its handle down the corner
    const blade = [[470, 757], [540, 764], [610, 771], [680, 779], [735, 786]];
    for (let k = 0; k < blade.length - 1; k++) {
      const a = blade[k], b = blade[k + 1], seg = [];
      for (let i = 0; i <= 5; i++) { const u = 0.06 + (0.88 * i) / 5; seg.push([sgn * (a[0] + (b[0] - a[0]) * u), a[1] + (b[1] - a[1]) * u]); }
      ribbon(white, viewPath('front', seg, { step: 30 }), 15, -6);
    }
    for (let k = 0; k < 4; k++) { const z = 705 + k * 21; ribbon(white, viewPath('front', [[sgn * 762, z], [sgn * 778, z], [sgn * 794, z], [sgn * 808, z]], { step: 30 }), 15, -6); }
  }
  return [white.done('daytime lights', 'lamp'), red.done('tail lights', 'lampRed')];
}

/** Flat glyphs for the tailgate's lettering: each a list of quads in a 0..1 box. */
const GLYPH = {
  V: [[[0.0, 1], [0.26, 1], [0.6, 0.0], [0.4, 0.0]], [[0.84, 1], [1.0, 1], [0.6, 0.0], [0.52, 0.06]]],
  L: [[[0.08, 1], [0.34, 1], [0.34, 0], [0.08, 0]], [[0.08, 0.16], [0.92, 0.16], [0.92, 0], [0.08, 0]]],
};
function lettering() {
  const s = new Soup(), z0 = 1026, h = 30, w = 30;
  const word = [['V', -268], ['O', -134], ['L', 0], ['V', 134], ['O', 268]];
  const put = (u, v, y0) => { const y = y0 + (u - 0.5) * w, z = z0 + v * h, p = onSkin([skinXRear(y, z), y, z], 1.6); return s.v(p[0], p[1], p[2], p[3], p[4], p[5]); };
  for (const [ch, y0] of word) {
    if (ch === 'O') {
      const n = 28, ring = [];
      for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; ring.push(put(0.5 + 0.5 * Math.cos(t), 0.5 + 0.5 * Math.sin(t), y0), put(0.5 + 0.24 * Math.cos(t), 0.5 + 0.36 * Math.sin(t), y0)); }
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; s.quad(ring[i * 2], ring[j * 2], ring[j * 2 + 1], ring[i * 2 + 1]); }
    } else for (const q of GLYPH[ch]) { const ids = q.map(([u, v]) => put(u, v, y0)); s.quad(ids[0], ids[3], ids[2], ids[1]); }
  }
  return s.done('tailgate lettering', 'chrome');
}

function badge() {
  // the iron mark: a ring on the nose with a bar running through it, up toward the car's left
  const ring = new Soup(), face = new Soup(), bar = new Soup(), zc = 692, R = 65;
  const c = onSkin([skinXFront(0, zc), 0, zc], 0);
  const n = [c[3], c[4], c[5]], up = [0, 0, 1], d = n[2];
  const vz = [up[0] - n[0] * d, up[1] - n[1] * d, up[2] - n[2] * d], vl = Math.hypot(...vz); vz[0] /= vl; vz[1] /= vl; vz[2] /= vl;
  const vy = [0, 1, 0];
  const at = (r, t, lift) => [c[0] + n[0] * lift + r * (Math.cos(t) * vy[0] + Math.sin(t) * vz[0]), c[1] + r * Math.cos(t) * vy[1], c[2] + n[2] * lift + r * Math.sin(t) * vz[2] + r * Math.cos(t) * 0];
  const N2 = 48, a = [], b = [], f = [];
  for (let i = 0; i < N2; i++) { const t = (i / N2) * Math.PI * 2; const p = at(R, t, 3), q = at(R - 9, t, 5), r = at(R - 9, t, 4.4); a.push(ring.v(p[0], p[1], p[2], n[0], n[1], n[2])); b.push(ring.v(q[0], q[1], q[2], n[0], n[1], n[2])); f.push(face.v(r[0], r[1], r[2], n[0], n[1], n[2])); }
  const fc = face.v(c[0] + n[0] * 4.4, c[1], c[2] + n[2] * 4.4, n[0], n[1], n[2]);
  for (let i = 0; i < N2; i++) { const j = (i + 1) % N2; ring.quad(a[i], a[j], b[j], b[i]); face.tri(fc, f[j], f[i]); }
  const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, y = 262 - 524 * u, z = 608 + 168 * u; if (Math.hypot(y, z - zc) > R - 2) pts.push([y, z]); else pts.push(null); }
  let run = [];
  for (const p of pts.concat([null])) { if (p) run.push(p); else { if (run.length > 1) ribbon(bar, viewPath('front', run, { step: 20 }), 15, 1.2); run = []; } }
  return [ring.done('badge ring', 'chrome'), face.done('badge face', 'gloss'), bar.done('badge bar', 'chrome')];
}

function plates() {
  // Costa Rican plates are 305 x 152: blank ones, where the car carries them
  const s = new Soup();
  const put = (xOf, zc, sign) => {
    const w = 305 / 2, h = 152 / 2, x = xOf(0, zc) + sign * 9, ids = [];
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ids.push(s.v(x, u * w, zc + v * h, sign, 0, 0));
    if (sign < 0) s.quad(ids[0], ids[3], ids[2], ids[1]); else s.quad(ids[0], ids[1], ids[2], ids[3]);
  };
  put(skinXFront, 438, -1); put(skinXRear, 576, 1);
  return s.done('number plates', 'plate');
}

/** Everything, in slices. Returns { parts, stats }. */
export async function buildCar({ detail = 1, onStep } = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const total = 8; let done = 0;
  const tick = async () => { done++; if (onStep) await onStep(done, total); };
  const m = skin(detail >= 1 ? {} : { step: 18, around: 180, fan: 48 });
  await tick();
  const list = cuts(floorZ);
  for (let k = 0; k < list.length; k++) {
    const c = list[k];
    if (c.fine > 0 && detail >= 1) refine(m, c.g, c.from, c.box, c.fine, 14);
    cut(m, c.g, c.label, c.from, c.box);
    if (k === 6 || k === 10) await tick();
  }
  await tick();
  const parts = [];
  for (const label of [PART.paint, PART.gloss, PART.glass, PART.clad, PART.lens, PART.lensRed, PART.under]) {
    const p = part(m, [label]); if (p.index.length) parts.push({ name: 'body ' + PART_NAME[label], material: PART_NAME[label], ...p });
  }
  for (const p of parts.filter((q) => q.material === 'lens' || q.material === 'lensRed')) {
    const pos = new Float32Array(p.position.length);
    for (let k = 0; k < pos.length; k++) pos[k] = p.position[k] - p.normal[k] * 14;
    parts.push({ name: p.name + ' housing', material: p.material === 'lens' ? 'housing' : 'housingRed', position: pos, normal: p.normal, index: p.index });
  }
  await tick();
  parts.push(archLiners(), spoiler(), ...mirrors(), ...handles(), ...lines());
  await tick();
  parts.push(...lamps(), lettering(), ...badge(), plates());
  await tick();
  for (const [x, sgn, track] of [[0, 1, DIM.TRACK_F], [0, -1, DIM.TRACK_F], [DIM.WB, 1, DIM.TRACK_R], [DIM.WB, -1, DIM.TRACK_R]]) parts.push(...wheel(x, sgn * track / 2, sgn));
  await tick();
  parts.push(...cabin());
  await tick();
  // merge parts that share a material and a name
  const stats = { ms: (typeof performance !== 'undefined' ? performance.now() : 0) - t0, triangles: parts.reduce((n, p) => n + p.index.length / 3, 0), vertices: parts.reduce((n, p) => n + p.position.length / 3, 0) };
  return { parts, stats };
}
