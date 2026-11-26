// What is drawn on the EX30's skin: where the glass is, where paint gives way to gloss black or to cladding, the lamps,
// and the lines between panels. Every outline is traced from photographs of standard cars (two three-quarter views
// with their cameras solved from the wheels, and a square side view), in the car's frame: x back from the front
// axle, y to the right, z up, millimetres. `a` is |y|: the car is the same on both sides unless a part says otherwise.
import { curve, sdPolygon, roundPoly, smoothstep, clamp } from './curves.js';
import { DIM, cowlX } from './body.js';

export const PART = { paint: 0, gloss: 1, glass: 2, clad: 3, hole: 4, lens: 5, under: 6, lensRed: 7 };
export const PART_NAME = ['paint', 'gloss', 'glass', 'clad', 'hole', 'lens', 'under', 'lensRed'];

const X0 = -1000, X1 = 3700;
const ARCH = [0, DIM.WB];
const archR = (x, z) => Math.min(Math.hypot(x - ARCH[0], z - DIM.ARCH_Z), Math.hypot(x - ARCH[1], z - DIM.ARCH_Z));

/* ---- the lower body: cladding ---- */
// the top of the black sill moulding, front arch to rear arch
const sillTop = curve([[330, 340], [433, 368], [630, 428], [1075, 440], [1550, 458], [1870, 466], [2025, 459], [2210, 435], [2330, 437]], X0, X1, 5);
// the nose below the body-colour cheeks, and the black between them up to the gloss band
const NOSE_BLACK = [[-200, 100], [-200, 507], [522, 507], [590, 392], [600, 377], [1100, 377], [1100, 100]];
// the tail's black lower part: level across the middle, dropping away to the corners
const TAIL_BLACK = [[-200, 100], [-200, 643], [420, 643], [540, 622], [700, 545], [860, 500], [1100, 480], [1100, 100]];
const tailSide = curve([[2960, 437], [3100, 455], [3300, 490], [3500, 500]], X0, X1, 5);

/* ---- gloss black: the roof, the pillars and everything above the waist ---- */
// the line it starts above, seen from the side
const glossFrom = curve([[380, 1040], [505, 1046], [640, 1045], [700, 1052], [1000, 1067], [1500, 1080], [1700, 1088], [2050, 1088], [2100, 1105], [2235, 1130], [2380, 1172], [2440, 1250], [2475, 1340], [2953, 1340], [3175, 1166], [3600, 1166]], X0, X1, 2);
export const beltZ = (x) => glossFrom.at(x);

/* ---- glass ---- */
const DOOR_GLASS_F = roundPoly([[660, 1052], [1000, 1070], [1500, 1083], [1632, 1090], [1648, 1428], [1250, 1430], [1215, 1418], [1075, 1326], [935, 1240], [790, 1150]], 14);
const DOOR_GLASS_R = roundPoly([[1722, 1092], [2050, 1092], [2100, 1108], [2235, 1134], [2410, 1184], [2545, 1230], [2500, 1310], [2462, 1368], [2260, 1400], [2000, 1428], [1716, 1430]], [14, 0, 0, 0, 0, 18, 0, 30, 0, 0, 14]);
// the windscreen from above: [x, a], the centre line taken past zero so that no seam runs down the middle
const SCREEN = roundPoly([[438, -200], [438, 0], [450, 300], [492, 560], [528, 725], [566, 752], [1192, 588], [1164, 300], [1152, 0], [1152, -200]], [0, 0, 0, 0, 0, 30, 30, 0, 0, 0]);
// the rear window from behind: [a, z]
const BACKLIGHT = roundPoly([[-200, 1176], [560, 1176], [512, 1392], [-200, 1400]], [0, 16, 16, 0]);

