// The body's skin as a mesh, and the tools that cut it into its parts.
//
// The skin is found by looking out from a line down the middle of the car: square to the line along most of its
// length, fanning forward and backward at its two ends. Every point of the grid is where one of those looks meets
// the solid of body.js, so the mesh is one seamless sheet, its rows true cross-sections of the car.
import { body, bodyNormal, castBody } from './body.js';

/** A triangle mesh that can grow: positions and normals per vertex, three indices and a part label per triangle. */
export class Mesh {
  constructor(cap = 1 << 16) { this.pos = new Float32Array(cap * 3); this.nrm = new Float32Array(cap * 3); this.nv = 0; this.tri = new Uint32Array(cap * 6); this.lab = new Uint8Array(cap * 2); this.nt = 0; }
  vert(x, y, z, nx, ny, nz) {
    if ((this.nv + 1) * 3 > this.pos.length) { const p = new Float32Array(this.pos.length * 2); p.set(this.pos); this.pos = p; const n = new Float32Array(this.nrm.length * 2); n.set(this.nrm); this.nrm = n; }
    const o = this.nv * 3; this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z; this.nrm[o] = nx; this.nrm[o + 1] = ny; this.nrm[o + 2] = nz;
    return this.nv++;
  }
  face(a, b, c, label = 0) {
    if ((this.nt + 1) * 3 > this.tri.length) { const t = new Uint32Array(this.tri.length * 2); t.set(this.tri); this.tri = t; const l = new Uint8Array(this.lab.length * 2); l.set(this.lab); this.lab = l; }
    const o = this.nt * 3; this.tri[o] = a; this.tri[o + 1] = b; this.tri[o + 2] = c; this.lab[this.nt] = label;
    return this.nt++;
  }
}

const Z0 = 640, XA = -340, XB = 2990;

/** The angles around the car's middle line that step evenly along a cross-section's outline, top round to bottom. */
function ringAngles(half) {
  const N = 1500, len = [0]; let px = 0, pz = 0;
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * Math.PI, t = castBody(1500, 0, Z0, 0, Math.sin(th), Math.cos(th), 0, 1600), y = Math.sin(th) * t, z = Math.cos(th) * t;
    // the flat floor needs few points: its length counts for a third
    if (i > 0) len.push(len[i - 1] + Math.hypot(y - px, z - pz) * (Z0 + z < 200 && Z0 + pz < 200 ? 0.33 : 1)); px = y; pz = z;
  }
  const out = []; let k = 0;
  for (let j = 0; j <= half; j++) {
    const s = (j / half) * len[N];
    while (k < N - 1 && len[k + 1] < s) k++;
    const f = (s - len[k]) / (len[k + 1] - len[k] || 1);
    out.push(((k + f) / N) * Math.PI);
  }
  out[0] = 0; out[half] = Math.PI;
  return out;
}

/**
 * The skin. `step` is the spacing of the rows along the car, `around` the number of points round each row and `fan`
 * the number of rows in each end's fan. Returns a Mesh with every triangle labelled 0.
 */
