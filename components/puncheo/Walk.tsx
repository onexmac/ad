"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import type { Key } from "@/data/puncheo/rooms";
import { CheckIcon } from "./Icons";
import { COLOR, RailRow, type RowSkin } from "./RailRow";
import type { PunchSheet } from "./usePunchSheet";
import { useSectionPull } from "./useSectionPull";

export type StripTone = "plain" | "leia" | "yard";
export type StripItem = { id: string; label: string; count: React.ReactNode };

/**
 * A row of choices in three dresses. plain: pill chips (the active one ink, or
 * blue for filters). leia: Leia's category tabs, full width, the active cell a
 * solid blue block. yard: AD Visual's segmented choice.
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
  if (tone === "yard") {
    // AD Visual's segmented choice (Actividades / Miembros): the active one a solid blue tile, the rest plain bold text.
    return (
      <div className="mt-5 flex gap-1">
        {items.map((x, i) => {
          const on = i === active;
          return (
            <button key={x.id} type="button" onClick={() => pick(i)} aria-pressed={on} className="relative flex h-11 flex-auto items-center justify-center gap-1 rounded-[10px] px-2.5">
              {on ? <motion.span layoutId={`strip-${id}`} transition={springs.snappy} className="pointer-events-none absolute inset-0 rounded-[10px] bg-brand" /> : null}
              <span className={`relative truncate text-[15px] font-semibold ${on ? "text-ground" : "text-ink"}`}>{x.label}</span>
              <span className={`relative text-[11px] tabular-nums ${on ? "text-brand-2" : "text-ink-faint"}`}>{x.count}</span>
            </button>
          );
        })}
      </div>
    );
  }
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
function KeyBlock({ k, skin }: { k: Key; skin: RowSkin }) {
  return (
    <div className="pb-4 pt-1.5">
      <div className="min-w-0">
        <span className={`mono block pb-1.5 ${skin.dark ? "leia-engrave text-hair-2" : "text-ink-faint"}`}>Clave · {k.title}</span>
        <div
          className={`grid grid-cols-[auto_minmax(0,1fr)] ${skin.leia ? "leia-paper rounded-[4px] px-3" : skin.yard ? "rounded-[12px] bg-card px-3 py-1" : "border-y border-ink"}`}
        >
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

function GroupLabel({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <span className={`mono block pb-2.5 pl-1 pt-2 ${dark ? "leia-engrave text-hair" : "text-ink-soft"}`} style={{ fontWeight: 600 }}>
      {label}
    </span>
  );
}

/** Where the room's checks for one punch begin: the punch, and when it happens. */
function PhaseHead({ name, moment, first, dark }: { name: string; moment: string; first: boolean; dark?: boolean }) {
  return (
    <div className={first ? "" : "pt-4"}>
      <div className="min-w-0 pb-3 pl-1">
        <span className={`block text-[17px] font-semibold tracking-[-0.01em] ${dark ? "leia-engrave text-ground" : "text-ink"}`}>{name}</span>
        <span className={`mt-0.5 block text-[13px] leading-[18px] ${dark ? "text-hair-2" : "text-ink-soft"}`}>{moment}</span>
      </div>
    </div>
  );
}

/** The foot of a section: a quiet cue that lifts with the pull and lights when it arms. No instructions. */
function EndMarker({ s, armed, pulling, dark }: { s: PunchSheet; armed: boolean; pulling: boolean; dark?: boolean }) {
  const next = s.sections[s.section + 1];
  if (!next) return <div className="h-6" />;
  return (
    <div className="mt-6 flex flex-col items-center pb-2 text-center">
      <motion.span
        className="grid size-9 place-items-center rounded-full"
        animate={{ y: pulling ? -4 : 0, scale: armed ? 1.12 : 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        style={{ background: armed ? "var(--brand)" : dark ? "rgba(255,255,255,0.14)" : "var(--card-2)", color: armed ? "var(--ground)" : dark ? "var(--hair)" : "var(--ink-soft)" }}
        aria-hidden
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter">
          <path d="M12 19V6M6 11.5l6-6 6 6" />
        </svg>
      </motion.span>
      <span className={`mt-2 text-[13px] font-medium ${dark ? "leia-engrave text-hair" : "text-ink-soft"}`}>{next.name}</span>
    </div>
  );
}

/**
 * The current room: its title, then its pre-armado and pre-chorrea checks on the
 * rail with group labels and key facts between them, and the pull into the next room.
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
  useEffect(() => {
    s.registerTravel(travel);
  });
  const y = useTransform([pull.lift, shift], ([l, sh]: number[]) => sh - l);
  const st = s.sectionTallies[s.section];
  const rows = sec.items.map((it, i) => {
    if (it.kind === "check") {
      const c = s.byId.get(it.id)!;
      return (
        <li key={c.id} data-check={c.id}>
          <RailRow s={s} check={c} skin={skin} />
        </li>
      );
    }
    if (it.kind === "phase") return <li key={`p-${it.n}`}><PhaseHead name={it.name} moment={it.moment} first={i === 0} dark={skin.dark} /></li>;
    if (it.kind === "group") return <li key={`g-${i}-${it.label}`}><GroupLabel label={it.label} dark={skin.dark} /></li>;
    return <li key={`k-${i}-${it.key.title}`}><KeyBlock k={it.key} skin={skin} /></li>;
  });

  return (
    <>
    <motion.div style={{ y }}>
      <section key={sec.id} id="puncheo-section" className="mt-7">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className={`mono ${skin.dark ? "text-hair-2" : "text-ink-faint"}`}>
              Sección {s.section + 1} de {s.sections.length}
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
          {rows}
        </ul>
      </section>
      <EndMarker s={s} armed={pull.armed} pulling={pull.pulling} dark={skin.dark} />
    </motion.div>
    {/* Outside the moving layer: a transformed ancestor would trap this fixed rail. */}
    <ScrollRail s={s} dark={skin.dark} />
    </>
  );
}

