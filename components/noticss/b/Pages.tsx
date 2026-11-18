"use client";

import { memo, useRef, type RefObject } from "react";
import { categoryName, kindName, type Edition, type Indicator, type Note, type Subject } from "@/data/noticss/types";
import { dayMonth, longDate, shortDate } from "@/lib/noticss/format";
import { Arrow } from "@/components/updatr/Arrow";
import { SourceLine } from "../Article";
import { Delta, Sparkline } from "../Figures";
import type { Card } from "./model";

export type Pick = (noteId: string, from: DOMRect) => void;

/**
 * A page: the card at full size. Only the page in view scrolls and takes
 * taps; the rest are pictures of themselves. Far from the view a page is a
 * plain sheet with its headline (cheap to keep in the row).
 */
export const Page = memo(function Page({
  card,
  edition,
  live,
  id,
  h,
  light,
  next,
  onPick,
}: {
  card: Card;
  edition: Edition;
  live: boolean;
  id: string;
  h: number;
  light: boolean;
  next: string | null;
  onPick: Pick;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  // The photo drifts at half speed as the page scrolls (depth, Push Pop style).
  const onScroll = () => {
    const y = scroller.current?.scrollTop ?? 0;
    if (photo.current) photo.current.style.transform = `translate3d(0, ${Math.max(0, y) * 0.5}px, 0)`;
  };
  if (light) {
    const title = card.type === "figures" ? "Los números del día" : card.type === "subject" ? card.subject.title : card.note.headline;
    return (
      <div className="h-full w-full bg-ground px-6 pt-[55%]">
        <p className="text-[36px] leading-[1.02] text-ink/80">{title}</p>
      </div>
    );
  }
  return (
    <div
      ref={scroller}
      data-page={id}
      onScroll={onScroll}
      className={`no-scrollbar h-full w-full overscroll-none ${live ? "pointer-events-auto overflow-y-auto" : "pointer-events-none overflow-hidden"}`}
    >
      {card.type === "figures" ? (
        <FiguresPage indicators={card.indicators} edition={edition} />
      ) : card.type === "subject" ? (
        <SubjectPage subject={card.subject} edition={card.from ?? edition} earlier={!!card.from} photo={photo} h={h} id={id} onPick={onPick} />
      ) : (
        <NotePage note={card.note} subject={card.subject} edition={card.from ?? edition} photo={photo} h={h} id={id} next={next} />
      )}
    </div>
  );
});

/** The media slot: today a photo, later a vertical short. Its holder is where a lifted picture comes home. */
function Media({ src, alt, photo, h, id }: { src: string; alt: string; photo: RefObject<HTMLDivElement | null>; h: number | string; id: string }) {
  return (
    <div className="relative overflow-hidden bg-ink" style={{ height: h }}>
      <div ref={photo} data-media={id} className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} draggable={false} className="block h-full w-full object-cover" style={{ filter: "saturate(.92) contrast(1.03)" }} />
      </div>
    </div>
  );
}

