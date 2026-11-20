"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
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
  sheet: { title: string; subtitle: string; system: string; condo: string; house: string; plans: { id: string; name: string; url: string | null }[] };
  s: PunchSheet;
  current: Variant;
  tone?: Tone;
  extra?: React.ReactNode;
}) {
  const { t, isClosed } = s;
  const n1 = sheet.subtitle.replace("Vivienda ", "");
  if (tone === "yard") return <YardHeader sheet={sheet} s={s} current={current} />;
  if (tone === "leia") return <LeiaHeader sheet={sheet} s={s} current={current} />;
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
                {sheet.title} <span className="text-ink-faint">{n1}</span>
              </h1>
              <p className="mt-2 text-[13px] text-ink-soft">{sheet.system}</p>
            </div>
          </div>
        </header>

      {/* The whole ficha: both punches, every room. It updates in place: nothing slides. */}
      <div className="mt-6">
          <div className="flex items-center gap-3.5 rounded-[20px] bg-ink px-4 py-3.5 shadow-[0_12px_28px_rgba(25,28,34,0.22)]">
            <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-ground">
              <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{n1}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-ink-faint">
                {isClosed ? "Cerrada" : "Ficha"} <span className="px-1">·</span> {t.total} checks
              </span>
              <span className="mt-0.5 block text-[17px] font-semibold tracking-[-0.01em] text-ground">Pre-armado y pre-chorrea</span>
            </span>
            <span className="text-right leading-none">
              <span className="text-[22px] font-medium tracking-[-0.02em] text-ground tabular-nums">{String(t.done).padStart(2, "0")}</span>
              <span className="text-[15px] font-medium text-ink-soft tabular-nums">/{t.total}</span>
            </span>
          </div>

        {/* One segment per room, sized by its checks, filled as they are marked. */}
        <div className="mt-3 flex gap-1 px-1">
          {s.sections.map((x, i) => {
            const st = s.sectionTallies[i];
            return (
              <span key={x.id} className="relative h-[5px] overflow-hidden rounded-full bg-hair" style={{ flexGrow: st.total, flexBasis: 0 }}>
                <motion.span
                  className={`absolute inset-y-0 left-0 rounded-full ${st.red ? "bg-bad" : "bg-ok"}`}
                  initial={false}
                  animate={{ width: `${(st.done / Math.max(1, st.total)) * 100}%` }}
                  transition={springs.completing}
                />
              </span>
            );
          })}
        </div>
        {extra}
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
          <p className="text-[22px] font-bold uppercase leading-tight tracking-[0.01em] text-ink-faint">{s.sec.name}</p>
        </div>
        <div className="mt-6 grid gap-3">
          <ProgressCard title="Ficha completa" done={s.t.done} total={s.t.total} />
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

/** A rolled drawing sheet: the plans key's glyph. */
function PlanGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" className="leia-glyph" aria-hidden>
      <path d="M4 4h11l5 5v11H4z" fill="currentColor" />
      <path d="M15 4v5h5" fill="#c9cbcf" />
      <path d="M7 12h10M7 15h10M7 18h6" stroke="#e9eaec" strokeWidth={1.4} />
    </svg>
  );
}

/** Leia's center pill, an engraved outline, holding the layout switch. */
function LeiaSwitch({ current }: { current: Variant }) {
  const items = [
    { id: "a", href: "/ad/puncheo/legado-a" },
    { id: "b", href: "/ad/puncheo" },
    { id: "c", href: "/ad/puncheo/legado-c" },
  ] as const;
  return (
    <span className="leia-inset-pill flex h-[30px] items-center gap-0.5 rounded-full p-[2px]">
      {items.map((v) => (
        <Link
          key={v.id}
          href={v.href}
          aria-current={v.id === current ? "page" : undefined}
          className={`grid h-[24px] w-[30px] place-items-center rounded-full text-[12px] font-bold ${v.id === current ? "leia-btn text-[#3d4045]" : "leia-emboss text-[#8a8d93]"}`}
        >
          {v.id.toUpperCase()}
        </Link>
      ))}
    </span>
  );
}

