"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/histok/haptic";

const CHANGELOG = "/kit/ps2-fiori/changelog";

/**
 * PS2 Fiori: the inventory screen. The markup is the artifact's, as it was; lib/ps2-fiori/scene.js mounts the mixer
 * and the controls on it. The version sits under the tabs and opens the list of changes (docs/changelog.md).
 */
export function Inventory({ version }: { version: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [log, setLog] = useState(false);
  const logRef = useRef(false);
  useEffect(() => { logRef.current = log; }, [log]);

  useEffect(() => {
    let gone = false, mixer: { dispose(): void } | null = null;
    import("@/lib/ps2-fiori/scene").then(({ mountMixer }) => {
      if (gone || !root.current) return;
      mixer = mountMixer(root.current, { paused: () => logRef.current });
    });
    return () => { gone = true; mixer?.dispose(); };
  }, []);

  const openLog = () => { setLog(true); haptic.select(); };
  const closeLog = useCallback(() => { setLog(false); haptic.select(); }, []);

  return (
    <div ref={root} className="pf">
      <div id="stage">
        <canvas id="gl" />
        <canvas id="glow" />
        <div className="fx-scan" />
        <div className="fx-vig" />
        <div id="flash" />
      </div>

      <header className="hud" id="hud">
        <div>
          <div className="kicker">INVENTORY</div>
          <div className="tabs"><span>ITEMS</span><span>KEY</span><span className="on">EQUIPMENT</span></div>
          {version && <button type="button" className="ver" onClick={openLog} aria-label={`Version ${version}: list of changes`}>VER {version}</button>}
        </div>
        <div className="meter" aria-label="Concrete poured">
          <div className="meter-top"><span>CONCRETE</span><b id="mVal">1.8 m³</b></div>
          <div className="meter-bar"><i id="mBar" /></div>
          <button id="bTheme" className="sel-chip" type="button"><i className="g g-sel">SELECT</i><span id="themeLbl">Light</span></button>
        </div>
      </header>

      <div id="hint">◂ DRAG TO INSPECT ▸</div>
      <div id="toast" role="status" aria-live="polite" />
      <div id="pop">+1.8 m³ CONCRETE</div>

      <section className="panel" id="panel">
        <div className="p-head">
          <div>
            <div className="p-tag">EQUIPMENT · <span className="stars">★★★★☆</span></div>
            <h1 className="p-name"><small>MAZA · MZ-20</small>Self-Loading Mixer</h1>
          </div>
          <div className="p-qty">×<b>1</b></div>
        </div>
        <p className="p-desc" id="desc" />
        <div className="p-stats">
          <div className="stat"><span>CAPACITY</span><b>1.8 m³</b><div className="seg" data-v="6" /></div>
          <div className="stat"><span>TRACTION</span><b>4×4</b><div className="seg" data-v="8" /></div>
          <div className="stat"><span>SPEED</span><b>25 km/h</b><div className="seg" data-v="3" /></div>
        </div>
        <nav className="p-btns">
          <button id="bMix" type="button"><i className="g"><svg viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></i><span>Mix</span></button>
          <button id="bLoad" type="button"><i className="g"><svg viewBox="0 0 10 10"><path d="M5 1.4L9 8.4H1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg></i><span>Load</span></button>
          <button id="bSpin" type="button" aria-pressed="true"><i className="g"><svg viewBox="0 0 10 10"><rect x="1.8" y="1.8" width="6.4" height="6.4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg></i><span>Spin</span></button>
        </nav>
      </section>

      <Changes open={log} onClose={closeLog} />
    </div>
  );
}

/* ---------- The list of changes ---------- */

type Entry = { ver: string; date: string; said: { text: string; bug: boolean }[]; claude: string[]; more: string[] };

// The entry format of docs/changelog.md: `## x.y.z · date`, Claude's line, what Marcos said (an ask or a bug), details.
function parseLog(md: string): Entry[] {
  const out: Entry[] = [];
  let cur: Entry | null = null, inBug = false;
  for (const l of md.split("\n")) {
    const h = /^## (\d+\.\d+\.\d+) · (.+)$/.exec(l);
    if (h) { cur = { ver: h[1], date: h[2], said: [], claude: [], more: [] }; out.push(cur); inBug = false; continue; }
    if (/^## /.test(l)) { cur = null; continue; }
    if (!cur) continue;
    let m: RegExpExecArray | null;
    if ((m = /^\*\*Claude:\*\*\s*(.*)$/.exec(l))) { cur.claude.push(m[1]); inBug = false; }
    else if ((m = /^Asked by Marcos,? (.*?): "(.*)"\s*$/.exec(l))) { cur.said.push({ text: m[2], bug: false }); inBug = false; }
    else if ((m = /^- \*\*Bug fix\.\*\* Marcos,? (.*?): "(.*)"\s*$/.exec(l))) { cur.said.push({ text: m[2], bug: true }); inBug = true; }
    else if (inBug && /^\s{2,}- /.test(l)) cur.more.push(l.replace(/^\s{2}/, ""));
    else { if (/^\S/.test(l)) inBug = false; cur.more.push(l); }
  }
  return out;
}

// **bold**, `code` and [links](url): all the inline Markdown an entry uses.
function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1]) out.push(<b key={k++}>{m[1]}</b>);
    else if (m[2]) out.push(<code key={k++}>{m[2]}</code>);
    else out.push(<a key={k++} href={m[4]} target="_blank" rel="noreferrer">{m[3]}</a>);
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

