"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { springs } from "@/lib/histok/springs";
import type { Verdict } from "@/lib/noticss/taste";

/*
 * The like control, next to the bookmark. Pinterest's long press, two ways:
 *
 * - tap: the fan opens above the button with its two choices; tap one (or
 *   anywhere else to close);
 * - press, slide, release: hold the button (or start sliding at once), the
 *   fan opens under the finger, slide onto a choice (a tick as you enter it)
 *   and let go to pick it. Letting go anywhere else picks nothing.
 *
 * Picking the verdict already given takes it back.
 */

export type Fan = null | "tap" | "hold";

const HOLD_MS = 240;
/** Sliding this far before the hold fires opens the fan at once. */
const SLIDE_PX = 10;
/** A choice catches the finger within this distance of its centre. */
const CATCH_PX = 46;

const CHOICES: { v: Verdict; dx: number; dy: number; label: string }[] = [
  { v: "like", dx: -44, dy: -78, label: "Me gusta" },
  { v: "dislike", dx: 44, dy: -78, label: "Menos así" },
];

export function Heart({ on, crossed = false, size = 18 }: { on: boolean; crossed?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden focusable="false">
      <path
        d="M8 13.6C8 13.6 1.9 9.9 1.9 5.9C1.9 3.9 3.4 2.4 5.2 2.4C6.4 2.4 7.4 3.1 8 4.1C8.6 3.1 9.6 2.4 10.8 2.4C12.6 2.4 14.1 3.9 14.1 5.9C14.1 9.9 8 13.6 8 13.6Z"
        fill={on ? "currentColor" : "none"}
      />
      {crossed ? <path d="M2.2 13.8L13.8 2.2" strokeLinecap="round" /> : null}
    </svg>
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

  const centre = () => {
    const r = btn.current!.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const under = (x: number, y: number): Verdict | null => {
    const c = centre();
    let best: { v: Verdict; d: number } | null = null;
    for (const o of CHOICES) {
      const d = Math.hypot(x - (c.x + o.dx), y - (c.y + o.dy));
      if (d < CATCH_PX && (!best || d < best.d)) best = { v: o.v, d };
    }
    return best?.v ?? null;
  };
  const openHold = () => {
    const p = press.current;
    if (!p || p.held) return;
    p.held = true;
    haptic.select();
    setFan("hold");
  };
  const choose = (v: Verdict) => {
    haptic.complete();
    setHover(null);
    setFan(null);
    onChoose(v);
  };

  return (
    <div className="relative" data-own-gesture>
      <AnimatePresence>
        {fan
          ? CHOICES.map((o) => {
              const on = hover === o.v;
              const chosen = verdict === o.v;
              return (
                <motion.button
                  key={o.v}
                  type="button"
                  aria-label={o.label}
                  aria-pressed={chosen}
                  onClick={() => choose(o.v)}
                  initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                  animate={{ x: o.dx, y: o.dy, scale: on ? 1.18 : 1, opacity: 1 }}
                  exit={{ x: 0, y: 0, scale: 0.3, opacity: 0, transition: { duration: 0.16 } }}
                  transition={springs.snappy}
                  className={`pointer-events-auto absolute left-0 top-0 grid h-12 w-12 place-items-center rounded-full shadow-[0_8px_24px_rgba(0,0,0,.28)] ${
                    on || chosen ? "bg-accent text-paper" : "bg-paper text-ink"
                  }`}
                  style={{ touchAction: "none" }}
                >
                  <Heart on={chosen} crossed={o.v === "dislike"} />
                  <span
                    className={`pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-[10px] py-[3px] text-[13px] italic transition-colors ${
                      on ? "bg-ink text-paper" : "bg-paper/90 text-ink"
                    }`}
                  >
                    {o.label}
                  </span>
                </motion.button>
              );
            })
          : null}
      </AnimatePresence>
      <button
        ref={btn}
        type="button"
        aria-label={verdict === "like" ? "Le gusta. Cambiar" : verdict === "dislike" ? "Menos así. Cambiar" : "Me gusta o menos así"}
        aria-expanded={!!fan}
        className={`relative grid h-12 w-12 place-items-center rounded-full shadow-[0_6px_18px_rgba(0,0,0,.25)] ${enabled ? "pointer-events-auto" : ""} ${
          verdict === "like" ? "bg-accent text-paper" : "bg-ink text-paper"
        }`}
        style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none", WebkitUserSelect: "none" }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = { id: e.pointerId, x: e.clientX, y: e.clientY, timer: 0, held: false };
          p.timer = window.setTimeout(openHold, HOLD_MS);
          press.current = p;
        }}
        onPointerMove={(e) => {
          const p = press.current;
          if (!p || p.id !== e.pointerId) return;
          if (!p.held && Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLIDE_PX) {
            clearTimeout(p.timer);
            openHold();
          }
          if (!p.held) return;
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
            else {
              setHover(null);
              setFan(null);
            }
            return;
          }
          // A tap opens the fan (or closes it).
          haptic.select();
          setFan(fan ? null : "tap");
        }}
        onPointerCancel={() => {
          const p = press.current;
          if (p) clearTimeout(p.timer);
          press.current = null;
          setHover(null);
          if (fan === "hold") setFan(null);
        }}
        onClick={(e) => {
          // Keyboard: Enter or Space opens the fan (pointer taps are handled above).
          if (e.detail === 0) setFan(fan ? null : "tap");
        }}
      >
        <Heart on={verdict === "like"} crossed={verdict === "dislike"} />
      </button>
    </div>
  );
}
