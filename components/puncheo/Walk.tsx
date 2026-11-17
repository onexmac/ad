"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
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
              <span className={`relative max-w-full truncate px-1 text-[16px] font-normal ${on ? "text-ground" : "text-ink"}`} style={on ? undefined : { textShadow: "0 1px 0 #fff" }}>
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
  if (skin.leia)
    return (
      <div className="leia-row bg-[#f4f4f5] px-3 py-2">
        <span className="block pb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#8a8d93]">Clave · {k.title}</span>
        <div className="grid grid-cols-[auto_minmax(0,1fr)]">
          {k.rows.map(([key, val], i) => (
            <div key={key} className={`col-span-2 grid grid-cols-subgrid ${i ? "shadow-[inset_0_1px_0_#dcdde0]" : ""}`}>
              <span className="py-1.5 pr-4 text-[13px] text-[#8a8d93]">{key}</span>
              <span className="py-1.5 text-[14px] font-bold leading-5 text-ink">{val}</span>
            </div>
          ))}
        </div>
      </div>
    );
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

function GroupLabel({ label, dark, leia }: { label: string; dark?: boolean; leia?: boolean }) {
  if (leia)
    return (
      <div className="leia-strip px-3 py-1.5">
        <span className="leia-emboss text-[13px] font-bold text-[#5f6268]">{label}</span>
      </div>
    );
  return (
    <span className={`mono block pb-2.5 pl-1 pt-2 ${dark ? "leia-engrave text-hair" : "text-ink-soft"}`} style={{ fontWeight: 600 }}>
      {label}
    </span>
  );
}

/** Where the room's checks for one punch begin: the punch, and when it happens. */
function PhaseHead({ name, moment, first, dark, leia }: { name: string; moment: string; first: boolean; dark?: boolean; leia?: boolean }) {
  // Leia: the "Taxes" strip, a taller lit bar with the name and its moment.
  if (leia)
    return (
      <div className="leia-strip px-3 py-2.5">
        <span className="leia-emboss block text-[17px] text-ink">{name}</span>
        <span className="leia-emboss mt-0.5 block text-[12.5px] leading-[16px] text-[#6c6f75]">{moment}</span>
      </div>
    );
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
  const pull = useSectionPull({
    count: s.sections.length,
    current: s.section,
    onCommit: travel,
    // Scroll, then rest the finger: the sections pop up around it.
    hold: { open: (x, y) => s.fanOpen(x, y, false), move: s.fanMove, release: s.fanRelease, cancel: s.fanClose },
  });
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
    if (it.kind === "phase") return <li key={`p-${it.n}`}><PhaseHead name={it.name} moment={it.moment} first={i === 0} dark={skin.dark} leia={skin.leia} /></li>;
    if (it.kind === "group") return <li key={`g-${i}-${it.label}`}><GroupLabel label={it.label} dark={skin.dark} leia={skin.leia} /></li>;
    return <li key={`k-${i}-${it.key.title}`}><KeyBlock k={it.key} skin={skin} /></li>;
  });

  return (
    <>
    <motion.div style={{ y }} className="pr-[26px]">
      {skin.leia ? (
        // Leia: the room is a receipt panel; its blue band is the section's header.
        <section key={sec.id} id="puncheo-section" className="leia-panel mt-6 overflow-hidden rounded-[6px]">
          <div className="leia-band flex h-[54px] items-center gap-3 px-3 text-ground">
            <span className="leia-band-sep flex h-full items-center pr-3 text-[13px] text-brand-2">
              {s.section + 1}/{s.sections.length}
            </span>
            <span className="min-w-0 flex-1">
              <span data-title className="block truncate text-[19px] leading-tight">{sec.name}</span>
              <span className="block truncate text-[12px] text-brand-2">{sec.note}</span>
            </span>
            <span className="text-[18px] tabular-nums">
              {String(st.done).padStart(2, "0")}
              <span className="text-brand-2">/{st.total}</span>
            </span>
          </div>
          <ul id="puncheo-list">{rows}</ul>
        </section>
      ) : (
      <section key={sec.id} id="puncheo-section" className="mt-7">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className={`mono ${skin.dark ? "text-hair-2" : "text-ink-faint"}`}>
                Sección {s.section + 1} de {s.sections.length}
              </span>
              <h2 data-title className={`mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em] ${skin.dark ? "leia-engrave text-ground" : "text-ink"}`}>{sec.name}</h2>
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
      )}
      <EndMarker s={s} armed={pull.armed} pulling={pull.pulling} dark={skin.dark} />
    </motion.div>
    {/* Outside the moving layer: a transformed ancestor would trap this fixed rail. */}
    <SectionRail s={s} dark={skin.dark} />
    </>
  );
}

