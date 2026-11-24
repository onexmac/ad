"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, motionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import type { Verdict } from "@/lib/updatr/taste";

/*
 * Updatr's like control, next to the bookmark: Noticss's fan
 * (components/noticss/b/LikeFan.tsx, kept in step with it) in Updatr's
 * square, mono look. Path's fan with Pinterest's press:
 *
 * - tap: the choices spin out of the button along an arc, each with its
 *   label, on a spring that overshoots and settles; tap one (or anywhere else
 *   to close, and they spin back in);
 * - press, slide, release: hold the button (or start sliding at once), the
 *   fan opens under the finger, slide onto a choice and let go to pick it.
 *
 * Gravity: while the finger slides, each choice leans toward it, more the
 * closer it gets, and within reach it slides under the finger. The choice
 * meets the finger halfway, so picking feels like less travel than it is.
 *
 * Picking the verdict already given takes it back.
 */

export type Fan = null | "tap" | "hold";

const HOLD_MS = 240;
/** Sliding this far before the hold fires opens the fan at once. */
const SLIDE_PX = 10;
/** A choice is caught when the finger is this close to where gravity has drawn it. */
const CATCH_PX = 40;
/** Gravity reaches this far; the pull grows as (1 − d/R)^1.5. */
const REACH_PX = 140;
const PULL = 0.9;
const PULL_MAX = 34;

/** Out of the button along an arc, the way Path's menu fanned. */
const CHOICES: { v: Verdict; dx: number; dy: number; label: string; tag: string }[] = [
  { v: "like", dx: -50, dy: -74, label: "More like this", tag: "More" },
  { v: "dislike", dx: 50, dy: -74, label: "Less like this", tag: "Less" },
];

/** Out: an overshooting spring (Path's bounce); back in: quick and flat. */
const OUT = { type: "spring", stiffness: 520, damping: 16, mass: 0.9 } as const;
const BACK = { type: "spring", stiffness: 700, damping: 40 } as const;
/** Like first, dislike a clear beat behind. */
const STAGGER = 0.15;
/** The label's spin trails its circle's by this much, on a slightly softer spring, and it fades in later still. */
const LABEL_LAG = 0.06;
const LABEL_FADE = 0.24;
const LABEL_SPIN = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;
/** On the way back the labels go first, then the circles. */
const LABEL_OUT = 0.08;

export function Heart({ on, crossed = false, size = 18 }: { on: boolean; crossed?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="miter" aria-hidden focusable="false">
      <path
        d="M8 13.6C8 13.6 1.9 9.9 1.9 5.9C1.9 3.9 3.4 2.4 5.2 2.4C6.4 2.4 7.4 3.1 8 4.1C8.6 3.1 9.6 2.4 10.8 2.4C12.6 2.4 14.1 3.9 14.1 5.9C14.1 9.9 8 13.6 8 13.6Z"
        fill={on ? "currentColor" : "none"}
      />
      {crossed ? <path d="M2.2 13.8L13.8 2.2" strokeLinecap="square" /> : null}
    </svg>
  );
}

function Cross({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="square" aria-hidden focusable="false">
      <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" />
    </svg>
  );
}

/**
 * Where gravity puts a choice: its place, drawn toward the finger (both
 * relative to the button's centre). The pull is a share of the distance that
 * grows as (1 − d/R)^1.5, capped in pixels: faint at the edge of reach, more
 * than half the way when close, so the choice slides under the finger. Only
 * the nearest choice is drawn. `d` is what is left between them.
 */
function pulled(o: { dx: number; dy: number }, fx: number, fy: number, on: boolean) {
  const vx = fx - o.dx;
  const vy = fy - o.dy;
  const d0 = Math.hypot(vx, vy);
  // Only the nearest choice reaches; the other stays where it is.
  const nearest = CHOICES.every((c) => Math.hypot(fx - c.dx, fy - c.dy) >= d0);
  if (!on || !nearest || d0 >= REACH_PX) return { x: o.dx, y: o.dy, d: d0 };
  const k = Math.min(PULL * Math.pow(1 - d0 / REACH_PX, 1.5), PULL_MAX / Math.max(d0, 1));
  return { x: o.dx + vx * k, y: o.dy + vy * k, d: d0 * (1 - k) };
}

/** Red starts this far from a choice's place and is full by here, before the finger covers it. */
const RED_FROM = 120;
const RED_FULL = 72;

