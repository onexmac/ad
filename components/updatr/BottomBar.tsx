"use client";

import { AnimatePresence, motion, useScroll } from "motion/react";
import { springs } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";

export type Tab = { id: string; label: string; anchor: string };

/**
 * Floating bottom navigation (Histok's bottom chrome, squared): an ink bar
 * inset from the edges, under the thumb. The active tab is a paper block that
 * springs between tabs and names the section you are in; a hairline of accent
 * along its top fills with reading progress.
 */
export function BottomBar({
  tabs,
  active,
  section,
  onGo,
}: {
  tabs: Tab[];
  active: string;
  section: string;
  onGo: (tab: Tab) => void;
}) {
  const { scrollYProgress } = useScroll();
  return (
    <nav aria-label="Sections" className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <motion.div
        className="mx-auto max-w-[520px] px-3 pb-[calc(var(--sab)+12px)]"
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 30, mass: 1, delay: 0.35 }}
      >
        <div
          data-updatr-chrome="bottom"
          className="pointer-events-auto relative overflow-hidden bg-ink text-paper shadow-[0_18px_40px_-18px_rgba(11,11,11,0.55)]"
        >
          <motion.div aria-hidden className="absolute inset-x-0 top-0 h-[2px] origin-left bg-accent" style={{ scaleX: scrollYProgress }} />
          <div className="grid p-[5px]" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
            {tabs.map((t) => {
              const on = t.id === active;
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  aria-current={on ? "true" : undefined}
                  whileTap={{ scale: 0.92 }}
                  transition={springs.snappy}
                  onClick={() => {
                    haptic.select();
                    onGo(t);
                  }}
                  className="relative flex h-[50px] flex-col items-center justify-center gap-[3px]"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {on ? (
                    <motion.span
                      layoutId="updatr-tab"
                      transition={springs.snappy}
                      className="pointer-events-none absolute inset-0 bg-paper"
                    />
                  ) : null}
                  <span className={`mono relative ${on ? "text-ink" : "text-paper/60"}`}>{t.label}</span>
                  <span className="relative block h-[11px] w-full overflow-hidden text-center">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {on ? (
                        <motion.span
                          key={section}
                          initial={{ y: 11, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -11, opacity: 0 }}
                          transition={springs.snappy}
                          className="mono block truncate px-1 text-[8.5px] leading-[11px] text-ink-soft"
                        >
                          {section}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </nav>
  );
}