function SubjectPage({
  subject,
  edition,
  earlier,
  photo,
  h,
  id,
  onPick,
}: {
  subject: Subject;
  edition: Edition;
  earlier: boolean;
  photo: RefObject<HTMLDivElement | null>;
  h: number;
  id: string;
  onPick: Pick;
}) {
  return (
    <div className="min-h-full bg-ground pb-[calc(110px+var(--sab))]">
      <div className="relative" style={{ height: h }}>
        {subject.image ? <Media src={subject.image.src} alt={subject.image.alt} photo={photo} h={h} id={id} /> : <div className="absolute inset-0 bg-paper" />}
        <div className={`pointer-events-none absolute inset-0 ${subject.image ? "bg-[linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,.78)_78%)]" : ""}`} />
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-[calc(96px+var(--sab))] ${subject.image ? "text-paper" : "text-ink"}`}>
          <p className={`mono ${subject.image ? "text-paper/80" : "text-accent"}`}>
            {categoryName[subject.category]} · {subject.scope === "mundo" ? "Mundo" : "Costa Rica"}
          </p>
          <h2 className="mt-3 text-[44px] leading-[0.98] tracking-[-0.018em]" style={{ fontVariationSettings: '"opsz" 60' }}>
            {subject.title}
          </h2>
          <p className={`mt-4 text-[13px] italic ${subject.image ? "text-paper/70" : "text-ink-soft"}`}>
            {earlier ? `De la edición del ${dayMonth(edition.date)} · ` : ""}
            {subject.notes.length} notas · {shortDate(edition.date)}
            {subject.image?.credit ? ` · Foto: ${subject.image.credit}` : ""}
          </p>
        </div>
      </div>
      <div className="px-6 pt-10">
        <p className="text-[23px] italic leading-[1.4] first-letter:float-left first-letter:mr-2 first-letter:mt-[6px] first-letter:text-[64px] first-letter:not-italic first-letter:leading-[0.74] first-letter:text-accent">
          {subject.synopsis}
        </p>
        <div className="mt-10 border-t-[3px] border-ink pt-2">
          <p className="mono">Las notas</p>
        </div>
        {subject.notes.map((n, i) => (
          <button
            key={n.id}
            type="button"
            onClick={(e) => onPick(n.id, e.currentTarget.getBoundingClientRect())}
            className="grid w-full grid-cols-[28px_1fr_16px] items-start gap-2 border-b border-rule-soft py-4 text-left active:bg-ink/[0.04]"
          >
            <span className="lnum pt-[2px] text-[16px] italic text-accent">{i + 1}</span>
            <span>
              <span className={`block text-[19px] leading-[1.2] ${n.corrected ? "line-through decoration-accent/70" : ""}`}>{n.headline}</span>
              <span className="mono mt-1 block text-ink-faint">
                {n.source.name} · {kindName[n.kind]}
              </span>
            </span>
            <span className="pt-1 text-ink-faint">
              <Arrow dir="right" />
            </span>
          </button>
        ))}
        <p className="mt-6 text-[15px] italic text-ink-soft">Toque una nota, o siga bajando.</p>
      </div>
    </div>
  );
}

function NotePage({
  note,
  subject,
  edition,
  photo,
  h,
  id,
  next,
}: {
  note: Note;
  subject: Subject;
  edition: Edition;
  photo: RefObject<HTMLDivElement | null>;
  h: number;
  id: string;
  next: string | null;
}) {
  return (
    <div className="min-h-full bg-ground pb-[calc(120px+var(--sab))]">
      {note.image ? (
        <Media src={note.image.src} alt={note.image.alt} photo={photo} h={`calc(${Math.round(h * 0.52)}px + var(--sat))`} id={id} />
      ) : (
        <div className="relative flex items-end overflow-hidden bg-paper px-6 pb-6" style={{ height: `calc(${Math.round(h * 0.44)}px + var(--sat))` }}>
          <span className="pointer-events-none absolute -right-4 -top-10 select-none text-[260px] italic leading-none text-accent/10">
            {note.kind === "quote" ? "“" : note.kind === "number" ? "№" : "§"}
          </span>
          <p className="relative text-[15px] italic text-ink-soft">{subject.title}</p>
        </div>
      )}
      <div className="relative bg-ground px-6 pt-6">
        <p className="mono text-accent">
          {categoryName[subject.category]} · {kindName[note.kind]} · {shortDate(note.published)}
        </p>
        <h2
          className={`mt-3 text-[36px] leading-[1.02] tracking-[-0.012em] ${note.corrected ? "line-through decoration-accent/70 decoration-1" : ""}`}
          style={{ fontVariationSettings: '"opsz" 48' }}
        >
          {note.headline}
        </h2>
        {note.corrected ? (
          <div className="mt-5 border-y border-accent py-3">
            <p className="mono text-accent">Corrección</p>
            <p className="mt-1 text-[17px] italic leading-[1.4]">{note.corrected}</p>
          </div>
        ) : null}
        <p className="mt-5 text-[19px] leading-[1.52]">{note.body}</p>
        {note.why ? (
          <div className="mt-8 border-l-[2px] border-accent pl-4">
            <p className="mono text-ink-soft">Por qué importa</p>
            <p className="mt-2 text-[19px] italic leading-[1.42] text-ink/90">{note.why}</p>
          </div>
        ) : null}
        {note.tags.length ? (
          <div className="mt-7 flex flex-wrap gap-x-4 gap-y-1">
            {note.tags.map((t) => (
              <span key={t} className="text-[15px] italic text-ink-soft">
                #{t}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mono mt-8 text-ink-soft">Del tema</p>
        <p className="mt-1 text-[17px] leading-snug">{subject.title}</p>
        <SourceLine name={note.source.name} url={note.source.url} credit={note.image?.credit} />
        <p className="mt-6 text-[13px] italic text-ink-faint">Edición del {longDate(edition.date).toLowerCase()}</p>
        {next ? (
          <div className="mt-12 border-t border-rule-soft pt-4">
            <p className="mono flex items-center gap-2 text-ink-soft">
              Siga bajando <Arrow dir="down" />
            </p>
            <p className="mt-1 text-[17px] italic leading-snug text-ink-soft">{next}</p>
          </div>
        ) : (
          <p className="mono mt-12 border-t border-rule-soft pt-4 text-ink-faint">Fin de la sección</p>
        )}
      </div>
    </div>
  );
}

function FiguresPage({ indicators, edition }: { indicators: Indicator[]; edition: Edition }) {
  return (
    <div className="min-h-full bg-paper px-6 pb-[calc(120px+var(--sab))] pt-[calc(64px+var(--sat))]">
      <p className="mono text-accent">Cifras · {shortDate(edition.date)}</p>
      <h2 className="mt-3 text-[52px] italic leading-[0.95] tracking-[-0.02em]" style={{ fontVariationSettings: '"opsz" 72' }}>
        Los números del día
      </h2>
      <div className="mt-8">
        {indicators.map((ind) => (
          <div key={ind.id} className="grid grid-cols-[1fr_auto] items-end gap-4 border-t border-rule-soft py-5">
            <div>
              <p className="mono text-ink-soft">{ind.label}</p>
              <p className="lnum mt-1 text-[46px] font-light leading-none tracking-[-0.02em]">{ind.value ?? "—"}</p>
              <p className="mt-2 text-[13px] italic leading-snug text-ink-soft">{ind.note}</p>
            </div>
            <div className="pb-1 text-right">
              <Sparkline series={ind.series} className="ml-auto text-ink" w={104} h={32} />
              <p className="lnum mt-1 text-[13px]">
                <Delta d={ind.delta} />
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] italic text-ink-faint">Un guion es un dato que no se pudo verificar: nunca se inventa.</p>
    </div>
  );
}

export function titleOf(card: Card) {
  return card.type === "figures" ? "Los números del día" : card.type === "subject" ? card.subject.title : card.note.headline;
}