/**
 * The app's header, after Leia's: the light toolbar (the engraved pill in the
 * middle) over its sub-bar, the rooms as category cells, the current one a
 * pressed blue cell (a tap goes there). Then the receipt panel: the blue band
 * and the ficha as a receipt line.
 */
function LeiaHeader({ sheet, s, current }: { sheet: { title: string; subtitle: string; system: string; condo: string; house: string; plans: { id: string; name: string; url: string | null }[] }; s: PunchSheet; current: Variant }) {
  const [plans, setPlans] = useState(false);
  const n1 = sheet.subtitle.replace("Vivienda ", "");
  return (
    <>
      <header className="leia-toolbar relative z-[21] -mx-4 flex items-center px-3" style={{ paddingTop: "var(--sat)", height: "calc(var(--sat) + 50px)" }}>
        <span className="leia-emboss flex h-full items-center pr-3 text-[15px] text-[#4d5056] shadow-[1px_0_0_#fff,inset_-1px_0_0_#c3c5c9]">
          <b className="mr-1">AD</b> Puncheo
        </span>
        <span className="flex flex-1 justify-center">
          <LeiaSwitch current={current} />
        </span>
        <span className="w-[86px]" />
      </header>
      {/* Behind the status bar, so content scrolling under it stays legible. */}
      <div className="leia-toolbar fixed inset-x-0 top-0 z-[22]" style={{ height: "var(--sat)" }} />

      <div className="leia-panel mt-4 overflow-hidden rounded-[6px]">
        <div className="leia-band flex h-[44px] items-center px-4 text-ground">
          {/* The condominium, and the house as the receipt's big numeral. */}
          <span className="min-w-0 flex-1 truncate text-[18px]">{sheet.condo}</span>
          <span className="text-[13px] text-brand-2">Pre-armado y pre-chorrea</span>
        </div>
        <div className="flex items-center gap-4 px-4 py-3.5">
          <span className="shrink-0 text-[38px] font-[200] leading-none tracking-[-0.02em] text-brand">{sheet.house}</span>
          <span className="min-w-0 flex-1">
            {/* The house's drawings: a Leia key that opens their list in the panel. */}
            <button
              type="button"
              onClick={() => {
                haptic.select();
                setPlans(!plans);
              }}
              aria-expanded={plans}
              className={`flex h-9 items-center gap-1.5 rounded-[4px] pl-2.5 pr-2 ${plans ? "leia-btn-on" : "leia-btn"}`}
            >
              <PlanGlyph />
              <span className="leia-emboss text-[15px] font-bold text-ink">Planos</span>
              <motion.span initial={false} animate={{ rotate: plans ? 180 : 0 }} transition={springs.snappy} className="grid place-items-center text-[#55585e]">
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 9l7 7 7-7" stroke="currentColor" strokeWidth={3.2} strokeLinecap="square" />
                </svg>
              </motion.span>
            </button>
            <span className="mt-1 block truncate text-[13px] text-[#8a8d93]">
              {sheet.title} {n1} · {sheet.system}
            </span>
          </span>
          <span className="text-[18px] font-bold tabular-nums text-ink">
            {String(s.t.done).padStart(2, "0")}
            <span className="font-normal text-[#8a8d93]">/{s.t.total}</span>
          </span>
        </div>
        <AnimatePresence initial={false}>
          {plans ? (
            <motion.ul
              key="plans"
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="overflow-hidden shadow-[inset_0_1px_0_#cbccd0]"
            >
              {sheet.plans.map((pl, i) => (
                <motion.li
                  key={pl.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 28, delay: 0.04 + i * 0.04 } }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      haptic.select();
                      if (pl.url) window.open(pl.url, "_blank", "noopener");
                      else s.say(`${pl.name}: todavía no está cargado`);
                    }}
                    className="leia-row flex h-12 w-full items-center gap-3 bg-[#f4f4f5] px-4 text-left active:bg-[#e9eaec]"
                  >
                    <span className="text-[#55585e]">
                      <PlanGlyph />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[16px] text-ink">{pl.name}</span>
                    <span className={`text-[12px] ${pl.url ? "text-brand" : "text-[#8a8d93]"}`}>{pl.url ? "Abrir" : "Sin archivo"}</span>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden className="text-[#a3a6ab]">
                      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth={3} strokeLinecap="square" />
                    </svg>
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
