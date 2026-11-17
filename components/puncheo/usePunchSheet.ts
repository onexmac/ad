"use client";

import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { haptic } from "@/lib/histok/haptic";
import type { Check } from "@/data/puncheo/formaleta-n1";
import type { Instance, RoomSheet, Section } from "@/data/puncheo/rooms";

/** A section in the one walk through the sheet: which punch it belongs to, and its place in it. */
export type WalkSection = Section & { p: number; phase: string };
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
  // One walk through the whole sheet: the pre-armado rooms, then the pre-chorrea
  // rooms. The punch is no longer a tab, just where the current section belongs.
  const sections: WalkSection[] = sheet.punches.flatMap((p, pi) => p.sections.map((x) => ({ ...x, p: pi, phase: p.name })));
  const [section, setSection] = useState(0);
  // Direction of the last section change: +1 came from above (slides up), -1 from below.
  const [secDir, setSecDir] = useState(0);
  // Direction of the last change of punch; 0 until the first one, so the first punch doesn't slide in.
  const [dir, setDir] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const [nudges, setNudges] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ msg: string; n: number } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const at = Math.min(section, sections.length - 1);
  const sec = sections[at];
  const tab = sec.p;
  const punch = sheet.punches[tab];
  const t = tally(punch.checks, marks, photos);
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
    if (sections[i].p !== tab) setDir(sections[i].p > tab ? 1 : -1);
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
      const show = () => document.querySelector(`[data-check="${CSS.escape(offenders[0].id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      const where = sections.findIndex((x) => x.ids.includes(offenders[0].id));
      if (where >= 0 && where !== at) goSection(where, () => setTimeout(show, 60));
      else show();
      return;
    }
    haptic.complete();
    // An event handler (the close button), not render: the time stamp is the point.
    // eslint-disable-next-line react-hooks/purity
    setClosed(punch.id, Date.now());
    say(`Ficha cerrada · ${punch.name}`);
  };

  const punchTallies = sheet.punches.map((p) => ({ ...tally(p.checks, marks, photos), closed: !!closed[p.id] }));
  const all = sheet.punches.flatMap((p) => p.checks);
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
    secDir,
    sectionTallies,
    byId,
    goSection,
    tab,
    dir,
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
