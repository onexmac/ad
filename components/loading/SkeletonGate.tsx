"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  appReady,
  BACK,
  clock,
  fellBack,
  hold,
  HOLD_KEYFRAMES,
  later,
  NOSCRIPT,
  REVEAL,
  REVEAL_MS,
  REVEAL_UNDER,
  SPRING_IN,
  SPRING_OUT,
  WAIT,
} from "./gate";

/**
 * Skeleton loading, for an app that loads quickly but has no loading of its own.
 *
 * The app's page renders the gate beside its content: `<><App /><SkeletonGate>…bones…</SkeletonGate></>`.
 * The bones are the app's first screen drawn as rounded rectangles where its cards, lines, keys and bars will be
 * (measured from the real screen), in its own tokens, numbered in reading order. Until the app is ready everything
 * else on the page is hidden; if that takes more than a moment the bones spring in, in that order. When it is
 * ready they spring out in the same order and the app fades in where they were.
 *
 * Plain markup and CSS until it hydrates, so it is there from the first paint. A load ready before the bones would
 * show never shows them. The gate's `className` sets `--skel-bone` (a bone's colour) and `--skel-sheen` (the light
 * that sweeps it); a bone can set its own.
 *
 * A skeleton can stand on a shell (`.skel-shell`, with `shell` on the gate): an opaque surface the bones sit on,
 * like Puncheo's frame. The gate is on top of the app, so with a shell the app is shown at once underneath and the
 * shell fades away over it, the bones springing out on top: a cross-fade with no dip.
 *
 * For an app that loads slowly, BarGate (a loading bar) is the better wait.
 */

const STEP = 40; // ms between bones coming in
const MIN_SHOWN = 380; // ms a bone that showed stays at least
const CAP = 2500; // ms: never hold the app longer than this for its pictures and fonts
const OUT_STEP = 18; // ms between bones going out
const OUT_TIME = 460; // ms a bone takes to go
const FALLBACK = 6; // s

const BASE = `
[data-skeleton-gate]{position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden;
  animation:skel-gone 0s ${FALLBACK}s both}
.skel-bone{display:block;border-radius:var(--skel-r,8px);background-color:var(--skel-bone);
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
@keyframes skel-in-scale{from{transform:scale(.92)}to{transform:scale(1)}}
@keyframes skel-out-scale{from{transform:scale(1)}to{transform:scale(.86)}}
@keyframes skel-out-fade{from{opacity:1}to{opacity:0}}
@keyframes skel-sheen{from{background-position:120% 0}to{background-position:-20% 0}}
${HOLD_KEYFRAMES}
@media (prefers-reduced-motion: reduce){
  .skel-bone,.skel-out .skel-bone{animation-duration:1ms;animation-delay:${WAIT}ms}}
`;

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
    (async () => {
      await appReady(gate.current, CAP, timers);
      if (!live) return;
      if (fellBack(gate.current)) return setPhase("done");
      const bones = Array.from(gate.current?.querySelectorAll<HTMLElement>(".skel-bone") ?? []);
      const delayOf = (b: HTMLElement) => WAIT + Number(b.style.getPropertyValue("--i") || 0) * STEP;
      const first = bones.length ? clock(bones[0], "skel-in-fade") - delayOf(bones[0]) : -1;
      if (first < 0) {
        // Ready before any bone showed: no skeleton, the app just fades in.
        setMode("skel-skip");
        setPhase("reveal");
      } else {
        if (first < MIN_SHOWN) await later(MIN_SHOWN - first, timers);
        if (!live) return;
        // The bones that showed leave in reading order, as they came; the rest never show.
        const shown = bones.filter((b) => clock(b, "skel-in-fade") >= delayOf(b));
        bones.filter((b) => !shown.includes(b)).forEach((b) => b.setAttribute("data-unseen", ""));
        shown.forEach((b, k) => b.style.setProperty("--o", String(k)));
        setMode("skel-out");
        setPhase("reveal");
      }
      await later(Math.max(REVEAL_MS, bones.length * OUT_STEP + OUT_TIME) + 60, timers);
      if (live) setPhase("done");
    })();
    return () => {
      live = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  if (phase === "done") return null;
  return (
    <div ref={gate} data-skeleton-gate aria-hidden className={`${mode} ${className}`}>
      <style>{BASE}</style>
      <style>{phase === "hold" ? hold(FALLBACK) : shell ? REVEAL_UNDER : REVEAL}</style>
      <noscript>
        <style>{NOSCRIPT}</style>
      </noscript>
      {children}
    </div>
  );
}

/**
 * A bone: one rounded rectangle of the skeleton. `i` is its place in reading order; `r` its corner radius
 * (default 8, as the real element's where it has one).
 */
export function Bone({ i, r, className = "", style }: { i: number; r?: number | string; className?: string; style?: CSSProperties }) {
  const radius = r === undefined ? undefined : typeof r === "number" ? `${r}px` : r;
  return <i className={`skel-bone ${className}`} style={{ ...style, ["--i" as string]: i, ["--skel-r" as string]: radius }} />;
}
