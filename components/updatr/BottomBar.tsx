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
/** The page column the bar lines up with. */
const COLUMN = 520;
/** Ground-coloured gutter between the folded square's frame and its ink. */
const GUTTER = 3;
/** The ink square's share of the frame at the very top of the issue. */
const MIN_FILL = 0.16;
/** Histok's chrome spring. */
const HOME_SPRING = { type: "spring" as const, stiffness: 280, damping: 30, mass: 1 };
/** Scrolling this far with the bar open folds it back. */
const SCROLL_FOLD_PX = 48;
/** The tabs take taps only once they are this far in (no blind double-tap). */
const READY_AT = 0.9;
/** ...and not before this long after opening (a double tap is not a choice). */
const READY_MS = 320;
/** After choosing a section: time for the paper block to land before folding. */
const PICK_FOLD_MS = 240;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Home: a square in the bottom-right corner whose ink grows from the corner as
 * you read, from a small block at the cover to a full square at the colophon,
 * with the page you are on in its top-left. Tap it and the ink keeps growing:
 * the square opens into the home bar (the issue's sections, the active one
 * naming where you are). Choosing a section, tapping elsewhere (that tap only
 * dismisses), scrolling, Escape, or a pull down or right on the bar folds it
 * back into the square. One spring value (open, 0..1) drives the whole morph,
 * so a finger can hold it anywhere in between. It steps aside while an article
 * is open.
 */
