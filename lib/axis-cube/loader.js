// The loading screen's markup, in one place: the app's page renders it on the server, and the artifact build and the
// loader preview write it into their pages. It is only markup and CSS, so it is on screen and moving before any
// script arrives. The layout is in app/(axis-cube)/kit/axis-cube/globals.css; the motion is worked out here.
//
// A two-by-two cube, flat: each face is four tiles, white or black with a white edge. It is turned the way a cube is
// when it is being solved, one layer at a time about one axis: the right layer, the top one or the front one, a
// quarter turn each. The ten turns below bring it back to solved, so it starts over without a seam. Under it, the bar.

// Each turn: which layer (R right, U top, F front) and which way. Together they are the identity on a 2×2.
const TURNS = ["R", "U", "R'", "F'", "R'", "U", "F", "U'", "R", "F"];
const SLOT = 0.4;      // seconds from the start of one turn to the start of the next
const MOVING = 0.74;   // the share of that spent turning; the rest it holds still
const REST = 1.5;      // slots of stillness once it is solved again, before it starts over

const AXIS = { R: 0, U: 1, F: 2 };
const LAYER = [1, -1, 1];                     // the side of each axis that turns: right, top (the page's y runs down), front
const FN = ["rotateX", "rotateY", "rotateZ"];
const TONE = { right: "w", left: "k", top: "w", bottom: "k", front: "k", back: "w" };
// a quarter turn about an axis, as the browser's own rotateX/Y/Z does it
const quarter = (axis, s) =>
  axis === 0 ? [[1, 0, 0], [0, 0, -s], [0, s, 0]] : axis === 1 ? [[0, 0, s], [0, 1, 0], [-s, 0, 0]] : [[0, -s, 0], [s, 0, 0], [0, 0, 1]];
const turnV = (m, v) => m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);

// the six faces: which way each looks, and the two directions that run right and down across it as it is drawn
const FACES = [
  { name: "right", n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { name: "left", n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { name: "top", n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { name: "bottom", n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { name: "front", n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { name: "back", n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const turns = TURNS.map((t) => ({ axis: AXIS[t[0]], s: t.length > 1 ? -1 : 1 }));
const slots = turns.length + REST;
const pct = (x) => `${Math.round((x / slots) * 10000) / 100}%`;

let html = "";
let css = "";
let n = 0;
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
  // the corner piece that starts here: its three tiles, each in its quarter of the face it lies on
  const home = [x, y, z];
  const tiles = FACES.filter((f) => dot(f.n, home) > 0)
    .map((f) => `<span class="p ${f.name} ${dot(f.u, home) < 0 ? "ql" : "qr"} ${dot(f.v, home) < 0 ? "qt" : "qb"} ${TONE[f.name]}"><i></i></span>`)
    .join("");
  html += `<span class="c c${n}">${tiles}</span>`;
  // follow it through the turns, noting the ones that carry it
  let at = home;
  const mine = [];
  turns.forEach((t, k) => {
    if (at[t.axis] !== LAYER[t.axis]) return;
    mine.push({ k, fn: FN[t.axis], deg: 90 * t.s });
    at = turnV(quarter(t.axis, t.s), at);
  });
  if (mine.length) {
    // its turns so far, the latest written first: each is about the cube's own fixed axes
    const pose = (done) => mine.map((m, i) => `${m.fn}(${i < done ? m.deg : 0}deg)`).reverse().join(" ");
    let frames = "";
    mine.forEach((m, i) => {
      frames += `${pct(m.k)}{transform:${pose(i)};animation-timing-function:cubic-bezier(.6,.04,.2,1)}${pct(m.k + MOVING)}{transform:${pose(i + 1)}}`;
    });
    css += `@keyframes axis-c${n}{0%{transform:${pose(0)}}${frames}100%{transform:${pose(mine.length)}}}`;
    css += `.axis-loader .c${n}{animation:axis-c${n} ${Math.round(slots * SLOT * 100) / 100}s linear infinite}`;
  }
  n++;
}

export const LOADER_HTML =
  `<style>${css}</style><span class="cube" aria-hidden="true">${html}</span>` + '<span class="bar"><span class="track"><i></i></span></span>';
