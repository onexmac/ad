/**
 * Geometry and springs for image flights: an image that travels between its
 * place in the layout and an open position (the detail hero, or the lifted
 * peek). Everything is driven by our own motion values, Histok-style, so a
 * finger can hand off to a spring mid-flight and back.
 */

export type Rect = { x: number; y: number; w: number; h: number };

/** Visual box, transforms included. */
export function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/**
 * The element's on-screen box without its own transform's scale (a press
 * scale), but with its ancestors' (a scroll-rise or a strip card scale): where
 * the picture really sits once the press lets go.
 */
export function layoutRectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  let own = 1;
  const t = getComputedStyle(el).transform;
  if (t && t !== "none") {
    const m = new DOMMatrixReadOnly(t);
    own = Math.hypot(m.a, m.b) || 1;
  }
  const w = r.width / own;
  const h = r.height / own;
  return { x: r.left + r.width / 2 - w / 2, y: r.top + r.height / 2 - h / 2, w, h };
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function viewport(): Rect {
  return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
}

/**
 * The part of the screen the page shows through: below any sticky header and
 * above the floating bottom bar (elements marked data-updatr-chrome).
 */
export function openArea(): Rect {
  const vh = window.innerHeight;
  let top = 0;
  let bottom = vh;
  for (const el of document.querySelectorAll<HTMLElement>("[data-updatr-chrome]")) {
    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.bottom <= 0 || r.top >= vh) continue;
    // A small corner piece (the folded home square) hides too little to count.
    if (r.width < window.innerWidth * 0.5) continue;
    if (el.dataset.updatrChrome === "top") top = Math.max(top, r.bottom);
    else bottom = Math.min(bottom, r.top);
  }
  return { x: 0, y: top, w: window.innerWidth, h: Math.max(0, bottom - top) };
}

/** Share of the rect inside an area (the viewport by default), 0..1. */
export function visibleFraction(r: Rect, area?: Rect) {
  if (typeof window === "undefined" || r.w <= 0 || r.h <= 0) return 0;
  const a = area ?? viewport();
  const w = Math.max(0, Math.min(r.x + r.w, a.x + a.w) - Math.max(r.x, a.x));
  const h = Math.max(0, Math.min(r.y + r.h, a.y + a.h) - Math.max(r.y, a.y));
  return (w * h) / (r.w * r.h);
}

/** Product of the opacities of an element and its ancestors. */
export function opacityOf(el: Element | null) {
  let o = 1;
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const v = parseFloat(getComputedStyle(n).opacity);
    if (!Number.isNaN(v)) o *= v;
  }
  return o;
}

/** Release velocity, zeroed if the finger rested before letting go. */
export function freshVelocity(v: number, lastSampleAt: number, now = performance.now()) {
  return now - lastSampleAt < 80 ? v : 0;
}

/** Rect of the given aspect (w/h), centred, inside the viewport's comfort zone. */
export function centredRect(aspect: number, maxWFrac = 0.88, maxWpx = 460, maxHFrac = 0.6): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let w = Math.min(vw * maxWFrac, maxWpx);
  let h = w / aspect;
  if (h > vh * maxHFrac) {
    h = vh * maxHFrac;
    w = h * aspect;
  }
  return { x: (vw - w) / 2, y: (vh - h) / 2 - vh * 0.04, w, h };
}

export function findFlightSource(key: string | undefined): HTMLElement | null {
  if (!key || typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`[data-flight-key="${CSS.escape(key)}"]`);
}

// Histok's navigation springs (components/histok/IndexScreen.tsx): open with a
// little overshoot, close settled, cancel quick.
export const OPEN_SPRING = { type: "spring" as const, stiffness: 120, damping: 18, mass: 1 };
export const CLOSE_SPRING = { type: "spring" as const, stiffness: 150, damping: 22, mass: 1 };
export const CANCEL_SPRING = { type: "spring" as const, stiffness: 210, damping: 26, mass: 1 };

/** Resisted travel toward an asymptote: grips the finger instead of slipping. */
export function resist(d: number, max: number) {
  const s = Math.sign(d);
  return s * max * (1 - Math.exp(-Math.abs(d) / max));
}

/** Finger travel that gives this resisted offset (inverse of resist, d >= 0). */
export function unresist(y: number, max: number) {
  const q = Math.max(0, Math.min(0.999, y / max));
  return -max * Math.log(1 - q);
}

/** Histok back-swipe progress: rubber band that resists harder the further you pull. */
export function swipeProgress(dx: number, width: number) {
  const w = width || 400;
  return Math.max(0, Math.min(1, (w * (1 - Math.exp((-Math.max(0, dx) * 1.3) / w))) / w));
}

/** Finger travel that gives this swipe progress (inverse of swipeProgress). */
export function swipeDistance(p: number, width: number) {
  const w = width || 400;
  const q = Math.max(0, Math.min(0.999, p));
  return (-w / 1.3) * Math.log(1 - q);
}

export const AXIS_LOCK = 10;
export const BACK_COMMIT = 0.34;
