"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { CheckIcon } from "./Icons";
import type { PunchSheet } from "./usePunchSheet";

/**
 * The sections in the footer: the current room and where it sits (2/6). A tap
 * brings the rooms up as the fan over the button (touch), or, with a mouse, a
 * plain list above it, the desktop way.
 */
export function SectionControl({ s, tone }: { s: PunchSheet; tone: "bar" | "leia" | "pill" }) {
  const [list, setList] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const n = s.sections.length;
  const dark = tone !== "pill";

  useEffect(() => {
    if (!list) return;
    const off = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setList(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setList(false);
    window.addEventListener("pointerdown", off);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", esc);
    };
  }, [list]);

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={list || !!s.fan}
        aria-label={`Secciones: ${s.sec.name}, ${s.section + 1} de ${n}`}
        onClick={(e) => {
          haptic.select();
          const fine = window.matchMedia("(pointer: fine)").matches;
          if (fine) setList((v) => !v);
          else {
            const r = e.currentTarget.getBoundingClientRect();
            s.fanOpen(r.left + r.width / 2, r.top + r.height / 2, true);
          }
        }}
        className={`flex h-11 max-w-[118px] items-center gap-1.5 px-3 ${
          tone === "pill" ? "rounded-[10px] bg-hair" : tone === "leia" ? "leia-well rounded-[4px]" : "rounded-[6px] bg-ink"
        }`}
      >
        <span className={`truncate text-[14px] font-semibold ${dark ? "text-ground" : "text-ink"}`}>{s.sec.name}</span>
        <span className={`shrink-0 text-[11px] tabular-nums ${dark ? "text-ink-faint" : "text-ink-soft"}`}>
          {s.section + 1}/{n}
        </span>
      </button>

      <AnimatePresence>
        {list ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.14 }}
            className="absolute bottom-[calc(100%+10px)] left-0 z-40 w-[220px] overflow-hidden rounded-[12px] bg-ground py-1 shadow-[var(--shadow-mid)]"
          >
            {s.sections.map((x, i) => {
              const t = s.sectionTallies[i];
              const on = i === s.section;
              return (
                <button
                  key={x.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setList(false);
                    if (!on) s.travelTo(i);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-[14px] hover:bg-card ${on ? "font-semibold text-ink" : "text-ink-2"}`}
                >
                  <span>{x.name}</span>
                  <span className="flex items-center gap-1.5 text-[12px] tabular-nums text-ink-faint">
                    {t.done === t.total ? <CheckIcon size={12} strokeWidth={2.6} className="text-ok" /> : null}
                    {t.done}/{t.total}
                  </span>
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
