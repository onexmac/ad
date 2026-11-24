/**
 * Noticss: the daily brief, one edition per morning. The editions are Circa's
 * (schema v5): an edition holds subjects (one storyline each, with a synopsis)
 * and each subject holds its notes (the atoms behind the synopsis).
 */

export type Category = "politica" | "economia" | "geopolitica" | "construccion" | "tecnologia";

export type Picture = {
  /** Colour frame; black and white is a filter on the same element. */
  src: string;
  alt: string;
  credit: string | null;
};

export type Note = {
  id: string;
  kind: "fact" | "quote" | "number" | "event";
  importance: number;
  published: string | null;
  headline: string;
  body: string;
  why: string | null;
  /** A later edition established this was wrong: what is true now. */
  corrected: string | null;
  image: Picture | null;
  tags: string[];
  source: { name: string; url: string | null };
};

export type Subject = {
  id: string;
  category: Category;
  scope: "cr" | "mundo";
  title: string;
  synopsis: string;
  importance: number;
  image: Picture | null;
  notes: Note[];
};

export type Indicator = {
  id: string;
  label: string;
  value: string | null;
  delta: number | null;
  unit: string | null;
  note: string;
  series: number[] | null;
  seriesNote: string | null;
};

export type Weather = {
  place: string;
  tempC: number | null;
  maxC: number | null;
  minC: number | null;
  condition: string;
  glyph: "sun" | "partly" | "cloud" | "rain" | "storm";
  rainProb: number | null;
  sunrise: string | null;
  sunset: string | null;
  rainHours: number[] | null;
  sky: string[];
};

export type Edition = {
  date: string;
  /** Morning or afternoon edition; null for the first ones, one a day. */
  slot: "manana" | "tarde" | null;
  /** Nº, counted from the first edition. */
  number: number;
  weather: Weather | null;
  indicators: Indicator[];
  subjects: Subject[];
  /** A wider pool of storylines the reader's taste picks suggestions from. */
  suggestions: Subject[];
};

export const slotName = { manana: "mañana", tarde: "tarde" } as const;

export const categoryName: Record<Category, string> = {
  politica: "Política",
  economia: "Economía",
  geopolitica: "Geopolítica",
  construccion: "Construcción",
  tecnologia: "Tecnología",
};

export const categoryOrder: Category[] = ["politica", "economia", "geopolitica", "construccion", "tecnologia"];

export const kindName: Record<Note["kind"], string> = {
  fact: "Dato",
  quote: "Cita",
  number: "Cifra",
  event: "Hecho",
};
