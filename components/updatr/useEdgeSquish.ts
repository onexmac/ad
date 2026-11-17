"use client";

import { useEffect } from "react";
import { animate, useMotionValue } from "motion/react";
import { CANCEL_SPRING } from "@/lib/updatr/flight";

/**
 * Histok's rubber band at the very top and bottom of a page: the native bounce
 * keeps its momentum, and this adds a little squish toward the edge you push
 * against, springing back on release. Apply the returned scale and origin to
 * the page's main element.
 */
export function useEdgeSquish({ bottom = true }: { bottom?: boolean } = {}) {
  const scale = useMotionValue(1);
  const origin = useMotionValue("50% 0%");
  useEffect(() => {
    let pinned: number | null = null;
    let edge: "top" | "bottom" = "top";
    const max = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const onMove = (e: TouchEvent) => {
      // A held picture owns the finger (it prevents the page's scroll), and an
      // open article locks the page: no squish then.
      if (e.touches.length !== 1 || e.defaultPrevented || document.body.style.overflow === "hidden") return;
      const y = e.touches[0].clientY;
      const atTop = window.scrollY <= 0;
      // (A page whose bottom does something else, a pull to refresh, opts out.)
      const atBottom = bottom && window.scrollY >= max() - 1;
      if (atTop || atBottom) {
        if (pinned === null) {
          pinned = y;
          edge = atTop ? "top" : "bottom";
        }
        const d = y - pinned;
        const over = edge === "top" ? Math.max(0, d) : Math.max(0, -d);
        origin.set(edge === "top" ? "50% 0%" : "50% 100%");
        scale.set(1 - (Math.min(over, 300) / 300) * 0.05);
      } else if (pinned !== null) {
        pinned = null;
        scale.set(1);
      }
    };
    const onEnd = () => {
      pinned = null;
      animate(scale, 1, CANCEL_SPRING);
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [scale, origin, bottom]);
  return { scale, origin };
}
