"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, animate, motion, useScroll, useSpring, useTransform } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { kindLabel, kindOrder, type Franchise, type Item, type Kind } from "@/data/updatr/types";
import { SNAPSHOT, countdown, daysFrom, dot, pad, spell } from "@/lib/updatr/format";
import { buildIssue } from "@/lib/updatr/issue";
import { HoldImage, type OpenFrom } from "./HoldImage";
import { Detail } from "./Detail";
import { Row } from "./GridScreen";
import { VariantSwitch } from "./VariantSwitch";
import { SnapStrip } from "./SnapStrip";
import { BottomBar, type Tab } from "./BottomBar";
import { useOpener } from "./useOpener";
import { useEdgeSquish } from "./useEdgeSquish";
import { PullReadout, ReloadScreen, useBottomPull, useEdgePull } from "./Reload";
import { ItemLike } from "./ItemLike";
import { PressLike } from "./PressLike";
import { catalog, fetchLatest, LATEST_URL, newer, type Edition } from "@/lib/updatr/editions";
import { markSeen, nudge, pickSuggestions, useFrozenTaste } from "@/lib/updatr/taste";
import { Editions, EditionsReadout } from "./Editions";
import { Watching } from "./Watching";
import { Arrow } from "./Arrow";
import { GROW_SPRING, Grow } from "./Grow";
import { Page, snapOff, usePageProgress, useSnapPages } from "./Pages";

/* ---------- navigation ---------- */

/** Four tabs; each owns a run of sections, in page order. */
const TABS: Tab[] = [
  { id: "issue", label: "Issue", anchor: "top" },
  { id: "latest", label: "Latest", anchor: "latest" },
  { id: "dates", label: "Dates", anchor: "countdown" },
  { id: "watch", label: "Watch", anchor: "watching" },
  { id: "archive", label: "Archive", anchor: "archive" },
];

let scrolling: { stop: () => void } | null = null;
/** Spring the page to an anchor; a touch or the wheel takes over at once. */
function springScrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  // Pages: the jump lands on the page's top, with snapping off on the way.
  const target = id === "top" ? 0 : Math.max(0, el.getBoundingClientRect().top + window.scrollY);
  scrolling?.stop();
  snapOff(true);
  const done = () => snapOff(false);
  const ctl = animate(window.scrollY, target, { ...springs.settling, onUpdate: (v) => window.scrollTo(0, v), onComplete: done });
  scrolling = { stop: () => (ctl.stop(), done()) };
  const stop = () => scrolling?.stop();
  window.addEventListener("wheel", stop, { once: true, passive: true });
  window.addEventListener("touchstart", stop, { once: true, passive: true });
}

/* ---------- small pieces ---------- */

/** Grows slightly into place from the bottom of the screen; shrinks back on the way out. */
function Reveal({ children, className, delay = 0, y = 18 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <Grow className={className} y={y} lag={Math.round(delay / 0.04)}>
      {children}
    </Grow>
  );
}