export function skin({ step = 12, around = 260, fan = 72 } = {}) {
  const m = new Mesh(1 << 18), half = around >> 1, th = ringAngles(half), n = [0, 0, 0];
  const sinT = [], cosT = [];
  for (let j = 0; j < around; j++) { const t = j <= half ? th[j] : 2 * Math.PI - th[around - j]; sinT.push(Math.sin(t)); cosT.push(Math.cos(t)); }
  const rows = [];
  for (let k = fan - 1; k >= 1; k--) rows.push({ x: XA, phi: (-k / fan) * (Math.PI / 2) });
  const mid = Math.round((XB - XA) / step);
  for (let i = 0; i <= mid; i++) rows.push({ x: XA + ((XB - XA) * i) / mid, phi: 0 });
  for (let k = 1; k < fan; k++) rows.push({ x: XB, phi: (k / fan) * (Math.PI / 2) });
  const last = new Float32Array(around).fill(NaN);
  const grid = [];
  for (const row of rows) {
    const s = Math.sin(row.phi), c = Math.cos(row.phi), ids = new Uint32Array(around);
    for (let j = 0; j < around; j++) {
      const dx = s, dy = c * sinT[j], dz = c * cosT[j];
      let t = NaN;
      if (last[j] === last[j]) t = castBody(row.x, 0, Z0, dx, dy, dz, Math.max(last[j] - 45, 1), last[j] + 45);
      if (t !== t) t = castBody(row.x, 0, Z0, dx, dy, dz, 1, 2600);
      last[j] = t;
      const x = row.x + dx * t, y = j === 0 || j === half ? 0 : dy * t, z = Z0 + dz * t;
      bodyNormal(x, y, z, n);
      if (j === 0 || j === half) { n[1] = 0; const l = Math.hypot(n[0], n[2]) || 1; n[0] /= l; n[2] /= l; }
      ids[j] = m.vert(x, y, z, n[0], n[1], n[2]);
    }
    grid.push(ids);
  }
  for (let i = 0; i < grid.length - 1; i++) {
    const a = grid[i], b = grid[i + 1];
    for (let j = 0; j < around; j++) { const j2 = (j + 1) % around; m.face(a[j], b[j], b[j2]); m.face(a[j], b[j2], a[j2]); }
  }
  // the two poles: the tip of the nose and the tip of the tail
  for (const end of [0, 1]) {
    const dir = end ? 1 : -1, ox = end ? XB : XA, t = castBody(ox, 0, Z0, dir, 0, 0, 1, 2600);
    bodyNormal(ox + dir * t, 0, Z0, n);
    const p = m.vert(ox + dir * t, 0, Z0, n[0], 0, n[2]), ring = grid[end ? grid.length - 1 : 0];
    for (let j = 0; j < around; j++) { const j2 = (j + 1) % around; if (end) m.face(ring[j], p, ring[j2]); else m.face(ring[j], ring[j2], p); }
  }
  return m;
}

/**
 * Cuts a mesh along the zero line of `g(x, y, z)` and relabels the triangles on its negative side as `label`.
 * Only triangles whose label is in `from` (an array of labels) are touched. `box` is [x0, x1, y0, y1, z0, z1]: a
 * vertex outside it is taken to be outside the region without asking. New vertices on a cut edge are shared between
 * the triangles on either side, so the sheet stays whole; `fix` (optional) is called with each new vertex's index,
 * for anything that should be recomputed there.
 */
