// The EX30's body as a solid: five traced surfaces (the sides, the top, the nose, the tail and the floor) and the
// rounded edges where they meet. `body(x, y, z)` is negative inside the car, positive outside, zero on its skin.
//
// The car's frame, in millimetres: x runs rearward from the front axle, y to the car's right, z up from the ground.
// The numbers are traced from photographs (how: scripts/ex30/README.md): the side from a square-on photograph
// with its camera solved against the wheelbase, the nose and tail from square-on photographs, then all of it laid
// back over three-quarter views. Volvo's own figures fix the box: 4233 long, 1836 wide, 1549 high, 2650 between axles.
import { Tab, curve, clamp, smoothstep, smin, smax, fillet } from './curves.js';

export const DIM = {
  L: 4233, WB: 2650, W: 1836, H: 1549,
  OHF: 800, OHR: 783,          // overhangs: they add up to L - WB; their split is read from the photographs
  TRACK_F: 1590, TRACK_R: 1595,
  TYRE_D: 704,                 // 245/40 R20, 245/45 R19 and 225/55 R18 all come to this
  HUB_Z: 340,                  // the tyre squashed a little under the car's weight
  ARCH_R: 385, ARCH_Z: 380, ARCH_LIP: 16, FLARE_R: 437,
};
export const XF = -DIM.OHF, XR = DIM.WB + DIM.OHR;

const X0 = -1000, X1 = 3700;

/* ---- the top: bonnet, windscreen, roof ---- */
// The bonnet is a high plateau with a ridge along each side, falling steeply from the ridge to the wing.
// Its centre line, carried on under the windscreen:
const Zh = curve([[-900, 760], [-800, 835], [-782, 872], [-740, 902], [-650, 935], [-500, 962], [-300, 990], [-100, 1022], [100, 1048], [300, 1066], [400, 1073], [700, 1085]], X0, X1);
// where its ridge runs, how steeply it falls away outside the ridge, and how far its lines sweep back at the sides
const ridgeH = curve([[-800, 520], [-300, 560], [400, 600], [700, 610]], X0, X1, 10);
const fallH = curve([[-800, 0.5], [-245, 0.54], [0, 0.45], [300, 0.68], [505, 0.7], [700, 0.7]], X0, X1, 10);
const swH = curve([[-815, 150], [230, 110], [600, 110]], X0, X1, 10);
// the glass and the roof along the centre line, the windscreen's plane carried on down below its foot
const Zroof = [[0, 851], [400, 1073], [500, 1129], [800, 1296], [1100, 1462], [1165, 1497], [1260, 1522], [1400, 1538], [1600, 1547], [1750, 1549], [2000, 1546], [2164, 1540], [2400, 1528], [2639, 1510], [2842, 1487], [2960, 1469]];
// ...and on down the rear window to the shelf under it, where the tail takes over
const Zg = curve([...Zroof, [3021, 1444], [3088, 1372], [3200, 1254], [3284, 1165], [3350, 1123], [3409, 1085], [3445, 1000], [3480, 800]], X0, X1);
// the roof's own line carried straight on past the window: what the spoiler's top follows
const Zr = curve([...Zroof, [3021, 1458], [3120, 1437], [3220, 1414]], X0, X1);
const swG = curve([[400, 62], [1165, 36], [1500, 15], [1900, 0], [2500, -20], [3000, -80], [3127, -110], [3500, -110]], X0, X1, 10);
// how far the glass and roof fall from the centre line to their edge, and where that edge is
const dzG = curve([[400, 26], [800, 16], [1100, 22], [1165, 44], [1300, 62], [2000, 62], [2800, 58], [2960, 52], [3090, 22], [3500, 16]], X0, X1, 10);
const wdG = curve([[400, 760], [800, 700], [1165, 610], [2000, 600], [3127, 590]], X0, X1, 10);
/** Where the bonnet ends and the windscreen's foot begins, seen from above: nearly straight across. */
export const cowlX = (a) => 400 + 105 * (a / 800) * (a / 800);

