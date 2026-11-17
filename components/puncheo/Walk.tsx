"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import type { Key } from "@/data/puncheo/rooms";
import { CheckIcon } from "./Icons";
import { RailRow, type RowSkin } from "./RailRow";
import type { PunchSheet } from "./usePunchSheet";
import { useSectionPull, type Scrub } from "./useSectionPull";

export type StripTone = "plain" | "leia" | "yard";
export type StripItem = { id: string; label: string; count: React.ReactNode };

/**
 * A row of choices in three dresses. plain: pill chips (the active one ink, or
 * blue for filters). leia: Leia's category tabs, full width, the active cell a
 * solid blue block. yard: AD Visual's folder chips.
 */
export function Strip({
  items,
  active,
  onPick,
  tone,
  accent = "var(--ink)",
  id,
}: {
  items: StripItem[];
  active: number;
  onPick: (i: number) => void;
  tone: StripTone;
  accent?: string;
  id: string;
}) {
  const pick = (i: number) => {
    if (i === active) return;
    haptic.select();
    onPick(i);
  };
  if (tone === "leia") {
    // Leia's category bar: a lit strip of cells split by etched lines; the active one pressed in, blue.
    return (
      <div className="leia-tabs -mx-4 mt-5 flex">
        {items.map((x, i) => {
          const on = i === active;
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={on}
              className={`relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center ${i < items.length - 1 ? "leia-tab-sep" : ""}`}
            >
              {on ? <motion.span layoutId={`strip-${id}`} transition={springs.snappy} className="leia-tab-on pointer-events-none absolute inset-0" /> : null}
              <span className={`relative max-w-full truncate px-1 text-[15px] ${on ? "font-semibold text-ground" : "font-medium text-ink-2"}`} style={on ? undefined : { textShadow: "0 1px 0 #fff" }}>
                {x.label}
              </span>
              <span className={`relative mt-0.5 text-[11px] tabular-nums ${on ? "text-brand-2" : "text-ink-faint"}`}>{x.count}</span>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="no-scrollbar -mx-4 mt-5 flex gap-1.5 overflow-x-auto px-4 py-1">
      {items.map((x, i) => {
        const on = i === active;
        if (tone === "yard") {
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={on}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-ground pl-2.5 pr-2 transition-shadow ${on ? "shadow-[var(--shadow-mid)]" : "shadow-[var(--shadow-soft)]"}`}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden>
                <path d="M3 6.5h6l2 2h10v10H3z" fill={on ? "var(--brand)" : "var(--hair-2)"} />
              </svg>
              <span className={`text-[14px] ${on ? "font-semibold text-ink" : "font-medium text-ink-3"}`}>{x.label}</span>
              <span className="rounded-[4px] border border-hair-2 px-1 text-[10px] font-medium tabular-nums text-ink-faint">{x.count}</span>
            </button>
          );
        }
        return (
          <button key={x.id} type="button" onClick={() => pick(i)} aria-pressed={on} className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5">
            {on ? <motion.span layoutId={`strip-${id}`} transition={springs.snappy} className="pointer-events-none absolute inset-0 rounded-full" style={{ background: accent }} /> : null}
            {!on ? <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_var(--hair-2)]" /> : null}
            <span className={`relative text-[14px] font-semibold ${on ? "text-ground" : "text-ink-2"}`}>{x.label}</span>
            <span className={`relative text-[12px] font-medium tabular-nums ${on ? "text-ground/70" : "text-ink-faint"}`}>{x.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The rooms of the punch, with each room's progress. */
export function RoomStrip({ s, tone = "plain" }: { s: PunchSheet; tone?: StripTone }) {
  return (
    <Strip
      id="rooms"
      tone={tone}
      active={s.section}
      onPick={(i) => s.goSection(i)}
      items={s.sections.map((x, i) => {
        const t = s.sectionTallies[i];
        return {
          id: x.id,
          label: x.name,
          count: t.done === t.total ? <CheckIcon size={12} strokeWidth={2.6} className="inline text-ok" /> : `${t.done}/${t.total}`,
        };
      })}
    />
  );
}

/** A key fact from the sheet, set apart in AD Visual's hairline table (on Leia's slate, a paper panel). */
function KeyBlock({ k, rail, skin }: { k: Key; rail: boolean; skin: RowSkin }) {
  return (
    <div className="relative flex">
      <div className="relative -ml-3 w-4 shrink-0" aria-hidden>
        {rail ? <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-hair-2" /> : null}
      </div>
      <div className="min-w-0 flex-1 pb-4 pl-1 pt-1.5">
        <span className={`mono block pb-1.5 ${skin.dark ? "leia-engrave text-hair-2" : "text-ink-faint"}`}>Clave · {k.title}</span>
        <div className={`grid grid-cols-[auto_minmax(0,1fr)] ${skin.leia ? "leia-paper rounded-[4px] px-3" : "border-y border-ink"}`}>
          {k.rows.map(([key, val], i) => (
            <div key={key} className={`col-span-2 grid grid-cols-subgrid ${i ? "border-t border-hair" : ""}`}>
              <span className="mono py-2.5 pr-4 text-ink-faint">{key}</span>
              <span className="py-2 text-[15px] leading-5 text-ink">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupLabel({ label, rail, dark }: { label: string; rail: boolean; dark?: boolean }) {
  return (
    <div className="relative flex">
      <div className="relative -ml-3 w-4 shrink-0" aria-hidden>
        {rail ? <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-hair-2" /> : null}
        <span className="absolute left-1/2 top-[13px] h-[2px] w-3 bg-hair-2" />
      </div>
      <span className={`mono pb-2.5 pl-3 pt-2 ${dark ? "leia-engrave text-hair" : "text-ink-soft"}`} style={{ fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

/** The foot of a section: a quiet cue that lifts with the pull and lights when it arms. No instructions. */
function EndMarker({ s, armed, pulling, dark }: { s: PunchSheet; armed: boolean; pulling: boolean; dark?: boolean }) {
  const next = s.sections[s.section + 1];
  return (
    <div className="mt-6 flex flex-col items-center pb-2 text-center" aria-hidden={!next}>
      <motion.span
        className="grid size-9 place-items-center rounded-full"
        animate={{ y: pulling ? -4 : 0, scale: armed ? 1.12 : 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        style={{ background: armed ? "var(--brand)" : dark ? "rgba(255,255,255,0.14)" : "var(--card-2)", color: armed ? "var(--ground)" : dark ? "var(--hair)" : "var(--ink-soft)" }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter">
          <path d="M12 19V6M6 11.5l6-6 6 6" />
        </svg>
      </motion.span>
      {next ? (
        <span className={`mt-2 text-[13px] font-medium ${dark ? "leia-engrave text-hair" : "text-ink-soft"}`}>
          {next.p !== s.sec.p ? `${next.phase} · ` : ""}
          {next.name}
        </span>
      ) : null}
    </div>
  );
}

/** The sections, brought up over a resting finger: slide sideways to pick, release to go. */
function Scrubber({ s, scrub }: { s: PunchSheet; scrub: Scrub }) {
  if (!scrub) return null;
  const n = s.sections.length;
  const w = scrub.w;
  // Laid out so the section the finger rests on sits right above it.
  const step = scrub.step;
  const x0 = Math.max(16, Math.min(w - 16 - n * step, scrub.x - (scrub.start + 0.5) * step));
  const t = s.sections[scrub.target];
  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden>
      <motion.div className="absolute inset-0 bg-ink/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} />
      <motion.div
        className="absolute"
        style={{ left: x0, top: scrub.y - 118 }}
        initial={{ opacity: 0, y: 12, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
      >
        <div className="mb-3 flex justify-center" style={{ width: n * step }}>
          <span className="rounded-[10px] bg-ink px-3 py-1.5 text-[15px] font-semibold text-ground shadow-[var(--shadow-mid)]">
            <span className="mr-1.5 text-[12px] font-medium text-ink-faint">{t.phase}</span>
            {t.name}
            <span className="ml-1.5 text-[12px] font-medium text-ink-faint">
              {s.sectionTallies[scrub.target].done}/{s.sectionTallies[scrub.target].total}
            </span>
          </span>
        </div>
        <div className="flex items-center rounded-full bg-ground py-3 shadow-[var(--shadow-mid)]" style={{ width: n * step }}>
          {s.sections.map((x, i) => (
            <span key={`${x.p}-${x.id}`} className="relative grid place-items-center" style={{ width: step }}>
              {i > 0 && s.sections[i - 1].p !== x.p ? <span className="absolute -left-px top-1/2 h-4 w-px -translate-y-1/2 bg-hair-2" /> : null}
              <motion.span
                className="block rounded-full"
                animate={{
                  width: i === scrub.target ? 26 : 8,
                  height: 8,
                  background: i === scrub.target ? "var(--brand)" : i === s.section ? "var(--ink-3)" : "var(--hair-2)",
                }}
                transition={{ type: "spring", stiffness: 520, damping: 32 }}
              />
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * The sections at the right edge, after Histok's pills: a dot per section, the
 * current one a pill that fills as you scroll through it.
 */
function SectionDots({ s, dark }: { s: PunchSheet; dark?: boolean }) {
  const p = useMotionValue(0);
  const fill = useTransform(p, (v) => `${Math.round(v * 100)}%`);
  useEffect(() => {
    const on = () => {
      const el = document.getElementById("puncheo-list");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight * 0.5);
      p.set(Math.max(0, Math.min(1, (window.innerHeight * 0.5 - r.top) / span)));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [p, s.section]);
  return (
    <div className="pointer-events-none fixed right-[5px] top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-[6px]" aria-hidden>
      {s.sections.map((x, i) => {
        const on = i === s.section;
        const done = s.sectionTallies[i].done === s.sectionTallies[i].total;
        return (
          <motion.span
            key={`${x.p}-${x.id}`}
            layout
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="relative block w-[6px] overflow-hidden rounded-full"
            style={{
              height: on ? 30 : 6,
              background: dark ? "rgba(255,255,255,0.28)" : on ? "var(--hair)" : done ? "var(--ok)" : "var(--hair-2)",
            }}
          >
            {on ? <motion.span className="absolute inset-x-0 top-0 block rounded-full" style={{ height: fill, background: dark ? "var(--ground)" : "var(--ink-3)" }} /> : null}
          </motion.span>
        );
      })}
    </div>
  );
}

/**
 * The current room of the punch: its title, its checks on the rail with the
 * group labels and key facts between them, and the pull into the next room.
 */
export function Walk({ s, skin }: { s: PunchSheet; skin: RowSkin }) {
  const { sec } = s;
  // The screen moves as one: the pull lifts it against friction (the rubber),
  // and going to another section carries it on, up past the top (or down, going
  // back), and brings the new section in from the other edge. Nothing inside
  // animates on its own.
  const shift = useMotionValue(0);
  const travel = (to: number) => {
    const down = to < s.section;
    const h = window.innerHeight;
    animate(shift, down ? h * 0.55 : -h * 0.55, { duration: 0.2, ease: [0.4, 0, 1, 1] }).then(() => {
      pull.raw.set(0);
      s.goSection(to, undefined, true);
      shift.set(down ? -h * 0.45 : h * 0.45);
      animate(shift, 0, { type: "spring", stiffness: 260, damping: 30 });
    });
  };
  const pull = useSectionPull({ count: s.sections.length, current: s.section, onCommit: travel });
  const y = useTransform([pull.lift, shift], ([l, sh]: number[]) => sh - l);
  const checkIdx = sec.items.map((it, i) => (it.kind === "check" ? i : -1)).filter((i) => i >= 0);
  const firstCheck = checkIdx[0];
  const lastCheck = checkIdx[checkIdx.length - 1];
  const st = s.sectionTallies[s.section];

  return (
    <>
      <motion.div style={{ y }}>
        <section key={`${sec.p}-${sec.id}`} id="puncheo-section" className="mt-7">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className={`mono ${skin.dark ? "text-hair-2" : "text-ink-faint"}`}>
                {sec.phase} · {s.section + 1} de {s.sections.length}
              </span>
              <h2 className={`mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em] ${skin.dark ? "leia-engrave text-ground" : "text-ink"}`}>{sec.name}</h2>
              <p className={`mt-1.5 text-[13px] ${skin.dark ? "text-hair-2" : "text-ink-soft"}`}>{sec.note}</p>
            </div>
            <span className="shrink-0 leading-none tabular-nums">
              <span className={`text-[24px] font-medium tracking-[-0.02em] ${skin.dark ? "leia-engrave text-ground" : "text-ink"}`}>{String(st.done).padStart(2, "0")}</span>
              <span className={`text-[14px] ${skin.dark ? "text-hair-2" : "text-ink-faint"}`}>/{st.total}</span>
            </span>
          </div>

          <ul id="puncheo-list" className="mt-5">
            {sec.items.map((it, i) => {
              const rail = i > firstCheck && i < lastCheck;
              if (it.kind === "group") return <li key={`g-${it.label}`}><GroupLabel label={it.label} rail={rail} dark={skin.dark} /></li>;
              if (it.kind === "key") return <li key={`k-${it.key.title}`}><KeyBlock k={it.key} rail={rail} skin={skin} /></li>;
              const c = s.byId.get(it.id)!;
              return (
                <li key={c.id} data-check={c.id}>
                  <RailRow s={s} check={c} first={i === firstCheck} last={i === lastCheck} skin={skin} />
                </li>
              );
            })}
          </ul>
        </section>
        <EndMarker s={s} armed={pull.armed} pulling={pull.pulling} dark={skin.dark} />
      </motion.div>
      <SectionDots s={s} dark={skin.dark} />
      <Scrubber s={s} scrub={pull.scrub} />
    </>
  );
}
