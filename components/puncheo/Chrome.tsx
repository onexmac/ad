"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { springs } from "@/lib/histok/springs";

const variants = [
  { id: "a", href: "/ad/puncheo" },
  { id: "b", href: "/ad/puncheo/b" },
  { id: "c", href: "/ad/puncheo/c" },
] as const;

export type Variant = (typeof variants)[number]["id"];

/** Prototype-only: jump between the three layouts. */
export function VariantSwitch({ current }: { current: Variant }) {
  return (
    <div className="flex rounded-full bg-card-2 p-0.5">
      {variants.map((v) => {
        const active = v.id === current;
        return (
          <Link
            key={v.id}
            href={v.href}
            aria-current={active ? "page" : undefined}
            className="relative grid h-6 w-7 place-items-center rounded-full"
          >
            {active ? (
              <motion.span layoutId="puncheo-variant" transition={springs.snappy} className="pointer-events-none absolute inset-0 rounded-full bg-ink" />
            ) : null}
            <span className={`mono relative ${active ? "text-ground" : "text-ink-faint"}`} style={{ fontSize: 10 }}>
              {v.id.toUpperCase()}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function Toast({ toast, bottom = 92 }: { toast: { msg: string; n: number } | null; bottom?: number }) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.n}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={springs.popping}
          className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2"
          style={{ bottom: `calc(var(--sab) + ${bottom}px)` }}
        >
          <div className="max-w-[calc(100vw-32px)] rounded-full bg-ink-2 px-4 py-2.5 text-center text-[13px] font-medium text-ground shadow-[var(--shadow-mid)]">
            {toast.msg}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
