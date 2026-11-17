"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import type { Check } from "@/data/puncheo/formaleta-n1";
import type { Status } from "@/lib/puncheo/state";
import { StatusMark } from "./StatusMark";
import { PhotoButton } from "./PhotoButton";
import { SwipeUnder } from "./SwipeUnder";
import { CheckDetail, Expand } from "./CheckDetail";
import { useSwipeMark } from "./useSwipeMark";
import { rowState, type PunchSheet } from "./usePunchSheet";

const INK: Record<Status, string> = {
  green: "var(--ok-deep)",
  yellow: "var(--warn-deep)",
  red: "var(--bad)",
  na: "var(--ink-faint)",
};

/** Layout A: soft cards, date-style number column (the reference screen). */
export function PunchRow({ s, check, index, punchN }: { s: PunchSheet; check: Check; index: number; punchN: number }) {
  const r = rowState(s, check);
  const ref = useRef<HTMLDivElement>(null);
  const underRef = useRef<HTMLDivElement>(null);
  const sw = useSwipeMark({
    ref,
    underRef,
    id: check.id,
    na: check.na,
    status: r.status,
    pulse: r.pulse,
    nudge: r.nudge,
    rest: "#f7f7f7",
    onMark: (m) => s.setMark(check.id, m),
    onReject: s.say,
  });

  return (
    // A freshly marked row sits above its neighbours so its rings spill over them.
    <div className="relative" style={{ zIndex: r.pulse ? 2 : undefined }}>
      <SwipeUnder sw={sw} underRef={underRef} className="rounded-[22px]" />
      <motion.div ref={ref} style={{ x: sw.x, touchAction: "pan-y" }} {...sw.bind} className="no-select relative rounded-[22px] bg-card">
        <div className="flex items-center gap-3 py-4 pl-5 pr-4">
          <button
            type="button"
            onClick={() => {
              if (sw.dragged()) return;
              haptic.select();
              s.toggle(check.id);
            }}
            aria-expanded={r.open}
            className="flex min-w-0 flex-1 items-center gap-4 text-left outline-none"
          >
            <span className="flex w-9 shrink-0 flex-col items-start leading-none">
              <span className="text-[13px] font-medium text-ink-faint">P{punchN}</span>
              <span
                className="mt-1.5 text-[26px] font-medium tracking-[-0.02em] transition-colors duration-300"
                style={{ color: r.status ? INK[r.status] : "var(--ink-3)" }}
              >
                {String(index).padStart(2, "0")}
              </span>
            </span>
            <span className="h-11 w-px shrink-0 bg-hair" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold leading-5 tracking-[-0.01em] text-ink">{check.title}</span>
              <span className="mt-1 block truncate text-[13.5px] leading-5 text-ink-faint">{check.sub}</span>
            </span>
          </button>
          <PhotoButton
            photos={r.photos}
            missing={r.missingPhoto || (check.photo.required && !r.photos.length)}
            dragged={sw.dragged}
            onPick={(f) => s.pickPhoto(check, f)}
          />
          <button
            type="button"
            aria-label={r.status === "green" ? `Quitar pasa de ${check.id}` : `Marcar ${check.id} como pasa`}
            onClick={() => {
              if (sw.dragged()) return;
              s.tapCheck(check.id);
            }}
            className="shrink-0"
          >
            <StatusMark key={r.pulse} status={r.status} fresh={r.pulse > 0} />
          </button>
        </div>

        {/* The reward for a pass: a hairline sweeps the card's foot. */}
        {r.pulse > 0 && r.status === "green" ? (
          <motion.span
            key={`sweep-${r.pulse}`}
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-5 right-5 h-[2px] origin-left rounded-full bg-ok"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: [1, 1, 0] }}
            transition={{ scaleX: { duration: 0.5, delay: 0.1, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 1, delay: 0.1, times: [0, 0.6, 1] } }}
          />
        ) : null}

        <Expand open={r.open}>
          <div className="px-5 pb-5">
            <div className="mb-4 h-px bg-hair" />
            <CheckDetail
              check={check}
              status={r.status}
              photos={r.photos}
              onClear={() => s.setMark(check.id, null)}
              onRemovePhoto={(i) => s.removePhoto(check.id, i)}
            />
          </div>
        </Expand>
      </motion.div>
    </div>
  );
}
