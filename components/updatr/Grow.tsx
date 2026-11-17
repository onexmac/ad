"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";

/** Loose enough to overshoot a touch as a block settles into place. */
export const GROW_SPRING = { stiffness: 240, damping: 19, mass: 0.6 };

/**
 * Entering from the bottom of the screen, a block grows slightly into its place
 * on a spring; scrolled back down out of view, it shrinks back the same way.
 * Tied to scroll position, not a one-off reveal, so it plays both ways.
 */
export function useGrow(
  ref: RefObject<HTMLElement | null>,
  {
    from = 0.94,
    y = 18,
    lag = 0,
  }: { from?: number; y?: number; lag?: number } = {},
) {
  const { scrollYProgress } = useScroll({
    target: ref,
    // Fully in place once its top has come up ~20% of the screen (later with lag).
    offset: ["start end", `start ${80 - lag * 4}%`],
  });
  const p = useSpring(scrollYProgress, GROW_SPRING);
  return {
    scale: useTransform(p, [0, 1], [from, 1], { clamp: false }),
    y: useTransform(p, [0, 1], [y, 0], { clamp: false }),
    opacity: useTransform(p, [0, 1], [0.35, 1]),
  };
}

export function Grow({
  children,
  className,
  from,
  y,
  lag,
}: {
  children: ReactNode;
  className?: string;
  from?: number;
  y?: number;
  /** Stagger: each step finishes a little higher up the screen. */
  lag?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const style = useGrow(ref, { from, y, lag });
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...style, transformOrigin: "50% 100%" }}
    >
      {children}
    </motion.div>
  );
}
