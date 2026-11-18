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
  /** Returns false when the device refused to keep it (it still works for this visit). */
  const save = (next: T): boolean => {
    cache = next;
    let kept = true;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      kept = false; // storage blocked or full
    }
    listeners.forEach((l) => l());
    return kept;
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

const photosStore = deviceRecord<Record<string, string[]>>("puncheo:formaleta-n1:photos:v1");

/** Photos per check, as small JPEG data URLs (the prototype keeps them on the device). */
export function usePhotos() {
  const photos = photosStore.use();
  const add = (id: string, url: string): boolean => {
    const cur = photosStore.load();
    return photosStore.save({ ...cur, [id]: [...(cur[id] ?? []), url] });
  };
  const remove = (id: string, i: number) => {
    const cur = photosStore.load();
    const list = (cur[id] ?? []).filter((_, n) => n !== i);
    const next = { ...cur };
    if (list.length) next[id] = list;
    else delete next[id];
    photosStore.save(next);
  };
  /** Swap a photo for its annotated copy, in place. */
  const replace = (id: string, i: number, url: string): boolean => {
    const cur = photosStore.load();
    const list = [...(cur[id] ?? [])];
    if (i < 0 || i >= list.length) return false;
    list[i] = url;
    return photosStore.save({ ...cur, [id]: list });
  };
  return { photos, add, remove, replace };
}

/** Shrinks a picked or captured photo to a JPEG data URL of at most `max` px. */
export function shrinkPhoto(file: File, max = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

/** A yellow or red mark, or a check whose sheet asks for one, needs a photo. */
export function needsPhoto(required: boolean, s: Status | undefined | null) {
  return required || s === "yellow" || s === "red";
}
