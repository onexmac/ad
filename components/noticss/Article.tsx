import type { ReactNode } from "react";
import { categoryName, kindName, type Edition, type Note, type Subject } from "@/data/noticss/types";
import { longDate, shortDate } from "@/lib/noticss/format";
import { Arrow } from "@/components/updatr/Arrow";

type C = (p: { i: number; children: ReactNode; className?: string }) => ReactNode;
const Plain: C = ({ children, className }) => <div className={className}>{children}</div>;

/** A note's words: headline, body, why it matters, the correction if any, tags, source. */
export function NoteBody({ note, subject, edition, C = Plain, start = 1 }: { note: Note; subject: Subject; edition: Edition; C?: C; start?: number }) {
  return (
    <>
      <C i={start} className="mono mt-6 flex flex-wrap gap-x-3 text-ink-soft">
        <span className="text-accent">{categoryName[subject.category]}</span>
        <span>{kindName[note.kind]}</span>
        <span>{note.published ? shortDate(note.published) : longDate(edition.date)}</span>
      </C>
      <C i={start + 1}>
        <h2 className={`mt-3 text-[34px] leading-[1.04] tracking-[-0.012em] ${note.corrected ? "line-through decoration-accent/70 decoration-1" : ""}`}>
          {note.headline}
        </h2>
      </C>
      {note.corrected ? (
        <C i={start + 2} className="mt-5 border-y border-accent py-3">
          <p className="mono text-accent">Corrección</p>
          <p className="mt-1 text-[16px] italic leading-[1.4]">{note.corrected}</p>
        </C>
      ) : null}
      <C i={start + 3}>
        <p className="mt-5 text-[19px] leading-[1.5] first-letter:float-left first-letter:mr-[6px] first-letter:mt-[4px] first-letter:text-[58px] first-letter:leading-[0.78] first-letter:text-accent">
          {note.body}
        </p>
      </C>
      {note.why ? (
        <C i={start + 4} className="mt-8 grid grid-cols-[18px_1fr] gap-3">
          <span className="mt-[3px] block h-full w-[2px] justify-self-center bg-accent" />
          <div>
            <p className="mono text-ink-soft">Por qué importa</p>
            <p className="mt-2 text-[18px] italic leading-[1.42] text-ink/90">{note.why}</p>
          </div>
        </C>
      ) : null}
      <C i={start + 5} className="mt-8">
        <p className="mono text-ink-soft">Del tema</p>
        <p className="mt-1 text-[17px] leading-snug">{subject.title}</p>
      </C>
      {note.tags.length ? (
        <C i={start + 6} className="mt-6 flex flex-wrap gap-x-4 gap-y-1">
          {note.tags.map((t) => (
            <span key={t} className="text-[15px] italic text-ink-soft">
              #{t}
            </span>
          ))}
        </C>
      ) : null}
      <C i={start + 7}>
        <SourceLine name={note.source.name} url={note.source.url} credit={note.image?.credit} />
      </C>
    </>
  );
}

/** A subject's words: the synopsis as the dek, then its notes as numbered paragraphs. */
export function SubjectBody({
  subject,
  edition,
  C = Plain,
  start = 1,
  onNote,
}: {
  subject: Subject;
  edition: Edition;
  C?: C;
  start?: number;
  onNote?: (n: Note) => void;
}) {
  return (
    <>
      <C i={start} className="mono mt-6 flex flex-wrap gap-x-3 text-ink-soft">
        <span className="text-accent">{categoryName[subject.category]}</span>
        <span>{subject.scope === "mundo" ? "Mundo" : "Costa Rica"}</span>
        <span>{longDate(edition.date)}</span>
      </C>
      <C i={start + 1}>
        <h2 className="mt-3 text-[38px] leading-[1.02] tracking-[-0.015em]">{subject.title}</h2>
      </C>
      <C i={start + 2}>
        <p className="mt-5 text-[21px] italic leading-[1.42] text-ink/90">{subject.synopsis}</p>
      </C>
      <C i={start + 3} className="mt-8 flex items-baseline justify-between border-b border-ink pb-2">
        <span className="mono">Las notas</span>
        <span className="mono text-ink-soft">{subject.notes.length}</span>
      </C>
      {subject.notes.map((n, i) => (
        <C key={n.id} i={start + 4 + i}>
          <button
            type="button"
            onClick={() => onNote?.(n)}
            disabled={!onNote}
            className="grid w-full grid-cols-[30px_1fr] gap-2 border-b border-rule-soft py-4 text-left"
          >
            <span className="pt-[2px] text-[15px] italic text-accent">{i + 1}</span>
            <span>
              <span className={`block text-[19px] leading-[1.2] ${n.corrected ? "line-through decoration-accent/70" : ""}`}>{n.headline}</span>
              <span className="mt-1 block text-[15px] leading-[1.45] text-ink-soft">{n.body}</span>
              <span className="mono mt-2 block text-ink-faint">
                {n.source.name} · {shortDate(n.published)}
              </span>
            </span>
          </button>
        </C>
      ))}
    </>
  );
}

export function SourceLine({ name, url, credit }: { name: string; url: string | null; credit?: string | null }) {
  const inner = (
    <>
      <span>
        <span className="mono block text-ink-soft">Fuente</span>
        <span className="mt-1 block text-[18px]">{name}</span>
        {credit && credit !== name ? <span className="mt-1 block text-[13px] italic text-ink-soft">Foto: {credit}</span> : null}
      </span>
      {url ? <Arrow dir="out" /> : null}
    </>
  );
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="mt-10 flex items-center justify-between border-y border-ink py-4">
      {inner}
    </a>
  ) : (
    <div className="mt-10 flex items-center justify-between border-y border-ink py-4">{inner}</div>
  );
}
