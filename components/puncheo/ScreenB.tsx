"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { useEdgeSquish } from "@/components/updatr/useEdgeSquish";
import type { Check, Sheet } from "@/data/puncheo/formaleta-n1";
import type { Status } from "@/lib/puncheo/state";
import { PhotoButton } from "./PhotoButton";
import { SwipeUnder } from "./SwipeUnder";
import { CheckDetail, Expand } from "./CheckDetail";
import { Toast, VariantSwitch } from "./Chrome";
import { CrossIcon, LockIcon } from "./Icons";
import { useSwipeMark } from "./useSwipeMark";
import { rowState, usePunchSheet, type PunchSheet } from "./usePunchSheet";
import { Legend } from "./PunchScreen";

/*
 * Layout B, "Ficha": the engineer's inspection sheet. White paper, hairline
 * rows edge to edge, mono check ids, square boxes that get stamped. Leia's
 * chrome at the foot: a full-width bar with the punches as tabs (the active
 * one filled blue) over the close button and a big running total.
 */

const FILL: Record<Status, string> = { green: "var(--ok)", yellow: "var(--warn)", red: "var(--bad)", na: "var(--card-2)" };
const INK: Record<Status, string> = { green: "var(--ok-deep)", yellow: "var(--warn-deep)", red: "var(--bad)", na: "var(--ink-faint)" };

function Box({ status, fresh }: { status: Status | null; fresh: boolean }) {
  if (!status) return <span className="block size-8 rounded-[8px] border-[1.5px] border-hair-2 bg-ground" />;
  return (
    <span className="relative block size-8">
      {/* The stamp: the box lands a little large and settles; the fill wipes in from the left. */}
      <motion.span
        className="absolute inset-0 grid place-items-center overflow-hidden rounded-[8px]"
        style={{
          background: FILL[status],
          backgroundImage: status === "na" ? "repeating-linear-gradient(135deg, transparent 0 4px, rgba(25,28,34,0.12) 4px 5px)" : undefined,
        }}
        initial={fresh ? { scale: 1.35, clipPath: "inset(0 100% 0 0 round 8px)" } : false}
        animate={{ scale: 1, clipPath: "inset(0 0% 0 0 round 8px)" }}
        transition={{ scale: springs.popping, clipPath: { duration: 0.22, ease: [0.65, 0, 0.35, 1] } }}
      >
        {status === "green" ? (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="var(--ground)"
              strokeWidth={2.6}
              strokeLinecap="square"
              strokeLinejoin="miter"
              initial={fresh ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.28, delay: 0.16, ease: [0.65, 0, 0.35, 1] }}
            />
          </svg>
        ) : status === "yellow" ? (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 4v10" stroke="var(--ink)" strokeWidth={2.8} strokeLinecap="square" />
            <rect x="10.6" y="17.5" width="2.8" height="2.8" fill="var(--ink)" />
          </svg>
        ) : status === "red" ? (
          <CrossIcon size={16} strokeWidth={2.6} className="text-ground" />
        ) : (
          <span className="mono text-ink-soft" style={{ fontSize: 9, fontWeight: 600 }}>
            N/A
          </span>
        )}
      </motion.span>
    </span>
  );
}

