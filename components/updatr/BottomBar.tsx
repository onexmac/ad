"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useScroll, useTransform } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { freshVelocity, lerp } from "@/lib/updatr/flight";

export type Tab = { id: string; label: string; anchor: string };

/** Collapsed: a square in the thumb's corner. */
const SQUARE = 60;
/** Expanded: the home bar's height. */
const BAR_H = 62;
/** Distance from the screen edges. */
const INSET = 12;
/** The ink square's share of the frame at the very top of the issue. */
const MIN_FILL = 0.16;
/** Histok's chrome spring. */
const HOME_SPRING = { type: "spring" as const, stiffness: 280, damping: 30, mass: 1 };
/** Scrolling this far with the bar open folds it back. */
const SCROLL_FOLD_PX = 48;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Home: a square in the bottom-right corner whose ink grows from the corner as
 * you read, from a small block at the cover to a full square at the colophon,
 * with the page you are on in its top-left. Tap it and the ink keeps growing:
 * the square opens into the home bar (the issue's sections, the active one
 * naming where you are). Choosing a section, tapping elsewhere, scrolling,
 * Escape, or a pull down or right on the bar folds it back into the square.
 * One spring value (open, 0..1) drives the whole morph, so a finger can hold it
 * anywhere in between.
 */
export function BottomBar({
  tabs,
  active,
  section,
  folio,
  onGo,
}: {
  tabs: Tab[];
  active: string;
  section: string;
  /** Page number of the section in view, as in the contents. */
  folio: string;
  onGo: (tab: Tab) => void;
}) {
  const { scrollYProgress } = useScroll();
  const column = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const openRef = useRef(false);
  const open = useMotionValue(0);
  const span = useMotionValue(360); // the bar's full width, measured
  const [pct, setPct] = useState(0);
  const [pressed, setPressed] = useState(false);

  useLayoutEffect(() => {
    const el = column.current;
    if (!el) return;
    const measure = () => span.set(Math.max(SQUARE, el.offsetWidth - INSET * 2));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [span]);

  useEffect(() => scrollYProgress.on("change", (v) => setPct(Math.round(v * 100))), [scrollYProgress]);

  // The frame morphs from the corner square to the full bar.
  const width = useTransform(() => lerp(SQUARE, span.get(), clamp01(open.get())));
  const height = useTransform(() => lerp(SQUARE, BAR_H, clamp01(open.get())));
  // The ink grows from the corner with reading, then fills the bar as it opens.
  const fill = useTransform(() => {
    const read = MIN_FILL + (1 - MIN_FILL) * clamp01(scrollYProgress.get());
    // The ink outruns the frame so the tabs only ever appear on ink.
    return lerp(read, 1, clamp01(open.get() * 1.7));
  });
  const inkW = useTransform(() => width.get() * fill.get());
  const inkH = useTransform(() => height.get() * fill.get());
  const folioOpacity = useTransform(open, [0, 0.35], [1, 0], { clamp: true });
  const tabsOpacity = useTransform(open, [0.6, 1], [0, 1], { clamp: true });
  const tabsY = useTransform(open, [0, 1], [10, 0], { clamp: true });
  const shadow = useTransform(
    open,
    (v) => `0 18px 40px -18px rgba(11,11,11,${(0.55 * clamp01(v)).toFixed(3)})`,
  );

  const setOpen = (v: boolean, velocity = 0) => {
    openRef.current = v;
    setIsOpen(v);
    animate(open, v ? 1 : 0, { ...HOME_SPRING, velocity });
  };
  const expand = () => {
    if (openRef.current) return;
    haptic.select();
    setOpen(true);
  };
  const fold = (velocity = 0) => {
    if (!openRef.current) return;
    setOpen(false, velocity);
  };

  // While open: a tap elsewhere, a scroll, or Escape folds it back.
  useEffect(() => {
    if (!isOpen) return;
    const y0 = window.scrollY;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) fold();
    };
    const onScroll = () => {
      if (Math.abs(window.scrollY - y0) > SCROLL_FOLD_PX) fold();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fold();
    };
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Pull the open bar down or to the right: it shrinks back under the finger.
  const drag = useRef<{ id: number; x: number; y: number; d: number; t: number; v: number; on: boolean } | null>(null);
  const swallow = useRef(false);

  const go = (t: Tab) => {
    haptic.select();
    onGo(t);
    // Let the paper block land on the chosen section, then fold.
    window.setTimeout(() => fold(), 140);
  };

  return (
    <nav aria-label="Sections" className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <div ref={column} className="relative mx-auto h-0 w-full max-w-[520px]">
        <motion.div
          ref={box}
          data-updatr-chrome="bottom"
          className="pointer-events-auto absolute overflow-hidden"
          style={{
            right: INSET,
            bottom: `calc(var(--sab) + ${INSET}px)`,
            width,
            height,
            boxShadow: shadow,
            background: "color-mix(in srgb, var(--ground) 82%, transparent)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            touchAction: isOpen ? "none" : "manipulation",
            transformOrigin: "100% 100%",
          }}
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1, scale: pressed && !isOpen ? 0.9 : 1 }}
          transition={{ ...HOME_SPRING, delay: 0.35, scale: pressed ? springs.snappy : springs.popping }}
          onPointerDown={(e) => {
            swallow.current = false;
            if (!openRef.current) {
              setPressed(true);
              return;
            }
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, d: 0, t: performance.now(), v: 0, on: false };
          }}
          onPointerMove={(e) => {
            const g = drag.current;
            if (!g || g.id !== e.pointerId) return;
            const d = Math.max(e.clientY - g.y, e.clientX - g.x, 0);
            if (!g.on) {
              if (d < 8) return;
              g.on = true;
              swallow.current = true;
              open.stop();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {}
            }
            const now = performance.now();
            g.v = ((d - g.d) / Math.max(1, now - g.t)) * 1000;
            g.d = d;
            g.t = now;
            open.set(1 - Math.min(1, d / 160));
          }}
          onPointerLeave={() => setPressed(false)}
          onPointerUp={() => {
            setPressed(false);
            const g = drag.current;
            drag.current = null;
            if (!g?.on) return;
            const v = freshVelocity(g.v, g.t);
            if (open.get() < 0.72 || v > 450) fold(-v / 160);
            else setOpen(true);
          }}
          onPointerCancel={() => {
            setPressed(false);
            const g = drag.current;
            drag.current = null;
            if (g?.on) setOpen(true);
          }}
          onClickCapture={(e) => {
            if (!swallow.current) return;
            swallow.current = false;
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Hairline frame: where the square ends. */}
          <span aria-hidden className="pointer-events-none absolute inset-0 border border-ink" />
          {/* The ink: reading progress, then the bar itself. */}
          <motion.span aria-hidden className="pointer-events-none absolute bottom-0 right-0 bg-ink" style={{ width: inkW, height: inkH }} />

          {/* Collapsed face: the page you are on. Tap to open. */}
          <motion.button
            type="button"
            aria-label={`Sections. ${section}, ${pct}% read`}
            aria-expanded={isOpen}
            aria-hidden={isOpen}
            tabIndex={isOpen ? -1 : 0}
            onClick={expand}
            className="absolute inset-0 block"
            style={{ opacity: folioOpacity, pointerEvents: isOpen ? "none" : "auto", WebkitTapHighlightColor: "transparent" }}
          >
            <span className="mono absolute left-[6px] top-[5px] text-[10px] leading-none text-paper mix-blend-difference">
              {folio}
            </span>
          </motion.button>

          {/* Open face: the issue's sections. */}
          <motion.div
            className="absolute inset-x-0 bottom-0 text-paper"
            style={{ height: BAR_H, opacity: tabsOpacity, y: tabsY, pointerEvents: isOpen ? "auto" : "none" }}
            aria-hidden={!isOpen}
          >
            <motion.div
              aria-hidden
              className="absolute inset-x-0 top-0 h-[2px] origin-left bg-accent"
              style={{ scaleX: scrollYProgress }}
            />
            <div className="grid h-full p-[5px]" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
              {tabs.map((t) => {
                const on = t.id === active;
                return (
                  <motion.button
                    key={t.id}
                    type="button"
                    tabIndex={isOpen ? 0 : -1}
                    aria-current={on ? "true" : undefined}
                    whileTap={{ scale: 0.92 }}
                    transition={springs.snappy}
                    onClick={() => go(t)}
                    className="relative flex flex-col items-center justify-center gap-[3px]"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    {on ? (
                      <motion.span
                        layoutId="updatr-tab"
                        transition={springs.snappy}
                        className="pointer-events-none absolute inset-0 bg-paper"
                      />
                    ) : null}
                    <span className={`mono relative ${on ? "text-ink" : "text-paper/60"}`}>{t.label}</span>
                    <span className="relative block h-[11px] w-full overflow-hidden text-center">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {on ? (
                          <motion.span
                            key={section}
                            initial={{ y: 11, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -11, opacity: 0 }}
                            transition={springs.snappy}
                            className="mono block truncate px-1 text-[8.5px] leading-[11px] text-ink-soft"
                          >
                            {section}
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </nav>
  );
}
