// Is a turn a step toward the solution? The scene asks after every turn of a layer the hand makes, and the sound
// answers after the clack: a lip if it was, a lop if it was not.
//
// How each puzzle is judged:
//   The 2×2, exactly. It has 3,674,160 states, few enough to know how many turns each is from solved (never more
//   than 11, counting a half turn as one). The table is worked out in a worker the first time the 2×2 is picked
//   up, half a second or so off the main thread, and then a turn is judged by two lookups. Until it is ready, the
//   2×2 is judged as the others are.
//   The 3×3, the Axis Cube and the Ghost Cube are all the same mechanism, and no phone can know their distances.
//   They are judged by the method people solve them with, layer by layer, in its order: the cross on a first face,
//   that face's corners, the middle layer's edges, the last face's edges turned up, its corners turned up, its
//   corners in place, its edges in place. On the Axis Cube and the Ghost Cube a centre's turn shows, so their six
//   centres turned right is a last step. A turn is closer if it gets further along that order, counted on
//   whichever face it has got furthest from. Steps of a known sequence that break and remake the layers sound
//   like wandering until the move that completes them, which is how they feel to the hand too.
// Either way a judgement is a few dozen small matrix products: nothing a frame would notice.

const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mul3 = (A, B) => { const C = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return C; };
const tr3 = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
const apply3 = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const isI = (M) => M[0] === 1 && M[4] === 1 && M[8] === 1;
const nonzero = (c) => (c[0] !== 0) + (c[1] !== 0) + (c[2] !== 0);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* ───────── the 3×3s: how far along the layer method ───────── */

// For each of the six faces the solve could start from, its steps: which pieces, and what each must have.
function planOf(P) {
  if (P.hintPlan) return P.hintPlan;
  const edges = [], corners = [], centres = [];
  P.pieces.forEach((p, i) => { const k = nonzero(p.cell0); (k === 1 ? centres : k === 2 ? edges : corners).push(i); });
  const faces = [];
  for (let a = 0; a < 3; a++) for (const s of [-1, 1]) {
    const down = [0, 0, 0]; down[a] = s;
    const up = [-down[0], -down[1], -down[2]];
    const on = (list, side) => list.filter((i) => dot(P.pieces[i].cell0, down) === side);
    faces.push({
      up, steps: [
        { items: on(edges, 1), test: 'solved' },        // the cross
        { items: on(corners, 1), test: 'solved' },      // its corners
        { items: on(edges, 0), test: 'solved' },        // the middle layer
        { items: on(edges, -1), test: 'up' },           // the last face's edges turned up
        { items: on(corners, -1), test: 'up' },         // its corners turned up
        { items: on(corners, -1), test: 'placed' },     // its corners in place
        { items: on(edges, -1), test: 'placed' },       // its edges in place
      ],
    });
  }
  P.hintPlan = { centres, faces };
  return P.hintPlan;
}

// Where the centres are now says how the whole is held: every piece is read against them.
function frameOf(P, plan) {
  const F = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (const i of plan.centres) {
    const p = P.pieces[i], c = p.cell0, a = c[0] ? 0 : c[1] ? 1 : 2;
    if (c[a] !== 1) continue;
    const now = apply3(p.M, c);
    F[a] = now[0]; F[3 + a] = now[1]; F[6 + a] = now[2];
  }
  return F;
}

function layerScore(P, centresShow) {
  const plan = planOf(P), Ft = tr3(frameOf(P, plan));
  const M = P.pieces.map((p) => mul3(Ft, p.M));
  const at = (i) => apply3(M[i], P.pieces[i].cell0);
  let best = 0;
  for (const face of plan.faces) {
    let total = 0, done = true;
    for (const step of face.steps) {
      let n = 0;
      for (const i of step.items) {
        if (step.test === 'solved' ? isI(M[i]) : step.test === 'up' ? same(apply3(M[i], face.up), face.up) : same(at(i), P.pieces[i].cell0)) n++;
      }
      total += n;
      if (n < step.items.length) { done = false; break; }
    }
    if (done && centresShow) for (const i of plan.centres) if (isI(M[i])) total++;
    if (total > best) best = total;
  }
  return best;
}