function RowB({ s, check }: { s: PunchSheet; check: Check }) {
  const r = rowState(s, check);
  const ref = useRef<HTMLDivElement>(null);
  const underRef = useRef<HTMLDivElement>(null);
  const sw = useSwipeMark({
    ref,
    underRef,
    id: check.id,
    na: check.na,
    status: r.status,
    pulse: r.pulse,
    nudge: r.nudge,
    rest: "#ffffff",
    onMark: (m) => s.setMark(check.id, m),
    onReject: s.say,
  });
  return (
    <div className="relative border-b border-hair">
      <SwipeUnder sw={sw} underRef={underRef} />
      <motion.div ref={ref} style={{ x: sw.x, touchAction: "pan-y" }} {...sw.bind} className="no-select relative bg-ground">
        <div className="flex items-center gap-3 py-3.5 pr-4">
          <button
            type="button"
            onClick={() => {
              if (sw.dragged()) return;
              haptic.select();
              s.toggle(check.id);
            }}
            aria-expanded={r.open}
            className="flex min-w-0 flex-1 items-start gap-3 pl-4 text-left outline-none"
          >
            <span
              className="mono w-9 shrink-0 pt-[3px] transition-colors duration-300"
              style={{ fontSize: 12, fontWeight: 600, color: r.status ? INK[r.status] : "var(--ink-faint)" }}
            >
              {check.id}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold leading-5 tracking-[-0.01em] text-ink">{check.title}</span>
              <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-soft">{check.sub}</span>
            </span>
          </button>
          <PhotoButton
            photos={r.photos}
            missing={r.missingPhoto || (check.photo.required && !r.photos.length)}
            dragged={sw.dragged}
            onPick={(f) => s.pickPhoto(check, f)}
            size={32}
          />
          <button
            type="button"
            aria-label={r.status === "green" ? `Quitar pasa de ${check.id}` : `Marcar ${check.id} como pasa`}
            onClick={() => {
              if (sw.dragged()) return;
              s.tapCheck(check.id);
            }}
            className="shrink-0"
          >
            <Box key={r.pulse} status={r.status} fresh={r.pulse > 0} />
          </button>
        </div>
        <Expand open={r.open}>
          <div className="mb-4 ml-16 mr-4 rounded-2xl bg-card p-4">
            <CheckDetail
              check={check}
              status={r.status}
              photos={r.photos}
              onClear={() => s.setMark(check.id, null)}
              onRemovePhoto={(i) => s.removePhoto(check.id, i)}
            />
          </div>
        </Expand>
      </motion.div>
    </div>
  );
}

/** The sheet's tags, after the AD Visual chips: a coloured letter box and a count. */
function Tag({ letter, n, bg, ink }: { letter: string; n: number; bg: string; ink: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="grid size-[18px] place-items-center rounded-[5px]" style={{ background: bg }}>
        <span className="text-[10px] font-semibold" style={{ color: ink }}>
          {letter}
        </span>
      </span>
      <span className="text-[13px] font-medium tabular-nums text-ink-3">{n}</span>
    </span>
  );
}