function topH(x, a) {
  const t = a / 750, r = ridgeH.at(x), u = a / r, k = 46, d = a - r;
  // level across the plateau (a shallow crown), then down the shoulder: the corner between them rounded over k
  return Zh.at(x - swH.at(x) * t * t) - 10 * Math.min(u * u, 1) - fallH.at(x) * 0.5 * (d + Math.sqrt(d * d + k * k) - k);
}
function topG(x, a) { const t = a / 750, u = a / wdG.at(x); return Zg.at(x - swG.at(x) * t * t) - dzG.at(x) * u * u; }
/** The roof as it would run on with no rear window cut into it. */
export function roofTop(x, a) { const t = a / 750, u = a / wdG.at(x); return Zr.at(x - swG.at(x) * t * t) - 56 * u * u; }
export function top(x, a) {
  // the windscreen's plane, carried down, rises out of the bonnet: where the two meet is the cowl, wherever their
  // shapes put it, and the corner between them is rounded (a prescribed line here left a wall at the sides)
  return smax(topH(x, a), topG(x, a), 36);
}

/* ---- the sides ---- */
// the widest the lower body gets, along the car (the wheel arches' flares come on top of this)
const Wmax = curve([[-815, 800], [-600, 852], [-400, 876], [-200, 887], [0, 892], [500, 893], [1500, 896], [2300, 900], [2650, 904], [3000, 900], [3200, 890], [3418, 874]], X0, X1, 10);
/** The shoulder: the crease under the windows, carried on back to the tail lamps. Ahead of the door it runs on level, above the bonnet, where the top cuts it off. */
const zSh = curve([[-900, 1012], [300, 1028], [505, 1032], [640, 1033], [700, 1040], [1000, 1055], [1500, 1068], [1700, 1076], [2050, 1078], [2560, 1094], [3100, 1096], [3433, 1096]], X0, X1, 5);
export const shoulderZ = (x) => zSh.at(x);
// how far the glasshouse leans in, as a slope, and the ledge it leaves over the rear haunch
const lean = curve([[400, 0.445], [2000, 0.445], [2900, 0.6], [3418, 0.6]], X0, X1, 10);
const ledge = curve([[400, 0], [1900, 0], [2700, 26], [3418, 30]], X0, X1, 10);
const ZW = 700;      // the height the lower body is widest at
const FLARE = [[0, 12], [DIM.WB, 14]];

function sideBody(x, z, zs) {
  let y = Wmax.at(x);
  if (z > ZW) { const t = (z - ZW) / (zs - ZW); y -= 16 * t * t; } else { const t = (ZW - z) / 400; y -= 26 * t * t; }
  // the arches' flares: a flat raised face around each wheel, stepping down to the body outside it
  const up = 1 - smoothstep(zs - 90, zs - 12, z);
  if (up > 0) for (let i = 0; i < 2; i++) {
    const dx = x - FLARE[i][0], dz = z - DIM.ARCH_Z, r = Math.sqrt(dx * dx + dz * dz);
    if (r < 460) y += FLARE[i][1] * (1 - smoothstep(424, 452, r)) * up;
  }
  return y;
}
export function side(x, z) {
  const zs = zSh.at(x), yb = sideBody(x, z, zs);
  if (z < zs - 60) return yb;
  const belt = sideBody(x, zs, zs) - ledge.at(x), dz = z - zs;
  // above the shoulder the glass leans in, bowing a little; below it this plane runs steeply away, leaving the crease
  const yg = dz > 0 ? belt - lean.at(x) * dz + 0.035 * dz * (1 - dz / 420) : belt - 3 * dz;
  return smin(yb, yg, 18);
}

/* ---- the nose and the tail ---- */
const Xf = curve([[150, -625], [200, -685], [250, -747], [300, -777], [380, -793], [470, -800], [560, -800], [650, -797], [760, -790], [872, -780], [940, -765], [1100, -725]], 0, 1700, 2);
const RF = 1900;
const Xr = curve([[150, 3285], [200, 3330], [260, 3387], [340, 3419], [450, 3433], [600, 3433], [700, 3428], [865, 3420], [1085, 3409], [1400, 3396], [1700, 3390]], 0, 1700, 2);
const RR = 2300;
export const noseX = (a, z) => Xf.at(z) + (RF - Math.sqrt(RF * RF - a * a));
export const tailX = (a, z) => Xr.at(z) - (a * a) / (2 * RR);

