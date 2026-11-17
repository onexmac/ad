"use client";

import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { haptic } from "@/lib/histok/haptic";
import type { Check } from "@/data/puncheo/formaleta-n1";
import type { Instance, RoomSheet, Section } from "@/data/puncheo/rooms";
import { layout, pick, type Fan } from "./fan";
import { needsPhoto, shrinkPhoto, useClosed, useMarks, usePhotos, type Marks, type Status } from "@/lib/puncheo/state";

export type Tally = { done: number; red: number; pending: number; noPhoto: number; total: number };

export function tally(checks: Check[], marks: Marks, photos: Record<string, string[]>): Tally {
  let done = 0;
  let red = 0;
  let pending = 0;
  let noPhoto = 0;
  for (const c of checks) {
    const s = marks[c.id];
    if (!s) pending++;
    else {
      done++;
      if (s === "red") red++;
    }
    if (s && s !== "na" && needsPhoto(c.photo.required, s) && !photos[c.id]?.length) noPhoto++;
  }
  return { done, red, pending, noPhoto, total: checks.length };
}

/** Everything the three layouts share: marks, photos, the open row, the toast, closing a sheet. */
export function usePunchSheet(sheet: RoomSheet) {
  const { marks, mark } = useMarks();
  const { closed, set: setClosed } = useClosed();
  const { photos, add: addPhoto, remove: removePhoto } = usePhotos();
  // The walk: one section per room; each room holds its pre-armado and its pre-chorrea checks.
  const sections: Section[] = sheet.walk;
  const [section, setSection] = useState(0);
  // Direction of the last section change: +1 came from above (slides up), -1 from below.
  const [secDir, setSecDir] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const [nudges, setNudges] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ msg: string; n: number } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  // The walk registers how it travels between sections (the whole screen moving),
  // so other controls (the footer's sections) go the same way.
  const travelRef = useRef<((i: number) => void) | null>(null);
  // The sections fan, shared by its two ways in: holding the finger after a scroll,
  // and the footer's sections button.
  const [fan, setFanState] = useState<Fan | null>(null);
  const fanRef = useRef<Fan | null>(null);
  const setFan = (f: Fan | null) => {
    fanRef.current = f;
    setFanState(f);
  };

  const at = Math.min(section, sections.length - 1);
  const sec = sections[at];
  const all = sheet.punches.flatMap((p) => p.checks);
  /** The whole sheet is one ficha now: both punches, closed together. */
  const punch = { id: "ficha", name: "Ficha", checks: all };
  const t = tally(all, marks, photos);
  const isClosed = !!closed[punch.id];
  const ready = t.pending === 0 && t.red === 0 && t.noPhoto === 0;

  const say = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast((p) => ({ msg, n: (p?.n ?? 0) + 1 }));
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const setMark = (id: string, s: Status | null) => {
    mark(id, s);
    setPulses((p) => ({ ...p, [id]: s ? (p[id] ?? 0) + 1 : 0 }));
    if (closed[punch.id]) setClosed(punch.id, null); // an edit reopens the sheet
  };

  /** A tap on the check mark: passes it, or clears a pass. */
  const tapCheck = (id: string) => {
    if (marks[id] === "green") {
      haptic.select();
      setMark(id, null);
    } else {
      haptic.complete();
      setMark(id, "green");
    }
  };

  /** Into another section of the walk; the page lands on the section's title. */
  const goSection = (i: number, then?: () => void, instant = false) => {
    if (i < 0 || i >= sections.length) return;
    setSecDir(i > at ? 1 : -1);
    setSection(i);
    setOpen(null);
    setPulses({});
    const land = () => {
      const top = document.getElementById("puncheo-section");
      if (top) window.scrollTo({ top: Math.max(0, top.getBoundingClientRect().top + window.scrollY - 12), behavior: "instant" });
      then?.();
    };
    if (instant) flushSync(() => setSection(i));
    if (instant) land();
    else requestAnimationFrame(land);
  };

  const pickPhoto = async (c: Instance, file: File) => {
    try {
      const url = await shrinkPhoto(file);
      const kept = addPhoto(c.id, url);
      haptic.complete();
      say(kept ? `Foto agregada · ${c.num}` : "Foto agregada, pero el dispositivo está lleno: no se guardará");
    } catch {
      haptic.error();
      say("No se pudo leer la foto");
    }
  };

  const close = () => {
    if (isClosed) return;
    if (!ready) {
      haptic.error();
      const offenders = punch.checks.filter((c) => {
        const s = marks[c.id];
        return !s || s === "red" || (s !== "na" && needsPhoto(c.photo.required, s) && !photos[c.id]?.length);
      });
      setNudges((p) => {
        const next = { ...p };
        offenders.forEach((c) => (next[c.id] = (next[c.id] ?? 0) + 1));
        return next;
      });
      const parts = [];
      if (t.red) parts.push(`${t.red} en rojo`);
      if (t.pending) parts.push(`${t.pending} ${t.pending === 1 ? "pendiente" : "pendientes"}`);
      if (t.noPhoto) parts.push(`${t.noPhoto} sin foto`);
      say(parts.join(" · "));
      const find = () => document.querySelector(`[data-check="${CSS.escape(offenders[0].id)}"]`);
      const show = () => find()?.scrollIntoView({ behavior: "smooth", block: "center" });
      const where = sections.findIndex((x) => x.ids.includes(offenders[0].id));
      // One room on screen at a time (the legacy walk): go to its room first.
      // The continuous scroll has every room on the page already.
      if (!find() && where >= 0 && where !== at) goSection(where, () => setTimeout(show, 60));
      else show();
      return;
    }
    haptic.complete();
    // An event handler (the close button), not render: the time stamp is the point.
    // eslint-disable-next-line react-hooks/purity
    setClosed(punch.id, Date.now());
    say("Ficha cerrada");
  };

  const punchTallies = sheet.punches.map((p) => ({ ...tally(p.checks, marks, photos), closed: !!closed[p.id] }));
  const byId = new Map(all.map((c) => [c.id, c]));
  const sectionTallies = sections.map((x) => tally(x.ids.map((id) => byId.get(id)!), marks, photos));
  /** Each check's section, for labelling search results. */
  const sectionOf = (id: string) => sections.find((x) => x.ids.includes(id))!;

  return {
    punch,
    sec,
    sections,
    all,
    sectionOf,
    section: at,
    registerTravel: (fn: (i: number) => void) => {
      travelRef.current = fn;
    },
    /** The continuous scroll reports the room being read; nothing else moves. */
    spy: (i: number) => setSection(i),
    /** Go to a section the way the walk moves: the whole screen travels. */
    travelTo: (i: number) => (travelRef.current ? travelRef.current(i) : goSection(i)),
    fan,
    /** Bring the sections up around (x, y). Sticky: stays open for a tap instead of following a held finger. */
    fanOpen: (x: number, y: number, sticky: boolean) => {
      haptic.drag();
      setFan({ ox: x, oy: y, w: window.innerWidth, pts: layout(x, y, sections.length), sel: null, sticky });
    },
    /** The held finger moved: point at the section it heads for. */
    fanMove: (x: number, y: number) => {
      const f = fanRef.current;
      if (!f || f.sticky) return;
      const sel = pick(f, x, y);
      if (sel !== f.sel) {
        if (sel !== null) haptic.select();
        setFan({ ...f, sel });
      }
    },
    /** Choose a section from the fan (or nothing) and close it. */
    fanChoose: (i: number | null) => {
      setFan(null);
      if (i === null || i === at) return;
      haptic.complete();
      if (travelRef.current) travelRef.current(i);
      else goSection(i);
    },
    /** The held finger let go: go where it pointed. */
    fanRelease: () => {
      const f = fanRef.current;
      if (!f || f.sticky) return;
      setFan(null);
      if (f.sel === null || f.sel === at) return;
      haptic.complete();
      if (travelRef.current) travelRef.current(f.sel);
      else goSection(f.sel);
    },
    fanClose: () => setFan(null),
    secDir,
    sectionTallies,
    byId,
    goSection,
    t,
    ready,
    isClosed,
    marks,
    photos,
    pulses,
    nudges,
    toast,
    open,
    punchTallies,
    toggle: (id: string) => setOpen((o) => (o === id ? null : id)),
    setMark,
    tapCheck,
    pickPhoto,
    removePhoto,
    close,
    say,
  };
}

export type PunchSheet = ReturnType<typeof usePunchSheet>;

/** What a row needs to know about itself, from the sheet. */
export function rowState(s: PunchSheet, c: Instance) {
  const status = s.marks[c.id] ?? null;
  const photos = s.photos[c.id] ?? [];
  return {
    status,
    photos,
    missingPhoto: !!status && status !== "na" && needsPhoto(c.photo.required, status) && photos.length === 0,
    pulse: s.pulses[c.id] ?? 0,
    nudge: s.nudges[c.id] ?? 0,
    open: s.open === c.id,
  };
}