/* ---- lamps ---- */
// the upper rear lamps, up the pillars either side of the window: from behind [a, z]
const LAMP_UP = roundPoly([[568, 1170], [716, 1170], [652, 1334], [516, 1366]], 10);
// the lower rear lamps wrap the corners: from the side [x, z] and from behind [a, z]
const LAMP_LOW_SIDE = roundPoly([[3118, 872], [3600, 872], [3600, 1098], [3118, 1098]], 30);
const LAMP_LOW_REAR = roundPoly([[665, 872], [1200, 872], [1200, 1098], [665, 1098]], 26);
// the headlamps: the blade pointing in at the badge, the head it hangs from, and the wrap round the corner
const HEAD_FRONT = roundPoly([[440, 761], [450, 775], [598, 802], [714, 824], [712, 850], [800, 860], [1200, 870], [1200, 690], [727, 690], [706, 734], [481, 735]], [0, 0, 0, 0, 6, 0, 0, 0, 10, 10, 0]);
const HEAD_SIDE = roundPoly([[-232, 868], [-326, 818], [-440, 768], [-452, 689], [-1200, 689], [-1200, 872]], [8, 0, 10, 12, 0, 0]);
// gloss black hung from each headlamp down to a band right across the nose
const BAND_Z = [507, 545], STRIP_Z = 689, STRIP_A = 786;
// the body-colour panel between the tail lamps sits between two black lines
const TAIL_LINE = [[1086, 1100], [872, 888]];

const half = (y) => (y < 0 ? -y : y);

/**
 * The cuts, in the order they are made. Each: the region's function (negative inside), the label it gives, the
 * labels it may take over, a box [x0, x1, y0, y1, z0, z1] outside which nothing is asked, and how finely to split
 * the mesh along its edge first.
 */
export function cuts(floorZ) {
  const P = PART, BIG = 1e5, all = [-BIG, BIG, -BIG, BIG, -BIG, BIG];
  const list = [];
  const add = (name, g, label, from, box = all, fine = 1) => list.push({ name, g, label, from, box, fine });

  // wheel arches: holes
  add('arches', (x, y, z) => (half(y) > 600 ? archR(x, z) - DIM.ARCH_R : 1e3), P.hole, [P.paint], [-450, 3100, -BIG, BIG, 0, 800], 1);
  // the floor
  add('floor', (x, y, z) => z - (floorZ(x) + 12), P.under, [P.paint], [-BIG, BIG, -BIG, BIG, 0, 380], 0);
  // cladding: sills, arch lips, the lower nose and tail
  add('sill', (x, y, z) => Math.max(z - sillTop.at(x), 330 - x, x - 2330), P.clad, [P.paint], [300, 2360, -BIG, BIG, 0, 520], 1);
  add('arch lips', (x, y, z) => (half(y) > 600 ? archR(x, z) - (DIM.ARCH_R + DIM.ARCH_LIP) : 1e3), P.clad, [P.paint], [-480, 3130, -BIG, BIG, 0, 830], 1);
  add('nose black', (x, y, z) => Math.max(sdPolygon(half(y), z, NOSE_BLACK), x + 150), P.clad, [P.paint], [-900, -140, -BIG, BIG, 0, 560], 1);
  add('tail black', (x, y, z) => (x > 3250 ? sdPolygon(half(y), z, TAIL_BLACK) : Math.max(z - tailSide.at(x), 2960 - x)), P.clad, [P.paint], [2950, 3600, -BIG, BIG, 0, 700], 1);
  // gloss black above the waist, behind the bonnet
  add('gloss', (x, y, z) => Math.max(glossFrom.at(x) - z, cowlX(half(y)) - 8 - x), P.gloss, [P.paint], [380, 3600, -BIG, BIG, 880, 1700], 1);
  // glass
  add('door glass', (x, y, z) => (half(y) > 480 ? Math.min(sdPolygon(x, z, DOOR_GLASS_F), sdPolygon(x, z, DOOR_GLASS_R)) : 1e3), P.glass, [P.gloss, P.paint], [600, 2600, -BIG, BIG, 1030, 1450], 1);
  add('windscreen', (x, y, z) => sdPolygon(x, half(y), SCREEN), P.glass, [P.gloss], [400, 1230, -800, 800, 1040, 1560], 1);
  add('rear window', (x, y, z) => sdPolygon(half(y), z, BACKLIGHT), P.glass, [P.gloss], [2990, 3400, -600, 600, 1150, 1420], 1);
  // lamps
  add('upper lamps', (x, y, z) => sdPolygon(half(y), z, LAMP_UP), P.lensRed, [P.gloss, P.glass], [2940, 3300, -760, 760, 1140, 1400], 1);
  add('lower lamps', (x, y, z) => Math.min(Math.max(sdPolygon(x, z, LAMP_LOW_SIDE), 640 - half(y)), Math.max(sdPolygon(half(y), z, LAMP_LOW_REAR), 3180 - x)), P.lensRed, [P.paint], [3040, 3460, -BIG, BIG, 850, 1120], 1);
  add('headlamps', (x, y, z) => Math.min(Math.max(sdPolygon(half(y), z, HEAD_FRONT), x + 470), Math.max(sdPolygon(x, z, HEAD_SIDE), 700 - half(y))), P.lens, [P.paint], [-820, -200, -BIG, BIG, 670, 890], 1);
  // gloss trims: the band across the nose and the strips up to the lamps; the lines above and below the tail's panel
  add('nose band', (x, y, z) => {
    const a = half(y);
    const band = Math.max(BAND_Z[0] - z, z - BAND_Z[1], a - 830, x + 440);
    const strip = Math.max(STRIP_A - a, BAND_Z[0] - z, z - (STRIP_Z + 4), x + 440);
    return Math.min(band, strip);
  }, P.gloss, [P.paint, P.clad], [-820, -420, -BIG, BIG, 480, 720], 1);
  return list;
}

