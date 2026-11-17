"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, animate, motion, useScroll, useSpring, useTransform } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { kindLabel, kindOrder, type Franchise, type Item, type Kind } from "@/data/updatr/types";
import { SNAPSHOT, countdown, daysFrom, dot, isoWeek, pad, spell } from "@/lib/updatr/format";
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
import { Editions, EditionsReadout } from "./Editions";
import { Arrow } from "./Arrow";
import { GROW_SPRING, Grow } from "./Grow";

/* ---------- navigation ---------- */

/** Four tabs; each owns a run of sections, in page order. */
const TABS: Tab[] = [
  { id: "issue", label: "Issue", anchor: "top" },
  { id: "latest", label: "Latest", anchor: "latest" },
  { id: "dates", label: "Dates", anchor: "countdown" },
  { id: "archive", label: "Archive", anchor: "archive" },
];

/** Page numbers in the contents, in reading order. */
const PAGE = { feature: "04", dossier: "08", wardrobe: "14", latest: "18", briefs: "22", dates: "26", archive: "30" };
/** Folio of each section, for the home square. */
const FOLIO: Record<string, string> = {
  Cover: "01",
  Contents: "02",
  Note: "03",
  Feature: PAGE.feature,
  Dossier: PAGE.dossier,
  Wardrobe: PAGE.wardrobe,
  "Six squares": PAGE.latest,
  Briefs: PAGE.briefs,
  Countdown: PAGE.dates,
  Calendar: "28",
  "All entries": PAGE.archive,
};

let scrolling: { stop: () => void } | null = null;
/** Spring the page to an anchor; a touch or the wheel takes over at once. */
function springScrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const target = id === "top" ? 0 : Math.max(0, el.getBoundingClientRect().top + window.scrollY - 12);
  scrolling?.stop();
  const ctl = animate(window.scrollY, target, { ...springs.settling, onUpdate: (v) => window.scrollTo(0, v) });
  scrolling = ctl;
  const stop = () => ctl.stop();
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
  const p = useSpring(scrollYProgress, GROW_SPRING);
  const scale = useTransform(p, [0, 1], [from, 1], { clamp: false });
  const opacity = useTransform(p, [0, 1], [0.35, 1]);
  return (
    <motion.div ref={ref} className={className} style={{ scale, opacity, transformOrigin: "50% 100%" }}>
      {children}
    </motion.div>
  );
}