/* ───────── the 2×2: exactly ───────── */

// The corner that stays put: every state is read with it at home, so a turn of either side is one move.
const CELLS2 = [];
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) if (x + y + z !== -3) CELLS2.push([x, y, z]);
const cellIndex2 = (c) => CELLS2.findIndex((d) => same(c, d));
const FACT = [720, 120, 24, 6, 2, 1, 1];

// The state as two numbers: which corner is where (0..5039), and which way each one's up-or-down face points,
// one of three axes for each of the seven places (0..2186, of which 729 can happen)
function coords2(P) {
  let ref = null;
  for (const p of P.pieces) if (p.cell0[0] + p.cell0[1] + p.cell0[2] === -3) ref = p;
  if (!ref) return null;
  const R = tr3(ref.M), perm = new Array(7);
  let code = 0;
  for (const p of P.pieces) {
    if (p === ref) continue;
    const M = mul3(R, p.M), pos = cellIndex2(apply3(M, p.cell0)), d = apply3(M, [0, p.cell0[1], 0]);
    if (pos < 0) return null;
    perm[pos] = cellIndex2(p.cell0);
    code += (d[0] ? 0 : d[1] ? 1 : 2) * Math.pow(3, pos);
  }
  let rank = 0;
  for (let i = 0; i < 7; i++) { let smaller = 0; for (let j = i + 1; j < 7; j++) if (perm[j] < perm[i]) smaller++; rank += smaller * FACT[i]; }
  return [rank, code];
}

// Run in a worker, so it is written to stand alone: it uses nothing from this file. It works out, for every state of
// the 2×2, how many turns it is from solved, by spreading out from solved one turn at a time. The turns are those
// of the three sides away from the corner that stays put, a quarter either way or a half, and the conventions are
// the scene's own (its ROT, its cells), so that a state read by coords2 finds its place.
export function tables2x2() {
  const ROT = [[1, 0, 0, 0, 0, -1, 0, 1, 0], [0, 0, 1, 0, 1, 0, -1, 0, 0], [0, -1, 0, 1, 0, 0, 0, 0, 1]];
  const mul = (A, B) => { const C = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return C; };
  const ap = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
  const cells = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) if (x + y + z !== -3) cells.push([x, y, z]);
  const idx = (c) => cells.findIndex((d) => d[0] === c[0] && d[1] === c[1] && d[2] === c[2]);
  const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const axisOf = (v) => (v[0] ? 0 : v[1] ? 1 : 2);
  // nine moves: where each place goes, and where each axis goes
  const moves = [];
  for (let a = 0; a < 3; a++) {
    let R = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    for (let k = 1; k <= 3; k++) {
      R = mul(ROT[a], R);
      moves.push({ to: cells.map((c) => (c[a] === 1 ? idx(ap(R, c)) : -1)), ax: E.map((e) => axisOf(ap(R, e))) });
    }
  }
  const FACT = [720, 120, 24, 6, 2, 1, 1];
  const NP = 5040, P3 = [1, 3, 9, 27, 81, 243, 729];
  const rankOf = (perm) => { let r = 0; for (let i = 0; i < 7; i++) { let s = 0; for (let j = i + 1; j < 7; j++) if (perm[j] < perm[i]) s++; r += s * FACT[i]; } return r; };
  const unrank = (r) => { const left = [0, 1, 2, 3, 4, 5, 6], perm = []; for (let i = 0; i < 7; i++) { const q = Math.floor(r / FACT[i]); r %= FACT[i]; perm.push(left.splice(q, 1)[0]); } return perm; };
  // where the pieces go
  const permMove = new Uint16Array(NP * 9);
  for (let r = 0; r < NP; r++) {
    const perm = unrank(r);
    moves.forEach((m, mi) => {
      const out = perm.slice();
      for (let p = 0; p < 7; p++) if (m.to[p] >= 0) out[m.to[p]] = perm[p];
      permMove[r * 9 + mi] = rankOf(out);
    });
  }
  // which way they face: only 729 of the 2187 codes can happen; number them as they are reached
  const twId = new Int16Array(2187).fill(-1), codes = [];
  const start = 1 + 3 + 9 + 27 + 81 + 243 + 729;
  twId[start] = 0; codes.push(start);
  const twMoveList = [];
  for (let q = 0; q < codes.length; q++) {
    const code = codes[q], ax = [];
    for (let p = 0, c = code; p < 7; p++) { ax.push(c % 3); c = Math.floor(c / 3); }
    for (let mi = 0; mi < 9; mi++) {
      const m = moves[mi], out = ax.slice();
      for (let p = 0; p < 7; p++) if (m.to[p] >= 0) out[m.to[p]] = m.ax[ax[p]];
      let next = 0; for (let p = 0; p < 7; p++) next += out[p] * P3[p];
      if (twId[next] < 0) { twId[next] = codes.length; codes.push(next); }
      twMoveList.push(twId[next]);
    }
  }
  const NT = codes.length, twMove = Int16Array.from(twMoveList);
  // how far each state is: out from solved, a turn at a time
  const N = NP * NT, dist = new Uint8Array(N).fill(255), queue = new Int32Array(N);
  let head = 0, tail = 0;
  dist[0] = 0; queue[tail++] = 0;
  while (head < tail) {
    const s = queue[head++], pr = Math.floor(s / NT), tw = s - pr * NT, d = dist[s] + 1;
    for (let mi = 0; mi < 9; mi++) {
      const n = permMove[pr * 9 + mi] * NT + twMove[tw * 9 + mi];
      if (dist[n] === 255) { dist[n] = d; queue[tail++] = n; }
    }
  }
  return { dist, twId, nt: NT, reached: tail };
}

