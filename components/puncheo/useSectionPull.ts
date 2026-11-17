"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useTransform } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { CANCEL_SPRING } from "@/lib/updatr/flight";

/** Pull travel past the end that commits (finger travel, before friction). */
export const PULL_COMMIT = 110;
const liftOf = (r: number) => 150 * (1 - Math.exp((-0.6 * r) / 150));

/**
 * Carry on past the end of a section to go to the next one. You scroll the page
 * as usual, from anywhere on it; once the page is at its end and the finger
 * keeps going up, the extra travel becomes the pull, against friction, and arms
 * past a mark. Release past it and the next section comes. Going back down
 * before the mark just returns to scrolling. Momentum alone never pulls: only a
 * finger on the glass (or, on desktop, a fresh wheel run at the end).
 */
/** A finger that scrolled and then rests this long brings up the sections around it. */
const HOLD_MS = 220;

type Hold = { open: (x: number, y: number) => void; move: (x: number, y: number) => void; release: () => void; cancel: () => void };

export function useSectionPull({ count, current, onCommit, hold }: { count: number; current: number; onCommit: (target: number) => void; hold?: Hold }) {
  const raw = useMotionValue(0);
  const lift = useTransform(raw, liftOf);
  const [armed, setArmed] = useState(false);
  const [pulling, setPulling] = useState(false);
  const live = useRef({ count, current, onCommit, hold });
  useEffect(() => {
    live.current = { count, current, onCommit, hold };
  });

  useEffect(() => {
    let mode: "idle" | "track" | "pull" | "hold" = "idle";
    let scrolled = false;
    let rest = { x: 0, y: 0 };
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    const clearHold = () => {
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = null;
    };
    // Each real movement restarts the rest timer; once the finger has scrolled and
    // then stays put, the sections pop up around it (and any pull is dropped).
    const armHold = (x: number, y: number) => {
      clearHold();
      if (!scrolled || !live.current.hold) return;
      holdTimer = setTimeout(() => {
        if (mode !== "track" && mode !== "pull") return;
        if (mode === "pull") {
          setPulling(false);
          arm(false);
          animate(raw, 0, CANCEL_SPRING);
        }
        mode = "hold";
        live.current.hold?.open(x, y);
      }, HOLD_MS);
    };
    let sx = 0;
    let sy = 0;
    let lastY = 0;
    let anchor = 0;
    let isArmed = false;
    const max = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const atEnd = () => window.scrollY >= max() - 2;
    const hasNext = () => live.current.current < live.current.count - 1;
    const arm = (on: boolean) => {
      if (on === isArmed) return;
      isArmed = on;
      setArmed(on);
      if (on) haptic.select();
    };
    const end = (commit: boolean) => {
      clearHold();
      const m = mode;
      mode = "idle";
      if (m === "hold") {
        if (commit) live.current.hold?.release();
        else live.current.hold?.cancel();
        return;
      }
      if (m !== "pull") return;
      setPulling(false);
      const go = commit && isArmed && hasNext();
      arm(false);
      if (go) {
        haptic.complete();
        live.current.onCommit(live.current.current + 1);
      } else animate(raw, 0, CANCEL_SPRING);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || document.body.style.overflow === "hidden") {
        mode = "idle";
        return;
      }
      mode = "track";
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      lastY = sy;
      scrolled = false;
      rest = { x: sx, y: sy };
    };
    const onMove = (e: TouchEvent) => {
      if (mode === "idle") return;
      if (e.touches.length !== 1) {
        end(false); // a second finger settles it
        return;
      }
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      if (mode === "hold") {
        if (e.cancelable) e.preventDefault();
        live.current.hold?.move(x, y);
        return;
      }
      if (Math.abs(y - sy) > 24) scrolled = true;
      if (Math.hypot(x - rest.x, y - rest.y) > 5) {
        rest = { x, y };
        armHold(x, y);
      }
      const up = y < lastY;
      lastY = y;
      if (mode === "track") {
        // The page has reached its end under the finger, which is still going up,
        // in a vertical gesture (not a row being swiped sideways): the pull begins here.
        if (!hasNext() || !up || !atEnd() || Math.abs(y - sy) < Math.abs(x - sx)) return;
        mode = "pull";
        anchor = y;
        raw.stop();
        setPulling(true);
        haptic.drag();
        return; // the pull starts from here; it grows from the next move on
      }
      if (e.cancelable) e.preventDefault(); // where the browser lets us, the pull replaces the bounce
      const r = anchor - y;
      if (r < -4) {
        // Back below where the pull began: just scrolling again.
        raw.set(0);
        arm(false);
        setPulling(false);
        mode = "track";
        return;
      }
      raw.set(Math.max(0, r));
      arm(r > PULL_COMMIT);
    };
    const onEnd = () => end(true);
    const onCancel = () => end(false); // the system took the touch

    // Desktop: the wheel or trackpad. A fresh run that starts at the end pulls
    // against the same friction; when it goes quiet past the mark it commits.
    let idle: ReturnType<typeof setTimeout> | null = null;
    let fromEnd: boolean | null = null;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (fromEnd === null) {
        fromEnd = atEnd() && e.deltaY > 0 && hasNext();
        if (fromEnd) {
          mode = "pull";
          setPulling(true);
        }
      }
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => {
        idle = null;
        const was = fromEnd;
        fromEnd = null;
        if (was) end(true);
      }, 180);
      if (!fromEnd) return;
      raw.stop();
      raw.set(Math.max(0, raw.get() + e.deltaY * 0.5));
      arm(raw.get() > PULL_COMMIT);
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onCancel);
    return () => {
      clearHold();
      if (idle) clearTimeout(idle);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };
  }, [raw]);

  return { lift, raw, armed, pulling };
}
