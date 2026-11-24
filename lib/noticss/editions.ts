import type { Category, Edition, Indicator, Note, Picture, Subject, Weather } from "@/data/noticss/types";
import { rawEditions } from "@/data/noticss/index";

/*
 * The raw edition files: Circa's schema (v5) for the first two, v6 since
 * (morning and afternoon editions, with a suggestion pool), written by
 * scripts/noticss/edition.mjs and listed in data/noticss/index.ts. This maps
 * them to the app's shape.
 */

type RawImage = { url: string; color?: string | null; alt: string; credit: string | null } | null | undefined;
type RawNote = Omit<Note, "image" | "corrected" | "why"> & { image: RawImage; corrected?: string | null; why: string | null };
type RawSubject = Omit<Subject, "image" | "notes" | "scope"> & { image?: RawImage; scope?: "cr" | "mundo"; snippets: RawNote[] };
type RawEdition = {
  date: string;
  suggestions?: RawSubject[];
  weather?: (Weather & Record<string, unknown>) | null;
  indicators: Indicator[];
  subjects: RawSubject[];
};

/** Where the photos are served from; the artifact build rewrites it. */
export const SHOTS = "/kit/noticss/shots/";

const picture = (im: RawImage): Picture | null => {
  if (!im) return null;
  const url = im.color ?? im.url;
  // Newer editions link the outlet's own photo; the first ones carry theirs.
  if (/^https?:\/\//.test(url)) return { src: url, alt: im.alt, credit: im.credit };
  return { src: SHOTS + url.split("/").pop()!, alt: im.alt, credit: im.credit };
};

const subjectsOf = (list: RawSubject[] = []): Subject[] =>
  list.map((s) => ({
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

function edition(raw: RawEdition, number: number, slot: Edition["slot"]): Edition {
  const subjects = subjectsOf(raw.subjects);
  const w = raw.weather;
  return {
    date: raw.date,
    slot,
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
    suggestions: subjectsOf(raw.suggestions),
  };
}

/** Newest first. Nº counts from the first edition (Circa started on 6 Sept). */
export const editions: Edition[] = rawEditions.map((e) => edition(e.raw as unknown as RawEdition, e.number, e.slot as Edition["slot"]));

/** An edition's identity: two can share a date (morning and afternoon). */
export const editionKey = (ed: Pick<Edition, "date" | "slot">) => (ed.slot ? `${ed.date}-${ed.slot}` : ed.date);

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
    suggestions: ed.suggestions.map((s) => ({ ...s, image: fix(s.image), notes: s.notes.map((n) => ({ ...n, image: fix(n.image) })) })),
  }));
}
