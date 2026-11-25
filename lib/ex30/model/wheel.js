// The 19-inch five-spoke aero wheel and its 245/45 R19 tyre, from a close photograph of one: a diamond-cut rim, five
// bright paddles reaching in from it, gloss-black blades between them, and a deep pocket behind each blade.
import { DIM } from './body.js';
import { Soup, mirrorY } from './build.js';

const TYRE_R = DIM.TYRE_D / 2, RIM_R = 259, FACE_R = 236, HALF_W = 122.5;
const rad = (d) => (d * Math.PI) / 180;

/** A profile of [radius, offset along the axle] points spun round the axle. */
function lathe(soup, prof, seg, flip = false) {
  const ids = [];
  for (const [r, w] of prof) for (let i = 0; i < seg; i++) { const t = (i / seg) * Math.PI * 2; ids.push(soup.v(r * Math.cos(t), w, r * Math.sin(t), 0, 1, 0)); }
  soup.grid(ids, prof.length, seg, flip, true);
}
/** A flat polygon on the wheel's face: points as [radius, angle in degrees], at an offset along the axle. */
function facePoly(soup, pts, w) {
  const ids = pts.map(([r, d]) => soup.v(r * Math.cos(rad(d)), w, r * Math.sin(rad(d)), 0, 1, 0));
  for (let i = 1; i < ids.length - 1; i++) soup.tri(ids[0], ids[i + 1], ids[i]);
}
/** The same polygon's rim, as a wall going back into the wheel by `depth`. */
function wall(soup, pts, w, depth) {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const ax = a[0] * Math.cos(rad(a[1])), az = a[0] * Math.sin(rad(a[1])), bx = b[0] * Math.cos(rad(b[1])), bz = b[0] * Math.sin(rad(b[1]));
    let nx = bz - az, nz = -(bx - ax); const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    const i0 = soup.v(ax, w, az, nx, 0, nz), i1 = soup.v(bx, w, bz, nx, 0, nz), i2 = soup.v(bx, w - depth, bz, nx, 0, nz), i3 = soup.v(ax, w - depth, az, nx, 0, nz);
    soup.quad(i0, i1, i2, i3);
  }
}

let cache = null;
/** The wheel about its own centre, its axle along y and its face toward +y. */
function unit() {
  if (cache) return cache;
  const tyre = new Soup(), alloy = new Soup(), black = new Soup(), pit = new Soup(), cap = new Soup(), ring = new Soup(), disc = new Soup();
  // tyre: tread with four grooves, round shoulders, the sidewall's bulge, in to the bead
  const tread = [];
  const grooves = [-72, -24, 24, 72];
  for (let w = -96; w <= 96; w += 6) { let r = TYRE_R - 0.00035 * w * w; for (const g of grooves) if (Math.abs(w - g) < 7) r -= 7; tread.push([r, w]); }
  const flank = (s) => [[TYRE_R - 8, s * 106], [TYRE_R - 20, s * 115], [TYRE_R - 40, s * 121], [TYRE_R - 62, s * 122.5], [TYRE_R - 82, s * 119], [RIM_R + 6, s * 111], [RIM_R - 1, s * 106], [RIM_R - 8, s * 103]];
  lathe(tyre, [...flank(-1).reverse(), ...tread, ...flank(1)], 72);
  // the rim: its bright lip, then the barrel behind the face and through to the back
  lathe(alloy, [[RIM_R - 8, 103], [RIM_R - 3, 108], [RIM_R - 8, 110], [FACE_R + 4, 108], [FACE_R, 100]], 96);
  lathe(pit, [[FACE_R, 100], [FACE_R - 2, 40], [FACE_R - 6, -100], [RIM_R - 8, -103]], 48);
  // behind everything: the brake's disc and the dark of the well
  lathe(disc, [[168, 34], [60, 34], [60, 30]], 48);
  lathe(pit, [[FACE_R - 4, 20], [170, 22], [169, 34]], 48);
  for (let k = 0; k < 5; k++) {
    const t = k * 72;
    // the bright paddle, in from the rim
    const paddle = [[FACE_R, t - 20], [FACE_R, t - 10], [FACE_R, t], [FACE_R, t + 10], [FACE_R, t + 20], [102, t + 36], [100, t - 2]];
    facePoly(alloy, paddle, 99);
    wall(alloy, [[FACE_R, t + 20], [102, t + 36], [100, t - 2], [FACE_R, t - 20]].slice(0, 4), 99, 7);
    // the gloss blade between this paddle and the next, from the hub out to the rim
    const blade = [[34, t + 20], [100, t - 2], [102, t + 36], [FACE_R, t + 20], [FACE_R, t + 30], [FACE_R, t + 40], [FACE_R, t + 52], [100, t + 70], [34, t + 92]];
    facePoly(black, blade, 92);
    // the pocket along the blade's far edge: open to the brake behind
    const pocket = [[86, t + 62], [FACE_R - 6, t + 36], [FACE_R - 6, t + 44], [FACE_R - 6, t + 51]];
    facePoly(pit, pocket, 93); 
  }
  // the hub: a gloss boss, a bright ring and the cap's face
  lathe(black, [[36, 92], [34, 100], [30, 103]], 36);
  lathe(ring, [[30, 103], [29, 105], [24, 105]], 36);
  lathe(cap, [[24, 105], [0.01, 105]], 36);
  for (const s of [tyre, alloy, black, pit, cap, ring, disc]) s.smooth();
  // flat faces keep their own normal: the smoothing above would round the paddles' edges into the walls
  cache = { tyre, alloy, black, pit, cap, ring, disc };
  return cache;
}

/** One wheel at axle position x, its centre line at y, facing the side `sgn`. */
export function wheel(x, y, sgn) {
  const u = unit(), z = DIM.HUB_Z;
  // the tyre stands on the ground: what would dip below it is pressed flat
  const move = Object.assign((q) => { q[0] += x; q[1] = y + sgn * q[1]; q[2] = Math.max(q[2] + z, 0.5); q[4] *= sgn; }, { flips: sgn < 0 });
  const mk = (name, soup, material) => new Soup().add(soup, move).done(name, material);
  return [mk('tyre', u.tyre, 'tyre'), mk('rim', u.alloy, 'alloy'), mk('wheel blades', u.black, 'gloss'), mk('wheel wells', u.pit, 'liner'), mk('wheel cap', u.cap, 'gloss'), mk('wheel cap ring', u.ring, 'chrome'), mk('brake disc', u.disc, 'steel')];
}
