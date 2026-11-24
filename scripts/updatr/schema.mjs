/**
 * Updatr: the shape of one edition on disk (data/updatr/<year>-W<week>.json).
 *
 * An edition is a week's issue (Nº = ISO week). The daily run updates the
 * week's file: new entries are added, an entry whose story moved on is
 * replaced under the same id. `suggestions` is a wider pool the reader's own
 * taste picks from (about a third of what the issue shows), as in Noticss.
 *
 * The model fills the brief through structured output; photos and numbering
 * come after. Dates the sources don't give are null: nothing is invented.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
/** What the reader follows (shared with the app). */
export const FRANCHISES = JSON.parse(fs.readFileSync(path.join(ROOT, "data/updatr/franchises.json"), "utf8"));
export const KINDS = ["game", "collab", "skin", "character", "movie", "book", "tv"];
export const STATUSES = ["out", "live", "upcoming"];

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** One entry as the model writes it. */
export const Entry = z.object({
  id: z.string(),
  franchise: z.enum(FRANCHISES.map((f) => f.id)),
  kind: z.enum(KINDS),
  status: z.enum(STATUSES),
  importance: z.number().int(),
  title: z.string(),
  dek: z.string(),
  body: z.array(z.string()),
  date: day.nullable(),
  when: day.nullable(),
  tags: z.array(z.string()),
  source: z.string(),
  url: z.string().nullable(),
  /** Other pages on the same story: where a picture is looked for when the source has none. */
  also: z.array(z.string()),
  image: z.string().nullable(),
});

/**
 * What the model writes: the week's entries, the suggestion pool, and, for
 * entries already in the tracker without a picture, other pages on their
 * story where one may be found.
 */
export const Brief = z.object({
  items: z.array(Entry),
  suggestions: z.array(Entry),
  pictures: z.array(z.object({ id: z.string(), also: z.array(z.string()) })),
});

/** An entry as stored: empty fields left out, the app's Item shape. */
export const Stored = z.object({
  id: z.string(),
  franchise: z.string(),
  kind: z.enum(KINDS),
  status: z.enum(STATUSES),
  importance: z.number().int().optional(),
  title: z.string(),
  dek: z.string(),
  body: z.array(z.string()),
  date: day.nullable(),
  when: day.optional(),
  tags: z.array(z.string()).optional(),
  source: z.string(),
  url: z.string().optional(),
  image: z.string().optional(),
  mock: z.boolean().optional(),
});

/** The whole file. */
export const Edition = z.object({
  schemaVersion: z.literal(1),
  year: z.number().int(),
  week: z.number().int(),
  /** The day of the last update (Costa Rica): the app's "today". */
  date: day,
  updatedAt: z.string(),
  isSample: z.boolean(),
  items: z.array(Stored),
  suggestions: z.array(Stored),
});

const slug = (s) =>
  String(s || "x")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "x";

/** Model entry → stored entry (nulls dropped). */
export function store(e) {
  const out = { ...e };
  for (const k of ["when", "url", "image"]) if (out[k] == null) delete out[k];
  if (!out.tags?.length) delete out.tags;
  // Kept for the picture search, then left out of the file (Stored has no such field).
  if (!out.also?.length) delete out.also;
  return out;
}

/**
 * What the schema alone can't hold the model to: ids unique and slugged (an
 * id is a story's identity across days, so a followed one is found again),
 * importance 1..3, a few paragraphs, no suggestion repeating an entry.
 */
export function tidy(brief) {
  const problems = [];
  const seen = new Set();
  const uniq = (id) => {
    const base = slug(id);
    let out = base;
    for (let i = 2; seen.has(out); i++) out = `${base}-${i}`;
    seen.add(out);
    return out;
  };
  const fix = (e) => ({
    ...e,
    id: uniq(e.id),
    importance: Math.max(1, Math.min(3, Math.round(e.importance || 1))),
    body: e.body.filter(Boolean).slice(0, 4),
    tags: e.tags.map((t) => t.toLowerCase().trim()).filter(Boolean).slice(0, 3),
    also: [...new Set((e.also ?? []).filter((u) => /^https?:\/\//.test(u) && u !== e.url))].slice(0, 3),
    image: null,
  });
  // An entry nobody can check is not published: without a source page it is
  // dropped here, so an earlier, sourced version of the same story stays.
  const sourced = (e) => {
    if (e.url && /^https?:\/\//.test(e.url)) return true;
    problems.push(`${slug(e.id)}: no source url, dropped`);
    return false;
  };
  const items = brief.items.filter(sourced).map(fix);
  const titles = new Set(items.map((e) => e.title.toLowerCase()));
  const ids = new Set(items.map((e) => e.id));
  const suggestions = brief.suggestions
    .filter(sourced)
    .filter((e) => !titles.has(e.title.toLowerCase()) && !ids.has(slug(e.id)))
    .map(fix);
  for (const e of [...items, ...suggestions]) if (!e.body.length) problems.push(`${e.id}: no body`);
  const pictures = (brief.pictures ?? [])
    .map((p) => ({ id: slug(p.id), also: [...new Set(p.also.filter((u) => /^https?:\/\//.test(u)))].slice(0, 3) }))
    .filter((p) => p.also.length);
  return { brief: { items, suggestions, pictures }, problems };
}