/**
 * The room's checks at the right edge, one dot each in its mark's colour, and a
 * long pill over the checks on screen that moves as you scroll (after Circa's
 * scroll indicator). Above the pill, the checks you have passed are joined by
 * the line; below it, the pending ones wait as loose dots that grow out of the
 * pill's foot into place.
 */
function ScrollRail({ s, dark }: { s: PunchSheet; dark?: boolean }) {
  const ids = s.sec.ids;
  const n = ids.length;
  const STEP = Math.max(7, Math.min(12, Math.floor(260 / Math.max(1, n))));
  const top = useMotionValue(0);
  const bot = useMotionValue(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const centers = ids.map((id) => {
        const el = document.querySelector(`[data-check="${CSS.escape(id)}"]`);
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      // Where a screen line falls among the checks, as a fractional index.
      const at = (y: number) => {
        if (!centers.length) return 0;
        if (y <= centers[0]) return 0;
        for (let i = 1; i < centers.length; i++) if (y <= centers[i]) return i - 1 + (y - centers[i - 1]) / Math.max(1, centers[i] - centers[i - 1]);
        return centers.length - 1;
      };
      top.set(at(80));
      bot.set(Math.max(at(80) + 0.6, at(window.innerHeight - 90)));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [ids, top, bot]);
  const pillY = useTransform(top, (v) => v * STEP - 4);
  const pillH = useTransform([top, bot], ([a, b]: number[]) => Math.max(18, (b - a) * STEP + 8));
  return (
    <div className="pointer-events-none fixed right-[5px] top-1/2 z-20 w-[8px] -translate-y-1/2" style={{ height: (n - 1) * STEP + 8 }} aria-hidden>
      {ids.map((id, i) => (
        <RailDot key={id} i={i} step={STEP} top={top} bot={bot} color={s.marks[id] ? COLOR[s.marks[id]] : null} next={i < n - 1 ? (s.marks[ids[i + 1]] ? COLOR[s.marks[ids[i + 1]]] : null) : undefined} dark={dark} />
      ))}
      <motion.span className="absolute left-0 w-[8px] rounded-full" style={{ y: pillY, height: pillH, background: dark ? "var(--ground)" : "var(--ink-3)" }} />
    </div>
  );
}

function RailDot({
  i,
  step,
  top,
  bot,
  color,
  next,
  dark,
}: {
  i: number;
  step: number;
  top: MotionValue<number>;
  bot: MotionValue<number>;
  color: string | null;
  next: string | null | undefined;
  dark?: boolean;
}) {
  const idle = dark ? "rgba(255,255,255,0.4)" : "var(--hair-2)";
  // Below the pill: small at its foot, full size a couple of steps on.
  const scale = useTransform(bot, (b) => (i <= b ? 1 : Math.max(0.35, Math.min(1, (i - b) / 2))));
  // Above the pill: joined to the next dot by the line.
  const link = useTransform(top, (t) => (next !== undefined && i + 1 <= t ? 1 : 0));
  return (
    <>
      {next !== undefined ? (
        <motion.span
          className="absolute left-[3px] w-[2px] origin-top"
          style={{ top: i * step + 4, height: step, scaleY: link, background: color ?? idle }}
        />
      ) : null}
      <motion.span className="absolute left-[1px] size-[6px] rounded-full" style={{ top: i * step + 1, scale, background: color ?? idle }} />
    </>
  );
}
