"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import MiniSearch from "minisearch";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { useEdgeSquish } from "@/components/updatr/useEdgeSquish";
import { Vvs, useVvvInset, useVvvScroller } from "@/components/vvv/Vvv";
import { scrollTarget, scrollToY, scrollTop, setScrollFrame } from "@/lib/puncheo/scroller";
import type { RoomSheet } from "@/data/puncheo/rooms";
import type { Status } from "@/lib/puncheo/state";
import { Toast, type Variant } from "./Chrome";
import { Footer } from "./Footer";
import { FanLayer } from "./FanLayer";
import { PhotoViewer } from "./PhotoViewer";
import { LetterTags, Legend, SheetHeader, type Tone } from "./Header";
import { RailRow, type RowSkin } from "./RailRow";
import { Walk, type StripTone } from "./Walk";
import { RoomScroll } from "./RoomScroll";
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
    spacer: 16, // the bar is in the frame's flow, under the page
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

/** The top bar's peek: a snappy pop, its overshoot shared by the whole page. */
const PEEK_SPRING = { type: "spring" as const, visualDuration: 0.42, bounce: 0.4 };

/** The vvs frame: its corner holds the panels' 6 px corners with the page's 16 px in between. */
const FRAME_RADIUS = 28;
const GUTTER = 6;

/** Hands the vvv frame to the scroll helpers, so everything that scrolls moves the frame. */
function FrameScroller(): ReactNode {
  const frame = useVvvScroller();
  // After commit (refs are attached by then), and before the rooms' scroll listeners,
  // which come later in the tree.
  useEffect(() => {
    setScrollFrame(frame?.current ?? null);
    return () => setScrollFrame(null);
  }, [frame]);
  return null;
}

