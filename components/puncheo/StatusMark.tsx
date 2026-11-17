"use client";

import { motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import type { Status } from "@/lib/puncheo/state";
import { CrossIcon, NaIcon } from "./Icons";

const FILL: Record<Status, string> = {
  green: "var(--ok)",
  yellow: "var(--warn)",
  red: "var(--bad)",
  na: "var(--card-2)",
};

/** The card is still flying home when a mark lands: the reward waits for it. */
const LAND = 0.14;

/**
 * The round mark at the end of a row. A fresh mark (fresh = it just changed
 * under the finger) pops in; green also draws its check and throws two
 * hairline rings, the reward for a pass.
 */
export function StatusMark({ status, fresh }: { status: Status | null; fresh: boolean }) {
  if (!status) {
    return (
      <span className="relative grid size-9 place-items-center rounded-full border border-hair-2 bg-ground">
        <span className="size-1 rounded-full bg-hair-2" />
      </span>
    );
  }
  return (
    <span className="relative grid size-9 place-items-center">
      {fresh && (status === "green" || status === "yellow") ? (
        <>
          {/* A soft disc blooms, then two hairline rings run out. */}
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ background: status === "green" ? "var(--ok-soft)" : "var(--warn-soft)" }}
            initial={{ scale: 0.8, opacity: 0.9 }}
            animate={{ scale: 2.1, opacity: 0 }}
            transition={{ duration: 0.6, delay: LAND, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full border-[1.5px]"
            style={{ borderColor: status === "green" ? "var(--ok-deep)" : "var(--warn-deep)" }}
            initial={{ scale: 1, opacity: 0.85 }}
            animate={{ scale: 2.7, opacity: 0 }}
            transition={{ duration: 0.75, delay: LAND + 0.04, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full border"
            style={{ borderColor: FILL[status] }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 0.6, delay: LAND + 0.14, ease: [0.16, 1, 0.3, 1] }}
          />
        </>
      ) : null}
      <motion.span
        key={status}
        className="relative grid size-9 place-items-center rounded-full"
        style={{
          background: FILL[status],
          boxShadow:
            status === "green"
              ? "0 0 0 4px rgba(149,201,85,0.16), 0 4px 10px rgba(136,160,36,0.28)"
              : status === "yellow"
                ? "0 0 0 4px rgba(255,213,86,0.2), 0 4px 10px rgba(255,173,0,0.22)"
                : status === "red"
                  ? "0 0 0 4px rgba(235,87,87,0.12)"
                  : "none",
        }}
        initial={fresh ? { scale: 0.2 } : false}
        animate={{ scale: 1 }}
        transition={{ ...springs.popping, delay: fresh ? LAND : 0 }}
      >
        {status === "green" ? (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#fff"
              strokeWidth={2.4}
              strokeLinecap="square"
              strokeLinejoin="miter"
              initial={fresh ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.34, delay: LAND + 0.08, ease: [0.65, 0, 0.35, 1] }}
            />
          </svg>
        ) : status === "yellow" ? (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
            <motion.path
              d="M12 5v8.5"
              stroke="var(--ink)"
              strokeWidth={2.4}
              strokeLinecap="square"
              initial={fresh ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.26, delay: LAND + 0.08 }}
            />
            <rect x="10.8" y="16.6" width="2.4" height="2.4" fill="var(--ink)" />
          </svg>
        ) : status === "red" ? (
          <CrossIcon size={16} strokeWidth={2.4} className="text-white" />
        ) : (
          <NaIcon size={18} className="text-ink-faint" />
        )}
      </motion.span>
    </span>
  );
}
