"use client";

import { useSyncExternalStore } from "react";
import { kindLabel, type Item, type Kind } from "@/data/updatr/types";
import franchiseList from "@/data/updatr/franchises.json";

/*
 * Taste: what the reader likes, learned on this device. The same model as
 * Noticss (lib/noticss/taste.ts), with Updatr's features.
 *
 * Every entry is a bag of features: its franchise, its kind, whether it is
 * upcoming, its tags, its outlet, and the words of its title. A verdict (more
 * like this, or less) is one labelled example; following an entry and reading
 * it for a while are weaker ones. The model is a logistic regression over
 * those features, retrained from the whole log on every change, so a verdict
 * taken back is forgotten exactly. A suggestion's score is the chance of a
 * like, plus a bonus for what the model has not seen yet, so it keeps
 * exploring instead of narrowing to one game.
 *
 * Kept in localStorage for now (one device). The log is plain data, so a
 * server can take it over later without changing the model.
 */

const KEY = "updatr.taste.v1";
const SEEN_KEY = "updatr.seen.v1";
const MAX_EVENTS = 2000;

export type Verdict = "like" | "dislike";

type Event = { id: string; at: number; label: 0 | 1; weight: number; source: "verdict" | "follow" | "read"; features: string[] };
type State = { events: Event[] };

const names = Object.fromEntries((franchiseList as { id: string; name: string }[]).map((f) => [f.id, f.name]));

/* ---------- features ---------- */

const STOP = new Set(
  "with from that this into over your their have will when what about after before more most than then they them there these those which while where year season update updates part new now out live final event events".split(
    " ",
  ),
);

const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Content words of a title, cut to a crude stem so "skins" and "skin" meet. */
function words(text: string): string[] {
  const out = new Set<string>();
  for (const w of plain(text).split(/[^a-z0-9]+/)) {
    if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) continue;
    out.add(w.slice(0, 6));
  }
  return [...out].slice(0, 10);
}

const host = (url?: string) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

export function featuresOf(item: Item): string[] {
  const f = new Set<string>([`fr:${item.franchise}`, `kind:${item.kind}`]);
  if (item.when && item.status === "upcoming") f.add("dated");
  for (const t of item.tags ?? []) f.add(`tag:${plain(t)}`);
  const h = host(item.url);
  if (h) f.add(`src:${h}`);
  words(item.title).forEach((w) => f.add(`w:${w}`));
  return [...f];
}

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

function chanceIn(m: Model, features: string[]) {
  const scale = 1 / Math.sqrt(features.length || 1);
  let z = m.bias;
  for (const f of features) z += (m.w.get(f) ?? 0) * scale;
  return sigmoid(z);
}

function noveltyIn(m: Model, features: string[]) {
  if (!features.length) return 1;
  let s = 0;
  for (const f of features) s += m.seen.get(f) ?? 0;
  return 1 / Math.sqrt(1 + s / features.length);
}

/** The reason shown with a suggestion: the strongest liked feature a person can read. */
function reasonIn(m: Model, features: string[]): string | null {
  let best: { f: string; v: number } | null = null;
  for (const f of features) {
    if (f.startsWith("w:")) continue;
    const v = m.w.get(f) ?? 0;
    if (v > 0.25 && (!best || v > best.v)) best = { f, v };
  }
  if (!best) return null;
  const at = best.f.indexOf(":");
  const k = at < 0 ? best.f : best.f.slice(0, at);
  const v = best.f.slice(at + 1);
  if (k === "fr") return names[v] ?? v;
  if (k === "kind") return kindLabel[v as Kind] ?? v;
  if (k === "dated") return "release dates";
  if (k === "tag") return `#${v}`;
  if (k === "src") return v;
  return null;
}

/* ---------- the store ---------- */

let state: State | null = null;
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
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    state = null;
    l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Sets (or, with null, takes back) the reader's verdict on an entry. */
export function setVerdict(item: Item, verdict: Verdict | null) {
  const events = load().events.filter((e) => !(e.id === item.id && e.source === "verdict"));
  if (verdict) events.push({ id: item.id, at: Date.now(), label: verdict === "like" ? 1 : 0, weight: 1, source: "verdict", features: featuresOf(item) });
  save({ events });
}

