"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, animate, motion, useScroll, useSpring, useTransform } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { categoryName, categoryOrder, kindName, type Category, type Edition, type Note, type Subject } from "@/data/noticss/types";
import type { Franchise, Item } from "@/data/updatr/types";
import { editionKey, notesOf } from "@/lib/noticss/editions";
import { dayMonth, longDate, pad, shortDate, spell, weekday } from "@/lib/noticss/format";
import { HoldImage, type OpenFrom } from "@/components/updatr/HoldImage";
import { Detail } from "@/components/updatr/Detail";
import { SnapStrip } from "@/components/updatr/SnapStrip";
import { BottomBar, type Tab } from "@/components/updatr/BottomBar";
import { useOpener } from "@/components/updatr/useOpener";
import { useEdgeSquish } from "@/components/updatr/useEdgeSquish";
import { Arrow } from "@/components/updatr/Arrow";
import { GROW_SPRING, Grow } from "@/components/updatr/Grow";
import { AbSwitch } from "./AbSwitch";
import { NoteBody, SubjectBody } from "./Article";
import { Delta, RainStrip, Sparkline, weatherLine } from "./Figures";

/*
 * Version A: the morning edition laid out as a printed magazine issue, in
 * Updatr's grammar (cover, contents, feature spread, inverted dossier strip,
 * staggered pair, figures, briefs, archive; the corner square for sections;
 * held pictures lift; tapped pictures fly into the article). The voice is
 * paper: one serif in its optical sizes, small capitals, printer's red.
 */

const TABS: Tab[] = [
  { id: "portada", label: "Portada", anchor: "top" },
  { id: "temas", label: "Temas", anchor: "feature" },
  { id: "cifras", label: "Cifras", anchor: "cifras" },
  { id: "breves", label: "Breves", anchor: "breves" },
  { id: "archivo", label: "Archivo", anchor: "archivo" },
];

const HINT = { slide: "Deslice para abrir", release: "Suelte para abrir" };
const STRINGS = {
  back: "Volver",
  backTo: "Volver a la edición",
  release: "Suelte para volver",
  source: "Fuente",
  sample: "Sin enlace",
  watching: "Guardada para seguir",
  stopped: "Ya no la sigue",
  follow: "Seguir",
  unfollow: "Dejar de seguir",
};

/** Lays the edition out as an issue; no subject is used twice in the composition. */
function compose(ed: Edition) {
  const pictured = (s: Subject) => !!s.image;
  const used = new Set<string>();
  const take = (s?: Subject) => (s && used.add(s.id), s);
  const free = (p: (s: Subject) => boolean = () => true) => ed.subjects.filter((s) => !used.has(s.id) && p(s));

  const cover = take(free(pictured)[0]);
  const feature = take(free((s) => pictured(s) && s.category !== cover?.category)[0] ?? free(pictured)[0]);
  // The dossier: the storyline with the most notes, given an inverted spread.
  const dossier = take(free((s) => s.notes.filter((n) => n.image).length >= 2).sort((a, b) => b.notes.length - a.notes.length)[0]);
  const pair = free(pictured).slice(0, 2);
  pair.forEach(take);
  const rest = free();
  rest.forEach(take);
  // Briefs: imageless notes from storylines shown only by their synopsis.
  const shownWhole = new Set([feature?.id, dossier?.id]);
  const briefs = ed.subjects
    .filter((s) => !shownWhole.has(s.id))
    .flatMap((s) => s.notes.filter((n) => !n.image).map((n) => ({ note: n, subject: s })));
  return { cover, feature, dossier, pair, rest, briefs };
}

let scrolling: { stop: () => void } | null = null;
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

function Reveal({ children, className, delay = 0, y = 18 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <Grow className={className} y={y} lag={Math.round(delay / 0.04)}>
      {children}
    </Grow>
  );
}

function Rise({ children, className, from = 0.86 }: { children: ReactNode; className?: string; from?: number }) {
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

function Section({ name, tab, id, children, className = "" }: { name: string; tab: string; id: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} data-section={name} data-tab={tab} className={className}>
      {children}
    </section>
  );
}

