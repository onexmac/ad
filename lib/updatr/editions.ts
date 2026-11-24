import type { Item } from "@/data/updatr/types";
import { rawEditions } from "@/data/updatr/index";

/**
 * Weekly editions (Nº = ISO week), written by scripts/updatr/edition.mjs and
 * listed in data/updatr/index.ts, newest first. The daily run updates the
 * week's file; public/kit/updatr/latest.json mirrors the newest one so the app
 * can pick up an update without a reload.
 */
export type Edition = {
  year: number;
  week: number;
  /** The day of the last update. */
  date: string;
  updatedAt: string;
  items: Item[];
  suggestions: Item[];
};

const asEdition = (raw: unknown): Edition => {
  const r = raw as Edition;
  return { year: r.year, week: r.week, date: r.date, updatedAt: r.updatedAt, items: r.items ?? [], suggestions: r.suggestions ?? [] };
};

export const editions: Edition[] = rawEditions.map(asEdition);

/** Newest version of every entry across these editions (follows find theirs here). */
export function catalog(list: Edition[]): Item[] {
  const seen = new Map<string, Item>();
  for (const ed of list) for (const it of [...ed.items, ...ed.suggestions]) if (!seen.has(it.id)) seen.set(it.id, it);
  return [...seen.values()];
}

/** Where the newest edition is published for the app to check. */
export const LATEST_URL = "/kit/updatr/latest.json";

/**
 * The newest edition on the server, or null if it can't be reached (the
 * artifact preview has no server). Never cached: this is the reader asking.
 */
export async function fetchLatest(signal: AbortSignal): Promise<Edition | null> {
  try {
    const res = await fetch(`${LATEST_URL}?t=${Date.now()}`, { cache: "no-store", signal });
    if (!res.ok) return null;
    return asEdition(await res.json());
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return null;
  }
}

/** Is `b` newer than `a` (a later week, or the same week updated later)? */
export const newer = (a: Edition, b: Edition) =>
  b.year * 100 + b.week > a.year * 100 + a.week || (b.week === a.week && b.year === a.year && b.updatedAt > a.updatedAt);
