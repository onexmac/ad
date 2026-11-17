"use client";

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

export function Footer({ s, kind, search, polish = false }: { s: PunchSheet; kind: Kind; search?: FooterSearch; polish?: boolean }) {
  const bar = kind === "bar";
  const round = bar ? "rounded-[6px]" : "rounded-[10px]";

  // The search key, quiet (never the accent). Opened, the same element grows into the
  // field: it turns hollow (a well you type into), and the close X grows in at its end.
  const searchBox = search ? (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      className={`relative flex h-11 items-center ${round} ${search.open ? "min-w-0 flex-1" : "w-11 shrink-0"} ${
        polish ? (search.open ? "leia-field" : "leia-search") : ""
      }`}
      style={
        polish
          ? undefined
          : search.open
            ? { background: bar ? "transparent" : "var(--ground)", boxShadow: bar ? "inset 0 0 0 1.5px var(--ink-soft)" : "inset 0 0 0 1.5px var(--hair-2)" }
            : bar
              ? { background: "transparent" }
              : { background: "var(--hair)" }
      }
    >
      {search.open ? (
        <>
          <motion.span layout="position" className={`grid w-10 shrink-0 place-items-center ${polish ? "text-[#8a8d93]" : "text-ink-faint"}`}>
            <Lens size={15} />
          </motion.span>
          <input
            id="puncheo-buscar"
            autoFocus
            value={search.q}
            onChange={(e) => search.setQ(e.target.value)}
            placeholder="Buscar check"
            enterKeyHint="search"
            autoComplete="off"
            className={`min-w-0 flex-1 bg-transparent text-[15px] outline-none ${
              polish ? "text-ink placeholder:text-[#9a9da3]" : bar ? "text-ground placeholder:text-ink-soft" : "text-ink placeholder:text-ink-faint"
            }`}
          />
          <motion.button
            type="button"
            onClick={search.toggle}
            aria-label="Cerrar búsqueda"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 26, delay: 0.08 }}
            className={`mr-1.5 grid size-8 shrink-0 place-items-center rounded-full ${polish ? "bg-[#c9cbcf] text-ground" : bar ? "bg-ink-3 text-ground" : "bg-hair text-ink-soft"}`}
          >
            <Cross />
          </motion.button>
        </>
      ) : (
        <button
          type="button"
          onClick={search.toggle}
          aria-label="Buscar"
          className={`grid h-full w-full place-items-center ${polish ? "text-ground" : bar ? "text-ink-faint" : "text-ink-soft"}`}
        >
          <Lens />
        </button>
      )}
    </motion.div>
  ) : null;

  // What leaves the bar while searching folds away sideways.
  const fold = { initial: { opacity: 0, width: 0 }, animate: { opacity: 1, width: "auto" }, exit: { opacity: 0, width: 0 }, transition: { type: "spring" as const, stiffness: 420, damping: 36 } };

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
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pt-2.5">
              {search.suggestions.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => search.setQ(w)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${polish ? "leia-btn text-ink" : bar ? "bg-ink-3 text-ground" : "bg-card text-ink-2"}`}
                >
                  {w}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex gap-1.5 px-3 py-2.5">
            {search.filters.map((f, i) => {
              const on = i === search.filter;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => search.setFilter(i)}
                  aria-pressed={on}
                  className={`flex h-10 min-w-0 flex-1 flex-col items-center justify-center rounded-[4px] leading-none ${
                    polish ? (on ? "leia-tab-on text-ground" : "leia-btn text-ink") : on ? "bg-brand text-ground" : bar ? "bg-ink-3 text-hair" : "bg-card text-ink-2"
                  }`}
                >
                  <span className="max-w-full truncate px-1 text-[13px]">{f.label}</span>
                  <span className={`mt-0.5 text-[10px] tabular-nums ${on ? "text-brand-2" : polish ? "text-[#8a8d93]" : "opacity-60"}`}>{f.count}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (bar) {
    return (
      <nav className={`fixed inset-x-0 bottom-0 z-30 ${polish ? "leia-bar" : "bg-ink-2"}`} style={{ paddingBottom: "var(--sab)" }}>
        {panel}
        <div className="mx-auto flex h-[64px] max-w-[560px] items-center gap-2 px-3">
          <AnimatePresence initial={false}>
            {search?.open ? null : (
              <motion.div key="sections" className="shrink-0" {...fold}>
                <SectionControl s={s} tone={polish ? "leia" : "bar"} />
              </motion.div>
            )}
          </AnimatePresence>
          {searchBox}
          <AnimatePresence initial={false}>
            {search?.open ? null : (
              <motion.div key="close" className="flex min-w-0 flex-1 overflow-hidden" {...fold}>
                {action}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed left-1/2 z-30 w-[calc(100%-32px)] max-w-[488px] -translate-x-1/2" style={{ bottom: "calc(var(--sab) + 16px)" }}>
      {panel}
      <div className="flex items-center gap-1.5 rounded-[16px] bg-ground p-1.5 shadow-[var(--shadow-mid)]">
        <AnimatePresence initial={false}>
          {search?.open ? null : (
            <motion.div key="sections" className="shrink-0" {...fold}>
              <SectionControl s={s} tone="pill" />
            </motion.div>
          )}
        </AnimatePresence>
        {searchBox}
        <AnimatePresence initial={false}>
          {search?.open ? null : (
            <motion.div key="close" className="flex min-w-0 flex-1 overflow-hidden" {...fold}>
              {action}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