/** A weaker signal: a followed entry (0.6), or one read for a while (0.3). Once per entry. */
export function nudge(item: Item, source: "follow" | "read", on: boolean) {
  const events = load().events.filter((e) => !(e.id === item.id && e.source === source));
  if (on) events.push({ id: item.id, at: Date.now(), label: 1, weight: source === "follow" ? 0.6 : 0.3, source, features: featuresOf(item) });
  save({ events });
}

export function verdictOf(id: string): Verdict | null {
  const e = load().events.findLast((x) => x.id === id && x.source === "verdict");
  return e ? (e.label ? "like" : "dislike") : null;
}

/** Re-renders on every change. */
export function useTaste() {
  return useSyncExternalStore(subscribe, () => load().events.length + (load().events.at(-1)?.at ?? 0), () => 0);
}

/* ---------- seen ---------- */

let seenIds: Set<string> | null = null;

function seenSet() {
  if (seenIds) return seenIds;
  try {
    seenIds = new Set(JSON.parse(window.localStorage.getItem(SEEN_KEY) || "[]") as string[]);
  } catch {
    seenIds = new Set();
  }
  return seenIds;
}

/** An entry the reader opened: suggested again only after the rest. */
export function markSeen(id: string) {
  const s = seenSet();
  if (s.has(id)) return;
  s.add(id);
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-1500)));
  } catch {}
}

/* ---------- a frozen view, for building the issue ---------- */

export type FrozenTaste = {
  chance: (f: string[]) => number;
  novelty: (f: string[]) => number;
  reasonOf: (f: string[]) => string | null;
  disliked: (id: string) => boolean;
  seen: (id: string) => boolean;
};

const frozen = new Map<string, FrozenTaste>();

/**
 * The model as it stands, fixed: the issue is built from it once per edition
 * and visit, so a verdict never reshuffles the page under the reader's
 * finger. It counts from the next edition, or the next visit.
 */
function freeze(): FrozenTaste {
  const m = train(load().events);
  const disliked = new Set(load().events.filter((e) => e.source === "verdict" && e.label === 0).map((e) => e.id));
  const seen = new Set(seenSet());
  return {
    chance: (f) => chanceIn(m, f),
    novelty: (f) => noveltyIn(m, f),
    reasonOf: (f) => reasonIn(m, f),
    disliked: (id) => disliked.has(id),
    seen: (id) => seen.has(id),
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

/* ---------- suggestions ---------- */

/** The share of the issue the reader's taste picks. */
export const SUGGESTED_SHARE = 0.3;

/**
 * About SUGGESTED_SHARE of what the issue shows, picked from this week's
 * suggestion pool and the entries and pools of earlier weeks (minus what the
 * week already carries, and anything turned down). Scored by taste: the
 * chance of a like, a bonus for the unexplored, a touch of importance; older
 * weeks discounted, entries already opened pushed back. Before the model has
 * anything (or on the server), the pool's own order and importance decide.
 */
export function pickSuggestions(
  own: Item[],
  pools: { items: Item[]; week?: number; age: number }[],
  taste: FrozenTaste | null,
): Item[] {
  const target = Math.round((own.length * SUGGESTED_SHARE) / (1 - SUGGESTED_SHARE));
  if (!target) return [];
  const have = new Set(own.map((i) => i.id));
  const taken = new Set<string>();
  const scored: { item: Item; score: number; week?: number; reason: string | null }[] = [];
  for (const { items, week, age } of pools) {
    for (const it of items) {
      if (have.has(it.id) || taken.has(it.id) || it.mock) continue;
      if (taste?.disliked(it.id)) continue;
      // An earlier week's release that already happened is no suggestion.
      if (age > 0 && it.status !== "upcoming" && it.status !== "live") continue;
      taken.add(it.id);
      const f = featuresOf(it);
      const like = taste ? taste.chance(f) : 0.5;
      const explore = taste ? 0.22 * taste.novelty(f) : 0;
      const score = like + explore + 0.04 * (it.importance ?? 1) - 0.06 * age - (taste?.seen(it.id) ? 0.3 : 0);
      scored.push({ item: it, score, week, reason: taste ? taste.reasonOf(f) : null });
    }
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, target)
    .map((s) => ({ ...s.item, suggested: { reason: s.reason, week: s.week } }));
}

export const __test = { train, words };
