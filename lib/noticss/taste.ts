"use client";

import { useSyncExternalStore } from "react";
import { categoryName, type Note, type Subject } from "@/data/noticss/types";

/*
 * Taste: a small model of what the reader likes, learned on this device.
 *
 * Every story is a bag of features: its section, whether it is Costa Rica or
 * the world, its tags, its outlet, the kind of note, and the words of its
 * title. A verdict (like or dislike) is one labelled example; following a
 * topic and reading a page for a while are weaker ones. The model is a
 * logistic regression over those features, retrained from the whole log on
 * every change, so a verdict taken back is forgotten exactly. A story's score
 * is the chance the reader likes it, plus a bonus for what the model has not
 * seen yet, so suggestions keep exploring instead of narrowing to one topic.
 *
 * Kept in localStorage for now (one device). The log is plain data, so a
 * server can take it over later without changing the model.
 */

const KEY = "noticss.taste.v1";
const MAX_EVENTS = 2000;

export type Verdict = "like" | "dislike";

/** One labelled example. Explicit verdicts weigh 1; implicit signals less. */
type Event = { id: string; at: number; label: 0 | 1; weight: number; source: "verdict" | "follow" | "read"; features: string[] };
type State = { events: Event[] };

/* ---------- features ---------- */

const STOP = new Set(
  "para como pero porque sobre entre desde hasta donde cuando cual cuales quien quienes este esta estos estas ese esa esos esas aquel aquella tiene tienen sera seran puede pueden hacia segun durante tras ante bajo contra sino tambien todavia ademas mientras luego antes despues otra otro otras otros mismo misma solo cada todo toda todos todas nuevo nueva nuevos nuevas mayor menor primer primera ultimo ultima costa rica".split(
    " ",
  ),
);

const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Content words of a title, cut to a crude stem so "aranceles" and "arancel" meet. */
function words(text: string): string[] {
  const out = new Set<string>();
  for (const w of plain(text).split(/[^a-z0-9ñ]+/)) {
    if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) continue;
    out.add(w.slice(0, 6));
  }
  return [...out].slice(0, 10);
}

const host = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/** The features of a storyline, or of one of its notes (which adds its own). */
export function featuresOf(subject: Subject, note?: Note): string[] {
  const f = new Set<string>([`cat:${subject.category}`, `scope:${subject.scope}`]);
  const tags = new Set<string>();
  const outlets = new Set<string>();
  for (const n of note ? [note] : subject.notes) {
    n.tags.forEach((t) => tags.add(plain(t)));
    const h = host(n.source.url);
    if (h) outlets.add(h);
  }
  tags.forEach((t) => f.add(`tag:${t}`));
  outlets.forEach((o) => f.add(`src:${o}`));
  if (note) f.add(`kind:${note.kind}`);
  words(note ? `${subject.title} ${note.headline}` : subject.title).forEach((w) => f.add(`w:${w}`));
  return [...f];
}

/** The id a verdict is kept under: a storyline or one note. */
export const itemId = (subject: Subject, note?: Note) => (note ? `n:${note.id}` : `s:${subject.id}`);

/* ---------- the model ---------- */

type Model = { bias: number; w: Map<string, number>; seen: Map<string, number> };

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

function train(events: Event[]): Model {
  const w = new Map<string, number>();
  const seen = new Map<string, number>();
  let bias = 0;
  for (const e of events) for (const f of e.features) seen.set(f, (seen.get(f) ?? 0) + e.weight);
  if (!events.length) return { bias, w, seen };
  // A few passes of stochastic gradient descent, oldest to newest, with a
  // light L2 pull toward zero so one verdict never dominates.
  const lr = 0.35;
  const l2 = 0.004;
  for (let pass = 0; pass < 12; pass++) {
    for (const e of events) {
      const scale = 1 / Math.sqrt(e.features.length || 1);
      let z = bias;
      for (const f of e.features) z += (w.get(f) ?? 0) * scale;
      const g = (e.label - sigmoid(z)) * e.weight;
      bias += lr * 0.2 * g;
      for (const f of e.features) {
        const v = w.get(f) ?? 0;
        w.set(f, v + lr * (g * scale - l2 * v));
      }
    }
  }
  return { bias, w, seen };
}

/* ---------- the store ---------- */

let state: State | null = null;
let model: Model | null = null;
const listeners = new Set<() => void>();

function load(): State {
  if (state) return state;
  try {
    const raw = window.localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as State) : { events: [] };
  } catch {
    state = { events: [] };
  }
  return state;
}

