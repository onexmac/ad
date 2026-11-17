"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { CameraIcon } from "./Icons";

type Props = {
  /** Photos taken for this check (newest last). */
  photos: string[];
  /** This check is waiting on a photo it must have. */
  missing: boolean;
  /** Tells a tap from the end of a swipe. */
  dragged: () => boolean;
  onPick: (file: File) => void;
  size?: number;
  square?: boolean;
  className?: string;
};

/**
 * Camera button for a check: opens the phone's camera (a file picker on a
 * desktop). Once a photo exists it shows inside the button, with a count when
 * there are more. A required photo still missing rings it in the warning colour.
 */
export function PhotoButton({ photos, missing, dragged, onPick, size = 36, square = false, className = "" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const last = photos[photos.length - 1];
  const radius = square ? 8 : 999;
  return (
    <>
      <button
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
            className="absolute inset-0 grid place-items-center bg-ground"
            style={{
              borderRadius: radius,
              boxShadow: missing ? "0 0 0 1.5px var(--warn-deep)" : "0 0 0 1px var(--hair-2)",
              color: missing ? "var(--warn-deep)" : "var(--ink-faint)",
            }}
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