/**
 * The rail at the right edge (Marcos's sketch): a grey dot per room, and the
 * current room stretched into a tall pill. Inside the pill, a dot per check,
 * joined by the line, each one level with its card while the card is on
 * screen; checks above or below the screen gather at the pill's ends.
 * Tapping a room's dot goes there.
 */
function SectionRail({ s, dark }: { s: PunchSheet; dark?: boolean }) {
  const ids = s.sec.ids;
  const pill = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<number[]>([]);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = pill.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const pad = 10;
      const lo = pad;
      const hi = r.height - pad;
      const n = ids.length;
      const gap = Math.min(10, (hi - lo) / Math.max(1, n - 1));
      // Each check's card centre, in the pill's own coordinates, held inside the pill.
      const p = ids.map((id) => {
        const c = document.querySelector(`[data-check="${CSS.escape(id)}"]`);
        if (!c) return lo;
        const b = c.getBoundingClientRect();
        return Math.max(lo, Math.min(hi, b.top + b.height / 2 - r.top));
      });
      // Keep them apart: pushed down from the top, then up from the bottom, so the
      // ones off screen stack at the ends.
      for (let i = 1; i < n; i++) p[i] = Math.max(p[i], p[i - 1] + gap);
      p[n - 1] = Math.min(p[n - 1], hi);
      for (let i = n - 2; i >= 0; i--) p[i] = Math.min(p[i], p[i + 1] - gap);
      setPos(p);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    const ro = new ResizeObserver(on);
    const list = document.getElementById("puncheo-list");
    if (list) ro.observe(list);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [ids]);

  const roomDot = (i: number) => {
    const t = s.sectionTallies[i];
    const done = t.done === t.total;
    return (
      <button
        key={s.sections[i].id}
        type="button"
        aria-label={`Ir a ${s.sections[i].name}`}
        onClick={() => s.travelTo(i)}
        className="pointer-events-auto block size-[18px] shrink-0 rounded-full"
        style={{ background: done ? "var(--ok)" : dark ? "rgba(255,255,255,0.28)" : "var(--hair)" }}
      />
    );
  };
  const ink = dark ? "var(--ground)" : "var(--ink-3)";
  return (
    <div
      className="pointer-events-none fixed right-[7px] z-20 flex w-[20px] flex-col items-center gap-[7px]"
      style={{ top: "calc(var(--sat) + 76px)", bottom: "calc(var(--sab) + 92px)" }}
    >
      {s.sections.slice(0, s.section).map((_, i) => roomDot(i))}
      <div ref={pill} className="relative w-[20px] min-h-[60px] flex-1 rounded-full" style={{ background: dark ? "rgba(255,255,255,0.16)" : "var(--hair)" }}>
        {pos.length > 1 ? (
          <span className="absolute left-1/2 w-[2px] -translate-x-1/2" style={{ top: pos[0], height: pos[pos.length - 1] - pos[0], background: ink }} />
        ) : null}
        {pos.map((y, i) => {
          const m = s.marks[ids[i]];
          return (
            <span
              key={ids[i]}
              className="absolute left-1/2 size-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ top: y, background: m ? COLOR[m] : ink, boxShadow: m ? `0 0 0 2px ${dark ? "#5b6376" : "var(--hair)"}` : undefined }}
            />
          );
        })}
      </div>
      {s.sections.slice(s.section + 1).map((_, k) => roomDot(s.section + 1 + k))}
    </div>
  );
}
