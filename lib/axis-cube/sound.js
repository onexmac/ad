// The Cubes' sounds. Nothing is recorded: every sound is made here, on the spot, with the Web Audio API, so there
// are no files to fetch and none to license.
//
// What is heard, and when (the scene says when; see its calls to `sound.`):
//   bolololip             something is chosen: a puzzle picked up, or the button of the install screen. Four soft
//                         round notes running up, the last one short and bright, with a little room around them
//   bolololipipob         the loading is over and the room appears: the same four, one more bright note above
//                         them, and a round one that comes back down and closes it
//   lolip                 a layer lands on its quarter turn: the last two of those notes, under the clack of
//                         plastic on plastic. Each face of the puzzle has its own pitch, so turning it plays a line
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
// The little phrases. E minor pentatonic again, two octaves over the bass. Each note is [pitch, seconds after
// the first, kind]: 'round' scoops up into its pitch like a drop (bo, lo); 'bright' is short, flicks upward and
// carries a little of its octave (lip, ip); 'closed' comes down onto its pitch, darker and a little longer (ob)
const E4 = 329.63, A4 = 440.0, B4 = 493.88, E5 = 659.26, G5 = 783.99;
const BOLOLOLIP = [[E4, 0, 'round'], [A4, 0.062, 'round'], [B4, 0.124, 'round'], [E5, 0.19, 'bright']];
const BOLOLOLIPIPOB = [...BOLOLOLIP, [G5, 0.275, 'bright'], [E4, 0.365, 'closed']];
// lolip, on a turn: one pitch for each face (E4 G4 A4 B4 D5 E5), and the "lip" a fourth over it, as B to E is
const FACES = [E4, 392.0, A4, B4, 587.33, E5];
const lolip = (f) => [[f, 0, 'round'], [f * 4 / 3, 0.066, 'bright']];
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
    delay.delayTime.value = 0.115; back.gain.value = 0.32; dark.type = 'lowpass'; dark.frequency.value = 2200; wet.gain.value = 0.3;
    room = ctx.createGain();
    room.connect(delay); delay.connect(dark); dark.connect(back); back.connect(delay); dark.connect(wet); wet.connect(out);
    const len = Math.floor(ctx.sampleRate * 2);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx) build();

  // The page's own context is made at the first touch, and woken at every later one: a browser can put it to sleep
  // (in the background, on a call), and it is put to sleep here after a while of silence.
  function wake(touched) {                                // touched is false only for the try made when the loading ends
    if (dead || given) return;
    if (!ctx) {
      if (!AC) return;
      try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* not there: the browser's default */ }
      try { ctx = new AC({ latencyHint: 'interactive' }); build(); } catch { ctx = null; dead = true; return; }
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
  // a phrase of soft notes (see the kinds above), through a gentle lowpass and into the room
  function phrase(notes, v = 1) {
    if (!live()) return; used();
    const t0 = ctx.currentTime, L = LEVEL.blip * v, soft = filter('lowpass', 3400, 0.5);
    soft.connect(out); soft.connect(room);
    for (const [f, at, kind] of notes) {
      const t = t0 + at, dur = kind === 'bright' ? 0.075 : kind === 'closed' ? 0.2 : 0.13;
      const from = kind === 'closed' ? f * 1.19 : f * 0.86, glide = kind === 'closed' ? 0.06 : 0.028;
      const o = osc('sine', from, t, dur);
      o.frequency.exponentialRampToValueAtTime(f, t + glide);
      if (kind === 'bright') o.frequency.exponentialRampToValueAtTime(f * 1.26, t + dur);
      if (kind === 'closed') o.frequency.exponentialRampToValueAtTime(f * 0.94, t + dur);
      chain(o, gain(t, [[0, 0], [0.005, L], [dur, 0]]), soft);
      const body = osc('triangle', from, t, dur);              // a little wood under the sine; more of it in the closing note
      body.frequency.exponentialRampToValueAtTime(f, t + glide);
      chain(body, gain(t, [[0, 0], [0.005, L * (kind === 'closed' ? 0.4 : 0.22)], [dur * 0.7, 0]]), soft);
      if (kind === 'bright') { const hi = osc('sine', f * 2, t, dur); hi.frequency.exponentialRampToValueAtTime(f * 2.52, t + dur); chain(hi, gain(t, [[0, 0], [0.004, L * 0.3], [dur, 0]]), soft); }
    }
  }
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
      if (given) { phrase(BOLOLOLIPIPOB); return; }
      wake(false);
      if (!ctx || dead) return;
      const asked0 = performance.now();
      const go = () => { if (!dead && ctx.state === 'running' && performance.now() - asked0 < 700) phrase(BOLOLOLIPIPOB); };
      if (ctx.state === 'running') go(); else ctx.resume().then(go).catch(() => {});
    },
    /** Something is chosen with a tap that is not a puzzle: the install screen's button. */
    select() { phrase(BOLOLOLIP); },
    /** A puzzle is chosen: it leaves the cushion and the camera goes to it. */
    pick() { phrase(BOLOLOLIP); pan(true, 1.05); },
    /** It is let go, back to its hollow, and the camera rises. */
    drop() { pan(false, 0.8); },
    /** It lands. */
    land() { thump(1); },
    /** A layer lands on a quarter turn. `turned` is false when it only fell back to where it was. */
    turn(key, turned = true) {
      if (!live()) return;
      clack(turned ? 1 : 0.5);
      if (turned) phrase(lolip(FACES[((key % FACES.length) + FACES.length) % FACES.length]), 0.8);
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
      if (ctx && !given) { try { ctx.close(); } catch { /* already closed */ } }
    },
  };
}
