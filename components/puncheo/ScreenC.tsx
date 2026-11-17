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
import { CheckIcon, CrossIcon, LockIcon, NaIcon } from "./Icons";
import { useSwipeMark } from "./useSwipeMark";
import { rowState, usePunchSheet, type PunchSheet } from "./usePunchSheet";
import { Legend } from "./PunchScreen";

/*
 * Layout C, "Riel": the punch as a route. A rail runs down the left with one
 * node per check; marking a check fills its node and draws the rail on to the
 * next one, so progress reads as distance travelled. AD Visual's own pieces
 * (grey ground, white cards, circle checks, white pill with a blue button).
 */

const COLOR: Record<Status, string> = { green: "var(--ok)", yellow: "var(--warn)", red: "var(--bad)", na: "var(--na)" };

/** Header gauge: one arc per check, coloured as it is marked. */
function Gauge({ checks, marks, done, total }: { checks: Check[]; marks: Record<string, Status>; done: number; total: number }) {
  const R = 36;
  const C = 2 * Math.PI * R;
  const gap = 3.2;
  const seg = C / checks.length;
  return (
    <span className="relative grid size-[92px] shrink-0 place-items-center">
      <svg width={92} height={92} viewBox="0 0 92 92" className="absolute inset-0 -rotate-90" aria-hidden>
        {checks.map((c, i) => {
          const st = marks[c.id];
          return (
            <motion.circle
              key={c.id}
              cx={46}
              cy={46}
              r={R}
              fill="none"
              strokeWidth={7}
              strokeLinecap="butt"
              strokeDasharray={`${seg - gap} ${C - seg + gap}`}
              strokeDashoffset={-i * seg}
              initial={false}
              animate={{ stroke: st ? COLOR[st] : "#e6e6e8" }}
              transition={{ duration: 0.35 }}
            />
          );
        })}
      </svg>
      <span className="text-center leading-none">
        <span className="block text-[26px] font-semibold tracking-[-0.03em] text-ink tabular-nums">{String(done).padStart(2, "0")}</span>
        <span className="mt-0.5 block text-[11px] font-medium text-ink-faint tabular-nums">de {total}</span>
      </span>
    </span>
  );
}

