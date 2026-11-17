"use client";

import { motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import type { RoomSheet } from "@/data/puncheo/rooms";
import { CheckIcon, LockIcon } from "./Icons";
import type { PunchSheet } from "./usePunchSheet";

/*
 * One line at the thumb, in three dresses, all crossing A's dock with Leia's
 * checkout: the punches as tabs (the active one a solid blue block), the close
 * action in Leia's condensed caps, and the running total set large and light.
 *   dock — A's floating dark bar.
 *   bar  — Leia's full-width slate bar, flush to the bottom edge.
 *   pill — AD Visual's white pill with soft shadow.
 */

type Kind = "dock" | "bar" | "pill";

/** Search, where a layout offers it: the lens next to the close action opens a field in its place. */
export type FooterSearch = { open: boolean; q: string; setQ: (q: string) => void; toggle: () => void };

function Lens({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </svg>
  );
}

function Total({ done, total, light, big = true }: { done: number; total: number; light: boolean; big?: boolean }) {
  return (
    <span className="shrink-0 leading-none tabular-nums">
      <span className={`${big ? "text-[26px]" : "text-[21px]"} font-light tracking-[-0.03em] ${light ? "text-ground" : "text-ink"}`}>{String(done).padStart(2, "0")}</span>
      <span className={`${big ? "text-[15px]" : "text-[13px]"} font-light ${light ? "text-ink-soft" : "text-ink-faint"}`}>/{total}</span>
    </span>
  );
}

export function Footer({ s, sheet, kind, search, polish = false }: { s: PunchSheet; sheet: RoomSheet; kind: Kind; search?: FooterSearch; polish?: boolean }) {
  const dark = kind !== "pill";
  const tabs = sheet.punches.map((p, i) => {
    const active = s.tab === i;
    const pt = s.punchTallies[i];
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => s.switchTo(i)}
        aria-pressed={active}
        aria-label={`${p.name}, ${pt.done} de ${pt.total}`}
        className={`relative flex shrink-0 flex-col items-start justify-center px-3 leading-none ${
          kind === "bar" ? "h-full w-[56px] border-r border-ink" : kind === "pill" ? "h-11 w-[52px] rounded-full" : "h-12 w-[54px] rounded-[16px]"
        }`}
      >
        {active ? (
          <motion.span
            layoutId={`foot-tab-${kind}`}
            transition={springs.snappy}
            className={`pointer-events-none absolute inset-0 ${polish ? "leia-tab-on" : "bg-brand"} ${kind === "bar" ? "" : kind === "pill" ? "rounded-full" : "rounded-[16px]"}`}
          />
        ) : null}
        <span className={`mono relative ${active ? "text-ground" : dark ? "text-ink-soft" : "text-ink-faint"}`} style={{ fontSize: 10, fontWeight: 600 }}>
          P{p.n}
        </span>
        <span className={`relative mt-1 text-[13px] font-medium tabular-nums ${active ? "text-brand-2" : dark ? "text-ink-soft" : "text-ink-faint"}`}>
          {pt.closed ? <CheckIcon size={13} strokeWidth={2.4} className={active ? "text-ground" : "text-ok"} /> : `${pt.done}/${pt.total}`}
        </span>
      </button>
    );
  });

  const action = (
    <motion.button
      type="button"
      onClick={s.close}
      whileTap={{ scale: 0.97 }}
      transition={springs.snappy}
      className={`flex min-w-0 flex-1 items-center justify-center gap-2 px-3 transition-colors duration-300 ${
        kind === "bar" ? "h-11 rounded-[6px]" : kind === "pill" ? "h-11 rounded-full" : "h-12 rounded-[16px]"
      } ${polish ? (s.isClosed ? "leia-fill-green" : s.ready ? "leia-cta" : "leia-cta-off") : ""}`}
      style={
        polish
          ? undefined
          : { background: s.isClosed ? "var(--ok)" : s.ready ? "var(--brand)" : dark ? "var(--ink-3)" : "var(--hair)" }
      }
    >
      {s.isClosed ? (
        <CheckIcon size={15} strokeWidth={2.4} className="text-ground" />
      ) : !s.ready && kind !== "bar" ? (
        <LockIcon size={14} className={dark ? "text-ink-faint" : "text-ink-soft"} />
      ) : null}
      <span
        className={`truncate text-[13px] font-bold uppercase tracking-[0.02em] ${s.ready || s.isClosed ? "text-ground" : dark ? "text-ink-faint" : "text-ink-soft"}`}
      >
        {s.isClosed ? "Cerrada" : "Cerrar ficha"}
      </span>
    </motion.button>
  );

  if (kind === "bar") {
    const lens = search ? (
      <motion.button
        type="button"
        onClick={search.toggle}
        whileTap={{ scale: 0.94 }}
        transition={springs.snappy}
        aria-label={search.open ? "Cerrar búsqueda" : "Buscar"}
        aria-pressed={search.open}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[6px] transition-colors duration-200 ${polish ? (search.open ? "leia-btn" : "leia-cta-off") : ""}`}
        style={
          polish
            ? { color: search.open ? "var(--ink)" : "var(--hair)" }
            : { background: search.open ? "var(--ground)" : "var(--ink-3)", color: search.open ? "var(--ink)" : "var(--hair)" }
        }
      >
        {search.open ? (
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="square" aria-hidden>
            <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
          </svg>
        ) : (
          <Lens />
        )}
      </motion.button>
    ) : null;
    return (
      <nav className={`fixed inset-x-0 bottom-0 z-30 ${polish ? "leia-bar" : "bg-ink-2"}`} style={{ paddingBottom: "var(--sab)" }}>
        <div className="mx-auto flex h-[64px] max-w-[560px] items-center gap-2 pr-3">
          <div className="mr-1 flex h-full border-r border-ink">{tabs}</div>
          {search?.open ? (
            <label
              className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[6px] bg-ink px-3 text-ink-faint"
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
                className="min-w-0 flex-1 bg-transparent text-[15px] text-ground outline-none placeholder:text-ink-soft"
              />
            </label>
          ) : (
            action
          )}
          {lens}
          {search?.open ? null : (
            <span className="pl-1">
              <Total done={s.t.done} total={s.t.total} light big={false} />
            </span>
          )}
        </div>
      </nav>
    );
  }

  // dock and pill: floating. In the pill, search uses AD Visual's field (rounded, blue square lens).
  const floatingLens = search ? (
    <motion.button
      type="button"
      onClick={search.toggle}
      whileTap={{ scale: 0.94 }}
      transition={springs.snappy}
      aria-label={search.open ? "Cerrar búsqueda" : "Buscar"}
      aria-pressed={search.open}
      className={`grid h-11 w-11 shrink-0 place-items-center ${kind === "pill" ? "rounded-[12px]" : "rounded-[16px]"}`}
      style={{
        background: search.open ? (dark ? "var(--ground)" : "var(--ink)") : kind === "pill" ? "var(--brand)" : "var(--ink-3)",
        color: search.open ? (dark ? "var(--ink)" : "var(--ground)") : "var(--ground)",
      }}
    >
      {search.open ? (
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="square" aria-hidden>
          <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
        </svg>
      ) : (
        <Lens />
      )}
    </motion.button>
  ) : null;
  return (
    <nav
      className="fixed left-1/2 z-30 w-[calc(100%-32px)] max-w-[488px] -translate-x-1/2"
      style={{ bottom: `calc(var(--sab) + ${kind === "pill" ? 18 : 16}px)` }}
    >
      <div
        className={`flex items-center gap-1.5 p-1.5 ${
          kind === "pill" ? "rounded-full bg-ground shadow-[var(--shadow-mid)]" : "rounded-[22px] bg-ink shadow-[0_14px_34px_rgba(25,28,34,0.28)]"
        }`}
      >
        {tabs}
        {search?.open ? (
          <label className={`flex h-11 min-w-0 flex-1 items-center gap-2 px-3.5 ${kind === "pill" ? "rounded-full bg-card" : "rounded-[16px] bg-ink-2"}`}>
            <input
              id="puncheo-buscar"
              autoFocus
              value={search.q}
              onChange={(e) => search.setQ(e.target.value)}
              placeholder="Buscar check"
              enterKeyHint="search"
              className={`min-w-0 flex-1 bg-transparent text-[15px] outline-none ${dark ? "text-ground placeholder:text-ink-soft" : "text-ink placeholder:text-ink-faint"}`}
            />
          </label>
        ) : (
          action
        )}
        {floatingLens}
        {search?.open || search ? null : (
          <span className="pl-1 pr-2">
            <Total done={s.t.done} total={s.t.total} light={dark} big={false} />
          </span>
        )}
      </div>
    </nav>
  );
}
