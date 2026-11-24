"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { CheckIcon, LockIcon } from "./Icons";
import type { PunchSheet } from "./usePunchSheet";
import { SectionControl } from "./SectionControl";

/*
 * One line at the thumb: the sections (dots; press for the fan), a quiet search
 * key, then the close action.
 *   bar  — Leia's full-width bar, flush to the bottom edge (polish: Leia's bevels).
 *   pill — AD Visual's bottom bar: a white panel (radius 16) holding flat grey
 *          keys (radius 10) on a 6 px padding, so the radii stay concentric.
 */

type Kind = "bar" | "pill";

/** Search: the key grows into the field; the filters and suggestions rise from the footer. */
export type FooterSearch = {
  open: boolean;
  q: string;
  setQ: (q: string) => void;
  toggle: () => void;
  filters: { id: string; label: string; count: number }[];
  filter: number;
  setFilter: (i: number) => void;
  /** Predictive completions of what has been typed. */
  suggestions: string[];
};

function Lens({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </svg>
  );
}

type Cell = { id: string; label: string; count: React.ReactNode; on: boolean; done?: boolean };

/**
 * Leia's category cells: a lit strip split by etched lines, the chosen cell a
 * pressed blue block, the name over its count. More cells than fit scroll
 * sideways; the chosen one is brought into view when the strip appears.
 */
function Cells({ items, onPick, label }: { items: Cell[]; onPick: (i: number) => void; label: string }) {
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = strip.current?.querySelector<HTMLElement>("[aria-current='true']");
    on?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);
  return (
    <div ref={strip} role="group" aria-label={label} className="leia-tabs no-scrollbar flex overflow-x-auto overscroll-x-contain">
      {items.map((x, i) => (
        <button
          key={x.id}
          type="button"
          onClick={() => onPick(i)}
          aria-current={x.on ? "true" : undefined}
          className={`relative flex h-[50px] min-w-[60px] flex-1 shrink-0 flex-col items-center justify-center px-1 ${i < items.length - 1 ? "leia-tab-sep" : ""} ${x.on ? "leia-tab-on" : ""}`}
        >
          <span className={`max-w-full truncate text-[13.5px] ${x.on ? "text-ground" : "leia-emboss text-ink"}`}>{x.label}</span>
          <span className={`text-[10px] tabular-nums ${x.on ? "text-brand-2" : x.done ? "text-ok-deep" : "text-[#8a8d93]"}`}>{x.count}</span>
        </button>
      ))}
    </div>
  );
}

/** A floor plan: the rooms key. */
function Plan() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="8" height="10" rx="1.2" />
      <rect x="13" y="3" width="8" height="6" rx="1.2" />
      <rect x="3" y="15" width="8" height="6" rx="1.2" />
      <rect x="13" y="11" width="8" height="10" rx="1.2" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="square" aria-hidden>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

