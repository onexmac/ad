"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { useEdgeSquish } from "@/components/updatr/useEdgeSquish";
import type { Sheet } from "@/data/puncheo/formaleta-n1";
import { useClosed, useMarks, type Marks, type Status } from "@/lib/puncheo/state";
import { PunchRow } from "./PunchRow";
import { Chevrons, CheckIcon, LockIcon } from "./Icons";

const SEG: Record<Status, string> = {
  green: "var(--ok)",
  yellow: "var(--warn)",
  red: "var(--bad)",
  na: "var(--na)",
};

function tally(ids: string[], marks: Marks) {
  let done = 0;
  let red = 0;
  let pending = 0;
  for (const id of ids) {
    const s = marks[id];
    if (!s) pending++;
    else {
      done++;
      if (s === "red") red++;
    }
  }
  return { done, red, pending, total: ids.length };
}

export function PunchScreen({ sheet }: { sheet: Sheet }) {
  const { marks, mark } = useMarks();
  const { closed, set: setClosed } = useClosed();
  const [tab, setTab] = useState(0);
  // Slide direction of the last switch; 0 until the first one, so the first punch doesn't slide in.
  const [dir, setDir] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const [nudges, setNudges] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ msg: string; n: number } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const { scale, origin } = useEdgeSquish();

  const punch = sheet.punches[tab];
  const ids = useMemo(() => punch.checks.map((c) => c.id), [punch]);
  const t = tally(ids, marks);
  const isClosed = !!closed[punch.id];
  const ready = t.pending === 0 && t.red === 0;

  const say = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast((p) => ({ msg, n: (p?.n ?? 0) + 1 }));
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const onMark = (id: string, s: Status | null) => {
    mark(id, s);
    setPulses((p) => ({ ...p, [id]: s ? (p[id] ?? 0) + 1 : 0 }));
    if (closed[punch.id]) setClosed(punch.id, null); // an edit reopens the sheet
  };

  const switchTo = (n: number) => {
    if (n === tab) return;
    haptic.select();
    setDir(n > tab ? 1 : -1);
    setTab(n);
    setOpen(null);
    setPulses({});
    window.scrollTo({ top: 0 });
  };

  const close = () => {
    if (isClosed) return;
    if (!ready) {
      haptic.error();
      const offenders = punch.checks.filter((c) => !marks[c.id] || marks[c.id] === "red");
      setNudges((p) => {
        const next = { ...p };
        offenders.forEach((c) => (next[c.id] = (next[c.id] ?? 0) + 1));
        return next;
      });
      const parts = [];
      if (t.red) parts.push(`${t.red} en rojo`);
      if (t.pending) parts.push(`${t.pending} ${t.pending === 1 ? "pendiente" : "pendientes"}`);
      say(parts.join(" · "));
      const first = document.querySelector(`[data-check="${CSS.escape(offenders[0].id)}"]`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    haptic.complete();
    setClosed(punch.id, Date.now());
    say(`Ficha cerrada · ${punch.name}`);
  };

  return (
    <div data-app className="dot-ground min-h-dvh overflow-x-clip">
      <motion.main
        style={{ scale, transformOrigin: origin }}
        className="mx-auto w-full max-w-[520px] px-4"
      >
        <header style={{ paddingTop: "calc(var(--sat) + 28px)" }}>
          <div className="flex items-center justify-between">
            <span className="mono text-ink-faint">AD · Puncheo</span>
            <span className="mono text-ink-faint">v2.0</span>
          </div>
          <h1 className="mt-3 text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">
            {sheet.title} <span className="text-ink-faint">{sheet.subtitle.replace("Vivienda ", "")}</span>
          </h1>
          <p className="mt-2 text-[13px] text-ink-soft">{sheet.system}</p>
        </header>

        {/* The dark card of the reference screen: which punch, and how far along.
            No AnimatePresence here: its initial={false} would reach every row
            mounted later and swallow the marks' reward animations. */}
        <motion.section
            key={punch.id}
            initial={dir ? { opacity: 0, x: dir * 28 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={springs.snappy}
            className="mt-6"
          >
            <div className="flex items-center gap-3.5 rounded-[20px] bg-ink px-4 py-3.5 shadow-[0_12px_28px_rgba(25,28,34,0.22)]">
              <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-ground">
                <span className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{punch.n}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink-faint">
                  {isClosed ? "Cerrada" : "Puncheo " + punch.n} <span className="px-1">·</span> {t.total} checks
                </span>
                <span className="mt-0.5 block text-[17px] font-semibold tracking-[-0.01em] text-white">{punch.name}</span>
              </span>
              <span className="text-right leading-none">
                <span className="text-[22px] font-medium tracking-[-0.02em] text-white">{String(t.done).padStart(2, "0")}</span>
                <span className="text-[15px] font-medium text-ink-soft">/{String(t.total).padStart(2, "0")}</span>
              </span>
            </div>

            {/* One segment per check, coloured as it is marked. */}
            <div className="mt-3 flex gap-[3px] px-1">
              {punch.checks.map((c) => (
                <span key={c.id} className="h-[5px] flex-1 overflow-hidden rounded-full bg-hair">
                  <motion.span
                    className="block h-full w-full origin-left rounded-full"
                    style={{ background: marks[c.id] ? SEG[marks[c.id]] : "transparent" }}
                    initial={false}
                    animate={{ scaleX: marks[c.id] ? 1 : 0 }}
                    transition={springs.completing}
                  />
                </span>
              ))}
            </div>
            <p className="mt-3 px-1 text-[13px] leading-[18px] text-ink-soft">{punch.moment}</p>

            <Legend />

            <ul className="mt-3 grid grid-cols-1 gap-2.5">
              {punch.checks.map((c, i) => (
                <li key={c.id} data-check={c.id}>
                  <PunchRow
                    check={c}
                    index={i + 1}
                    punchN={punch.n}
                    status={marks[c.id] ?? null}
                    pulse={pulses[c.id] ?? 0}
                    nudge={nudges[c.id] ?? 0}
                    open={open === c.id}
                    onToggle={() => setOpen((o) => (o === c.id ? null : c.id))}
                    onMark={(s) => onMark(c.id, s)}
                    onReject={say}
                  />
                </li>
              ))}
            </ul>
          </motion.section>

        <div style={{ height: "calc(var(--sab) + 120px)" }} />
      </motion.main>

      <Toast toast={toast} />
      <Dock
        punches={sheet.punches.map((p) => ({ n: p.n, name: p.name, ...tally(p.checks.map((c) => c.id), marks), closed: !!closed[p.id] }))}
        tab={tab}
        onTab={switchTo}
        ready={ready}
        closed={isClosed}
        onClose={close}
      />
    </div>
  );
}

function Legend() {
  const item = (dir: "left" | "right", count: 1 | 2, label: string, dot: string) => (
    <span className={`flex items-center gap-1.5 ${dir === "left" ? "" : "flex-row-reverse"}`}>
      <Chevrons dir={dir} count={count} size={11} className="text-ink-faint" />
      <span className="size-1.5 rounded-full" style={{ background: dot }} />
      <span>{label}</span>
    </span>
  );
  return (
    <div className="mono mt-5 flex items-center justify-between px-1 text-ink-soft" style={{ fontSize: 9.5 }}>
      <span className="flex gap-3">
        {item("left", 2, "N/A", "var(--ink-3)")}
        {item("left", 1, "No pasa", "var(--bad)")}
      </span>
      <span className="flex gap-3">
        {item("right", 1, "Pasa", "var(--ok)")}
        {item("right", 2, "Obs.", "var(--warn)")}
      </span>
    </div>
  );
}

function Toast({ toast }: { toast: { msg: string; n: number } | null }) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.n}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={springs.popping}
          className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2"
          style={{ bottom: "calc(var(--sab) + 92px)" }}
        >
          <div className="whitespace-nowrap rounded-full bg-ink-2 px-4 py-2.5 text-[13px] font-medium text-white shadow-[var(--shadow-mid)]">
            {toast.msg}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type DockPunch = { n: number; name: string; done: number; total: number; red: number; closed: boolean };

/** Leia's checkout bar, as a floating dock: the punches on the left, closing on the right. */
function Dock({
  punches,
  tab,
  onTab,
  ready,
  closed,
  onClose,
}: {
  punches: DockPunch[];
  tab: number;
  onTab: (n: number) => void;
  ready: boolean;
  closed: boolean;
  onClose: () => void;
}) {
  return (
    <nav
      className="fixed left-1/2 z-30 w-[calc(100%-32px)] max-w-[488px] -translate-x-1/2"
      style={{ bottom: "calc(var(--sab) + 16px)" }}
    >
      <div className="flex items-center gap-1.5 rounded-[26px] bg-ink p-1.5 shadow-[0_14px_34px_rgba(25,28,34,0.28)]">
        {punches.map((p, i) => (
          <button
            key={p.n}
            type="button"
            onClick={() => onTab(i)}
            className="relative h-[52px] w-[66px] shrink-0 rounded-[20px] text-left"
            aria-pressed={tab === i}
          >
            {tab === i ? (
              <motion.span
                layoutId="dock-pill"
                className="pointer-events-none absolute inset-0 rounded-[20px] bg-ink-2"
                transition={springs.snappy}
              />
            ) : null}
            <span className="relative flex h-full flex-col justify-center px-3 leading-none">
              <span className={`mono ${tab === i ? "text-white" : "text-ink-soft"}`} style={{ fontSize: 10 }}>
                P{p.n}
              </span>
              <span className={`mt-1.5 text-[15px] font-medium tracking-[-0.01em] ${tab === i ? "text-white" : "text-ink-soft"}`}>
                {p.closed ? (
                  <CheckIcon size={15} strokeWidth={2.2} className="text-ok" />
                ) : (
                  <>
                    {p.done}
                    <span className="text-ink-soft">/{p.total}</span>
                  </>
                )}
              </span>
            </span>
          </button>
        ))}
        <motion.button
          type="button"
          onClick={onClose}
          whileTap={{ scale: 0.97 }}
          transition={springs.snappy}
          className="flex h-[52px] flex-1 items-center justify-between rounded-[20px] px-4 transition-colors duration-300"
          style={{ background: closed ? "var(--ok)" : ready ? "var(--brand)" : "var(--ink-2)" }}
        >
          <span className={`text-[15px] font-semibold tracking-[-0.01em] ${closed || ready ? "text-white" : "text-ink-faint"}`}>
            {closed ? "Ficha cerrada" : "Cerrar ficha"}
          </span>
          {closed ? (
            <CheckIcon size={18} strokeWidth={2.2} className="text-white" />
          ) : ready ? (
            <CheckIcon size={18} strokeWidth={2} className="text-white" />
          ) : (
            <LockIcon size={16} className="text-ink-soft" />
          )}
        </motion.button>
      </div>
    </nav>
  );
}