function save(next: State) {
  state = { events: next.events.slice(-MAX_EVENTS) };
  model = null;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

function current(): Model {
  if (!model) model = train(load().events);
  return model;
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    state = null;
    model = null;
    l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Sets (or, with null, takes back) the reader's verdict on a story. */
export function setVerdict(id: string, verdict: Verdict | null, features: string[]) {
  const events = load().events.filter((e) => !(e.id === id && e.source === "verdict"));
  if (verdict) events.push({ id, at: Date.now(), label: verdict === "like" ? 1 : 0, weight: 1, source: "verdict", features });
  save({ events });
}

/** A weaker signal: a followed topic, or a page read for a while. Once per item. */
export function nudge(id: string, source: "follow" | "read", on: boolean, features: string[]) {
  const events = load().events.filter((e) => !(e.id === id && e.source === source));
  if (on) events.push({ id, at: Date.now(), label: 1, weight: source === "follow" ? 0.6 : 0.3, source, features });
  save({ events });
}

export function verdictOf(id: string): Verdict | null {
  const e = load().events.findLast((x) => x.id === id && x.source === "verdict");
  return e ? (e.label ? "like" : "dislike") : null;
}

/** How likely the reader likes something with these features (0..1). */
export function chance(features: string[], m: Model = current()): number {
  const scale = 1 / Math.sqrt(features.length || 1);
  let z = m.bias;
  for (const f of features) z += (m.w.get(f) ?? 0) * scale;
  return sigmoid(z);
}

/** What the model has not seen yet earns a bonus, so it keeps exploring. */
export function novelty(features: string[], m: Model = current()): number {
  if (!features.length) return 1;
  let s = 0;
  for (const f of features) s += m.seen.get(f) ?? 0;
  return 1 / Math.sqrt(1 + s / features.length);
}

/** The reason to show with a suggestion: the strongest liked feature a person can read. */
export function reasonOf(features: string[], m: Model = current()): string | null {
  let best: { f: string; v: number } | null = null;
  for (const f of features) {
    if (f.startsWith("w:") || f.startsWith("kind:")) continue;
    const v = m.w.get(f) ?? 0;
    if (v > 0.25 && (!best || v > best.v)) best = { f, v };
  }
  if (!best) return null;
  const at = best.f.indexOf(":");
  const k = best.f.slice(0, at);
  const v = best.f.slice(at + 1);
  if (k === "cat") return categoryName[v as keyof typeof categoryName] ?? v;
  if (k === "scope") return v === "mundo" ? "el mundo" : "Costa Rica";
  if (k === "tag") return `#${v}`;
  if (k === "src") return v;
  return null;
}

/** How many verdicts the model has learned from. */
export function verdictCount() {
  return load().events.filter((e) => e.source === "verdict").length;
}

/** Re-renders on every change; returns the log's length as a version. */
export function useTaste() {
  return useSyncExternalStore(subscribe, () => load().events.length + (load().events.at(-1)?.at ?? 0), () => 0);
}

/* ---------- seen ---------- */

const SEEN = "noticss.seen.v1";
let seenIds: Set<string> | null = null;

function seenSet() {
  if (seenIds) return seenIds;
  try {
    seenIds = new Set(JSON.parse(window.localStorage.getItem(SEEN) || "[]") as string[]);
  } catch {
    seenIds = new Set();
  }
  return seenIds;
}

/** A storyline the reader opened: suggested again only after the rest. */
export function markSeen(subjectId: string) {
  const s = seenSet();
  if (s.has(subjectId)) return;
  s.add(subjectId);
  try {
    window.localStorage.setItem(SEEN, JSON.stringify([...s].slice(-1500)));
  } catch {}
}

/* ---------- a frozen view, for building sections ---------- */

export type FrozenTaste = {
  chance: (features: string[]) => number;
  novelty: (features: string[]) => number;
  reasonOf: (features: string[]) => string | null;
  features: (s: Subject) => string[];
  disliked: (s: Subject) => boolean;
  seen: (s: Subject) => boolean;
};

const frozen = new Map<string, FrozenTaste>();

/**
 * The model as it stands, fixed: sections are built from it once per edition
 * and visit, so a verdict never reshuffles the cards under the reader's
 * finger. It counts from the next edition, or the next visit.
 */
function freeze(): FrozenTaste {
  const m = train(load().events);
  const disliked = new Set(load().events.filter((e) => e.source === "verdict" && e.label === 0).map((e) => e.id));
  const seen = new Set(seenSet());
  return {
    chance: (f) => chance(f, m),
    novelty: (f) => novelty(f, m),
    reasonOf: (f) => reasonOf(f, m),
    features: (s) => featuresOf(s),
    disliked: (s) => disliked.has(itemId(s)),
    seen: (s) => seen.has(s.id),
  };
}

const noop = () => () => {};

/** The frozen taste for one edition (null on the server, where there is none). */
export function useFrozenTaste(key: string): FrozenTaste | null {
  return useSyncExternalStore(
    noop,
    () => {
      let f = frozen.get(key);
      if (!f) {
        f = freeze();
        frozen.set(key, f);
      }
      return f;
    },
    () => null,
  );
}

export const __test = { train, words };
