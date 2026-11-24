"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { haptic } from "@/lib/histok/haptic";
import { RailRow, type RowSkin } from "./RailRow";
import type { PunchSheet } from "./usePunchSheet";
import { GroupLabel, KeyBlock, PhaseHead } from "./Walk";

/**
 * Every room on one page, one after another: scroll down and the next room
 * comes up under the last. Each row rises into place the first time it scrolls
 * into view. The rooms bar at the top follows the room being read, and a tap on
 * a room glides the page to it.
 */
export function RoomScroll({ s, skin }: { s: PunchSheet; skin: RowSkin }) {
  const gliding = useRef(false);
  const spy = useRef(s.spy);
  useEffect(() => {
    spy.current = s.spy;
  });

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      if (gliding.current) return;
      const rooms = document.querySelectorAll<HTMLElement>("[data-room]");
      if (!rooms.length) return;
      const top = document.getElementById("puncheo-tabs")?.getBoundingClientRect().bottom ?? 0;
      // The room being read is the one crossing a line a third of the way down.
      const line = top + (window.innerHeight - top) * 0.33;
      let at = 0;
      rooms.forEach((r, i) => {
        if (r.getBoundingClientRect().top <= line) at = i;
      });
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) at = rooms.length - 1;
      spy.current(at);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  // The rooms bar's taps: glide to the room; the bar lands on it at once.
  useEffect(() => {
    s.registerTravel((i: number) => {
      const room = document.querySelector<HTMLElement>(`[data-room="${i}"]`);
      if (!room) return;
      haptic.select();
      gliding.current = true;
      s.spy(i);
      // Where the room sits in the page's layout: its entry animation (a small
      // offset until it has been seen) must not count, so walk the offsets.
      const target = () => {
        let y = 0;
        for (let el: HTMLElement | null = room; el; el = el.offsetParent as HTMLElement | null) y += el.offsetTop;
        const bar = document.getElementById("puncheo-tabs")?.getBoundingClientRect().bottom ?? 0;
        return Math.max(0, Math.min(y - bar - 12, document.documentElement.scrollHeight - window.innerHeight));
      };
      window.scrollTo({ top: target(), behavior: "smooth" });
      let done = 0;
      const end = () => {
        window.clearTimeout(done);
        window.removeEventListener("scrollend", end);
        // Land exactly: anything that shifted during the glide is made up here.
        const off = target() - window.scrollY;
        if (Math.abs(off) > 2) window.scrollTo({ top: target(), behavior: "smooth" });
        gliding.current = false;
      };
      window.addEventListener("scrollend", end, { once: true });
      done = window.setTimeout(end, 1400); // no scrollend (older Safari, or nowhere to scroll)
    });
  });

  // Rising into view: once, on a soft spring.
  const rise = {
    initial: { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "0px 0px -4% 0px" },
    transition: { type: "spring" as const, stiffness: 340, damping: 30 },
  };

  return (
    <div>
      {s.sections.map((sec, si) => {
        const st = s.sectionTallies[si];
        return (
          <motion.section
            key={sec.id}
            data-room={si}
            {...rise}
            className={skin.leia ? `leia-panel mt-5 overflow-hidden rounded-[6px] ${st.done === st.total ? "room-done" : ""}` : "mt-7"}
          >
            <div className="leia-band relative flex h-[54px] items-center gap-3 px-3 text-ground">
              {/* Every check marked: the band turns Leia's green. */}
              <span aria-hidden className={`leia-band-done pointer-events-none absolute inset-0 transition-opacity duration-500 ${st.done === st.total ? "opacity-100" : "opacity-0"}`} />
              <span className={`leia-band-sep relative flex h-full items-center pr-3 text-[13px] transition-colors duration-500 ${st.done === st.total ? "text-[#eaf6db]" : "text-brand-2"}`}>
                {si + 1}/{s.sections.length}
              </span>
              <span className="relative min-w-0 flex-1">
                <span data-title className="block truncate text-[19px] leading-tight">
                  {sec.name}
                </span>
                <span className={`block truncate text-[12px] transition-colors duration-500 ${st.done === st.total ? "text-[#eaf6db]" : "text-brand-2"}`}>{sec.note}</span>
              </span>
              <span className="relative text-[18px] tabular-nums">
                {String(st.done).padStart(2, "0")}
                <span className={`transition-colors duration-500 ${st.done === st.total ? "text-[#eaf6db]" : "text-brand-2"}`}>/{st.total}</span>
              </span>
            </div>
            <ul>
              {sec.items.map((it, i) => {
                if (it.kind === "check") {
                  const c = s.byId.get(it.id)!;
                  return (
                    <motion.li key={c.id} data-check={c.id} {...rise}>
                      <RailRow s={s} check={c} skin={skin} />
                    </motion.li>
                  );
                }
                if (it.kind === "phase")
                  return (
                    <motion.li key={`p-${it.n}`} {...rise}>
                      <PhaseHead name={it.name} moment={it.moment} first={i === 0} dark={skin.dark} leia={skin.leia} />
                    </motion.li>
                  );
                if (it.kind === "group")
                  return (
                    <motion.li key={`g-${i}`} {...rise}>
                      <GroupLabel label={it.label} dark={skin.dark} leia={skin.leia} />
                    </motion.li>
                  );
                return (
                  <motion.li key={`k-${i}`} {...rise}>
                    <KeyBlock k={it.key} skin={skin} />
                  </motion.li>
                );
              })}
            </ul>
          </motion.section>
        );
      })}
    </div>
  );
}
