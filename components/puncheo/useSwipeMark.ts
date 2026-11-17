"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent, type MotionValue } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { AXIS_LOCK, freshVelocity, resist } from "@/lib/updatr/flight";
import type { Status } from "@/lib/puncheo/state";

/** Fractions of the row's width: past SHORT a swipe arms, past LONG it upgrades. */
export const SHORT = 0.2;
export const LONG = 0.5;
/** A quick flick commits the short action even before SHORT. */
const FLING = 550;

export type Zone = Status | "na-blocked" | null;

/** The blush a fresh mark leaves on its row, fading back to the row's rest colour. */
const BLUSH: Partial<Record<Status, string>> = {
  green: "rgba(149, 201, 85, 0.24)",
  yellow: "rgba(255, 213, 86, 0.3)",
  red: "rgba(235, 87, 87, 0.16)",
};

type Opts = {
  id: string;
  na?: boolean;
  status: Status | null;
  /** Bumps on each new mark (replays the blush). */
  pulse: number;
  /** Bumps to shake the row. */
  nudge: number;
  /** The row's resting background, for the blush to fade back to. */
  rest: string;
  onMark: (s: Status) => void;
  onReject: (msg: string) => void;
  /** Return false to refuse a mark (the caller says why); the row then springs back. */
  guard?: (s: Status) => boolean;
  /** The row element that moves (the caller's ref, so no ref travels in the result). */
  ref: React.RefObject<HTMLDivElement | null>;
  /** The coloured layer under it. */
  underRef: React.RefObject<HTMLDivElement | null>;
};

export type SwipeMark = {
  x: MotionValue<number>;
  /** 0..1 toward SHORT, then 1..2 toward LONG. */
  prog: MotionValue<number>;
  zone: Zone;
  side: 0 | 1 | -1;
  /** True from the moment a horizontal drag locks until the next touch: a click then is not a tap. */
  dragged: () => boolean;
  bind: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
    onLostPointerCapture: (e: React.PointerEvent) => void;
  };
};

/**
 * The punch row's horizontal swipe: right short = pasa, right long = con
 * observación, left short = no pasa, left long = N/A. Axis-locked so vertical
 * scrolling stays native (the row sets touch-action: pan-y), one finger only,
 * the release velocity carried into the spring home.
 */
