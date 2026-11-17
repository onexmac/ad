"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useTransform } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { CANCEL_SPRING } from "@/lib/updatr/flight";

/** Pull travel that commits (after friction). */
export const PULL_COMMIT = 120;
/** Horizontal finger travel per section while scrubbing. */
const STEP = 54;
const liftOf = (r: number) => 170 * (1 - Math.exp((-0.6 * r) / 170));

/**
 * Pull up at the end of a section to go on to the next one. Only a fresh
 * gesture that starts at the bottom counts (a scroll that arrives there never
 * does), against friction, arming past the mark. While the finger is held,
 * sliding it sideways scrubs the target through every section of the punch.
 */
export function useSectionPull({ count, current, onCommit }: { count: number; current: number; onCommit: (target: number) => void }) {
  const raw = useMotionValue(0);
  const lift = useTransform(raw, liftOf);
  const [armed, setArmed] = useState(false);
  const [target, setTarget] = useState(Math.min(current + 1, count - 1));
  const [pulling, setPulling] = useState(false);
  const live = useRef({ count, current, onCommit });
  useEffect(() => {
    live.current = { count, current, onCommit };
  });

  useEffect(() => {
    let mode: "idle" | "pending" | "pull" | "none" = "idle";
    let sx = 0;
    let sy = 0;
    let isArmed = false;
    let tgt = 0;
    const max = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const atEnd = () => window.scrollY >= max() - 1;
    const base = () => Math.min(live.current.current + 1, live.current.count - 1);
    const setT = (t: number) => {
      if (t === tgt) return;
      tgt = t;
      setTarget(t);
      haptic.select();
      sync();
    };
    // Armed means a release would go somewhere: past the mark, and not back into this section.
    const sync = () => {
      const on = raw.get() > PULL_COMMIT && tgt !== live.current.current;
      if (on === isArmed) return;
      isArmed = on;
      setArmed(on);
      if (on) haptic.select();
    };
    const release = (commit: boolean) => {
      const go = commit && isArmed;
      isArmed = false;
      setArmed(false);
      setPulling(false);
      if (go) {
        haptic.complete();
        live.current.onCommit(tgt);
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
      tgt = base();
      setTarget(tgt);
    };
    const onMove = (e: TouchEvent) => {
      if (mode === "idle" || mode === "none") return;
      if (e.touches.length !== 1) {
        if (mode === "pull") release(false); // a second finger settles it
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
          sx = x; // scrubbing counts from where the pull began
        } else {
          mode = "none";
          return;
        }
      }
      e.preventDefault();
      raw.set(Math.max(0, -dy));
      const steps = Math.round((x - sx) / STEP);
      setT(Math.max(0, Math.min(live.current.count - 1, base() + steps)));
      sync();
    };
    const onEnd = () => {
      const m = mode;
      mode = "idle";
      if (m === "pull") release(true);
    };
    const onCancel = () => {
      const m = mode;
      mode = "idle";
      if (m === "pull") release(false); // the system took the touch
    };

    // Wheel and trackpad: a fresh run at the bottom pulls toward the next section.
    let idle: ReturnType<typeof setTimeout> | null = null;
    let fromEnd: boolean | null = null;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (fromEnd === null) {
        fromEnd = atEnd() && e.deltaY > 0;
        if (fromEnd) {
          tgt = base();
          setTarget(tgt);
          setPulling(true);
        }
      }
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => {
        idle = null;
        const was = fromEnd;
        fromEnd = null;
        if (was) release(true);
      }, 160);
      if (!fromEnd) return;
      raw.stop();
      raw.set(Math.max(0, raw.get() + e.deltaY * 0.6));
      sync();
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onCancel);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
      window.removeEventListener("wheel", onWheel);
    };
  }, [raw]);

  return { lift, raw, armed, target, pulling };
}
