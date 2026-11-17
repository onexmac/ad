"use client";

import { useId } from "react";
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
 * hatched like the swipe that set it.
 */
export function SquircleCheck({
  status,
  fresh,
  size = 34,
  leia = false,
  flat = false,
}: {
  status: Status | null;
  fresh: boolean;
  size?: number;
  leia?: boolean;
  flat?: boolean;
}) {
  if (flat) return <FlatCheck status={status} fresh={fresh} size={size} />;
  return leia ? <LeiaCheck status={status} fresh={fresh} size={size} /> : <SquircleBox status={status} fresh={fresh} size={size} />;
}

const FLAT: Record<Exclude<Status, "na">, string> = { green: "var(--ok)", yellow: "var(--warn)", red: "var(--bad)" };

/** AD Visual's check: a flat grey square (the Secondary button's fill) that fills solid when marked. */
function FlatCheck({ status, fresh, size }: { status: Status | null; fresh: boolean; size: number }) {
  const coloured = status && status !== "na" ? status : null;
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-[6px] bg-hair" />
      {status === "na" ? <span className="absolute inset-0 rounded-[6px]" style={{ backgroundImage: HATCH_DENSE }} /> : null}
      {coloured ? (
        <motion.span
          key={coloured}
          className="absolute inset-0 grid place-items-center rounded-[6px]"
          style={{ background: FLAT[coloured] }}
          initial={fresh ? { scale: 0.5, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springs.popping, delay: fresh ? LAND : 0 }}
        >
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" aria-hidden>
            <motion.path
              d={coloured === "green" ? "M5 12.5l4.5 4.5L19 7.5" : coloured === "yellow" ? "M12 4v10M12 18v1.5" : "M6.5 6.5l11 11M17.5 6.5l-11 11"}
              stroke={coloured === "yellow" ? "var(--ink)" : "var(--ground)"}
              strokeWidth={2.6}
              strokeLinecap="square"
              initial={fresh ? { pathLength: 0, opacity: 0 } : false}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: fresh ? LAND + 0.1 : 0, ease: [0.65, 0, 0.35, 1] }}
            />
          </svg>
        </motion.span>
      ) : null}
    </span>
  );
}

function SquircleBox({ status, fresh, size }: { status: Status | null; fresh: boolean; size: number }) {
  const pat = useId().replace(/:/g, "");
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

      {/* The empty box; N/A covers it in the disabled hatching. */}
      <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {status === "na" ? (
          <>
            <defs>
              <pattern id={pat} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill="var(--card-2)" />
                <rect width="1.1" height="5" fill="rgba(25,28,34,0.16)" />
              </pattern>
            </defs>
            <path d={solid} fill={`url(#${pat})`} />
            <path d={outline} fill="none" stroke="var(--hair-2)" strokeWidth={1.5} />
          </>
        ) : (
          <path d={outline} fill="var(--ground)" stroke="var(--hair-2)" strokeWidth={1.5} />
        )}
      </svg>

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
                initial={fresh ? { pathLength: 0, opacity: 0 } : false}
                animate={{ pathLength: 1, opacity: 1 }}
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
                initial={fresh ? { pathLength: 0, opacity: 0 } : false}
                animate={{ pathLength: 1, opacity: 1 }}
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

/** Leia's check: a bevelled square key that, marked, turns into a lit key of the mark's colour. */
function LeiaCheck({ status, fresh, size }: { status: Status | null; fresh: boolean; size: number }) {
  const coloured = status && status !== "na" ? status : null;
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      <span className="leia-btn absolute inset-0 grid place-items-center rounded-[4px]">
        {!status ? (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#c4c6ca" strokeWidth={3} strokeLinecap="square" style={{ filter: "drop-shadow(0 1px 0 #fff)" }} />
          </svg>
        ) : null}
      </span>
      {status === "na" ? <span className="absolute inset-[3px] rounded-[2px]" style={{ backgroundImage: HATCH_DENSE }} /> : null}
      {coloured ? (
        <motion.span
          key={coloured}
          className={`leia-fill-${coloured} absolute inset-0 grid place-items-center rounded-[4px]`}
          initial={fresh ? { scale: 0.6, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springs.popping, delay: fresh ? LAND : 0 }}
        >
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" aria-hidden className="leia-glyph">
            <motion.path
              d={coloured === "green" ? "M5 12.5l4.5 4.5L19 7.5" : coloured === "yellow" ? "M12 4v10M12 18v1.5" : "M6.5 6.5l11 11M17.5 6.5l-11 11"}
              stroke={coloured === "yellow" ? "var(--ink)" : "var(--ground)"}
              strokeWidth={2.6}
              strokeLinecap="square"
              initial={fresh ? { pathLength: 0, opacity: 0 } : false}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: fresh ? LAND + 0.1 : 0, ease: [0.65, 0, 0.35, 1] }}
            />
          </svg>
        </motion.span>
      ) : null}
    </span>
  );
}

const HATCH_DENSE = "repeating-linear-gradient(135deg, transparent 0 4px, rgba(25,28,34,0.16) 4px 5px)";