/** How near the finger is to a choice, 0..1, for the nearest choice only (the one gravity draws). */
function nearness(o: { dx: number; dy: number }, fx: number, fy: number, on: boolean) {
  if (!on) return 0;
  const d0 = Math.hypot(fx - o.dx, fy - o.dy);
  if (!CHOICES.every((c) => Math.hypot(fx - c.dx, fy - c.dy) >= d0)) return 0;
  return Math.max(0, Math.min(1, (RED_FROM - d0) / (RED_FROM - RED_FULL)));
}

const mix = (a: string, b: string, t: number) => `color-mix(in srgb, var(${a}) ${Math.round(t * 100)}%, var(${b}))`;

function Choice({
  o,
  i,
  fx,
  fy,
  pulling,
  hover,
  chosen,
  onPick,
}: {
  o: (typeof CHOICES)[number];
  i: number;
  fx: MotionValue<number>;
  fy: MotionValue<number>;
  pulling: MotionValue<number>;
  hover: boolean;
  chosen: boolean;
  onPick: () => void;
}) {
  // Gravity's offset from the choice's own place, on a soft spring so it leans rather than jumps.
  const tx = useTransform(() => pulled(o, fx.get(), fy.get(), pulling.get() > 0).x - o.dx);
  const ty = useTransform(() => pulled(o, fx.get(), fy.get(), pulling.get() > 0).y - o.dy);
  const gx = useSpring(tx, { stiffness: 420, damping: 26 });
  const gy = useSpring(ty, { stiffness: 420, damping: 26 });
  // The approaching finger warms the choice to red, quickly, so it shows red
  // before the finger hides it: the circle, its mark and its label.
  const near = useSpring(
    useTransform(() => nearness(o, fx.get(), fy.get(), pulling.get() > 0)),
    { stiffness: 900, damping: 50 },
  );
  const fill = useTransform(near, (t) => mix("--accent", "--paper", t));
  const mark = useTransform(near, (t) => mix("--paper", "--ink", Math.min(1, t * 1.6)));
  const tag = useTransform(near, (t) => mix("--accent", "--ink", t));
  const n = CHOICES.length;
  // Like comes out first, dislike close behind; back in, the other way round.
  const lead = i * STAGGER;
  const back = (n - 1 - i) * STAGGER * 0.6;
  return (
    // The choice's place on the arc: it flies out of the button and back.
    <motion.div
      className="pointer-events-none absolute left-0 top-0 h-12 w-12"
      initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
      animate={{ x: o.dx, y: o.dy, scale: 1, opacity: 1, transition: { ...OUT, delay: lead } }}
      exit={{ x: 0, y: 0, scale: 0.2, opacity: 0, transition: { ...BACK, delay: back + LABEL_OUT } }}
    >
      <motion.div className="relative h-full w-full" style={{ x: gx, y: gy }}>
        {/* The circle spins in as it flies. */}
        <motion.div
          className="absolute inset-0"
          initial={{ rotate: -220 }}
          animate={{ rotate: 0, transition: { ...OUT, delay: lead } }}
          exit={{ rotate: -220, transition: { ...BACK, delay: back + LABEL_OUT } }}
        >
          <motion.button
            type="button"
            aria-label={o.label}
            aria-pressed={chosen}
            onClick={onPick}
            animate={{ scale: hover ? 1.2 : 1 }}
            transition={{ type: "spring", stiffness: 600, damping: 22 }}
            className="pointer-events-auto grid h-12 w-12 place-items-center border border-ink shadow-[0_10px_24px_-10px_rgba(11,11,11,.45)]"
            style={{ touchAction: "none", backgroundColor: chosen ? "var(--accent)" : fill, color: chosen ? "var(--paper)" : mark }}
          >
            <Heart on={chosen} crossed={o.v === "dislike"} />
          </motion.button>
        </motion.div>
        {/*
         * The label rides on the circle (it turns about the circle's centre, so
         * it orbits with it and is never left behind) but its spin trails the
         * circle's by a beat, and it fades in after it. It goes first on the
         * way back.
         */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={{ rotate: -220, opacity: 0 }}
          animate={{
            rotate: 0,
            opacity: 1,
            transition: { rotate: { ...LABEL_SPIN, delay: lead + LABEL_LAG }, opacity: { duration: 0.22, ease: "easeOut", delay: lead + LABEL_FADE } },
          }}
          exit={{ rotate: -120, opacity: 0, transition: { duration: LABEL_OUT, ease: "easeIn" } }}
        >
          <motion.span
            animate={{ scale: hover ? 1.06 : 1 }}
            transition={{ type: "spring", stiffness: 600, damping: 24 }}
            className="absolute inset-x-0 bottom-[calc(100%+6px)] flex justify-center"
          >
            {/* Light text on a dark tag, warming to red with the circle. */}
            <motion.span className="mono whitespace-nowrap px-2 py-[4px] text-paper" style={{ backgroundColor: tag }}>
              {o.tag}
            </motion.span>
          </motion.span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function LikeFan({
  verdict,
  fan,
  setFan,
  onChoose,
  enabled,
}: {
  verdict: Verdict | null;
  fan: Fan;
  setFan: (f: Fan) => void;
  onChoose: (v: Verdict) => void;
  enabled: boolean;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState<Verdict | null>(null);
  const press = useRef<{ id: number; x: number; y: number; timer: number; held: boolean } | null>(null);
  // The finger, relative to the button's centre, and whether gravity is on.
  const [fx] = useState(() => motionValue(0));
  const [fy] = useState(() => motionValue(0));
  const [pulling] = useState(() => motionValue(0));
  useEffect(() => {
    if (!fan) pulling.set(0);
  }, [fan, pulling]);

  const centre = () => {
    const r = btn.current!.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  /** The choice the finger has caught, judged where gravity has drawn each one. */
  const under = (x: number, y: number): Verdict | null => {
    const c = centre();
    let best: { v: Verdict; d: number } | null = null;
    for (const o of CHOICES) {
      const p = pulled(o, x - c.x, y - c.y, true);
      if (p.d < CATCH_PX && (!best || p.d < best.d)) best = { v: o.v, d: p.d };
    }
    return best?.v ?? null;
  };
  const follow = (x: number, y: number) => {
    const c = centre();
    fx.set(x - c.x);
    fy.set(y - c.y);
  };
  const openHold = () => {
    const p = press.current;
    if (!p || p.held) return;
    p.held = true;
    haptic.select();
    setFan("hold");
  };
  const close = () => {
    pulling.set(0);
    setHover(null);
    setFan(null);
  };
  const choose = (v: Verdict) => {
    haptic.complete();
    close();
    onChoose(v);
  };

  return (
    <div className="relative" data-own-gesture>
      <AnimatePresence>
        {fan
          ? CHOICES.map((o, i) => (
              <Choice key={o.v} o={o} i={i} fx={fx} fy={fy} pulling={pulling} hover={hover === o.v} chosen={verdict === o.v} onPick={() => choose(o.v)} />
            ))
          : null}
      </AnimatePresence>
      <button
        ref={btn}
        type="button"
        aria-label={verdict === "like" ? "Liked. Change" : verdict === "dislike" ? "Less like this. Change" : "More or less like this"}
        aria-expanded={!!fan}
        className={`relative grid h-12 w-12 place-items-center overflow-hidden ${enabled ? "pointer-events-auto" : ""} ${
          verdict === "like" && !fan ? "bg-accent text-paper" : verdict === "dislike" && !fan ? "bg-ink text-paper/60" : "bg-ink text-paper"
        }`}
        style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none", WebkitUserSelect: "none" }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = { id: e.pointerId, x: e.clientX, y: e.clientY, timer: 0, held: false };
          p.timer = window.setTimeout(openHold, HOLD_MS);
          press.current = p;
          follow(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          const p = press.current;
          if (!p || p.id !== e.pointerId) return;
          if (!p.held && Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLIDE_PX) {
            clearTimeout(p.timer);
            openHold();
          }
          if (!p.held) return;
          follow(e.clientX, e.clientY);
          pulling.set(1);
          const v = under(e.clientX, e.clientY);
          if (v !== hover) {
            if (v) haptic.select();
            setHover(v);
          }
        }}
        onPointerUp={(e) => {
          const p = press.current;
          if (!p || p.id !== e.pointerId) return;
          clearTimeout(p.timer);
          press.current = null;
          if (p.held) {
            const v = under(e.clientX, e.clientY);
            if (v) choose(v);
            else close();
            return;
          }
          // A tap opens the fan (or closes it).
          haptic.select();
          if (fan) close();
          else setFan("tap");
        }}
        onPointerCancel={() => {
          const p = press.current;
          if (p) clearTimeout(p.timer);
          press.current = null;
          if (fan === "hold") close();
        }}
        onClick={(e) => {
          // Keyboard: Enter or Space opens the fan (pointer taps are handled above).
          if (e.detail === 0) {
            if (fan) close();
            else setFan("tap");
          }
        }}
      >
        {/* Path's turn: the heart spins away into a cross while the fan is out. */}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={fan ? "x" : "heart"}
            className="grid place-items-center"
            initial={{ rotate: -135, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 135, scale: 0.4, opacity: 0 }}
            transition={OUT}
          >
            {fan ? <Cross /> : <Heart on={verdict === "like"} crossed={verdict === "dislike"} />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
