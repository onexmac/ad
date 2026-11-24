"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useScroll, type MotionValue } from "motion/react";

/*
 * The magazine as pages. Every section is one screen tall (100svh, so it is
 * whole with Safari's bars out) and the page snaps to them (mandatory snap on
 * the document, turned on by useSnapPages): a flick lands on a page with the
 * browser's own momentum, and nothing else about scrolling changes, so the
 * edge pulls, the scroll-linked blocks and the strips work as before.
 *
 * A page that can run longer than a screen (Watching, the archive, the
 * colophon) is `tall`: it grows with its content and carries stops of its own,
 * one screen apart and one where its end meets the bottom of the screen, so a
 * long list is paged through instead of trapping or skipping.
 */

/** 0 as a page's top enters at the bottom of the screen, 1 once it has landed at the top. */
const PageProgress = createContext<MotionValue<number> | null>(null);

/** The progress of the page this block sits on (null outside a page, or on a tall one). */
export const usePageProgress = () => useContext(PageProgress);

export function Page({
  id,
  name,
  tab,
  folio,
  tall = false,
  className = "",
  children,
}: {
  id: string;
  /** What the home square names. */
  name: string;
  tab: string;
  folio: string;
  tall?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start start"] });
  return (
    <section
      ref={ref}
      id={id}
      data-section={name}
      data-tab={tab}
      data-folio={folio}
      className={`relative snap-start ${tall ? "min-h-[100svh]" : "h-[100svh] overflow-clip"} ${className}`}
    >
      <PageProgress.Provider value={tall ? null : scrollYProgress}>{children}</PageProgress.Provider>
      {tall ? <Stops target={ref} /> : null}
    </section>
  );
}

/** Extra snap stops inside a tall page: a screen apart, and one where its end meets the screen's bottom. */
function Stops({ target }: { target: RefObject<HTMLElement | null> }) {
  const [stops, setStops] = useState<number[]>([]);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    // 100svh in pixels: the bars-out height, which does not change as they move.
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;top:0;left:0;width:1px;height:100svh;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
    const measure = () => {
      const h = probe.getBoundingClientRect().height || window.innerHeight;
      const end = el.offsetHeight - h;
      const out: number[] = [];
      for (let y = h; y < end - h * 0.25; y += h) out.push(Math.round(y));
      if (end > h * 0.25) out.push(Math.round(end));
      setStops((prev) => (prev.length === out.length && prev.every((v, i) => v === out[i]) ? prev : out));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      probe.remove();
    };
  }, [target]);
  return (
    <>
      {stops.map((y) => (
        <div key={y} aria-hidden className="pointer-events-none absolute inset-x-0 h-px snap-start" style={{ top: y }} />
      ))}
    </>
  );
}

/** Mandatory snap on the document while the magazine is up. */
export function useSnapPages() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("updatr-snap");
    return () => root.classList.remove("updatr-snap", "updatr-snap-off");
  }, []);
}

/**
 * Snap off for the length of an animated jump: every scrollTo of a spring's
 * frames would otherwise be snapped to the nearest page. The jump lands on a
 * page, so turning it back on moves nothing.
 */
export function snapOff(off: boolean) {
  document.documentElement.classList.toggle("updatr-snap-off", off);
}
