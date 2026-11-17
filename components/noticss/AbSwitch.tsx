"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";

const VERSIONS = [
  { id: "a", href: "/kit/noticss" },
  { id: "b", href: "/kit/noticss/b" },
] as const;

/**
 * Prototype-only: flip between version A (the issue, Updatr's grammar) and
 * version B (sections and cards, the Paper grammar). A small square pair in the
 * top-right corner, never a bar: it keeps the ground colour so Safari does not
 * tint its toolbar from it.
 */
export function AbSwitch({ current, hidden = false, tone = "light" }: { current: "a" | "b"; hidden?: boolean; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <motion.nav
      aria-label="Versión"
      initial={false}
      animate={{ opacity: hidden ? 0 : 1, y: hidden ? -8 : 0 }}
      transition={springs.snappy}
      className={`fixed right-[max(12px,env(safe-area-inset-right))] top-[calc(10px+var(--sat))] z-40 flex rounded-[13px] p-[3px] ${
        hidden ? "pointer-events-none" : ""
      } ${dark ? "bg-ink/55 backdrop-blur-md" : "bg-ground/90 backdrop-blur-md"}`}
      style={{ boxShadow: dark ? "inset 0 0 0 1px rgba(255,255,255,.18)" : "inset 0 0 0 1px var(--rule-soft)" }}
    >
      {VERSIONS.map((v) => {
        const active = v.id === current;
        return (
          <Link
            key={v.id}
            href={v.href}
            onClick={() => haptic.select()}
            aria-current={active ? "page" : undefined}
            aria-label={`Versión ${v.id.toUpperCase()}`}
            className="relative grid h-[30px] w-[34px] place-items-center"
          >
            {active ? (
              <motion.span
                layoutId={`noticss-ab-${tone}`}
                transition={springs.snappy}
                className={`pointer-events-none absolute inset-0 rounded-[10px] ${dark ? "bg-paper" : "bg-ink"}`}
              />
            ) : null}
            <span
              className={`relative font-serif text-[16px] italic leading-none ${
                active ? (dark ? "text-ink" : "text-paper") : dark ? "text-paper/75" : "text-ink-soft"
              }`}
            >
              {v.id.toUpperCase()}
            </span>
          </Link>
        );
      })}
    </motion.nav>
  );
}