/* ---- the floor ---- */
const Zb = curve([[-815, 300], [-700, 238], [-560, 205], [-300, 190], [2950, 190], [3100, 226], [3250, 292], [3433, 384]], X0, X1, 5);

export const floorZ = (x) => Zb.at(x);

/* ---- the edges ---- */
const rTop = curve([[-815, 30], [-740, 34], [-600, 50], [400, 55], [520, 45], [1150, 45], [1300, 55], [2800, 55], [3000, 40], [3200, 30], [3380, 20]], X0, X1, 10);

/** The body: negative inside, positive outside, in millimetres near the skin. */
export function body(x, y, z) {
  const a = y < 0 ? -y : y;
  // each surface as a distance: its height difference over its own steepness
  const zs = zSh.at(x);
  const sv = side(x, z);
  const sl = lean.at(x) * smoothstep(zs - 30, zs + 60, z);     // eased in: a jump here would tear the rounded corners
  const dS = (a - sv) / Math.sqrt(1 + sl * sl);
  const fz = Xf.d(z), fa = a / Math.sqrt(RF * RF - a * a);
  const dF = (Xf.at(z) + (RF - Math.sqrt(RF * RF - a * a)) - x) / Math.sqrt(1 + fz * fz + fa * fa);
  const rz = Xr.d(z), ra = a / RR;
  const dR = (x - (Xr.at(z) - (a * a) / (2 * RR))) / Math.sqrt(1 + rz * rz + ra * ra);
  const tv = top(x, a);
  // the top's steepness along the car: the windscreen is far from level
  const tx = (top(x + 4, a) - tv) / 4;
  const dT = (z - tv) / Math.sqrt(1 + tx * tx);
  const dB = Zb.at(x) - z;
  let d = fillet(dF, dS, 300);
  d = fillet(d, dR, 170);
  d = fillet(d, dT, rTop.at(x));
  d = fillet(d, dB, 32);
  return d;
}

/** The outward normal of the skin at a point on it (or near it), into `out`. */
export function bodyNormal(x, y, z, out) {
  const h = 0.6;
  const a = body(x + h, y - h, z - h), b = body(x - h, y - h, z + h), c = body(x - h, y + h, z - h), d = body(x + h, y + h, z + h);
  let nx = a - b - c + d, ny = -a - b + c + d, nz = -a + b - c + d;
  const l = Math.hypot(nx, ny, nz) || 1;
  out[0] = nx / l; out[1] = ny / l; out[2] = nz / l;
  return out;
}

/**
 * The point of the skin on the line from `o` along the unit direction `d`, looked for between distances t0 and t1
 * (inside at t0, outside at t1): returns the distance along the line.
 */
export function castBody(ox, oy, oz, dx, dy, dz, t0, t1) {
  let f0 = body(ox + dx * t0, oy + dy * t0, oz + dz * t0), f1 = body(ox + dx * t1, oy + dy * t1, oz + dz * t1);
  if (f0 > 0 || f1 < 0) return NaN;
  let side = 0;
  for (let i = 0; i < 40; i++) {
    const t = Math.abs(f1 - f0) < 1e-9 ? 0.5 * (t0 + t1) : t0 - (f0 * (t1 - t0)) / (f1 - f0);
    const f = body(ox + dx * t, oy + dy * t, oz + dz * t);
    if (Math.abs(f) < 0.004 || t1 - t0 < 0.004) return t;
    if (f > 0) { t1 = t; f1 = f; if (side === 1) f0 *= 0.5; side = 1; } else { t0 = t; f0 = f; if (side === -1) f1 *= 0.5; side = -1; }
  }
  return 0.5 * (t0 + t1);
}

/** The skin's y on the car's right side at (x, z); its z seen from above at (x, y); its x seen from the front or the back. */
export function skinY(x, z) { const t = castBody(x, 300, z, 0, 1, 0, 0, 800); return 300 + t; }
export function skinZ(x, y) { const t = castBody(x, y, 700, 0, 0, 1, 0, 1100); return 700 + t; }
export function skinXFront(y, z) { const t = castBody(0, y, z, -1, 0, 0, 0, 1000); return -t; }
export function skinXRear(y, z) { const t = castBody(DIM.WB, y, z, 1, 0, 0, 0, 1000); return DIM.WB + t; }