function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mono ${className}`}>{children}</p>;
}

function Section({
  name,
  tab,
  id,
  children,
  className = "",
}: {
  name: string;
  tab: string;
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} data-section={name} data-tab={tab} className={className}>
      {children}
    </section>
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

export function MagazineScreen({ items, franchises }: { items: Item[]; franchises: Franchise[] }) {
  const byId = useMemo(() => Object.fromEntries(franchises.map((f) => [f.id, f])), [franchises]);
  // Each fetch from the bottom of the page brings the next edition.
  const [edition, setEdition] = useState(0);
  // The issue being fetched (from the bottom pull, or picked on the calendar).
  const [fetchTarget, setFetchTarget] = useState<number | null>(null);
  const fetching = fetchTarget !== null;
  const [calendar, setCalendar] = useState(false);
  const baseIssue = isoWeek(SNAPSHOT);
  const issueNo = baseIssue + edition;
  const [latest, setLatest] = useState(baseIssue);
  const issue = useMemo(() => buildIssue(items, franchises, edition), [items, franchises, edition]);
  const opener = useOpener();
  const { opened } = opener;
  const [where, setWhere] = useState({ section: "Cover", tab: "issue" });
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [focus, setFocus] = useState<Item | null>(null);

  const openItem = opened ? items.find((i) => i.id === opened.id) : null;
  const cap = (i: Item) => ({ kicker: `${byId[i.franchise]?.code ?? ""} — ${kindLabel[i.kind]} — ${dot(i.date)}`, title: i.title });
  const fly = (item: Item, key: string, variant: "a" | "b" = "a") => ({
    flightKey: key,
    away: opener.isAway(key),
    onOpen: (from: OpenFrom) => opener.open(item.id, { key, ...from }, variant),
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
      const next = { section: hit.dataset.section ?? "", tab: hit.dataset.tab ?? "issue" };
      setWhere((w) => (w.section === next.section && w.tab === next.tab ? w : next));
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
  const pull = useBottomPull({ enabled: free, onCommit: () => setFetchTarget(issueNo + 1) });
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

  const contents = [
    issue.feature && { page: PAGE.feature, label: "Feature", title: issue.feature.title, anchor: "feature" },
    issue.dossier && { page: PAGE.dossier, label: "Dossier", title: `${issue.dossier.franchise.name}, in collabs`, anchor: "dossier" },
    issue.pair.length && {
      page: PAGE.wardrobe,
      label: "Wardrobe",
      title: issue.pair.map((p) => byId[p.franchise]?.name).join(" & "),
      anchor: "pair",
    },
    issue.grid.length && { page: PAGE.latest, label: "Latest", title: `${spell(issue.grid.length)} things that moved`, anchor: "latest" },
    issue.briefs.length && { page: PAGE.briefs, label: "Briefs", title: `${spell(issue.briefs.length)} shorter notes`, anchor: "briefs" },
    issue.next && { page: PAGE.dates, label: "Countdown", title: issue.next.title, anchor: "countdown" },
    { page: PAGE.archive, label: "Archive", title: `All ${items.length} entries`, anchor: "archive" },
  ].filter(Boolean) as { page: string; label: string; title: string; anchor: string }[];

  return (
    <LayoutGroup>
      <PullReadout raw={pull.raw} lift={pull.lift} armed={pull.armed} issueNo={issueNo} />
      <EditionsReadout raw={topPull.raw} lift={topPull.lift} armed={topPull.armed} issueNo={issueNo} commitAt={140} />
      <motion.main
        key={edition}
        className="mx-auto min-h-dvh w-full max-w-[520px] overflow-x-clip bg-ground pb-[calc(110px+var(--sab))]"
        style={{ scale: bounce, transformOrigin: bounceOrigin, y: pageY }}
      >
        {/* ================= ISSUE ================= */}

        {/* Cover */}
        <Section name="Cover" tab="issue" id="top">
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
              className="mt-4 text-[22vw] font-bold leading-[0.8] tracking-[-0.07em] min-[520px]:text-[112px]"
            >
              Updatr
            </motion.h1>
          </div>
          {issue.cover ? (
            <div className="relative mt-6">
              <HoldImage
                src={issue.cover.image}
                alt={issue.cover.title}
                caption={cap(issue.cover)}
                fallbackTitle={issue.cover.title}
                ratio="4 / 5"
                {...fly(issue.cover, `m-cover-${issue.cover.id}`)}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-5 pb-6 pt-24 text-paper">
                <p className="mono text-paper/70">Cover — {byId[issue.cover.franchise]?.name}</p>
                <p className="mt-2 text-[34px] font-bold uppercase leading-[0.9] tracking-[-0.04em]">{issue.cover.title}</p>
              </div>
            </div>
          ) : null}
          <Marquee items={issue.coming.map((i) => `${byId[i.franchise]?.code} ${i.title} — ${countdown(i.when!)}`)} />
        </Section>

        {/* Contents */}
        <Section name="Contents" tab="issue" id="contents" className="px-5 pt-14">
          <Reveal>
            <div className="flex items-baseline justify-between border-b-[1.5px] border-ink pb-2">
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
                  className="grid grid-cols-[38px_88px_1fr] items-baseline gap-2 border-b border-rule-soft py-3"
                >
                  <span className="mono text-accent">P.{c.page}</span>
                  <span className="mono text-ink-soft">{c.label}</span>
                  <span className="text-[15px] leading-snug">{c.title}</span>
                </motion.a>
              </Reveal>
            ))}
          </ol>
        </Section>

        {/* Editor's note */}
        <Section name="Note" tab="issue" id="note" className="px-5 pt-20">
          <div className="grid grid-cols-[88px_1fr] gap-4">
            <span className="text-[14px] font-medium">
              Note <Arrow dir="downRight" weight={1.75} />
            </span>
            <Reveal>
              <p className="text-[25px] leading-[1.14] tracking-[-0.03em]">
                {spell(items.length)} things moved across {spell(worlds).toLowerCase()} worlds this week.{" "}
                <span className="text-ink-soft">
                  {issue.next
                    ? `The next date to watch is ${dot(issue.next.when)}, in ${daysFrom(issue.next.when!)} days.`
                    : "Nothing scheduled yet."}
                </span>
              </p>
            </Reveal>
          </div>
        </Section>

        {/* Feature: asymmetric spread */}
        {issue.feature ? (
          <Section name="Feature" tab="issue" id="feature" className="pt-24">
            <div className="px-5">
              <Reveal>
                <Kicker className="text-accent">P.{PAGE.feature} — Feature</Kicker>
                <h2 className="mt-3 text-[44px] font-medium leading-[0.96] tracking-[-0.045em]">{issue.feature.title}</h2>
              </Reveal>
            </div>
            <div className="mt-8 grid grid-cols-[1fr_68%] items-end gap-4 pl-5">
              <Reveal y={16}>
                <div className="mono space-y-3 pb-1 text-ink-soft">
                  <p>{byId[issue.feature.franchise]?.code}</p>
                  <p>{kindLabel[issue.feature.kind]}</p>
                  <p>{dot(issue.feature.date)}</p>
                  <p>{issue.feature.source}</p>
                </div>
              </Reveal>
              <Rise>
                <HoldImage
                  src={issue.feature.image}
                  alt={issue.feature.title}
                  caption={cap(issue.feature)}
                  fallbackTitle={issue.feature.title}
                  ratio="3 / 4"
                    {...fly(issue.feature, `m-feature-${issue.feature.id}`)}
                />
              </Rise>
            </div>
            <div className="px-5">
              <Reveal>
                <blockquote className="mt-10 border-l-[3px] border-accent pl-4 text-[26px] font-medium leading-[1.12] tracking-[-0.03em]">
                  {issue.feature.dek}
                </blockquote>
              </Reveal>
              <div className="mt-8">
                {issue.feature.body.map((p, i) => (
                  <Reveal key={i} y={12}>
                    <p
                      className={`mb-4 text-[16px] leading-[1.55] text-ink/85 ${
                        i === 0
                          ? "first-letter:float-left first-letter:mr-2 first-letter:text-[54px] first-letter:font-bold first-letter:leading-[0.8]"
                          : ""
                      }`}
                    >
                      {p}
                    </p>
                  </Reveal>
                ))}
              </div>
              <button
                type="button"
                onClick={() => opener.openFromKey(issue.feature!.id, `m-feature-${issue.feature!.id}`)}
                className="mono mt-2 text-ink"
              >
                Continue <Arrow dir="downRight" />
              </button>
            </div>
          </Section>
        ) : null}

        {/* Dossier: inverted, spring strip */}
        {issue.dossier ? (
          <Section name="Dossier" tab="issue" id="dossier" className="mt-24 bg-ink pb-14 pt-12 text-paper">
            <div className="px-5">
              <Kicker className="text-paper/50">P.{PAGE.dossier} — Dossier</Kicker>
              <Reveal>
                <h2 className="mt-3 text-[52px] font-bold uppercase leading-[0.85] tracking-[-0.055em]">
                  {issue.dossier.franchise.name}
                </h2>
              </Reveal>
              <div className="mt-6 grid grid-cols-[88px_1fr] gap-x-4 gap-y-1 border-t border-paper/30 pt-3">
                <span className="text-[13px] text-paper/60">Studio</span>
                <span className="text-[13px]">{issue.dossier.franchise.studio}</span>
                <span className="text-[13px] text-paper/60">Watching</span>
                <span className="text-[13px]">{issue.dossier.franchise.watching}</span>
                <span className="text-[13px] text-paper/60">On file</span>
                <span className="text-[13px]">{pad(issue.dossier.items.length)} entries</span>
              </div>
            </div>
            <div className="mt-10">
              <SnapStrip
                label={`${issue.dossier.franchise.name} dossier`}
                tone="dark"
                fraction={0.8}
                cards={issue.dossier.items.map((item, i) => (
                  <article key={item.id}>
                    <div className="relative">
                      <HoldImage
                        src={item.image}
                        alt={item.title}
                        caption={cap(item)}
                        fallbackTitle={item.title}
                        ratio="4 / 5"
                        {...fly(item, `m-dossier-${item.id}`, "b")}
                      />
                      <span className="pointer-events-none absolute -bottom-6 right-2 text-[88px] font-bold leading-none tracking-[-0.06em] text-paper mix-blend-difference">
                        {pad(i + 1)}
                      </span>
                    </div>
                    <p className="mono mt-8 text-paper/50">
                      {kindLabel[item.kind]} — {item.when && item.status !== "out" ? countdown(item.when) : dot(item.date)}
                    </p>
                    <h3 className="mt-2 text-[22px] font-medium leading-[1.08] tracking-[-0.025em]">{item.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.45] text-paper/70">{item.dek}</p>
                  </article>
                ))}
              />
            </div>
          </Section>
        ) : null}

        {/* Wardrobe: staggered pair */}
        {issue.pair.length ? (
          <Section name="Wardrobe" tab="issue" id="pair" className="px-5 pt-24">
            <Reveal>
              <div className="flex items-baseline justify-between border-b border-rule pb-3">
                <h2 className="text-[30px] font-normal leading-none tracking-[-0.04em]">— Wardrobe</h2>
                <span className="mono text-ink-soft">P.{PAGE.wardrobe}</span>
              </div>
            </Reveal>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {issue.pair.map((item, i) => (
                <Rise key={item.id} className={i === 1 ? "pt-20" : ""} from={i === 1 ? 0.78 : 0.86}>
                  <HoldImage
                    src={item.image}
                    alt={item.title}
                    caption={cap(item)}
                    fallbackTitle={item.title}
                    ratio={i === 0 ? "3 / 4" : "1 / 1"}
                    {...fly(item, `m-pair-${item.id}`)}
                  />
                  <p className="mono mt-3 text-ink-soft">
                    {byId[item.franchise]?.code} — {kindLabel[item.kind]}
                  </p>
                  <button
                    type="button"
                    onClick={() => opener.openFromKey(item.id, `m-pair-${item.id}`)}
                    className="mt-1 block text-left"
                  >
                    <span className="block text-[16px] font-medium leading-[1.15] tracking-[-0.02em]">{item.title}</span>
                    <span className="mt-1 block text-[13px] leading-[1.4] text-ink-soft">{item.dek}</span>
                  </button>
                </Rise>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ================= LATEST ================= */}

        {/* Six squares */}
        {issue.grid.length ? (
          <Section name="Six squares" tab="latest" id="latest" className="pt-24">
            <div className="flex items-baseline justify-between px-5 pb-4">
              <h2 className="text-[14px] font-medium uppercase tracking-[0.02em]">Latest — {pad(issue.grid.length)}</h2>
              <span className="mono text-ink-soft">P.{PAGE.latest}</span>
            </div>
            <div className="grid grid-cols-3 border-y border-rule">
              {issue.grid.map((item, i) => (
                <Grow
                  key={item.id}
                  from={0.92}
                  y={14}
                  lag={i % 3}
                  className={`border-rule ${i % 3 !== 2 ? "border-r" : ""} ${i < 3 ? "border-b" : ""}`}
                >
                  <HoldImage
                    src={item.image}
                    alt={item.title}
                    caption={cap(item)}
                    fallbackTitle={item.title}
                    index={pad(i + 1)}
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
            <ol className="px-5 pt-4">
              {issue.grid.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => opener.openFromKey(item.id, `m-grid-${item.id}`)}
                    className="grid w-full grid-cols-[28px_1fr] gap-2 py-[5px] text-left"
                  >
                    <span className="mono pt-[3px] text-ink-faint">{pad(i + 1)}</span>
                    <span className="text-[14px] leading-snug">
                      <span className="font-medium">{item.title}.</span> <span className="text-ink-soft">{item.dek}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {/* Briefs: text only, two columns */}
        {issue.briefs.length ? (
          <Section name="Briefs" tab="latest" id="briefs" className="mt-24 bg-paper px-5 pb-12 pt-10">
            <div className="flex items-baseline justify-between border-b-[1.5px] border-ink pb-2">
              <h2 className="text-[40px] font-normal uppercase leading-none tracking-[-0.05em]">Briefs</h2>
              <span className="mono text-ink-soft">P.{PAGE.briefs}</span>
            </div>
            <div className="mt-6 columns-2 gap-5 [column-rule:1px_solid_var(--rule-soft)]">
              {issue.briefs.map((item, i) => (
                <Grow key={item.id} lag={i % 2} y={12} className="mb-6 break-inside-avoid">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    transition={springs.snappy}
                    onClick={() => opener.open(item.id)}
                    className="block w-full text-left"
                  >
                  <span className="mono block text-ink-soft">
                    {byId[item.franchise]?.code} · {dot(item.date)}
                  </span>
                  <span className="mt-1 block text-[16px] font-medium leading-[1.12] tracking-[-0.02em]">{item.title}</span>
                  <span className="mt-1 block text-[13px] leading-[1.42] text-ink/75">{item.body[0]}</span>
                  {item.mock ? <span className="mono mt-1 block text-ink-faint">Sample</span> : null}
                  </motion.button>
                </Grow>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ================= DATES ================= */}

        {issue.next ? (
          <Countdown
            item={issue.next}
            franchise={byId[issue.next.franchise]}
            onOpen={() => opener.open(issue.next!.id, undefined, "b")}
          />
        ) : null}

        {issue.coming.length ? (
          <Section name="Calendar" tab="dates" id="calendar" className="pt-6">
            <SnapStrip
              label="Coming up"
              fraction={0.56}
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
                  className={`flex aspect-[3/4] w-full flex-col justify-between p-4 text-left ${
                    i % 3 === 1 ? "border border-ink bg-paper text-ink" : "bg-ink text-paper"
                  }`}
                >
                  <span className="mono flex justify-between opacity-70">
                    <span>{byId[item.franchise]?.code}</span>
                    <span className="text-accent">{countdown(item.when!)}</span>
                  </span>
                  <span className="text-[21px] font-bold uppercase leading-[0.92] tracking-[-0.035em]">{item.title}</span>
                  <span className="grid grid-cols-[44px_1fr] gap-y-[2px] text-[12px] leading-tight opacity-80">
                    <span className="opacity-60">Date</span>
                    <span>{dot(item.when)}</span>
                    <span className="opacity-60">Type</span>
                    <span>{kindLabel[item.kind]}</span>
                  </span>
                </motion.button>
              ))}
            />
          </Section>
        ) : null}

        {/* ================= ARCHIVE ================= */}

        <Section name="All entries" tab="archive" id="archive" className="pt-24">
          <div className="flex items-baseline justify-between px-5">
            <h2 className="text-[30px] font-normal leading-none tracking-[-0.04em]">— Archive</h2>
            <span className="mono text-ink-soft">P.{PAGE.archive}</span>
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
                  {active ? (
                    <motion.span layoutId="m-filter" transition={springs.snappy} className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-ink" />
                  ) : null}
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
        </Section>

        {/* Colophon */}
        <footer className="px-5 pt-20">
          <div className="border-t border-ink pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-medium">Following</span>
              <span className="mono text-ink-soft">{pad(franchises.length)}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {franchises.map((f) => (
                <div key={f.id} className="text-[13px] leading-tight">
                  <span className="mono mr-2 text-ink-soft">{f.code}</span>
                  {f.name}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-16 text-[19vw] font-bold leading-[0.8] tracking-[-0.07em] text-ink/10 min-[520px]:text-[98px]">
            Nº{issueNo}
          </p>
          <div className="mt-8">
            <VariantSwitch current="m" />
          </div>
          <p className="mono mt-6 text-ink-faint">Prototype · snapshot {dot(SNAPSHOT)} · images belong to their publishers</p>
        </footer>
      </motion.main>

      <BottomBar
        tabs={TABS}
        active={where.tab}
        section={where.section}
        folio={FOLIO[where.section] ?? "01"}
        hidden={!!opened || fetching || calendar}
        onGo={(t) => springScrollTo(t.anchor)}
      />

      {calendar ? (
        <Editions
          issueNo={issueNo}
          latest={latest}
          onPick={(n) => setFetchTarget(n)}
          onClose={() => setCalendar(false)}
        />
      ) : null}

      {fetchTarget !== null ? (
        <ReloadScreen
          issueNo={fetchTarget}
          onReady={() => {
            setEdition(fetchTarget - baseIssue);
            setLatest((l) => Math.max(l, fetchTarget));
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
          position={`${pad(issue.all.findIndex((i) => i.id === openItem.id) + 1)} / ${pad(issue.all.length)}`}
        />
      ) : null}
    </LayoutGroup>
  );
}

/* ---------- countdown: giant numerals, scroll-scaled ---------- */

function Countdown({ item, franchise, onOpen }: { item: Item; franchise?: Franchise; onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.7, 1]);
  const x = useTransform(scrollYProgress, [0, 1], ["12%", "0%"]);
  const days = Math.max(0, daysFrom(item.when!));
  return (
    <section id="countdown" data-section="Countdown" data-tab="dates" className="px-5 pt-24">
      <div ref={ref} className="border-t border-ink pt-3">
        <div className="mono flex justify-between text-ink-soft">
          <span>P.{PAGE.dates} — Next</span>
          <span>{franchise?.code}</span>
        </div>
        <motion.button
          type="button"
          onClick={onOpen}
          whileTap={{ scale: 0.97 }}
          transition={springs.popping}
          className="mt-2 block w-full text-left"
        >
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
          <span className="mt-2 block text-[28px] font-medium leading-[1.02] tracking-[-0.035em]">{item.title}</span>
          <span className="mt-2 block text-[14px] leading-[1.45] text-ink-soft">{item.dek}</span>
        </motion.button>
      </div>
    </section>
  );
}