export function useSwipeMark({ id, na, status, pulse, nudge, rest, onMark, onReject, guard, ref, underRef }: Opts): SwipeMark {
  const x = useMotionValue(0);
  const prog = useMotionValue(0);
  const [zone, setZone] = useState<Zone>(null);
  const [side, setSide] = useState<0 | 1 | -1>(0);
  const gen = useRef(0);
  const g = useRef({ id: -1, x0: 0, y0: 0, w: 1, lock: null as null | "x" | "y", dragged: false, v: 0, lastX: 0, lastT: 0, zone: null as Zone });

  // The coloured layer under the row exists only while the row is off its rest.
  useMotionValueEvent(x, "change", (v) => {
    if (underRef.current) underRef.current.style.visibility = Math.abs(v) > 0.5 ? "visible" : "hidden";
  });

  useEffect(() => {
    if (!nudge) return;
    animate(x, [0, -10, 9, -6, 4, 0], { duration: 0.42, ease: "easeOut" });
  }, [nudge, x]);

  useEffect(() => {
    const from = status ? BLUSH[status] : undefined;
    if (!pulse || !from || !ref.current) return;
    animate(ref.current, { backgroundColor: [from, rest] }, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    // Only a new mark replays it, not a status read back from storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse]);

  const zoneOf = (dx: number, w: number): Zone => {
    if (dx >= LONG * w) return "yellow";
    if (dx >= SHORT * w) return "green";
    if (dx <= -LONG * w) return na ? "na" : "na-blocked";
    if (dx <= -SHORT * w) return "red";
    return null;
  };

  /** Back to rest. A committed swipe keeps its colour under the row until it lands. */
  const settle = (velocity = 0, spring: object = springs.completing, keep: Zone = null) => {
    const my = ++gen.current;
    g.current.zone = null;
    animate(prog, 0, springs.snappy);
    if (!keep) setZone(null);
    animate(x, 0, { ...spring, velocity }).then(() => {
      if (gen.current === my && g.current.id === -1) setZone(null);
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const s = g.current;
    if (s.id !== -1) {
      s.id = -1; // a second finger settles whatever the first was doing
      settle();
      return;
    }
    if (e.pointerType === "mouse" && e.button !== 0) return;
    Object.assign(s, {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      w: ref.current?.offsetWidth || 340,
      lock: null,
      dragged: false,
      v: 0,
      lastX: e.clientX,
      lastT: performance.now(),
      zone: null,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (e.pointerId !== s.id) return;
    if (!s.lock) {
      const mx = e.clientX - s.x0;
      const my = e.clientY - s.y0;
      if (Math.abs(my) > AXIS_LOCK && Math.abs(my) > Math.abs(mx)) {
        s.lock = "y";
        return;
      }
      if (!(Math.abs(mx) > AXIS_LOCK && Math.abs(mx) > Math.abs(my))) return;
      s.lock = "x";
      s.dragged = true;
      s.x0 = e.clientX; // the row follows from where the lock happened: no jump
      ref.current?.setPointerCapture(e.pointerId);
      haptic.drag();
    }
    if (s.lock !== "x") return;
    const dx = e.clientX - s.x0;
    const now = performance.now();
    s.v = ((e.clientX - s.lastX) / Math.max(1, now - s.lastT)) * 1000;
    s.lastX = e.clientX;
    s.lastT = now;
    const w = s.w;
    const a = Math.abs(dx);
    const long = LONG * w;
    x.set(Math.sign(dx) * (a <= long ? a : long + resist(a - long, w * 0.28)));
    prog.set(a < SHORT * w ? a / (SHORT * w) : 1 + Math.min(1, (a - SHORT * w) / ((LONG - SHORT) * w)));
    setSide(dx > 0 ? 1 : dx < 0 ? -1 : 0);
    const z = zoneOf(dx, w);
    if (z !== s.zone) {
      if (z) haptic.select();
      s.zone = z;
      setZone(z);
    }
  };

  const finish = (e: React.PointerEvent, cancelled: boolean) => {
    const s = g.current;
    if (e.pointerId !== s.id) return;
    s.id = -1;
    if (s.lock !== "x") return;
    if (cancelled) return settle(); // the system took the touch: settle back, no commit
    const dx = e.clientX - s.x0;
    const v = freshVelocity(s.v, s.lastT);
    let z = zoneOf(dx, s.w);
    if (!z && Math.abs(v) > FLING && Math.sign(v) === Math.sign(dx) && Math.abs(dx) > 24) z = dx > 0 ? "green" : "red";
    if (!z) return settle(v);
    if (z === "na-blocked") {
      haptic.error();
      onReject(`N/A no está permitido en ${id}`);
      return settle(v, springs.snappy);
    }
    if (guard && !guard(z)) return settle(v, springs.snappy);
    if (z === "green" || z === "yellow") haptic.complete();
    else if (z === "red") haptic.delete();
    else haptic.select();
    onMark(z);
    settle(v, z === "green" ? springs.completing : springs.snappy, z);
  };

  return {
    x,
    prog,
    zone,
    side,
    dragged: () => g.current.dragged,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e) => finish(e, false),
      onPointerCancel: (e) => finish(e, true),
      // Touches start captured by the control under the finger; handing capture
      // to the row makes that control lose it, and the event bubbles here. Only
      // the row losing its own capture means the gesture was taken away.
      onLostPointerCapture: (e) => {
        if (e.target === ref.current) finish(e, true);
      },
    },
  };
}
