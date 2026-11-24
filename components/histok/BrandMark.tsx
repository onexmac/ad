"use client";

import { useRef } from "react";
import { BACK, SPRING_IN } from "@/components/loading/gate";
import { haptic } from "@/lib/histok/haptic";
import { PILL, WALK_PERIOD, walkKeyframes, walkStart } from "@/lib/histok/pillWalk";

/**
 * The "!": four pills, the first tall and bright, the rest dots. White, dimmed by opacity on the dots (the
 * same white over black as before), so the walk can carry the brightness from pill to pill.
 */
export function BrandPills({
  w = PILL.w,
  tall = PILL.tall,
  short = PILL.short,
  gap = PILL.gap,
  pillRefs,
}: {
  w?: number;
  tall?: number;
  short?: number;
  gap?: number;
  /** Filled with the four pills, for a parent that walks them. */
  pillRefs?: { current: (HTMLSpanElement | null)[] };
}) {
  return (
    <div className="flex flex-col" style={{ gap }} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          ref={(el) => {
            if (pillRefs) pillRefs.current[i] = el;
          }}
          className="block bg-white"
          style={{
            width: w,
            height: i === 0 ? tall : short,
            borderRadius: w / 2,
            opacity: i === 0 ? 1 : PILL.dim,
          }}
        />
      ))}
    </div>
  );
}

/**
 * The "H" monogram + pills lockup — same scale as the header wordmark. Used as the index footer sign-off and the
 * reel's end-of-story sign-off. A tap walks the "!" twice round (the loading screen's loop) and leaves it as it
 * was; a tap while it walks is ignored.
 */
export function BrandMonogram({ className = "" }: { className?: string }) {
  const pills = useRef<(HTMLSpanElement | null)[]>([]);
  const walking = useRef(false);

  const walk = () => {
    if (walking.current) return;
    const els = pills.current.filter((p): p is HTMLSpanElement => !!p);
    if (els.length !== 4 || !els[0].animate) return;
    walking.current = true;
    haptic.select();
    const spring = CSS.supports?.("animation-timing-function", "linear(0, 1)") ? SPRING_IN : BACK;
    const frames = walkKeyframes(spring);
    // Each pill starts where it stands in the round and runs two rounds, so it ends where it started.
    const runs = els.map((el, k) =>
      el.animate(frames, { duration: WALK_PERIOD * 1000, iterations: 2, iterationStart: walkStart(k) }),
    );
    Promise.all(runs.map((a) => a.finished))
      .catch(() => {})
      .then(() => {
        walking.current = false;
      });
  };

  return (
    <button
      type="button"
      onClick={walk}
      className={`flex items-center justify-center gap-3 outline-none [-webkit-tap-highlight-color:transparent] ${className}`}
      aria-label="Histok"
    >
      <span className="text-6xl md:text-7xl font-medium leading-none tracking-tight select-none text-white">H</span>
      <BrandPills pillRefs={pills} />
    </button>
  );
}
