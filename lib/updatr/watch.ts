"use client";

import { useSyncExternalStore } from "react";

/**
 * Followed entries ("watching"): what the reader bookmarked to hear about,
 * mostly release dates. Kept on this device for the prototype; the server
 * takes this over when accounts exist (same ids, same calls).
 */
const KEY = "updatr.watching.v1";
/** First visit: two upcoming releases are already followed, so the section isn't empty. */
const SEED = ["tf-12-3", "tfd-devnote"];

/**
 * A followed-ids store on this device, one per key. Updatr uses it for its
 * releases; other apps make their own with makeWatching(key, seed).
 */
export function makeWatching(key: string, seed: string[]) {
  let ids: string[] | null = null;
  const listeners = new Set<() => void>();
  const EMPTY: string[] = [];

  function load(): string[] {
    if (ids) return ids;
    try {
      const raw = window.localStorage.getItem(key);
      ids = raw ? (JSON.parse(raw) as string[]) : seed;
    } catch {
      ids = seed;
    }
    return ids;
  }

  function save(next: string[]) {
    ids = next;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {}
    listeners.forEach((l) => l());
  }

  function subscribe(l: () => void) {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      ids = null;
      l();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  }

  return function useWatchingStore() {
    const list = useSyncExternalStore(subscribe, load, () => EMPTY);
    return {
      ids: list,
      has: (id: string) => list.includes(id),
      /** Follow or unfollow; returns whether it is followed now. */
      toggle: (id: string) => {
        const cur = load();
        const on = !cur.includes(id);
        // Newest follow first, so the section's undated tail reads latest-first.
        save(on ? [id, ...cur] : cur.filter((x) => x !== id));
        return on;
      },
    };
  };
}

export const useWatching = makeWatching(KEY, SEED);
