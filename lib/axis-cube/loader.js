// The loading screen's markup, in one place: the app's page renders it on the server, and the artifact build and the
// loader preview write it into their pages. It is only markup and CSS, so it is on screen and moving before any
// script arrives. The layout is in app/(axis-cube)/kit/axis-cube/globals.css; the motion is worked out here.
//
// A two-by-two cube, flat: each face is four tiles, white or black with a white edge. It is turned the way a cube is
// when the steps of a solve are being followed: one side up or down, then the top row across, and again, a quarter
// turn each time. It starts solved, is mixed by a few turns, and from there goes round a loop of turns that never
// passes through solved again: at every rest in the loop each of the three faces in view is mixed. Under it, the bar.

// Each turn: which layer (R, the right side, turning vertically; U, the top row, turning horizontally) and which way.
// They alternate strictly, through the opening and round the loop and across the join between them.
const OPENING = ["R'", "U", "R", "U"];                                   // played once, from solved
const LOOP = ["R", "U", "R'", "U", "R'", "U", "R", "U'", "R", "U'"];     // then this, for ever: together these ten are the identity on a 2×2
const SLOT = 0.4;      // seconds from the start of one turn to the start of the next
const MOVING = 0.74;   // the share of that spent turning; the rest it holds still
const BEAT = 0.8;      // slots the solved cube is held before the first turn

const AXIS = { R: 0, U: 1 };
const LAYER = [1, -1];                        // the side of each axis that turns: right, and top (the page's y runs down)
const FN = ["rotateX", "rotateY"];
const TONE = { right: "w", left: "k", top: "w", bottom: "k", front: "k", back: "w" };
// a quarter turn about an axis, as the browser's own rotateX/Y does it
const quarter = (axis, s) => (axis === 0 ? [[1, 0, 0], [0, 0, -s], [0, s, 0]] : [[0, 0, s], [0, 1, 0], [-s, 0, 0]]);
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
const parse = (list) => list.map((t) => ({ axis: AXIS[t[0]], s: t.length > 1 ? -1 : 1 }));
const secs = (slots) => `${Math.round(slots * SLOT * 100) / 100}s`;
const EASE = "animation-timing-function:cubic-bezier(.6,.04,.2,1)";

const opening = parse(OPENING);
const loop = parse(LOOP);
const openSlots = BEAT + opening.length;

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
  const carried = (turns) => {
    const mine = [];
    turns.forEach((t, k) => {
      if (at[t.axis] !== LAYER[t.axis]) return;
      mine.push({ k, fn: FN[t.axis], deg: 90 * t.s });
      at = turnV(quarter(t.axis, t.s), at);
    });
    return mine;
  };
  const first = carried(opening);
  const round = carried(loop);
  // a pose is its turns so far, the latest written first: each is about the cube's own fixed axes
  const pose = (mine, done) => mine.map((m, i) => `${m.fn}(${i < done ? m.deg : 0}deg)`).reverse().join(" ");
  const opened = pose(first, first.length);
  const runs = [];
  if (first.length) {
    const pct = (slot) => `${Math.round((slot / openSlots) * 10000) / 100}%`;
    let frames = "";
    first.forEach((m, i) => {
      frames += `${pct(BEAT + m.k)}{transform:${pose(first, i)};${EASE}}${pct(BEAT + m.k + MOVING)}{transform:${pose(first, i + 1)}}`;
    });
    css += `@keyframes axis-o${n}{0%{transform:${pose(first, 0)}}${frames}100%{transform:${opened}}}`;
    runs.push(`axis-o${n} ${secs(openSlots)} linear both`);
  }
  if (round.length) {
    // round the loop, on top of where the opening left it; it waits for the opening and then never stops
    const pct = (slot) => `${Math.round((slot / loop.length) * 10000) / 100}%`;
    const full = (done) => [pose(round, done), opened].filter(Boolean).join(" ");
    let frames = "";
    round.forEach((m, i) => {
      frames += `${pct(m.k)}{transform:${full(i)};${EASE}}${pct(m.k + MOVING)}{transform:${full(i + 1)}}`;
    });
    css += `@keyframes axis-l${n}{0%{transform:${full(0)}}${frames}100%{transform:${full(round.length)}}}`;
    runs.push(`axis-l${n} ${secs(loop.length)} linear ${secs(openSlots)} infinite`);
  }
  if (runs.length) css += `.axis-loader .c${n}{animation:${runs.join(",")}}`;
  n++;
}

export const LOADER_HTML =
  `<style>${css}</style><span class="cube" aria-hidden="true">${html}</span>` + '<span class="bar"><span class="track"><i></i></span></span>';
