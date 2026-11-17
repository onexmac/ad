"use client";

import { useEffect, useRef } from "react";
import { animate, motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { CameraIcon } from "./Icons";

type Props = {
  /** Photos taken for this check (newest last). */
  photos: string[];
  /** This check needs a photo it doesn't have yet: the button fills green to stand out. */
  missing: boolean;
  /** Bumps to shake the button (a mark was refused for want of a photo). */
  shake?: number;
  /** Tells a tap from the end of a swipe. */
  dragged: () => boolean;
  onPick: (file: File) => void;
  size?: number;
  square?: boolean;
  /** Leia's bevelled square button. */
  leia?: boolean;
  /** AD Visual's flat grey square (the Secondary button). */
  flat?: boolean;
  className?: string;
};

/**
 * Camera button for a check: opens the phone's camera (a file picker on a
 * desktop). Once a photo exists it shows inside the button, with a count when
 * there are more. A photo the check needs and lacks fills it green with a white icon.
 */
export function PhotoButton({ photos, missing, shake = 0, dragged, onPick, size = 36, square = false, leia = false, flat = false, className = "" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!shake || !btn.current) return;
    animate(btn.current, { x: [0, -7, 7, -5, 5, -2, 0], rotate: [0, -8, 8, -5, 4, 0, 0] }, { duration: 0.5, ease: "easeOut" });
  }, [shake]);
  const last = photos[photos.length - 1];
  const radius = leia ? 4 : flat ? 6 : square ? 8 : 999;
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={photos.length ? `Agregar foto (${photos.length})` : "Tomar foto"}
        onClick={(e) => {
          e.stopPropagation();
          if (dragged()) return;
          input.current?.click();
        }}
        className={`relative grid shrink-0 place-items-center ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
      >
        {last ? (
          <motion.span
            key={photos.length}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springs.popping}
            className="absolute inset-0 overflow-hidden"
            style={{ borderRadius: radius, boxShadow: "0 0 0 1px var(--hair-2)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={last} alt="" draggable={false} className="h-full w-full object-cover" />
          </motion.span>
        ) : (
          <span
            className={`absolute inset-0 grid place-items-center transition-colors duration-300 ${leia ? (missing ? "leia-btn-ok" : "leia-btn") : ""}`}
            style={
              leia
                ? { borderRadius: radius, color: missing ? "var(--ground)" : "var(--ink-soft)" }
                : flat
                  ? { borderRadius: radius, background: missing ? "var(--ok)" : "var(--hair)", color: missing ? "var(--ground)" : "var(--ink-soft)" }
                  : {
                      borderRadius: radius,
                      background: missing ? "var(--ok)" : "var(--ground)",
                      boxShadow: missing ? "0 4px 10px rgba(136,160,36,0.28)" : "0 0 0 1px var(--hair-2)",
                      color: missing ? "var(--ground)" : "var(--ink-faint)",
                    }
            }
          >
            <CameraIcon size={Math.round(size * 0.45)} />
          </span>
        )}
        {photos.length > 1 ? (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold leading-none text-ground">
            {photos.length}
          </span>
        ) : null}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
    </>
  );
}
