"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { AXIS_LOCK, freshVelocity } from "@/lib/updatr/flight";
import { pad } from "@/lib/updatr/format";
import { Arrow } from "./Arrow";

/** How far past an edge the strip follows the finger before it grips. */
const EDGE_RUBBER = 0.32;
/** Distance (share of a card) or flick speed (px/s) that moves to the next card. */
const ADVANCE_RATIO = 0.18;
const ADVANCE_VELOCITY = 320;
/** Seconds of momentum projected from a flick when choosing where to land. */
const PROJECT_S = 0.22;

/**
 * A horizontal strip that always lands with a card fully in view, on our own
 * spring instead of CSS snap. The finger drives a single x value (axis-locked
 * against the page's vertical scroll, rubber-banded at the ends); release
 * projects momentum, picks the card and springs there, carrying the velocity.
 */
export function SnapStrip({
  cards,
  fraction = 0.78,
  gap = 16,
  tone = "light",
  label,
}: {
  cards: ReactNode[];
  /** Card width as a share of the strip's inner width. */
  fraction?: number;
  gap?: number;
  tone?: "light" | "dark";
  label: string;
}) {
  const n = cards.length;
  const track = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const step = useMotionValue(1);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; x0: number; axis: "none" | "x" | "y" } | null>(null);
  const vel = useRef({ v: 0, t: 0, last: 0 });
  const dragged = useRef(false);

  const minX = () => -(n - 1) * step.get();

  // Measure the step (card + gap) and keep the current card in place on resize.
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      step.set(card.offsetWidth + gap);
      x.set(-indexRef.current * step.get());
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gap, step, x]);

  const goTo = (i: number, velocity = 0) => {
    const target = Math.max(0, Math.min(n - 1, i));
    if (target !== indexRef.current) haptic.select();
    indexRef.current = target;
    setIndex(target);
    animate(x, -target * step.get(), { ...springs.snappy, velocity });
  };

  useEffect(() => () => x.stop(), [x]);

  const progress = useTransform(() => {
    const span = (n - 1) * step.get();
    return span > 0 ? Math.max(0, Math.min(1, -x.get() / span)) : 0;
  });

  const fill = useTransform(progress, (p) => (1 + p * (n - 1)) / Math.max(1, n));

  const ink = tone === "dark" ? "text-paper" : "text-ink";
  const soft = tone === "dark" ? "text-paper/50" : "text-ink-soft";
  const bar = tone === "dark" ? "bg-paper" : "bg-ink";
  const barBg = tone === "dark" ? "bg-paper/20" : "bg-rule-soft";

  /** Land on the nearest card if a stopped spring or an aborted drag left us between two. */
  const resnap = () => {
    const s = step.get();
    const i = Math.max(0, Math.min(n - 1, Math.round(-x.get() / s)));
    if (Math.abs(x.get() + i * s) > 0.5 || i !== indexRef.current) goTo(i);
  };

  const finish = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.axis !== "x") {
      resnap();
      return;
    }
    const s = step.get();
    const v = freshVelocity(vel.current.v, vel.current.t);
    const moved = x.get() - -indexRef.current * s;
    const projected = moved + v * PROJECT_S;
    let target = indexRef.current;
    if (Math.abs(moved) > s * ADVANCE_RATIO || Math.abs(v) > ADVANCE_VELOCITY) {
      const cards = Math.max(1, Math.round(Math.abs(projected) / s));
      target = indexRef.current + (projected < 0 ? cards : -cards);
    }
    goTo(target, v);
  };

  return (
    <div>
      {/* The viewport takes the gestures (full width, so the empty space past
          the last card still swipes back); the track only moves. */}
      <div
        className="overflow-hidden px-5"
        style={{ touchAction: "pan-y" }}
        onClickCapture={(e) => {
          if (!dragged.current) return;
          dragged.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          // A picture opened from this strip lives in the article now, but its
          // events still bubble here through React: ignore anything not in the strip.
          if (!e.currentTarget.contains(e.target as Node)) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          if (drag.current) return; // one finger drives the strip
          // Touching a strip in motion only stops it: that touch is not a tap.
          // (A spring's last sub-pixel tail is not "in motion".)
          const moving = x.isAnimating() && Math.abs(x.getVelocity()) > 40;
          x.stop();
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: x.get(), axis: "none" };
          dragged.current = moving;
          vel.current = { v: 0, t: performance.now(), last: e.clientX };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          if (e.pointerType === "mouse" && e.buttons === 0) {
            // A held image swallowed the release: this is just a hover.
            drag.current = null;
            resnap();
            return;
          }
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (d.axis === "none") {
            if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
            if (Math.abs(dx) > Math.abs(dy)) {
              d.axis = "x";
              dragged.current = true;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {}
            } else {
              d.axis = "y";
              resnap();
              return;
            }
          }
          if (d.axis !== "x") return;
          const now = performance.now();
          const dt = now - vel.current.t;
          if (dt > 0) vel.current.v = ((e.clientX - vel.current.last) / dt) * 1000;
          vel.current.t = now;
          vel.current.last = e.clientX;
          let raw = d.x0 + dx;
          if (raw > 0) raw = raw * EDGE_RUBBER;
          else if (raw < minX()) raw = minX() + (raw - minX()) * EDGE_RUBBER;
          x.set(raw);
        }}
        // Capture phase: a held picture stops its release from bubbling, but
        // the strip must still hear it to settle on a card.
        onPointerUpCapture={finish}
        onPointerCancelCapture={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          drag.current = null;
          resnap();
        }}
      >
        <motion.div
          ref={track}
          role="group"
          aria-roledescription="carousel"
          aria-label={label}
          tabIndex={0}
          className="flex outline-none"
          style={{ x, gap }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") goTo(indexRef.current + 1);
            if (e.key === "ArrowLeft") goTo(indexRef.current - 1);
          }}
        >
          {cards.map((card, i) => (
            <StripCard key={i} i={i} x={x} step={step} fraction={fraction}>
              {card}
            </StripCard>
          ))}
        </motion.div>
      </div>

      {n > 1 ? (
        <div className={`mt-5 flex items-center gap-4 px-5 ${ink}`}>
          <span className="mono w-[54px] tabular-nums">
            {pad(index + 1)} / {pad(n)}
          </span>
          <span className={`relative h-[2px] flex-1 overflow-hidden ${barBg}`}>
            <motion.span
              className={`absolute inset-y-0 left-0 w-full origin-left ${bar}`}
              style={{ scaleX: fill }}
            />
          </span>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => goTo(indexRef.current - 1)}
            className={`grid h-9 w-9 place-items-center ${index === 0 ? soft : ""}`}
          >
            <Arrow dir="left" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => goTo(indexRef.current + 1)}
            className={`grid h-9 w-9 place-items-center ${index === n - 1 ? soft : ""}`}
          >
            <Arrow dir="right" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StripCard({
  i,
  x,
  step,
  fraction,
  children,
}: {
  i: number;
  x: MotionValue<number>;
  step: MotionValue<number>;
  fraction: number;
  children: ReactNode;
}) {
  // Full size at its landing spot, smaller and dimmer the further it sits from it.
  const dist = useTransform(() => Math.min(1, Math.abs((x.get() + i * step.get()) / (step.get() || 1))));
  const scale = useTransform(dist, (d) => 1 - d * 0.1);
  const opacity = useTransform(dist, (d) => 1 - d * 0.45);
  return (
    <motion.div
      className="shrink-0"
      style={{ width: `${fraction * 100}%`, scale, opacity, transformOrigin: "50% 60%" }}
    >
      {children}
    </motion.div>
  );
}
