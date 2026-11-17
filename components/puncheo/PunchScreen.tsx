"use client";

import { motion } from "motion/react";
import { useEdgeSquish } from "@/components/updatr/useEdgeSquish";
import type { Sheet } from "@/data/puncheo/formaleta-n1";
import { Toast } from "./Chrome";
import { Footer } from "./Footer";
import { Legend, SheetHeader } from "./Header";
import { RailRow, type RowSkin } from "./RailRow";
import { usePunchSheet } from "./usePunchSheet";

/** Layout A: the dot grid, grey cards on the rail, the moment as a note, A's dark dock. */
const skin: RowSkin = {
  card: "bg-card",
  cardOpen: "bg-ground shadow-[var(--shadow-mid)]",
  rest: "#f7f7f7",
  restOpen: "#ffffff",
  node: "var(--ground)",
  highlight: "var(--card)",
};

export function PunchScreen({ sheet }: { sheet: Sheet }) {
  const s = usePunchSheet(sheet);
  const { scale, origin } = useEdgeSquish();
  return (
    <div data-app className="dot-ground min-h-dvh overflow-x-clip">
      <motion.main style={{ scale, transformOrigin: origin }} className="mx-auto w-full max-w-[520px] px-4">
        <SheetHeader sheet={sheet} s={s} current="a" note />
        <Legend />
        <ul className="mt-4">
          {s.punch.checks.map((c, i) => (
            <li key={c.id} data-check={c.id}>
              <RailRow s={s} check={c} first={i === 0} last={i === s.punch.checks.length - 1} skin={skin} />
            </li>
          ))}
        </ul>
        <div style={{ height: "calc(var(--sab) + 110px)" }} />
      </motion.main>
      <Toast toast={s.toast} />
      <Footer s={s} sheet={sheet} kind="dock" />
    </div>
  );
}
