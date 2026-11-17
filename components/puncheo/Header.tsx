"use client";

import { motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import type { Sheet } from "@/data/puncheo/formaleta-n1";
import type { Status } from "@/lib/puncheo/state";
import { Chevrons } from "./Icons";
import { VariantSwitch, type Variant } from "./Chrome";
import type { PunchSheet } from "./usePunchSheet";

export const SEG: Record<Status, string> = {
  green: "var(--ok)",
  yellow: "var(--warn)",
  red: "var(--bad)",
  na: "var(--na)",
};

/**
 * Layout A's header, which all three keep: the sheet's name, the dark punch
 * card with the running count, one segment per check, then the moment. `aside`
 * sits beside the title, `extra` under the segments; `note` sets the moment as
 * AD Visual's dark tooltip in the italic note face.
 */
export function SheetHeader({
  sheet,
  s,
  current,
  aside,
  extra,
  note = false,
}: {
  sheet: Sheet;
  s: PunchSheet;
  current: Variant;
  aside?: React.ReactNode;
  extra?: React.ReactNode;
  note?: boolean;
}) {
  const { punch, t, marks, isClosed, dir } = s;
  return (
    <>
      <header style={{ paddingTop: "calc(var(--sat) + 28px)" }}>
        <div className="flex items-center justify-between">
          <span className="mono text-ink-faint">AD · Puncheo</span>
          <VariantSwitch current={current} />
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">
              {sheet.title} <span className="text-ink-faint">{sheet.subtitle.replace("Vivienda ", "")}</span>
            </h1>
            <p className="mt-2 text-[13px] text-ink-soft">{sheet.system}</p>
          </div>
          {aside}
        </div>
      </header>

      {/* No AnimatePresence around the punch: its initial={false} would reach
          every row mounted later and swallow the marks' reward animations. */}
      <motion.div key={punch.id} initial={dir ? { opacity: 0, x: dir * 28 } : false} animate={{ opacity: 1, x: 0 }} transition={springs.snappy} className="mt-6">
        <div className="flex items-center gap-3.5 rounded-[20px] bg-ink px-4 py-3.5 shadow-[0_12px_28px_rgba(25,28,34,0.22)]">
          <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-ground">
            <span className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{punch.n}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium text-ink-faint">
              {isClosed ? "Cerrada" : "Puncheo " + punch.n} <span className="px-1">·</span> {t.total} checks
            </span>
            <span className="mt-0.5 block text-[17px] font-semibold tracking-[-0.01em] text-ground">{punch.name}</span>
          </span>
          <span className="text-right leading-none">
            <span className="text-[22px] font-medium tracking-[-0.02em] text-ground tabular-nums">{String(t.done).padStart(2, "0")}</span>
            <span className="text-[15px] font-medium text-ink-soft tabular-nums">/{String(t.total).padStart(2, "0")}</span>
          </span>
        </div>

        <div className="mt-3 flex gap-[3px] px-1">
          {punch.checks.map((c) => (
            <span key={c.id} className="h-[5px] flex-1 overflow-hidden rounded-full bg-hair">
              <motion.span
                className="block h-full w-full origin-left rounded-full"
                style={{
                  background: marks[c.id] ? SEG[marks[c.id]] : "transparent",
                  backgroundImage: marks[c.id] === "na" ? "repeating-linear-gradient(135deg, transparent 0 2px, rgba(25,28,34,0.25) 2px 3px)" : undefined,
                }}
                initial={false}
                animate={{ scaleX: marks[c.id] ? 1 : 0 }}
                transition={springs.completing}
              />
            </span>
          ))}
        </div>
        {extra}
        {note ? (
          <div className="relative mt-4 rounded-[12px] bg-ink px-3.5 py-3 shadow-[var(--shadow-mid)]">
            <span aria-hidden className="absolute -top-1.5 left-6 size-3 rotate-45 rounded-[2px] bg-ink" />
            <p className="relative text-[15px] leading-[19px] text-hair" style={{ fontFamily: "var(--font-note), Georgia, serif", fontStyle: "italic" }}>
              {punch.moment}
            </p>
          </div>
        ) : (
          <p className="mt-3 px-1 text-[13px] leading-[18px] text-ink-soft">{punch.moment}</p>
        )}
      </motion.div>
    </>
  );
}

export function Legend() {
  const item = (dir: "left" | "right", count: 1 | 2, label: string, dot: React.ReactNode) => (
    <span className={`flex items-center gap-1.5 ${dir === "left" ? "" : "flex-row-reverse"}`}>
      <Chevrons dir={dir} count={count} size={11} className="text-ink-faint" />
      {dot}
      <span>{label}</span>
    </span>
  );
  const dot = (bg: string, hatch = false) => (
    <span
      className="size-2 rounded-[3px]"
      style={{ background: bg, backgroundImage: hatch ? "repeating-linear-gradient(135deg, transparent 0 1.5px, rgba(25,28,34,0.45) 1.5px 2.5px)" : undefined }}
    />
  );
  return (
    <div className="mono mt-5 flex items-center justify-between px-1 text-ink-soft" style={{ fontSize: 9.5 }}>
      <span className="flex gap-3">
        {item("left", 2, "N/A", dot("var(--hair)", true))}
        {item("left", 1, "No pasa", dot("var(--bad)"))}
      </span>
      <span className="flex gap-3">
        {item("right", 1, "Pasa", dot("var(--ok)"))}
        {item("right", 2, "Obs.", dot("var(--warn)"))}
      </span>
    </div>
  );
}

/** AD Visual's letter tags as the sheet's counters: V, A, R, N. */
export function LetterTags({ s }: { s: PunchSheet }) {
  const count = (st: Status) => s.punch.checks.filter((c) => s.marks[c.id] === st).length;
  const tag = (letter: string, n: number, bg: string, ink: string) => (
    <span className="flex items-center gap-1.5">
      <span className="grid size-[18px] place-items-center rounded-[5px]" style={{ background: bg }}>
        <span className="text-[10px] font-semibold" style={{ color: ink }}>
          {letter}
        </span>
      </span>
      <span className="text-[13px] font-medium tabular-nums text-ink-3">{n}</span>
    </span>
  );
  return (
    <div className="mt-3 flex items-center gap-4 px-1">
      {tag("V", count("green"), "var(--ok-soft)", "var(--ok-deep)")}
      {tag("A", count("yellow"), "var(--warn-soft)", "var(--warn-deep)")}
      {tag("R", count("red"), "var(--bad-soft)", "var(--bad)")}
      {tag("N", count("na"), "var(--hair)", "var(--ink-soft)")}
      {s.t.noPhoto ? <span className="ml-auto text-[12px] font-medium text-warn-deep">{s.t.noPhoto} sin foto</span> : null}
    </div>
  );
}

/** AD Visual's date tile (MIÉ 23), with today's date. */
export function DateTile() {
  const d = new Date();
  const day = d.toLocaleDateString("es-CR", { weekday: "short" }).replace(".", "").slice(0, 3).toUpperCase();
  return (
    <span className="grid w-11 shrink-0 place-items-center rounded-[10px] bg-ground py-1.5 shadow-[var(--shadow-soft)]" suppressHydrationWarning>
      <span className="text-[9px] font-semibold leading-none text-ink-faint" suppressHydrationWarning>
        {day}
      </span>
      <span className="mt-1 text-[18px] font-semibold leading-none text-ink tabular-nums" suppressHydrationWarning>
        {d.getDate()}
      </span>
    </span>
  );
}