/** Scroll-linked rise (Histok's card rise): grows from smaller as it comes up into view. */
function Rise({ children, className, from = 0.84 }: { children: ReactNode; className?: string; from?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 58%"] });
  // On a page, it rises with the page's arrival.
  const page = usePageProgress();
  const source = useTransform(() => (page ? Math.max(0, Math.min(1, (page.get() - 0.25) / 0.7)) : scrollYProgress.get()));
  const p = useSpring(source, GROW_SPRING);
  const scale = useTransform(p, [0, 1], [from, 1], { clamp: false });
  const opacity = useTransform(p, [0, 1], [0.35, 1]);
  return (
    <motion.div ref={ref} className={className} style={{ scale, opacity, transformOrigin: "50% 100%" }}>
      {children}
    </motion.div>
  );
}

/** A page's running head: its folio and name, and what it carries on the right. */
function Folio({ n, label, right, dark = false }: { n: string; label: string; right?: ReactNode; dark?: boolean }) {
  return (
    <div className={`mono flex items-baseline justify-between gap-4 ${dark ? "text-paper/60" : "text-ink-soft"}`}>
      <span className="truncate">
        <span className="text-accent">P.{n}</span> — {label}
      </span>
      {right ? <span className="shrink-0">{right}</span> : null}
    </div>
  );
}

function Marquee({ items }: { items: string[] }) {
  const line = items.join("   ■   ");
  return (
    <div className="overflow-hidden border-y border-rule bg-ink py-[9px] text-paper">
      <div className="updatr-marquee mono flex w-max whitespace-nowrap">
        <span className="pr-12">{line}</span>
        <span className="pr-12" aria-hidden>
          {line}
        </span>
      </div>
    </div>
  );
}

/* ---------- screen ---------- */

export function MagazineScreen({ editions: initial, franchises }: { editions: Edition[]; franchises: Franchise[] }) {
  const byId = useMemo(() => Object.fromEntries(franchises.map((f) => [f.id, f])), [franchises]);
  // The weekly editions the app carries, newest first; a pull past the bottom
  // can bring a newer one in from the server without a reload.
  const [eds, setEds] = useState(initial);
  const newest = eds[0];
  const [view, setView] = useState({ year: newest.year, week: newest.week });
  const ed = eds.find((e) => e.year === view.year && e.week === view.week) ?? newest;
  const issueNo = ed.week;
  // What the fetch screen is doing: checking the server, or opening a past issue.
  const [fetchTarget, setFetchTarget] = useState<{ kind: "latest" } | { kind: "issue"; week: number } | null>(null);
  const fetching = fetchTarget !== null;
  const pending = useRef<Edition | null>(null);
  const [calendar, setCalendar] = useState(false);
  const latest = newest.week;
  const weeks = useMemo(() => new Map(eds.filter((e) => e.year === newest.year).map((e) => [e.week, e])), [eds, newest.year]);

  // About a third of the issue is the reader's taste: picked from this week's
  // suggestion pool and earlier weeks, frozen for the visit so a like never
  // reshuffles the page under the finger (it counts from the next visit).
  const taste = useFrozenTaste(`${ed.year}-${ed.week}-${ed.updatedAt}`);
  const suggested = useMemo(() => {
    const older = eds.filter((e) => e.year * 100 + e.week < ed.year * 100 + ed.week).slice(0, 6);
    return pickSuggestions(
      ed.items,
      [{ items: ed.suggestions, age: 0 }, ...older.map((e, i) => ({ items: [...e.items, ...e.suggestions], week: e.week, age: i + 1 }))],
      taste,
    );
  }, [eds, ed, taste]);
  const items = useMemo(() => [...ed.items, ...suggested], [ed, suggested]);
  const everything = useMemo(() => catalog(eds), [eds]);
  const issue = useMemo(() => buildIssue(items, franchises), [items, franchises]);
  const opener = useOpener();
  // Page by page: the document snaps to each page while the magazine is up.
  useSnapPages();
  const { opened } = opener;
  const [where, setWhere] = useState({ section: "Cover", tab: "issue", folio: "01" });
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [focus, setFocus] = useState<Item | null>(null);

  // An entry opened from Watching may come from an earlier week.
  const openItem = opened ? (items.find((i) => i.id === opened.id) ?? everything.find((i) => i.id === opened.id) ?? null) : null;
  // Opened is seen (suggested again only after the rest); read for twenty
  // seconds, it is a weak like.
  useEffect(() => {
    if (!openItem) return;
    markSeen(openItem.id);
    const t = window.setTimeout(() => nudge(openItem, "read", true), 20000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openItem?.id]);
  const cap = (i: Item) => ({ kicker: `${byId[i.franchise]?.code ?? ""} — ${kindLabel[i.kind]} — ${dot(i.date)}`, title: i.title });
  const fly = (item: Item, key: string, variant: "a" | "b" = "a") => ({
    flightKey: key,
    away: opener.isAway(key),
    onOpen: (from: OpenFrom) => opener.open(item.id, { key, ...from }, variant),
    // A long hold locks the picture up, with its verdict keys.
    like: item.mock ? undefined : item,
  });

  // Where am I: the last section whose top has passed 45% of the screen (read on
  // every scroll frame, so a jump from a tab or a fling lands on the right label).
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const line = window.innerHeight * 0.45;
      const els = document.querySelectorAll<HTMLElement>("[data-section]");
      let hit: HTMLElement | null = els[0] ?? null;
      for (const el of els) if (el.getBoundingClientRect().top <= line) hit = el;
      if (!hit) return;
      const next = { section: hit.dataset.section ?? "", tab: hit.dataset.tab ?? "issue", folio: hit.dataset.folio ?? "01" };
      setWhere((w) => (w.section === next.section && w.tab === next.tab && w.folio === next.folio ? w : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Histok's rubber band at the top and bottom of the page.
  // Both edges of the issue do something: the top pulls down the calendar of
  // past editions, the bottom pulls the next issue. (No squish there.)
  const { scale: bounce, origin: bounceOrigin } = useEdgeSquish({ top: false, bottom: false });
  const free = !fetching && !opened && !calendar;
  const pull = useBottomPull({ enabled: free, onCommit: () => setFetchTarget({ kind: "latest" }) });
  const topPull = useEdgePull({ edge: "top", enabled: free, onCommit: () => setCalendar(true) });
  const pageY = useTransform(() => topPull.lift.get() - pull.lift.get());
  useEffect(() => {
    if (!fetching && !calendar) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fetching, calendar]);

  const worlds = new Set(items.filter((i) => !i.mock).map((i) => i.franchise)).size;
  const archive = filter === "all" ? issue.all : issue.all.filter((i) => i.kind === filter);
  const counts = useMemo(() => {
    const c: Partial<Record<Kind, number>> = {};
    for (const i of items) c[i.kind] = (c[i.kind] ?? 0) + 1;
    return c;
  }, [items]);

  // The issue as pages, in reading order. Each is one screen; the folio is its
  // place in the issue (the contents and the home square read it from here).
  type Spec = { id: string; name: string; tab: string; tall?: boolean; className?: string; render: (folio: string) => ReactNode };
  const specs: Spec[] = [];
  const own = ed.items.length;
  const fullBleed = { position: "absolute", inset: 0, height: "100%" } as const;

  // 01 Cover: the wordmark, then the cover picture to the foot of the page.
  specs.push({
    id: "top",
    name: "Cover",
    tab: "issue",
    render: () => (
      <div className="flex h-full flex-col">
        <div className="px-5 pt-[calc(18px+var(--sat))]">
          <div className="mono flex justify-between text-ink-soft">
            <span className="flex items-center gap-2">
              <span className="block h-[8px] w-[8px] bg-ink" />
              Issue {issueNo}
            </span>
            <span>{dot(SNAPSHOT)}</span>
            <span>{pad(items.length)} entries</span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springs.settling}
            className="mt-3 text-[22vw] font-bold leading-[0.8] tracking-[-0.07em] min-[520px]:text-[112px]"
          >
            Updatr
          </motion.h1>
        </div>
        {issue.cover ? (
          <div className="relative mt-5 min-h-0 flex-1">
            <HoldImage
              src={issue.cover.image}
              alt={issue.cover.title}
              caption={cap(issue.cover)}
              fallbackTitle={issue.cover.title}
              ratio="auto"
              style={fullBleed}
              {...fly(issue.cover, `m-cover-${issue.cover.id}`)}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-5 pb-5 pt-24 text-paper">
              <p className="mono text-paper/70">Cover — {byId[issue.cover.franchise]?.name}</p>
              <p className="mt-2 text-[34px] font-bold uppercase leading-[0.9] tracking-[-0.04em]">{issue.cover.title}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <Marquee items={issue.coming.map((i) => `${byId[i.franchise]?.code} ${i.title} — ${countdown(i.when!)}`)} />
      </div>
    ),
  });

  // 02 Contents.
  specs.push({
    id: "contents",
    name: "Contents",
    tab: "issue",
    render: (folio) => (
      <div className="flex h-full flex-col px-5 pb-[92px] pt-[calc(28px+var(--sat))]">
        <Folio n={folio} label="Contents" right={`Nº${issueNo}`} />
        <Reveal>
          <div className="mt-5 flex items-baseline justify-between border-b-[1.5px] border-ink pb-2">
            <h2 className="text-[40px] font-normal uppercase leading-none tracking-[-0.05em]">Contents</h2>
            <span className="mono text-ink-soft">{pad(contents.length)}</span>
          </div>
        </Reveal>
        <ol>
          {contents.map((c, i) => (
            <Reveal key={c.anchor} delay={i * 0.04} y={14}>
              <motion.a
                href={`#${c.anchor}`}
                whileTap={{ scale: 0.98, x: 4 }}
                transition={springs.snappy}
                onClick={(e) => {
                  e.preventDefault();
                  haptic.select();
                  springScrollTo(c.anchor);
                }}
                className="grid grid-cols-[44px_84px_1fr] items-baseline gap-2 border-b border-rule-soft py-[10px]"
              >
                <span className="mono text-accent">P.{folioOf[c.anchor]}</span>
                <span className="mono text-ink-soft">{c.label}</span>
                <span className="truncate text-[15px] leading-snug">{c.title}</span>
              </motion.a>
            </Reveal>
          ))}
        </ol>
      </div>
    ),
  });

  // 03 Note: a page of type, and the week in four figures.
  specs.push({
    id: "note",
    name: "Note",
    tab: "issue",
    render: (folio) => (
      <div className="flex h-full flex-col px-5 pb-[92px] pt-[calc(28px+var(--sat))]">
        <Folio n={folio} label="Note" right={dot(SNAPSHOT)} />
        <div className="my-auto">
          <Reveal>
            <p className="text-[40px] leading-[1.02] tracking-[-0.04em]">
              {spell(items.length)} things moved across {spell(worlds).toLowerCase()} worlds this week.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-5 text-[19px] leading-[1.25] tracking-[-0.02em] text-ink-soft">
              {issue.next ? `The next date to watch is ${dot(issue.next.when)}, in ${daysFrom(issue.next.when!)} days.` : "Nothing scheduled yet."}{" "}
              <Arrow dir="downRight" weight={1.75} />
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.12}>
          <dl className="grid grid-cols-4 border-t border-ink pt-3">
            {[
              ["Entries", pad(own)],
              ["Suggested", pad(suggested.length)],
              ["Worlds", pad(worlds)],
              ["Next", issue.next ? `T–${pad(Math.max(0, daysFrom(issue.next.when!)))}` : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="mono text-ink-soft">{k}</dt>
                <dd className="mt-1 text-[26px] font-medium leading-none tracking-[-0.04em]">{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    ),
  });

  // Feature: the picture, the whole page; then the words.
  if (issue.feature) {
    const f = issue.feature;
    specs.push({
      id: "feature",
      name: "Feature",
      tab: "issue",
      className: "bg-ink",
      render: (folio) => (
        <div className="relative h-full">
          <HoldImage src={f.image} alt={f.title} caption={cap(f)} fallbackTitle={f.title} ratio="auto" style={fullBleed} {...fly(f, `m-feature-${f.id}`)} />
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-ink/60 to-transparent px-5 pb-16 pt-[calc(28px+var(--sat))]">
            <Folio n={folio} label="Feature" right={byId[f.franchise]?.code} dark />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/55 to-transparent px-5 pb-[96px] pt-36 text-paper">
            <p className="mono text-paper/70">
              {kindLabel[f.kind]} — {dot(f.date)}
            </p>
            <h2 className="mt-3 text-[40px] font-medium leading-[0.96] tracking-[-0.045em]">{f.title}</h2>
          </div>
        </div>
      ),
    });
    specs.push({
      id: "feature-text",
      name: "Feature",
      tab: "issue",
      render: (folio) => (
        <div className="flex h-full flex-col px-5 pb-[92px] pt-[calc(28px+var(--sat))]">
          <Folio n={folio} label="Feature" right={f.source} />
          <Reveal>
            <blockquote className="mt-6 border-l-[3px] border-accent pl-4 text-[26px] font-medium leading-[1.12] tracking-[-0.03em]">{f.dek}</blockquote>
          </Reveal>
          <div className="mt-7 grid min-h-0 flex-1 grid-cols-[64px_1fr] gap-4">
            <Reveal y={12}>
              <div className="mono space-y-2 text-ink-soft">
                <p>{byId[f.franchise]?.code}</p>
                <p>{kindLabel[f.kind]}</p>
                <p>{dot(f.date)}</p>
              </div>
            </Reveal>
            <div className="min-h-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_78%,transparent)]">
              {f.body.map((p, i) => (
                <Reveal key={i} y={12} delay={i * 0.04}>
                  <p
                    className={`mb-4 text-[16px] leading-[1.55] text-ink/85 ${
                      i === 0 ? "first-letter:float-left first-letter:mr-2 first-letter:text-[54px] first-letter:font-bold first-letter:leading-[0.8]" : ""
                    }`}
                  >
                    {p}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => opener.openFromKey(f.id, `m-feature-${f.id}`)} className="mono mt-3 self-start text-ink">
            Continue <Arrow dir="downRight" />
          </button>
        </div>
      ),
    });
  }

  // Dossier: the franchise in type, dark; then its entries, big, on a strip.
  if (issue.dossier) {
    const d = issue.dossier;
    specs.push({
      id: "dossier",
      name: "Dossier",
      tab: "issue",
      className: "bg-ink text-paper",
      render: (folio) => (
        <div className="flex h-full flex-col px-5 pb-[92px] pt-[calc(28px+var(--sat))]">
          <Folio n={folio} label="Dossier" right={`${pad(d.items.length)} on file`} dark />
          <Reveal className="my-auto">
            <h2 className="text-[13vw] font-bold uppercase leading-[0.86] tracking-[-0.055em] min-[520px]:text-[68px]">{d.franchise.name}</h2>
            <p className="mt-5 text-[19px] leading-[1.25] tracking-[-0.02em] text-paper/60">In collabs this week: {spell(d.items.length).toLowerCase()} entries, on the next page.</p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="grid grid-cols-[88px_1fr] gap-x-4 gap-y-1 border-t border-paper/30 pt-3">
              <span className="text-[13px] text-paper/60">Studio</span>
              <span className="text-[13px]">{d.franchise.studio}</span>
              <span className="text-[13px] text-paper/60">Watching</span>
              <span className="line-clamp-2 text-[13px]">{d.franchise.watching}</span>
              <span className="text-[13px] text-paper/60">On file</span>
              <span className="text-[13px]">{pad(d.items.length)} entries</span>
            </div>
          </Reveal>
        </div>
      ),
    });
    specs.push({
      id: "dossier-strip",
      name: "Dossier",
      tab: "issue",
      className: "bg-ink text-paper",
      render: (folio) => (
        <div className="flex h-full flex-col pb-[84px] pt-[calc(28px+var(--sat))]">
          <div className="px-5">
            <Folio n={folio} label={`Dossier — ${d.franchise.code}`} right={`${pad(d.items.length)}`} dark />
          </div>
          <div className="my-auto">
            <SnapStrip
              label={`${d.franchise.name} dossier`}
              tone="dark"
              fraction={0.8}
              cards={d.items.map((item, i) => (
                <article key={item.id}>
                  <div className="relative">
                    <HoldImage src={item.image} alt={item.title} caption={cap(item)} fallbackTitle={item.title} ratio="4 / 5" {...fly(item, `m-dossier-${item.id}`, "b")} />
                    <span className="pointer-events-none absolute -bottom-6 right-2 text-[88px] font-bold leading-none tracking-[-0.06em] text-paper mix-blend-difference">
                      {pad(i + 1)}
                    </span>
                  </div>
                  <p className="mono mt-8 text-paper/50">
                    {kindLabel[item.kind]} — {item.when && item.status !== "out" ? countdown(item.when) : dot(item.date)}
                  </p>
                  <h3 className="mt-2 line-clamp-2 text-[22px] font-medium leading-[1.08] tracking-[-0.025em]">{item.title}</h3>
                </article>
              ))}
            />
          </div>
        </div>
      ),
    });
  }

  // Wardrobe: the pair, staggered, one big and one small.
  if (issue.pair.length) {
    const two = issue.pair.length > 1;
    specs.push({
      id: "pair",
      name: "Wardrobe",
      tab: "issue",
      render: (folio) => (
        <div className="flex h-full flex-col px-5 pb-[92px] pt-[calc(28px+var(--sat))]">
          <Folio n={folio} label="Wardrobe" right={issue.pair.map((p) => byId[p.franchise]?.code).join(" & ")} />
          <Reveal>
            <h2 className="mt-4 text-[30px] font-normal leading-none tracking-[-0.04em]">— Wardrobe</h2>
          </Reveal>
          <div className={`my-auto grid items-start gap-4 ${two ? "grid-cols-[1.45fr_1fr]" : "grid-cols-1"}`}>
            {issue.pair.map((item, i) => (
              <Rise key={item.id} className={i === 1 ? "pt-24" : ""} from={i === 1 ? 0.78 : 0.86}>
                <HoldImage
                  src={item.image}
                  alt={item.title}
                  caption={cap(item)}
                  fallbackTitle={item.title}
                  ratio={!two ? "5 / 4" : i === 0 ? "3 / 4" : "4 / 5"}
                  {...fly(item, `m-pair-${item.id}`)}
                />
                <p className="mono mt-3 text-ink-soft">
                  {byId[item.franchise]?.code} — {kindLabel[item.kind]}
                </p>
                <button type="button" onClick={() => opener.openFromKey(item.id, `m-pair-${item.id}`)} className="mt-1 block text-left">
                  <span className="line-clamp-3 text-[16px] font-medium leading-[1.15] tracking-[-0.02em]">{item.title}</span>
                  <span className="mt-1 line-clamp-3 text-[13px] leading-[1.4] text-ink-soft">{item.dek}</span>
                </button>
              </Rise>
            ))}
          </div>
        </div>
      ),
    });
  }

  // Spotlight: one picture, the whole page, with a caption panel on it.
  if (issue.spotlight) {
    const s = issue.spotlight;
    specs.push({
      id: "spotlight",
      name: "Spotlight",
      tab: "issue",
      className: "bg-ink",
      render: (folio) => (
        <div className="relative h-full">
          <HoldImage src={s.image} alt={s.title} caption={cap(s)} fallbackTitle={s.title} ratio="auto" style={fullBleed} {...fly(s, `m-spot-${s.id}`)} />
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-ink/85 via-ink/40 to-transparent px-5 pb-20 pt-[calc(28px+var(--sat))]">
            <Folio n={folio} label="Spotlight" right={byId[s.franchise]?.code} dark />
          </div>
          <Reveal className="absolute bottom-[92px] left-0 w-[84%]">
            <button type="button" onClick={() => opener.openFromKey(s.id, `m-spot-${s.id}`)} className="block w-full bg-paper px-5 pb-5 pt-4 text-left text-ink">
              <span className="mono block text-ink-soft">
                {kindLabel[s.kind]} — {s.when && s.status !== "out" ? countdown(s.when) : dot(s.date)}
              </span>
              <span className="mt-2 line-clamp-3 text-[26px] font-medium leading-[1.02] tracking-[-0.035em]">{s.title}</span>
              <span className="mt-2 line-clamp-2 text-[13px] leading-[1.4] text-ink-soft">{s.dek}</span>
              <span className="mono mt-3 inline-flex items-center gap-1">
                Read <Arrow dir="downRight" />
              </span>
            </button>
          </Reveal>
        </div>
      ),
    });
  }

  // Latest: one picture, big; then four squares; then a wide one over the index.
  const g = issue.grid;
  if (g.length) {
    const lead = g[0];
    specs.push({
      id: "latest",
      name: "Latest",
      tab: "latest",
      render: (folio) => (
        <div className="flex h-full flex-col pb-[92px] pt-[calc(28px+var(--sat))]">
          <div className="px-5">
            <Folio n={folio} label="Latest" right={`01 / ${pad(g.length)}`} />
            <Reveal>
              <h2 className="mt-4 text-[40px] font-normal uppercase leading-none tracking-[-0.05em]">Latest</h2>
            </Reveal>
          </div>
          <div className="relative mt-5 min-h-0 flex-1">
            <HoldImage src={lead.image} alt={lead.title} caption={cap(lead)} fallbackTitle={lead.title} ratio="auto" style={fullBleed} {...fly(lead, `m-grid-${lead.id}`)} />
          </div>
          <Reveal className="px-5 pt-4">
            <p className="mono text-ink-soft">
              {byId[lead.franchise]?.code} — {kindLabel[lead.kind]} — {dot(lead.date)}
            </p>
            <button type="button" onClick={() => opener.openFromKey(lead.id, `m-grid-${lead.id}`)} className="mt-1 block text-left">
              <span className="line-clamp-2 text-[24px] font-medium leading-[1.05] tracking-[-0.03em]">{lead.title}</span>
            </button>
          </Reveal>
        </div>
      ),
    });
  }
  const squares = g.slice(1, 5);
  if (squares.length) {
    specs.push({
      id: "latest-squares",
      name: "Latest",
      tab: "latest",
      render: (folio) => (
        <div className="flex h-full flex-col pb-[92px] pt-[calc(28px+var(--sat))]">
          <div className="px-5 pb-5">
            <Folio n={folio} label="Latest" right={`${pad(2)}–${pad(1 + squares.length)}`} />
          </div>
          <div className="my-auto">
            <div className="grid grid-cols-2 border-y border-rule">
              {squares.map((item, i) => (
                <Grow key={item.id} from={0.92} y={14} lag={i % 2} className={`border-rule ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""}`}>
                  <HoldImage
                    src={item.image}
                    alt={item.title}
                    caption={cap(item)}
                    fallbackTitle={item.title}
                    index={pad(i + 2)}
                    onHoldChange={(h) => setFocus(h ? item : null)}
                    {...fly(item, `m-grid-${item.id}`)}
                  />
                </Grow>
              ))}
            </div>
            <div className="relative h-[52px] overflow-hidden border-b border-rule px-5">
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
                    <span className="mono text-ink-soft">Hold to look closer · tap to open</span>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      ),
    });
  }
  if (g.length > 2) {
    const wide = g[5];
    specs.push({
      id: "latest-index",
      name: "Latest",
      tab: "latest",
      render: (folio) => (
        <div className="flex h-full flex-col pb-[92px] pt-[calc(28px+var(--sat))]">
          <div className="px-5">
            <Folio n={folio} label="Latest — index" right={pad(g.length)} />
          </div>
          {wide ? (
            <div className="relative mt-5 h-[30%] shrink-0">
              <HoldImage src={wide.image} alt={wide.title} caption={cap(wide)} fallbackTitle={wide.title} ratio="auto" index={pad(6)} style={fullBleed} {...fly(wide, `m-grid-${wide.id}`)} />
            </div>
          ) : null}
          <ol className="mt-4 min-h-0 flex-1 overflow-hidden px-5">
            {g.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.03} y={10}>
                <li>
                  <button type="button" onClick={() => opener.openFromKey(item.id, `m-grid-${item.id}`)} className="grid w-full grid-cols-[28px_1fr] gap-2 py-[5px] text-left">
                    <span className="mono pt-[3px] text-ink-faint">{pad(i + 1)}</span>
                    <span className="line-clamp-2 text-[14px] leading-snug">
                      <span className="font-medium">{item.title}.</span> <span className="text-ink-soft">{item.dek}</span>
                    </span>
                  </button>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      ),
    });
  }

  // For you: what the reader's taste picked, big, on a dark strip.
  if (issue.forYou.length) {
    specs.push({
      id: "for-you",
      name: "For you",
      tab: "latest",
      className: "bg-ink text-paper",
      render: (folio) => (
        <div className="flex h-full flex-col pb-[84px] pt-[calc(28px+var(--sat))]">
          <div className="px-5">
            <Folio n={folio} label="For you" right={`${pad(issue.forYou.length)} picks`} dark />
            <Reveal>
              <h2 className="mt-4 text-[40px] font-normal uppercase leading-none tracking-[-0.05em]">For you</h2>
              <p className="mt-2 text-[14px] leading-[1.35] text-paper/60">Picked from what you like and follow. Hold a picture to say more or less.</p>
            </Reveal>
          </div>
          <div className="my-auto">
            <SnapStrip
              label="For you"
              tone="dark"
              fraction={0.72}
              cards={issue.forYou.map((item) => (
                <article key={item.id}>
                  <HoldImage src={item.image} alt={item.title} caption={cap(item)} fallbackTitle={item.title} ratio="4 / 5" {...fly(item, `m-you-${item.id}`)} />
                  <p className="mono mt-3 truncate text-accent">
                    {item.suggested ? `Suggested${item.suggested.reason ? ` · ${item.suggested.reason}` : ""}` : `Also this week · ${byId[item.franchise]?.code ?? ""}`}
                  </p>
                  <button type="button" onClick={() => opener.openFromKey(item.id, `m-you-${item.id}`)} className="mt-1 block text-left">
                    <span className="line-clamp-2 text-[19px] font-medium leading-[1.1] tracking-[-0.025em]">{item.title}</span>
                  </button>
                </article>
              ))}
            />
          </div>
        </div>
      ),
    });
  }

  // Duo: two big landscape pictures, one to each side.
  if (issue.duo.length === 2) {
    specs.push({
      id: "duo",
      name: "Two to see",
      tab: "latest",
      render: (folio) => (
        <div className="flex h-full flex-col pb-[92px] pt-[calc(28px+var(--sat))]">
          <div className="px-5">
            <Folio n={folio} label="Two to see" right={issue.duo.map((d) => byId[d.franchise]?.code).join(" · ")} />
          </div>
          <div className="mt-5 flex min-h-0 flex-1 flex-col gap-5">
            {issue.duo.map((item, i) => (
              <div key={item.id} className={`flex min-h-0 flex-1 flex-col ${i === 0 ? "pr-12" : "pl-12"}`}>
                <Rise className="relative min-h-0 flex-1" from={0.9}>
                  <HoldImage src={item.image} alt={item.title} caption={cap(item)} fallbackTitle={item.title} ratio="auto" index={pad(i + 1)} style={fullBleed} {...fly(item, `m-duo-${item.id}`)} />
                </Rise>
                <button type="button" onClick={() => opener.openFromKey(item.id, `m-duo-${item.id}`)} className={`mt-2 block text-left ${i === 0 ? "pl-5" : "pr-5"}`}>
                  <span className="mono block text-ink-soft">
                    {byId[item.franchise]?.code} — {kindLabel[item.kind]}
                  </span>
                  <span className="mt-1 line-clamp-2 text-[17px] font-medium leading-[1.12] tracking-[-0.02em]">{item.title}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ),
    });
  }

  // Mosaic: one tall picture and two squares, then their titles.
  if (issue.mosaic.length === 3) {
    const m = issue.mosaic;
    specs.push({
      id: "mosaic",
      name: "Mosaic",
      tab: "latest",
      render: (folio) => (
        <div className="flex h-full flex-col px-5 pb-[92px] pt-[calc(28px+var(--sat))]">
          <Folio n={folio} label="Mosaic" right={pad(m.length)} />
          <div className="mt-5 grid h-[56%] shrink-0 grid-cols-[1.25fr_1fr] grid-rows-2 gap-[6px]">
            {m.map((item, i) => (
              <Grow key={item.id} from={0.92} y={14} lag={i} className={`relative ${i === 0 ? "row-span-2" : ""}`}>
                <HoldImage src={item.image} alt={item.title} caption={cap(item)} fallbackTitle={item.title} ratio="auto" index={pad(i + 1)} style={fullBleed} {...fly(item, `m-mosaic-${item.id}`)} />
              </Grow>
            ))}
          </div>
          <ol className="mt-4 min-h-0 flex-1 overflow-hidden">
            {m.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.04} y={10}>
                <li>
                  <button type="button" onClick={() => opener.openFromKey(item.id, `m-mosaic-${item.id}`)} className="grid w-full grid-cols-[28px_1fr] gap-2 py-[6px] text-left">
                    <span className="mono pt-[3px] text-ink-faint">{pad(i + 1)}</span>
                    <span className="line-clamp-2 text-[14px] leading-snug">
                      <span className="font-medium">{item.title}.</span> <span className="text-ink-soft">{item.dek}</span>
                    </span>
                  </button>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      ),
    });
  }

  // Briefs: what has no picture, four at most, text only.
  const briefPages: Item[][] = [];
  for (let i = 0; i < issue.briefs.length; i += 4) briefPages.push(issue.briefs.slice(i, i + 4));
  briefPages.forEach((chunk, pi) => {
    specs.push({
      id: pi === 0 ? "briefs" : `briefs-${pi + 1}`,
      name: "Briefs",
      tab: "latest",
      className: "bg-paper",
      render: (folio) => (
        <div className="flex h-full flex-col px-5 pb-[92px] pt-[calc(28px+var(--sat))]">
          <Folio n={folio} label="Briefs" right={`${pi + 1} / ${briefPages.length}`} />
          <div className="mt-4 flex items-baseline justify-between border-b-[1.5px] border-ink pb-2">
            <h2 className="text-[40px] font-normal uppercase leading-none tracking-[-0.05em]">Briefs</h2>
            <span className="mono text-ink-soft">{pad(issue.briefs.length)}</span>
          </div>
          <div className="mt-5 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-x-5 gap-y-4">
            {chunk.map((item, i) => (
              <Grow key={item.id} lag={i % 2} y={12} className={`min-h-0 overflow-hidden ${i % 2 === 0 ? "border-r border-rule-soft pr-5" : ""}`}>
                {/* Tap opens it; a long press pops the like fan where the finger is. */}
                <PressLike item={item} onOpen={() => opener.open(item.id)} className="block w-full text-left">
                  {(verdict) => (
                    <>
                      <span className="mono block text-ink-soft">
                        {byId[item.franchise]?.code} · {dot(item.date)}
                        {item.suggested ? <span className="text-accent"> · Suggested</span> : null}
                        {verdict === "like" ? <span className="text-accent"> · More</span> : verdict === "dislike" ? <span className="text-ink-faint"> · Less</span> : null}
                      </span>
                      <span className="mt-1 line-clamp-3 text-[16px] font-medium leading-[1.12] tracking-[-0.02em]">{item.title}</span>
                      <span className="mt-1 line-clamp-5 text-[13px] leading-[1.42] text-ink/75">{item.body[0]}</span>
                      {item.mock ? <span className="mono mt-1 block text-ink-faint">Sample</span> : null}
                    </>
                  )}
                </PressLike>
              </Grow>
            ))}
          </div>
        </div>
      ),
    });
  });

  // Dates: the next one in giant numerals; then what is coming, on a strip.
  if (issue.next) {
    const next = issue.next;
    specs.push({
      id: "countdown",
      name: "Countdown",
      tab: "dates",
      render: (folio) => <Countdown item={next} folio={folio} franchise={byId[next.franchise]} onOpen={() => opener.open(next.id, undefined, "b")} />,
    });
  }
  if (issue.coming.length) {
    specs.push({
      id: "calendar",
      name: "Calendar",
      tab: "dates",
      render: (folio) => (
        <div className="flex h-full flex-col pb-[92px] pt-[calc(28px+var(--sat))]">
          <div className="px-5">
            <Folio n={folio} label="Coming up" right={`${pad(issue.coming.length)} dates`} />
            <Reveal>
              <h2 className="mt-4 text-[40px] font-normal uppercase leading-none tracking-[-0.05em]">Coming up</h2>
            </Reveal>
          </div>
          <div className="my-auto">
            <SnapStrip
              label="Coming up"
              fraction={0.7}
              gap={12}
              cards={issue.coming.map((item, i) => (
                <motion.button
                  key={item.id}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  transition={springs.popping}
                  onClick={() => {
                    haptic.select();
                    opener.open(item.id, undefined, "b");
                  }}
                  className={`flex aspect-[3/4] w-full flex-col justify-between p-4 text-left ${i % 3 === 1 ? "border border-ink bg-paper text-ink" : "bg-ink text-paper"}`}
                >
                  <span className="mono flex justify-between opacity-70">
                    <span>{byId[item.franchise]?.code}</span>
                    <span className="text-accent">{countdown(item.when!)}</span>
                  </span>
                  <span className="text-[26px] font-bold uppercase leading-[0.92] tracking-[-0.035em]">{item.title}</span>
                  <span className="grid grid-cols-[44px_1fr] gap-y-[2px] text-[12px] leading-tight opacity-80">
                    <span className="opacity-60">Date</span>
                    <span>{dot(item.when)}</span>
                    <span className="opacity-60">Type</span>
                    <span>{kindLabel[item.kind]}</span>
                  </span>
                </motion.button>
              ))}
            />
          </div>
        </div>
      ),
    });
  }

  // Watching and the archive run as long as they need, paged a screen at a time.
  specs.push({
    id: "watching",
    name: "Watching",
    tab: "watch",
    tall: true,
    render: (folio) => (
      <div className="pb-[92px] pt-[calc(28px+var(--sat))]">
        <Watching items={everything} byId={byId} page={folio} onOpen={(item) => opener.open(item.id, undefined, "b")} />
      </div>
    ),
  });
  specs.push({
    id: "archive",
    name: "All entries",
    tab: "archive",
    tall: true,
    render: (folio) => (
      <div className="pb-[92px] pt-[calc(28px+var(--sat))]">
        <div className="px-5">
          <Folio n={folio} label="Archive" right={`${pad(archive.length)} entries`} />
          <h2 className="mt-4 text-[30px] font-normal leading-none tracking-[-0.04em]">— Archive</h2>
        </div>
        <nav className="no-scrollbar mt-6 flex gap-5 overflow-x-auto px-5" aria-label="Filter">
          {(["all", ...kindOrder] as (Kind | "all")[]).map((k) => {
            const n = k === "all" ? items.length : counts[k] ?? 0;
            const active = filter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={(e) => {
                  haptic.select();
                  setFilter(k);
                  e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
                className="relative shrink-0 pb-2"
              >
                <span className={`mono ${active ? "text-ink" : "text-ink-faint"}`}>
                  {k === "all" ? "All" : kindLabel[k]} <sup className="text-[8px]">{pad(n)}</sup>
                </span>
                {active ? <motion.span layoutId="m-filter" transition={springs.snappy} className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-ink" /> : null}
              </button>
            );
          })}
        </nav>
        <ol className="mt-3 border-t border-rule">
          <AnimatePresence initial={false} mode="popLayout">
            {archive.map((item, i) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={springs.settling}
                className="border-b border-rule-soft"
              >
                <Grow from={0.95} y={12}>
                  <Row
                    index={pad(i + 1)}
                    item={item}
                    franchise={byId[item.franchise]}
                    flightKey={`m-row-${item.id}`}
                    away={opener.isAway(`m-row-${item.id}`)}
                    onOpen={(from) => opener.open(item.id, from)}
                    onOpenText={() => opener.openFromKey(item.id, `m-row-${item.id}`)}
                  />
                </Grow>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>
    ),
  });

  // Colophon: what the issue follows, and the issue number.
  specs.push({
    id: "colophon",
    name: "Colophon",
    tab: "archive",
    tall: true,
    render: (folio) => (
      <footer className="flex min-h-[100svh] flex-col px-5 pb-[calc(110px+var(--sab))] pt-[calc(28px+var(--sat))]">
        <Folio n={folio} label="Colophon" right={`Nº${issueNo}`} />
        <div className="mt-6 border-t border-ink pt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] font-medium">Following</span>
            <span className="mono text-ink-soft">{pad(franchises.length)}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {franchises.map((fr) => (
              <div key={fr.id} className="text-[13px] leading-tight">
                <span className="mono mr-2 text-ink-soft">{fr.code}</span>
                {fr.name}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-auto pt-12 text-[19vw] font-bold leading-[0.8] tracking-[-0.07em] text-ink/10 min-[520px]:text-[98px]">Nº{issueNo}</p>
        <div className="mt-8">
          <VariantSwitch current="m" />
        </div>
        <p className="mono mt-6 text-ink-faint">Prototype · snapshot {dot(SNAPSHOT)} · images belong to their publishers</p>
      </footer>
    ),
  });

  const folioOf: Record<string, string> = Object.fromEntries(specs.map((s, i) => [s.id, pad(i + 1)]));
  const contents = [
    issue.feature && { label: "Feature", title: issue.feature.title, anchor: "feature" },
    issue.dossier && { label: "Dossier", title: `${issue.dossier.franchise.name}, in collabs`, anchor: "dossier" },
    issue.pair.length && { label: "Wardrobe", title: issue.pair.map((p) => byId[p.franchise]?.name).join(" & "), anchor: "pair" },
    issue.spotlight && { label: "Spotlight", title: issue.spotlight.title, anchor: "spotlight" },
    issue.grid.length && { label: "Latest", title: `${spell(issue.grid.length)} things that moved`, anchor: "latest" },
    issue.forYou.length && { label: "For you", title: `${spell(issue.forYou.length)} picks from your taste`, anchor: "for-you" },
    (issue.duo.length || issue.mosaic.length) && {
      label: "Gallery",
      title: `${spell(issue.duo.length + issue.mosaic.length)} more pictures`,
      anchor: issue.duo.length ? "duo" : "mosaic",
    },
    issue.briefs.length && { label: "Briefs", title: `${spell(issue.briefs.length)} without a picture`, anchor: "briefs" },
    (issue.next || issue.coming.length) && {
      label: "Dates",
      title: issue.next ? `Next: ${issue.next.title}` : `${spell(issue.coming.length)} dates ahead`,
      anchor: issue.next ? "countdown" : "calendar",
    },
    { label: "Watching", title: "The dates you follow", anchor: "watching" },
    { label: "Archive", title: `All ${items.length} entries`, anchor: "archive" },
  ].filter(Boolean) as { label: string; title: string; anchor: string }[];

  return (
    <LayoutGroup>
      <PullReadout raw={pull.raw} lift={pull.lift} armed={pull.armed} issueNo={issueNo} />
      <EditionsReadout raw={topPull.raw} lift={topPull.lift} armed={topPull.armed} issueNo={issueNo} commitAt={140} />
      <motion.main
        key={`${ed.year}-${ed.week}`}
        className="mx-auto w-full max-w-[520px] overflow-x-clip bg-ground"
        style={{ scale: bounce, transformOrigin: bounceOrigin, y: pageY }}
      >
        {specs.map((s) => (
          <Page key={s.id} id={s.id} name={s.name} tab={s.tab} folio={folioOf[s.id]} tall={s.tall} className={s.className}>
            {s.render(folioOf[s.id])}
          </Page>
        ))}
      </motion.main>

      <BottomBar
        tabs={TABS}
        active={where.tab}
        section={where.section}
        folio={where.folio}
        hidden={!!opened || fetching || calendar}
        onGo={(t) => springScrollTo(t.anchor)}
      />

      {calendar ? (
        <Editions
          issueNo={issueNo}
          latest={latest}
          has={(n) => weeks.has(n)}
          count={(n) => weeks.get(n)?.items.length ?? null}
          onPick={(n) => setFetchTarget({ kind: "issue", week: n })}
          onClose={() => setCalendar(false)}
        />
      ) : null}

      {fetchTarget !== null ? (
        <ReloadScreen
          issueNo={fetchTarget.kind === "issue" ? fetchTarget.week : newest.week}
          path={fetchTarget.kind === "latest" ? LATEST_URL : `/kit/updatr/issues/${fetchTarget.week}`}
          run={async (signal) => {
            if (fetchTarget.kind === "issue") return { text: `Issue ${fetchTarget.week} ready`, fresh: true };
            // Ask the server for its newest edition; it is new if it is a
            // later week, or this week updated since the page loaded.
            const remote = await fetchLatest(signal);
            pending.current = remote && newer(newest, remote) ? remote : null;
            if (pending.current) return { text: `Issue ${remote!.week} ${remote!.week === newest.week ? "updated" : "ready"}`, fresh: true };
            if (ed !== newest) return { text: `Latest is Nº${newest.week}`, fresh: true };
            return { text: remote ? `Up to date · Nº${newest.week}` : "Offline · showing what's here", fresh: false };
          }}
          onReady={() => {
            if (fetchTarget.kind === "issue") {
              setView({ year: newest.year, week: fetchTarget.week });
            } else {
              const got = pending.current;
              pending.current = null;
              if (got) {
                setEds((list) => [got, ...list.filter((e) => !(e.year === got.year && e.week === got.week))]);
                setView({ year: got.year, week: got.week });
              } else if (ed === newest) {
                return; // nothing new: the page stays where it was
              } else {
                setView({ year: newest.year, week: newest.week });
              }
            }
            setFilter("all");
            window.scrollTo(0, 0);
          }}
          onCancel={() => {}}
          onGone={() => setFetchTarget(null)}
        />
      ) : null}

      {openItem && opened ? (
        <Detail
          key={openItem.id}
          item={openItem}
          franchise={byId[openItem.franchise]}
          variant={opened.variant}
          origin={opener.origin}
          onRelease={opener.release}
          onClosed={opener.closed}
          like={(say) => <ItemLike item={openItem} say={say} />}
          onFollowChange={(on) => nudge(openItem, "follow", on)}
          position={`${pad(Math.max(1, issue.all.findIndex((i) => i.id === openItem.id) + 1))} / ${pad(issue.all.length)}`}
        />
      ) : null}
    </LayoutGroup>
  );
}

/* ---------- countdown: giant numerals, scaled in as the page lands ---------- */

function Countdown({ item, folio, franchise, onOpen }: { item: Item; folio: string; franchise?: Franchise; onOpen: () => void }) {
  const page = usePageProgress();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const t = useTransform(() => (page ? Math.max(0, Math.min(1, (page.get() - 0.3) / 0.7)) : scrollYProgress.get()));
  const scale = useTransform(t, [0, 1], [0.7, 1]);
  const x = useTransform(t, [0, 1], ["12%", "0%"]);
  const days = Math.max(0, daysFrom(item.when!));
  return (
    <div ref={ref} className="flex h-full flex-col px-5 pb-[92px] pt-[calc(28px+var(--sat))]">
      <Folio n={folio} label="Next" right={franchise?.code} />
      <motion.button type="button" onClick={onOpen} whileTap={{ scale: 0.97 }} transition={springs.popping} className="my-auto block w-full border-t border-ink pt-3 text-left">
        <motion.span
          style={{ scale, x, transformOrigin: "left bottom" }}
          className="block text-[46vw] font-bold leading-[0.78] tracking-[-0.08em] text-accent min-[520px]:text-[240px]"
        >
          {pad(days)}
        </motion.span>
        <span className="mt-4 flex items-baseline justify-between gap-4">
          <span className="text-[13px] font-medium uppercase tracking-[0.02em]">Days until</span>
          <span className="mono text-ink-soft">{dot(item.when)}</span>
        </span>
        <span className="mt-2 line-clamp-3 text-[28px] font-medium leading-[1.02] tracking-[-0.035em]">{item.title}</span>
        <span className="mt-2 line-clamp-3 text-[14px] leading-[1.45] text-ink-soft">{item.dek}</span>
      </motion.button>
    </div>
  );
}