export function Footer({
  s,
  kind,
  search,
  polish = false,
  sections = true,
  rooms = false,
  framed = false,
  frameRadius = 28,
}: {
  s: PunchSheet;
  kind: Kind;
  search?: FooterSearch;
  polish?: boolean;
  /** The sections chip at the left (the legacy walks); B navigates from the rooms bar on top. */
  sections?: boolean;
  /** B: a rooms key that raises the rooms as filter keys from behind the bar. */
  rooms?: boolean;
  /** Inside a vvv frame: the bar sticks to the frame's bottom (the frame itself
      shrinks above the keyboard), and the home indicator is out in the black. */
  framed?: boolean;
  /** The frame's corner radius, which the keys in the bar's corners follow. */
  frameRadius?: number;
}) {
  const bar = kind === "bar";
  const round = bar ? "rounded-[6px]" : "rounded-[10px]";
  const gap = bar ? 8 : 6;
  const input = useRef<HTMLInputElement>(null);
  const open = !!search?.open;
  // In a vvv frame, a key in one of the bar's bottom corners rounds that corner
  // as the frame's own curve drawn inward by the key's distance from it (12 px
  // from the side, 8 px from the bottom): an elliptical corner, never the
  // frame's full radius. The other corners keep the bar's 6.
  const inner = (d: number) => Math.max(6, frameRadius - d);
  const curve = `${inner(12)}px ${inner(8)}px`;
  const cornerL = framed ? { borderBottomLeftRadius: curve } : undefined;
  const cornerR = framed ? { borderBottomRightRadius: curve } : undefined;
  const glide = { transition: "border-radius 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)" };
  const nav = useRef<HTMLElement>(null);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const showRooms = rooms && roomsOpen && !open;
  // The rooms strip closes on a tap anywhere outside the bar.
  useEffect(() => {
    if (!showRooms) return;
    const off = (e: PointerEvent) => {
      if (!nav.current?.contains(e.target as Node)) setRoomsOpen(false);
    };
    window.addEventListener("pointerdown", off);
    return () => window.removeEventListener("pointerdown", off);
  }, [showRooms]);

  // One spring drives the whole change: the field grows out of the key and pushes
  // the close action, which shrinks away as the field takes its room. They share
  // the line (each takes its part of it), so they never overlap.
  const p = useMotionValue(open ? 1 : 0);
  useEffect(() => {
    const run = animate(p, open ? 1 : 0, { type: "spring", stiffness: 300, damping: 34 });
    return () => run.stop();
  }, [open, p]);
  const fieldGrow = useTransform(p, (v) => Math.max(0, v));
  const fieldGap = useTransform(p, (v) => Math.max(0, Math.min(1, v)) * gap);
  const ctaGrow = useTransform(p, (v) => Math.max(0, 1 - v));
  const ctaGap = useTransform(p, (v) => Math.max(0, Math.min(1, 1 - v)) * gap);
  const ctaInk = useTransform(p, [0, 0.4], [1, 0]);
  const fieldInk = useTransform(p, [0.25, 0.7], [0, 1]);

  // The phone's keyboard covers the bottom of the screen; while the search is open
  // the bar rides on top of it (the visual viewport says how much it covers).
  useEffect(() => {
    const vv = window.visualViewport;
    const el = nav.current;
    if (framed || !open || !vv || !el) return;
    const fit = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.transform = kb > 40 ? `translateY(${-kb}px)` : "";
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
      el.style.transform = "";
    };
  }, [open, framed]);

  const toggle = () => {
    if (!search) return;
    setRoomsOpen(false);
    // Focus inside the tap itself, so the phone raises its keyboard.
    if (!open) input.current?.focus({ preventScroll: true });
    else input.current?.blur();
    search.toggle();
  };

  // The search key, quiet (never the accent): Leia's charcoal tile. Opened, its lens
  // turns into the close X, and it stays put at the left, outside the field.
  const key = search ? (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? "Cerrar búsqueda" : "Buscar"}
      // It takes the corner's curve once the rooms key folds away and it slides into the corner.
      style={framed ? { ...glide, ...(open || !rooms ? cornerL : {}) } : undefined}
      className={`relative grid size-11 shrink-0 place-items-center ${round} ${
        polish ? "leia-search text-ground" : bar ? (open ? "bg-ink-3 text-ground" : "text-ink-faint") : "bg-hair text-ink-soft"
      }`}
    >
      <motion.span
        className="absolute inset-0 grid place-items-center"
        initial={false}
        animate={{ opacity: open ? 0 : 1, scale: open ? 0.4 : 1, rotate: open ? 90 : 0 }}
        transition={{ type: "spring", stiffness: 520, damping: 30 }}
      >
        <Lens />
      </motion.span>
      <motion.span
        className="absolute inset-0 grid place-items-center"
        initial={false}
        animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.4, rotate: open ? 0 : -90 }}
        transition={{ type: "spring", stiffness: 520, damping: 30 }}
      >
        <Cross />
      </motion.span>
    </button>
  ) : null;

  // The field: dark and sunk in (Leia's search, opened), a well to type into.
  const field = search ? (
    <motion.label
      style={{ flexGrow: fieldGrow, marginLeft: fieldGap, pointerEvents: open ? "auto" : "none", ...cornerR }}
      className={`flex h-11 min-w-0 basis-0 items-center overflow-hidden ${round} ${
        polish ? "leia-field-dark" : bar ? "leia-well" : "bg-ground shadow-[inset_0_0_0_1.5px_var(--hair-2)]"
      }`}
    >
      {/* The input keeps a real width while the field is folded, clipped by it: iOS
          won't raise the keyboard for an input with no size. */}
      <motion.span style={{ opacity: fieldInk }} className="flex h-full min-w-0 flex-1 items-center">
        <span className={`grid w-9 shrink-0 place-items-center ${bar ? "text-[#8a8d93]" : "text-ink-faint"}`}>
          <Lens size={15} />
        </span>
        <input
          ref={input}
          id="puncheo-buscar"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          value={search.q}
          onChange={(e) => search.setQ(e.target.value)}
          placeholder="Buscar check"
          enterKeyHint="search"
          autoComplete="off"
          className={`h-full min-w-[200px] flex-1 bg-transparent pr-3 text-[16px] outline-none ${
            bar ? "text-ground placeholder:text-[#7d8087]" : "text-ink placeholder:text-ink-faint"
          }`}
        />
      </motion.span>
    </motion.label>
  ) : null;

  const action = (
    <motion.button
      type="button"
      onClick={s.close}
      whileTap={{ scale: 0.97 }}
      transition={springs.snappy}
      tabIndex={open ? -1 : 0}
      className={`flex h-11 w-full min-w-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap px-3 transition-colors duration-300 ${round} ${
        polish ? (s.isClosed ? "leia-fill-green" : s.ready ? "leia-cta" : "leia-cta-off") : ""
      }`}
      style={{ ...(polish ? {} : { background: s.isClosed ? "var(--ok)" : s.ready ? "var(--brand)" : bar ? "var(--ink-3)" : "var(--hair)" }), ...cornerR }}
    >
      <motion.span style={{ opacity: ctaInk }} className="flex min-w-0 items-center gap-2">
        {s.isClosed ? (
          <CheckIcon size={15} strokeWidth={2.4} className="text-ground" />
        ) : !s.ready && !polish ? (
          <LockIcon size={14} className={bar ? "text-ink-faint" : "text-ink-soft"} />
        ) : null}
        <span
          className={`uppercase ${polish ? "leia-cond text-[18px]" : "text-[13px] font-bold tracking-[0.02em]"} ${
            s.ready || s.isClosed ? "text-ground" : polish ? "text-[#c9cbcf]" : bar ? "text-ink-faint" : "text-ink-soft"
          }`}
        >
          {s.isClosed ? "Ficha cerrada" : "Cerrar ficha"}
        </span>
      </motion.span>
    </motion.button>
  );

  // The filters and the predictive suggestions: Leia's "Taxes" strip, sliding up
  // from behind the bar (the bar stays on top of it, the clip hides what's below).
  const panel = (
    <div className="pointer-events-none absolute inset-x-0 bottom-full overflow-hidden">
      <AnimatePresence mode="wait">
        {showRooms ? (
          <motion.div
            key="rooms"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
            className={`pointer-events-auto ${polish ? "leia-strip" : bar ? "bg-ink" : "rounded-t-[16px] bg-ground"}`}
          >
            {/* The rooms as Leia's category cells: the one being read is the blue cell. */}
            {polish ? (
              <Cells
                label="Cuartos"
                items={s.sections.map((x, i) => {
                  const t = s.sectionTallies[i];
                  return { id: x.id, label: x.name, count: `${t.done}/${t.total}`, on: i === s.section, done: t.done === t.total };
                })}
                onPick={(i) => {
                  setRoomsOpen(false);
                  s.travelTo(i);
                }}
              />
            ) : (
              <div className="grid grid-cols-3 gap-1.5 px-3 py-2">
                {s.sections.map((x, i) => {
                  const on = i === s.section;
                  const t = s.sectionTallies[i];
                  return (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => {
                        setRoomsOpen(false);
                        s.travelTo(i);
                      }}
                      aria-current={on ? "true" : undefined}
                      className={`flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-[4px] px-1 leading-none ${on ? "bg-brand text-ground" : bar ? "bg-ink-3 text-hair" : "bg-card text-ink-2"}`}
                    >
                      <span className="min-w-0 truncate text-[14px]">{x.name}</span>
                      <span className="text-[12px] tabular-nums opacity-70">
                        {t.done}/{t.total}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : search?.open ? (
          <motion.div
            key="panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className={`pointer-events-auto ${polish ? "leia-strip" : bar ? "bg-ink" : "rounded-t-[16px] bg-ground"}`}
          >
            {search.suggestions.length ? (
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pt-2">
                {search.suggestions.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => search.setQ(w)}
                    className={`h-8 shrink-0 rounded-[4px] px-2.5 text-[14px] ${polish ? "leia-btn leia-emboss text-ink" : bar ? "bg-ink-3 text-ground" : "bg-card text-ink-2"}`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            ) : null}
            {polish ? (
              <div className="mt-2">
                <Cells label="Filtros" items={search.filters.map((f, i) => ({ id: f.id, label: f.label, count: f.count, on: i === search.filter }))} onPick={(i) => search.setFilter(i)} />
              </div>
            ) : (
            <div className="flex gap-1.5 px-3 py-2">
              {search.filters.map((f, i) => {
                const on = i === search.filter;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => search.setFilter(i)}
                    aria-pressed={on}
                    className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-[4px] px-1 leading-none ${
                      polish ? (on ? "leia-tab-on text-ground" : "leia-btn text-ink") : on ? "bg-brand text-ground" : bar ? "bg-ink-3 text-hair" : "bg-card text-ink-2"
                    }`}
                  >
                    <span className={`min-w-0 truncate text-[14px] ${polish && !on ? "leia-emboss" : ""}`}>{f.label}</span>
                    <span className={`text-[12px] tabular-nums ${on ? "text-brand-2" : polish ? "text-[#8a8d93]" : "opacity-60"}`}>{f.count}</span>
                  </button>
                );
              })}
            </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );

  const row = (
    <>
      {sections ? (
        <motion.div
          className="shrink-0 overflow-hidden"
          initial={false}
          animate={{ width: open ? 0 : "auto", opacity: open ? 0 : 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
        >
          <div style={{ paddingRight: gap }}>
            <SectionControl s={s} tone={polish ? "leia" : bar ? "bar" : "pill"} />
          </div>
        </motion.div>
      ) : null}
      {rooms ? (
        <motion.div
          className="shrink-0 overflow-hidden"
          initial={false}
          animate={{ width: open ? 0 : "auto", opacity: open ? 0 : 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
        >
          <div style={{ paddingRight: gap }}>
            <button
              type="button"
              onClick={() => setRoomsOpen((o) => !o)}
              aria-label="Cuartos"
              aria-expanded={showRooms}
              tabIndex={open ? -1 : 0}
              style={cornerL}
              className={`grid size-11 place-items-center ${round} ${polish ? (showRooms ? "leia-tab-on text-ground" : "leia-search text-ground") : showRooms ? "bg-brand text-ground" : "bg-ink-3 text-ground"}`}
            >
              <Plan />
            </button>
          </div>
        </motion.div>
      ) : null}
      {key}
      {field}
      <motion.div style={{ flexGrow: ctaGrow, marginLeft: ctaGap, pointerEvents: open ? "none" : "auto" }} className="flex min-w-0 basis-0 overflow-hidden">
        {action}
      </motion.div>
    </>
  );

  if (bar) {
    return (
      <nav ref={nav} className={`${framed ? "sticky" : "fixed inset-x-0"} bottom-0 z-30`}>
        {panel}
        <div className={`relative z-10 ${polish ? "leia-bar" : "bg-ink-2"}`} style={{ paddingBottom: framed ? undefined : "var(--sab)" }}>
          <div className="mx-auto flex h-[60px] max-w-[560px] items-center px-3">{row}</div>
        </div>
        {/* The bar's skirt: riding on the keyboard, the phone's see-through accessory
            row and address pill sit between the two, so the bar carries its own
            colour down behind them instead of letting the page show through. Out of
            sight below the screen while the keyboard is down. */}
        {framed ? null : <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-full z-10 h-[100vh] ${polish ? "bg-[#30343a]" : "bg-ink-2"}`} />}
      </nav>
    );
  }

  return (
    <nav ref={nav} className="fixed left-1/2 z-30 w-[calc(100%-32px)] max-w-[488px] -translate-x-1/2" style={{ bottom: "calc(var(--sab) + 16px)" }}>
      {panel}
      <div className="relative z-10 flex items-center rounded-[16px] bg-ground p-1.5 shadow-[var(--shadow-mid)]">{row}</div>
    </nav>
  );
}