export function cut(m, g, label, from, box, opt = {}) {
  const want = new Uint8Array(256); for (const f of from) want[f] = 1;
  const val = new Float32Array(m.nv), known = new Uint8Array(m.nv);
  const P = m.pos;
  const value = (i) => {
    if (i < known.length && known[i]) return val[i];
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    let v = 1e6;
    if (!box || (x >= box[0] && x <= box[1] && y >= box[2] && y <= box[3] && z >= box[4] && z <= box[5])) v = g(x, y, z);
    if (v === 0) v = 1e-7;
    if (i < known.length) { known[i] = 1; val[i] = v; }
    return v;
  };
  const made = new Map();
  const onEdge = (i, j, vi, vj) => {
    const key = i < j ? i * 4294967296 + j : j * 4294967296 + i;
    let k = made.get(key);
    if (k !== undefined) return k;
    // where along the edge the region's line crosses: bisect on g itself, so corners and curves are met exactly
    let t0 = 0, t1 = 1, f0 = vi;
    const ax = m.pos[i * 3], ay = m.pos[i * 3 + 1], az = m.pos[i * 3 + 2], bx = m.pos[j * 3], by = m.pos[j * 3 + 1], bz = m.pos[j * 3 + 2];
    let t = vi / (vi - vj);
    if (!(Math.abs(vi) > 1e5 || Math.abs(vj) > 1e5)) {
      for (let it = 0; it < 7; it++) {
        const f = g(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t);
        if ((f < 0) === (f0 < 0)) { t0 = t; } else { t1 = t; }
        t = 0.5 * (t0 + t1);
      }
    } else t = 0.5;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
    let nx = m.nrm[i * 3] * (1 - t) + m.nrm[j * 3] * t, ny = m.nrm[i * 3 + 1] * (1 - t) + m.nrm[j * 3 + 1] * t, nz = m.nrm[i * 3 + 2] * (1 - t) + m.nrm[j * 3 + 2] * t;
    const l = Math.hypot(nx, ny, nz) || 1;
    k = m.vert(x, y, z, nx / l, ny / l, nz / l);
    made.set(key, k);
    if (opt.fix) opt.fix(k);
    return k;
  };
  const nt = m.nt;
  for (let f = 0; f < nt; f++) {
    if (!want[m.lab[f]]) continue;
    const a = m.tri[f * 3], b = m.tri[f * 3 + 1], c = m.tri[f * 3 + 2];
    const va = value(a), vb = value(b), vc = value(c);
    const ia = va < 0, ib = vb < 0, ic = vc < 0, n = ia + ib + ic;
    if (n === 0) continue;
    if (n === 3) { m.lab[f] = label; continue; }
    const old = m.lab[f];
    // turn the triangle so that the odd vertex out is first
    let p, q, r, vp, vq, vr, oneIn;
    if (n === 1) { oneIn = true; if (ia) { p = a; q = b; r = c; vp = va; vq = vb; vr = vc; } else if (ib) { p = b; q = c; r = a; vp = vb; vq = vc; vr = va; } else { p = c; q = a; r = b; vp = vc; vq = va; vr = vb; } }
    else { oneIn = false; if (!ia) { p = a; q = b; r = c; vp = va; vq = vb; vr = vc; } else if (!ib) { p = b; q = c; r = a; vp = vb; vq = vc; vr = va; } else { p = c; q = a; r = b; vp = vc; vq = va; vr = vb; } }
    const pq = onEdge(p, q, vp, vq), pr = onEdge(p, r, vp, vr);
    const tipLabel = oneIn ? label : old, restLabel = oneIn ? old : label;
    m.tri[f * 3] = p; m.tri[f * 3 + 1] = pq; m.tri[f * 3 + 2] = pr; m.lab[f] = tipLabel;
    m.face(pq, q, r, restLabel); m.face(pq, r, pr, restLabel);
  }
  return m;
}

