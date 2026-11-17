"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { kindLabel, kindOrder, type Franchise, type Item, type Kind } from "@/data/updatr/types";
import { SNAPSHOT, countdown, dot, isoWeek, pad, relative, spell, weekday } from "@/lib/updatr/format";
import { HoldImage } from "./HoldImage";
import { useOpener, type From } from "./useOpener";
import { useEdgeSquish } from "./useEdgeSquish";
import { Detail } from "./Detail";
import { VariantSwitch } from "./VariantSwitch";

type Filter = Kind | "all";

export function GridScreen({ items, franchises }: { items: Item[]; franchises: Franchise[] }) {
  const byId = useMemo(() => Object.fromEntries(franchises.map((f) => [f.id, f])), [franchises]);
  const opener = useOpener();
  const squish = useEdgeSquish();
  const { opened } = opener;
  const [focusId, setFocusId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [items],
  );
  const grid = useMemo(() => sorted.filter((i) => i.image && !i.mock).slice(0, 6), [sorted]);
  const list = useMemo(
    () => (filter === "all" ? sorted : sorted.filter((i) => i.kind === filter)),
    [sorted, filter],
  );
  const upcoming = useMemo(
    () =>
      items
        .filter((i) => i.when && i.status !== "out")
        .sort((a, b) => (a.when ?? "").localeCompare(b.when ?? "")),
    [items],
  );
  const counts = useMemo(() => {
    const c: Partial<Record<Kind, number>> = {};
    for (const i of items) c[i.kind] = (c[i.kind] ?? 0) + 1;
    return c;
  }, [items]);

  const open = opened ? items.find((i) => i.id === opened.id) : null;
  const focus = focusId ? items.find((i) => i.id === focusId) : null;
  const worlds = new Set(items.filter((i) => !i.mock).map((i) => i.franchise)).size;
  const collabs = items.filter((i) => i.kind === "collab" && i.status !== "out").length;

  return (
    <LayoutGroup>
      <motion.main
        className="mx-auto min-h-dvh w-full max-w-[520px] bg-ground pb-[calc(40px+var(--sab))]"
        style={{ scale: squish.scale, transformOrigin: squish.origin }}
      >
        {/* Bar */}
        <header data-updatr-chrome="top" className="sticky top-0 z-20 border-b border-rule bg-ground/90 px-5 pb-3 pt-[calc(14px+var(--sat))] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="block h-[9px] w-[9px] bg-ink" />
              <span className="mono font-medium text-ink">Updatr®</span>
            </span>
            <span className="mono text-ink-soft">
              {weekday(SNAPSHOT)} {dot(SNAPSHOT)} · W{isoWeek(SNAPSHOT)}
            </span>
          </div>
        </header>

        {/* Statement */}
        <section className="px-5 pt-10">
          <p className="mono text-ink-soft">— Feed / Since last week</p>
          <p className="mt-5 text-[27px] font-normal leading-[1.14] tracking-[-0.03em]">
            {spell(items.length)} things moved across {spell(worlds).toLowerCase()} worlds you follow.{" "}
            <span className="text-ink-soft">
              {spell(collabs)} {collabs === 1 ? "collab is" : "collabs are"} live or coming, and {upcoming.length}{" "}
              {upcoming.length === 1 ? "date is" : "dates are"} on the calendar.
            </span>
          </p>
        </section>

        {/* Six-square grid */}
        <section className="mt-10 border-y border-rule">
          <div className="grid grid-cols-3">
            {grid.map((item, i) => (
              <div
                key={item.id}
                className={`border-rule ${i % 3 !== 2 ? "border-r" : ""} ${i < 3 ? "border-b" : ""}`}
              >
                <HoldImage
                  src={item.image}
                  alt={item.title}
                  fallbackTitle={item.title}
                  index={pad(i + 1)}
                  flightKey={`a-grid-${item.id}`}
                  away={opener.isAway(`a-grid-${item.id}`)}
                  onOpen={(from) => opener.open(item.id, { key: `a-grid-${item.id}`, ...from })}
                  onHoldChange={(h) => setFocusId(h ? item.id : null)}
                />
              </div>
            ))}
          </div>
          <div className="relative h-[52px] overflow-hidden border-t border-rule px-5">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={focus?.id ?? "none"}
                initial={{ y: 22, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -22, opacity: 0 }}
                transition={springs.snappy}
                className="absolute inset-x-5 top-0 flex h-[52px] items-center justify-between gap-4"
              >
                {focus ? (
                  <>
                    <span className="truncate text-[14px] font-medium uppercase tracking-[0.02em]">{focus.title}</span>
                    <span className="mono shrink-0 text-accent">{byId[focus.franchise]?.code}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[14px] font-medium uppercase tracking-[0.02em]">Latest — {pad(grid.length)}</span>
                    <span className="mono text-ink-soft">Hold for colour · tap to open</span>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* Filters */}
        <nav className="no-scrollbar mt-12 flex gap-5 overflow-x-auto px-5" aria-label="Filter">
          {(["all", ...kindOrder] as Filter[]).map((k) => {
            const n = k === "all" ? items.length : counts[k] ?? 0;
            const active = filter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  haptic.select();
                  setFilter(k);
                }}
                className="relative shrink-0 pb-2"
              >
                <span className={`mono ${active ? "text-ink" : "text-ink-faint"}`}>
                  {k === "all" ? "All" : kindLabel[k]} <sup className="text-[8px]">{pad(n)}</sup>
                </span>
                {active ? (
                  <motion.span
                    layoutId="filter-rule-a"
                    transition={springs.snappy}
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-ink"
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* List */}
        <ol className="mt-3 border-t border-rule">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((item, i) => {
              const f = byId[item.franchise];
              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={springs.settling}
                  className="border-b border-rule-soft"
                >
                  <Row
                    index={pad(i + 1)}
                    item={item}
                    franchise={f}
                    flightKey={`a-row-${item.id}`}
                    away={opener.isAway(`a-row-${item.id}`)}
                    onOpen={(from) => opener.open(item.id, from)}
                    onOpenText={() => opener.openFromKey(item.id, `a-row-${item.id}`)}
                  />
                </motion.li>
              );
            })}
          </AnimatePresence>
          {list.length === 0 ? (
            <li className="px-5 py-10 text-[15px] text-ink-soft">Nothing here yet.</li>
          ) : null}
        </ol>

        {/* Calendar */}
        <section className="mt-16 px-5">
          <div className="flex items-baseline justify-between border-b border-rule pb-3">
            <h2 className="text-[14px] font-medium uppercase tracking-[0.02em]">Calendar</h2>
            <span className="mono text-ink-soft">{pad(upcoming.length)} dates</span>
          </div>
          {upcoming.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => opener.open(item.id)}
              className="grid w-full grid-cols-[64px_1fr_auto] items-baseline gap-3 border-b border-rule-soft py-3 text-left"
            >
              <span className="mono text-ink">{dot(item.when)}</span>
              <span className="truncate text-[15px]">{item.title}</span>
              <span className="mono text-accent">{countdown(item.when!)}</span>
            </button>
          ))}
        </section>

        {/* Following */}
        <section className="mt-16 px-5">
          <div className="flex items-baseline justify-between border-b border-rule pb-3">
            <h2 className="text-[14px] font-medium uppercase tracking-[0.02em]">Following</h2>
            <span className="mono text-ink-soft">{pad(franchises.length)}</span>
          </div>
          {franchises.map((f) => {
            const last = sorted.find((i) => i.franchise === f.id);
            return (
              <div key={f.id} className="grid grid-cols-[44px_1fr_auto] items-baseline gap-3 border-b border-rule-soft py-3">
                <span className="mono text-ink-soft">{f.code}</span>
                <span className="min-w-0">
                  <span className="block text-[15px]">{f.name}</span>
                  <span className="block truncate text-[13px] text-ink-soft">{f.watching}</span>
                </span>
                <span className="mono text-ink-soft">{last ? relative(last.date) : "—"}</span>
              </div>
            );
          })}
        </section>

        <footer className="mt-20 px-5">
          <VariantSwitch current="a" />
          <p className="mono mt-6 text-ink-faint">Prototype · snapshot {dot(SNAPSHOT)} · images belong to their publishers</p>
        </footer>
      </motion.main>

      {open && opened ? (
        <Detail
          key={open.id}
          item={open}
          franchise={byId[open.franchise]}
          variant="a"
          origin={opener.origin}
          onRelease={opener.release}
          onClosed={opener.closed}
          position={`${pad(sorted.findIndex((i) => i.id === open.id) + 1)} / ${pad(sorted.length)}`}
        />
      ) : null}
    </LayoutGroup>
  );
}

