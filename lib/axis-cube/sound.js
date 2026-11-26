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
//
// The bass is written for a phone's speaker, which has almost nothing below 200 Hz: the notes are low but made of
// saw and square waves, and what is heard is the filter moving through their harmonics.
//
// A browser lets a page make sound only once it has been touched, so the first sounds come with the first tap.
// On an iPhone the sounds follow the ring/silent switch and mix with whatever else is playing.

// the notes of the bass: E minor pentatonic, E2 to E3
const NOTES = [82.41, 98.0, 110.0, 123.47, 146.83, 164.81];
// how loud each thing is, in one place
const LEVEL = { master: 0.8, whoosh: 0.8, pan: 1.3, blip: 0.34, wind: 0.3, tick: 0.3, clack: 1.1, thump: 0.9, charge: 0.16, wobble: 0.2 };
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
const IDLE = 20000;        // ms of nothing to play before the audio is put to sleep; the next touch wakes it

/**
 * @param {BaseAudioContext} [given] a context to play into instead of the page's own (a test renders the sounds
 *   offline with one).
 */
export function makeSound(given) {
  const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
  let ctx = given || null, out = null, room = null, noise = null;
  let wind = null, charge = null, wobble = null;
  let dead = false, asked = -1e9, lastUse = 0, sleepTimer = 0, windAt = 0, chargeAt = 0;

  function build() {
    const comp = ctx.createDynamicsCompressor();           // a limiter: it leaves single sounds alone and keeps a pile of them from clipping
    comp.threshold.value = -7; comp.knee.value = 5; comp.ratio.value = 14; comp.attack.value = 0.002; comp.release.value = 0.1;
    out = ctx.createGain(); out.gain.value = LEVEL.master;
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

  // The page's own context is made at the first touch, and woken at every later one: a browser can put it to sleep
  // (in the background, on a call), and it is put to sleep here after a while of silence. If the welcome's button
  // was pressed, the page's first script has already made one inside that tap (lib/axis-cube/gate.ts), before this
  // was even loaded: that one is taken up.
  function wake(touched) {                                // touched is false only for the try made when the loading ends
    if (dead || given) return;
    if (!ctx && typeof window !== 'undefined' && window.__axisAudio) { try { ctx = window.__axisAudio; build(); } catch { ctx = null; } }
    if (!ctx) {
      if (!AC) return;
      try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* not there: the browser's default */ }
      try { ctx = new AC({ latencyHint: 'interactive' }); build(); window.__axisAudio = ctx; } catch { ctx = null; dead = true; return; }
    }
    lastUse = performance.now();
    if (ctx.state !== 'running') { if (touched !== false) asked = performance.now(); ctx.resume().catch(() => {}); }
    if (!sleepTimer) sleepTimer = setInterval(() => {
      if (ctx && ctx.state === 'running' && performance.now() - lastUse > IDLE && !wobble) ctx.suspend().catch(() => {});
    }, 5000);
  }
  // a context that was asked to start a moment ago counts as live: what is scheduled now plays as it starts
  const live = () => !!ctx && !dead && (given ? true : ctx.state === 'running' || performance.now() - asked < 500);
  const used = () => { lastUse = performance.now(); };

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
    if (!live()) return; used();
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
    if (!live()) return; used();
    const t = ctx.currentTime, L = LEVEL.pan, bp = filter('bandpass', 260, 0.75), muff = filter('lowpass', 900, 0.5);
    const [a, b, c] = up ? [240, 620, 300] : [560, 300, 190];
    bp.frequency.setValueAtTime(a, t); bp.frequency.exponentialRampToValueAtTime(b, t + dur * 0.45); bp.frequency.exponentialRampToValueAtTime(c, t + dur);
    chain(hiss(t, dur), bp, muff, gain(t, [[0, 0], [dur * 0.4, L], [dur, 0]]), out);
    const o = osc('triangle', up ? 150 : 190, t, dur);
    o.frequency.exponentialRampToValueAtTime(up ? 205 : 110, t + dur);
    chain(o, filter('lowpass', 700, 0.5), gain(t, [[0, 0], [dur * 0.35, L * 0.11], [dur, 0]]), out);
  }
  function tick(v = 1) {
    if (!live()) return; used();
    const t = ctx.currentTime, r = jitter(0.12);
    chain(osc('sine', 2150 * r, t, 0.02), gain(t, [[0, LEVEL.tick * v], [0.018, 0]]), out);
    chain(hiss(t, 0.012), filter('highpass', 3000), gain(t, [[0, LEVEL.tick * 0.9 * v], [0.01, 0]]), out);
  }
  // plastic landing on plastic: a splinter of noise, a body of partials that do not agree, a knock under them
  function clack(v = 1) {
    if (!live()) return; used();
    const t = ctx.currentTime, r = jitter(0.1), L = LEVEL.clack * v;
    chain(hiss(t, 0.03), filter('highpass', 2400), gain(t, [[0, L], [0.022, 0]]), out);
    for (const [f, a, d] of [[1180, 0.64, 0.045], [1890, 0.4, 0.03], [3100, 0.16, 0.018]]) chain(osc('sine', f * r, t, d), gain(t, [[0, L * a], [d, 0]]), out);
    const k = osc('sine', 210 * r, t, 0.07);
    k.frequency.exponentialRampToValueAtTime(120, t + 0.06);
    chain(k, gain(t, [[0, L * 0.8], [0.07, 0]]), out);
  }
  // something with weight coming to rest. The sine that drops is for headphones; a phone's speaker hears the
  // triangle over it, the knock of noise and the short crack at the front
  function thump(v = 1) {
    if (!live()) return; used();
    const t = ctx.currentTime, L = LEVEL.thump * v;
    const o = osc('sine', 150, t, 0.3);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
    chain(o, gain(t, [[0, 0], [0.006, L * 0.4], [0.28, 0]]), out);
    const h = osc('triangle', 440, t, 0.16);
    h.frequency.exponentialRampToValueAtTime(150, t + 0.09);
    chain(h, gain(t, [[0, L * 0.9], [0.15, 0]]), out);
    chain(hiss(t, 0.09), filter('bandpass', 620, 0.8), gain(t, [[0, L * 1.6], [0.08, 0]]), out);
    chain(hiss(t, 0.02), filter('highpass', 1800), gain(t, [[0, L * 0.3], [0.012, 0]]), out);
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
    if (v > 0.02) { used(); wind.quiet = 0; }
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
    if (k > 0) { used(); charge.quiet = 0; }
    else if (!charge.quiet) charge.quiet = performance.now();
    else if (performance.now() - charge.quiet > 300) {
      for (const { o } of charge.oscs) { try { o.stop(); } catch { /* already stopped */ } }
      try { charge.lfo.stop(); } catch { /* already stopped */ }
      charge.g.disconnect(); charge = null; chargeAt = 0;
    }
  }
  function setWobble(on) {                                // the puzzle is scrambling or solving itself
    if (on) {
      if (wobble || !live()) return; used();
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

  return {
    wake,
    /**
     * The loading is over. A browser only lets this be heard if the page has been touched by then (the install
     * screen's button, or a tap while it loads) or, on Android, if the app is installed. Otherwise it is skipped:
     * it is never kept for later, when it would sound out of place.
     */
    ready() {
      if (given) { phrase(bolololipipob(), 'keys'); return; }
      wake(false);
      if (!ctx || dead) return;
      const asked0 = performance.now();
      const go = () => { if (!dead && ctx.state === 'running' && performance.now() - asked0 < 700) phrase(bolololipipob(), 'keys'); };
      if (ctx.state === 'running') go(); else ctx.resume().then(go).catch(() => {});
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
    /** One turn of a scramble or a solve. */
    step() { clack(0.6); },
    /** The whole puzzle lands on a face. */
    flip() { clack(0.7); thump(0.45); },
    /** A quarter passes under a free spin. */
    tick() { tick(1); },
    /** The pull that puts it down passes its mark, either way. */
    arm() { tick(0.7); },
    /** A tap on a face sends the puzzle round. */
    swish() { if (live()) { used(); whoosh(700, 2000, 0.2, LEVEL.whoosh * 0.6); } },
    /** Something with weight sent flying (the clock into the iMac's screen): a long, falling swoosh. */
    swoosh() { if (live()) { used(); whoosh(1800, 420, 0.42, LEVEL.whoosh * 0.75, 1.1); } },
    /** It lands: bo-lup, low then up, in the keys, and a soft thump under it for the weight. */
    bolup() { phrase([[SCALE[1], 0, 'round'], [SCALE[6], loose(0.075), 'bright']], 'keys', 1.1); thump(0.35); },
    /** The time merging into the screen: a quick 8-bit run, square waves stepping up, as an old machine takes a score. */
    merge(after = 0) {
      if (!live()) return; used();
      const t0 = ctx.currentTime + 0.005 + after, bus = filter('lowpass', 5200, 0.7);
      bus.connect(out);
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
        const t = t0 + i * 0.032;
        chain(osc('square', f, t, 0.05), gain(t, [[0, 0], [0.003, LEVEL.blip * 0.3], [0.034, LEVEL.blip * 0.2], [0.05, 0]]), bus);
      });
    },
    /** A puzzle solved by hand: bi-li-li-li-lo-lu-li-lup, up, a little back down, and up to the top, in the puzzle's own voice. */
    cheer(puzzle) {
      const at = [0, 0.07, 0.14, 0.21, 0.3, 0.37, 0.45, 0.56], idx = [5, 7, 8, 9, 6, 5, 8, 10];
      const kinds = ['round', 'bright', 'bright', 'bright', 'round', 'round', 'bright', 'bright'];
      phrase(idx.map((k, i) => [SCALE[k], loose(at[i]), kinds[i]]), voiceOf(puzzle), 1.15);
    },
    wind: setWind,
    charge: setCharge,
    /** The scramble or the solve starts (true) and ends (false). */
    wobble(on) { const was = !!wobble; setWobble(on); if (!on && was) thump(0.6); },
    /** Let go of everything that lasts, without a sound: the room is being taken down. */
    quiet() { setWobble(false); setWind(0); setCharge(0); },
    dispose() {
      dead = true;
      if (sleepTimer) clearInterval(sleepTimer);
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
}
