"use client";

import { useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
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

export type Tone = "plain" | "leia" | "yard";

/**
 * The sheet's header in three tones. plain: the name, the dark punch card,
 * one segment per check. leia: Leia's blue band and a receipt-style punch
 * line with the big blue numeral. yard: AD Visual pieces (date tile, the dark
 * progress chip).
 */
export function SheetHeader({
  sheet,
  s,
  current,
  tone = "plain",
  extra,
}: {
  sheet: { title: string; subtitle: string; system: string };
  s: PunchSheet;
  current: Variant;
  tone?: Tone;
  extra?: React.ReactNode;
}) {
  const { punch, t, marks, isClosed } = s;
  const n1 = sheet.subtitle.replace("Vivienda ", "");
  if (tone === "yard") return <YardHeader sheet={sheet} s={s} current={current} />;
  return (
    <>
      {tone === "leia" ? (
        <header className="leia-band -mx-4 px-4 pb-5 text-ground" style={{ paddingTop: "calc(var(--sat) + 20px)" }}>
          <div className="flex items-center justify-between">
            <span className="mono text-brand-2">AD · Puncheo</span>
            <VariantSwitch current={current} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-[6px] bg-ground/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_0_rgba(0,0,0,0.15)]" aria-hidden>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="square">
                <path d="M3.5 5.5h17v13h-17z" />
                <circle cx="9" cy="11" r="2" />
                <path d="M6 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14.5 10h3.5M14.5 13h3.5" />
              </svg>
            </span>
            <span className="min-w-0">
              <h1 className="text-[28px] font-semibold leading-none tracking-[-0.02em]">
                {sheet.title} <span className="text-brand-2">{n1}</span>
              </h1>
              <span className="mt-1.5 block truncate text-[13px] text-brand-2">{sheet.system}</span>
            </span>
          </div>
        </header>
      ) : (
        <header style={{ paddingTop: "calc(var(--sat) + 28px)" }}>
          <div className="flex items-center justify-between">
            <span className="mono text-ink-faint">AD · Puncheo</span>
            <VariantSwitch current={current} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">
                {sheet.title} <span className="text-ink-faint">{n1}</span>
              </h1>
              <p className="mt-2 text-[13px] text-ink-soft">{sheet.system}</p>
            </div>
          </div>
        </header>
      )}

      {/* The punch the current section belongs to. It changes with the walk, in place: nothing slides. */}
      <div className={tone === "leia" ? "mt-0" : "mt-6"}>
        {tone === "leia" ? (
          // Leia's receipt line: big blue quantity, bold name, the amount on the right.
          <div className="leia-receipt -mx-4 flex items-center gap-4 px-4 py-4">
            <span className="w-8 text-[40px] font-extralight leading-none text-brand">{punch.n}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[20px] font-semibold leading-tight tracking-[-0.01em] text-ink">{punch.name}</span>
              <span className="mt-0.5 block text-[13px] text-ink-faint">
                {isClosed ? "Cerrada" : `Puncheo ${punch.n}`} · {t.total} checks
              </span>
            </span>
            <span className="text-right leading-none tabular-nums">
              <span className="text-[26px] font-semibold tracking-[-0.02em] text-ink">{String(t.done).padStart(2, "0")}</span>
              <span className="text-[15px] text-ink-faint">/{t.total}</span>
            </span>
          </div>
        ) : (
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
        )}

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
        <p className={`mt-3 px-1 text-[13px] leading-[18px] ${tone === "leia" ? "leia-engrave text-hair" : "text-ink-soft"}`}>{punch.moment}</p>
      </div>
    </>
  );
}

