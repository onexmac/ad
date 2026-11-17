"use client";

import { motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import type { Status } from "@/lib/puncheo/state";

/** A superellipse (n = 5) in a size×size box, inset by `pad`: the squircle every check is drawn in. */
function squircle(size: number, pad: number, n = 5, steps = 72) {
  const c = size / 2;
  const r = c - pad;
  let d = "";
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const x = c + r * Math.sign(ct) * Math.abs(ct) ** (2 / n);
    const y = c + r * Math.sign(st) * Math.abs(st) ** (2 / n);
    d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d + "Z";
}

const FILL: Record<Exclude<Status, "na">, string> = { green: "var(--ok)", yellow: "var(--warn)", red: "var(--bad)" };
const GLOW: Record<Exclude<Status, "na">, string> = {
  green: "drop-shadow(0 4px 8px rgba(136,160,36,0.32))",
  yellow: "drop-shadow(0 4px 8px rgba(255,173,0,0.26))",
  red: "drop-shadow(0 3px 6px rgba(235,87,87,0.22))",
};
/** The row is still flying home when a mark lands: the reward waits for it. */
const LAND = 0.14;

/**
 * The check box: a squircle that gets the pass reward when marked green (pop,
 * two squircle rings running out, the check drawing itself). N/A leaves the box
 * neutral: the row's hatching says it, not a colour.
 */
export function SquircleCheck({ status, fresh, size = 34 }: { status: Status | null; fresh: boolean; size?: number }) {
  const outline = squircle(size, 0.75);
  const solid = squircle(size, 0);
  const coloured = status && status !== "na" ? status : null;
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      {fresh && (coloured === "green" || coloured === "yellow") ? (
        <>
          <motion.svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            viewBox={`0 0 ${size} ${size}`}
            initial={{ scale: 0.8, opacity: 0.9 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6, delay: LAND, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden
          >
            <path d={solid} fill={coloured === "green" ? "var(--ok-soft)" : "var(--warn-soft)"} />
          </motion.svg>
          <motion.svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            viewBox={`0 0 ${size} ${size}`}
            initial={{ scale: 1, opacity: 0.85 }}
            animate={{ scale: 2.6, opacity: 0 }}
            transition={{ duration: 0.75, delay: LAND + 0.04, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden
          >
            <path d={outline} fill="none" stroke={coloured === "green" ? "var(--ok-deep)" : "var(--warn-deep)"} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
          </motion.svg>
          <motion.svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            viewBox={`0 0 ${size} ${size}`}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.6, delay: LAND + 0.14, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden
          >
            <path d={outline} fill="none" stroke={FILL[coloured]} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </motion.svg>
        </>
      ) : null}

      {/* The empty box (also what N/A shows). */}
      <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <path d={outline} fill="var(--ground)" stroke="var(--hair-2)" strokeWidth={1.5} />
      </svg>
      {status === "na" ? (
        <span className="mono absolute inset-0 grid place-items-center text-ink-faint" style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.02em" }}>
          N/A
        </span>
      ) : null}

      {coloured ? (
        <motion.span
          key={coloured}
          className="absolute inset-0 grid place-items-center"
          style={{ filter: GLOW[coloured] }}
          initial={fresh ? { scale: 0.2 } : false}
          animate={{ scale: 1 }}
          transition={{ ...springs.popping, delay: fresh ? LAND : 0 }}
        >
          <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`} aria-hidden>
            <path d={solid} fill={FILL[coloured]} />
          </svg>
          {coloured === "green" ? (
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" className="relative" aria-hidden>
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="var(--ground)"
                strokeWidth={2.6}
                strokeLinecap="square"
                strokeLinejoin="miter"
                initial={fresh ? { pathLength: 0 } : false}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.34, delay: LAND + 0.08, ease: [0.65, 0, 0.35, 1] }}
              />
            </svg>
          ) : coloured === "yellow" ? (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" className="relative" aria-hidden>
              <motion.path
                d="M12 4v10"
                stroke="var(--ink)"
                strokeWidth={2.8}
                strokeLinecap="square"
                initial={fresh ? { pathLength: 0 } : false}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.26, delay: LAND + 0.08 }}
              />
              <rect x="10.6" y="17.5" width="2.8" height="2.8" fill="var(--ink)" />
            </svg>
          ) : (
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--ground)" strokeWidth={2.6} strokeLinecap="square" className="relative" aria-hidden>
              <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
            </svg>
          )}
        </motion.span>
      ) : null}
    </span>
  );
}

/** The diagonal hatching laid over a row marked N/A. */
export const HATCH = "repeating-linear-gradient(135deg, transparent 0 7px, rgba(25,28,34,0.1) 7px 8px)";
