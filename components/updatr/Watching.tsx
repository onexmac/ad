"use client";

import { AnimatePresence, motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { kindLabel, type Franchise, type Item } from "@/data/updatr/types";
import { countdown, daysFrom, pad, weekday } from "@/lib/updatr/format";
import { useWatching } from "@/lib/updatr/watch";
import { Bookmark } from "./Bookmark";

const ddmm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

/** Upcoming first (soonest on top), then the rest, newest follow first. */
function order(list: Item[]) {
  const ahead = list.filter((i) => i.when && daysFrom(i.when) >= 0).sort((a, b) => a.when!.localeCompare(b.when!));
  const rest = list.filter((i) => !(i.when && daysFrom(i.when) >= 0));
  return [...ahead, ...rest];
}

/**
 * Watching: the entries the reader follows, date first. The date each one
 * lands is the headline (day.month, set large), with its weekday and
 * countdown; the title follows. Tap a row to open it; the bookmark at its end
 * stops following.
 */
export function Watching({
  items,
  byId,
  page,
  onOpen,
}: {
  items: Item[];
  byId: Record<string, Franchise>;
  page: string;
  onOpen: (item: Item) => void;
}) {
  const watch = useWatching();
  const followed = order(watch.ids.map((id) => items.find((i) => i.id === id)).filter(Boolean) as Item[]);
  const next = followed.find((i) => i.when && daysFrom(i.when) >= 0);

  return (
    <div className="px-5">
      <div className="mono flex justify-between border-t border-ink pt-3 text-ink-soft">
        <span>P.{page} — Watching</span>
        <span>{pad(followed.length)}</span>
      </div>
      <h2 className="mt-6 text-[30px] font-normal leading-none tracking-[-0.04em]">— Watching</h2>
      <p className="mono mt-3 text-ink-soft">
        {next ? `Next: ${ddmm(next.when!)} · ${countdown(next.when!)}` : "Release dates you follow"}
      </p>

      {followed.length ? (
        <ol className="mt-8 border-t border-rule">
          <AnimatePresence initial={false} mode="popLayout">
            {followed.map((item) => {
              const dated = item.when ?? item.date;
              const ahead = !!item.when && daysFrom(item.when) >= 0;
              const live = item.status === "live" || (item.when && daysFrom(item.when) === 0);
              const f = byId[item.franchise];
              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 48, transition: { duration: 0.18 } }}
                  transition={springs.settling}
                  className="flex items-stretch border-b border-rule-soft"
                >
                  <motion.button
                    type="button"
                    onClick={() => {
                      haptic.select();
                      onOpen(item);
                    }}
                    whileTap={{ scale: 0.985 }}
                    transition={springs.snappy}
                    className="grid min-w-0 flex-1 grid-cols-[104px_1fr] gap-4 py-6 text-left"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <span className={ahead ? "text-ink" : "text-ink-faint"}>
                      <span className="block text-[36px] font-medium leading-[0.9] tracking-[-0.045em] tabular-nums">
                        {dated ? ddmm(dated) : "—"}
                      </span>
                      <span className="mono mt-2 block text-ink-soft">
                        {dated ? `${weekday(dated)} · ${dated.slice(0, 4)}` : "Date n/a"}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className={`mono block ${ahead ? "text-accent" : "text-ink-soft"}`}>
                        {ahead ? (live ? "Live today" : countdown(item.when!)) : item.when ? "Out" : "Published"}
                      </span>
                      <span className="mt-1 block text-[17px] font-medium leading-[1.15] tracking-[-0.02em]">{item.title}</span>
                      <span className="mono mt-2 block text-ink-soft">
                        {f?.code} · {kindLabel[item.kind]}
                      </span>
                    </span>
                  </motion.button>
                  <motion.button
                    type="button"
                    aria-label={`Stop following ${item.title}`}
                    onClick={() => {
                      haptic.select();
                      watch.toggle(item.id);
                    }}
                    whileTap={{ scale: 0.86 }}
                    transition={springs.popping}
                    className="grid w-11 shrink-0 place-items-start justify-end pt-6 text-ink"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <Bookmark on size="18px" />
                  </motion.button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      ) : (
        <div className="mt-8 border-y border-rule-soft py-10">
          <p className="text-[19px] leading-[1.3] tracking-[-0.015em]">Nothing followed yet.</p>
          <p className="mono mt-3 flex items-center gap-2 text-ink-soft">
            Open an entry and tap <Bookmark on={false} size="13px" /> to watch its date
          </p>
        </div>
      )}
    </div>
  );
}
