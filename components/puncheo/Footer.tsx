"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
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
}: {
  s: PunchSheet;
  kind: Kind;
  search?: FooterSearch;
  polish?: boolean;
  /** The sections chip at the left (the legacy walks); B navigates from the rooms bar on top. */
  sections?: boolean;
}) {
  const bar = kind === "bar";
  const round = bar ? "rounded-[6px]" : "rounded-[10px]";
  const input = useRef<HTMLInputElement>(null);
  const open = !!search?.open;
  const spring = { type: "spring" as const, stiffness: 460, damping: 40 };

  const toggle = () => {
    if (!search) return;
    // Focus inside the tap itself, so the phone raises its keyboard.
    if (!open) input.current?.focus({ preventScroll: true });
    else input.current?.blur();
    search.toggle();
  };

  // The quiet search key (never the accent): Leia's charcoal tile, the lens white.
  const key = search ? (
    <motion.button
      type="button"
      onClick={toggle}
      aria-label="Buscar"
      tabIndex={open ? -1 : 0}
      animate={{ opacity: open ? 0 : 1, scale: open ? 0.6 : 1 }}
      transition={spring}
      className={`grid size-11 shrink-0 place-items-center ${round} ${polish ? "leia-search text-ground" : bar ? "text-ink-faint" : "bg-hair text-ink-soft"}`}
      style={{ pointerEvents: open ? "none" : "auto" }}
    >
      <Lens />
    </motion.button>
  ) : null;

  // Searching: the key turns into the close X, outside the field on its left, and
  // the field rolls out of it to the right: dark and sunk in, a well to type into.
  // Only opacity, scale and the clip move, so nothing reflows while it opens.
  const field = search ? (
    <div className={`pointer-events-none absolute inset-y-0 flex items-center ${bar ? "inset-x-3 gap-2" : "inset-x-1.5 gap-1.5"}`}>
      <motion.button
        type="button"
        onClick={toggle}
        aria-label="Cerrar búsqueda"
        tabIndex={open ? 0 : -1}
        initial={false}
        animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.6 }}
        transition={spring}
        className={`grid size-11 shrink-0 place-items-center ${round} ${polish ? "leia-search text-ground" : bar ? "bg-ink-3 text-ground" : "bg-hair text-ink-soft"}`}
        style={{ pointerEvents: open ? "auto" : "none" }}
      >
        <motion.span initial={false} animate={{ rotate: open ? 0 : -90 }} transition={spring} className="grid place-items-center">
          <Cross />
        </motion.span>
      </motion.button>
      <motion.label
        initial={false}
        animate={{ clipPath: open ? `inset(0% 0% 0% 0% round ${bar ? 6 : 10}px)` : `inset(0% 100% 0% 0% round ${bar ? 6 : 10}px)` }}
        transition={spring}
        className={`flex h-11 min-w-0 flex-1 items-center ${round} ${polish ? "leia-field-dark" : bar ? "leia-well" : "bg-ground shadow-[inset_0_0_0_1.5px_var(--hair-2)]"}`}
        style={{ pointerEvents: open ? "auto" : "none" }}
      >
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
          className={`h-full min-w-0 flex-1 bg-transparent pr-3 text-[16px] outline-none ${
            bar ? "text-ground placeholder:text-[#7d8087]" : "text-ink placeholder:text-ink-faint"
          }`}
        />
      </motion.label>
    </div>
  ) : null;

  // What steps aside while searching: it fades under the field (no reflow).
  const aside = { animate: { opacity: open ? 0 : 1 }, transition: { duration: 0.16 }, style: { pointerEvents: open ? ("none" as const) : ("auto" as const) } };

  const action = (
    <motion.button
      type="button"
      onClick={s.close}
      whileTap={{ scale: 0.97 }}
      transition={springs.snappy}
      className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-2 px-3 transition-colors duration-300 ${round} ${
        polish ? (s.isClosed ? "leia-fill-green" : s.ready ? "leia-cta" : "leia-cta-off") : ""
      }`}
      style={polish ? undefined : { background: s.isClosed ? "var(--ok)" : s.ready ? "var(--brand)" : bar ? "var(--ink-3)" : "var(--hair)" }}
    >
      {s.isClosed ? (
        <CheckIcon size={15} strokeWidth={2.4} className="text-ground" />
      ) : !s.ready && !polish ? (
        <LockIcon size={14} className={bar ? "text-ink-faint" : "text-ink-soft"} />
      ) : null}
      <span
        className={`truncate uppercase ${polish ? "leia-cond text-[18px]" : "text-[13px] font-bold tracking-[0.02em]"} ${
          s.ready || s.isClosed ? "text-ground" : polish ? "text-[#c9cbcf]" : bar ? "text-ink-faint" : "text-ink-soft"
        }`}
      >
        {s.isClosed ? "Ficha cerrada" : "Cerrar ficha"}
      </span>
    </motion.button>
  );

  // The filters and the predictive suggestions, rising from the footer (Leia's
  // "Taxes" strip above the checkout bar).
  const panel = (
    <AnimatePresence>
      {search?.open ? (
        <motion.div
          key="panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className={`absolute inset-x-0 bottom-full -z-10 ${polish ? "leia-strip" : bar ? "bg-ink" : "rounded-t-[16px] bg-ground shadow-[var(--shadow-soft)]"}`}
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
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  const row = (
    <>
      {sections ? (
        <motion.div className="shrink-0" {...aside}>
          <SectionControl s={s} tone={polish ? "leia" : bar ? "bar" : "pill"} />
        </motion.div>
      ) : null}
      {key}
      <motion.div className="flex min-w-0 flex-1" {...aside}>
        {action}
      </motion.div>
      {field}
    </>
  );

  if (bar) {
    return (
      <nav className={`fixed inset-x-0 bottom-0 z-30 ${polish ? "leia-bar" : "bg-ink-2"}`} style={{ paddingBottom: "var(--sab)" }}>
        {panel}
        <div className="relative mx-auto flex h-[60px] max-w-[560px] items-center gap-2 px-3">{row}</div>
      </nav>
    );
  }

  return (
    <nav className="fixed left-1/2 z-30 w-[calc(100%-32px)] max-w-[488px] -translate-x-1/2" style={{ bottom: "calc(var(--sab) + 16px)" }}>
      {panel}
      <div className="relative flex items-center gap-1.5 rounded-[16px] bg-ground p-1.5 shadow-[var(--shadow-mid)]">{row}</div>
    </nav>
  );
}
