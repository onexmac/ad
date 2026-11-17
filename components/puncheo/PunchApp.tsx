"use client";

import { useMemo, useState } from "react";
import MiniSearch from "minisearch";
import { motion } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { useEdgeSquish } from "@/components/updatr/useEdgeSquish";
import type { RoomSheet } from "@/data/puncheo/rooms";
import type { Status } from "@/lib/puncheo/state";
import { Toast, type Variant } from "./Chrome";
import { Footer } from "./Footer";
import { FanLayer } from "./FanLayer";
import { LetterTags, Legend, SheetHeader, type Tone } from "./Header";
import { RailRow, type RowSkin } from "./RailRow";
import { Walk, type StripTone } from "./Walk";
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
    ground: "leia-ground leia-root",
    tone: "leia",
    strip: "leia",
    foot: "bar",
    skin: {
      // Leia's receipt rows: flush in the room's panel, split by etched lines.
      card: "leia-row",
      cardOpen: "leia-row leia-row-open",
      rest: "#e7e8ea",
      restOpen: "#f4f4f5",
      node: "#5b6376",
      highlight: "#ffffff",
      tags: false,
      radius: 0, // the panel (6) holds keys of 4
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

  const query = q.trim();
  const f = FILTERS[filter];
  // Predictive search over every check of the ficha: prefix matches as you type,
  // forgiving typos, titles weighing most; completions offered as suggestions.
  const index = useMemo(() => {
    const ms = new MiniSearch<{ id: string; num: string; title: string; sub: string; what: string; room: string; phase: string }>({
      fields: ["num", "title", "sub", "what", "room", "phase"],
      storeFields: ["id"],
      processTerm: (t) => norm(t),
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 3, num: 3, sub: 2, room: 1.5 } },
    });
    ms.addAll(s.all.map((c) => ({ id: c.id, num: c.num, title: c.title, sub: c.sub, what: c.what, room: s.sectionOf(c.id).name, phase: c.phase })));
    return ms;
    // The checks never change while the app runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ranked = searching && query ? index.search(query).map((r) => s.byId.get(r.id as string)!) : s.all;
  const found = searching ? ranked.filter((c) => f.match(s.marks[c.id])) : [];
  const suggestions =
    searching && query.length > 0
      ? [...new Set(index.autoSuggest(query, { prefix: true, fuzzy: 0.2 }).flatMap((r) => r.terms))]
          .filter((w) => w.length > 2 && w !== norm(query))
          .slice(0, 5)
      : [];
  // Results keep the walk's design: grouped by room, in the same panels and rows.
  const groups: { sec: (typeof s.sections)[number]; checks: typeof found }[] = [];
  for (const c of found) {
    const sec = s.sectionOf(c.id);
    const g = groups.find((x) => x.sec.id === sec.id);
    if (g) g.checks.push(c);
    else groups.push({ sec, checks: [c] });
  }

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
            {groups.map((g) =>
              cfg.skin.leia ? (
                <section key={g.sec.id} className="leia-panel mt-4 overflow-hidden rounded-[6px]">
                  <div className="leia-band flex h-[44px] items-center gap-3 px-3 text-ground">
                    <span className="min-w-0 flex-1 truncate text-[18px]">{g.sec.name}</span>
                    <span className="text-[13px] tabular-nums text-brand-2">{g.checks.length}</span>
                  </div>
                  <ul>
                    {g.checks.map((c) => (
                      <li key={c.id} data-check={c.id}>
                        <RailRow s={s} check={c} skin={cfg.skin} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <section key={g.sec.id} className="mt-5">
                  <span className="mono block pb-2 pl-1 text-ink-soft">{g.sec.name}</span>
                  <ul>
                    {g.checks.map((c) => (
                      <li key={c.id} data-check={c.id}>
                        <RailRow s={s} check={c} skin={cfg.skin} />
                      </li>
                    ))}
                  </ul>
                </section>
              ),
            )}
            {found.length === 0 ? (
              <p className="py-10 text-center text-[14px] leading-5 text-ink-faint">
                {query ? `Ningún check coincide con «${query}»` : "Ningún check"} en {f.label.toLowerCase()}.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <Legend dark={cfg.skin.dark} />
            <Walk s={s} skin={cfg.skin} />
          </>
        )}
        <div style={{ height: `calc(var(--sab) + ${cfg.spacer + (searching ? 120 : 0)}px)` }} />
      </motion.main>
      <Toast toast={s.toast} bottom={cfg.toast} />
      <FanLayer s={s} />
      <Footer
        s={s}
        kind={cfg.foot}
        polish={!!cfg.skin.leia}
        search={{
          open: searching,
          q,
          setQ,
          toggle,
          filters: FILTERS.map((x) => ({ id: x.id, label: x.label, count: s.all.filter((c) => x.match(s.marks[c.id])).length })),
          filter,
          setFilter,
          suggestions,
        }}
      />
    </div>
  );
}
