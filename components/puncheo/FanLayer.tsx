"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { BUBBLE } from "./fan";
import type { PunchSheet } from "./usePunchSheet";

/**
 * The sections, popped up around the finger: bubbles on an arc, the one the
 * finger heads for grows and turns blue, its name above. On the body, so no
 * transformed ancestor can trap it.
 */
export function FanLayer({ s }: { s: PunchSheet }) {
  const fan = s.fan;
  // A bubble chooses only if the press started on it (the tap that opened a sticky
  // fan also sends a click, which can land on a bubble still flying out).
  const downOn = useRef<number | null>(null);
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {fan ? (
        <motion.div
          key="fan"
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onPointerDown={fan.sticky ? () => s.fanClose() : undefined}
          style={{ pointerEvents: fan.sticky ? "auto" : "none" }}
        >
          <div className="absolute inset-0 bg-ink/30" />
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
                  if (downOn.current === i) s.fanChoose(i);
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
    </AnimatePresence>,
    document.body,
  );
}
