"use client";

import { useLayoutEffect, useState } from "react";

// The measuring is in a file of its own, with nothing else to load, so that a page which is not a scroller (Axis
// Cube's canvas) can sit in the same place as a Vvv without taking the scroller and its animation library with it.
// components/vvv/Vvv.tsx uses it and exports it too.

/**
 * Where the frame sits. Top (vvs): the status bar (safe-area top) + gutter;
 * `sat` is the status bar alone, for vvt's content. Bottom:
 * Safari's bar + gutter, where the bar is the largest of what the small and
 * dynamic viewports and the visual viewport leave out of the large one, or the
 * home indicator (safe-area bottom) when there is no bar. Re-measured on
 * resize and as the visual viewport changes.
 */
export function useVvvInset(gutter = 6) {
  const [inset, setInset] = useState({ top: gutter, bottom: gutter, sat: 0 });
  useLayoutEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;" +
      "padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)";
    const lvh = document.createElement("div");
    const svh = document.createElement("div");
    const dvh = document.createElement("div");
    for (const [el, h] of [[lvh, "100lvh"], [svh, "100svh"], [dvh, "100dvh"]] as const) {
      el.style.cssText = `position:fixed;left:0;top:0;width:0;height:${h};visibility:hidden;pointer-events:none`;
      document.body.appendChild(el);
    }
    document.body.appendChild(probe);
    const measure = () => {
      const cs = getComputedStyle(probe);
      const sat = parseFloat(cs.paddingTop) || 0;
      const sab = parseFloat(cs.paddingBottom) || 0;
      const L = lvh.getBoundingClientRect().height;
      const seen = window.visualViewport?.height ?? window.innerHeight;
      const bar = Math.max(0, L - svh.getBoundingClientRect().height, L - dvh.getBoundingClientRect().height, L - seen);
      setInset({ top: Math.round(sat + gutter), bottom: Math.round(Math.max(bar, sab) + gutter), sat: Math.round(sat) });
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      for (const el of [probe, lvh, svh, dvh]) el.remove();
    };
  }, [gutter]);
  return inset;
}
