"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { useEdgeSquish } from "@/components/updatr/useEdgeSquish";
import type { RoomSheet } from "@/data/puncheo/rooms";
import type { Status } from "@/lib/puncheo/state";
import { Toast, type Variant } from "./Chrome";
import { Footer } from "./Footer";
import { LetterTags, Legend, SheetHeader, type Tone } from "./Header";
import { RailRow, type RowSkin } from "./RailRow";
import { Strip, Walk, type StripTone } from "./Walk";
import { usePunchSheet } from "./usePunchSheet";

/*
 * One app, three dresses.
 *   A — the base: white paper, hairline cards, tags, V/A/R/N counters, Leia's bar.
 *   B — more Leia: the blue band, the receipt line, category tabs as solid blocks,
 *       the big light blue numerals, sharper tiles on a grey counter.
 *   C — more AD Visual (the graveyard): the week on a grey canvas, a white sheet
 *       with caps titles and progress cards, hairline cards with flat grey keys,
 *       segmented filters, the grey Clave panel, the white bottom panel.
 */

type Config = {
  ground: string;
  tone: Tone;
  strip: StripTone;
  foot: "bar" | "pill";
  skin: RowSkin;
  filterAccent: string;
  counters: boolean;
  spacer: number;
  toast: number;
};

const CONFIG: Record<Variant, Config> = {
  a: {
    ground: "bg-ground",
    tone: "plain",
    strip: "plain",
    foot: "bar",
    skin: { card: "bg-ground shadow-[inset_0_0_0_1px_var(--hair)]", cardOpen: "bg-ground shadow-[inset_0_0_0_1px_var(--hair-2)]", rest: "#ffffff", restOpen: "#ffffff", node: "var(--ground)", highlight: "var(--card)", tags: true },
    filterAccent: "var(--brand)",
    counters: true,
    spacer: 96,
    toast: 84,
  },
  b: {
    ground: "leia-ground",
    tone: "leia",
    strip: "leia",
    foot: "bar",
    skin: {
      card: "leia-card",
      cardOpen: "leia-card-open",
      rest: "#fbfbfc",
      restOpen: "#ffffff",
      node: "#5d636c",
      highlight: "var(--card-2)",
      tags: true,
      radius: 6, // the buttons inside are 4
      bigNum: true,
      dark: true,
      leia: true,
    },
    filterAccent: "var(--brand)",
    counters: false,
    spacer: 96,
    toast: 84,
  },
  c: {
    ground: "bg-ground",
    tone: "yard",
    strip: "yard",
    foot: "pill",
    skin: {
      card: "bg-ground shadow-[inset_0_0_0_1px_var(--hair-2)]",
      cardOpen: "bg-ground shadow-[inset_0_0_0_1px_var(--hair-2),var(--shadow-soft)]",
      rest: "#ffffff",
      restOpen: "#ffffff",
      node: "var(--ground)",
      highlight: "var(--card)",
      tags: true,
      radius: 10, // the flat keys inside are 6
      yard: true,
    },
    filterAccent: "var(--brand)",
    counters: false,
    spacer: 104,
    toast: 92,
  },
};

type Filter = { id: string; label: string; match: (st: Status | undefined) => boolean };

/** While searching, the room strip becomes filters by result. */
const FILTERS: Filter[] = [
  { id: "todas", label: "Todas", match: () => true },
  { id: "pasan", label: "Pasan", match: (st) => st === "green" },
  { id: "apenas", label: "Apenas", match: (st) => st === "yellow" }, // pasan con observación
  { id: "nopasan", label: "No pasan", match: (st) => st === "red" || st === "na" }, // incluye las N/A
];

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function PunchApp({ sheet, variant }: { sheet: RoomSheet; variant: Variant }) {
  const cfg = CONFIG[variant];
  const s = usePunchSheet(sheet);
  const { scale, origin } = useEdgeSquish({ bottom: false }); // the bottom pulls into the next room
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(0);

  const query = norm(q.trim());
  const f = FILTERS[filter];
  // Search reaches the whole walk (both punches), labelled by section.
  const label = (id: string) => {
    const x = s.sectionOf(id);
    return `${x.phase} · ${x.name}`;
  };
  const found = searching ? s.all.filter((c) => f.match(s.marks[c.id]) && (!query || norm(`${c.num} ${c.title} ${c.sub} ${label(c.id)}`).includes(query))) : [];

  const toggle = () => {
    haptic.select();
    if (searching) {
      setQ("");
      setFilter(0);
    }
    setSearching(!searching);
    window.scrollTo({ top: 0 });
  };

  return (
    <div data-app className={`min-h-dvh overflow-x-clip ${cfg.ground}`}>
      <motion.main style={{ scale, transformOrigin: origin }} className="mx-auto w-full max-w-[520px] px-4">
        <SheetHeader sheet={sheet} s={s} current={variant} tone={cfg.tone} extra={cfg.counters ? <LetterTags s={s} /> : undefined} />
        {searching ? (
          <>
            <Strip
              id="filters"
              tone={cfg.strip}
              accent={cfg.filterAccent}
              active={filter}
              onPick={setFilter}
              items={FILTERS.map((x) => ({ id: x.id, label: x.label, count: s.all.filter((c) => x.match(s.marks[c.id])).length }))}
            />
            <ul className="mt-5">
              {found.map((c, i) => (
                <li key={c.id} data-check={c.id}>
                  {i === 0 || label(found[i - 1].id) !== label(c.id) ? <span className={`mono block pb-2 pl-2 pt-2 ${cfg.skin.dark ? "leia-engrave text-hair" : "text-ink-soft"}`}>{label(c.id)}</span> : null}
                  <RailRow s={s} check={c} first last skin={cfg.skin} />
                </li>
              ))}
            </ul>
            {found.length === 0 ? (
              <p className="py-10 text-center text-[14px] leading-5 text-ink-faint">
                {query ? `Ningún check coincide con «${q.trim()}»` : "Ningún check"} en {f.label.toLowerCase()}.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <Legend dark={cfg.skin.dark} />
            <Walk s={s} skin={cfg.skin} />
          </>
        )}
        <div style={{ height: `calc(var(--sab) + ${cfg.spacer}px)` }} />
      </motion.main>
      <Toast toast={s.toast} bottom={cfg.toast} />
      <Footer s={s} kind={cfg.foot} polish={!!cfg.skin.leia} search={{ open: searching, q, setQ, toggle }} />
    </div>
  );
}
