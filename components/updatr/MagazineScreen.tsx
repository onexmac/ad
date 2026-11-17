"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion, useScroll, useTransform } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { kindLabel, kindOrder, type Franchise, type Item, type Kind } from "@/data/updatr/types";
import { SNAPSHOT, countdown, daysFrom, dot, isoWeek, pad, spell } from "@/lib/updatr/format";
import { buildIssue } from "@/lib/updatr/issue";
import { HoldImage } from "./HoldImage";
import { Detail } from "./Detail";
import { Row } from "./GridScreen";
import { VariantSwitch } from "./VariantSwitch";

type Opened = { id: string; key?: string; variant: "a" | "b" };

/* ---------- small pieces ---------- */

function Reveal({ children, className, delay = 0, y = 28 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ ...springs.expanding, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Scroll-linked rise: grows from smaller as it comes up into view. */
function Rise({ children, className, from = 0.84 }: { children: ReactNode; className?: string; from?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 58%"] });
  const scale = useTransform(scrollYProgress, [0, 1], [from, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.35, 1]);
  return (
    <motion.div ref={ref} className={className} style={{ scale, opacity, transformOrigin: "50% 100%" }}>
      {children}
    </motion.div>
  );
}

/** Card in a horizontal strip: full size at its snap point, smaller off it. */
function StripCard({
  container,
  children,
  className,
}: {
  container: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollXProgress } = useScroll({ container, target: ref, axis: "x", offset: ["start end", "end start"] });
  const scale = useTransform(scrollXProgress, [0, 0.56, 1], [0.86, 1, 0.9]);
  const opacity = useTransform(scrollXProgress, [0, 0.56, 1], [0.5, 1, 0.6]);
  return (
    <motion.div ref={ref} className={className} style={{ scale, opacity, transformOrigin: "50% 60%" }}>
      {children}
    </motion.div>
  );
}

function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mono ${className}`}>{children}</p>;
}

function Section({ name, id, children, className = "" }: { name: string; id: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} data-section={name} className={className}>
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
  const issue = useMemo(() => buildIssue(items, franchises), [items, franchises]);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [section, setSection] = useState("Cover");
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [focus, setFocus] = useState<Item | null>(null);
  const closeDetail = useCallback(() => setOpened(null), []);

  const open = (item: Item, key?: string, variant: "a" | "b" = "a") => {
    setOpened({ id: item.id, key, variant });
  };
  const hidden = (key: string) => opened?.key === key;
  const openItem = opened ? items.find((i) => i.id === opened.id) : null;
  const cap = (i: Item) => ({ kicker: `${byId[i.franchise]?.code ?? ""} — ${kindLabel[i.kind]} — ${dot(i.date)}`, title: i.title });
  const dossierStrip = useRef<HTMLDivElement>(null);
  const ticketStrip = useRef<HTMLDivElement>(null);

  // Running header: which section is under the middle of the screen.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setSection((e.target as HTMLElement).dataset.section ?? "");
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const worlds = new Set(items.filter((i) => !i.mock).map((i) => i.franchise)).size;
  const archive = filter === "all" ? issue.all : issue.all.filter((i) => i.kind === filter);
  const counts = useMemo(() => {
    const c: Partial<Record<Kind, number>> = {};
    for (const i of items) c[i.kind] = (c[i.kind] ?? 0) + 1;
    return c;
  }, [items]);

  const contents: { page: string; label: string; title: string; href: string }[] = [
    issue.feature && { page: "04", label: "Feature", title: issue.feature.title, href: "#feature" },
    issue.grid.length && { page: "08", label: "Latest", title: `${spell(issue.grid.length)} things that moved`, href: "#latest" },
    issue.dossier && { page: "12", label: "Dossier", title: `${issue.dossier.franchise.name}, in collabs`, href: "#dossier" },
    issue.next && { page: "18", label: "Countdown", title: issue.next.title, href: "#countdown" },
    issue.pair.length && { page: "22", label: "Wardrobe", title: issue.pair.map((p) => byId[p.franchise]?.name).join(" & "), href: "#pair" },
    issue.briefs.length && { page: "26", label: "Briefs", title: `${spell(issue.briefs.length)} shorter notes`, href: "#briefs" },
    { page: "30", label: "Archive", title: `All ${items.length} entries`, href: "#archive" },
  ].filter(Boolean) as { page: string; label: string; title: string; href: string }[];

  return (
    <LayoutGroup>
      <main className="mx-auto min-h-dvh w-full max-w-[520px] overflow-x-clip bg-ground pb-[calc(40px+var(--sab))]">
        {/* Running header */}
        <header className="sticky top-0 z-30 border-b border-rule bg-ground/85 px-5 pb-3 pt-[calc(12px+var(--sat))] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <a href="#top" className="flex items-center gap-2">
              <span className="block h-[9px] w-[9px] bg-ink" />
              <span className="mono font-medium text-ink">Updatr® — Nº{isoWeek(SNAPSHOT)}</span>
            </a>
            <span className="relative h-[14px] w-[120px] overflow-hidden text-right">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={section}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={springs.snappy}
                  className="mono absolute right-0 top-0 text-ink-soft"
                >
                  {section}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>
        </header>

        {/* ---------- Cover ---------- */}
        <Section name="Cover" id="top">
          <div className="px-5 pt-8">
            <div className="mono flex justify-between text-ink-soft">
              <span>Issue {isoWeek(SNAPSHOT)}</span>
              <span>{dot(SNAPSHOT)}</span>
              <span>{pad(items.length)} entries</span>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springs.settling}
              className="mt-4 text-[22vw] font-bold leading-[0.8] tracking-[-0.07em] min-[520px]:text-[112px]"
            >
              Updatr<span className="align-top text-[0.3em] tracking-normal">©</span>
            </motion.h1>
          </div>
          {issue.cover ? (
            <div className="relative mt-6">
              <HoldImage
                src={issue.cover.image}
                alt={issue.cover.title}
                caption={cap(issue.cover!)}
                fallbackTitle={issue.cover.title}
                ratio="4 / 5"
                parallax
                layoutId={`m-cover-${issue.cover.id}`}
                hidden={hidden(`m-cover-${issue.cover.id}`)}
                onOpen={() => open(issue.cover!, `m-cover-${issue.cover!.id}`)}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-5 pb-6 pt-24 text-paper">
                <p className="mono text-paper/70">
                  Cover — {byId[issue.cover.franchise]?.name}
                </p>
                <p className="mt-2 text-[34px] font-bold uppercase leading-[0.9] tracking-[-0.04em]">{issue.cover.title}</p>
              </div>
            </div>
          ) : null}
          <Marquee
            items={issue.coming.map((i) => `${byId[i.franchise]?.code} ${i.title} — ${countdown(i.when!)}`)}
          />
        </Section>

        {/* ---------- Contents ---------- */}
        <Section name="Contents" id="contents" className="px-5 pt-14">
          <Reveal>
            <div className="flex items-baseline justify-between border-b-[1.5px] border-ink pb-2">
              <h2 className="text-[40px] font-normal uppercase leading-none tracking-[-0.05em]">Contents</h2>
              <span className="mono text-ink-soft">{pad(contents.length)}</span>
            </div>
          </Reveal>
          <ol>
            {contents.map((c, i) => (
              <Reveal key={c.href} delay={i * 0.04} y={14}>
                <a href={c.href} className="grid grid-cols-[38px_88px_1fr] items-baseline gap-2 border-b border-rule-soft py-3">
                  <span className="mono text-accent">P.{c.page}</span>
                  <span className="mono text-ink-soft">{c.label}</span>
                  <span className="text-[15px] leading-snug">{c.title}</span>
                </a>
              </Reveal>
            ))}
          </ol>
        </Section>

        {/* ---------- Editor's note ---------- */}
        <Section name="Note" id="note" className="px-5 pt-20">
          <div className="grid grid-cols-[88px_1fr] gap-4">
            <span className="text-[14px] font-medium">Note ↘</span>
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

        {/* ---------- Feature (asymmetric spread) ---------- */}
        {issue.feature ? (
          <Section name="Feature" id="feature" className="pt-24">
            <div className="px-5">
              <Reveal>
                <Kicker className="text-accent">P.04 — Feature</Kicker>
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
                caption={cap(issue.feature!)}
                fallbackTitle={issue.feature.title}
                ratio="3 / 4"
                parallax
                layoutId={`m-feature-${issue.feature.id}`}
                hidden={hidden(`m-feature-${issue.feature.id}`)}
                onOpen={() => open(issue.feature!, `m-feature-${issue.feature!.id}`)}
              />
              </Rise>
            </div>
            <div className="px-5">
              <Reveal>
                <blockquote className="mt-10 border-l-[3px] border-accent pl-4 text-[26px] font-medium leading-[1.12] tracking-[-0.03em]">
                  {issue.feature.dek}
                </blockquote>
              </Reveal>
              <div className="mt-8 columns-1 gap-6">
                {issue.feature.body.map((p, i) => (
                  <Reveal key={i} y={12}>
                    <p className={`mb-4 text-[16px] leading-[1.55] text-ink/85 ${i === 0 ? "first-letter:float-left first-letter:mr-2 first-letter:text-[54px] first-letter:font-bold first-letter:leading-[0.8]" : ""}`}>
                      {p}
                    </p>
                  </Reveal>
                ))}
              </div>
              <button type="button" onClick={() => open(issue.feature!)} className="mono mt-2 text-ink">
                Continue ↘
              </button>
            </div>
          </Section>
        ) : null}

        {/* ---------- Latest: six squares ---------- */}
        {issue.grid.length ? (
          <Section name="Latest" id="latest" className="pt-24">
            <div className="flex items-baseline justify-between px-5 pb-4">
              <h2 className="text-[14px] font-medium uppercase tracking-[0.02em]">Latest — {pad(issue.grid.length)}</h2>
              <span className="mono text-ink-soft">P.08</span>
            </div>
            <div className="grid grid-cols-3 border-y border-rule">
              {issue.grid.map((item, i) => {
                const key = `m-grid-${item.id}`;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.92 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-10% 0px" }}
                    transition={{ ...springs.popping, delay: i * 0.05 }}
                    className={`border-rule ${i % 3 !== 2 ? "border-r" : ""} ${i < 3 ? "border-b" : ""}`}
                  >
                    <HoldImage
                      src={item.image}
                      alt={item.title}
                caption={cap(item)}
                      fallbackTitle={item.title}
                      index={pad(i + 1)}
                      layoutId={key}
                      hidden={hidden(key)}
                      onOpen={() => open(item, key)}
                      onHoldChange={(h) => setFocus(h ? item : null)}
                    />
                  </motion.div>
                );
              })}
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
                    <span className="mono text-ink-soft">Hold for colour · tap to open</span>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <ol className="px-5 pt-4">
              {issue.grid.map((item, i) => (
                <li key={item.id}>
                  <button type="button" onClick={() => open(item)} className="grid w-full grid-cols-[28px_1fr] gap-2 py-[5px] text-left">
                    <span className="mono pt-[3px] text-ink-faint">{pad(i + 1)}</span>
                    <span className="text-[14px] leading-snug">
                      <span className="font-medium">{item.title}.</span>{" "}
                      <span className="text-ink-soft">{item.dek}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {/* ---------- Dossier (inverted, horizontal) ---------- */}
        {issue.dossier ? (
          <Section name="Dossier" id="dossier" className="mt-24 bg-ink pb-16 pt-12 text-paper">
            <div className="px-5">
              <Kicker className="text-paper/50">P.12 — Dossier</Kicker>
              <Reveal>
                <h2 className="mt-3 text-[52px] font-bold uppercase leading-[0.85] tracking-[-0.055em]">
                  {issue.dossier.franchise.name}
                </h2>
              </Reveal>
              <div className="mt-6 grid grid-cols-[88px_1fr] gap-4 border-t border-paper/30 pt-3">
                <span className="text-[13px] text-paper/60">Studio</span>
                <span className="text-[13px]">{issue.dossier.franchise.studio}</span>
                <span className="text-[13px] text-paper/60">Watching</span>
                <span className="text-[13px]">{issue.dossier.franchise.watching}</span>
                <span className="text-[13px] text-paper/60">On file</span>
                <span className="text-[13px]">{pad(issue.dossier.items.length)} entries</span>
              </div>
            </div>
            <div ref={dossierStrip} className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5">
              {issue.dossier.items.map((item, i) => {
                const key = `m-dossier-${item.id}`;
                return (
                  <StripCard key={item.id} container={dossierStrip} className="w-[78%] shrink-0 snap-start">
                    <div className="relative">
                      <HoldImage
                        src={item.image}
                        alt={item.title}
                caption={cap(item)}
                        fallbackTitle={item.title}
                        ratio="4 / 5"
                        layoutId={key}
                        hidden={hidden(key)}
                        onOpen={() => open(item, key, "b")}
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
                  </StripCard>
                );
              })}
              <div className="w-1 shrink-0" />
            </div>
          </Section>
        ) : null}

        {/* ---------- Countdown ---------- */}
        {issue.next ? <Countdown item={issue.next} franchise={byId[issue.next.franchise]} onOpen={() => open(issue.next!, undefined, "b")} /> : null}

        {/* ---------- Coming: tickets ---------- */}
        {issue.coming.length ? (
          <Section name="Calendar" id="calendar" className="pt-4">
            <div ref={ticketStrip} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
              {issue.coming.map((item, i) => (
                <StripCard key={item.id} container={ticketStrip} className="w-[52%] shrink-0 snap-start">
                <motion.button
                  type="button"
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ ...springs.popping, delay: i * 0.05 }}
                  onClick={() => {
                    haptic.select();
                    open(item, undefined, "b");
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
                </StripCard>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ---------- Pair (staggered columns) ---------- */}
        {issue.pair.length ? (
          <Section name="Wardrobe" id="pair" className="px-5 pt-24">
            <Reveal>
              <div className="flex items-baseline justify-between border-b border-rule pb-3">
                <h2 className="text-[30px] font-normal leading-none tracking-[-0.04em]">— Wardrobe</h2>
                <span className="mono text-ink-soft">P.22</span>
              </div>
            </Reveal>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {issue.pair.map((item, i) => {
                const key = `m-pair-${item.id}`;
                return (
                  <Rise key={item.id} className={i === 1 ? "pt-20" : ""} from={i === 1 ? 0.78 : 0.86}>
                    <HoldImage
                      src={item.image}
                      alt={item.title}
                caption={cap(item)}
                      fallbackTitle={item.title}
                      ratio={i === 0 ? "3 / 4" : "1 / 1"}
                      layoutId={key}
                      hidden={hidden(key)}
                      onOpen={() => open(item, key)}
                    />
                    <p className="mono mt-3 text-ink-soft">
                      {byId[item.franchise]?.code} — {kindLabel[item.kind]}
                    </p>
                    <button type="button" onClick={() => open(item)} className="mt-1 block text-left">
                      <span className="block text-[16px] font-medium leading-[1.15] tracking-[-0.02em]">{item.title}</span>
                      <span className="mt-1 block text-[13px] leading-[1.4] text-ink-soft">{item.dek}</span>
                    </button>
                  </Rise>
                );
              })}
            </div>
          </Section>
        ) : null}

        {/* ---------- Briefs (text only, two columns) ---------- */}
        {issue.briefs.length ? (
          <Section name="Briefs" id="briefs" className="mt-24 bg-paper px-5 pb-12 pt-10">
            <div className="flex items-baseline justify-between border-b-[1.5px] border-ink pb-2">
              <h2 className="text-[40px] font-normal uppercase leading-none tracking-[-0.05em]">Briefs</h2>
              <span className="mono text-ink-soft">P.26</span>
            </div>
            <div className="mt-6 columns-2 gap-5 [column-rule:1px_solid_var(--rule-soft)]">
              {issue.briefs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => open(item)}
                  className="mb-6 block w-full break-inside-avoid text-left"
                >
                  <span className="mono block text-ink-soft">
                    {byId[item.franchise]?.code} · {dot(item.date)}
                  </span>
                  <span className="mt-1 block text-[16px] font-medium leading-[1.12] tracking-[-0.02em]">{item.title}</span>
                  <span className="mt-1 block text-[13px] leading-[1.42] text-ink/75">{item.body[0]}</span>
                  {item.mock ? <span className="mono mt-1 block text-ink-faint">Sample</span> : null}
                </button>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ---------- Archive (filterable index) ---------- */}
        <Section name="Archive" id="archive" className="pt-20">
          <div className="flex items-baseline justify-between px-5">
            <h2 className="text-[30px] font-normal leading-none tracking-[-0.04em]">— Archive</h2>
            <span className="mono text-ink-soft">P.30</span>
          </div>
          <nav className="no-scrollbar mt-6 flex gap-5 overflow-x-auto px-5" aria-label="Filter">
            {(["all", ...kindOrder] as (Kind | "all")[]).map((k) => {
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
                    <motion.span layoutId="m-filter" transition={springs.snappy} className="absolute inset-x-0 bottom-0 h-[2px] bg-ink" />
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
                  <Row
                    index={pad(i + 1)}
                    item={item}
                    franchise={byId[item.franchise]}
                    hidden={hidden(`m-row-${item.id}`)}
                    onOpen={(fromImage) => open(item, fromImage ? `m-row-${item.id}` : undefined)}
                    layoutKey={`m-row-${item.id}`}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </Section>

        {/* ---------- Colophon ---------- */}
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
          <p className="mt-16 text-[19vw] font-bold leading-[0.8] tracking-[-0.07em] text-ink/10 min-[520px]:text-[98px]">Nº{isoWeek(SNAPSHOT)}</p>
          <div className="mt-8">
            <VariantSwitch current="m" />
          </div>
          <p className="mono mt-6 text-ink-faint">Prototype · snapshot {dot(SNAPSHOT)} · images belong to their publishers</p>
        </footer>
      </main>

      <AnimatePresence>
        {openItem && opened ? (
          <Detail
            key={openItem.id}
            item={openItem}
            franchise={byId[openItem.franchise]}
            variant={opened.variant}
            layoutKey={opened.key}
            position={`${pad(issue.all.findIndex((i) => i.id === openItem.id) + 1)} / ${pad(issue.all.length)}`}
            onClose={closeDetail}
          />
        ) : null}
      </AnimatePresence>
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
    <section id="countdown" data-section="Countdown" className="px-5 pt-24">
      <div ref={ref} className="border-t border-ink pt-3">
        <div className="mono flex justify-between text-ink-soft">
          <span>P.18 — Next</span>
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

