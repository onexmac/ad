/**
 * Noticss: the shape of one edition on disk (data/noticss/<date>-<slot>.json).
 *
 * It is Circa's schema v5 (subjects that hold their notes, called snippets
 * here) with three additions in v6: the edition's slot (mañana or tarde), its
 * running number, and `suggestions`, a wider pool of storylines the reader's
 * own taste picks from (a share of every section is suggested).
 *
 * The model fills the "brief" part through structured output; the steps after
 * it (weather, photos, numbering) fill the rest. Every number may be null:
 * nothing that reaches the screen is invented.
 */
import { z } from "zod";

export const CATEGORIES = ["politica", "economia", "geopolitica", "construccion", "tecnologia"];
export const SLOTS = ["manana", "tarde"];

const Source = z.object({ name: z.string(), url: z.string().nullable() });

const Image = z
  .object({ url: z.string(), color: z.string().nullable().optional(), alt: z.string(), credit: z.string().nullable() })
  .nullable();

export const Snippet = z.object({
  id: z.string(),
  kind: z.enum(["fact", "quote", "number", "event"]),
  importance: z.number().int(),
  published: z.string().nullable(),
  headline: z.string(),
  body: z.string(),
  why: z.string().nullable(),
  image: Image,
  tags: z.array(z.string()),
  source: Source,
});

export const Subject = z.object({
  id: z.string(),
  category: z.enum(CATEGORIES),
  scope: z.enum(["cr", "mundo"]),
  importance: z.number().int(),
  title: z.string(),
  synopsis: z.string(),
  image: Image,
  snippets: z.array(Snippet),
});

export const Indicator = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string().nullable(),
  delta: z.number().nullable(),
  unit: z.string().nullable(),
  note: z.string(),
  series: z.array(z.number()).nullable(),
  seriesNote: z.string().nullable(),
});

/** What the model writes: the day's storylines, the suggestion pool and the figures. */
export const Brief = z.object({
  subjects: z.array(Subject),
  suggestions: z.array(Subject),
  indicators: z.array(Indicator),
});

const Weather = z
  .object({
    place: z.string(),
    tempC: z.number().nullable(),
    maxC: z.number().nullable(),
    minC: z.number().nullable(),
    code: z.number().nullable(),
    condition: z.string(),
    glyph: z.enum(["sun", "partly", "cloud", "rain", "storm"]),
    cloudCover: z.number().nullable(),
    rainProb: z.number().nullable(),
    sunrise: z.string().nullable(),
    sunset: z.string().nullable(),
    rainHours: z.array(z.number()).nullable(),
    sky: z.array(z.string()),
    source: Source,
  })
  .nullable();

/** The whole file. */
export const Edition = z.object({
  schemaVersion: z.literal(6),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(SLOTS),
  number: z.number().int(),
  generatedAt: z.string(),
  isSample: z.boolean(),
  weather: Weather,
  indicators: z.array(Indicator),
  subjects: z.array(Subject),
  suggestions: z.array(Subject),
});

/** The figures the edition always carries, in this order. */
export const INDICATORS = [
  { id: "usd_crc", label: "Dólar", unit: "CRC", note: "venta · BCCR" },
  { id: "tba", label: "Tasa Básica", unit: "%", note: "BCCR" },
  { id: "contenedor", label: "Contenedor", unit: "USD/40ft", note: "Drewry WCI" },
  { id: "cemento", label: "Cemento", unit: "índice", note: "INEC" },
  { id: "acero", label: "Varilla", unit: "índice", note: "INEC" },
];

/**
 * Checks the model cannot be held to by the schema alone, and repairs what is
 * safe to repair: ids unique within the edition (a duplicate gets a suffix),
 * a suggestion that repeats a storyline of the day dropped, importance kept
 * to 1..3. Returns the problems it could not repair.
 */
export function tidy(brief) {
  const problems = [];
  const seen = new Set();
  const uniq = (id) => {
    let base = String(id || "x")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "x";
    let out = base;
    for (let i = 2; seen.has(out); i++) out = `${base}-${i}`;
    seen.add(out);
    return out;
  };
  const clamp = (n) => Math.max(1, Math.min(3, Math.round(n || 1)));
  const fix = (s) => ({
    ...s,
    id: uniq(s.id),
    importance: clamp(s.importance),
    snippets: s.snippets.map((n) => ({ ...n, id: uniq(n.id), importance: clamp(n.importance) })),
  });
  // Subject ids are the storyline's identity across editions (a followed topic
  // is found by it), so they are kept as given when unique.
  const subjects = brief.subjects.map(fix);
  const titles = new Set(subjects.map((s) => s.title.toLowerCase()));
  const suggestions = brief.suggestions.filter((s) => !titles.has(s.title.toLowerCase())).map(fix);
  if (subjects.length < 3) problems.push(`only ${subjects.length} subjects`);
  for (const s of [...subjects, ...suggestions]) {
    if (!s.snippets.length) problems.push(`subject ${s.id} has no notes`);
    if (s.synopsis.length > 600) problems.push(`subject ${s.id}: synopsis ${s.synopsis.length} chars`);
  }
  return { brief: { ...brief, subjects, suggestions }, problems };
}
