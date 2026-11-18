import { animate, motionValue, type MotionValue } from "motion/react";
import { categoryName, categoryOrder, type Category, type Edition, type Indicator, type Note, type Subject } from "@/data/noticss/types";

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

export type Card =
  | { type: "subject"; id: string; subject: Subject }
  | { type: "note"; id: string; subject: Subject; note: Note }
  | { type: "figures"; id: string; indicators: Indicator[] };

export type SectionDef = { id: string; name: string; kind: "hoy" | Category; lead?: Subject; cards: Card[] };

/** Media a card shows at its top: photos today, vertical shorts later. */
export type Media = { card: number; kind: "image"; src: string; alt: string; kicker: string; title: string; credit: string | null };

const storyCards = (prefix: string, subs: Subject[]) =>
  subs.flatMap((s): Card[] => [
    { type: "subject", id: `${prefix}-${s.id}`, subject: s },
    ...s.notes.map((n): Card => ({ type: "note", id: `${prefix}-${n.id}`, subject: s, note: n })),
  ]);

export function sectionsOf(ed: Edition): SectionDef[] {
  // Hoy is the whole edition in reading order; the others are its sections.
  const hoy: SectionDef = {
    id: "hoy",
    name: "Hoy",
    kind: "hoy",
    cards: [...storyCards("hoy", ed.subjects), { type: "figures", id: "hoy-cifras", indicators: ed.indicators }],
  };
  const cats = categoryOrder
    .map((c): SectionDef | null => {
      const subs = ed.subjects.filter((s) => s.category === c);
      if (!subs.length) return null;
      return { id: c, name: categoryName[c], kind: c, lead: subs.find((s) => s.image) ?? subs[0], cards: storyCards(c, subs) };
    })
    .filter(Boolean) as SectionDef[];
  return [hoy, ...cats];
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

  stopAll() {
    this.p.stop();
    this.posC.stop();
    this.cur.stop();
    this.ox.stop();
  }
}
