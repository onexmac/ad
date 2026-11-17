"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import type { PunchSheet } from "./usePunchSheet";

/** After this long on the control, the fan opens even if the finger hasn't moved. */
const HOLD_MS = 140;
const RADIUS = 125;
const BUBBLE = 46;

type Fan = { ox: number; oy: number; w: number; pts: { x: number; y: number; a: number }[]; sel: number | null; sticky: boolean };

/** Lay the sections on an arc above the touch, leaning toward the middle of the screen, kept on screen. */
function layout(ox: number, oy: number, n: number): Fan["pts"] {
  const w = window.innerWidth;
  const deg = Math.PI / 180;
  const span = Math.min(130, (n - 1) * 28) * deg;
  // Lean toward the middle of the screen, but keep the whole arc above the finger.
  const lean = Math.max(-1, Math.min(1, (w / 2 - ox) / (w / 2))) * 40 * deg;
  const lo = -160 * deg + span / 2;
  const hi = -20 * deg - span / 2;
  const mid = Math.max(lo, Math.min(hi, -Math.PI / 2 + lean));
  const pts = Array.from({ length: n }, (_, k) => {
    const a = n === 1 ? mid : mid - span / 2 + (k * span) / (n - 1);
    return { x: ox + RADIUS * Math.cos(a), y: oy + RADIUS * Math.sin(a), a };
  });
  const m = BUBBLE / 2 + 8;
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const dx = minX < m ? m - minX : maxX > w - m ? w - m - maxX : 0;
  return pts.map((p) => ({ ...p, x: p.x + dx }));
}