/* ---- the lines between panels, as paths on the skin ---- */
// Each: a view ('side' gives [x, z] on both flanks unless `only` says 'left' or 'right'; 'top' gives [x, y]; 'front'
// and 'rear' give [y, z]), the points, a width, and whether the path closes. Smooth paths are splined.
export const LINES = [
  // doors
  { view: 'side', pts: [[516, 934], [508, 800], [506, 600], [512, 470], [522, 400]], w: 5, smooth: true },
  { view: 'side', pts: [[1650, 1430], [1634, 1090], [1612, 950], [1578, 760], [1548, 560], [1540, 452]], w: 5, smooth: true },
  { view: 'side', pts: [[2545, 1232], [2556, 1150], [2548, 1060], [2530, 925], [2513, 835], [2492, 742]], w: 5, smooth: true },
  // the bonnet's edge along the wing, its step, and on to the lamp
  { view: 'side', pts: [[516, 934], [400, 924], [300, 920], [246, 916], [205, 932], [100, 932], [0, 924], [-69, 908], [-191, 868], [-236, 860]], w: 5, smooth: false },
  // bumper to wing, bumper to quarter
  { view: 'side', pts: [[-440, 770], [-377, 779], [-300, 752], [-224, 727]], w: 4, smooth: true },
  { view: 'side', pts: [[3122, 876], [3070, 800], [3000, 720], [2962, 682]], w: 4, smooth: true },
  // the charging flap, on the left rear wing only
  { view: 'side', only: 'left', closed: true, pts: roundPoly([[2760, 900], [2900, 900], [2900, 1040], [2760, 1040]], 26, 5), w: 3 },
  // the quarter light's bar
  { view: 'side', pts: [[2296, 1146], [2300, 1396]], w: 16, material: 'gloss' },
  // the bonnet's front edge, lamp to lamp, and the tailgate
  { view: 'front', pts: [[-712, 850], [-674, 850], [-490, 860], [-108, 876], [0, 877], [108, 876], [490, 860], [674, 850], [712, 850]], w: 5, smooth: true },
  { view: 'rear', pts: [[-665, 872], [-652, 800], [-622, 772], [-560, 766], [0, 764], [560, 766], [622, 772], [652, 800], [665, 872]], w: 5, smooth: false },
  // the black lines above and below the body-colour panel between the tail lamps
  { view: 'rear', pts: [[-668, 1093], [-400, 1093], [0, 1093], [400, 1093], [668, 1093]], w: 14, material: 'gloss' },
  { view: 'rear', pts: [[-668, 880], [-400, 880], [0, 880], [400, 880], [668, 880]], w: 16, material: 'gloss' },
  { view: 'rear', pts: [[-665, 1098], [-640, 1150], [-570, 1168]], w: 4, smooth: true },
  { view: 'rear', pts: [[665, 1098], [640, 1150], [570, 1168]], w: 4, smooth: true },
];

/** Where the door handles sit: [x of the centre, z of the centre]. */
export const HANDLES = [[1375, 947], [2310, 992]];
export { sillTop };
