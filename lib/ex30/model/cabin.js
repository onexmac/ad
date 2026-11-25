// What shows through the glass: a floor, a dashboard with its one tall screen, a steering wheel, four seats and a
// shelf. Plain shapes in dark cloth, enough that the cabin is not empty; the car's left is the driver's side.
import { Soup, blob } from './build.js';

function box(s, x0, x1, y0, y1, z0, z1) {
  const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  const F = [[0, 3, 2, 1, [0, 0, -1]], [4, 5, 6, 7, [0, 0, 1]], [0, 1, 5, 4, [0, -1, 0]], [2, 3, 7, 6, [0, 1, 0]], [1, 2, 6, 5, [1, 0, 0]], [3, 0, 4, 7, [-1, 0, 0]]];
  for (const [a, b, c, d, n] of F) { const i = [a, b, c, d].map((k) => s.v(P[k][0], P[k][1], P[k][2], n[0], n[1], n[2])); s.quad(i[0], i[1], i[2], i[3]); }
}

export function cabin() {
  const dark = new Soup(), seat = new Soup(), screen = new Soup(), wheel = new Soup();
  // floor, and the walls below the glass
  box(dark, 520, 3120, -800, 800, 300, 360);
  box(dark, 520, 3100, -842, -800, 300, 1010); box(dark, 520, 3100, 800, 842, 300, 1010);
  // dashboard and the scuttle under the windscreen
  blob(dark, [640, 0, 960], [150, 0, 0], [0, 780, 0], [0, 0, 95], 3.2, 24, 12);
  box(dark, 450, 640, -760, 760, 600, 1010);
  // centre console and armrest
  blob(dark, [1330, 0, 640], [330, 0, 0], [0, 110, 0], [0, 0, 110], 3.4, 20, 10);
  // the screen: tall, in the middle
  const sx = 792, ids = [[-96, 968], [96, 968], [96, 1244], [-96, 1244]].map(([y, z]) => screen.v(sx + (z - 968) * -0.16, y, z, 0.98, 0, 0.16));
  screen.quad(ids[0], ids[1], ids[2], ids[3]);
  blob(dark, [sx - 12 - 22, 0, 1106], [10, 0, 0], [0, 104, 0], [-22, 0, 146], 5, 16, 8);
  // steering wheel, on the left
  const R = 182, r = 15, cx = 1000, cy = -365, cz = 1010, tilt = 0.42, seg = 40, tube = 10, wid = [];
  for (let i = 0; i < seg; i++) for (let j = 0; j < tube; j++) {
    const t = (i / seg) * Math.PI * 2, p = (j / tube) * Math.PI * 2, rr = R + r * Math.cos(p), u = rr * Math.cos(t), v = rr * Math.sin(t), w = r * Math.sin(p);
    // the wheel's plane leans back: u across the car, v up its face, w along its column
    wid.push(wheel.v(cx + v * Math.sin(tilt) * -1 + w * Math.cos(tilt), cy + u, cz + v * Math.cos(tilt) + w * Math.sin(tilt), 0, 0, 1));
  }
  wheel.grid(wid, seg, tube, false, true);
  for (let i = 0; i < seg; i++) { const a = i * tube, b = ((i + 1) % seg) * tube; for (let j = 0; j < tube; j++) { const j2 = (j + 1) % tube; wheel.quad(wid[a + j], wid[b + j], wid[b + j2], wid[a + j2]); } }
  wheel.i.length = 0; wheel.grid(wid, seg, tube, false, true);
  for (let i = 0; i < tube; i++) { const j = (i + 1) % tube, a = (seg - 1) * tube; wheel.quad(wid[a + i], wid[a + j], wid[j], wid[i]); }
  blob(wheel, [cx + 10, cy, cz - 4], [26, 0, 12], [0, 150, 0], [-14, 0, 30], 3, 16, 8);
  // seats: two in front, a bench behind
  const chair = (x, y, w) => {
    blob(seat, [x, y, 560], [250, 0, 30], [0, w, 0], [0, 0, 75], 3.2, 20, 10);
    blob(seat, [x + 290, y, 860], [70, 0, 0], [0, w, 0], [95, 0, 300], 3.2, 20, 10);
    blob(seat, [x + 372, y, 1240], [48, 0, 0], [0, w * 0.58, 0], [14, 0, 92], 3, 16, 10);
  };
  chair(1200, -365, 235); chair(1200, 365, 235);
  blob(seat, [2110, 0, 590], [250, 0, 26], [0, 660, 0], [0, 0, 80], 3.6, 20, 10);
  blob(seat, [2410, 0, 880], [64, 0, 0], [0, 660, 0], [88, 0, 280], 3.6, 20, 10);
  for (const y of [-400, 400]) blob(seat, [2486, y, 1226], [44, 0, 0], [0, 120, 0], [14, 0, 80], 3, 16, 10);
  // the load cover behind the bench
  box(dark, 2500, 3180, -700, 700, 1040, 1070);
  return [dark.smooth().done('cabin', 'cabin'), seat.smooth().done('seats', 'cloth'), screen.done('screen', 'screen'), wheel.smooth().done('steering wheel', 'cabin')];
}