/** The search results' cascade: in one after another on a spring, out quicker, last first. */
const RISE = {
  hide: { opacity: 0, y: 22 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 380, damping: 28, delay: Math.min(i, 14) * 0.035 } }),
  out: (i: number) => ({ opacity: 0, y: -10, transition: { duration: 0.14, delay: Math.max(0, 6 - Math.min(i, 6)) * 0.015 } }),
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
  // B scrolls through every room inside a vvs frame (components/vvv), which
  // bounces natively; the legacy walks scroll the window, rubber-band at the top
  // and pull into the next room at the bottom.
  const continuous = variant === "b";
  const { scale, origin } = useEdgeSquish({ top: !continuous, bottom: false });
  const inset = useVvvInset(GUTTER);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(0);
  const walkScroll = useRef(0);
  const landAt = useRef<number | null>(null);

  // The header peeks: back from the search (or onto another filter) deep in the
  // page, it drops in from above the frame on a spring, as if it had been
  // waiting there, and sits over the page. The next touch or wheel outside it
  // sends it back up, and at the very top it is simply in its place again.
  // Otherwise it is in the page's flow like anything else (no scroll-linked
  // work while reading).
  const head = useRef<HTMLDivElement>(null);
  const headY = useMotionValue(0);
  // The bar travels down to its place (barY); past it, the overshoot carries the
  // whole page with it (pageY), bouncing at the bar's own rhythm, and the bar's
  // fill stretches up into the space it leaves (fillTop).
  const barY = useTransform(headY, (v) => Math.min(0, v));
  const pageY = useTransform(headY, (v) => Math.max(0, v));
  const fillTop = useTransform(headY, (v) => -Math.max(0, v));
  const [peek, setPeek] = useState(false);
  const peekRun = useRef(0); // the latest peek; a stale hide's end mustn't undo a newer one
  // Whether the bar was out of sight when the screen changed (walk, search, a
  // filter): then it drops in on the new screen, even one that starts at the top.
  const barWasHidden = useRef(false);
  const barHidden = () => !!head.current && scrollTop() >= head.current.offsetHeight;
  const reveal = (force = false) => {
    const el = head.current;
    if (!continuous || !el || (!force && !barHidden())) return;
    const run = ++peekRun.current;
    headY.set(-el.offsetHeight - 8);
    setPeek(true);
    // A springy pop, fully opaque the whole way (no fade): the bar slides down
    // from above, overshoots its place taking the page with it, and settles.
    animate(headY, 0, PEEK_SPRING).then(() => {
      if (run !== peekRun.current) return;
      haptic.select();
      // Landed at the very top: it is in its own place, the peek is over.
      if (scrollTop() <= 0) setPeek(false);
    });
  };
  const hidePeek = () => {
    const el = head.current;
    const run = ++peekRun.current;
    animate(headY, -(el?.offsetHeight ?? 50) - 8, { type: "spring", stiffness: 420, damping: 40 }).then(() => {
      if (run !== peekRun.current) return;
      setPeek(false);
      headY.set(0);
    });
  };
  useEffect(() => {
    if (!peek) return;
    const scroller = scrollTarget();
    const outside = (e: Event) => {
      if (!head.current?.contains(e.target as Node)) hidePeek();
    };
    const top = () => {
      // At the very top the header is in its own place: stop peeking, invisibly.
      // (Not while it is still dropping in: it ends itself when it lands.)
      if (scrollTop() > 0 || headY.isAnimating()) return;
      ++peekRun.current;
      headY.stop();
      headY.set(0);
      setPeek(false);
    };
    window.addEventListener("touchstart", outside, { passive: true });
    window.addEventListener("pointerdown", outside);
    window.addEventListener("wheel", outside, { passive: true });
    scroller.addEventListener("scroll", top, { passive: true });
    return () => {
      window.removeEventListener("touchstart", outside);
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("wheel", outside);
      scroller.removeEventListener("scroll", top);
    };
    // hidePeek and headY are stable enough for one peek's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peek]);

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
    barWasHidden.current = barHidden();
    if (searching) {
      setQ("");
      setFilter(0);
    }
    // Where the page lands once the old content has faded out: the top of the
    // results, or back where the walk was when the search opened.
    if (!searching) walkScroll.current = scrollTop();
    landAt.current = searching ? walkScroll.current : 0;
    setSearching(!searching);
  };

  const footer = (
    <Footer
      s={s}
      kind={cfg.foot}
      polish={!!cfg.skin.leia}
      sections={!continuous}
      rooms={continuous}
      framed={continuous}
      search={{
        open: searching,
        q,
        setQ,
        toggle,
        filters: FILTERS.map((x) => ({ id: x.id, label: x.label, count: s.all.filter((c) => x.match(s.marks[c.id])).length })),
        filter,
        setFilter: (i: number) => {
          barWasHidden.current = barHidden();
          setFilter(i);
        },
        suggestions,
      }}
    />
  );
  const page = (
      <motion.main style={{ scale, transformOrigin: origin, y: pageY }} className="mx-auto w-full max-w-[520px] px-4">
        <SheetHeader
          sheet={sheet}
          s={s}
          current={variant}
          tone={cfg.tone}
          extra={cfg.counters ? <LetterTags s={s} /> : undefined}
          peek={continuous ? { ref: head, y: barY, fillTop, on: peek } : undefined}
        />
        {/* One stage for the walk and the search results: the outgoing content fades
            out first (the results in a quick cascade), then the incoming one comes in
            (the results cascading on a spring, the walk's rows rising as they show).
            Changing the filter swaps the results the same way. Typing updates in place. */}
        <AnimatePresence
          mode="wait"
          onExitComplete={() => {
            if (landAt.current !== null) scrollToY(landAt.current);
            landAt.current = null;
            reveal(barWasHidden.current);
            barWasHidden.current = false;
          }}
        >
          {searching ? (
              <motion.div key={`search:${f.id}`} initial="hide" animate="show" exit="out">
                {(() => {
                  let n = 0;
                  return groups.map((g) => {
                    const gi = n++;
                    const t = s.sectionTallies[s.sections.indexOf(g.sec)];
                    const done = t.done === t.total;
                    const rows = (
                      <ul>
                        {g.checks.map((c) => (
                          <motion.li key={c.id} data-check={c.id} variants={RISE} custom={n++}>
                            <RailRow s={s} check={c} skin={cfg.skin} />
                          </motion.li>
                        ))}
                      </ul>
                    );
                    return cfg.skin.leia ? (
                      <motion.section key={g.sec.id} variants={RISE} custom={gi} className="leia-panel mt-4 overflow-hidden rounded-[6px]">
                        <div className="leia-band relative flex h-[44px] items-center gap-3 px-3 text-ground">
                          <span aria-hidden className={`leia-band-done pointer-events-none absolute inset-0 transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`} />
                          <span className="relative min-w-0 flex-1 truncate text-[18px]">{g.sec.name}</span>
                          <span className={`relative text-[13px] tabular-nums ${done ? "text-[#eaf6db]" : "text-brand-2"}`}>{g.checks.length}</span>
                        </div>
                        {rows}
                      </motion.section>
                    ) : (
                      <motion.section key={g.sec.id} variants={RISE} custom={gi} className="mt-5">
                        <span className="mono block pb-2 pl-1 text-ink-soft">{g.sec.name}</span>
                        {rows}
                      </motion.section>
                    );
                  });
                })()}
                {found.length === 0 ? (
                  <motion.p variants={RISE} custom={0} className="py-10 text-center text-[14px] leading-5 text-ink-faint">
                    {query ? `Ningún check coincide con «${query}»` : "Ningún check"} en {f.label.toLowerCase()}.
                  </motion.p>
                ) : null}
              </motion.div>
          ) : (
            <motion.div key="walk" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.25 } }} exit={{ opacity: 0, y: -12, transition: { duration: 0.18 } }}>
              <Legend dark={cfg.skin.dark} />
              {continuous ? <RoomScroll s={s} skin={cfg.skin} onArrive={reveal} /> : <Walk s={s} skin={cfg.skin} />}
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{ height: `calc(var(--sab) + ${cfg.spacer + (searching ? 120 : 0)}px)` }} />
      </motion.main>
  );

  if (continuous) {
    return (
      <>
        {/* vvs: the app is a rounded frame on black, scrolling inside itself. In it
            the status bar and home indicator are out in the black, so their
            insets are zero for everything inside. */}
        <Vvs radius={FRAME_RADIUS} gutter={GUTTER} maxWidth={552} className={`${cfg.ground} [--sab:0px] [--sat:0px]`}>
          <FrameScroller />
          <div data-app className="flex min-h-full flex-col overflow-x-clip">
            <div className="flex-1">{page}</div>
            {footer}
          </div>
        </Vvs>
        {/* Overlays live outside the frame (it clips): the toast over the bar. */}
        <div style={{ ["--sab" as string]: "0px" }}>
          <Toast toast={s.toast} bottom={inset.bottom + 60 + 12} />
        </div>
        <PhotoViewer s={s} />
      </>
    );
  }

  return (
    <div data-app className={`min-h-dvh overflow-x-clip ${cfg.ground}`}>
      {page}
      <Toast toast={s.toast} bottom={cfg.toast} />
      <FanLayer s={s} />
      <PhotoViewer s={s} />
      {footer}
    </div>
  );
}