export function BottomBar({
  tabs,
  active,
  section,
  folio,
  hidden = false,
  onGo,
}: {
  tabs: Tab[];
  active: string;
  section: string;
  /** Page number of the section in view, as in the contents. */
  folio: string;
  /** An article is open: the square steps out of the way. */
  hidden?: boolean;
  onGo: (tab: Tab) => void;
}) {
  const { scrollYProgress } = useScroll();
  const box = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [isOpen, setIsOpen] = useState(false);
  const openRef = useRef(false);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [pressed, setPressed] = useState(false);
  const open = useMotionValue(0);
  const span = useMotionValue(360); // the bar's full width, measured
  const foldTimer = useRef<number | null>(null);
  const jumping = useRef(false);
  const focusTabOnReady = useRef(false);
  const refocus = useRef(false);
  const openedAt = useRef(0);
  const sectionRef = useRef(section);
  const activeRef = useRef(active);
  useEffect(() => {
    sectionRef.current = section;
    activeRef.current = active;
  });

  // The open bar spans the page column (520px at most) less the insets.
  useLayoutEffect(() => {
    const measure = () =>
      span.set(Math.max(SQUARE, Math.min(document.documentElement.clientWidth, COLUMN) - INSET * 2));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [span]);

  // Spoken progress, written straight to the label (no re-render per scroll step).
  useEffect(() => {
    const label = (v: number) => `Sections. ${section}, ${Math.round(v * 100)}% read`;
    face.current?.setAttribute("aria-label", label(scrollYProgress.get()));
    return scrollYProgress.on("change", (v) => face.current?.setAttribute("aria-label", label(v)));
  }, [scrollYProgress, section]);

  // The tabs come alive only once they are actually there.
  useEffect(
    () =>
      open.on("change", (v) => {
        const r = openRef.current && v >= READY_AT;
        if (r === readyRef.current) return;
        readyRef.current = r;
        setReady(r);
        if (r && focusTabOnReady.current) {
          focusTabOnReady.current = false;
          tabRefs.current[activeRef.current]?.focus();
        }
      }),
    [open],
  );

  // The frame morphs from the corner square to the full bar.
  const width = useTransform(() => lerp(SQUARE, span.get(), clamp01(open.get())));
  const height = useTransform(() => lerp(SQUARE, BAR_H, clamp01(open.get())));
  // Folded, a ground gutter keeps the ink apart from whatever is behind (a dark
  // photo, the dossier): the progress always reads as a block inside a frame.
  const gutter = useTransform(open, [0, 0.6], [GUTTER, 0], { clamp: true });
  // The ink grows from the corner with reading, then fills the bar as it opens;
  // it outruns the frame so the tabs only ever appear on ink.
  const fill = useTransform(() => {
    const read = MIN_FILL + (1 - MIN_FILL) * clamp01(scrollYProgress.get());
    return lerp(read, 1, clamp01(open.get() * 1.7));
  });
  const inkW = useTransform(() => (width.get() - 2 * gutter.get()) * fill.get());
  const inkH = useTransform(() => (height.get() - 2 * gutter.get()) * fill.get());
  const folioOpacity = useTransform(open, [0, 0.35], [1, 0], { clamp: true });
  const tabsOpacity = useTransform(open, [0.6, 1], [0, 1], { clamp: true });
  const tabsY = useTransform(open, [0, 1], [10, 0], { clamp: true });
  const shadow = useTransform(
    open,
    (v) => `0 18px 40px -18px rgba(11,11,11,${(0.55 * clamp01(v)).toFixed(3)})`,
  );

  const clearFoldTimer = () => {
    if (foldTimer.current !== null) window.clearTimeout(foldTimer.current);
    foldTimer.current = null;
  };
  useEffect(() => clearFoldTimer, []);

  const setOpen = (v: boolean, velocity = 0) => {
    clearFoldTimer();
    if (!v) {
      jumping.current = false;
      setPicked(null);
      // Keyboard focus never stays on a face that is going away: it returns
      // to the square once the square is live again (see below).
      if (box.current?.contains(document.activeElement)) refocus.current = true;
    } else {
      openedAt.current = performance.now();
    }
    openRef.current = v;
    setIsOpen(v);
    animate(open, v ? 1 : 0, { ...HOME_SPRING, velocity });
  };
  const expand = (fromKeyboard: boolean) => {
    if (openRef.current) return;
    haptic.select();
    focusTabOnReady.current = fromKeyboard;
    setOpen(true);
  };
  const fold = (velocity = 0) => {
    if (!openRef.current) return;
    setOpen(false, velocity);
  };

  useEffect(() => {
    if (isOpen || !refocus.current) return;
    refocus.current = false;
    face.current?.focus({ preventScroll: true });
  }, [isOpen]);

  // An article opening folds the bar and the square steps aside.
  useEffect(() => {
    if (hidden) fold();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  // While open: a tap elsewhere (which then only dismisses), a scroll, or Escape folds it back.
  useEffect(() => {
    if (!isOpen) return;
    const y0 = window.scrollY;
    const onDown = (e: PointerEvent) => {
      if (!box.current || box.current.contains(e.target as Node)) return;
      fold();
      // Like an iOS menu: the tap that dismisses does nothing else. A drag or a
      // hold that starts there still scrolls or lifts as usual.
      const s = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        document.removeEventListener("click", s, true);
      };
      document.addEventListener("click", s, true);
      window.setTimeout(() => document.removeEventListener("click", s, true), 600);
    };
    const onScroll = () => {
      if (!jumping.current && Math.abs(window.scrollY - y0) > SCROLL_FOLD_PX) fold();
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
      // A pending swallow is for the tap that folded the bar: it outlives the
      // open state and removes itself on that click or after its timeout.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Pull the open bar down or to the right: it shrinks back under the finger.
  // Upward swipes stay native, so the page scrolls (and that folds the bar).
  const drag = useRef<{ id: number; x: number; y: number; d: number; t: number; v: number; on: boolean } | null>(null);
  const swallowClick = useRef(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    let claim: "unknown" | "ours" | "page" = "unknown";
    const onStart = (e: TouchEvent) => {
      claim = "unknown";
      sx = e.touches[0]?.clientX ?? 0;
      sy = e.touches[0]?.clientY ?? 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!openRef.current || e.touches.length !== 1) return;
      if (claim === "unknown") {
        const dx = e.touches[0].clientX - sx;
        const dy = e.touches[0].clientY - sy;
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
          if (e.cancelable) e.preventDefault();
          return;
        }
        claim = dy > 0 || dx > Math.abs(dy) ? "ours" : "page";
      }
      if (claim === "ours" && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
    };
  }, []);

  const go = (t: Tab, at: number) => {
    if (!readyRef.current || at - openedAt.current < READY_MS) return;
    haptic.select();
    // The paper block lands on the choice at once; the page follows; then fold.
    setPicked(t.id);
    jumping.current = true;
    onGo(t);
    clearFoldTimer();
    foldTimer.current = window.setTimeout(() => fold(), PICK_FOLD_MS);
  };
  const current = picked ?? active;

  return (
    // Only the square itself is fixed: iOS Safari tints its toolbar from
    // elements fixed at the screen edge, so no transparent full-width strip.
    <nav aria-label="Sections">
        <motion.div
          ref={box}
          data-updatr-chrome={isOpen ? "bottom" : "corner"}
          className="fixed z-30 overflow-hidden"
          style={{
            right: `max(${INSET}px, calc((100% - ${COLUMN}px) / 2 + ${INSET}px))`,
            bottom: `calc(var(--sab) + ${INSET}px)`,
            width,
            height,
            boxShadow: shadow,
            background: "color-mix(in srgb, var(--ground) 86%, transparent)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            touchAction: isOpen ? "pan-y" : "manipulation",
            transformOrigin: "100% 100%",
            pointerEvents: hidden ? "none" : "auto",
          }}
          initial={{ y: 90, opacity: 0 }}
          animate={{
            y: hidden ? 90 : 0,
            opacity: hidden ? 0 : 1,
            scale: pressed && !isOpen ? 0.9 : 1,
          }}
          transition={{ ...HOME_SPRING, delay: hidden ? 0 : 0.35, scale: pressed ? springs.snappy : springs.popping }}
          onPointerDown={(e) => {
            swallowClick.current = false;
            if (!openRef.current) {
              setPressed(true);
              return;
            }
            if (drag.current) return; // one finger drives the bar
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, d: 0, t: performance.now(), v: 0, on: false };
          }}
          onPointerMove={(e) => {
            const g = drag.current;
            if (!g || g.id !== e.pointerId) return;
            const d = Math.max(e.clientY - g.y, e.clientX - g.x, 0);
            if (!g.on) {
              if (d < 8) return;
              g.on = true;
              swallowClick.current = true;
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
          onPointerUp={(e) => {
            setPressed(false);
            const g = drag.current;
            if (!g || g.id !== e.pointerId) return;
            drag.current = null;
            if (!g.on) return;
            const v = freshVelocity(g.v, g.t);
            if (open.get() < 0.72 || v > 450) fold(-v / 160);
            else setOpen(true);
          }}
          onPointerCancel={(e) => {
            setPressed(false);
            const g = drag.current;
            if (!g || g.id !== e.pointerId) return;
            drag.current = null;
            // The page took the touch (an upward swipe scrolls): settle open.
            if (openRef.current) setOpen(true);
          }}
          onClickCapture={(e) => {
            if (!swallowClick.current) return;
            swallowClick.current = false;
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Hairline frame: where the square ends. */}
          <span aria-hidden className="pointer-events-none absolute inset-0 border border-ink" />
          {/* The ink: reading progress, then the bar itself. */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute bg-ink"
            style={{ right: gutter, bottom: gutter, width: inkW, height: inkH }}
          />

          {/* Folded face: the page you are on. Tap to open. The blend sits on
              the element that fades, so the folio stays legible mid-fade. */}
          <motion.button
            ref={face}
            type="button"
            aria-expanded={isOpen}
            inert={isOpen}
            onClick={(e) => expand(e.detail === 0)}
            className="absolute inset-0 block"
            style={{
              opacity: folioOpacity,
              mixBlendMode: "difference",
              pointerEvents: isOpen ? "none" : "auto",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span className="mono absolute left-[7px] top-[6px] text-[10px] leading-none text-paper">{folio}</span>
          </motion.button>

          {/* Open face: the issue's sections. */}
          <motion.div
            className="absolute inset-x-0 bottom-0 text-paper"
            style={{ height: BAR_H, opacity: tabsOpacity, y: tabsY, pointerEvents: ready ? "auto" : "none" }}
            inert={!isOpen}
          >
            <motion.div
              aria-hidden
              className="absolute inset-x-0 top-0 h-[2px] origin-left bg-accent"
              style={{ scaleX: scrollYProgress }}
            />
            <div className="grid h-full p-[5px]" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
              {tabs.map((t) => {
                const on = t.id === current;
                return (
                  <motion.button
                    key={t.id}
                    ref={(el) => {
                      tabRefs.current[t.id] = el;
                    }}
                    type="button"
                    aria-current={on ? "true" : undefined}
                    whileTap={{ scale: 0.92 }}
                    transition={springs.snappy}
                    onClick={(e) => go(t, e.timeStamp)}
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
                        {on && !picked ? (
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
    </nav>
  );
}
