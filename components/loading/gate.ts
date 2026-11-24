/**
 * What the two loading gates share (SkeletonGate, BarGate): how the app is held hidden while it loads, how
 * readiness is decided, and the spring curves.
 *
 * A gate is rendered by the app's page beside its content, so both are children of <body>. While it holds, every
 * other child of <body> is transparent and takes no touches; a CSS fallback shows them anyway after a while, so a
 * page whose script never runs is never left blank.
 */

/** Every child of <body> but the gate: the app. */
export const APP = "body > :not([data-skeleton-gate])";

/** Hidden while held; shown after `seconds` whatever happens. */
export const hold = (seconds: number) => `${APP}{animation:skel-hold ${seconds}s step-end both}`;
/** The app fades in. */
export const REVEAL_MS = 520;
export const REVEAL = `${APP}{animation:skel-reveal ${REVEAL_MS}ms cubic-bezier(.22,.8,.3,1) both}`;
/** The app is shown at once: an opaque layer over it (a shell, the bar's ground) fades instead. */
export const REVEAL_UNDER = `${APP}{animation:none}`;
/** With scripting off there is nothing to wait for. */
export const NOSCRIPT = `[data-skeleton-gate]{display:none!important}${APP}{animation:none!important}`;
/** The keyframes the rules above use; each gate puts them in its own stylesheet. */
export const HOLD_KEYFRAMES = `
@keyframes skel-hold{from{opacity:0;pointer-events:none}to{opacity:1;pointer-events:auto}}
@keyframes skel-reveal{from{opacity:0}to{opacity:1}}
@keyframes skel-gone{to{visibility:hidden}}`;

/** Before this, a load is quick enough to show nothing: the app just fades in. */
export const WAIT = 140; // ms

// Springs as CSS easings: an underdamped step response, sampled (damping ratio 0.5 coming in, 0.62 going out).
export const SPRING_IN =
  "linear(0, 0.037, 0.133, 0.266, 0.417, 0.573, 0.719, 0.849, 0.958, 1.042, 1.103, 1.141, 1.16, 1.162, 1.153, 1.135, 1.112, 1.087, 1.062, 1.039, 1.019, 1.002, 0.99, 0.981, 0.976, 0.974, 0.974, 0.976, 1)";
export const SPRING_OUT =
  "linear(0, 0.024, 0.087, 0.176, 0.281, 0.393, 0.505, 0.612, 0.71, 0.797, 0.872, 0.934, 0.984, 1.022, 1.05, 1.068, 1.079, 1.083, 1.083, 1.079, 1.072, 1.063, 1.054, 1.045, 1.036, 1.027, 1.02, 1.013, 1)";
/** For browsers without linear(): a back-out curve, still a little overshoot. */
export const BACK = "cubic-bezier(0.34, 1.4, 0.64, 1)";

export const later = (ms: number, timers: number[]) =>
  new Promise<void>((r) => timers.push(window.setTimeout(r, ms)));
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** How far along a CSS animation on `el` is, in ms (its clock includes its delay); Infinity if it can't tell. */
export function clock(el: Element | null | undefined, name: string) {
  const a = el?.getAnimations?.().find((x) => (x as CSSAnimation).animationName === name);
  return a ? Number(a.currentTime ?? 0) : Infinity;
}

/**
 * Wait until the app is ready: hydrated (this runs from an effect, so it is), its fonts in, and the pictures of
 * its first screen loaded, or `cap` ms, whichever comes first. `progress` hears 0 to 1 as they come in.
 */
export async function appReady(gate: HTMLElement | null, cap: number, timers: number[], progress?: (p: number) => void) {
  // Two frames: the app's own first effects may put its pictures in.
  await frame();
  await frame();
  const pictures = Array.from(document.images).filter((img) => {
    if (gate?.contains(img) || img.complete) return false;
    const r = img.getBoundingClientRect(); // laid out, only transparent, so it has its place
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  });
  const total = pictures.length + 1;
  let done = 0;
  const tick = () => progress?.(++done / total);
  const loaded = (img: HTMLImageElement) =>
    new Promise<void>((r) => {
      img.addEventListener("load", () => r(), { once: true });
      img.addEventListener("error", () => r(), { once: true });
    }).then(tick);
  const fonts = (document.fonts?.ready ?? Promise.resolve()).then(tick);
  await Promise.race([Promise.all([fonts, ...pictures.map(loaded)]), later(cap, timers)]);
  await frame();
}

/** Has the CSS fallback already shown the page (the script came that late)? */
export const fellBack = (gate: HTMLElement | null) => !!gate && getComputedStyle(gate).visibility === "hidden";
