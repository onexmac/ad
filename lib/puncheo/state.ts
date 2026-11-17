"use client";

import { useSyncExternalStore } from "react";

/** green = pasa, yellow = pasa con observación, red = no pasa, na = no aplica. */
export type Status = "green" | "yellow" | "red" | "na";
export type Marks = Record<string, Status>;

export const STATUS_LABEL: Record<Status | "pending", string> = {
  pending: "Pendiente",
  green: "Pasa",
  yellow: "Con observación",
  red: "No pasa",
  na: "No aplica",
};

/**
 * A small record kept on this device (the prototype has no server yet), in the
 * shape of Updatr's watch store: one cache, listeners, and other tabs heard
 * through the storage event.
 */
function deviceRecord<T extends object>(key: string) {
  const EMPTY = {} as T;
  let cache: T | null = null;
  const listeners = new Set<() => void>();
  const load = (): T => {
    if (cache) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw ? (JSON.parse(raw) as T) : EMPTY;
    } catch {
      cache = EMPTY;
    }
    return cache;
  };
  const save = (next: T) => {
    cache = next;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage blocked (private window, preview): it still works for this visit.
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      cache = null;
      l();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };
  const use = () => useSyncExternalStore(subscribe, load, () => EMPTY);
  return { load, save, use };
}

const marksStore = deviceRecord<Marks>("puncheo:formaleta-n1:v1");
const closedStore = deviceRecord<Record<string, number>>("puncheo:formaleta-n1:closed:v1");

export function useMarks() {
  const marks = marksStore.use();
  const mark = (id: string, s: Status | null) => {
    const next = { ...marksStore.load() };
    if (s) next[id] = s;
    else delete next[id];
    marksStore.save(next);
  };
  return { marks, mark };
}

/** When each punch was closed (ms). An edit to a closed punch reopens it. */
export function useClosed() {
  const closed = closedStore.use();
  const set = (id: string, at: number | null) => {
    const next = { ...closedStore.load() };
    if (at) next[id] = at;
    else delete next[id];
    closedStore.save(next);
  };
  return { closed, set };
}
