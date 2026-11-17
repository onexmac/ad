"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { useEdgeSquish } from "@/components/updatr/useEdgeSquish";
import type { RoomSheet } from "@/data/puncheo/rooms";
import type { Status } from "@/lib/puncheo/state";
import { Toast } from "./Chrome";
import { Footer } from "./Footer";
import { LetterTags, Legend, SheetHeader } from "./Header";
import { RailRow, type RowSkin } from "./RailRow";
import { RoomStrip, Walk } from "./Walk";
import { usePunchSheet, type PunchSheet } from "./usePunchSheet";

/** Layout B: white paper, hairline cards with AD Visual tags, the V/A/R/N counters, Leia's full-width bar with search. */
const skin: RowSkin = {
  card: "bg-ground shadow-[inset_0_0_0_1px_var(--hair)]",
  cardOpen: "bg-ground shadow-[inset_0_0_0_1px_var(--hair-2)]",
  rest: "#ffffff",
  restOpen: "#ffffff",
  node: "var(--ground)",
  highlight: "var(--card)",
  tags: true,
};

type Filter = "todas" | "pasan" | "apenas" | "nopasan";

/** While searching, the room chips become filters by result. */
const FILTERS: { id: Filter; label: string; match: (st: Status | undefined) => boolean }[] = [
  { id: "todas", label: "Todas", match: () => true },
  { id: "pasan", label: "Pasan", match: (st) => st === "green" },
  { id: "apenas", label: "Apenas", match: (st) => st === "yellow" }, // pasan con observación
  { id: "nopasan", label: "No pasan", match: (st) => st === "red" || st === "na" }, // incluye las N/A
];

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function FilterStrip({ s, filter, setFilter }: { s: PunchSheet; filter: Filter; setFilter: (f: Filter) => void }) {
  return (
    <div className="no-scrollbar -mx-4 mt-5 flex gap-1.5 overflow-x-auto px-4">
      {FILTERS.map((f) => {
        const active = f.id === filter;
        const n = s.punch.checks.filter((c) => f.match(s.marks[c.id])).length;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              haptic.select();
              setFilter(f.id);
            }}
            aria-pressed={active}
            className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5"
          >
            {active ? <motion.span layoutId="filter-chip" transition={springs.snappy} className="pointer-events-none absolute inset-0 rounded-full bg-brand" /> : null}
            {!active ? <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_var(--hair-2)]" /> : null}
            <span className={`relative text-[14px] font-semibold ${active ? "text-ground" : "text-ink-2"}`}>{f.label}</span>
            <span className={`relative text-[12px] font-medium tabular-nums ${active ? "text-brand-2" : "text-ink-faint"}`}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ScreenB({ sheet }: { sheet: RoomSheet }) {
  const s = usePunchSheet(sheet);
  const { scale, origin } = useEdgeSquish({ bottom: false }); // the bottom pulls into the next room
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");

  const query = norm(q.trim());
  const match = FILTERS.find((f) => f.id === filter)!.match;
  const found = searching
    ? s.punch.checks.filter((c) => match(s.marks[c.id]) && (!query || norm(`${c.num} ${c.title} ${c.sub} ${c.room}`).includes(query)))
    : [];

  const toggle = () => {
    haptic.select();
    if (searching) {
      setQ("");
      setFilter("todas");
    }
    setSearching(!searching);
    window.scrollTo({ top: 0 });
  };

  return (
    <div data-app className="min-h-dvh overflow-x-clip bg-ground">
      <motion.main style={{ scale, transformOrigin: origin }} className="mx-auto w-full max-w-[520px] px-4">
        <SheetHeader sheet={sheet} s={s} current="b" extra={<LetterTags s={s} />} />
        {searching ? (
          <>
            <FilterStrip s={s} filter={filter} setFilter={setFilter} />
            <ul className="mt-5">
              {found.map((c, i) => (
                <li key={c.id} data-check={c.id}>
                  {i === 0 || found[i - 1].room !== c.room ? <span className="mono block pb-2 pl-7 pt-2 text-ink-soft">{c.room}</span> : null}
                  <RailRow s={s} check={c} first last skin={skin} />
                </li>
              ))}
            </ul>
            {found.length === 0 ? (
              <p className="py-10 text-center text-[14px] leading-5 text-ink-faint">
                {query ? `Ningún check coincide con «${q.trim()}»` : "Ningún check"} en {FILTERS.find((f) => f.id === filter)!.label.toLowerCase()}.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <RoomStrip s={s} />
            <Legend />
            <Walk s={s} skin={skin} />
          </>
        )}
        <div style={{ height: "calc(var(--sab) + 96px)" }} />
      </motion.main>
      <Toast toast={s.toast} bottom={84} />
      <Footer s={s} sheet={sheet} kind="bar" search={{ open: searching, q, setQ, toggle }} />
    </div>
  );
}
