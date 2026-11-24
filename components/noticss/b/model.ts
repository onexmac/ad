import { animate, motionValue, type MotionValue } from "motion/react";
import { categoryName, categoryOrder, type Category, type Edition, type Indicator, type Note, type Subject } from "@/data/noticss/types";

/** iOS's deceleration: a fling travels about half a second's worth of its speed. */
export const GLIDE = { power: 0.5 };
/** The thread between cards when one is lifted: each follows the one before it this tightly. */
const LINK = { k: Math.pow((2 * Math.PI) / 0.22, 2), c: 2 * 0.86 * ((2 * Math.PI) / 0.22) };

/*
 * Version B's geometry and physics, in one place.
 *
 * The tray is one row of full-size pages, scaled down. Every page is W x H and
 * sits at i * (W + G) inside the row; the row is transformed (translate +
 * scale) so a card is S of the screen on the tray and the whole screen open.
 * Because the corner radius lives in the page's own pixels, it scales with
 * the page: small on the tray, the phone's own corner when open.
 */

/** Tray scale: a card is this share of the screen. */
export const S = 0.4;
/** Gap between pages in page pixels: 5.6 px on the tray, 14 px open. */
export const G = 14;
/** Corner radius in page pixels: 17.6 px on the tray, 44 px open (the phone's corner). */
export const RU = 44;
/** Tray inset from the left edge and from the bottom (screen px). */
export const PAD = 14;
export const BOTTOM = 16;

export type SpringOpts = {
  type: "spring";
  stiffness: number;
  damping: number;
  mass?: number;
  velocity?: number;
  restDelta?: number;
  restSpeed?: number;
};

/** Springs as response (s) and damping ratio, the way iOS describes them. */
const spring = (response: number, ratio: number): SpringOpts => {
  const k = Math.pow((2 * Math.PI) / response, 2);
  return { type: "spring" as const, stiffness: k, damping: 2 * ratio * Math.sqrt(k), mass: 1 };
};
export const EXPAND = spring(0.5, 0.86);
export const COLLAPSE = spring(0.44, 0.92);
export const PAGE = spring(0.4, 1);
export const TRAY = spring(0.46, 1);
export const SECTION = spring(0.48, 1);
export const POP = spring(0.46, 0.8);
export const SETTLE = spring(0.36, 1);
/** A slow flick's landing on its card. */
const SNAP = spring(0.42, 1);

/** iOS rubber band: travel past an edge, felt through resistance. */
export const rubber = (over: number, dim: number, c = 0.55) => {
  const s = Math.sign(over);
  const x = Math.abs(over);
  return s * (1 - 1 / ((x * c) / dim + 1)) * dim;
};

/** Pushing on past the end of a page: lift with friction, commit past the mark. */
export const END_LIFT_MAX = 200;
export const END_COMMIT = 120;
export const endLiftOf = (raw: number) => END_LIFT_MAX * (1 - Math.exp((-Math.max(0, raw) * 0.6) / END_LIFT_MAX));

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ---------- content ---------- */

/**
 * A story card; `from` is set when it comes from an earlier edition (a
 * followed topic, or a suggestion from the archive); `suggested` when the
 * reader's taste picked it, with the reason to show (null: to explore).
 */
export type Suggested = { reason: string | null };
export type Card =
  | { type: "subject"; id: string; subject: Subject; from?: Edition; suggested?: Suggested; more?: { count: number; section: string } }
  | { type: "note"; id: string; subject: Subject; note: Note; from?: Edition; suggested?: Suggested }
  | { type: "figures"; id: string; indicators: Indicator[] };

export type SectionDef = {
  id: string;
  name: string;
  kind: "hoy" | Category | "siguiendo";
  lead?: Subject;
  cards: Card[];
  /** Siguiendo: how many followed topics are in today's edition, and how many only in earlier ones. */
  current?: number;
  previous?: number;
};

/** Media a card shows at its top: photos today, vertical shorts later. */
export type Media = { card: number; kind: "image"; src: string; alt: string; kicker: string; title: string; credit: string | null };

const storyCards = (prefix: string, subs: Subject[], from?: Edition, suggested?: Suggested, notes = Infinity) =>
  subs.flatMap((whole): Card[] => {
    // A suggestion brings its first notes; its page lists only those.
    const s = whole.notes.length > notes ? { ...whole, notes: whole.notes.slice(0, notes) } : whole;
    return [
      { type: "subject", id: `${prefix}-${s.id}`, subject: s, from, suggested },
      ...s.notes.map((n): Card => ({ type: "note", id: `${prefix}-${n.id}`, subject: s, note: n, from, suggested })),
    ];
  });

