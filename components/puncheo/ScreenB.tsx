"use client";

import { motion } from "motion/react";
import { useEdgeSquish } from "@/components/updatr/useEdgeSquish";
import type { Sheet } from "@/data/puncheo/formaleta-n1";
import { Toast } from "./Chrome";
import { Footer } from "./Footer";
import { LetterTags, Legend, SheetHeader } from "./Header";
import { RailRow, type RowSkin } from "./RailRow";
import { usePunchSheet } from "./usePunchSheet";

/** Layout B: white paper, hairline cards with AD Visual tags, the V/A/R/N counters, Leia's full-width bar. */
const skin: RowSkin = {
  card: "bg-ground shadow-[inset_0_0_0_1px_var(--hair)]",
  cardOpen: "bg-ground shadow-[inset_0_0_0_1px_var(--hair-2)]",
  rest: "#ffffff",
  restOpen: "#ffffff",
  node: "var(--ground)",
  highlight: "var(--card)",
  tags: true,
};

export function ScreenB({ sheet }: { sheet: Sheet }) {
  const s = usePunchSheet(sheet);
  const { scale, origin } = useEdgeSquish();
  return (
    <div data-app className="min-h-dvh overflow-x-clip bg-ground">
      <motion.main style={{ scale, transformOrigin: origin }} className="mx-auto w-full max-w-[520px] px-4">
        <SheetHeader sheet={sheet} s={s} current="b" extra={<LetterTags s={s} />} />
        <Legend />
        <ul className="mt-4">
          {s.punch.checks.map((c, i) => (
            <li key={c.id} data-check={c.id}>
              <RailRow s={s} check={c} first={i === 0} last={i === s.punch.checks.length - 1} skin={skin} />
            </li>
          ))}
        </ul>
        <div style={{ height: "calc(var(--sab) + 96px)" }} />
      </motion.main>
      <Toast toast={s.toast} bottom={84} />
      <Footer s={s} sheet={sheet} kind="bar" />
    </div>
  );
}