function CircleCheck({ status, fresh }: { status: Status | null; fresh: boolean }) {
  return (
    <span className="relative grid size-[34px] place-items-center rounded-full border-[1.5px] border-hair-2 bg-ground">
      {status ? (
        <motion.span
          key={status}
          className="absolute -inset-[1.5px] grid place-items-center rounded-full"
          style={{ background: COLOR[status] }}
          initial={fresh ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={springs.popping}
        >
          {status === "green" ? (
            <CheckIcon size={17} strokeWidth={2.6} className="text-ground" />
          ) : status === "yellow" ? (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 4v10" stroke="var(--ink)" strokeWidth={2.8} strokeLinecap="square" />
              <rect x="10.6" y="17.5" width="2.8" height="2.8" fill="var(--ink)" />
            </svg>
          ) : status === "red" ? (
            <CrossIcon size={15} strokeWidth={2.6} className="text-ground" />
          ) : (
            <NaIcon size={17} className="text-ground" />
          )}
        </motion.span>
      ) : null}
    </span>
  );
}

function RowC({ s, check, first, last }: { s: PunchSheet; check: Check; first: boolean; last: boolean }) {
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
    rest: r.open ? "#ffffff" : "#f7f7f7",
    onMark: (m) => s.setMark(check.id, m),
    onReject: s.say,
  });
  const color = r.status ? COLOR[r.status] : null;
  const NODE_Y = 30; // the node sits level with the title

  return (
    <div className="relative flex" style={{ zIndex: r.pulse ? 2 : undefined }}>
      {/* The rail: grey all the way, coloured below a marked node. */}
      <div className="relative w-8 shrink-0" aria-hidden>
        <span className="absolute left-1/2 w-[2px] -translate-x-1/2 bg-hair-2" style={{ top: first ? NODE_Y : 0, bottom: last ? `calc(100% - ${NODE_Y}px)` : 0 }} />
        {color && !last ? (
          <motion.span
            key={`rail-${r.pulse}`}
            className="absolute left-1/2 w-[2px] origin-top -translate-x-1/2"
            style={{ top: NODE_Y, bottom: 0, background: color }}
            initial={r.pulse ? { scaleY: 0 } : false}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.45, delay: 0.12, ease: [0.65, 0, 0.35, 1] }}
          />
        ) : null}
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: NODE_Y }}>
          {r.pulse > 0 && color ? (
            <motion.span
              key={`burst-${r.pulse}`}
              className="absolute left-1/2 top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]"
              style={{ borderColor: color }}
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 3.2, opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          ) : null}
          <motion.span
            key={`node-${r.pulse}`}
            className="relative block size-[14px] rounded-full border-2"
            style={{ borderColor: color ?? "var(--hair-2)", background: color ?? "var(--card)" }}
            initial={r.pulse ? { scale: 0.4 } : false}
            animate={{ scale: 1 }}
            transition={springs.popping}
          />
        </span>
      </div>

      <div className="relative min-w-0 flex-1 pb-2">
        <div className="relative">
          <SwipeUnder sw={sw} underRef={underRef} className="rounded-[18px]" />
          <motion.div
            ref={ref}
            style={{ x: sw.x, touchAction: "pan-y" }}
            {...sw.bind}
            className={`no-select relative rounded-[18px] transition-shadow duration-300 ${r.open ? "bg-ground shadow-[var(--shadow-mid)]" : "bg-card"}`}
          >
            <div className="flex items-center gap-2.5 py-3 pl-3 pr-3">
              <button
                type="button"
                onClick={() => {
                  if (sw.dragged()) return;
                  haptic.select();
                  s.toggle(check.id);
                }}
                aria-expanded={r.open}
                className="min-w-0 flex-1 text-left outline-none"
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-[12px] font-semibold tabular-nums text-ink-faint">{check.id}</span>
                  <span className="truncate text-[17px] font-semibold leading-6 tracking-[-0.015em] text-ink">{check.title}</span>
                </span>
                <span className="mt-0.5 block truncate text-[13.5px] leading-5 text-ink-soft">{check.sub}</span>
              </button>
              <PhotoButton
                photos={r.photos}
                missing={r.missingPhoto || (check.photo.required && !r.photos.length)}
                dragged={sw.dragged}
                onPick={(f) => s.pickPhoto(check, f)}
                size={34}
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
                <CircleCheck key={r.pulse} status={r.status} fresh={r.pulse > 0} />
              </button>
            </div>
            <Expand open={r.open}>
              <div className="px-3 pb-4">
                <div className="mb-4 h-px bg-hair" />
                <CheckDetail
                  check={check}
                  status={r.status}
                  photos={r.photos}
                  highlight="var(--card)"
                  onClear={() => s.setMark(check.id, null)}
                  onRemovePhoto={(i) => s.removePhoto(check.id, i)}
                />
              </div>
            </Expand>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function ScreenC({ sheet }: { sheet: Sheet }) {
  const s = usePunchSheet(sheet);
  const { punch, t, dir, marks } = s;
  const { scale, origin } = useEdgeSquish();

  return (
    <div data-app className="min-h-dvh overflow-x-clip bg-card">
      <motion.main style={{ scale, transformOrigin: origin }} className="mx-auto w-full max-w-[520px] px-4">
        <header style={{ paddingTop: "calc(var(--sat) + 24px)" }}>
          <div className="flex items-center justify-between">
            <span className="mono text-ink-faint">AD · Puncheo</span>
            <VariantSwitch current="c" />
          </div>
        </header>

        <motion.section
          key={punch.id}
          initial={dir ? { opacity: 0, x: dir * 24 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={springs.snappy}
        >
          <div className="mt-5 flex items-center gap-4 rounded-[22px] bg-ground p-4 shadow-[var(--shadow-soft)]">
            <Gauge checks={punch.checks} marks={marks} done={t.done} total={t.total} />
            <div className="min-w-0">
              <span className="text-[13px] font-medium text-ink-faint">
                {sheet.title} {sheet.subtitle.replace("Vivienda ", "")} · Puncheo {punch.n}
              </span>
              <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink">{punch.name}</h1>
              <p className="mt-1 text-[12.5px] leading-[17px] text-ink-soft">{punch.moment}</p>
            </div>
          </div>

          <Legend />

          <ul className="mt-4">
            {punch.checks.map((c, i) => (
              <li key={c.id} data-check={c.id}>
                <RowC s={s} check={c} first={i === 0} last={i === punch.checks.length - 1} />
              </li>
            ))}
          </ul>
        </motion.section>
        <div style={{ height: "calc(var(--sab) + 110px)" }} />
      </motion.main>

      <Toast toast={s.toast} bottom={96} />
      <Pill s={s} sheet={sheet} />
    </div>
  );
}

/** AD Visual's bottom pill: white, soft shadow, the punches as round tabs and a blue action. */
function Pill({ s, sheet }: { s: PunchSheet; sheet: Sheet }) {
  return (
    <nav className="fixed left-1/2 z-30 -translate-x-1/2" style={{ bottom: "calc(var(--sab) + 18px)" }}>
      <div className="flex items-center gap-1 rounded-full bg-ground p-1.5 shadow-[var(--shadow-mid)]">
        {sheet.punches.map((p, i) => {
          const active = s.tab === i;
          const pt = s.punchTallies[i];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => s.switchTo(i)}
              aria-pressed={active}
              aria-label={p.name}
              className="relative grid size-11 place-items-center rounded-full"
            >
              {active ? (
                <motion.span layoutId="pill-tab" transition={springs.snappy} className="pointer-events-none absolute inset-0 rounded-full bg-card-2" />
              ) : null}
              <span className={`relative text-[16px] font-semibold ${active ? "text-brand" : "text-ink-faint"}`}>
                {pt.closed ? <CheckIcon size={16} strokeWidth={2.4} className="text-ok-deep" /> : p.n}
              </span>
            </button>
          );
        })}
        <span className="mx-1 h-6 w-px bg-hair" />
        <motion.button
          type="button"
          onClick={s.close}
          whileTap={{ scale: 0.96 }}
          transition={springs.snappy}
          className="flex h-11 items-center gap-2 rounded-full px-5 transition-colors duration-300"
          style={{ background: s.isClosed ? "var(--ok)" : s.ready ? "var(--brand)" : "var(--hair-2)" }}
        >
          {!s.ready && !s.isClosed ? <LockIcon size={14} className="text-ink-soft" /> : null}
          <span className={`whitespace-nowrap text-[14px] font-semibold ${s.ready || s.isClosed ? "text-ground" : "text-ink-soft"}`}>
            {s.isClosed ? "Ficha cerrada" : "Cerrar ficha"}
          </span>
        </motion.button>
      </div>
    </nav>
  );
}