/* ---------- suggestions ---------- */

/** The share of every section's cards the reader's taste picks. */
export const SUGGESTED_SHARE = 0.3;
/** On Hoy a storyline is a highlight: its synopsis and this many of its notes. */
const HOY_NOTES = 1;
/** A suggested storyline brings its first notes, not all of them. */
const SUGGESTED_NOTES = 2;

/** What ranks a candidate: the taste model's view of its features. */
export type Taste = {
  chance: (features: string[]) => number;
  novelty: (features: string[]) => number;
  reasonOf: (features: string[]) => string | null;
  features: (s: Subject) => string[];
  /** Storylines the reader turned down, never suggested again. */
  disliked: (s: Subject) => boolean;
  /** Storylines already opened, suggested only after the rest. */
  seen: (s: Subject) => boolean;
};

type Candidate = { subject: Subject; from?: Edition; score: number; reason: string | null };

/**
 * Every storyline the reader could be shown instead: this edition's pool, then
 * earlier editions' storylines and pools, minus what today already carries.
 * Scored by taste (the chance of a like, a bonus for the unexplored, a touch
 * of the editors' importance), older ones discounted.
 */
function candidatesOf(ed: Edition, editions: Edition[], taste?: Taste): Candidate[] {
  const today = new Set(ed.subjects.map((s) => s.id));
  const taken = new Set<string>();
  const out: Candidate[] = [];
  const older = editions.filter((e) => e !== ed && (e.date < ed.date || (e.date === ed.date && e.number < ed.number)));
  const sources: { list: Subject[]; from?: Edition; age: number }[] = [
    { list: ed.suggestions, age: 0 },
    ...older.slice(0, 6).map((e, i) => ({ list: [...e.subjects, ...e.suggestions], from: e, age: i + 1 })),
  ];
  for (const { list, from, age } of sources) {
    for (const s of list) {
      if (today.has(s.id) || taken.has(s.id)) continue;
      if (taste?.disliked(s)) continue;
      taken.add(s.id);
      const f = taste?.features(s) ?? [];
      const like = taste ? taste.chance(f) : 0.5;
      const explore = taste ? 0.22 * taste.novelty(f) : 0;
      const score = like + explore + 0.04 * s.importance - 0.06 * age - (taste?.seen(s) ? 0.3 : 0);
      out.push({ subject: s, from, score, reason: taste ? taste.reasonOf(f) : null });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Mixes suggestions into a section's own storylines so they make about
 * SUGGESTED_SHARE of its cards. The section opens on its own lead; the
 * suggestions are spread between its storylines, not piled at the end.
 */
function withSuggestions(prefix: string, blocks: Card[][], pool: Candidate[], tail: Card[] = []): Card[] {
  const ownCount = blocks.reduce((n, b) => n + b.length, 0) + tail.length;
  const picks: Card[][] = [];
  let added = 0;
  const off = (n: number) => Math.abs(n / (ownCount + n) - SUGGESTED_SHARE);
  for (const c of pool) {
    if (!ownCount || added / (ownCount + added) >= SUGGESTED_SHARE) break;
    // The storyline and as many of its notes as bring the share closest to the mark.
    let best = -1;
    for (let notes = 0; notes <= SUGGESTED_NOTES; notes++) {
      const size = 1 + Math.min(notes, c.subject.notes.length);
      if (off(added + size) < off(best < 0 ? added : added + 1 + Math.min(best, c.subject.notes.length))) best = notes;
    }
    if (best < 0) break;
    const block = storyCards(`${prefix}-sug${c.from ? `-${c.from.number}` : ""}`, [c.subject], c.from, { reason: c.reason }, best);
    picks.push(block);
    added += block.length;
  }
  if (!picks.length) return [...blocks.flat(), ...tail];
  // Spread evenly between the section's own storylines, never before its lead:
  // the k-th suggestion comes after round((k + 1) * B / (P + 1)) of them.
  const out: Card[] = [];
  const after = picks.map((_, k) => Math.max(1, Math.round(((k + 1) * blocks.length) / (picks.length + 1))));
  let p = 0;
  blocks.forEach((b, i) => {
    out.push(...b);
    while (p < picks.length && after[p] === i + 1) out.push(...picks[p++]);
  });
  while (p < picks.length) out.push(...picks[p++]);
  return [...out, ...tail];
}

/**
 * Followed topics, newest follow first: today's version of each storyline
 * when today's edition carries it, else its latest earlier version.
 */
function followingOf(ed: Edition, editions: Edition[], follows: string[], pool: Candidate[] = []): SectionDef {
  const older = editions.filter((e) => e.date < ed.date || (e.date === ed.date && e.number < ed.number)).sort((a, b) => b.number - a.number);
  const blocks: Card[][] = [];
  let current = 0;
  let previous = 0;
  for (const id of follows) {
    const now = ed.subjects.find((s) => s.id === id);
    if (now) {
      current++;
      blocks.push(storyCards("sig", [now]));
      continue;
    }
    const before = older.find((e) => e.subjects.some((s) => s.id === id));
    const s = before?.subjects.find((x) => x.id === id);
    if (before && s) {
      previous++;
      blocks.push(storyCards(`sig-${before.number}`, [s], before));
    }
  }
  // Once something is followed, a share of the section is what the reader
  // may want to follow next (the follows themselves teach the taste model).
  const followed = new Set(follows);
  const cards = blocks.length ? withSuggestions("sig", blocks, pool.filter((c) => !followed.has(c.subject.id))) : [];
  return { id: "siguiendo", name: "Siguiendo", kind: "siguiendo", cards, current, previous };
}

export function sectionsOf(ed: Edition, editions: Edition[] = [ed], follows: string[] = [], taste?: Taste): SectionDef[] {
  const pool = candidatesOf(ed, editions, taste);
  // Each storyline is suggested in one place only: Hoy takes the best, each
  // section the best of its own lens that Hoy did not take.
  const used = new Set<string>();
  const take = (list: Candidate[]) => list.filter((c) => !used.has(c.subject.id));
  const mark = (cards: Card[]) => cards.forEach((c) => c.type !== "figures" && c.suggested && used.add(c.subject.id));

  // Hoy is the front page, in highlights: the most important storyline of
  // each lens, most important first, each as its synopsis and its single most
  // important note, then the day's figures. The rest of those storylines'
  // notes stay in their own sections (nothing is shown twice, nothing lost).
  const order = (a: Subject, b: Subject) => b.importance - a.importance || ed.subjects.indexOf(a) - ed.subjects.indexOf(b);
  const front = categoryOrder
    .map((c) => ed.subjects.filter((s) => s.category === c).sort(order)[0])
    .filter((s): s is Subject => !!s)
    .sort(order);
  const onFront = new Set(front.map((s) => s.id));
  const top = (s: Subject) => [...s.notes].sort((a, b) => b.importance - a.importance || s.notes.indexOf(a) - s.notes.indexOf(b)).slice(0, HOY_NOTES);
  const highlight = (s: Subject): Card[] => {
    const notes = top(s);
    const rest = s.notes.length - notes.length;
    const brief: Subject = { ...s, notes };
    return [
      { type: "subject", id: `hoy-${s.id}`, subject: brief, more: rest ? { count: rest, section: categoryName[s.category] } : undefined },
      ...notes.map((n): Card => ({ type: "note", id: `hoy-${n.id}`, subject: s, note: n })),
    ];
  };
  const hoyCards = withSuggestions("hoy", front.map(highlight), take(pool), [{ type: "figures", id: "hoy-cifras", indicators: ed.indicators }]);
  mark(hoyCards);
  const hoy: SectionDef = { id: "hoy", name: "Hoy", kind: "hoy", cards: hoyCards };
  const cats = categoryOrder
    .map((c): SectionDef | null => {
      const all = ed.subjects.filter((s) => s.category === c);
      // A storyline on the front page carries on here with its other notes.
      const blocks = all
        .map((s): Card[] => {
          if (!onFront.has(s.id)) return storyCards(c, [s]);
          const shown = new Set(top(s).map((n) => n.id));
          return s.notes.filter((n) => !shown.has(n.id)).map((n): Card => ({ type: "note", id: `${c}-${n.id}`, subject: s, note: n }));
        })
        .filter((b) => b.length);
      if (!blocks.length) return null;
      const own = take(pool).filter((x) => x.subject.category === c);
      const cards = withSuggestions(c, blocks, own.length ? own : pool.filter((x) => x.subject.category === c));
      mark(cards);
      const lead = all.find((s) => !onFront.has(s.id) && s.image) ?? all.find((s) => s.image) ?? all[0];
      return { id: c, name: categoryName[c], kind: c, lead, cards };
    })
    .filter(Boolean) as SectionDef[];
  return [hoy, ...cats, followingOf(ed, editions, follows, take(pool))];
}

export function mediaOf(section: SectionDef): Media[] {
  const out: Media[] = [];
  section.cards.forEach((c, i) => {
    if (c.type === "subject" && c.subject.image)
      out.push({ card: i, kind: "image", src: c.subject.image.src, alt: c.subject.image.alt, kicker: categoryName[c.subject.category], title: c.subject.title, credit: c.subject.image.credit });
    if (c.type === "note" && c.note.image)
      out.push({ card: i, kind: "image", src: c.note.image.src, alt: c.note.image.alt, kicker: categoryName[c.subject.category], title: c.note.headline, credit: c.note.image.credit });
  });
  return out;
}

/* ---------- motion state ---------- */

/** A page's visual override: lets a page arrive from anywhere while the row's logic jumps underneath. */
export type Override = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  s: MotionValue<number>;
  o: MotionValue<number>;
  z: MotionValue<number>;
  /** Bottom inset of a clip (page px), for a page growing out of a row. */
  clip: MotionValue<number>;
};

/** A transition carried by overrides: it can always be finished at once. */
export type Transition = { finish: () => void; anims: { stop: () => void }[] };

export class Tray {
  /** Values counted in fractions or cards, not pixels: they settle finely. */
  private unitless = new WeakSet<MotionValue<number>>();
  private frac(v: MotionValue<number>) {
    this.unitless.add(v);
    return v;
  }
  /** 0 on the tray, 1 open. */
  p = this.frac(motionValue(0));
  /** Tray scroll, in cards. */
  posC = this.frac(motionValue(0));
  /** The page in view (or being lifted): float while paging. */
  cur = this.frac(motionValue(0));
  /** The finger's sideways drift while lifting (screen px), and which point of the card grows (0..1). */
  ox = motionValue(0);
  fx = this.frac(motionValue(0.5));
  /** The override transition in flight, if any. */
  private pending: Transition | null = null;

  /*
   * The thread. Each card has its own openness; the card in focus is p, and
   * every other card follows its neighbour toward the focus on a stiff
   * spring, so a lifted card leads and the rest come up after it in a
   * cascade. Going down, no card is ever more open than the one before it,
   * so they settle together.
   */
  private links = new Map<number, { v: MotionValue<number>; vel: number }>();
  private count = 0;
  private raf = 0;
  private last = 0;

  constructor() {
    this.p.on("change", () => this.kick());
    this.cur.on("change", () => this.kick());
  }

  setCount(n: number) {
    this.count = n;
  }

  /** Card i's own openness (0 tray, 1 page). */
  pi(i: number) {
    let l = this.links.get(i);
    if (!l) {
      l = { v: motionValue(this.p.get()), vel: 0 };
      this.links.set(i, l);
    }
    return l.v;
  }

  private kick() {
    if (this.raf || typeof window === "undefined") return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.step);
  }

  private step = (now: number) => {
    this.raf = 0;
    const dt = Math.min(1 / 30, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    const n = this.count;
    const a = clamp(Math.round(this.cur.get()), 0, Math.max(0, n - 1));
    const lead = this.p.get();
    let busy = false;
    const self = this.links.get(a);
    if (self) {
      self.v.set(lead);
      self.vel = 0;
    }
    // Outward from the focus, each card chasing the one before it.
    for (const dir of [1, -1]) {
      let prev = lead;
      for (let i = a + dir; i >= 0 && i < n; i += dir) {
        const l = this.links.get(i);
        if (!l) {
          continue;
        }
        // Far from the focus (off screen), a card simply matches its neighbour.
        if (Math.abs(i - a) > 6) {
          l.v.set(prev);
          l.vel = 0;
          continue;
        }
        let x = l.v.get();
        const f = LINK.k * (prev - x) - LINK.c * l.vel;
        l.vel += f * dt;
        x += l.vel * dt;
        // Never more open than the card before it (going down they settle together).
        if (x > prev) {
          x = prev;
          l.vel = Math.min(0, l.vel);
        }
        l.v.set(x);
        if (Math.abs(prev - x) > 0.0005 || Math.abs(l.vel) > 0.005) busy = true;
        prev = x;
      }
    }
    if (busy) {
      this.raf = requestAnimationFrame(this.step);
    }
  };
  private ov = new Map<number, Override>();
  private moving = 0;
  row: HTMLDivElement | null = null;

  /** The row element, so a motion can make it its own layer while it runs. */
  attach(el: HTMLDivElement | null) {
    this.row = el;
  }

  override(i: number): Override {
    let o = this.ov.get(i);
    if (!o) {
      o = {
        x: motionValue(0),
        y: motionValue(0),
        s: this.frac(motionValue(1)),
        o: this.frac(motionValue(1)),
        z: motionValue(0),
        clip: motionValue(0),
      };
      this.ov.set(i, o);
    }
    return o;
  }

  /** Start a transition; any earlier one is finished first (its pages put back). */
  begin(finish: () => void): Transition {
    this.settle();
    const tr: Transition = { finish, anims: [] };
    this.pending = tr;
    return tr;
  }
  isPending(tr: Transition) {
    return this.pending === tr;
  }
  /** The transition's own end (only if it is still the one in flight). */
  complete(tr: Transition) {
    if (this.pending !== tr) return;
    this.pending = null;
    tr.finish();
  }
  /** Finish whatever transition is in flight, now: a new gesture or flow starts. */
  settle() {
    const tr = this.pending;
    if (!tr) return;
    this.pending = null;
    tr.anims.forEach((a) => a.stop());
    tr.finish();
  }

  resetOverride(i: number) {
    const o = this.ov.get(i);
    if (!o) return;
    for (const v of [o.x, o.y, o.clip, o.z]) {
      v.stop();
      v.set(0);
    }
    o.s.stop();
    o.s.set(1);
    o.o.stop();
    o.o.set(1);
  }

  /**
   * While anything moves, the row is its own compositor layer; at rest it is
   * not, so the browser re-draws the text crisp at the size it landed at
   * (a layer kept from the tray would stay rasterised at 40%).
   */
  /** Something on this tray is moving (springs, transitions). */
  get busy() {
    return this.moving > 0;
  }

  hold() {
    this.moving++;
    if (this.row) this.row.style.willChange = "transform";
  }
  release() {
    this.moving = Math.max(0, this.moving - 1);
    if (!this.moving && this.row) this.row.style.willChange = "auto";
  }

  /** animate(), with the layer held for the length of the motion. */
  run(mv: MotionValue<number>, to: number, opts: SpringOpts, done?: () => void) {
    // A motion that changes the row's scale is never drawn from a frozen
    // layer (Chromium would keep the 40% raster and blur the grown text).
    const layer = mv !== this.p;
    if (layer) this.hold();
    let released = !layer;
    const rel = () => {
      if (released) return;
      released = true;
      this.release();
    };
    // Rest tolerance in the value's own units: fractions settle finely, pixels at half a pixel.
    const fine = this.unitless.has(mv) || Math.max(Math.abs(to), Math.abs(mv.get())) <= 2;
    // A spring starts with the velocity it is given (a finger's), never one
    // the value picked up from an instant jump (set) a moment before.
    return animate(mv, to, {
      restDelta: fine ? 0.0005 : 0.5,
      restSpeed: fine ? 0.002 : 2,
      ...opts,
      velocity: opts.velocity ?? 0,
      onComplete: () => {
        rel();
        done?.();
      },
      onStop: rel,
    });
  }

  /**
   * A fling: the value glides on at the finger's speed and decelerates the
   * way iOS scroll views do (exponentially), aimed so it comes to rest
   * exactly on a card. The glide starts at the release velocity, so the hand
   * off from the finger is continuous. A flick too slow to carry, or one
   * pointed away from its card, settles there on a spring instead.
   */
  glide(mv: MotionValue<number>, velocity: number, min: number, max: number) {
    const x0 = mv.get();
    const target = clamp(Math.round(x0 + velocity * GLIDE.power), min, max);
    const amp = target - x0;
    const tau = Math.abs(velocity) > 0.05 && Math.sign(amp) === Math.sign(velocity) ? amp / velocity : 0;
    if (tau < 0.06 || tau > 1.2) return this.run(mv, target, { ...SNAP, velocity });
    const D = 5 * tau;
    const norm = 1 - Math.exp(-5);
    this.hold();
    let released = false;
    const rel = () => {
      if (released) return;
      released = true;
      this.release();
    };
    return animate(mv, target, {
      duration: D,
      ease: (t: number) => (1 - Math.exp(-5 * t)) / norm,
      onComplete: rel,
      onStop: rel,
    });
  }

  stopAll() {
    this.p.stop();
    this.posC.stop();
    this.cur.stop();
    this.ox.stop();
  }
}
