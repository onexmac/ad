"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useEdgeSquish } from "@/components/updatr/useEdgeSquish";
import type { Sheet } from "@/data/puncheo/formaleta-n1";
import { Toast } from "./Chrome";
import { Footer } from "./Footer";
import { DateTile, Legend, SheetHeader } from "./Header";
import { RailRow, type RowSkin } from "./RailRow";
import { usePunchSheet } from "./usePunchSheet";

/** Layout C: AD Visual's grey panels, white cards with soft shadow, tags, the date tile, search, the white pill. */
const skin: RowSkin = {
  card: "bg-ground shadow-[var(--shadow-soft)]",
  cardOpen: "bg-ground shadow-[var(--shadow-mid)]",
  rest: "#ffffff",
  restOpen: "#ffffff",
  node: "var(--card)",
  highlight: "var(--card)",
  tags: true,
};

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ScreenC({ sheet }: { sheet: Sheet }) {
  const s = usePunchSheet(sheet);
  const { scale, origin } = useEdgeSquish();
  const [q, setQ] = useState("");
  const checks = q.trim()
    ? s.punch.checks.filter((c) => norm(`${c.id} ${c.title} ${c.sub}`).includes(norm(q.trim())))
    : s.punch.checks;
  return (
    <div data-app className="min-h-dvh overflow-x-clip bg-card">
      <motion.main style={{ scale, transformOrigin: origin }} className="mx-auto w-full max-w-[520px] px-4">
        <SheetHeader sheet={sheet} s={s} current="c" aside={<DateTile />} />

        {/* AD Visual's search field: rounded input with the blue square button. */}
        <label className="mt-5 flex h-11 items-center gap-2 rounded-[12px] bg-ground pl-3.5 pr-1.5 shadow-[var(--shadow-soft)]">
          <input
            id="puncheo-buscar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar check"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
          <span className="grid size-8 place-items-center rounded-[8px] bg-brand text-ground" aria-hidden>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square">
              <circle cx="10.5" cy="10.5" r="6" />
              <path d="M15 15l5 5" />
            </svg>
          </span>
        </label>

        <Legend />
        <ul className="mt-4">
          {checks.map((c, i) => (
            <li key={c.id} data-check={c.id}>
              <RailRow s={s} check={c} first={i === 0} last={i === checks.length - 1} skin={skin} />
            </li>
          ))}
        </ul>
        {checks.length === 0 ? <p className="py-8 text-center text-[14px] text-ink-faint">Ningún check coincide con «{q}».</p> : null}
        <div style={{ height: "calc(var(--sab) + 110px)" }} />
      </motion.main>
      <Toast toast={s.toast} bottom={96} />
      <Footer s={s} sheet={sheet} kind="pill" />
    </div>
  );
}
