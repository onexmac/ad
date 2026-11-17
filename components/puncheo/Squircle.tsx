"use client";

import { useId } from "react";
import { motion } from "motion/react";
import type { Status } from "@/lib/puncheo/state";

/**
 * A superellipse (n = 5) in a size×size box, inset by `pad`. It starts at the
 * left middle and runs clockwise (up, then right across the top), so a drawn
 * outline grows to the right.
 */
function squircle(size: number, pad: number, n = 5, steps = 72) {
  const c = size / 2;
  const r = c - pad;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = Math.PI + (i / steps) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const x = c + r * Math.sign(ct) * Math.abs(ct) ** (2 / n);
    const y = c + r * Math.sign(st) * Math.abs(st) ** (2 / n);
    d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

const INK: Record<Exclude<Status, "na">, string> = { green: "var(--ok)", yellow: "var(--warn-deep)", red: "var(--bad)" };
const SOFT: Record<Exclude<Status, "na">, string> = { green: "var(--ok-soft)", yellow: "var(--warn-soft)", red: "var(--bad-soft)" };
/** The row is still flying home when a mark lands: the reward waits for it. */
const LAND = 0.12;
const DRAW = 0.42;

/**
 * The check box. A mark draws the box's own outline in its colour, growing to
 * the right from the left edge, then the mark inside; the outline stays.
 * Green and yellow also throw two squircle rings. N/A covers the box in the
 * disabled hatching.
 */
export function SquircleCheck({ status, fresh, size = 34 }: { status: Status | null; fresh: boolean; size?: number }) {
  const pat = useId().replace(/:/g, "");
  const line = squircle(size, 1.1);
  const fill = squircle(size, 0);
  const coloured = status && status !== "na" ? status : null;
  const vb = `0 0 ${size} ${size}`;
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      {fresh && (coloured === "green" || coloured === "yellow") ? (
        <>
          <motion.svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            viewBox={vb}
            initial={{ scale: 1, opacity: 0.85 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.75, delay: LAND + DRAW * 0.8, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden
          >
            <path d={line} fill="none" stroke={INK[coloured]} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
          </motion.svg>
          <motion.svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            viewBox={vb}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.6, delay: LAND + DRAW * 0.8 + 0.1, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden
          >
            <path d={line} fill="none" stroke={SOFT[coloured]} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </motion.svg>
        </>
      ) : null}

      <svg className="absolute inset-0" viewBox={vb} aria-hidden>
        {status === "na" ? (
          <>
            <defs>
              <pattern id={pat} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill="var(--card-2)" />
                <rect width="1.1" height="5" fill="rgba(25,28,34,0.16)" />
              </pattern>
            </defs>
            <path d={fill} fill={`url(#${pat})`} />
            <path d={line} fill="none" stroke="var(--hair-2)" strokeWidth={1.5} />
          </>
        ) : (
          <path d={line} fill="var(--ground)" stroke="var(--hair-2)" strokeWidth={1.5} />
        )}
        {coloured ? (
          <motion.path
            key={coloured}
            d={line}
            fill="none"
            stroke={INK[coloured]}
            strokeWidth={2.2}
            strokeLinecap="round"
            initial={fresh ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ duration: DRAW, delay: fresh ? LAND : 0, ease: [0.65, 0, 0.35, 1] }}
          />
        ) : null}
      </svg>

      {coloured ? (
        <span className="absolute inset-0 grid place-items-center">
          {coloured === "green" ? (
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke={INK.green}
                strokeWidth={2.6}
                strokeLinecap="square"
                strokeLinejoin="miter"
                initial={fresh ? { pathLength: 0, opacity: 0 } : false}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: fresh ? LAND + DRAW * 0.75 : 0, ease: [0.65, 0, 0.35, 1] }}
              />
            </svg>
          ) : coloured === "yellow" ? (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
              <motion.path
                d="M12 4v10"
                stroke={INK.yellow}
                strokeWidth={2.8}
                strokeLinecap="square"
                initial={fresh ? { pathLength: 0, opacity: 0 } : false}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.24, delay: fresh ? LAND + DRAW * 0.75 : 0 }}
              />
              <rect x="10.6" y="17.5" width="2.8" height="2.8" fill={INK.yellow} />
            </svg>
          ) : (
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" aria-hidden>
              <motion.path
                d="M6.5 6.5l11 11M17.5 6.5l-11 11"
                stroke={INK.red}
                strokeWidth={2.6}
                strokeLinecap="square"
                initial={fresh ? { pathLength: 0, opacity: 0 } : false}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.28, delay: fresh ? LAND + DRAW * 0.75 : 0 }}
              />
            </svg>
          )}
        </span>
      ) : null}
    </span>
  );
}

/** The diagonal hatching laid over a row marked N/A. */
export const HATCH = "repeating-linear-gradient(135deg, transparent 0 7px, rgba(25,28,34,0.1) 7px 8px)";