/** The section the finger points at: by direction from where the touch began, once it has moved off it. */
function pick(f: Fan, x: number, y: number): number | null {
  const vx = x - f.ox;
  const vy = y - f.oy;
  if (Math.hypot(vx, vy) < 26) return null;
  let best: number | null = null;
  let bestD = Infinity;
  f.pts.forEach((p, i) => {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return bestD < RADIUS * 1.1 ? best : null;
}

/**
 * The sections in the footer, after Histok's pills: a dot per section, the
 * current one a pill that fills as you scroll through it. Press it and the
 * sections fan out around the finger (Pinterest's long-press): slide toward
 * one, release to go. A quick tap opens the fan to choose with a second tap.
 */
export function SectionControl({ s, tone }: { s: PunchSheet; tone: "bar" | "leia" | "pill" }) {
  const [fan, setFan] = useState<Fan | null>(null);
  const fanRef = useRef<Fan | null>(null);
  // A bubble chooses only if the press started on it (the tap that opened the fan
  // also sends a click, which can land on a bubble still flying out).
  const downOn = useRef<number | null>(null);
  const press = useRef<{ id: number; x: number; y: number; t: ReturnType<typeof setTimeout> | null; open: boolean; moved: boolean } | null>(null);
  const p = useMotionValue(0);
  const fill = useTransform(p, (v) => `${Math.round(v * 100)}%`);

  useEffect(() => {
    const on = () => {
      const el = document.getElementById("puncheo-list");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight * 0.5);
      p.set(Math.max(0, Math.min(1, (window.innerHeight * 0.5 - r.top) / span)));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [p, s.section]);

  const set = (f: Fan | null) => {
    fanRef.current = f;
    setFan(f);
  };
  const open = (x: number, y: number, sticky: boolean) => {
    haptic.drag();
    set({ ox: x, oy: y, w: window.innerWidth, pts: layout(x, y, s.sections.length), sel: null, sticky });
  };
  const choose = (i: number | null) => {
    set(null);
    if (i === null || i === s.section) return;
    haptic.complete();
    s.travelTo(i);
  };

  const n = s.sections.length;
  const dark = tone !== "pill";

  return (
    <>
      <button
        type="button"
        aria-label={`Secciones: ${s.sec.name}, ${s.section + 1} de ${n}`}
        className={`relative flex h-11 shrink-0 touch-none select-none items-center gap-[5px] px-3 ${
          tone === "pill" ? "rounded-[10px] bg-hair" : tone === "leia" ? "leia-well rounded-[4px]" : "rounded-[6px] bg-ink"
        }`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const x = e.clientX;
          const y = e.clientY;
          press.current = {
            id: e.pointerId,
            x,
            y,
            open: false,
            moved: false,
            t: setTimeout(() => {
              if (!press.current) return;
              press.current.open = true;
              open(x, y, false);
            }, HOLD_MS),
          };
        }}
        onPointerMove={(e) => {
          const pr = press.current;
          if (!pr || e.pointerId !== pr.id) return;
          if (Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > 8) pr.moved = true;
          if (!pr.open && pr.moved) {
            if (pr.t) clearTimeout(pr.t);
            pr.open = true;
            open(pr.x, pr.y, false);
          }
          const f = fanRef.current;
          if (!f || f.sticky) return;
          const sel = pick(f, e.clientX, e.clientY);
          if (sel !== f.sel) {
            if (sel !== null) haptic.select();
            set({ ...f, sel });
          }
        }}
        onPointerUp={(e) => {
          const pr = press.current;
          press.current = null;
          if (!pr || e.pointerId !== pr.id) return;
          if (pr.t) clearTimeout(pr.t);
          const f = fanRef.current;
          if (!pr.moved) {
            // A press without sliding (a tap, or a hold released in place): leave the
            // fan open over the control and let a second tap choose.
            if (f) set({ ...f, sticky: true, sel: null });
            else {
              const r = e.currentTarget.getBoundingClientRect();
              open(r.left + r.width / 2, r.top + r.height / 2, true);
            }
            return;
          }
          if (f && !f.sticky) choose(f.sel);
        }}
        onPointerCancel={() => {
          if (press.current?.t) clearTimeout(press.current.t);
          press.current = null;
          if (fanRef.current && !fanRef.current.sticky) set(null);
        }}
      >
        {s.sections.map((x, i) => {
          const on = i === s.section;
          const done = s.sectionTallies[i].done === s.sectionTallies[i].total;
          return (
            <motion.span
              key={x.id}
              layout
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="relative block h-[6px] overflow-hidden rounded-full"
              style={{
                width: on ? 26 : 6,
                background: on ? (dark ? "rgba(255,255,255,0.22)" : "var(--hair-2)") : done ? "var(--ok)" : dark ? "rgba(255,255,255,0.32)" : "var(--ink-faint)",
              }}
            >
              {on ? <motion.span className="absolute inset-y-0 left-0 block rounded-full" style={{ width: fill, background: dark ? "var(--ground)" : "var(--ink-3)" }} /> : null}
            </motion.span>
          );
        })}
      </button>

      {/* On the body: the footer may be transformed, which would trap a fixed layer inside it. */}
      {typeof document === "undefined" ? null : createPortal(<AnimatePresence>
        {fan ? (
          <motion.div
            key="fan"
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onPointerDown={fan.sticky ? () => set(null) : undefined}
            style={{ pointerEvents: fan.sticky ? "auto" : "none" }}
          >
            <div className="absolute inset-0 bg-ink/30" />
            <span className="absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ground/80" style={{ left: fan.ox, top: fan.oy }} />
            {fan.pts.map((pt, i) => {
              const x = s.sections[i];
              const sel = fan.sel === i;
              const cur = i === s.section;
              const t = s.sectionTallies[i];
              return (
                <motion.button
                  key={x.id}
                  type="button"
                  tabIndex={fan.sticky ? 0 : -1}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    downOn.current = i;
                  }}
                  onClick={() => {
                    if (downOn.current === i) choose(i);
                    downOn.current = null;
                  }}
                  className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-center shadow-[var(--shadow-mid)]"
                  style={{ left: pt.x, top: pt.y, width: BUBBLE, height: BUBBLE, pointerEvents: fan.sticky ? "auto" : "none" }}
                  initial={{ x: fan.ox - pt.x, y: fan.oy - pt.y, scale: 0.3, opacity: 0 }}
                  animate={{ x: 0, y: 0, scale: sel ? 1.22 : 1, opacity: 1, background: sel ? "var(--brand)" : cur ? "var(--ink)" : "var(--ground)" }}
                  transition={{ type: "spring", stiffness: 520, damping: 30, delay: i * 0.012 }}
                >
                  <span className={`text-[11px] font-semibold leading-none ${sel || cur ? "text-ground" : "text-ink"}`}>{x.name}</span>
                  {t.done === t.total ? <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-ground bg-ok" /> : null}
                </motion.button>
              );
            })}
            {fan.sel !== null ? (
              <span
                className="absolute -translate-x-1/2 rounded-[10px] bg-ink px-3 py-1.5 text-[14px] font-semibold text-ground shadow-[var(--shadow-mid)]"
                style={{ left: Math.min(Math.max(fan.pts[fan.sel].x, 80), fan.w - 80), top: Math.min(...fan.pts.map((q) => q.y)) - BUBBLE }}
              >
                {s.sections[fan.sel].name}
                <span className="ml-1.5 text-[12px] font-medium text-ink-faint">
                  {s.sectionTallies[fan.sel].done}/{s.sectionTallies[fan.sel].total}
                </span>
              </span>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>, document.body)}
    </>
  );
}
