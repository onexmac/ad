"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { springs } from "@/lib/histok/springs";

const variants = [
  { id: "m", label: "Issue", href: "/kit/updatr" },
  { id: "a", label: "A — Grid", href: "/kit/updatr/a" },
  { id: "b", label: "B — Index", href: "/kit/updatr/b" },
] as const;

/** Prototype-only: jump between the two layouts. */
export function VariantSwitch({ current, dark = false }: { current: "m" | "a" | "b"; dark?: boolean }) {
  return (
    <div className={`flex border ${dark ? "border-paper/30" : "border-rule"}`}>
      {variants.map((v) => {
        const active = v.id === current;
        return (
          <Link key={v.id} href={v.href} className="relative flex-1 py-3 text-center" aria-current={active ? "page" : undefined}>
            {active ? (
              <motion.span
                layoutId={`variant-${dark ? "d" : "l"}`}
                transition={springs.snappy}
                className={`absolute inset-0 ${dark ? "bg-paper" : "bg-ink"}`}
              />
            ) : null}
            <span
              className={`mono relative ${
                active ? (dark ? "text-ink" : "text-paper") : dark ? "text-paper/60" : "text-ink-soft"
              }`}
            >
              {v.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
