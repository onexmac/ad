"use client";

import { motion, type MotionValue } from "motion/react";
import type { Edition } from "@/data/noticss/types";
import { longDate, weekday } from "@/lib/noticss/format";
import { RainStrip } from "../Figures";
import { BOTTOM, S, type SectionDef } from "./model";

/** A section's cover: full bleed behind its tray. Hoy is today's sky. */
export function Cover({
  section,
  index,
  count,
  edition,
  photoX,
}: {
  section: SectionDef;
  index: number;
  count: number;
  edition: Edition;
  photoX: MotionValue<number>;
}) {
  const w = edition.weather;
  if (section.kind === "hoy") {
    const sky = w?.sky ?? ["#6f6a62", "#8f897f", "#b3ada2", "#d2cdc3", "#ebe6dc"];
    return (
      <div data-cover={index} className="absolute inset-0 text-paper" style={{ background: `linear-gradient(180deg, ${sky.join(", ")})` }}>
        <div
          className="absolute inset-x-0 top-[calc(46px+var(--sat))] flex flex-col overflow-hidden px-5"
          style={{ bottom: `calc(${S * 100}% + ${BOTTOM + 40}px + var(--sab))` }}
        >
          <p className="mono text-paper/80">
            Nº {edition.number} · {weekday(edition.date)}
          </p>
          <h1 className="mt-1 text-[19vw] italic leading-[0.86] tracking-[-0.03em] text-paper min-[520px]:text-[98px]" style={{ fontVariationSettings: '"opsz" 72' }}>
            Noticss
          </h1>
          <p className="mt-2 text-[16px] italic text-paper/90">{longDate(edition.date)}</p>
          <div className="mt-auto flex items-end gap-4 pt-3">
            <span className="lnum text-[68px] font-light leading-[0.8] tracking-[-0.04em]">{w?.tempC ?? "—"}°</span>
            <span className="pb-1 text-[15px] leading-snug">
              <span className="block italic">{w?.condition ?? "sin pronóstico"}</span>
              <span className="mono block text-paper/75">
                {w?.place ?? ""} · {w?.minC ?? "—"}° / {w?.maxC ?? "—"}°
              </span>
            </span>
          </div>
          <div className="mt-4 max-w-[340px] shrink-0 text-paper [@media(max-height:700px)]:hidden [&_.bg-ink]:bg-paper [&_.bg-ink\/25]:bg-paper/35 [&_.text-ink-faint]:text-paper/60">
            <RainStrip hours={w?.rainHours ?? null} />
          </div>
        </div>
        <SectionLabel name="Hoy" sub={`${edition.subjects.length} temas`} index={index} count={count} />
      </div>
    );
  }
  const lead = section.lead;
  return (
    <div data-cover={index} className="absolute inset-0 overflow-hidden bg-ink text-paper">
      {lead?.image ? (
        <motion.img
          src={lead.image.src}
          alt={lead.image.alt}
          draggable={false}
          className="absolute inset-y-0 left-[-20%] h-full w-[140%] max-w-none object-cover"
          style={{ x: photoX, filter: "saturate(.92) contrast(1.04)" }}
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.55)_0%,rgba(0,0,0,.05)_32%,rgba(0,0,0,.1)_45%,rgba(0,0,0,.82)_62%,rgba(0,0,0,.92)_100%)]" />
      <div className="absolute inset-x-0 top-[calc(54px+var(--sat))] px-5">
        <h2 className="text-[19vw] italic leading-[0.86] tracking-[-0.025em] min-[520px]:text-[98px]" style={{ fontVariationSettings: '"opsz" 72' }}>
          {section.name}
        </h2>
        {lead ? <p className="mt-4 max-w-[30ch] text-[21px] leading-[1.18]">{lead.title}</p> : null}
        {lead?.image?.credit ? <p className="mt-2 text-[12px] italic text-paper/60">Foto: {lead.image.credit}</p> : null}
      </div>
      <SectionLabel name={section.name} sub={`${section.cards.length} páginas`} index={index} count={count} />
    </div>
  );
}

/** The line just above the tray: section, count, and the hint. */
export function SectionLabel({ name, sub, index, count }: { name: string; sub: string; index: number; count: number }) {
  return (
    <div className="absolute inset-x-0 px-[14px]" style={{ bottom: `calc(${S * 100}% + ${BOTTOM + 12}px + var(--sab))` }}>
      <div className="mono flex items-baseline justify-between text-paper/75">
        <span>
          {name} · {sub}
        </span>
        <span>
          {index + 1} / {count}
        </span>
      </div>
    </div>
  );
}

