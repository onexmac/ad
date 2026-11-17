"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import type { Key } from "@/data/puncheo/rooms";
import { CheckIcon } from "./Icons";
import { RailRow, type RowSkin } from "./RailRow";
import type { PunchSheet } from "./usePunchSheet";
import { PULL_COMMIT, useSectionPull } from "./useSectionPull";

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

/**
 * The current room: its title, then its pre-armado and pre-chorrea checks on the
 * rail with group labels and key facts between them, and the pull into the next room.
 */
export function Walk({ s, skin }: { s: PunchSheet; skin: RowSkin }) {
  const { sec } = s;
  // Going to another room: the items scroll up and away (down, going back), the
  // new room's items cascade in on springs, and the rail morphs with it, the
  // current pill shrinking into a dot as the next room's dot grows into the
  // pill. The pull drives the same morph partway, so it previews the next room.
  const shift = useMotionValue(0);
  const morph = useMotionValue(0);
  const [toward, setToward] = useState<number | null>(null);
  const [cascade, setCascade] = useState(0);
  const traveling = useRef(false);
  const travel = (to: number) => {
    if (traveling.current) return;
    traveling.current = true;
    setToward(to);
    const down = to < s.section;
    const h = window.innerHeight;
    Promise.all([
      animate(morph, 1, { duration: 0.32, ease: [0.3, 0, 0.2, 1] }),
      animate(shift, down ? h * 0.6 : -h * 0.6, { duration: 0.24, ease: [0.4, 0, 1, 1] }),
    ]).then(() => {
      pull.raw.set(0);
      s.goSection(to, undefined, true);
      setCascade((c) => c + 1);
      shift.set(0);
      morph.set(0);
      setToward(null);
      traveling.current = false;
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
  // While pulling, the rail leans toward the next room, up to 40% of the morph.
  useMotionValueEvent(pull.raw, "change", (v) => {
    if (!traveling.current) morph.set(Math.min(1, v / PULL_COMMIT) * 0.4);
  });
  const railTo = toward ?? (pull.pulling && s.section < s.sections.length - 1 ? s.section + 1 : null);
  const y = useTransform([pull.lift, shift], ([l, sh]: number[]) => sh - l);
  const st = s.sectionTallies[s.section];
  // The new room's items come in one after another on springs (only after a move, not on load).
  const enter = (i: number) => ({
    initial: cascade > 0 ? { opacity: 0, y: 44 } : false,
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 360, damping: 26, delay: Math.min(i, 12) * 0.035 },
  });
  const rows = sec.items.map((it, i) => {
    if (it.kind === "check") {
      const c = s.byId.get(it.id)!;
      return (
        <motion.li key={`${sec.id}-${c.id}`} data-check={c.id} {...enter(i)}>
          <RailRow s={s} check={c} skin={skin} />
        </motion.li>
      );
    }
    if (it.kind === "phase")
      return (
        <motion.li key={`${sec.id}-p-${it.n}`} {...enter(i)}>
          <PhaseHead name={it.name} moment={it.moment} first={i === 0} dark={skin.dark} leia={skin.leia} />
        </motion.li>
      );
    if (it.kind === "group")
      return (
        <motion.li key={`${sec.id}-g-${i}`} {...enter(i)}>
          <GroupLabel label={it.label} dark={skin.dark} leia={skin.leia} />
        </motion.li>
      );
    return (
      <motion.li key={`${sec.id}-k-${i}`} {...enter(i)}>
        <KeyBlock k={it.key} skin={skin} />
      </motion.li>
    );
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
    </motion.div>
    {/* Outside the moving layer: a transformed ancestor would trap this fixed rail. */}
    <SectionRail s={s} dark={skin.dark} morph={morph} toward={railTo} />
    </>
  );
}

const DOT = 16;
const GAP = 7;
const C = {
  done: "#95c955",
  rest: "#48505f", // incomplete room: dark bluish grey
  restDark: "#2c323d",
  track: "#e6e6e8",
  trackDark: "rgba(255,255,255,0.16)",
};

/**
 * The rail at the right edge (Marcos's sketch): a dot per room, the current
 * room stretched into a tall pill. Inside the pill, a dot per check, joined by
 * the line, level with its card while the card is on screen and gathered at
 * the ends when it isn't; hollow until you have scrolled past it, filled in
 * its mark's colour once marked. Done rooms are all green, the rest dark
 * bluish grey. Moving to another room (or pulling toward it) morphs the rail:
 * the current pill shrinks into a dot as the target dot grows into the pill.
 */
function SectionRail({ s, dark, morph, toward }: { s: PunchSheet; dark?: boolean; morph: MotionValue<number>; toward: number | null }) {
  const ids = s.sec.ids;
  const box = useRef<HTMLDivElement>(null);
  const [H, setH] = useState(0);
  const [pos, setPos] = useState<{ y: number; passed: boolean }[]>([]);
  const n = s.sections.length;
  const full = Math.max(DOT, H - (n - 1) * (DOT + GAP));

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = box.current;
      if (!el) return;
      // The pill's place: after the rooms above it.
      const r = el.getBoundingClientRect();
      const top = r.top + s.section * (DOT + GAP);
      const pad = 10;
      const lo = pad;
      const hi = full - pad;
      const gap = Math.min(10, (hi - lo) / Math.max(1, ids.length - 1));
      const line = window.innerHeight * 0.45;
      const p = ids.map((id) => {
        const c = document.querySelector(`[data-check="${CSS.escape(id)}"]`);
        if (!c) return { y: lo, passed: false };
        const b = c.getBoundingClientRect();
        const mid = b.top + b.height / 2;
        return { y: Math.max(lo, Math.min(hi, mid - top)), passed: mid < line };
      });
      for (let i = 1; i < p.length; i++) p[i].y = Math.max(p[i].y, p[i - 1].y + gap);
      if (p.length) p[p.length - 1].y = Math.min(p[p.length - 1].y, hi);
      for (let i = p.length - 2; i >= 0; i--) p[i].y = Math.min(p[i].y, p[i + 1].y - gap);
      setPos(p);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    // The new room's cards are still springing in: measure again as they settle.
    const settle = [180, 420, 800].map((ms) => setTimeout(on, ms));
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    const ro = new ResizeObserver(on);
    const list = document.getElementById("puncheo-list");
    if (list) ro.observe(list);
    return () => {
      settle.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [ids, full, s.section]);

  return (
    <div
      ref={box}
      className="pointer-events-none fixed right-[7px] z-20 flex w-[18px] flex-col items-center"
      style={{ top: "calc(var(--sat) + 76px)", bottom: "calc(var(--sab) + 92px)", gap: GAP }}
    >
      {H > 0
        ? s.sections.map((x, i) => (
            <RoomMark
              key={x.id}
              i={i}
              s={s}
              dark={dark}
              morph={morph}
              role={i === s.section ? "current" : i === toward ? "toward" : "rest"}
              full={full}
              pos={i === s.section ? pos : null}
            />
          ))
        : null}
    </div>
  );
}

function RoomMark({
  i,
  s,
  dark,
  morph,
  role,
  full,
  pos,
}: {
  i: number;
  s: PunchSheet;
  dark?: boolean;
  morph: MotionValue<number>;
  role: "current" | "toward" | "rest";
  full: number;
  pos: { y: number; passed: boolean }[] | null;
}) {
  const t = s.sectionTallies[i];
  const done = t.done === t.total;
  const dot = done ? C.done : dark ? C.restDark : C.rest;
  const track = done ? C.done : dark ? C.trackDark : C.track;
  const height = useTransform(morph, (m) => (role === "current" ? full - (full - DOT) * m : role === "toward" ? DOT + (full - DOT) * m : DOT));
  const background = useTransform(morph, [0, 1], role === "current" ? [track, dot] : role === "toward" ? [dot, track] : [dot, dot]);
  const inner = useTransform(morph, [0, 0.45], [1, 0]);
  const ids = s.sections[i].ids;
  const ink = done ? "#ffffff" : dark ? "#ffffff" : C.rest;
  return (
    <motion.button
      type="button"
      aria-label={`Ir a ${s.sections[i].name}`}
      onClick={() => s.travelTo(i)}
      className="pointer-events-auto relative w-[18px] shrink-0 rounded-full"
      style={{ height, background }}
    >
      {role === "current" && pos ? (
        <motion.span className="absolute inset-0" style={{ opacity: inner }}>
          {pos.length > 1 ? (
            <span className="absolute left-1/2 w-[2px] -translate-x-1/2" style={{ top: pos[0].y, height: pos[pos.length - 1].y - pos[0].y, background: ink }} />
          ) : null}
          {pos.map((p, k) => {
            const m = s.marks[ids[k]];
            const fill = m ? COLOR_HEX[m] : p.passed ? ink : null;
            return (
              <span
                key={ids[k]}
                className="absolute left-1/2 size-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-200"
                style={{ top: p.y, background: fill ?? track, boxShadow: `inset 0 0 0 2px ${fill ?? ink}` }}
              />
            );
          })}
        </motion.span>
      ) : null}
    </motion.button>
  );
}

const COLOR_HEX: Record<string, string> = { green: "#95c955", yellow: "#ffd556", red: "#eb5757", na: "#bdbdbd" };