// The details as nested lists and paragraphs, by their indentation.
function Details({ lines }: { lines: string[] }) {
  type Node = { text: string; kids: Node[] };
  const blocks: ({ p: string } | { list: Node[] })[] = [];
  let stack: Node[][] = [];
  for (const raw of lines) {
    if (!raw.trim()) { stack = []; continue; }
    const li = /^(\s*)- (.*)$/.exec(raw);
    if (li) {
      const depth = Math.floor(li[1].length / 2);
      if (!stack.length) { const list: Node[] = []; blocks.push({ list }); stack = [list]; }
      while (stack.length > depth + 1) stack.pop();
      while (stack.length < depth + 1) { const up = stack[stack.length - 1]; const parent = up[up.length - 1]; if (!parent) break; stack.push(parent.kids); }
      stack[stack.length - 1].push({ text: li[2], kids: [] });
    } else if (stack.length && /^\s+\S/.test(raw)) {
      const list = stack[stack.length - 1]; const last = list[list.length - 1]; if (last) last.text += " " + raw.trim();
    } else { stack = []; blocks.push({ p: raw.trim() }); }
  }
  const ul = (nodes: Node[]) => <ul>{nodes.map((n, i) => <li key={i}>{inline(n.text)}{n.kids.length > 0 && ul(n.kids)}</li>)}</ul>;
  return <div className="details">{blocks.map((b, i) => ("p" in b ? <p key={i}>{inline(b.p)}</p> : <div key={i}>{ul(b.list)}</div>))}</div>;
}

function Changes({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sheet = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);

  // fetched the first time it opens, so the page stays light
  useEffect(() => {
    if (!open || entries) return;
    fetch(CHANGELOG).then((r) => (r.ok ? r.text() : Promise.reject(r.status))).then((md) => setEntries(parseLog(md))).catch(() => setFailed(true));
  }, [open, entries]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    // Safari's back swipe from the left edge would leave the app: hold it while the sheet is open
    const edge = (e: TouchEvent) => { const t = e.touches[0]; if (t && t.clientX < 30 && !(e.target as Element).closest("a,button")) e.preventDefault(); };
    window.addEventListener("keydown", key);
    document.addEventListener("touchstart", edge, { passive: false, capture: true });
    return () => { window.removeEventListener("keydown", key); document.removeEventListener("touchstart", edge, { capture: true }); };
  }, [open, onClose]);

  // pull down from its top, slide right, or push on past its end: it follows, and closes past a mark
  useEffect(() => {
    const el = sheet.current, sc = scroll.current;
    if (!el || !sc) return;
    let g: { id: number; x: number; y: number; top: boolean; end: boolean; mode: string; d: number } | null = null;
    const settle = () => { el.style.transition = ""; el.style.transform = ""; };
    const start = (e: TouchEvent) => {
      if (g) { if (g.mode && g.mode !== "scroll") settle(); g = null; return; }   // a second finger settles it
      const t = e.touches[0];
      g = { id: t.identifier, x: t.clientX, y: t.clientY, top: sc.scrollTop <= 0, end: sc.scrollTop >= sc.scrollHeight - sc.clientHeight - 1, mode: "", d: 0 };
    };
    const move = (e: TouchEvent) => {
      if (!g) return;
      const t = Array.from(e.touches).find((x) => x.identifier === g!.id);
      if (!t) return;
      const dx = t.clientX - g.x, dy = t.clientY - g.y;
      if (!g.mode) {
        if (Math.hypot(dx, dy) < 8) return;
        g.mode = dx > Math.abs(dy) ? "side" : g.top && dy > 0 ? "down" : g.end && dy < 0 ? "past" : "scroll";
      }
      if (g.mode === "scroll") return;
      if (e.cancelable) e.preventDefault(); else { g.mode = "scroll"; settle(); return; }
      g.d = Math.max(0, g.mode === "side" ? dx : g.mode === "down" ? dy : -dy);
      el.style.transition = "none";
      el.style.transform = g.mode === "side" ? `translateX(${g.d}px)` : g.mode === "down" ? `translateY(${g.d * 0.7}px)` : `translateY(${-Math.min(48, g.d * 0.25)}px)`;
    };
    const end = (e: TouchEvent) => {
      if (!g || !Array.from(e.changedTouches).some((x) => x.identifier === g!.id)) return;
      const go = e.type === "touchend" && g.mode && g.mode !== "scroll" && g.d > (g.mode === "past" ? 110 : 80);
      if (go) { el.style.transition = ""; el.style.transform = ""; onClose(); } else settle();
      g = null;
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, [onClose]);

  return (
    <div className={`log-dim${open ? " open" : ""}`} aria-hidden={!open}>
      <div ref={sheet} className="log" role="dialog" aria-modal="true" aria-label="Changes" inert={!open}>
        <div ref={scroll} className="log-scroll">
          <div className="kicker">CHANGES</div>
          <div className="tabs"><span className="on">SYSTEM LOG</span></div>
          <div className="log-body">
            {failed ? <p className="log-note">The list could not be loaded.</p> : !entries ? <p className="log-note">LOADING…</p> : entries.map((e) => (
              <article key={e.ver} className="rel">
                <h3><span className="num">{e.ver}</span><span>{e.date}</span></h3>
                {e.said.map((q, i) => <p key={i} className="said"><b>{q.bug ? "Input (bug)" : "Input"}</b>{q.text}</p>)}
                {e.claude.map((c, i) => <p key={i} className="claude"><b>Output</b>{inline(c)}</p>)}
                {e.more.some((l) => l.trim()) && <Details lines={e.more} />}
              </article>
            ))}
          </div>
        </div>
        <div className="log-foot">
          <button type="button" className="log-close" onClick={onClose}><i className="g"><svg viewBox="0 0 10 10"><path d="M5 1.4L9 8.4H1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg></i><span>Close</span></button>
        </div>
      </div>
    </div>
  );
}