export function ScreenB({ sheet }: { sheet: Sheet }) {
  const s = usePunchSheet(sheet);
  const { punch, t, dir, marks } = s;
  const { scale, origin } = useEdgeSquish();
  const count = (st: Status) => punch.checks.filter((c) => marks[c.id] === st).length;

  return (
    <div data-app className="min-h-dvh overflow-x-clip bg-ground">
      <motion.main style={{ scale, transformOrigin: origin }} className="mx-auto w-full max-w-[560px]">
        <header className="px-4" style={{ paddingTop: "calc(var(--sat) + 24px)" }}>
          <div className="flex items-center justify-between">
            <span className="mono text-ink-faint">AD · Ficha de puncheo</span>
            <VariantSwitch current="b" />
          </div>

          {/* The form's header block: what this sheet is, on hairlines. */}
          <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] border-y border-ink">
            <span className="mono border-b border-hair py-2.5 pr-4 text-ink-faint">Ficha</span>
            <span className="border-b border-hair py-2 text-[15px] font-semibold text-ink">
              {sheet.title} {sheet.subtitle.replace("Vivienda ", "")} <span className="font-normal text-ink-faint">· v2.0</span>
            </span>
            <span className="mono border-b border-hair py-2.5 pr-4 text-ink-faint">Sistema</span>
            <span className="border-b border-hair py-2 text-[14px] text-ink-2">{sheet.system}</span>
            <span className="mono py-2.5 pr-4 text-ink-faint">Momento</span>
            <span className="py-2 text-[14px] leading-5 text-ink-2">{punch.moment}</span>
          </div>
        </header>

        <motion.section
          key={punch.id}
          initial={dir ? { opacity: 0, x: dir * 24 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={springs.snappy}
        >
          <div className="flex items-end justify-between px-4 pt-6">
            <div>
              <span className="mono text-ink-faint">Puncheo {punch.n}</span>
              <h1 className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink">{punch.name}</h1>
            </div>
            <span className="leading-none">
              <span className="text-[44px] font-light tracking-[-0.04em] text-ink tabular-nums">{String(t.done).padStart(2, "0")}</span>
              <span className="text-[20px] font-light text-ink-faint tabular-nums">/{t.total}</span>
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4 px-4">
            <Tag letter="V" n={count("green")} bg="var(--ok-soft)" ink="var(--ok-deep)" />
            <Tag letter="A" n={count("yellow")} bg="var(--warn-soft)" ink="var(--warn-deep)" />
            <Tag letter="R" n={count("red")} bg="var(--bad-soft)" ink="var(--bad)" />
            <Tag letter="N" n={count("na")} bg="var(--card-2)" ink="var(--ink-soft)" />
            {t.noPhoto ? <span className="ml-auto text-[12px] font-medium text-warn-deep">{t.noPhoto} sin foto</span> : null}
          </div>

          <div className="px-3">
            <Legend />
          </div>

          <ul className="mt-3 border-t border-ink">
            {punch.checks.map((c) => (
              <li key={c.id} data-check={c.id}>
                <RowB s={s} check={c} />
              </li>
            ))}
          </ul>
        </motion.section>
        <div style={{ height: "calc(var(--sab) + 150px)" }} />
      </motion.main>

      <Toast toast={s.toast} bottom={140} />
      <LeiaBar s={s} sheet={sheet} />
    </div>
  );
}

/** Leia's checkout chrome, moved to the thumb: tabs over the close button and the total. */
function LeiaBar({ s, sheet }: { s: PunchSheet; sheet: Sheet }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 bg-ink-2" style={{ paddingBottom: "var(--sab)" }}>
      <div className="mx-auto flex max-w-[560px] border-b border-ink">
        {sheet.punches.map((p, i) => {
          const active = s.tab === i;
          const pt = s.punchTallies[i];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => s.switchTo(i)}
              aria-pressed={active}
              className="relative flex h-12 flex-1 items-center justify-center gap-2 border-r border-ink last:border-r-0"
            >
              {active ? (
                <motion.span layoutId="leia-tab" transition={springs.snappy} className="pointer-events-none absolute inset-0 bg-brand" />
              ) : null}
              <span className={`relative text-[15px] font-medium ${active ? "text-ground" : "text-ink-faint"}`}>{p.name}</span>
              <span className={`relative text-[12px] tabular-nums ${active ? "text-brand-2" : "text-ink-soft"}`}>
                {pt.closed ? "cerrada" : `${pt.done}/${pt.total}`}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mx-auto flex max-w-[560px] items-center gap-3 px-4 py-3">
        <motion.button
          type="button"
          onClick={s.close}
          whileTap={{ scale: 0.97 }}
          transition={springs.snappy}
          className="flex h-12 items-center gap-2 rounded-[6px] px-5 transition-colors duration-300"
          style={{ background: s.isClosed ? "var(--ok)" : s.ready ? "var(--brand)" : "var(--ink-3)" }}
        >
          {!s.ready && !s.isClosed ? <LockIcon size={14} className="text-ink-faint" /> : null}
          <span
            className={`text-[15px] font-bold uppercase tracking-[0.02em] ${s.ready || s.isClosed ? "text-ground" : "text-ink-faint"}`}
            style={{ fontStretch: "condensed" }}
          >
            {s.isClosed ? "Cerrada" : "Cerrar ficha"}
          </span>
        </motion.button>
        <span className="ml-auto text-right leading-none">
          <span className="block text-[11px] font-medium text-ink-faint">
            {s.t.red ? `${s.t.red} en rojo · ` : ""}
            {s.t.pending} pendientes
          </span>
          <span className="mt-1 block text-[34px] font-light tracking-[-0.03em] text-ground tabular-nums">
            {String(s.t.done).padStart(2, "0")}
            <span className="text-ink-soft">/{s.t.total}</span>
          </span>
        </span>
      </div>
    </nav>
  );
}
