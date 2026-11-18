"use client";

import { AnimatePresence, motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import type { Check } from "@/data/puncheo/formaleta-n1";
import type { Status } from "@/lib/puncheo/state";

const DOT: Record<"green" | "yellow" | "red", string> = { green: "var(--ok)", yellow: "var(--warn)", red: "var(--bad)" };

/** The check's whole explanation, opened under its row. Same content in every layout. */
export function CheckDetail({
  check,
  status,
  photos,
  onClear,
  onOpenPhoto,
  highlight = "var(--ground)",
  outer = 20,
}: {
  check: Check;
  status: Status | null;
  photos: string[];
  onClear: () => void;
  /** Open a photo (it flies from its tile into the viewer, where it can be marked up or deleted). */
  onOpenPhoto: (i: number, img: HTMLImageElement | null) => void;
  /** Background of the criterion that matches the mark. */
  highlight?: string;
  /** The card's radius: everything inside rounds less (nested radii shrink inward). */
  outer?: number;
}) {
  const inner = Math.max(2, outer - 8);
  const rows = [
    { s: "green" as const, label: "Verde", text: check.green },
    { s: "yellow" as const, label: "Amarillo", text: check.yellow },
    { s: "red" as const, label: "Rojo", text: check.red },
  ];
  return (
    <div>
      <Label>Qué se revisa</Label>
      <p className="mt-1.5 text-[15px] leading-[21px] text-ink-2">{check.what}</p>

      <div className="mt-4 grid gap-1.5">
        {rows.map((r) => (
          <div
            key={r.s}
            className="flex gap-3 px-3.5 py-3 transition-colors"
            style={{ borderRadius: inner, background: status === r.s ? highlight : "transparent", boxShadow: status === r.s ? "var(--shadow-soft)" : "none" }}
          >
            <span className="mt-[5px] size-2.5 shrink-0 rounded-full" style={{ background: DOT[r.s] }} />
            <span className="min-w-0">
              <span className="mono text-ink-soft">{r.label}</span>
              <span className="mt-0.5 block text-[14px] leading-5 text-ink-2">{r.text}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 border-t border-hair pt-4">
        <Label>Tolerancia</Label>
        <p className="text-[14px] leading-5 text-ink-2">{check.tolerance}</p>
        <Label>Foto</Label>
        <p className="text-[14px] leading-5 text-ink-2">
          <span className={check.photo.required ? "font-semibold text-ink" : ""}>{check.photo.required ? "Obligatoria" : "Opcional"}</span>
          {check.photo.note ? <span className="text-ink-soft"> · {check.photo.note}</span> : null}
          {!check.photo.required ? <span className="text-ink-soft"> · obligatoria en amarillo y rojo</span> : null}
        </p>
        <Label>N/A</Label>
        <p className="text-[14px] leading-5 text-ink-2">{check.na ? "Permitido" : "No permitido"}</p>
      </div>

      {photos.length ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-hair pt-4">
          <AnimatePresence initial={false}>
            {photos.map((src, i) => (
              <motion.div
                key={i}
                layout
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={springs.popping}
                className="relative size-[72px] overflow-hidden"
                style={{ borderRadius: inner, boxShadow: "0 0 0 1px var(--hair-2)" }}
              >
                <button
                  type="button"
                  aria-label={`Ver foto ${i + 1}`}
                  onClick={(e) => onOpenPhoto(i, e.currentTarget.querySelector("img"))}
                  className="block h-full w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Foto ${i + 1} de ${check.id}`} draggable={false} className="h-full w-full object-cover" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}

      {status ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-hair pt-4">
          <span className="text-[13px] text-ink-soft">
            {status === "yellow" || status === "red" ? "Amarillo y rojo exigen nota y foto." : "Marcado."}
          </span>
          <button
            type="button"
            onClick={() => {
              haptic.select();
              onClear();
            }}
            className="shrink-0 bg-hair px-3.5 py-2 text-[13px] font-semibold text-ink-3 active:bg-hair-2"
            style={{ borderRadius: Math.min(16, inner) }}
          >
            Reiniciar
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`mono block pt-[3px] text-ink-faint ${className}`}>{children}</span>;
}

/** The opening and closing of a row's detail: height on a spring, no overshoot. */
export function Expand({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="detail"
          data-detail
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ height: springs.shrinking, opacity: { duration: 0.18 } }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
