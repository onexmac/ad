"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { kindLabel, kindOrder, type Franchise, type Item, type Kind } from "@/data/updatr/types";
import { SNAPSHOT, countdown, dot, isoWeek, pad, relative } from "@/lib/updatr/format";
import { HoldImage } from "./HoldImage";
import { useOpener } from "./useOpener";
import { SnapStrip } from "./SnapStrip";
import { Detail } from "./Detail";
import { VariantSwitch } from "./VariantSwitch";

export function IndexScreen({ items, franchises }: { items: Item[]; franchises: Franchise[] }) {
  const byId = useMemo(() => Object.fromEntries(franchises.map((f) => [f.id, f])), [franchises]);
  const opener = useOpener();
  const { opened } = opener;
  const [filter, setFilter] = useState<Kind | null>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [items],
  );
  const feed = useMemo(() => (filter ? sorted.filter((i) => i.kind === filter) : sorted), [sorted, filter]);
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
  const latest = sorted[0];

  return (
    <LayoutGroup>
      <main className="mx-auto min-h-dvh w-full max-w-[520px] bg-paper pb-[calc(40px+var(--sab))]">
        <header className="px-5 pt-[calc(16px+var(--sat))]">
          <div className="flex items-center justify-between">
            <span className="block h-[10px] w-[10px] bg-ink" />
            <span className="mono text-ink">W{isoWeek(SNAPSHOT)} / {dot(SNAPSHOT)}</span>
          </div>
          <h1 className="mt-14 text-[84px] font-bold leading-[0.82] tracking-[-0.065em]">
            Updatr<span className="align-top text-[30px] tracking-normal">©</span>
          </h1>
        </header>

        {/* Now */}
        <section className="mt-14 grid grid-cols-[88px_1fr] gap-4 px-5">
          <span className="text-[14px] font-medium">Now ↘</span>
          <p className="text-[15px] font-medium leading-[1.35] tracking-[-0.01em]">
            {latest ? (
              <>
                Latest: {latest.title}. {items.length} entries across {franchises.length} things I follow — games first,
                then the collabs, skins and people inside them, then film, books and TV.
              </>
            ) : null}
          </p>
        </section>

        {/* Index */}
        <nav className="mt-16 px-5" aria-label="Index">
          {kindOrder.map((k) => {
            const n = counts[k] ?? 0;
            const dim = filter !== null && filter !== k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  haptic.select();
                  setFilter((f) => (f === k ? null : k));
                }}
                className="relative flex w-full items-baseline justify-end gap-3 border-b-[1.5px] border-ink py-[6px] text-right"
              >
                <motion.span
                  animate={{ opacity: dim ? 0.22 : 1, x: filter === k ? -6 : 0 }}
                  transition={springs.snappy}
                  className="text-[40px] font-normal uppercase leading-[1] tracking-[-0.045em]"
                >
                  {kindLabel[k]}
                </motion.span>
                <span className={`mono w-6 text-left ${dim ? "text-ink-faint" : "text-ink"}`}>{pad(n)}</span>
                {filter === k ? (
                  <motion.span
                    layoutId="index-mark"
                    transition={springs.snappy}
                    className="pointer-events-none absolute left-0 top-1/2 block h-[10px] w-[10px] -translate-y-1/2 bg-accent"
                  />
                ) : null}
              </button>
            );
          })}
          <p className="mono mt-3 text-ink-soft">{filter ? "Tap again to clear" : "Tap a line to filter"}</p>
        </nav>

        {/* Tickets */}
        {upcoming.length ? (
          <section className="mt-16">
            <div className="flex items-baseline justify-between px-5">
              <h2 className="text-[30px] font-normal leading-none tracking-[-0.04em]">— Coming</h2>
              <span className="mono text-ink-soft">{pad(upcoming.length)}</span>
            </div>
            <div className="mt-5">
              <SnapStrip
                label="Coming up"
                fraction={0.58}
                gap={12}
                cards={upcoming.map((item) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    transition={springs.popping}
                    onClick={() => {
                      haptic.select();
                      opener.open(item.id, undefined, "b");
                    }}
                    className="flex aspect-[3/4] w-full flex-col justify-between bg-ink p-4 text-left text-paper"
                  >
                    <span className="mono flex justify-between text-paper/60">
                      <span>{byId[item.franchise]?.code}</span>
                      <span className="text-accent">{countdown(item.when!)}</span>
                    </span>
                    <span className="text-[24px] font-bold uppercase leading-[0.92] tracking-[-0.035em]">{item.title}</span>
                    <span className="grid grid-cols-[52px_1fr] gap-y-[2px] text-[12px] leading-tight text-paper/80">
                      <span className="text-paper/50">Date</span>
                      <span>{dot(item.when)}</span>
                      <span className="text-paper/50">Type</span>
                      <span>{kindLabel[item.kind]}</span>
                    </span>
                  </motion.button>
                ))}
              />
            </div>
          </section>
        ) : null}

        {/* Feed */}
        <section className="mt-20">
          <AnimatePresence initial={false} mode="popLayout">
            {feed.map((item, i) => {
              const f = byId[item.franchise];
              const key = `b-feed-${item.id}`;
              return (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={springs.settling}
                  className="mb-24 px-5"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="min-w-0 flex-1 text-[30px] font-normal leading-[1] tracking-[-0.04em]">— {f.name}</h2>
                    <span className="mono shrink-0 text-ink-soft">
                      {pad(i + 1)} / {pad(feed.length)}
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-x-4 border-t border-ink pt-3">
                    <Meta k="Type" v={kindLabel[item.kind]} />
                    <Meta k="Source" v={item.source} />
                    <Meta k="Published" v={item.date ? `${dot(item.date)} · ${relative(item.date)}` : "—"} />
                    <Meta
                      k={item.when ? "Starts" : "Status"}
                      v={item.when ? `${dot(item.when)} · ${countdown(item.when)}` : item.status === "live" ? "Live" : "Out"}
                      accent={!!item.when && item.status !== "out"}
                    />
                  </div>
                  <div className="mt-5">
                    <HoldImage
                      src={item.image}
                      alt={item.title}
                      fallbackTitle={item.title}
                      ratio="4 / 5"
                      flightKey={key}
                      away={opener.isAway(key)}
                      onOpen={(from) => opener.open(item.id, { key, ...from }, "b")}
                    />
                  </div>
                  <button type="button" className="mt-5 block text-left" onClick={() => opener.openFromKey(item.id, key, "b")}>
                    <span className="block text-[21px] font-medium leading-[1.15] tracking-[-0.025em]">{item.title}</span>
                    <span className="mt-3 block text-[15px] leading-[1.5] text-ink/80">{item.dek}</span>
                    {item.body[0] ? (
                      <span className="mt-3 line-clamp-3 block text-[15px] leading-[1.5] text-ink-soft">{item.body[0]}</span>
                    ) : null}
                    <span className="mono mt-4 block text-ink">{item.mock ? "Sample entry" : "Read ↘"}</span>
                  </button>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </section>

        <footer className="px-5">
          <div className="mb-6 flex items-baseline justify-between border-t border-ink pt-3">
            <span className="text-[14px] font-medium">Following</span>
            <span className="mono text-ink-soft">{franchises.map((f) => f.code).join(" · ")}</span>
          </div>
          <VariantSwitch current="b" />
          <p className="mono mt-6 text-ink-faint">Prototype · snapshot {dot(SNAPSHOT)} · images belong to their publishers</p>
        </footer>
      </main>

      {open && opened ? (
        <Detail
          key={open.id}
          item={open}
          franchise={byId[open.franchise]}
          variant="b"
          origin={opener.origin}
          onRelease={opener.release}
          onClosed={opener.closed}
          position={`${pad(sorted.findIndex((i) => i.id === open.id) + 1)} / ${pad(sorted.length)}`}
        />
      ) : null}
    </LayoutGroup>
  );
}

function Meta({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="py-[5px]">
      <span className="block text-[11px] leading-tight text-ink-soft">{k}</span>
      <span className={`block text-[13px] font-medium leading-tight ${accent ? "text-accent" : ""}`}>{v}</span>
    </div>
  );
}
