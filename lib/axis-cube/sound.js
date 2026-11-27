// The Cubes' sounds. Nothing is recorded: every sound is made here, on the spot, with the Web Audio API, so there
// are no files to fetch and none to license.
//
// What is heard, and when (the scene says when; see its calls to `sound.`):
//   bolololip             something is chosen: a puzzle picked up, or the button of the install screen. Four
//                         struck notes running up, the last one short and bright, with a little room around them
//   bolololipipob         the loading is over and the room appears: four up, one more bright note above them, and
//                         a low one that closes it
//   lolip / lolop         a layer lands on its quarter turn: two notes after the clack of plastic on plastic. The
//                         first is the face's own, so turning the puzzle plays a line. The second goes up (lip) if
//                         the turn brought the puzzle closer to solved, and down, low and soft (lop), if it did not
//                         (lib/axis-cube/hint.js decides)
//
// The phrases are never quite the same twice: each is drawn from a few figures (never the one just played), a
// little loose in time and touch. And each puzzle plays its own instrument: the Axis Cube an electric piano, the
// 3×3 a marimba, the 2×2 a kalimba, the Ghost Cube glass. The install screen and the end of loading use the piano.
//   a low, muffled swoosh while the camera moves to the puzzle picked, and back when it is put down: a whoosh as
//                         it would sound slowed down; then a thump as the puzzle lands on the cushion
//   the wind              while a puzzle or a layer is spinning freely, louder and brighter the faster it goes
//   a tick                each quarter turn a free spin passes
//   a rising growl        while a finger is held on the puzzle, charging
//   the wobble            while the puzzle scrambles or solves itself: a bass that opens and closes, faster as it
//                         goes, with a light clack for each turn, and a thump when it stops
//   the picker's music    while the puzzles sit on the ottoman to be chosen: a lo-fi loop made of all of the above
//                         (see "the picker's music" below)
//
// The bass is written for a phone's speaker, which has almost nothing below 200 Hz: the notes are low but made of
// saw and square waves, and what is heard is the filter moving through their harmonics.
//
// A browser lets a page make sound only once it has been touched, so the first sounds come with the first tap.
// On an iPhone the sounds follow the ring/silent switch and mix with whatever else is playing.

// the notes of the bass: E minor pentatonic, E2 to E3
const NOTES = [82.41, 98.0, 110.0, 123.47, 146.83, 164.81];
// how loud each thing is, in one place
const LEVEL = { master: 0.8, whoosh: 0.8, pan: 1.3, blip: 0.34, wind: 0.3, tick: 0.3, clack: 1.1, stab: 0.16, thump: 0.9, charge: 0.16, wobble: 0.2, music: 0.32 };
// The little phrases: E minor pentatonic again, B3 to B5, over the bass. A phrase is written as places in SCALE.
const SCALE = [246.94, 293.66, 329.63, 392.0, 440.0, 493.88, 587.33, 659.26, 783.99, 880.0, 987.77];
// bolololip: four running up (E A B E is the first)
const BOLOLOLIPS = [[2, 4, 5, 7], [3, 4, 6, 7], [2, 3, 5, 7], [4, 5, 6, 8], [2, 5, 4, 7], [3, 5, 6, 8]];
// bolololipipob: four up, one higher, a low one to close
const BOLOLOLIPIPOBS = [[2, 4, 5, 7, 8, 2], [3, 4, 6, 7, 9, 3], [2, 3, 5, 7, 8, 0]];
// lolip: the face's own note (E G A B D E for the six), then one to four places over it; lolop: one or two under
const FACE_AT = [2, 3, 4, 5, 6, 7];
const LIP_UP = [1, 2, 3, 4];
const LOP_DOWN = [1, 2];
// each puzzle's instrument; anything else plays the piano
const VOICE_OF = { axis: 'keys', cube3: 'marimba', cube2: 'kalimba', ghost: 'glass' };
const WAIT = 250;          // ms a sound made as the audio wakes may wait for its clock to start; past that it is dropped

/**
 * @param {BaseAudioContext} [given] a context to play into instead of the page's own (a test renders the sounds
 *   offline with one).
 */
