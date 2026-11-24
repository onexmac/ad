/**
 * The walk of Histok's "!": its four pills (BrandPills) take turns as the tall one, down the four and round
 * again. Each dot grows into the "!" as the one before it shrinks back to a dot, on the same spring, so the column
 * keeps its height. The loading screen (components/loading/apps.tsx) runs it for ever in CSS; a tap on the H
 * monogram (BrandMark) runs it twice.
 *
 * Pill k is tall in slot k of four: its clock runs k slots behind the first pill's.
 */
export const PILL = { w: 8, tall: 18, short: 10, gap: 5, dim: 0.3 } as const;
export const WALK_SLOT = 0.4; // s each pill stands tall
export const WALK_SWAP = 0.55; // share of a slot spent handing over
export const WALK_PERIOD = WALK_SLOT * 4; // s for one round

/** Where in a round (0 to 1) a pill starts handing over, and starts taking over. */
const GIVE = 0.25 - WALK_SWAP * 0.25;
const TAKE = 1 - WALK_SWAP * 0.25;

/** One pill's round as Web Animations keyframes; `easing` is the handover's spring. */
export function walkKeyframes(easing: string): Keyframe[] {
  const tall = { height: `${PILL.tall}px`, opacity: 1 };
  const short = { height: `${PILL.short}px`, opacity: PILL.dim };
  return [
    { offset: 0, ...tall },
    { offset: GIVE, ...tall, easing },
    { offset: 0.25, ...short },
    { offset: TAKE, ...short, easing },
    { offset: 1, ...tall },
  ];
}

/** The same round as CSS @keyframes, for the loading screen. */
export function walkCss(name: string, easing: string) {
  const pct = (x: number) => `${+(x * 100).toFixed(2)}%`;
  const tall = `height:${PILL.tall}px;opacity:1`;
  const short = `height:${PILL.short}px;opacity:${PILL.dim}`;
  return `@keyframes ${name}{0%{${tall}}${pct(GIVE)}{${tall};animation-timing-function:${easing}}25%{${short}}${pct(TAKE)}{${short};animation-timing-function:${easing}}100%{${tall}}}`;
}

/** Pill k's place in the round when the first pill's is at 0: the share of a round it is ahead. */
export const walkStart = (k: number) => (k === 0 ? 0 : 1 - k / 4);
