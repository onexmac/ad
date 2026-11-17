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

function Total({ done, total, light, big = true }: { done: number; total: number; light: boolean; big?: boolean }) {
  return (
    <span className="shrink-0 leading-none tabular-nums">
      <span className={`${big ? "text-[26px]" : "text-[21px]"} font-light tracking-[-0.03em] ${light ? "text-ground" : "text-ink"}`}>{String(done).padStart(2, "0")}</span>
      <span className={`${big ? "text-[15px]" : "text-[13px]"} font-light ${light ? "text-ink-soft" : "text-ink-faint"}`}>/{total}</span>
    </span>
  );
}

export function Footer({ s, sheet, kind }: { s: PunchSheet; sheet: RoomSheet; kind: Kind }) {
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
          kind === "bar" ? "h-full w-[62px] border-r border-ink" : kind === "pill" ? "h-11 w-[52px] rounded-full" : "h-12 w-[54px] rounded-[16px]"
        }`}
      >
        {active ? (
          <motion.span
            layoutId={`foot-tab-${kind}`}
            transition={springs.snappy}
            className={`pointer-events-none absolute inset-0 bg-brand ${kind === "bar" ? "" : kind === "pill" ? "rounded-full" : "rounded-[16px]"}`}
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
      }`}
      style={{
        background: s.isClosed ? "var(--ok)" : s.ready ? "var(--brand)" : dark ? "var(--ink-3)" : "var(--hair)",
      }}
    >
      {s.isClosed ? (
        <CheckIcon size={15} strokeWidth={2.4} className="text-ground" />
      ) : !s.ready ? (
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
    return (
      <nav className="fixed inset-x-0 bottom-0 z-30 bg-ink-2" style={{ paddingBottom: "var(--sab)" }}>
        <div className="mx-auto flex h-[64px] max-w-[560px] items-center gap-3 pr-4">
          <div className="flex h-full border-r border-ink">{tabs}</div>
          {action}
          <Total done={s.t.done} total={s.t.total} light />
        </div>
      </nav>
    );
  }

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
        {action}
        <span className="pl-1 pr-2">
          <Total done={s.t.done} total={s.t.total} light={dark} big={false} />
        </span>
      </div>
    </nav>
  );
}