/* ───────── the judge ───────── */

export function makeHint() {
  let table = null, worker = null;

  function warm(P) {                                    // start the 2×2's table, once, the first time it is wanted
    if (!P || P.n !== 2 || table || worker || typeof Worker === 'undefined') return;
    try {
      const src = `const tables2x2 = ${tables2x2.toString()};\nconst t = tables2x2();\npostMessage(t, [t.dist.buffer, t.twId.buffer]);`;
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = (e) => { table = e.data; worker.terminate(); URL.revokeObjectURL(url); };
      worker.onerror = () => { worker.terminate(); URL.revokeObjectURL(url); };   // no table: the 2×2 is judged by layers
    } catch { worker = null; }
  }

  // how close the puzzle is to solved, as a number that grows as it gets closer; and how it was counted
  function score(P) {
    if (P.n === 2 && table) {
      const c = coords2(P), t = c && table.twId[c[1]];
      if (c && t >= 0) return { by: 'exact', v: -table.dist[c[0] * table.nt + t] };
    }
    if (P.n === 2) {                                    // until then: the most corners in place against any one of them
      let best = 0;
      for (const ref of P.pieces) {
        const Rt = tr3(ref.M);
        let n = 0;
        for (const p of P.pieces) if (isI(mul3(Rt, p.M))) n++;
        if (n > best) best = n;
      }
      return { by: 'corners', v: best };
    }
    return { by: 'layers', v: layerScore(P, P.key !== 'cube3') };
  }

  return {
    warm,
    score,
    /**
     * Run `turn` (which turns a layer of P) and say whether it brought P closer to solved: { closer, exact }.
     * exact is true when the answer is the 2×2's own distance; otherwise the scene may also count as closer a turn
     * that undoes the last one in its history, which is a solution it knows.
     */
    judge(P, turn) {
      const before = score(P);
      turn();
      const after = score(P);
      return { closer: after.by === before.by && after.v > before.v, exact: before.by === 'exact' && after.by === 'exact' };
    },
    /** Is the 2×2's table in? */
    exact: () => !!table,
    dispose() { if (worker) worker.terminate(); worker = null; table = null; },
  };
}

export const _test = { coords2, layerScore, mul3, I3 };