export function makeSound(given) {
  const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
  let ctx = given || null, out = null, room = null, noise = null;
  let wind = null, charge = null, wobble = null;
  let dead = false, watchTimer = 0, windAt = 0, chargeAt = 0, muted = false;

  function build() {
    const comp = ctx.createDynamicsCompressor();           // a limiter: it leaves single sounds alone and keeps a pile of them from clipping
    comp.threshold.value = -7; comp.knee.value = 5; comp.ratio.value = 14; comp.attack.value = 0.002; comp.release.value = 0.1;
    out = ctx.createGain(); out.gain.value = muted ? 0 : LEVEL.master;   // everything passes here: off is off, music and all
    out.connect(comp); comp.connect(ctx.destination);
    // a little room, for the notes that want it: one soft echo that feeds itself and darkens as it goes
    const delay = ctx.createDelay(0.5), back = ctx.createGain(), dark = ctx.createBiquadFilter(), wet = ctx.createGain();
    delay.delayTime.value = 0.115; back.gain.value = 0.32; dark.type = 'lowpass'; dark.frequency.value = 3400; wet.gain.value = 0.28;
    room = ctx.createGain();
    room.connect(delay); delay.connect(dark); dark.connect(back); back.connect(delay); dark.connect(wet); wet.connect(out);
    const len = Math.floor(ctx.sampleRate * 2);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx) build();

  // The clock. An iPhone can say its audio is running while the audio's clock stands still, for a moment or for
  // seconds after it was woken; everything scheduled meanwhile waits for it, and plays all at once when it moves:
  // late, after what it belonged to. So the clock is watched, and a sound is only ever made on one that moves. One
  // asked for as the audio wakes (the touch that woke it) waits for the clock to start, a quarter of a second at
  // most; after that it is dropped: better no sound than one out of place.
  const clock = { t: 0, moved: -1e9, woke: -1e9 };
  function restart() { if (ctx) { clock.t = ctx.currentTime; clock.moved = -1e9; clock.woke = performance.now(); } }
  function ticking() {
    if (given) return !!ctx;
    if (!ctx || dead || ctx.state !== 'running') return false;
    const c = ctx.currentTime, p = performance.now();
    if (c !== clock.t) { clock.t = c; clock.moved = p; }
    return p - clock.moved < 250;
  }
  let waiting = [], waitTimer = 0;
  function soon(fn, until = clock.woke + WAIT) {          // fn now if the clock moves; else once it does, if before `until`
    if (dead) return;
    if (given || ticking()) { fn(); return; }
    if (!ctx || performance.now() >= until) return;
    waiting.push([fn, until]);
    if (!waitTimer) waitTimer = setInterval(() => {
      const go = ticking(), p = performance.now(), due = waiting;
      waiting = go ? [] : due.filter(([, u]) => p < u);
      if (go) for (const [f] of due) f();
      if (!waiting.length) { clearInterval(waitTimer); waitTimer = 0; }
    }, 12);
  }

  // The page's own context is made at the first touch, and woken at every later one: a browser can put it to sleep
  // (in the background, on a call), and it is put to sleep here after a while of silence. If the welcome's button
  // was pressed, the page's first script has already made one inside that tap (lib/axis-cube/gate.ts), before this
  // was even loaded: that one is taken up.
  //
  // On an iPhone only the end of a touch (touchend, click) counts as one for sound: a context made at its start
  // (pointerdown) stays silent, and a resume() alone may not wake one either; playing something inside the touch does.
  // So a context is only made at the end of a touch, and each touch that finds one asleep resumes it and plays a
  // silent sample into it.
  const UNLOCKS = { pointerup: 1, touchend: 1, click: 1, keydown: 1 };
  function unlock() {
    try { const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0); } catch { /* nothing to unlock with */ }
  }
  function wake(touched) {                                // touched is false only for the try made when the loading ends
    if (dead || given) return;
    if (!ctx && typeof window !== 'undefined' && window.__axisAudio) { try { ctx = window.__axisAudio; build(); restart(); } catch { ctx = null; } }
    const ending = !!touched && !!touched.type && UNLOCKS[touched.type] === 1;
    if (!ctx && touched && touched.type && !ending) return;   // the start of a touch: wait for its end to make one
    if (!ctx) {
      if (!AC) return;
      try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* not there: the browser's default */ }
      try { ctx = new AC({ latencyHint: 'interactive' }); build(); window.__axisAudio = ctx; restart(); } catch { ctx = null; dead = true; return; }
    }
    if (ctx.state !== 'running') { restart(); ctx.resume().catch(() => {}); if (ending) unlock(); }
    // the clock is looked at a few times a second, so a stop is known within a moment of it. The audio stays awake
    // while the page is on screen: woken again after a sleep, an iPhone's clock can take seconds to start, and the
    // first sounds of the next pick would come that late
    if (!watchTimer) watchTimer = setInterval(ticking, 100);
  }
  // a sound is made only on a clock that moves (see soon(), for the ones asked for as it starts)
  const live = () => !!ctx && !dead && ticking();

  const WAKERS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
  if (!given && typeof window !== 'undefined') for (const w of WAKERS) window.addEventListener(w, wake, { capture: true, passive: true });
  const hidden = () => { if (ctx && !given && document.hidden && ctx.state === 'running') ctx.suspend().catch(() => {}); };
  if (!given && typeof document !== 'undefined') document.addEventListener('visibilitychange', hidden);

  /* ───────── the pieces every sound is made of ───────── */
  const jitter = (spread) => 1 + (Math.random() - 0.5) * spread;
  function gain(t, shape) {                               // shape: [[time after t, level], ...], the first is where it starts
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(shape[0][1], 0.0001), t + shape[0][0]);
    for (let i = 1; i < shape.length; i++) g.gain.exponentialRampToValueAtTime(Math.max(shape[i][1], 0.0001), t + shape[i][0]);
    return g;
  }
  function hiss(t, dur) {                                 // a stretch of the noise, from a random place in it
    const s = ctx.createBufferSource();
    s.buffer = noise; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    return s;
  }
  function osc(type, f, t, dur) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function filter(type, f, q) {
    const b = ctx.createBiquadFilter();
    b.type = type; b.frequency.value = f; if (q !== undefined) b.Q.value = q;
    return b;
  }
  const chain = (...nodes) => { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[0]; };
  // The growl of the bass: the filtered note is pushed into a soft clip, which folds its resonance into harmonics.
  // It is also what lets a small speaker hear a low note at all.
  let curve = null;
  function growl(push) {
    if (!curve) { curve = new Float32Array(1025); for (let i = 0; i < 1025; i++) curve[i] = Math.tanh(((i - 512) / 512) * 2.6); }
    const pre = ctx.createGain(), ws = ctx.createWaveShaper();
    pre.gain.value = push; ws.curve = curve; ws.oversample = '2x'; pre.connect(ws);
    return { in: pre, out: ws };
  }

  /* ───────── one-shots ───────── */
  // A bass note through a filter that opens and closes: `moves` are [share of the note, cutoff] pairs. The wub-wub
  // that 0.6.0 put under every turn (taken off them in 0.6.7: too heavy for something so frequent), kept for a locked
  // puzzle saying no.
  function stab(f, dur, level, moves) {
    const t = ctx.currentTime, lp = filter('lowpass', moves[0][1], 9);
    lp.frequency.setValueAtTime(moves[0][1], t);
    for (let i = 1; i < moves.length; i++) lp.frequency.exponentialRampToValueAtTime(moves[i][1], t + dur * moves[i][0]);
    const g = gain(t, [[0, 0], [0.012, level], [dur * 0.72, level], [dur, 0]]);
    for (const [type, detune, part] of [['sawtooth', 1, 1], ['square', 1.009, 0.6], ['sawtooth', 2.004, 0.55]]) {
      const o = osc(type, f * detune, t, dur), p = ctx.createGain();
      p.gain.value = part; chain(o, p, lp);
    }
    const gr = growl(1.1);
    lp.connect(gr.in); chain(gr.out, g, out);
  }
  // air moving: noise through a band that slides from f0 to f1
  function whoosh(f0, f1, dur, level, q = 1.3, at = 0) {
    const t = ctx.currentTime + at, bp = filter('bandpass', f0, q);
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    chain(hiss(t, dur), bp, gain(t, [[0, 0], [dur * 0.4, level], [dur, 0]]), out);
  }
  // One struck note, in one of the instruments. `kind`: 'round' (bo, lo), 'bright' (lip, ip: shorter, struck
  // harder, lifting a little at the end), 'closed' (ob: softer and longer) or 'low' (op: soft and short). No note slides into its pitch: that
  // was what made the first ones sound like drops of water.
  function note(voice, f, t, L, kind, dest) {
    const hard = kind === 'bright' ? 1.35 : kind === 'closed' ? 0.7 : kind === 'low' ? 0.6 : 1;
    const ring = kind === 'bright' ? 0.6 : kind === 'closed' ? 1.5 : kind === 'low' ? 0.85 : 1;
    const lift = (o, ratio, dur) => { if (kind === 'bright') o.frequency.exponentialRampToValueAtTime(f * ratio * 1.03, t + dur); };
    const part = (ratio, level, dur, type = 'sine') => {        // a partial: struck, then dying away
      if (f * ratio > 11000) return null;
      const o = osc(type, f * ratio, t, dur);
      lift(o, ratio, dur);
      chain(o, gain(t, [[0, 0], [0.002, level], [dur, 0]]), dest);
      return o;
    };
    const click = (from, level, dur) => chain(hiss(t, dur), filter('highpass', from), gain(t, [[0, level], [dur, 0]]), dest);
    if (voice === 'keys') {                                    // an electric piano: brightness struck into a sine, dying first
      const d = 0.55 * ring, c = part(1, L, d), m = osc('sine', f, t, d), idx = ctx.createGain();
      lift(m, 1, d);
      idx.gain.setValueAtTime(f * 1.9 * hard, t); idx.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.17 * ring);
      chain(m, idx, c.frequency);
      part(2, L * 0.1, d * 0.4);
      click(3200, L * 0.1, 0.005);
    } else if (voice === 'marimba') {                          // wood: the fundamental, the fourth partial of a tuned bar, a knock
      part(1, L, 0.34 * ring);
      part(3.93, L * 0.42 * hard, 0.07);
      part(9.2, L * 0.07 * hard, 0.02);
      click(2200, L * 0.16, 0.004);
    } else if (voice === 'kalimba') {                          // a tine: a long sine, a high partial that is not in tune, a pluck
      part(1, L, 0.62 * ring);
      part(2, L * 0.1, 0.18);
      part(5.95, L * 0.26 * hard, 0.05);
      click(1800, L * 0.2, 0.003);
    } else {                                                   // glass: partials of a struck glass, the high ones gone first
      part(1, L * 0.9, 0.8 * ring);
      part(2.76, L * 0.24 * hard, 0.28);
      part(5.4, L * 0.12 * hard, 0.09);
      part(8.93, L * 0.05 * hard, 0.03);
    }
  }
  // a phrase: [pitch, seconds after the first, kind] notes, a little loose in touch, through the room
  function phrase(notes, voice, v = 1) {
    if (!live()) return;
    const t0 = ctx.currentTime + 0.004, L = LEVEL.blip * v, bus = filter('lowpass', 9000, 0.5);
    bus.connect(out); bus.connect(room);
    for (const [f, at, kind] of notes) note(voice, f, t0 + at, L * (0.88 + Math.random() * 0.24), kind, bus);
  }
  // which figure to play: any of n but the one played last
  const fresh = (n, last) => { if (n < 2) return 0; const k = Math.floor(Math.random() * (n - 1)); return k >= last && last >= 0 ? k + 1 : k; };
  const loose = (at) => (at ? at + (Math.random() - 0.5) * 0.012 : 0);
  let lastRun = -1, lastEnd = -1, lastLip = -1, lastLop = -1;
  function bolololip() {
    lastRun = fresh(BOLOLOLIPS.length, lastRun);
    const run = BOLOLOLIPS[lastRun];
    return run.map((p, i) => [SCALE[p], loose(i * 0.064), i === run.length - 1 ? 'bright' : 'round']);
  }
  function bolololipipob() {
    lastEnd = fresh(BOLOLOLIPIPOBS.length, lastEnd);
    const at = [0, 0.062, 0.124, 0.19, 0.275, 0.365], kinds = ['round', 'round', 'round', 'bright', 'bright', 'closed'];
    return BOLOLOLIPIPOBS[lastEnd].map((p, i) => [SCALE[p], loose(at[i]), kinds[i]]);
  }
  function lolip(face) {
    const root = FACE_AT[((face % FACE_AT.length) + FACE_AT.length) % FACE_AT.length];
    lastLip = fresh(LIP_UP.length, lastLip);
    return [[SCALE[root], 0, 'round'], [SCALE[Math.min(SCALE.length - 1, root + LIP_UP[lastLip])], loose(0.068), 'bright']];
  }
  function lolop(face) {
    const root = FACE_AT[((face % FACE_AT.length) + FACE_AT.length) % FACE_AT.length];
    lastLop = fresh(LOP_DOWN.length, lastLop);
    return [[SCALE[root], 0, 'round'], [SCALE[Math.max(0, root - LOP_DOWN[lastLop])], loose(0.072), 'low']];
  }
  const voiceOf = (puzzle) => VOICE_OF[puzzle] || 'keys';
  // the camera moving: air again, but as it sounds slowed down. Low, muffled, slow to come and slow to go, with a
  // faint tone under it that sinks. `up` is the way to the puzzle; the way back falls instead
  function pan(up, dur) {
    if (!live()) return;
    const t = ctx.currentTime, L = LEVEL.pan, bp = filter('bandpass', 260, 0.75), muff = filter('lowpass', 900, 0.5);
    const [a, b, c] = up ? [240, 620, 300] : [560, 300, 190];
    bp.frequency.setValueAtTime(a, t); bp.frequency.exponentialRampToValueAtTime(b, t + dur * 0.45); bp.frequency.exponentialRampToValueAtTime(c, t + dur);
    chain(hiss(t, dur), bp, muff, gain(t, [[0, 0], [dur * 0.4, L], [dur, 0]]), out);
    const o = osc('triangle', up ? 150 : 190, t, dur);
    o.frequency.exponentialRampToValueAtTime(up ? 205 : 110, t + dur);
    chain(o, filter('lowpass', 700, 0.5), gain(t, [[0, 0], [dur * 0.35, L * 0.11], [dur, 0]]), out);
  }
  // tick, clack and thump play now into the speaker, or, for the music, at a time `at` into its bus `dest`
  function tick(v = 1, at = 0, dest = out) {
    if (!live()) return;
    const t = at || ctx.currentTime, r = jitter(0.12);
    chain(osc('sine', 2150 * r, t, 0.02), gain(t, [[0, LEVEL.tick * v], [0.018, 0]]), dest);
    chain(hiss(t, 0.012), filter('highpass', 3000), gain(t, [[0, LEVEL.tick * 0.9 * v], [0.01, 0]]), dest);
  }
  // plastic landing on plastic: a splinter of noise, a body of partials that do not agree, a knock under them
  function clack(v = 1, at = 0, dest = out) {
    if (!live()) return;
    const t = at || ctx.currentTime, r = jitter(0.1), L = LEVEL.clack * v;
    chain(hiss(t, 0.03), filter('highpass', 2400), gain(t, [[0, L], [0.022, 0]]), dest);
    for (const [f, a, d] of [[1180, 0.64, 0.045], [1890, 0.4, 0.03], [3100, 0.16, 0.018]]) chain(osc('sine', f * r, t, d), gain(t, [[0, L * a], [d, 0]]), dest);
    const k = osc('sine', 210 * r, t, 0.07);
    k.frequency.exponentialRampToValueAtTime(120, t + 0.06);
    chain(k, gain(t, [[0, L * 0.8], [0.07, 0]]), dest);
  }
  // something with weight coming to rest. The sine that drops is for headphones; a phone's speaker hears the
  // triangle over it, the knock of noise and the short crack at the front
  function thump(v = 1, at = 0, dest = out) {
    if (!live()) return;
    const t = at || ctx.currentTime, L = LEVEL.thump * v;
    const o = osc('sine', 150, t, 0.3);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
    chain(o, gain(t, [[0, 0], [0.006, L * 0.4], [0.28, 0]]), dest);
    const h = osc('triangle', 440, t, 0.16);
    h.frequency.exponentialRampToValueAtTime(150, t + 0.09);
    chain(h, gain(t, [[0, L * 0.9], [0.15, 0]]), dest);
    chain(hiss(t, 0.09), filter('bandpass', 620, 0.8), gain(t, [[0, L * 1.6], [0.08, 0]]), dest);
    chain(hiss(t, 0.02), filter('highpass', 1800), gain(t, [[0, L * 0.3], [0.012, 0]]), dest);
  }

  /* ───────── the ones that last ───────── */
  // each runs for as long as it is wanted and is then let go, so nothing sounds, or costs, when the room is still
  function setWind(v) {                                   // 0..1: how fast the puzzle or a layer is spinning
    if (!live()) { v = 0; if (!wind) return; }
    if (!wind) {
      if (v < 0.02) return;
      const t = ctx.currentTime, src = ctx.createBufferSource(), bp = filter('bandpass', 400, 0.9), g = ctx.createGain();
      src.buffer = noise; src.loop = true; src.start(t, Math.random()); g.gain.value = 0.0001;
      chain(src, bp, g, out); wind = { src, bp, g };
    }
    const t = ctx.currentTime;
    if (Math.abs(v - windAt) > 0.015 || v === 0) {
      windAt = v;
      wind.g.gain.setTargetAtTime(LEVEL.wind * Math.pow(v, 1.4), t, 0.06);
      wind.bp.frequency.setTargetAtTime(350 + 2700 * v, t, 0.06);
    }
    if (v > 0.02) wind.quiet = 0;
    else if (!wind.quiet) wind.quiet = performance.now();
    else if (performance.now() - wind.quiet > 600) { try { wind.src.stop(); } catch { /* already stopped */ } wind.g.disconnect(); wind = null; windAt = 0; }
  }
  function setCharge(k) {                                 // 0..1: how far the hold has got
    if (!live()) { k = 0; if (!charge) return; }
    if (!charge) {
      if (k <= 0) return;
      const t = ctx.currentTime, lp = filter('lowpass', 300, 8), g = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
      const oscs = [['sawtooth', 1], ['square', 1.008]].map(([type, detune]) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = NOTES[0] * detune; o.start(t); o.connect(lp); return { o, detune }; });
      lfo.frequency.value = 5; depth.gain.value = 0; lfo.start(t); chain(lfo, depth, lp.frequency);
      const gr = growl(1.1);
      g.gain.value = 0.0001; lp.connect(gr.in); chain(gr.out, g, out);
      charge = { oscs, lp, g, lfo, depth };
    }
    const t = ctx.currentTime;
    if (Math.abs(k - chargeAt) > 0.01 || k === 0) {
      chargeAt = k;
      charge.g.gain.setTargetAtTime(LEVEL.charge * k, t, 0.03);
      for (const { o, detune } of charge.oscs) o.frequency.setTargetAtTime(NOTES[0] * detune * Math.pow(2, k), t, 0.03);   // up an octave as it fills
      charge.lp.frequency.setTargetAtTime(300 + 2600 * k * k, t, 0.03);
      charge.lfo.frequency.setTargetAtTime(5 + 11 * k, t, 0.03);
      charge.depth.gain.setTargetAtTime(700 * k, t, 0.03);
    }
    if (k > 0) charge.quiet = 0;
    else if (!charge.quiet) charge.quiet = performance.now();
    else if (performance.now() - charge.quiet > 300) {
      for (const { o } of charge.oscs) { try { o.stop(); } catch { /* already stopped */ } }
      try { charge.lfo.stop(); } catch { /* already stopped */ }
      charge.g.disconnect(); charge = null; chargeAt = 0;
    }
  }
  function setWobble(on) {                                // the puzzle is scrambling or solving itself
    if (on) {
      if (wobble || !live()) return;
      const t = ctx.currentTime, lp = filter('lowpass', 900, 10), g = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
      const oscs = [['sawtooth', 1, 1], ['square', 1.009, 0.6], ['sawtooth', 2.005, 0.5]].map(([type, detune, part]) => {
        const o = ctx.createOscillator(), p = ctx.createGain();
        o.type = type; o.frequency.value = NOTES[0] * detune; p.gain.value = part; o.start(t); chain(o, p, lp);
        return o;
      });
      // at 140 to the minute: eighths, then sixteenths, then faster still
      lfo.frequency.setValueAtTime(4.67, t); lfo.frequency.setValueAtTime(9.33, t + 0.86); lfo.frequency.setValueAtTime(14, t + 1.5);
      depth.gain.value = 760; lfo.start(t); chain(lfo, depth, lp.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(LEVEL.wobble, t + 0.03);
      const gr = growl(1.1);
      lp.connect(gr.in); chain(gr.out, g, out);
      wobble = { oscs, lfo, g };
    } else if (wobble) {
      const w = wobble; wobble = null;
      if (!ctx || ctx.state === 'closed') return;
      const t = ctx.currentTime;
      w.g.gain.cancelScheduledValues(t); w.g.gain.setTargetAtTime(0.0001, t, 0.03);
      for (const o of w.oscs) { o.frequency.setTargetAtTime(o.frequency.value * 0.5, t, 0.05); o.stop(t + 0.25); }   // it falls away as it stops
      w.lfo.stop(t + 0.25);
      setTimeout(() => { try { w.g.disconnect(); } catch { /* gone with the context */ } }, 400);
    }
  }

  // the 8-bit run of a score going into the screen: square waves stepping up
  function run8bit(t0, v, dest) {
    const bus = filter('lowpass', 5200, 0.7);
    bus.connect(dest);
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
      const t = t0 + i * 0.032;
      chain(osc('square', f, t, 0.05), gain(t, [[0, 0], [0.003, LEVEL.blip * 0.3 * v], [0.034, LEVEL.blip * 0.2 * v], [0.05, 0]]), bus);
    });
  }

  /* ───────── the picker's music ───────── */
  // While the puzzles sit on the ottoman to be chosen, a lo-fi loop plays, made of the app's own sounds: the
  // electric piano's chords, the bass of the wobble struck as notes, the thump of a landing for a kick, the clack of
  // a turn for a snare (with a brush of air under it), the tick of a spin for the hats, and over them a tune, in the
  // puzzles' own instruments, a different one each time round; every other time round, the bo-lup or the score's
  // 8-bit run closes it. Then what makes it lo-fi: a tape's slow wobble, the top rolled off, and a record's crackle.
  // Each loop is thirty seconds, and its tune is the same every time round: only the hands that play it are loose.
  // There are two; TRACK says which plays.
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // A chord: the bass note, and the piano's notes, kept under the tune (MIDI). A tune: bar by bar, its notes as
  // [the eighth it starts on, how many eighths it lasts, the note].
  const CH = {
    Em9: [40, [55, 59, 62, 66]], Cmaj7: [48, [55, 59, 60, 64]], Am9: [45, [57, 59, 60, 64]], B7: [47, [57, 59, 63, 66]],
    Gmaj7: [43, [55, 59, 62, 66]], Em7: [40, [55, 59, 62, 64]], D7: [50, [57, 60, 62, 66]],
    Am7: [45, [55, 57, 60, 64]], Bm7: [47, [57, 59, 62, 66]],
  };
  const HOOK = (top) => [[0, 1, 71], [1, 2, 76], [3, 1, 74], [4, 1, 76], [5, 3, top]];      // ba-DAA-da-da-DAAA
  const CELL = (a, b, c, d, e, f) => [[0, 1, a], [1, 1, b], [2, 2, c], [4, 1, d], [5, 1, e], [6, 2, f]];   // ta-ta-TAA, ta-ta-TAA
  const TRACKS = {
    // Dusk (1.1.0), kept: 64 to the minute, eight bars in E minor. One hook heard three times, reaching higher each
    // time (to G, then A, then B), an answer after it, and a contrast that walks down; plucked, in the cubes' voices.
    dusk: {
      bpm: 64, swing: 0.6, style: 'slow', voices: ['kalimba', 'glass', 'marimba', 'keys'], lead: 0.85,
      bars: ['Em9', 'Cmaj7', 'Am9', 'B7', 'Em9', 'Cmaj7', 'Am9', 'B7'],
      tune: [
        HOOK(79), [[0, 1, 78], [1, 1, 76], [2, 2, 74], [4, 4, 76]],
        HOOK(81), [[0, 1, 79], [1, 1, 78], [2, 2, 75], [4, 4, 78]],
        [[0, 3, 83], [3, 1, 81], [4, 2, 79], [6, 2, 76]], [[0, 3, 79], [3, 1, 78], [4, 2, 76], [6, 2, 72]],
        HOOK(83), [[0, 1, 81], [1, 1, 79], [2, 2, 78], [4, 3, 75]],
      ],
    },
    // Bounce, the one that plays: 96 to the minute, a light shuffle, twelve bars in G major, the chords bouncing on
    // the off-beats. Its tune is whistled, with a cube doubling it, and is built to stick: one rhythm, ta-ta-TAA
    // ta-ta-TAA, eight times in the first eight bars; the call climbs (B D E, B D G), the answer comes down (G E D,
    // E D B), and the third call reaches to A before the line rests on G and F sharp. Then four bars of longer notes
    // climb a step at a time, Am7, Bm7, Cmaj7, D7, back into the call. Never wider than B4 to A5.
    bounce: {
      bpm: 96, swing: 0.55, style: 'bounce', voices: ['kalimba', 'marimba', 'glass', 'keys'], lead: 0.26,
      bars: ['Gmaj7', 'Em7', 'Cmaj7', 'D7', 'Gmaj7', 'Em7', 'Cmaj7', 'D7', 'Am7', 'Bm7', 'Cmaj7', 'D7'],
      tune: [
        CELL(71, 74, 76, 71, 74, 79), CELL(79, 76, 74, 76, 74, 71), CELL(71, 74, 76, 71, 74, 81), [[0, 4, 79], [4, 2, 78], [6, 2, 74]],
        CELL(71, 74, 76, 71, 74, 79), CELL(79, 76, 74, 76, 74, 71), CELL(71, 74, 76, 71, 74, 81), [[0, 2, 78], [2, 2, 76], [4, 4, 74]],
        [[0, 3, 76], [3, 1, 74], [4, 4, 72]], [[0, 3, 78], [3, 1, 76], [4, 4, 74]],
        [[0, 3, 79], [3, 1, 78], [4, 2, 76], [6, 2, 79]], [[0, 1, 81], [1, 1, 79], [2, 2, 78], [4, 1, 74], [5, 1, 76], [6, 2, 78]],
      ],
    },
  };
  const TRACK = TRACKS.bounce;
  const BEAT = 60 / TRACK.bpm, SWING = TRACK.swing, STEPS = TRACK.bars.length * 8;
  const music = { input: null, gain: null, k: 0, timer: 0, next: 0, step: 0, round: 0, quiet: 0, want: 0, ever: false, nudged: 0, skin: 'lofi', skinAt: -10, chip: null, chipGain: null };
  const CHIP = 0.62;                                       // the chip version's level, against the lo-fi one's
  const VICTORY = 1.2;                                     // Cubed's, against the lobby's song: a fifth over it
  function buildMusic() {
    const input = ctx.createGain(), g = ctx.createGain(), send = ctx.createGain();
    // the tape: the sound runs through a short delay whose length drifts, which bends its pitch a few cents
    const tape = ctx.createDelay(0.05), wow = ctx.createOscillator(), wowD = ctx.createGain(), flut = ctx.createOscillator(), flutD = ctx.createGain();
    tape.delayTime.value = 0.008; wow.frequency.value = 0.55; wowD.gain.value = 0.0012; flut.frequency.value = 6.2; flutD.gain.value = 0.00011;
    chain(wow, wowD, tape.delayTime); chain(flut, flutD, tape.delayTime); wow.start(); flut.start();
    const top = filter('lowpass', 2500, 0.35), bottom = filter('highpass', 70, 0.5);
    g.gain.value = 0.0001; send.gain.value = 0.35;
    chain(input, tape, top, bottom, g, out); g.connect(send); send.connect(room); music.top = top;
    // the record: a few soft pops a second and a breath of hiss, looped
    const len = Math.floor(ctx.sampleRate * 3), crackle = ctx.createBuffer(1, len, ctx.sampleRate), d = crackle.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.012;
    for (let n = 0; n < 22; n++) {
      const at = Math.floor(Math.random() * (len - 400)), a = (0.15 + Math.random() * 0.5) * (Math.random() < 0.5 ? -1 : 1);
      for (let j = 0; j < 300; j++) d[at + j] += a * Math.exp(-j / 18) * (j % 2 ? -0.6 : 1);
    }
    const rec = ctx.createBufferSource(), recHp = filter('highpass', 1200, 0.5), recG = ctx.createGain();
    rec.buffer = crackle; rec.loop = true; recG.gain.value = 0.22; rec.start();
    chain(rec, recHp, recG, g);
    music.input = input; music.gain = g; music.osc = [wow, flut, rec];
    // The chip bus: the same song as an old 8-bit machine plays it, for the high scores' screen. Clean, no tape and
    // no record, but a little crushed: every sample stepped to one of 33 levels, as a cheap converter would.
    const chipIn = ctx.createGain(), crush = ctx.createWaveShaper(), cTop = filter('lowpass', 9000, 0.5), cg = ctx.createGain();
    const steps = new Float32Array(1025);
    for (let i = 0; i < 1025; i++) steps[i] = Math.round(((i - 512) / 512) * 16) / 16;
    crush.curve = steps; cg.gain.value = 0.0001;
    chain(chipIn, crush, cTop, cg, out);
    music.chip = chipIn; music.chipGain = cg;
    music.pulse25 = pulseWave(0.25); music.pulse12 = pulseWave(0.125);   // the lead's pulse, and the arpeggios' thinner one
  }
  // the wobble's bass, struck as a note: saw and square through a filter that closes, into the growl
  function bassNote(f, t, dur, L, dest) {
    const lp = filter('lowpass', 1200, 5), gr = growl(1.0);
    for (const [type, det, part] of [['sawtooth', 1, 1], ['square', 1.009, 0.55]]) { const p = ctx.createGain(); p.gain.value = part; chain(osc(type, f * det, t, dur), p, lp); }
    lp.frequency.setValueAtTime(1200, t); lp.frequency.exponentialRampToValueAtTime(240, t + dur * 0.8);
    lp.connect(gr.in); chain(gr.out, gain(t, [[0, 0], [0.012, L], [dur * 0.55, L * 0.45], [dur, 0]]), dest);
  }
  // a whistle: a sine with a breath of air at its pitch, and a slow vibrato that comes in as the note is held. It
  // starts on its pitch (no note here slides into one)
  function whistle(f, t, dur, L, dest) {
    const end = dur + 0.1, o = osc('sine', f, t, end), vib = osc('sine', 5.3, t, end), vd = ctx.createGain(), h = osc('sine', f * 2, t, end), hg = ctx.createGain();
    vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.3, dur * 0.7)); chain(vib, vd, o.frequency);
    hg.gain.value = 0.05;
    const env = gain(t, [[0, 0], [0.03, L], [Math.max(0.05, dur - 0.03), L * 0.82], [dur + 0.08, 0]]);
    o.connect(env); chain(h, hg, env); env.connect(dest);
    chain(hiss(t, end), filter('bandpass', f, 7), gain(t, [[0, 0], [0.03, L * 0.55], [dur, L * 0.35], [dur + 0.08, 0]]), dest);
  }
  function brush(v, t, dest) { chain(hiss(t, 0.14), filter('bandpass', 1900, 0.7), gain(t, [[0, 0], [0.005, LEVEL.blip * 0.5 * v], [0.14, 0]]), dest); }
  function chord(ms, v, t, dest) { ms.forEach((m, i) => note('keys', hz(m), t + i * 0.012 + Math.random() * 0.006, LEVEL.blip * v * (0.85 + Math.random() * 0.3), 'closed', dest)); }
  // a pulse wave, high for `duty` of each cycle (a square is a half), from its harmonics
  function pulseWave(duty) {
    const N = 40, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return ctx.createPeriodicWave(re, im);
  }
  // the chip's channels: a pulse gated on and off; the triangle (the bass, and dropping, the kick); the noise
  function chipTone(wave, f, t, dur, L, dest) {
    const o = ctx.createOscillator(); o.setPeriodicWave(wave); o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.04);
    chain(o, gain(t, [[0, 0], [0.004, L], [Math.max(0.012, dur - 0.012), L * 0.72], [dur + 0.02, 0]]), dest);
  }
  function chipTri(f, t, dur, L, dest, drop) {
    const o = osc('triangle', f, t, dur);
    if (drop) o.frequency.exponentialRampToValueAtTime(drop, t + dur * 0.9);
    chain(o, gain(t, [[0, 0], [0.003, L], [dur * 0.8, L * 0.8], [dur, 0]]), dest);
  }
  function chipNoise(t, dur, L, hp, dest) { chain(hiss(t, dur), filter('highpass', hp), gain(t, [[0, L], [dur, 0]]), dest); }
  // one eighth of the song as the chip plays it: the same tune, chords and beat, on the old machine's channels
  function chipStep(bar, s, t, round) {
    const dest = music.chip, [root, voicing] = CH[TRACK.bars[bar]], last = bar === TRACK.bars.length - 1, half = BEAT / 2;
    // drums: the triangle dropping for the kick, noise for the snare (with a blip under it) and for the hats
    if (s === 0 || s === 4) chipTri(160, t, 0.12, 0.5, dest, 45);
    if (s === 3 && TRACK.style !== 'slow') chipTri(160, t, 0.1, 0.3, dest, 45);
    if (s === 2 || s === 6) { chipNoise(t, 0.13, 0.3, 1500, dest); chipTri(240, t, 0.06, 0.22, dest, 110); }
    chipNoise(t, 0.025, s % 2 ? 0.1 : 0.16, 7000, dest);
    // the bass on the triangle: the root, its octave, its fifth, never up into the tune (above F sharp 4)
    const low = (m) => (m > 66 ? m - 12 : m);
    if (s === 0) chipTri(hz(root + 12), t, half * 1.8, 0.4, dest);
    if (s === 3 || s === 6) chipTri(hz(low(root + 24)), t, half * 0.9, 0.32, dest);
    if (s === 4) chipTri(hz(low(root + 19)), t, half * 1.8, 0.36, dest);
    // the chord as an arpeggio on the thin pulse, its notes in turn, a sixteenth each, under the tune
    for (let i = 0; i < 2; i++) chipTone(music.pulse12, hz(voicing[(s * 2 + i) % voicing.length]), t + i * half / 2, half / 2 * 0.85, 0.04, dest);
    // the tune on the lead's pulse, held for its length
    for (const [at, len, m] of TRACK.tune[bar]) if (at === s) chipTone(music.pulse25, hz(m), t, len * half * 0.95, 0.12, dest);
    // every other time round, the score's 8-bit run closes it
    if (round % 2 === 1 && last && s === 7) run8bit(t, 0.55, dest);
  }
  // One eighth of the loop, in whichever version is heard (both, for a moment, while one fades into the other)
  function playStep(bar, s, t, round) {
    const changing = ctx.currentTime - music.skinAt < 1.2;
    if (music.skin === 'lofi' || changing) lofiStep(bar, s, t, round);
    if (music.skin === 'chip' || changing) chipStep(bar, s, t, round);
  }
  // one eighth of the loop: bar, step s (0..7) of it, at time t, in the round's voice
  function lofiStep(bar, s, t, round) {
    const dest = music.input, [root, voicing] = CH[TRACK.bars[bar]], next = CH[TRACK.bars[(bar + 1) % TRACK.bars.length]][0];
    const voice = TRACK.voices[round % TRACK.voices.length], last = bar === TRACK.bars.length - 1;
    const lt = () => t + (Math.random() - 0.5) * 0.012;               // a little loose, as hands are
    if (TRACK.style === 'slow') {
      // drums: kick on one and three, snare on two and four, the hats every eighth
      if (s === 0 || s === 4) thump(s === 0 ? 0.55 : 0.45, lt(), dest);
      if (s === 3 && Math.random() < 0.35) thump(0.25, lt(), dest);
      if (s === 2 || s === 6) { clack(0.28, lt(), dest); brush(0.8, lt(), dest); }
      if (Math.random() > 0.08) tick((s % 2 ? 0.28 : 0.45) * (0.8 + Math.random() * 0.4), lt(), dest);
      // the piano: on the one, and a stab after
      if (s === 0) chord(voicing, 0.3, lt(), dest);
      if (s === 3) chord(voicing.slice(1), 0.19, lt(), dest);
      if (s === 7 && Math.random() < 0.5) chord(voicing.slice(2), 0.14, lt(), dest);
      // the bass
      if (s === 0) bassNote(hz(root), t, BEAT * 1.6, 0.16, dest);
      if (s === 5) bassNote(hz(root + (Math.random() < 0.5 ? 7 : 12)), t, BEAT * 0.45, 0.12, dest);
      if (s === 7 && Math.random() < 0.4) bassNote(hz(next + (next > root ? -1 : 1)), t, BEAT * 0.35, 0.1, dest);
    } else {
      // drums, livelier: the kick pushes ahead on two-and, and now and then on four-and
      if (s === 0 || s === 4) thump(s === 0 ? 0.55 : 0.48, lt(), dest);
      if (s === 3 && Math.random() < 0.55) thump(0.3, lt(), dest);
      if (s === 7 && Math.random() < 0.25) thump(0.22, lt(), dest);
      if (s === 2 || s === 6) { clack(0.3, lt(), dest); brush(0.9, lt(), dest); }
      tick((s % 2 ? 0.26 : 0.42) * (0.8 + Math.random() * 0.4), lt(), dest);
      // the piano: the chord on the one, then short stabs on every off-beat, the bounce
      if (s === 0) chord(voicing, 0.22, lt(), dest);
      if (s % 2 === 1) voicing.slice(1).forEach((m) => note('keys', hz(m), lt(), LEVEL.blip * 0.11 * (0.85 + Math.random() * 0.3), 'low', dest));
      // the bass walks: root, its octave on two-and, the fifth on three, a step into the next chord
      if (s === 0) bassNote(hz(root), t, BEAT * 0.9, 0.16, dest);
      if (s === 3) bassNote(hz(root + 12), t, BEAT * 0.4, 0.1, dest);
      if (s === 4) bassNote(hz(root + 7), t, BEAT * 0.8, 0.13, dest);
      if (s === 7 && Math.random() < 0.5) bassNote(hz(next + (next > root ? -1 : 1)), t, BEAT * 0.35, 0.1, dest);
    }
    // the tune: in the slow loop, the cube plays it (a long note rings longer, and the marimba rolls it); in the
    // bouncing one it is whistled, with the cube under it
    for (const [at, len, m] of TRACK.tune[bar]) {
      if (at !== s) continue;
      const L = LEVEL.blip * TRACK.lead * (0.9 + Math.random() * 0.2), long = len >= 3, t0 = lt();
      if (TRACK.style === 'slow') {
        note(voice, hz(m), t0, L, long ? 'closed' : 'round', dest);
        if (voice === 'marimba' && long) for (let r = 1; r < len * 2; r++) note(voice, hz(m), t0 + r * BEAT / 4, L * 0.55, 'round', dest);
      } else {
        whistle(hz(m), t0, len * BEAT / 2 * 0.92, L, dest);
        note(voice, hz(m), t0, LEVEL.blip * 0.42, long ? 'closed' : 'round', dest);
      }
    }
    // every other time round, a fill to close: the air rising into it, then the bo-lup or the 8-bit run
    if (round % 2 === 1 && last && s === 5) chain(hiss(t, BEAT), filter('bandpass', 600, 1.2), gain(t, [[0, 0], [BEAT * 0.9, LEVEL.blip * 0.35], [BEAT, 0]]), dest);
    if (round % 2 === 1 && last && s === 7) {
      if (round % 4 === 1) { note('keys', SCALE[1], lt(), LEVEL.blip * 0.5, 'round', dest); note('keys', SCALE[6], t + 0.075, LEVEL.blip * 0.5, 'bright', dest); }
      else run8bit(t, 0.45, dest);
    }
  }
  function schedule() {
    if (!ctx || dead || !music.input || !ticking()) return;   // a clock that stands still: nothing is put on it, the song waits
    const now = ctx.currentTime;
    if (vic.on) {                                        // the victory song, in place of the other
      while (vic.next < now - 0.02) advanceCubed(false);
      while (vic.next < now + 0.3) advanceCubed(true);
      return;
    }
    const advance = (play) => {
      const s = music.step % 8;
      if (play) playStep(Math.floor(music.step / 8), s, music.next, music.round);
      music.next += BEAT * (s % 2 === 0 ? SWING : 1 - SWING);
      if (++music.step === STEPS) { music.step = 0; music.round++; }
    };
    while (music.next < now - 0.02) advance(false);                     // the page was held up: those eighths are gone, the beat keeps its place
    while (music.next < now + 0.3) advance(true);
  }
  /* ───────── Cubed: the victory song ───────── */
  // From the cheer after a solve by hand until the initials are kept (YES), Cubed plays instead of the lobby's song
  // and the screen's chip tune, on the lo-fi bus. 120 to the minute, sixteenths, a light shuffle. Eight upbeat bars
  // in D (D Bm G A, twice): the hook, TA-te ta-ta TA-te to-ta-to-ta-te TAAA, four times, the fourth climbing. Then
  // four chill bars (Gmaj7 F#m7 Em7 A7sus4), the drums at half time and the top rolled off, the hook slowed down,
  // and the run li li lo lu lo lu lo lu lo LOOP back into it. Twenty-four seconds round.
  const CB = 60 / 120, E8 = CB / 2, SW16 = 0.55;
  const CC = { D: [50, [54, 57, 62, 66]], Bm: [47, [54, 59, 62, 66]], G: [43, [55, 59, 62, 67]], A: [45, [52, 57, 61, 64]],
    Gmaj7: [43, [55, 59, 62, 66]], Fsm7: [42, [54, 57, 61, 64]], Em7: [40, [55, 59, 62, 64]], A7s: [45, [55, 57, 62, 64]] };
  const CBARS = ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A', 'Gmaj7', 'Fsm7', 'Em7', 'A7s'];
  const HK = (n) => [[0, 3, n[0]], [3, 1, n[1]], [4, 2, n[2]], [6, 2, n[3]], [8, 3, n[4]], [11, 1, n[5]], [12, 1, n[6]], [13, 1, n[7]], [14, 1, n[8]], [15, 1, n[9]]];
  const P1 = HK([69, 71, 74, 74, 78, 76, 74, 76, 74, 71]), P1b = [[0, 2, 74], [2, 12, 78]];
  const P2 = HK([69, 71, 74, 74, 79, 78, 76, 78, 76, 74]), P2b = [[0, 2, 74], [2, 12, 76]];
  const P4 = HK([69, 71, 74, 74, 83, 81, 78, 81, 78, 76]), P4b = [[0, 2, 78], [2, 14, 81]];
  const CTUNE = [P1, P1b, P2, P2b, P1, P1b, P4, P4b,
    [[0, 6, 78], [6, 2, 76], [8, 4, 74], [12, 4, 71]], [[0, 8, 69], [8, 4, 71], [12, 4, 73]],
    [[0, 6, 71], [8, 1, 81], [9, 1, 81], [10, 1, 74], [11, 1, 78], [12, 1, 74], [13, 1, 76], [14, 1, 71], [15, 1, 74]],
    [[0, 1, 69], [2, 13, 76]]];
  const RUN = (bar, at) => (bar === 10 && at >= 8) || (bar === 11 && at === 0);   // li li lo lu lo lu lo lu lo
  function cubedStep(bar, s, t) {
    const dest = music.input, [root, voicing] = CC[CBARS[bar]], next = CC[CBARS[(bar + 1) % CBARS.length]][0];
    const chill = bar >= 8, lt = () => t + (Math.random() - 0.5) * 0.008;
    if (!chill) {
      if (s === 0 || s === 8) thump(s === 0 ? 0.6 : 0.5, lt(), dest);
      if (s === 6 || (s === 14 && Math.random() < 0.5)) thump(0.3, lt(), dest);
      if (s === 4 || s === 12) { clack(0.32, lt(), dest); brush(0.9, lt(), dest); }
      if (s % 2 === 0) tick((s % 4 ? 0.3 : 0.42) * (0.85 + Math.random() * 0.3), lt(), dest);
      else if (Math.random() < 0.35) tick(0.14, lt(), dest);
      if (s === 0) chord(voicing, 0.22, lt(), dest);
      if (s % 4 === 2) voicing.slice(1).forEach((m) => note('keys', hz(m), lt(), LEVEL.blip * 0.12 * (0.85 + Math.random() * 0.3), 'low', dest));
      if (s === 0 || s === 4 || s === 12) bassNote(hz(root), t, E8 * 1.6, 0.15, dest);
      if (s === 6 || s === 14) bassNote(hz(root + 12), t, E8 * 0.8, 0.1, dest);
      if (s === 8) bassNote(hz(root + 7), t, E8 * 1.6, 0.13, dest);
    } else {
      if (s === 0) thump(0.5, lt(), dest);
      if (s === 8) { clack(0.22, lt(), dest); brush(0.7, lt(), dest); }
      if (s % 4 === 0) tick(0.2 * (0.85 + Math.random() * 0.3), lt(), dest);
      if (s === 0) chord(voicing, 0.26, lt(), dest);
      if (s === 8) chord(voicing.slice(1), 0.16, lt(), dest);
      if (s === 0) bassNote(hz(root), t, CB * 1.8, 0.15, dest);
      if (s === 8) bassNote(hz(root + 7), t, CB * 1.6, 0.11, dest);
      if (bar === 11 && s === 10) chain(hiss(t, CB * 1.5), filter('bandpass', 700, 1.1), gain(t, [[0, 0], [CB * 1.4, LEVEL.blip * 0.3], [CB * 1.5, 0]]), dest);
    }
    for (const [at, len, m] of CTUNE[bar]) {
      if (at !== s) continue;
      const t0 = lt(), dur = len * E8 / 2 * 0.95;
      if (RUN(bar, at)) { note('kalimba', hz(m), t0, LEVEL.blip * 0.55, 'round', dest); note('glass', hz(m), t0, LEVEL.blip * 0.3, 'round', dest); continue; }
      whistle(hz(m), t0, dur, LEVEL.blip * (chill ? 0.2 : 0.26), dest);
      note(chill ? 'glass' : 'marimba', hz(m), t0, LEVEL.blip * (chill ? 0.32 : 0.44), len >= 3 ? 'closed' : 'round', dest);
    }
  }
  const vic = { on: false, next: 0, step: 0 };
  function advanceCubed(play) {
    const bar = Math.floor(vic.step / 16) % CBARS.length, sx = vic.step % 16, t = vic.next;
    if (play && sx === 0 && music.top) {                // the top rolls off into the chill, and opens again for the hook
      if (bar === 8) { music.top.frequency.setValueAtTime(3000, t); music.top.frequency.exponentialRampToValueAtTime(1300, t + CB * 3); }
      if (bar === 0) music.top.frequency.setTargetAtTime(3000, Math.max(ctx.currentTime, t - CB), 0.15);
    }
    if (play) cubedStep(bar, sx, t);
    vic.next += E8 * (sx % 2 === 0 ? SW16 : 1 - SW16); vic.step++;
  }
  function setVictory(on, delay = 0) {
    if (on && !vic.on) {
      vic.on = true; vic.step = 0; vic.next = (ctx ? ctx.currentTime : 0) + delay;
    } else if (!on && vic.on) {
      vic.on = false;
      if (ctx && music.top) music.top.frequency.setTargetAtTime(2500, ctx.currentTime, 0.2);   // the lobby's own top
      music.step = 0; music.round = 0; music.next = ctx ? ctx.currentTime + 0.4 : 0;           // its song from the top
    }
  }
  function setMusic(k, chipOn) {                          // 0..1: how much of it the room should hear; chipOn: the chip version
    if (vic.on) { k = 1; chipOn = false; }               // the victory song plays, in the cube's view and on the screen
    music.want = k; if (k > 0) music.ever = true;
    // wanted, but the audio is asleep (put to sleep, or stopped by the phone): wake it, which a browser allows once
    // the page has been touched; if it does not, the next touch will
    if (k > 0 && ctx && !given && !dead && ctx.state !== 'running' && ctx.state !== 'closed' && performance.now() - music.nudged > 1000) {
      music.nudged = performance.now(); restart(); ctx.resume().catch(() => {});
    }
    if (!live()) { k = 0; if (!music.input) return; }
    if (k > 0 && !music.input) buildMusic();
    if (!music.input) return;
    const skin = chipOn ? 'chip' : 'lofi', swap = skin !== music.skin;
    if (swap) { music.skin = skin; music.skinAt = ctx.currentTime; }
    if (swap || Math.abs(k - music.k) > 0.01 || (k === 0 && music.k !== 0)) {
      const rise = k > music.k, t = ctx.currentTime; music.k = k;
      const tau = swap ? 0.35 : rise ? (vic.on ? 0.25 : 0.7) : 0.3;   // the victory song comes up quickly, on the cheer's heels
      music.gain.gain.setTargetAtTime(Math.max(0.0001, skin === 'lofi' ? LEVEL.music * k * (vic.on ? VICTORY : 1) : 0), t, tau);
      music.chipGain.gain.setTargetAtTime(Math.max(0.0001, skin === 'chip' ? LEVEL.music * CHIP * k : 0), t, tau);
    }
    if (k > 0) {
      music.quiet = 0;
      if (!music.timer) { music.next = ctx.currentTime + 0.12; music.step = 0; music.timer = setInterval(schedule, 40); schedule(); }
    } else if (music.timer) {
      if (!music.quiet) music.quiet = performance.now();
      else if (performance.now() - music.quiet > 2500) { clearInterval(music.timer); music.timer = 0; music.quiet = 0; }   // faded out: it stops, and starts again from the top
    }
  }

  const api = {
    wake,
    /** Whether the audio's clock moves (a sound made now is heard now). */
    ticking,
    /**
     * The loading is over. A browser only lets this be heard if the page has been touched by then (the install
     * screen's button, or a tap while it loads) or, on Android, if the app is installed. Otherwise it is skipped:
     * it is never kept for later, when it would sound out of place.
     */
    ready(waitForTouch) {
      if (given) { phrase(bolololipipob(), 'keys'); return; }
      // a page with no welcome to tap (an artifact) does not make its sound here, outside a touch, where an iPhone can
      // leave it silent for good: the first touch makes it (wake)
      if (waitForTouch && !ctx && !(typeof window !== 'undefined' && window.__axisAudio)) return;
      wake(false);
      if (!ctx || dead) return;
      soon(() => phrase(bolololipipob(), 'keys'), performance.now() + 700);   // on a clock that moves within 0.7 s, or not at all
    },
    /** Something is chosen with a tap that is not a puzzle: the install screen's button. */
    select() { phrase(bolololip(), 'keys'); },
    /** A puzzle is chosen (its key: 'axis', 'cube3', ...): it leaves the cushion and the camera goes to it. */
    pick(puzzle) { phrase(bolololip(), voiceOf(puzzle)); pan(true, 1.05); },
    /** It is let go, back to its hollow, and the camera rises. */
    drop() { pan(false, 0.8); },
    /** It lands. */
    land() { thump(1); },
    /**
     * A layer of `puzzle` lands on a quarter turn of face `face`. `turned` is false when it only fell back; `closer`
     * says whether the turn brought the puzzle closer to solved: a lip if so, a lop if not.
     */
    turn(face, turned = true, puzzle, closer = false) {
      if (!live()) return;
      clack(turned ? 1 : 0.5);
      if (turned) phrase(closer ? lolip(face) : lolop(face), voiceOf(puzzle), closer ? 0.8 : 0.62);
    },
    /** A locked puzzle is touched: it says no, with the wobbling bass stab. */
    refuse() { if (live()) stab(NOTES[0], 0.2, LEVEL.stab, [[0, 280], [0.22, 2600], [0.5, 340], [0.74, 1900], [1, 220]]); },
    /** One turn of a scramble or a solve. */
    step() { clack(0.6); },
    /** The whole puzzle lands on a face. */
    flip() { clack(0.7); thump(0.45); },
    /** A quarter passes under a free spin. */
    tick() { tick(1); },
    /** The pull that puts it down passes its mark, either way. */
    arm() { tick(0.7); },
    /** A tap on a face sends the puzzle round. */
    swish() { if (live()) whoosh(700, 2000, 0.2, LEVEL.whoosh * 0.6); },
    /** Something with weight sent flying (the clock into the iMac's screen): a long, falling swoosh. */
    swoosh() { if (live()) whoosh(1800, 420, 0.42, LEVEL.whoosh * 0.75, 1.1); },
    /** It lands: bo-lup, low then up, in the keys, and a soft thump under it for the weight. */
    bolup() { phrase([[SCALE[1], 0, 'round'], [SCALE[6], loose(0.075), 'bright']], 'keys', 1.1); thump(0.35); },
    /** The time merging into the screen: a quick 8-bit run, square waves stepping up, as an old machine takes a score. */
    merge(after = 0) { if (live()) run8bit(ctx.currentTime + 0.005 + after, 1, out); },
    /** A puzzle solved by hand: bi-li-li-li-lo-lu-li-lup, up, a little back down, and up to the top, in the puzzle's own voice. */
    cheer(puzzle) {
      const at = [0, 0.07, 0.14, 0.21, 0.3, 0.37, 0.45, 0.56], idx = [5, 7, 8, 9, 6, 5, 8, 10];
      const kinds = ['round', 'bright', 'bright', 'bright', 'round', 'round', 'bright', 'bright'];
      phrase(idx.map((k, i) => [SCALE[k], loose(at[i]), kinds[i]]), voiceOf(puzzle), 1.15);
    },
    wind: setWind,
    charge: setCharge,
    /** The music, 0..1, every frame: how much of it should be heard; chip: the chip version (the high scores' screen). */
    music: setMusic,
    /** Cubed, the victory song: on after the cheer of a solve (`delay` seconds on), off once the initials are kept. */
    victory: setVictory,
    /** For a test: how much of the music is wanted (k) and whether its loop is running. */
    musicNow() { return { k: music.k, playing: !!music.timer, step: music.step, round: music.round, skin: music.skin, victory: vic.on, vstep: vic.step }; },
    /** For a test with its own (offline) context: the music's first `secs` seconds, all scheduled at once. */
    cubedFor(secs) {
      if (!given) return;
      if (!music.input) buildMusic();
      music.gain.gain.value = LEVEL.music; music.chipGain.gain.value = 0.0001;
      vic.on = true; vic.step = 0; vic.next = 0.05;
      while (vic.next < secs) advanceCubed(true);
    },
    musicFor(secs, skin = 'lofi') {
      if (!given) return;
      if (!music.input) buildMusic();
      music.skin = skin; music.skinAt = -10;
      music.gain.gain.value = skin === 'lofi' ? LEVEL.music : 0.0001; music.chipGain.gain.value = skin === 'chip' ? LEVEL.music * CHIP : 0.0001;
      let t = 0.05, step = 0, round = 0;
      while (t < secs) {
        const st = step % 8; playStep(Math.floor(step / 8), st, t, round);
        t += BEAT * (st % 2 === 0 ? SWING : 1 - SWING);
        if (++step === STEPS) { step = 0; round++; }
      }
    },
    /** The scramble or the solve starts (true) and ends (false). */
    wobble(on) { const was = !!wobble; setWobble(on); if (!on && was) thump(0.6); },
    /** Every sound off (true), or back on: the whole of it, faded in a few hundredths so it doesn't click. */
    mute(on) {
      muted = !!on;
      if (out && ctx && ctx.state !== 'closed') { const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(muted ? 0 : LEVEL.master, t, 0.015); }
    },
    isMuted() { return muted; },
    /** Let go of everything that lasts, without a sound: the room is being taken down. */
    quiet() {
      setWobble(false); setWind(0); setCharge(0);
      if (music.timer) { clearInterval(music.timer); music.timer = 0; }
      if (music.gain && ctx && ctx.state !== 'closed') { music.gain.gain.cancelScheduledValues(ctx.currentTime); music.gain.gain.setValueAtTime(0.0001, ctx.currentTime); music.k = 0; }
    },
    dispose() {
      dead = true;
      if (watchTimer) clearInterval(watchTimer);
      if (waitTimer) clearInterval(waitTimer);
      waiting = [];
      if (music.timer) { clearInterval(music.timer); music.timer = 0; }
      if (!given && typeof window !== 'undefined') {
        for (const w of WAKERS) window.removeEventListener(w, wake, { capture: true });
        document.removeEventListener('visibilitychange', hidden);
      }
      wobble = null; wind = null; charge = null;
      if (ctx && !given) {
        if (typeof window !== 'undefined' && window.__axisAudio === ctx) window.__axisAudio = undefined;
        try { ctx.close(); } catch { /* already closed */ }
      }
    },
  };
  // the sounds of a moment (a touch, a landing, a cheer): asked for as the audio wakes, they wait for its clock
  for (const name of ['select', 'pick', 'drop', 'land', 'turn', 'refuse', 'step', 'flip', 'tick', 'arm', 'swish', 'swoosh', 'bolup', 'merge', 'cheer']) {
    const play = api[name];
    api[name] = (...args) => soon(() => play(...args));
  }
  return api;
}
