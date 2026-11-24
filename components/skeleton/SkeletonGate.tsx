"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Skeleton loading for an app that has none of its own.
 *
 * The app's page renders the gate beside its content: `<><App /><SkeletonGate>…bones…</SkeletonGate></>`.
 * Until the app is ready, everything else on the page is hidden, and if that takes more than a moment the
 * skeleton's bones spring in one by one. When the app is ready (hydrated, its fonts in, and the pictures in
 * its first screen loaded, or after a cap) the bones spring out at random and the app fades in under them.
 *
 * It is plain markup and CSS until it hydrates, so the skeleton is there from the first paint. A load that is
 * ready before the bones would show never shows them: the app just fades in. If the script never runs, the
 * page shows itself after a few seconds anyway (and at once with scripting off).
 *
 * Bones take the app's own tokens: the gate's `className` sets `--skel-bone` (a bone's colour) and
 * `--skel-sheen` (the light that sweeps across it).
 *
 * A skeleton can stand on a shell (`.skel-shell`, with `shell` on the gate): an opaque surface the bones sit on,
 * like Puncheo's frame. The gate is on top of the app, so with a shell the app is shown at once underneath and
 * the shell fades away over it, the bones springing out on top: a cross-fade with no dip.
 */

/** Before this, a load is quick enough to skip the skeleton. */
const WAIT = 140; // ms
const STEP = 45; // ms between bones coming in
/** A bone that has shown stays at least this long before it goes. */
const MIN_SHOWN = 380; // ms
/** Never hold the app back longer than this for its pictures and fonts. */
const CAP = 2500; // ms
const OUT_STEP = 26; // ms between bones going out
const OUT_TIME = 460; // ms a bone takes to go
const REVEAL_TIME = 520; // ms the app takes to fade in

// Springs as CSS easings: an underdamped step response, sampled (ratio 0.5 coming in, 0.62 going out).
const SPRING_IN =
  "linear(0, 0.037, 0.133, 0.266, 0.417, 0.573, 0.719, 0.849, 0.958, 1.042, 1.103, 1.141, 1.16, 1.162, 1.153, 1.135, 1.112, 1.087, 1.062, 1.039, 1.019, 1.002, 0.99, 0.981, 0.976, 0.974, 0.974, 0.976, 1)";
const SPRING_OUT =
  "linear(0, 0.024, 0.087, 0.176, 0.281, 0.393, 0.505, 0.612, 0.71, 0.797, 0.872, 0.934, 0.984, 1.022, 1.05, 1.068, 1.079, 1.083, 1.083, 1.079, 1.072, 1.063, 1.054, 1.045, 1.036, 1.027, 1.02, 1.013, 1)";
// Browsers without linear() keep a back-out curve: still a little overshoot.
const BACK = "cubic-bezier(0.34, 1.4, 0.64, 1)";

const APP = "body > :not([data-skeleton-gate])";

const BASE = `
[data-skeleton-gate]{position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden;
  animation:skel-gone 0s 6s both}
.skel-bone{display:block;background-color:var(--skel-bone);
  background-image:linear-gradient(100deg,transparent 30%,var(--skel-sheen,transparent) 50%,transparent 70%);
  background-size:240% 100%;
  animation:skel-in-fade 260ms cubic-bezier(.2,.8,.3,1) calc(${WAIT}ms + var(--i,0) * ${STEP}ms) both,
    skel-in-scale 640ms ${BACK} calc(${WAIT}ms + var(--i,0) * ${STEP}ms) both,
    skel-sheen 1.3s linear infinite}
@supports (animation-timing-function: linear(0, 1)){
  .skel-bone{animation-timing-function:cubic-bezier(.2,.8,.3,1),${SPRING_IN},linear}}
.skel-out .skel-bone{
  animation:skel-out-scale ${OUT_TIME}ms ${BACK} calc(var(--o,0) * ${OUT_STEP}ms) both,
    skel-out-fade 220ms cubic-bezier(.4,0,.9,.6) calc(var(--o,0) * ${OUT_STEP}ms + 60ms) both}
@supports (animation-timing-function: linear(0, 1)){
  .skel-out .skel-bone{animation-timing-function:${SPRING_OUT},cubic-bezier(.4,0,.9,.6)}}
.skel-skip .skel-bone,.skel-out .skel-bone[data-unseen]{display:none}
.skel-out .skel-shell,.skel-skip .skel-shell{animation:skel-out-fade 300ms cubic-bezier(.4,0,.6,1) 90ms both}
@keyframes skel-in-fade{from{opacity:0}to{opacity:1}}
@keyframes skel-in-scale{from{transform:scale(.9)}to{transform:scale(1)}}
@keyframes skel-out-scale{from{transform:scale(1)}to{transform:scale(.8)}}
@keyframes skel-out-fade{from{opacity:1}to{opacity:0}}
@keyframes skel-sheen{from{background-position:120% 0}to{background-position:-20% 0}}
@keyframes skel-gone{to{visibility:hidden}}
@keyframes skel-hold{from{opacity:0;pointer-events:none}to{opacity:1;pointer-events:auto}}
@keyframes skel-reveal{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion: reduce){
  .skel-bone,.skel-out .skel-bone{animation-duration:1ms;animation-delay:${WAIT}ms}}
`;
// Hidden while held; shown after 6 s whatever happens, so a page whose script fails is never left blank.
const HOLD = `${APP}{animation:skel-hold 6s step-end both}`;
const REVEAL = `${APP}{animation:skel-reveal ${REVEAL_TIME}ms cubic-bezier(.22,.8,.3,1) both}`;
// Under a shell the app shows at once: the shell's own fade is the reveal.
const REVEAL_UNDER_SHELL = `${APP}{animation:none}`;
const NOSCRIPT = `[data-skeleton-gate]{display:none!important}${APP}{animation:none!important}`;

type Phase = "hold" | "reveal" | "done";

export function SkeletonGate({
  className = "",
  shell = false,
  children,
}: {
  className?: string;
  /** The skeleton stands on an opaque `.skel-shell`: the app shows under it at once and the shell fades. */
  shell?: boolean;
  children: ReactNode;
}) {
  const gate = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("hold");
  const [mode, setMode] = useState<"" | "skel-out" | "skel-skip">("");

  useEffect(() => {
    let live = true;
    const timers: number[] = [];
    const later = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)));

    // The pictures in the first screen (the app is laid out, only transparent, so they have their places).
    const pictures = Array.from(document.images).filter((img) => {
      if (gate.current?.contains(img) || img.complete) return false;
      const r = img.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
    });
    const loaded = (img: HTMLImageElement) =>
      new Promise<void>((r) => {
        img.addEventListener("load", () => r(), { once: true });
        img.addEventListener("error", () => r(), { once: true });
      });
    const ready = Promise.all([document.fonts?.ready, ...pictures.map(loaded)]);

    Promise.race([ready, later(CAP)])
      .then(() => new Promise<void>((r) => requestAnimationFrame(() => r())))
      .then(async () => {
        if (!live) return;
        // The fallback already showed the page (the script came late): nothing left to do.
        if (gate.current && getComputedStyle(gate.current).visibility === "hidden") return setPhase("done");
        const bones = Array.from(gate.current?.querySelectorAll<HTMLElement>(".skel-bone") ?? []);
        // How far along is each bone's entrance? (Its fade's clock includes its delay.)
        const clock = (b: HTMLElement) => {
          const a = b.getAnimations?.().find((x) => (x as CSSAnimation).animationName === "skel-in-fade");
          return a ? Number(a.currentTime ?? 0) : Infinity;
        };
        const delayOf = (b: HTMLElement) => WAIT + Number(b.style.getPropertyValue("--i") || 0) * STEP;
        const first = bones.length ? clock(bones[0]) - delayOf(bones[0]) : -1;
        if (first < 0) {
          // Ready before any bone showed: no skeleton, the app just fades in.
          setMode("skel-skip");
          setPhase("reveal");
        } else {
          if (first < MIN_SHOWN) await later(MIN_SHOWN - first);
          if (!live) return;
          // The bones that have shown leave in a random order; the rest never show.
          const shown = bones.filter((b) => clock(b) >= delayOf(b));
          bones.filter((b) => !shown.includes(b)).forEach((b) => b.setAttribute("data-unseen", ""));
          const order = shown.map((_, i) => i).sort(() => Math.random() - 0.5);
          shown.forEach((b, i) => b.style.setProperty("--o", String(order[i])));
          setMode("skel-out");
          setPhase("reveal");
        }
        await later(Math.max(REVEAL_TIME, bones.length * OUT_STEP + OUT_TIME) + 60);
        if (live) setPhase("done");
      });

    return () => {
      live = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  if (phase === "done") return null;
  return (
    <div ref={gate} data-skeleton-gate aria-hidden className={`${mode} ${className}`}>
      <style>{BASE}</style>
      <style>{phase === "hold" ? HOLD : shell ? REVEAL_UNDER_SHELL : REVEAL}</style>
      <noscript>
        <style>{NOSCRIPT}</style>
      </noscript>
      {children}
    </div>
  );
}

/** A bone: one block of the skeleton. `i` is its place in the cascade coming in. */
export function Bone({ i, className = "", style }: { i: number; className?: string; style?: CSSProperties }) {
  return <i className={`skel-bone ${className}`} style={{ ...style, ["--i" as string]: i }} />;
}
