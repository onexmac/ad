"use client";

import { useCallback, useRef, useState } from "react";
import { findFlightSource, rectOf, visibleFraction, type Rect } from "@/lib/updatr/flight";
import { Carrier, slotOf } from "@/lib/updatr/carrier";

export type Opened = {
  id: string;
  /** flightKey of the tile whose picture the article holds, if any. */
  key?: string;
  rect?: Rect;
  carrier?: Carrier;
  variant: "a" | "b";
  /** The picture is on its way home (or the tile may show as it is). */
  released?: boolean;
};

export type From = { key?: string; rect?: Rect; carrier?: Carrier };

/** Open/close state shared by every Updatr layout: one article at a time. */
export function useOpener() {
  const [opened, setOpened] = useState<Opened | null>(null);
  const current = useRef<Opened | null>(null);

  const set = useCallback((o: Opened | null) => {
    current.current = o;
    setOpened(o);
  }, []);

  const open = useCallback(
    (id: string, from?: From, variant: "a" | "b" = "a") => {
      const now = current.current;
      // One article at a time. A closing one (its picture already released)
      // gives way to the new tap; an open one keeps the screen, and a picture
      // lifted for this tap goes home.
      if (now && (!now.released || now.id === id)) {
        from?.carrier?.goHome();
        return;
      }
      set({ id, key: from?.key, rect: from?.rect, carrier: from?.carrier, variant });
    },
    [set],
  );

  /** Open from text: the item's picture flies from its tile when the tile is on screen. */
  const openFromKey = useCallback(
    (id: string, key: string | undefined, variant: "a" | "b" = "a") => {
      const now = current.current;
      if (now && (!now.released || now.id === id)) return;
      const btn = findFlightSource(key);
      const slot = slotOf(btn);
      const piece = slot?.firstElementChild as HTMLElement | null;
      if (btn && slot && piece) {
        const rect = rectOf(btn);
        if (visibleFraction(rect) > 0.05) {
          open(id, { key, rect, carrier: new Carrier(piece, slot, rect) }, variant);
          return;
        }
      }
      open(id, undefined, variant);
    },
    [open],
  );

  const release = useCallback(() => {
    const o = current.current;
    if (o && !o.released) set({ ...o, released: true });
  }, [set]);
  const closed = useCallback(() => set(null), [set]);
  const isAway = (key: string) => !!opened && opened.key === key && !opened.released;
  const origin = opened?.rect ? { rect: opened.rect, key: opened.key, carrier: opened.carrier } : undefined;

  return { opened, open, openFromKey, release, closed, isAway, origin };
}
