"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useTransform } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { CANCEL_SPRING } from "@/lib/updatr/flight";

/** Pull travel that commits (before friction). */
export const PULL_COMMIT = 120;
/** A finger that rests this long during a pull brings up the sections to choose from. */
const HOLD_MS = 320;
/** Finger travel per section while choosing. */
export const SCRUB_STEP = 44;
const liftOf = (r: number) => 150 * (1 - Math.exp((-0.6 * r) / 150));

export type Scrub = { x: number; y: number; target: number; start: number } | null;

/**
 * Pull up at the end of a section, against friction, to go on to the next one
 * (Histok's edge pull: only a fresh gesture that starts at the bottom counts,
 * it arms past a mark, release commits). If the finger rests during the pull,
 * the sections come up over the finger; sliding sideways picks one and the
 * release goes there.
 */
export function useSectionPull({ count, current, onCommit }: { count: number; current: number; onCommit: (target: number) => void }) {
  const raw = useMotionValue(0);
  const lift = useTransform(raw, liftOf);
  const [armed, setArmed] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [scrub, setScrub] = useState<Scrub>(null);
  const live = useRef({ count, current, onCommit });
  useEffect(() => {
    live.current = { count, current, onCommit };
  });

  useEffect(() => {
    let mode: "idle" | "pending" | "pull" | "scrub" | "none" = "idle";
    let sx = 0;
    let sy = 0;
    let isArmed = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let last = { x: 0, y: 0 };
    let sc: { x: number; y: number; target: number; start: number } | null = null;
    const max = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const atEnd = () => window.scrollY >= max() - 1;
    const next = () => Math.min(live.current.current + 1, live.current.count - 1);
    const clearHold = () => {
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = null;
    };
    const arm = (on: boolean) => {
      if (on === isArmed) return;
      isArmed = on;
      setArmed(on);
      if (on) haptic.select();
    };
    const armHold = () => {
      clearHold();
      holdTimer = setTimeout(() => {
        if (mode !== "pull" || raw.get() < 24) return;
        // The finger rested: bring up the sections over it, the next one under the finger.
        mode = "scrub";
        sc = { x: last.x, y: last.y, target: next(), start: next() };
        setScrub(sc);
        arm(false);
        haptic.drag();
      }, HOLD_MS);
    };
    const end = (commit: boolean) => {
      clearHold();
      const m = mode;
      mode = "idle";
      setPulling(false);
      if (m === "scrub" && sc) {
        const t = sc.target;
        sc = null;
        setScrub(null);
        if (commit && t !== live.current.current) {
          haptic.complete();
          live.current.onCommit(t);
          raw.set(0);
        } else animate(raw, 0, CANCEL_SPRING);
        return;
      }
      if (m !== "pull") return;
      const go = commit && isArmed && live.current.current < live.current.count - 1;
      arm(false);
      if (go) {
        haptic.complete();
        live.current.onCommit(next());
        raw.set(0);
      } else animate(raw, 0, CANCEL_SPRING);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || document.body.style.overflow === "hidden" || !atEnd()) {
        mode = "none";
        return;
      }
      mode = "pending";
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      last = { x: sx, y: sy };
    };
    const onMove = (e: TouchEvent) => {
      if (mode === "idle" || mode === "none") return;
      if (e.touches.length !== 1) {
        end(false); // a second finger settles it
        mode = "none";
        return;
      }
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - sx;
      const dy = y - sy;
      if (mode === "pending") {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
          if (dy < 0 && e.cancelable) e.preventDefault();
          return;
        }
        if (dy < 0 && Math.abs(dy) >= Math.abs(dx) && e.cancelable) {
          mode = "pull";
          raw.stop();
          setPulling(true);
          haptic.drag();
        } else {
          mode = "none";
          return;
        }
      }
      e.preventDefault();
      if (mode === "scrub" && sc) {
        const t = Math.max(0, Math.min(live.current.count - 1, sc.start + Math.round((x - sc.x) / SCRUB_STEP)));
        if (t !== sc.target) {
          sc = { ...sc, target: t };
          setScrub(sc);
          haptic.select();
        }
        return;
      }
      // Still pulling: any real movement restarts the rest timer.
      if (Math.hypot(x - last.x, y - last.y) > 4) {
        last = { x, y };
        armHold();
      }
      raw.set(Math.max(0, -dy));
      arm(raw.get() > PULL_COMMIT && live.current.current < live.current.count - 1);
    };
    const onEnd = () => end(true);
    const onCancel = () => end(false); // the system took the touch

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onCancel);
    return () => {
      clearHold();
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };
  }, [raw]);

  return { lift, raw, armed, pulling, scrub };
}
