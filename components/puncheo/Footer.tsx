"use client";

import { motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { CheckIcon, LockIcon } from "./Icons";
import type { PunchSheet } from "./usePunchSheet";

/*
 * One line at the thumb: a quiet search key, then the close action, then the
 * running total. The punches are sections of the walk now, so there are no tabs.
 *   bar  — Leia's full-width bar, flush to the bottom edge (polish: Leia's bevels).
 *   pill — AD Visual's white pill. Everything inside is round and sits on the
 *          same 6 px padding, so the radii are concentric (28 = 22 + 6).
 */

type Kind = "bar" | "pill";

/** Search: the lens beside the close action opens a field in its place. */
export type FooterSearch = { open: boolean; q: string; setQ: (q: string) => void; toggle: () => void };

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

function Total({ s, light }: { s: PunchSheet; light: boolean }) {
  return (
    <span className="shrink-0 text-right leading-none tabular-nums">
      <span className="mono block text-ink-faint" style={{ fontSize: 9 }}>
        {s.punch.name}
      </span>
      <span className={`mt-1 inline-block text-[22px] font-light tracking-[-0.03em] ${light ? "text-ground" : "text-ink"}`}>{String(s.t.done).padStart(2, "0")}</span>
      <span className={`text-[13px] font-light ${light ? "text-ink-soft" : "text-ink-faint"}`}>/{s.t.total}</span>
    </span>
  );
}

export function Footer({ s, kind, search, polish = false }: { s: PunchSheet; kind: Kind; search?: FooterSearch; polish?: boolean }) {
  const bar = kind === "bar";
  const round = bar ? "rounded-[6px]" : "rounded-full";

  // Quiet: a neutral key, never the accent. The close action is the one that stands out.
  const lens = search ? (
    <motion.button
      type="button"
      onClick={search.toggle}
      whileTap={{ scale: 0.94 }}
      transition={springs.snappy}
      aria-label={search.open ? "Cerrar búsqueda" : "Buscar"}
      aria-pressed={search.open}
      className={`grid h-11 w-11 shrink-0 place-items-center ${round} ${polish ? (search.open ? "leia-btn" : "leia-search") : ""}`}
      style={
        polish
          ? { color: search.open ? "var(--ink)" : "var(--hair)" }
          : bar
            ? { background: search.open ? "var(--ground)" : "transparent", color: search.open ? "var(--ink)" : "var(--ink-faint)" }
            : { background: search.open ? "var(--ink)" : "var(--card-2)", color: search.open ? "var(--ground)" : "var(--ink-3)" }
      }
    >
      {search.open ? <Cross /> : <Lens />}
    </motion.button>
  ) : null;

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
      ) : !s.ready ? (
        <LockIcon size={14} className={bar ? "text-ink-faint" : "text-ink-soft"} />
      ) : null}
      <span className={`truncate text-[13px] font-bold uppercase tracking-[0.02em] ${s.ready || s.isClosed ? "text-ground" : bar ? "text-ink-faint" : "text-ink-soft"}`}>
        {s.isClosed ? "Ficha cerrada" : "Cerrar ficha"}
      </span>
    </motion.button>
  );

  const field = search?.open ? (
    <label
      className={`flex h-11 min-w-0 flex-1 items-center gap-2 px-3.5 ${round} ${bar ? "bg-ink text-ink-faint" : "bg-card text-ink-faint"}`}
      style={polish ? { boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08)" } : undefined}
    >
      <Lens size={15} />
      <input
        id="puncheo-buscar"
        autoFocus
        value={search.q}
        onChange={(e) => search.setQ(e.target.value)}
        placeholder="Buscar check"
        enterKeyHint="search"
        className={`min-w-0 flex-1 bg-transparent text-[15px] outline-none ${bar ? "text-ground placeholder:text-ink-soft" : "text-ink placeholder:text-ink-faint"}`}
      />
    </label>
  ) : null;

  if (bar) {
    return (
      <nav className={`fixed inset-x-0 bottom-0 z-30 ${polish ? "leia-bar" : "bg-ink-2"}`} style={{ paddingBottom: "var(--sab)" }}>
        <div className="mx-auto flex h-[64px] max-w-[560px] items-center gap-2 px-3">
          {lens}
          {field ?? action}
          {search?.open ? null : (
            <span className="pl-2">
              <Total s={s} light />
            </span>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed left-1/2 z-30 w-[calc(100%-32px)] max-w-[488px] -translate-x-1/2" style={{ bottom: "calc(var(--sab) + 16px)" }}>
      <div className="flex items-center gap-1.5 rounded-full bg-ground p-1.5 shadow-[var(--shadow-mid)]">
        {lens}
        {field ?? action}
        {search?.open ? null : (
          <span className="pl-2 pr-[22px]">
            <Total s={s} light={false} />
          </span>
        )}
      </div>
    </nav>
  );
}
