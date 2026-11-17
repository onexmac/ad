import type { Category, Edition, Indicator, Note, Picture, Subject, Weather } from "@/data/noticss/types";
import e0906 from "@/data/noticss/2026-09-06.json";
import e0909 from "@/data/noticss/2026-09-09.json";

/* The raw edition files are Circa's, verbatim. This maps them to the app's shape. */

type RawImage = { url: string; color?: string | null; alt: string; credit: string | null } | null | undefined;
type RawNote = Omit<Note, "image" | "corrected" | "why"> & { image: RawImage; corrected?: string | null; why: string | null };
type RawSubject = Omit<Subject, "image" | "notes" | "scope"> & { image?: RawImage; scope?: "cr" | "mundo"; snippets: RawNote[] };
type RawEdition = {
  date: string;
  weather?: (Weather & Record<string, unknown>) | null;
  indicators: Indicator[];
  subjects: RawSubject[];
};

/** Where the photos are served from; the artifact build rewrites it. */
export const SHOTS = "/kit/noticss/shots/";

const picture = (im: RawImage): Picture | null => {
  if (!im) return null;
  const file = (im.color ?? im.url).split("/").pop()!;
  return { src: SHOTS + file, alt: im.alt, credit: im.credit };
};

function edition(raw: RawEdition, number: number): Edition {
  const subjects: Subject[] = raw.subjects.map((s) => ({
    id: s.id,
    category: s.category as Category,
    scope: s.scope ?? (s.category === "geopolitica" ? "mundo" : "cr"),
    title: s.title,
    synopsis: s.synopsis,
    importance: s.importance,
    image: picture(s.image),
    notes: s.snippets.map((n) => ({
      id: n.id,
      kind: n.kind,
      importance: n.importance,
      published: n.published,
      headline: n.headline,
      body: n.body,
      why: n.why,
      corrected: n.corrected ?? null,
      image: picture(n.image),
      tags: n.tags,
      source: n.source,
    })),
  }));
  const w = raw.weather;
  return {
    date: raw.date,
    number,
    weather: w
      ? {
          place: w.place,
          tempC: w.tempC,
          maxC: w.maxC,
          minC: w.minC,
          condition: w.condition,
          glyph: w.glyph,
          rainProb: w.rainProb,
          sunrise: w.sunrise,
          sunset: w.sunset,
          rainHours: w.rainHours,
          sky: w.sky,
        }
      : null,
    indicators: raw.indicators,
    subjects,
  };
}

/** Newest first. Nº counts from the first edition (Circa started on 6 Sept). */
export const editions: Edition[] = [edition(e0909 as RawEdition, 2), edition(e0906 as RawEdition, 1)];

/** Every note of an edition with the subject it belongs to, in edition order. */
export function notesOf(ed: Edition) {
  return ed.subjects.flatMap((s) => s.notes.map((n) => ({ note: n, subject: s })));
}

/** Rewrites every photo path (the artifact serves them from a relative folder). */
export function rebase(list: Edition[], to: string): Edition[] {
  const fix = (p: Picture | null) => (p ? { ...p, src: p.src.replace(SHOTS, to) } : p);
  return list.map((ed) => ({
    ...ed,
    subjects: ed.subjects.map((s) => ({ ...s, image: fix(s.image), notes: s.notes.map((n) => ({ ...n, image: fix(n.image) })) })),
  }));
}
