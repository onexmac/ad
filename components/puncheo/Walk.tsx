"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import type { Key } from "@/data/puncheo/rooms";
import { CheckIcon } from "./Icons";
import { RailRow, type RowSkin } from "./RailRow";
import type { PunchSheet } from "./usePunchSheet";
import { PULL_COMMIT, useSectionPull } from "./useSectionPull";

/** The rooms of the punch as tappable chips, with each room's progress. */
export function RoomStrip({ s }: { s: PunchSheet }) {
  return (
    <div className="no-scrollbar -mx-4 mt-5 flex gap-1.5 overflow-x-auto px-4">
      {s.punch.sections.map((x, i) => {
        const t = s.sectionTallies[i];
        const active = i === s.section;
        const done = t.done === t.total;
        return (
          <button
            key={x.id}
            type="button"
            onClick={() => {
              if (active) return;
              haptic.select();
              s.goSection(i);
            }}
            aria-current={active ? "true" : undefined}
            className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5"
          >
            {active ? <motion.span layoutId="room-chip" transition={springs.snappy} className="pointer-events-none absolute inset-0 rounded-full bg-ink" /> : null}
            {!active ? <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_var(--hair-2)]" /> : null}
            <span className={`relative text-[14px] font-semibold ${active ? "text-ground" : "text-ink-2"}`}>{x.name}</span>
            <span className={`relative text-[12px] font-medium tabular-nums ${active ? "text-ink-faint" : "text-ink-faint"}`}>
              {done ? <CheckIcon size={12} strokeWidth={2.6} className="text-ok" /> : `${t.done}/${t.total}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A key fact from the sheet, set apart in AD Visual's hairline table. */
function KeyBlock({ k, rail }: { k: Key; rail: boolean }) {
  return (
    <div className="relative flex">
      <div className="relative w-7 shrink-0" aria-hidden>
        {rail ? <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-hair-2" /> : null}
      </div>
      <div className="min-w-0 flex-1 pb-4 pt-1.5">
        <span className="mono block pb-1.5 text-ink-faint">Clave · {k.title}</span>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] border-y border-ink">
          {k.rows.map(([key, val], i) => (
            <div key={key} className={`col-span-2 grid grid-cols-subgrid ${i ? "border-t border-hair" : ""}`}>
              <span className="mono py-2.5 pr-4 text-ink-faint">{key}</span>
              <span className="py-2 text-[15px] leading-5 text-ink">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupLabel({ label, rail }: { label: string; rail: boolean }) {
  return (
    <div className="relative flex">
      <div className="relative w-7 shrink-0" aria-hidden>
        {rail ? <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-hair-2" /> : null}
        <span className="absolute left-1/2 top-[13px] h-[2px] w-3 bg-hair-2" />
      </div>
      <span className="mono pb-2.5 pl-1 pt-2 text-ink-soft" style={{ fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

/** The end of a section: pull up for the next one; while holding, slide sideways to pick another. */
function PullCard({ s, lift, armed, target, pulling }: { s: PunchSheet; lift: MotionValue<number>; armed: boolean; target: number; pulling: boolean }) {
  const sections = s.punch.sections;
  const last = s.section === sections.length - 1;
  const goingBack = target < s.section;
  const fill = useTransform(lift, [0, 170 * (1 - Math.exp((-0.6 * PULL_COMMIT) / 170))], [0, 1]);
  const t = sections[target];
  return (
    <div className="mt-4 pl-7">
      <div className="relative overflow-hidden rounded-[20px] bg-ink px-4 pb-4 pt-3.5 text-ground">
        {/* Fills toward the mark as the pull grows. */}
        <motion.span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] origin-left bg-brand" style={{ scaleX: fill }} aria-hidden />
        <span className="mono block text-ink-faint">
          {target === s.section ? (last ? "Fin del puncheo" : "Siguiente sección") : armed ? "Soltá para ir a" : goingBack ? "Volver a" : "Siguiente sección"}
        </span>
        <span className="mt-1 flex items-baseline justify-between gap-3">
          <span className="text-[24px] font-semibold tracking-[-0.02em]">
            {target === s.section ? (last ? "Cerrar ficha" : sections[s.section + 1]?.name) : t.name}
          </span>
          <span className="text-[13px] text-ink-faint">{target === s.section ? (last ? "o elegí una sección" : "") : t.note}</span>
        </span>
        <div className="mt-3 flex gap-1">
          {sections.map((x, i) => (
            <span key={x.id} className="relative flex-1">
              <span
                className="relative block truncate rounded-[6px] px-1 py-1.5 text-center text-[11px] font-semibold transition-colors duration-150"
                style={{
                  background: i === target && pulling ? "var(--brand)" : i === s.section ? "var(--ink-3)" : "var(--ink-2)",
                  color: i === target && pulling ? "var(--ground)" : i === s.section ? "var(--hair)" : "var(--ink-faint)",
                }}
              >
                {x.name}
              </span>
            </span>
          ))}
        </div>
        <span className="mt-3 block text-[12px] text-ink-faint">Deslizá hacia arriba; sin soltar, mové el dedo de lado para elegir.</span>
      </div>
    </div>
  );
}

/**
 * The current room of the punch: its title, its checks on the rail with the
 * group labels and key facts between them, and the pull into the next room.
 */
export function Walk({ s, skin }: { s: PunchSheet; skin: RowSkin }) {
  const { sec, secDir } = s;
  const pull = useSectionPull({ count: s.punch.sections.length, current: s.section, onCommit: (i) => s.goSection(i) });
  const y = useTransform(pull.lift, (v) => -v);
  const checkIdx = sec.items.map((it, i) => (it.kind === "check" ? i : -1)).filter((i) => i >= 0);
  const firstCheck = checkIdx[0];
  const lastCheck = checkIdx[checkIdx.length - 1];
  const st = s.sectionTallies[s.section];

  return (
    <motion.div style={{ y }}>
      <motion.section
        key={`${s.punch.id}-${sec.id}`}
        id="puncheo-section"
        initial={secDir ? { opacity: 0, y: secDir * 70 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.settling}
        className="mt-6"
      >
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="mono text-ink-faint">
              Sección {s.section + 1} de {s.punch.sections.length}
            </span>
            <h2 className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink">{sec.name}</h2>
            <p className="mt-1.5 text-[13px] text-ink-soft">{sec.note}</p>
          </div>
          <span className="shrink-0 leading-none tabular-nums">
            <span className="text-[24px] font-medium tracking-[-0.02em] text-ink">{String(st.done).padStart(2, "0")}</span>
            <span className="text-[14px] text-ink-faint">/{st.total}</span>
          </span>
        </div>

        <ul className="mt-5">
          {sec.items.map((it, i) => {
            const rail = i > firstCheck && i < lastCheck;
            if (it.kind === "group") return <li key={`g-${it.label}`}><GroupLabel label={it.label} rail={rail} /></li>;
            if (it.kind === "key") return <li key={`k-${it.key.title}`}><KeyBlock k={it.key} rail={rail} /></li>;
            const c = s.byId.get(it.id)!;
            return (
              <li key={c.id} data-check={c.id}>
                <RailRow s={s} check={c} first={i === firstCheck} last={i === lastCheck} skin={skin} />
              </li>
            );
          })}
        </ul>
      </motion.section>
      <PullCard s={s} lift={pull.lift} armed={pull.armed} target={pull.target} pulling={pull.pulling} />
    </motion.div>
  );
}