export function Row({
  index,
  item,
  franchise,
  away,
  onOpen,
  onOpenText,
  flightKey,
}: {
  index: string;
  item: Item;
  franchise: Franchise;
  away: boolean;
  flightKey: string;
  onOpen: (from?: From) => void;
  /** Text tap: the thumbnail still flies open. */
  onOpenText: () => void;
}) {
  return (
    <div className="grid grid-cols-[28px_1fr_72px] gap-3 px-5 py-5">
      <span className="mono pt-[2px] text-ink-faint">{index}</span>
      <button type="button" onClick={onOpenText} className="min-w-0 text-left">
        <span className="mono block text-ink-soft">
          {franchise.code} — {kindLabel[item.kind]} — {item.when && item.status !== "out" ? countdown(item.when) : dot(item.date)}
        </span>
        <span className="mt-2 block text-[18px] font-medium leading-[1.18] tracking-[-0.02em]">{item.title}</span>
        <span className="mt-2 line-clamp-2 block text-[14px] leading-[1.45] text-ink-soft">{item.dek}</span>
        {item.mock ? <span className="mono mt-2 block text-ink-faint">Sample</span> : null}
      </button>
      <div className="pt-[2px]">
        <HoldImage
          src={item.image}
          alt={item.title}
          fallbackTitle={franchise.code}
          caption={{ kicker: `${franchise.code} — ${kindLabel[item.kind]}`, title: item.title }}
          flightKey={flightKey}
          away={away}
          onOpen={(from) => onOpen({ key: flightKey, ...from })}
        />
      </div>
    </div>
  );
}