/** A section head as print sets it: a heavy rule, the name, the folio. */
function Head({ title, folio, dark = false }: { title: string; folio: string; dark?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between border-t-[3px] pt-2 ${dark ? "border-paper" : "border-ink"}`}>
      <h2 className="text-[15px] font-semibold uppercase tracking-[0.18em]">{title}</h2>
      <span className={`text-[14px] italic ${dark ? "text-paper/60" : "text-ink-soft"}`}>p. {folio}</span>
    </div>
  );
}

export function IssueA({ editions }: { editions: Edition[] }) {
  const [edIndex, setEdIndex] = useState(0);
  const ed = editions[edIndex];
  const issue = useMemo(() => compose(ed), [ed]);
  const all = useMemo(() => notesOf(ed), [ed]);
  const opener = useOpener();
  const { opened } = opener;
  const [where, setWhere] = useState({ section: "Portada", tab: "portada" });
  const [filter, setFilter] = useState<Category | "todo">("todo");

  // Everything that can open, as Updatr items for the shared article sheet.
  const index = useMemo(() => {
    const m = new Map<string, { item: Item; subject: Subject; note?: Note }>();
    for (const s of ed.subjects) {
      m.set(`s:${s.id}`, {
        subject: s,
        item: { id: `s:${s.id}`, franchise: s.category, kind: "game", status: "out", title: s.title, dek: s.synopsis, body: [], date: ed.date, source: "", image: s.image?.src },
      });
      for (const n of s.notes)
        m.set(`n:${n.id}`, {
          subject: s,
          note: n,
          item: { id: `n:${n.id}`, franchise: s.category, kind: "game", status: "out", title: n.headline, dek: n.body, body: [], date: n.published, source: n.source.name, url: n.source.url ?? undefined, image: n.image?.src },
        });
    }
    return m;
  }, [ed]);
  const order = useMemo(() => [...index.keys()], [index]);
  const franchise: Franchise = { id: "noticss", name: "Noticss", code: "N", studio: "", watching: "" };

  const openEntry = opened ? index.get(opened.id) : undefined;
  const capS = (s: Subject) => ({ kicker: `${categoryName[s.category]} — ${shortDate(ed.date)}`, title: s.title });
  const capN = (n: Note, s: Subject) => ({ kicker: `${categoryName[s.category]} — ${kindName[n.kind]}`, title: n.headline });
  const fly = (id: string, key: string) => ({
    flightKey: key,
    away: opener.isAway(key),
    onOpen: (from: OpenFrom) => opener.open(id, { key, ...from }, "a"),
    hint: HINT,
  });

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const line = window.innerHeight * 0.45;
      const els = document.querySelectorAll<HTMLElement>("[data-section]");
      let hit: HTMLElement | null = els[0] ?? null;
      for (const el of els) if (el.getBoundingClientRect().top <= line) hit = el;
      if (!hit) return;
      const next = { section: hit.dataset.section ?? "", tab: hit.dataset.tab ?? "portada" };
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

  const { scale: bounce, origin: bounceOrigin } = useEdgeSquish();

  const archive = filter === "todo" ? all : all.filter((x) => x.subject.category === filter);
  const counts = useMemo(() => {
    const c: Partial<Record<Category, number>> = {};
    for (const x of all) c[x.subject.category] = (c[x.subject.category] ?? 0) + 1;
    return c;
  }, [all]);
  const sources = useMemo(() => [...new Set(all.map((x) => x.note.source.name))].sort(), [all]);

  // Folios, in reading order.
  const P = { feature: "4", dossier: "8", pair: "12", rest: "14", cifras: "18", breves: "20", archivo: "24" };
  const FOLIO: Record<string, string> = {
    Portada: "1",
    Sumario: "2",
    Nota: "3",
    Tema: P.feature,
    Expediente: P.dossier,
    Par: P.pair,
    Secciones: P.rest,
    Cifras: P.cifras,
    Breves: P.breves,
    Archivo: P.archivo,
  };

  const contents = [
    issue.feature && { page: P.feature, label: categoryName[issue.feature.category], title: issue.feature.title, anchor: "feature" },
    issue.dossier && { page: P.dossier, label: "Expediente", title: issue.dossier.title, anchor: "dossier" },
    ...issue.pair.map((s, i) => ({ page: String(+P.pair + i), label: categoryName[s.category], title: s.title, anchor: "pair" })),
    ...issue.rest.map((s, i) => ({ page: String(+P.rest + i), label: categoryName[s.category], title: s.title, anchor: `tema-${s.id}` })),
    { page: P.cifras, label: "Cifras", title: `${spell(ed.indicators.length)} indicadores del día`, anchor: "cifras" },
    issue.briefs.length && { page: P.breves, label: "Breves", title: `${spell(Math.min(issue.briefs.length, 12))} notas cortas`, anchor: "breves" },
    { page: P.archivo, label: "Archivo", title: `Las ${all.length} notas de la edición`, anchor: "archivo" },
  ].filter(Boolean) as { page: string; label: string; title: string; anchor: string }[];

  const w = ed.weather;
  const cover = issue.cover;

  return (
    <LayoutGroup>
      <AbSwitch current="a" hidden={!!opened} />
      <motion.main
        key={editionKey(ed)}
        className="mx-auto min-h-dvh w-full max-w-[520px] overflow-x-clip pb-[calc(110px+var(--sab))]"
        style={{ scale: bounce, transformOrigin: bounceOrigin }}
      >
        {/* ================= PORTADA ================= */}
        <Section name="Portada" tab="portada" id="top">
          <div className="px-5 pt-[calc(14px+var(--sat))]">
            <div className="mono flex items-center gap-3 pr-[84px] text-ink-soft">
              <span>Nº {ed.number}</span>
              <span className="h-[1px] flex-1 bg-rule-soft" />
              <span>{weekday(ed.date)}</span>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springs.settling}
              className="mt-3 text-center text-[25vw] font-medium leading-[0.84] tracking-[-0.035em] min-[520px]:text-[128px]"
              style={{ fontVariationSettings: '"opsz" 72' }}
            >
              Noticss
            </motion.h1>
            <div className="mt-3 border-y-[1.5px] border-ink py-[6px]">
              <div className="flex items-baseline justify-between gap-3 border-y border-ink/40 py-[5px] text-[13px]">
                <span className="italic">{longDate(ed.date)}</span>
                <span className="mono shrink-0 text-ink-soft">{w ? `${w.tempC ?? "—"}° ${w.condition}` : "—"}</span>
              </div>
            </div>
          </div>
          {cover ? (
            <div className="mt-5 px-5">
              <HoldImage
                src={cover.image?.src}
                alt={cover.image?.alt ?? cover.title}
                caption={capS(cover)}
                fallbackTitle={cover.title}
                ratio="4 / 5"
                {...fly(`s:${cover.id}`, `a-cover-${cover.id}`)}
              />
              <button type="button" className="mt-4 block w-full text-left" onClick={() => opener.openFromKey(`s:${cover.id}`, `a-cover-${cover.id}`)}>
                <span className="mono text-accent">{categoryName[cover.category]}</span>
                <span className="mt-2 block text-[40px] font-medium leading-[0.98] tracking-[-0.02em]">{cover.title}</span>
                <span className="mt-3 block text-[17px] leading-[1.45] text-ink/80">{cover.synopsis}</span>
                {cover.image?.credit ? <span className="mt-2 block text-[12px] italic text-ink-faint">Foto: {cover.image.credit}</span> : null}
              </button>
            </div>
          ) : null}
          <div className="mt-8 overflow-hidden border-y border-ink py-[8px]">
            <div className="noticss-marquee lnum flex w-max whitespace-nowrap text-[14px]">
              {[0, 1].map((k) => (
                <span key={k} className="pr-10" aria-hidden={k === 1}>
                  {ed.indicators.map((i) => (
                    <span key={i.id} className="mr-10">
                      <span className="mono mr-2 text-ink-soft">{i.label}</span>
                      {i.value ?? "—"}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* Sumario */}
        <Section name="Sumario" tab="portada" id="sumario" className="px-5 pt-14">
          <Reveal>
            <Head title="Sumario" folio="2" />
          </Reveal>
          <ol className="mt-2">
            {contents.map((c, i) => (
              <Reveal key={`${c.anchor}-${i}`} delay={i * 0.04} y={14}>
                <motion.a
                  href={`#${c.anchor}`}
                  whileTap={{ scale: 0.985, x: 4 }}
                  transition={springs.snappy}
                  onClick={(e) => {
                    e.preventDefault();
                    haptic.select();
                    springScrollTo(c.anchor);
                  }}
                  className="grid grid-cols-[30px_1fr] items-baseline gap-3 border-b border-rule-soft py-3"
                >
                  <span className="lnum text-[22px] italic leading-none text-accent">{c.page}</span>
                  <span>
                    <span className="mono block text-ink-soft">{c.label}</span>
                    <span className="mt-1 block text-[18px] leading-[1.2]">{c.title}</span>
                  </span>
                </motion.a>
              </Reveal>
            ))}
          </ol>
        </Section>

        {/* Nota de la mañana: the day, and its rain */}
        <Section name="Nota" tab="portada" id="nota" className="px-5 pt-20">
          <Reveal>
            <p className="mono text-ink-soft">La mañana</p>
            <p className="mt-3 text-[27px] leading-[1.18] tracking-[-0.01em]">
              <span className="italic">{weatherLine(w)}.</span>{" "}
              {spell(ed.subjects.length)} temas y {all.length} notas en esta edición.{" "}
              <span className="text-ink-soft">
                {w?.rainProb != null ? `Lluvia ${w.rainProb}% probable; ` : ""}
                {w?.sunrise ? `el sol salió a las ${w.sunrise} y se pone a las ${w.sunset}.` : ""}
              </span>
            </p>
          </Reveal>
          {w ? (
            <Reveal className="mt-6">
              <RainStrip hours={w.rainHours} />
              <p className="mt-2 text-[12px] italic text-ink-faint">Probabilidad de lluvia por hora · Open-Meteo</p>
            </Reveal>
          ) : null}
        </Section>

        {/* ================= TEMAS ================= */}

        {/* Feature: the long read, asymmetric */}
        {issue.feature ? (
          <Section name="Tema" tab="temas" id="feature" className="pt-24">
            <div className="px-5">
              <Reveal>
                <Head title={categoryName[issue.feature.category]} folio={P.feature} />
                <h2 className="mt-5 text-[46px] font-medium leading-[0.98] tracking-[-0.02em]">{issue.feature.title}</h2>
              </Reveal>
            </div>
            <div className="mt-8 grid grid-cols-[1fr_66%] items-end gap-4 pl-5">
              <Reveal y={16}>
                <div className="space-y-2 pb-1 text-[13px] italic leading-snug text-ink-soft">
                  <p>{issue.feature.scope === "mundo" ? "Mundo" : "Costa Rica"}</p>
                  <p>{issue.feature.notes.length} notas</p>
                  {issue.feature.image?.credit ? <p>Foto: {issue.feature.image.credit}</p> : null}
                </div>
              </Reveal>
              <Rise>
                <HoldImage
                  src={issue.feature.image?.src}
                  alt={issue.feature.image?.alt ?? issue.feature.title}
                  caption={capS(issue.feature)}
                  fallbackTitle={issue.feature.title}
                  ratio="3 / 4"
                  {...fly(`s:${issue.feature.id}`, `a-feature-${issue.feature.id}`)}
                />
              </Rise>
            </div>
            <div className="px-5">
              <Reveal>
                <blockquote className="mt-10 border-l-[2px] border-accent pl-4 text-[25px] italic leading-[1.22]">{issue.feature.synopsis}</blockquote>
              </Reveal>
              <div className="mt-8">
                {issue.feature.notes.map((n, i) => (
                  <Reveal key={n.id} y={12}>
                    <p
                      className={`justify mb-4 text-[17px] leading-[1.55] text-ink/90 ${
                        i === 0
                          ? "first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-[64px] first-letter:leading-[0.76] first-letter:text-accent"
                          : "indent-6"
                      }`}
                    >
                      <span className="font-semibold">{n.headline}.</span> {n.body}
                    </p>
                  </Reveal>
                ))}
              </div>
              <button type="button" onClick={() => opener.openFromKey(`s:${issue.feature!.id}`, `a-feature-${issue.feature!.id}`)} className="mono mt-2 text-ink">
                Seguir leyendo <Arrow dir="downRight" />
              </button>
            </div>
          </Section>
        ) : null}

        {/* Dossier: inverted, on the spring strip */}
        {issue.dossier ? (
          <Section name="Expediente" tab="temas" id="dossier" className="mt-24 bg-ink pb-14 pt-10 text-paper">
            <div className="px-5">
              <Head title="Expediente" folio={P.dossier} dark />
              <Reveal>
                <h2 className="mt-5 text-[44px] font-medium leading-[0.98] tracking-[-0.02em]">{issue.dossier.title}</h2>
                <p className="mt-5 text-[18px] italic leading-[1.42] text-paper/75">{issue.dossier.synopsis}</p>
              </Reveal>
            </div>
            <div className="mt-10">
              <SnapStrip
                label={`${issue.dossier.title}, las notas`}
                tone="dark"
                fraction={0.8}
                cards={issue.dossier.notes.map((n, i) => (
                  <article key={n.id}>
                    <div className="relative">
                      {n.image ? (
                        <HoldImage
                          src={n.image.src}
                          alt={n.image.alt}
                          caption={capN(n, issue.dossier!)}
                          fallbackTitle={n.headline}
                          ratio="4 / 5"
                          {...fly(`n:${n.id}`, `a-dossier-${n.id}`)}
                        />
                      ) : (
                        // No photo: a typeset plate, as print does it.
                        <button
                          type="button"
                          onClick={() => opener.open(`n:${n.id}`)}
                          className="relative flex aspect-[4/5] w-full flex-col justify-between overflow-hidden border border-paper/25 p-5 text-left"
                        >
                          <span className="mono text-paper/50">{kindName[n.kind]}</span>
                          <span className="pointer-events-none absolute -right-3 -top-12 text-[220px] italic leading-none text-paper/[0.07]">
                            {n.kind === "quote" ? "“" : n.kind === "number" ? "№" : "§"}
                          </span>
                          <span className="lnum relative text-[46px] font-light leading-[0.95] tracking-[-0.02em]">
                            {n.headline.match(/[¢₡$]?\d[\d.,]*\s?(%|billones|millones)?/)?.[0] ?? n.source.name}
                          </span>
                        </button>
                      )}
                      <span className="lnum pointer-events-none absolute -bottom-7 right-2 text-[92px] italic leading-none text-paper mix-blend-difference">
                        {i + 1}
                      </span>
                    </div>
                    <p className="mono mt-8 text-paper/50">
                      {kindName[n.kind]} — {n.source.name}
                    </p>
                    <h3 className="mt-2 text-[23px] leading-[1.1]">{n.headline}</h3>
                    <p className="mt-2 text-[15px] leading-[1.45] text-paper/70">{n.body}</p>
                  </article>
                ))}
              />
            </div>
          </Section>
        ) : null}

        {/* Pair: staggered */}
        {issue.pair.length ? (
          <Section name="Par" tab="temas" id="pair" className="px-5 pt-24">
            <Reveal>
              <Head title="Al margen" folio={P.pair} />
            </Reveal>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {issue.pair.map((s, i) => (
                <Rise key={s.id} className={i === 1 ? "pt-20" : ""} from={i === 1 ? 0.8 : 0.88}>
                  <HoldImage
                    src={s.image?.src}
                    alt={s.image?.alt ?? s.title}
                    caption={capS(s)}
                    fallbackTitle={s.title}
                    ratio={i === 0 ? "3 / 4" : "1 / 1"}
                    {...fly(`s:${s.id}`, `a-pair-${s.id}`)}
                  />
                  <p className="mono mt-3 text-accent">{categoryName[s.category]}</p>
                  <button type="button" onClick={() => opener.openFromKey(`s:${s.id}`, `a-pair-${s.id}`)} className="mt-1 block text-left">
                    <span className="block text-[19px] leading-[1.12]">{s.title}</span>
                    <span className="mt-2 block text-[14px] leading-[1.42] text-ink-soft">{s.synopsis.split(". ")[0]}.</span>
                  </button>
                </Rise>
              ))}
            </div>
          </Section>
        ) : null}

        {/* The rest: each storyline as a set column */}
        {issue.rest.length ? (
          <Section name="Secciones" tab="temas" id="secciones" className="px-5 pt-24">
            <Reveal>
              <Head title="Secciones" folio={P.rest} />
            </Reveal>
            {issue.rest.map((s) => {
              const lead = s.notes.find((n) => n.image);
              return (
                <div key={s.id} id={`tema-${s.id}`} className="border-b border-rule-soft pb-10 pt-8">
                  <Reveal>
                    <p className="mono text-accent">{categoryName[s.category]}</p>
                    <button type="button" onClick={() => opener.open(`s:${s.id}`)} className="mt-2 block text-left">
                      <span className="block text-[30px] font-medium leading-[1.02] tracking-[-0.015em]">{s.title}</span>
                    </button>
                  </Reveal>
                  <div className={`mt-5 grid gap-4 ${lead ? "grid-cols-[1fr_40%]" : ""}`}>
                    <Reveal>
                      <p className="justify text-[16px] leading-[1.5] text-ink/85">{s.synopsis}</p>
                    </Reveal>
                    {lead ? (
                      <Rise from={0.9}>
                        <HoldImage
                          src={lead.image?.src}
                          alt={lead.image?.alt ?? lead.headline}
                          caption={capN(lead, s)}
                          fallbackTitle={lead.headline}
                          ratio="4 / 5"
                          {...fly(`n:${lead.id}`, `a-rest-${lead.id}`)}
                        />
                      </Rise>
                    ) : null}
                  </div>
                  <ul className="mt-4">
                    {s.notes.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => opener.openFromKey(`n:${n.id}`, n.image ? `a-rest-${n.id}` : undefined)}
                          className="grid w-full grid-cols-[14px_1fr] gap-2 py-[6px] text-left text-[15px] leading-snug"
                        >
                          <span className="mt-[9px] block h-[5px] w-[5px] bg-accent" />
                          <span className={n.corrected ? "line-through decoration-accent/70" : ""}>{n.headline}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </Section>
        ) : null}

        {/* ================= CIFRAS ================= */}
        <Section name="Cifras" tab="cifras" id="cifras" className="px-5 pt-24">
          <Reveal>
            <Head title="Cifras" folio={P.cifras} />
          </Reveal>
          <div className="mt-2">
            {ed.indicators.map((ind, i) => (
              <Grow key={ind.id} lag={i % 2} y={12} className="grid grid-cols-[1fr_auto] items-end gap-4 border-b border-rule-soft py-5">
                <div>
                  <p className="mono text-ink-soft">{ind.label}</p>
                  <p className="lnum mt-1 text-[44px] font-light leading-none tracking-[-0.02em]">{ind.value ?? "—"}</p>
                  <p className="mt-2 text-[13px] italic leading-snug text-ink-soft">{ind.note}</p>
                </div>
                <div className="pb-1 text-right">
                  <Sparkline series={ind.series} className="ml-auto text-ink" />
                  <p className="lnum mt-1 text-[13px]">
                    <Delta d={ind.delta} />
                  </p>
                </div>
              </Grow>
            ))}
          </div>
          <p className="mt-3 text-[12px] italic text-ink-faint">Un guion es un dato que no se pudo verificar: nunca se inventa.</p>
        </Section>

        {/* ================= BREVES ================= */}
        {issue.briefs.length ? (
          <Section name="Breves" tab="breves" id="breves" className="mt-24 bg-paper px-5 pb-12 pt-8">
            <Head title="Breves" folio={P.breves} />
            <div className="mt-6 columns-2 gap-5 [column-rule:1px_solid_var(--rule-soft)]">
              {issue.briefs.slice(0, 12).map(({ note: n, subject: s }, i) => (
                <Grow key={n.id} lag={i % 2} y={12} className="mb-6 break-inside-avoid">
                  <motion.button type="button" whileTap={{ scale: 0.97 }} transition={springs.snappy} onClick={() => opener.open(`n:${n.id}`)} className="block w-full text-left">
                    <span className="mono block text-accent">{categoryName[s.category]}</span>
                    <span className="mt-1 block text-[18px] leading-[1.12]">{n.headline}</span>
                    <span className="mt-2 block text-[14px] leading-[1.45] text-ink/75">{n.body}</span>
                    <span className="mt-2 block text-[12px] italic text-ink-faint">{n.source.name}</span>
                  </motion.button>
                </Grow>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ================= ARCHIVO ================= */}
        <Section name="Archivo" tab="archivo" id="archivo" className="pt-24">
          <div className="px-5">
            <Head title="Archivo" folio={P.archivo} />
          </div>
          <nav className="no-scrollbar mt-5 flex gap-5 overflow-x-auto px-5" aria-label="Filtrar">
            {(["todo", ...categoryOrder.filter((c) => counts[c])] as (Category | "todo")[]).map((k) => {
              const n = k === "todo" ? all.length : counts[k] ?? 0;
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
                  <span className={`text-[16px] ${active ? "text-ink" : "text-ink-faint"}`}>
                    {k === "todo" ? "Todo" : categoryName[k]} <sup className="lnum text-[10px] italic">{n}</sup>
                  </span>
                  {active ? <motion.span layoutId="a-filter" transition={springs.snappy} className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-accent" /> : null}
                </button>
              );
            })}
          </nav>
          <ol className="mt-3 border-t border-ink">
            <AnimatePresence initial={false} mode="popLayout">
              {archive.map(({ note: n, subject: s }, i) => (
                <motion.li
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={springs.settling}
                  className="border-b border-rule-soft"
                >
                  <Grow from={0.96} y={12}>
                    <div className="grid grid-cols-[30px_1fr_76px] items-start gap-3 px-5 py-4">
                      <span className="lnum pt-[3px] text-[14px] italic text-ink-faint">{pad(i + 1)}</span>
                      <button
                        type="button"
                        onClick={() => opener.openFromKey(`n:${n.id}`, n.image ? `a-row-${n.id}` : undefined)}
                        className="text-left"
                      >
                        <span className="mono block text-ink-soft">
                          {categoryName[s.category]} · {shortDate(n.published)}
                        </span>
                        <span className={`mt-1 block text-[17px] leading-[1.18] ${n.corrected ? "line-through decoration-accent/70" : ""}`}>{n.headline}</span>
                      </button>
                      {n.image ? (
                        <HoldImage
                          src={n.image.src}
                          alt={n.image.alt}
                          caption={capN(n, s)}
                          fallbackTitle={n.headline}
                          ratio="1 / 1"
                          {...fly(`n:${n.id}`, `a-row-${n.id}`)}
                        />
                      ) : (
                        <span />
                      )}
                    </div>
                  </Grow>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </Section>

        {/* Colofón: editions and sources */}
        <footer className="px-5 pt-20">
          <Head title="Ediciones" folio="—" />
          <ul className="mt-2">
            {editions.map((e, i) => (
              <li key={editionKey(e)}>
                <button
                  type="button"
                  onClick={() => {
                    if (i === edIndex) return;
                    haptic.complete();
                    setEdIndex(i);
                    setFilter("todo");
                    window.scrollTo(0, 0);
                  }}
                  className="grid w-full grid-cols-[48px_1fr_auto] items-baseline gap-3 border-b border-rule-soft py-3 text-left"
                >
                  <span className="lnum text-[22px] italic text-accent">{e.number}</span>
                  <span className="text-[17px]">
                    {weekday(e.date)} {dayMonth(e.date)}
                  </span>
                  <span className="mono text-ink-soft">{i === edIndex ? "Abierta" : "Leer"}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-12 border-t border-ink pt-3">
            <p className="mono text-ink-soft">Fuentes de esta edición</p>
            <p className="mt-2 text-[15px] italic leading-[1.5] text-ink-soft">{sources.join(" · ")}</p>
          </div>
          <p className="mt-16 text-center text-[22vw] italic leading-[0.8] text-ink/10 min-[520px]:text-[112px]">Nº {ed.number}</p>
          <p className="mono mt-8 text-center text-ink-faint">Prototipo · las fotos son de sus medios</p>
        </footer>
      </motion.main>

      <BottomBar
        tabs={TABS}
        active={where.tab}
        section={where.section}
        folio={FOLIO[where.section] ?? "1"}
        hidden={!!opened}
        onGo={(t) => springScrollTo(t.anchor)}
      />

      {openEntry && opened ? (
        <Detail
          key={opened.id}
          item={openEntry.item}
          franchise={franchise}
          variant="a"
          origin={opener.origin}
          onRelease={opener.release}
          onClosed={opener.closed}
          position={`${pad(order.indexOf(opened.id) + 1)} / ${pad(order.length)}`}
          skin={{
            strings: STRINGS,
            source: openEntry.note?.source.url ? { url: openEntry.note.source.url } : null,
            ratio: openEntry.note ? "4 / 3" : "4 / 5",
            body: (hero, C) => (
              <div className="px-5">
                {openEntry.item.image ? <div className="overflow-hidden">{hero}</div> : null}
                {openEntry.note ? (
                  <NoteBody note={openEntry.note} subject={openEntry.subject} edition={ed} C={C} />
                ) : (
                  <SubjectBody
                    subject={openEntry.subject}
                    edition={ed}
                    C={C}
                    onNote={undefined}
                  />
                )}
              </div>
            ),
          }}
        />
      ) : null}
    </LayoutGroup>
  );
}
