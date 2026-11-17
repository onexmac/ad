"use client";

import { motion, useTransform } from "motion/react";
import type { SwipeMark, Zone } from "./useSwipeMark";
import { CheckIcon, CrossIcon, LockIcon, NaIcon } from "./Icons";
import { HATCH } from "./Squircle";

const ZONE_BG: Record<Exclude<Zone, null>, string> = {
  green: "var(--ok)",
  yellow: "var(--warn)",
  red: "var(--bad)",
  na: "var(--hair)",
  "na-blocked": "var(--card-2)",
};

const LABEL: Record<Exclude<Zone, null>, string> = {
  green: "Pasa",
  yellow: "Con observación",
  red: "No pasa",
  na: "No aplica",
  "na-blocked": "N/A no permitido",
};

/** What the swipe will do, under the row: colour, icon and word, growing toward the mark. */
export function SwipeUnder({
  sw,
  underRef,
  className = "",
  radius = 0,
}: {
  sw: SwipeMark;
  underRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  radius?: number;
}) {
  const { zone, side, prog } = sw;
  const scale = useTransform(prog, [0, 1, 2], [0.55, 1, 1.12]);
  const opacity = useTransform(prog, [0, 0.6, 1], [0.35, 0.8, 1]);
  const right = side >= 0;
  const label = zone ? LABEL[zone] : right ? "Pasa" : "No pasa";
  return (
    <div
      ref={underRef}
      aria-hidden
      className={`absolute inset-0 flex items-center overflow-hidden px-6 transition-colors duration-150 ${className}`}
      style={{
        visibility: "hidden",
        borderRadius: radius,
        justifyContent: right ? "flex-start" : "flex-end",
        background: zone ? ZONE_BG[zone] : right ? "var(--ok-soft)" : "var(--bad-soft)",
        backgroundImage:
          zone === "na" ? HATCH : zone === "na-blocked" ? "repeating-linear-gradient(135deg, transparent 0 7px, rgba(25,28,34,0.05) 7px 8px)" : undefined,
      }}
    >
      <motion.span
        className="flex items-center gap-2.5"
        style={{
          scale,
          opacity,
          color: zone === "yellow" || zone === "na" ? "var(--ink)" : zone === "na-blocked" ? "var(--ink-faint)" : zone ? "var(--ground)" : "var(--ink-3)",
          flexDirection: right ? "row" : "row-reverse",
        }}
      >
        {right ? (
          zone === "yellow" ? (
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square" aria-hidden>
              <path d="M12 5v8.5" />
              <path d="M12 18v1" />
            </svg>
          ) : (
            <CheckIcon size={20} strokeWidth={2.2} />
          )
        ) : zone === "na" ? (
          <NaIcon size={20} strokeWidth={1.8} />
        ) : zone === "na-blocked" ? (
          <LockIcon size={18} />
        ) : (
          <CrossIcon size={18} strokeWidth={2.2} />
        )}
        <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
          {label}
        </span>
      </motion.span>
    </div>
  );
}