/** Splits the triangles that straddle g's zero line into four, `levels` times, so a cut that follows has finer edges to land on. */
export function refine(m, g, from, box, levels = 1, band = 12) {
  const want = new Uint8Array(256); for (const f of from) want[f] = 1;
  for (let lv = 0; lv < levels; lv++) {
    const made = new Map(), P = m.pos, nt = m.nt;
    const mid = (i, j) => {
      const key = i < j ? i * 4294967296 + j : j * 4294967296 + i; let k = made.get(key); if (k !== undefined) return k;
      const x = (m.pos[i * 3] + m.pos[j * 3]) / 2, y = (m.pos[i * 3 + 1] + m.pos[j * 3 + 1]) / 2, z = (m.pos[i * 3 + 2] + m.pos[j * 3 + 2]) / 2;
      let nx = m.nrm[i * 3] + m.nrm[j * 3], ny = m.nrm[i * 3 + 1] + m.nrm[j * 3 + 1], nz = m.nrm[i * 3 + 2] + m.nrm[j * 3 + 2]; const l = Math.hypot(nx, ny, nz) || 1;
      k = m.vert(x, y, z, nx / l, ny / l, nz / l); made.set(key, k); return k;
    };
    const inBox = (i) => !box || (P[i * 3] >= box[0] && P[i * 3] <= box[1] && P[i * 3 + 1] >= box[2] && P[i * 3 + 1] <= box[3] && P[i * 3 + 2] >= box[4] && P[i * 3 + 2] <= box[5]);
    const near = new Uint8Array(nt);
    for (let f = 0; f < nt; f++) {
      if (!want[m.lab[f]]) continue;
      const a = m.tri[f * 3], b = m.tri[f * 3 + 1], c = m.tri[f * 3 + 2];
      if (!inBox(a) && !inBox(b) && !inBox(c)) continue;
      const va = g(P[a * 3], P[a * 3 + 1], P[a * 3 + 2]), vb = g(P[b * 3], P[b * 3 + 1], P[b * 3 + 2]), vc = g(P[c * 3], P[c * 3 + 1], P[c * 3 + 2]);
      const lo = Math.min(va, vb, vc), hi = Math.max(va, vb, vc);
      if (lo < band && hi > -band) near[f] = 1;
    }
    // a triangle beside a split one shares its halved edge: split it in two or three to match, so no gap opens
    const edgeSplit = new Set();
    const ek = (i, j) => (i < j ? i * 4294967296 + j : j * 4294967296 + i);
    for (let f = 0; f < nt; f++) if (near[f]) { const a = m.tri[f * 3], b = m.tri[f * 3 + 1], c = m.tri[f * 3 + 2]; edgeSplit.add(ek(a, b)); edgeSplit.add(ek(b, c)); edgeSplit.add(ek(c, a)); }
    for (let f = 0; f < nt; f++) {
      const a = m.tri[f * 3], b = m.tri[f * 3 + 1], c = m.tri[f * 3 + 2], L = m.lab[f];
      if (near[f]) {
        const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
        m.tri[f * 3] = a; m.tri[f * 3 + 1] = ab; m.tri[f * 3 + 2] = ca;
        m.face(ab, b, bc, L); m.face(ca, bc, c, L); m.face(ab, bc, ca, L);
        continue;
      }
      const sab = edgeSplit.has(ek(a, b)), sbc = edgeSplit.has(ek(b, c)), sca = edgeSplit.has(ek(c, a)), n = sab + sbc + sca;
      if (n === 0) continue;
      if (n === 3) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); m.tri[f * 3] = a; m.tri[f * 3 + 1] = ab; m.tri[f * 3 + 2] = ca; m.face(ab, b, bc, L); m.face(ca, bc, c, L); m.face(ab, bc, ca, L); continue; }
      // rotate so the (first) split edge is p-q
      let p, q, r, s2;
      if (n === 1) { if (sab) { p = a; q = b; r = c; } else if (sbc) { p = b; q = c; r = a; } else { p = c; q = a; r = b; }
        const pq = mid(p, q); m.tri[f * 3] = p; m.tri[f * 3 + 1] = pq; m.tri[f * 3 + 2] = r; m.face(pq, q, r, L);
      } else { // two split edges: the unsplit one is q-r after rotation, splits on p-q and r-p
        if (!sbc) { p = a; q = b; r = c; } else if (!sca) { p = b; q = c; r = a; } else { p = c; q = a; r = b; }
        const pq = mid(p, q), rp = mid(r, p);
        m.tri[f * 3] = p; m.tri[f * 3 + 1] = pq; m.tri[f * 3 + 2] = rp; m.face(pq, q, r, L); m.face(pq, r, rp, L);
      }
    }
  }
  return m;
}

/** The triangles of one label (or several) as a mesh of its own: { position, normal, index }, with only the vertices it uses. */
export function part(m, labels) {
  const want = new Uint8Array(256); for (const l of [].concat(labels)) want[l] = 1;
  const map = new Int32Array(m.nv).fill(-1); let nv = 0, nt = 0;
  for (let f = 0; f < m.nt; f++) if (want[m.lab[f]]) { nt++; for (let k = 0; k < 3; k++) { const i = m.tri[f * 3 + k]; if (map[i] < 0) map[i] = nv++; } }
  const position = new Float32Array(nv * 3), normal = new Float32Array(nv * 3), index = new Uint32Array(nt * 3);
  for (let i = 0; i < m.nv; i++) { const k = map[i]; if (k < 0) continue; position.set(m.pos.subarray(i * 3, i * 3 + 3), k * 3); normal.set(m.nrm.subarray(i * 3, i * 3 + 3), k * 3); }
  let o = 0;
  for (let f = 0; f < m.nt; f++) if (want[m.lab[f]]) { index[o++] = map[m.tri[f * 3]]; index[o++] = map[m.tri[f * 3 + 1]]; index[o++] = map[m.tri[f * 3 + 2]]; }
  return { position, normal, index };
}
