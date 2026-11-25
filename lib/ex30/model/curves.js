// One-dimensional curves for the EX30 body: traced points in, smooth functions out.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const mix = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/**
 * A curve through the given points, [x, y] pairs in rising x: piecewise cubic, smooth (C1) and never overshooting
 * its points (Fritsch-Carlson). Outside the points it carries on straight, at the end slopes.
 */
export function pchip(pts) {
  const n = pts.length, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const h = [], d = [];
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); d.push((ys[i + 1] - ys[i]) / h[i]); }
  const m = new Array(n);
  if (n === 2) { m[0] = m[1] = d[0]; }
  else {
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    const end = (h0, h1, d0, d1) => { let v = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1); if (v * d0 <= 0) v = 0; else if (d0 * d1 <= 0 && Math.abs(v) > 3 * Math.abs(d0)) v = 3 * d0; return v; };
    m[0] = end(h[0], h[1], d[0], d[1]);
    m[n - 1] = end(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  }
  const f = (x) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
    const t = (x - xs[lo]) / h[lo], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h[lo] * m[lo] + (-2 * t3 + 3 * t2) * ys[lo + 1] + (t3 - t2) * h[lo] * m[lo + 1];
  };
  return f;
}

/**
 * A function sampled once into a table and read back by cubic interpolation: as smooth as the function, and a
 * handful of multiplications to read. `at(x)` is its value, `d(x)` its slope. Outside the table it carries on straight.
 */
export class Tab {
  constructor(fn, x0, x1, step = 2) {
    this.x0 = x0; this.step = step; this.n = Math.ceil((x1 - x0) / step) + 1; this.x1 = x0 + (this.n - 1) * step;
    const v = (this.v = new Float64Array(this.n + 2));
    for (let i = 0; i < this.n; i++) v[i + 1] = fn(x0 + i * step);
    v[0] = 2 * v[1] - v[2]; v[this.n + 1] = 2 * v[this.n] - v[this.n - 1];
    this.s0 = (v[2] - v[1]) / step; this.s1 = (v[this.n] - v[this.n - 1]) / step;
  }
  at(x) {
    const u = (x - this.x0) / this.step;
    if (u <= 0) return this.v[1] + this.s0 * (x - this.x0);
    if (u >= this.n - 1) return this.v[this.n] + this.s1 * (x - this.x1);
    const i = u | 0, t = u - i, v = this.v, p0 = v[i], p1 = v[i + 1], p2 = v[i + 2], p3 = v[i + 3];
    return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  }
  d(x) {
    const u = (x - this.x0) / this.step;
    if (u <= 0) return this.s0;
    if (u >= this.n - 1) return this.s1;
    const i = u | 0, t = u - i, v = this.v, p0 = v[i], p1 = v[i + 1], p2 = v[i + 2], p3 = v[i + 3];
    return (0.5 * (p2 - p0 + t * (2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) + t * 3 * (3 * (p1 - p2) + p3 - p0)))) / this.step;
  }
}

/** A traced curve, tabulated: points in, a Tab out. */
export const curve = (pts, x0, x1, step = 2) => new Tab(pchip(pts), x0, x1, step);

/** Smooth minimum of two values, rounding their meeting over about k. */
export function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
export function smax(a, b, k) { return -smin(-a, -b, k); }

/**
 * The meeting of two solids given by their distances (negative inside), with the edge between them rounded to a
 * true arc of radius r: what a fillet is.
 */
export function fillet(a, b, r) {
  if (r <= 0) return Math.max(a, b);
  const u = a + r, v = b + r;
  if (u <= 0 || v <= 0) return Math.max(a, b);
  return Math.sqrt(u * u + v * v) - r;
}

/** Signed distance from a point to a closed polygon [[x,y],...] (negative inside). */
export function sdPolygon(px, py, poly) {
  let d = Infinity, inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], ay = poly[j][1], bx = poly[i][0], by = poly[i][1];
    const ex = bx - ax, ey = by - ay, wx = px - ax, wy = py - ay;
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1), dx = wx - ex * t, dy = wy - ey * t;
    const dd = dx * dx + dy * dy; if (dd < d) d = dd;
    if ((ay > py) !== (by > py) && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) inside = !inside;
  }
  return (inside ? -1 : 1) * Math.sqrt(d);
}

/** Distance from a point to an open polyline. */
export function distPolyline(px, py, line) {
  let d = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const ax = line[i][0], ay = line[i][1], ex = line[i + 1][0] - ax, ey = line[i + 1][1] - ay, wx = px - ax, wy = py - ay;
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey || 1), 0, 1), dx = wx - ex * t, dy = wy - ey * t;
    const dd = dx * dx + dy * dy; if (dd < d) d = dd;
  }
  return Math.sqrt(d);
}

/** A polyline through the points, resampled as a smooth curve (centripetal Catmull-Rom), `per` points per span. */
export function smoothLine(pts, per = 8, closed = false) {
  const n = pts.length, out = [], P = (i) => (closed ? pts[((i % n) + n) % n] : pts[clamp(i, 0, n - 1)]);
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t, o = [];
      for (let c = 0; c < p1.length; c++) o.push(0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * (p1[c] - p2[c]) + p3[c] - p0[c]) * t3));
      out.push(o);
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}

/** A polygon with its corners rounded: each corner cut back by r and bridged with an arc of `seg` steps. */
export function roundPoly(pts, r, seg = 6) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const rr = Array.isArray(r) ? r[i] : r;
    let ux = a[0] - p[0], uy = a[1] - p[1], vx = b[0] - p[0], vy = b[1] - p[1];
    const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy); ux /= lu; uy /= lu; vx /= lv; vy /= lv;
    const cosA = clamp(ux * vx + uy * vy, -1, 1), half = Math.acos(cosA) / 2;
    if (!(rr > 0) || half < 1e-3 || Math.abs(Math.PI / 2 - half) < 1e-3) { out.push(p.slice()); continue; }
    const cut = Math.min(rr / Math.tan(half), lu * 0.45, lv * 0.45), r2 = cut * Math.tan(half);
    const bx = ux + vx, by = uy + vy, bl = Math.hypot(bx, by), cx = p[0] + (bx / bl) * (r2 / Math.sin(half)), cy = p[1] + (by / bl) * (r2 / Math.sin(half));
    const s = [p[0] + ux * cut, p[1] + uy * cut], e = [p[0] + vx * cut, p[1] + vy * cut];
    let a0 = Math.atan2(s[1] - cy, s[0] - cx), a1 = Math.atan2(e[1] - cy, e[0] - cx), da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    for (let k = 0; k <= seg; k++) { const t = a0 + (da * k) / seg; out.push([cx + r2 * Math.cos(t), cy + r2 * Math.sin(t)]); }
  }
  return out;
}