export function Legend({ dark = false }: { dark?: boolean }) {
  const item = (dir: "left" | "right", count: 1 | 2, label: string, dot: React.ReactNode) => (
    <span className={`flex items-center gap-1.5 ${dir === "left" ? "" : "flex-row-reverse"}`}>
      <Chevrons dir={dir} count={count} size={11} className={dark ? "text-hair-2" : "text-ink-faint"} />
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
    <div className={`mono mt-5 flex items-center justify-between px-1 ${dark ? "leia-engrave text-hair" : "text-ink-soft"}`} style={{ fontSize: 9.5 }}>
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

const subscribeNever = () => () => {};

/** This week's days, read on the client only (the page is built ahead of time). */
function useWeek() {
  return useSyncExternalStore(
    subscribeNever,
    () => WEEK.value,
    () => null,
  );
}
const WEEK = {
  get value() {
    const cache = WEEK as unknown as { _v?: { d: number; today: boolean }[]; _day?: number };
    const now = new Date();
    if (!cache._v || cache._day !== now.getDate()) {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      cache._v = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return { d: d.getDate(), today: d.toDateString() === now.toDateString() };
      });
      cache._day = now.getDate();
    }
    return cache._v;
  },
};

/** AD Visual's progress card: a name, a figure on the right, a blue bar on a light blue track. */
function ProgressCard({ title, done, total, note }: { title: string; done: number; total: number; note?: React.ReactNode }) {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div className="rounded-[8px] bg-ground px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--hair-2)]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[16px] text-ink">{title}</span>
        <span className="shrink-0 text-[16px] tabular-nums text-ink">
          {note}
          {String(done).padStart(2, "0")}
          <span className="text-ink-faint">/{total}</span>
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-2">
        <motion.div className="h-full rounded-full bg-brand" initial={false} animate={{ width: `${pct}%` }} transition={springs.completing} />
      </div>
    </div>
  );
}

/**
 * C's header, after AD Visual's mobile screens: the week on the grey canvas,
 * then a white sheet with the centred caps title and the progress cards.
 */
function YardHeader({ sheet, s, current }: { sheet: { title: string; subtitle: string; system: string }; s: PunchSheet; current: Variant }) {
  const week = useWeek();
  const n1 = sheet.subtitle.replace("Vivienda ", "");
  const st = s.sectionTallies[s.section];
  return (
    <>
      <header className="-mx-4 bg-card-2 px-4 pb-12" style={{ paddingTop: "calc(var(--sat) + 20px)" }}>
        <div className="flex items-center justify-between">
          <span className="mono text-ink-faint">AD · Puncheo</span>
          <VariantSwitch current={current} />
        </div>
        <div className="mt-5 rounded-[16px] bg-card px-2 pb-2 pt-3 shadow-[var(--shadow-soft)]">
          <div className="grid grid-cols-7 text-center text-[12px] font-medium text-ink">
            {["D", "L", "K", "M", "J", "V", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center">
            {(week ?? Array.from({ length: 7 }, () => null)).map((x, i) => (
              <span
                key={i}
                className={`grid h-9 place-items-center rounded-[8px] text-[16px] tabular-nums ${x?.today ? "bg-brand font-semibold text-ground" : "text-ink-2"}`}
              >
                {x ? x.d : ""}
              </span>
            ))}
          </div>
        </div>
      </header>
      <div className="relative -mx-4 -mt-7 rounded-t-[28px] bg-ground px-4 pt-7">
        <div className="text-center">
          <h1 className="text-[22px] font-bold uppercase leading-tight tracking-[0.01em] text-ink">
            {sheet.title} {n1}
          </h1>
          <p className="text-[22px] font-bold uppercase leading-tight tracking-[0.01em] text-ink-faint">{s.punch.name}</p>
          <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-[18px] text-ink-soft">{s.punch.moment}</p>
        </div>
        <div className="mt-6 grid gap-3">
          <ProgressCard title={`Puncheo ${s.punch.n} · ${s.punch.name}`} done={s.t.done} total={s.t.total} />
          <ProgressCard
            title={s.sec.name}
            done={st.done}
            total={st.total}
            note={st.red ? <span className="mr-2 text-bad">−{st.red}</span> : null}
          />
        </div>
      </div>
    </>
  );
}
