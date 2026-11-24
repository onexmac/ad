"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  appReady,
  BACK,
  clock,
  fellBack,
  hold,
  HOLD_KEYFRAMES,
  later,
  NOSCRIPT,
  REVEAL,
  REVEAL_MS,
  SPRING_IN,
  SPRING_OUT,
  WAIT,
} from "./gate";

/**
 * A loading bar, for an app that loads slowly (Histok, Updatr, Noticss): The Cubes' loader, in the app's colours.
 * On the app's own ground, its mark at the centre and, three quarters down, a stroked bar whose fill shows real
 * progress.
 *
 * The page renders it beside its content: `<><App /><BarGate mark={…} /></>`. The bar is drawn in the page's text
 * colour (`--ld-ink`, by default `currentColor`); the ground is the page's own, showing through.
 *
 * - Before any script, the fill creeps on a curve of its own (CSS), so it moves from the first paint.
 * - A small inline script, run as the page is parsed, then fills it as the app's scripts arrive (the resource
 *   timings of the page's `<script src>`), up to 80%.
 * - Hydrated, the gate takes over: 85%, then the fonts and the pictures of the first screen to 100%.
 * - Full, the mark and the bar spring out and the app fades in under them.
 *
 * Nothing shows for the first 140 ms: a quick load just fades the app in. If the scripts never run, the page shows
 * itself after 20 s (at once with scripting off).
 */

const CAP = 6000; // ms: the bar can wait longer than a skeleton for the first screen's pictures
const MIN_SHOWN = 450; // ms the bar stays at least, once it has shown
const FILL_MS = 320; // ms the fill takes to catch up
const OUT_MS = 460; // ms the mark and bar take to go
const FALLBACK = 20; // s

const BASE = `
[data-skeleton-gate].ld-gate{position:fixed;inset:0;z-index:2147483000;pointer-events:none;--ld-ink:currentColor;
  animation:skel-gone 0s ${FALLBACK}s both}
.ld-stage{position:absolute;inset:0;
  animation:skel-in-fade 260ms cubic-bezier(.2,.8,.3,1) ${WAIT}ms both,ld-in-scale 640ms ${BACK} ${WAIT}ms both}
@supports (animation-timing-function: linear(0, 1)){.ld-stage{animation-timing-function:cubic-bezier(.2,.8,.3,1),${SPRING_IN}}}
.ld-mark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:var(--ld-ink);white-space:nowrap}
.ld-bar{position:absolute;left:50%;top:75%;transform:translate(-50%,-50%);box-sizing:border-box;display:block;
  width:min(48vw,200px);height:12px;padding:2px;border:1.5px solid var(--ld-ink);border-radius:6px}
.ld-track{display:block;height:100%;border-radius:2.5px;overflow:hidden}
.ld-fill{display:block;height:100%;border-radius:2.5px;background:var(--ld-ink);transform:translateX(-100%);
  animation:ld-creep 14s cubic-bezier(.08,.72,.12,1) forwards;transition:transform ${FILL_MS}ms cubic-bezier(.2,.8,.3,1)}
[data-skeleton-gate].ld-gate.ld-out{animation:skel-out-fade ${OUT_MS}ms cubic-bezier(.4,0,.6,1) both}
.ld-out .ld-stage{animation:ld-out-scale ${OUT_MS}ms ${BACK} both}
@supports (animation-timing-function: linear(0, 1)){.ld-out .ld-stage{animation-timing-function:${SPRING_OUT}}}
.ld-skip{display:none}
@keyframes skel-in-fade{from{opacity:0}to{opacity:1}}
@keyframes skel-out-fade{from{opacity:1}to{opacity:0}}
@keyframes ld-in-scale{from{transform:scale(.94)}to{transform:scale(1)}}
@keyframes ld-out-scale{from{transform:scale(1)}to{transform:scale(.94)}}
@keyframes ld-creep{to{transform:translateX(-35%)}}
${HOLD_KEYFRAMES}
@media (prefers-reduced-motion: reduce){.ld-stage,.ld-out .ld-stage{animation-duration:1ms}}
`;

// Runs as the page is parsed, before the app's scripts: fills the bar as they arrive. It leaves `__ld` on the
// gate for the component to carry on with once it hydrates.
const PROGRESS = `(function(){var s=document.currentScript,g=s&&s.parentNode;if(!g||g.__ld)return;
var f=g.querySelector('.ld-fill');if(!f)return;var t0=Date.now(),real=0,shown=0;
function paint(){var t=(Date.now()-t0)/1000,p=Math.max(real,0.7*(1-Math.exp(-t/5)));if(p>shown)shown=p;
f.style.transform='translateX('+(shown*100-100)+'%)';}
function scripts(){var l=document.querySelectorAll('script[src]'),k=0,seen={},e=performance.getEntriesByType('resource');
for(var i=0;i<e.length;i++)seen[e[i].name]=1;for(var j=0;j<l.length;j++)if(seen[l[j].src])k++;return l.length?k/l.length:1;}
f.style.animation='none';
var iv=setInterval(function(){real=Math.max(real,0.08+0.72*scripts());paint();},120);
g.__ld={set:function(p){real=Math.max(real,p);paint();},stop:function(){clearInterval(iv);}};paint();})();`;

type Phase = "hold" | "reveal" | "done";
type Ld = { set: (p: number) => void; stop: () => void };

export function BarGate({ mark, className = "" }: { mark: ReactNode; className?: string }) {
  const gate = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("hold");
  const [mode, setMode] = useState<"" | "ld-out" | "ld-skip">("");

  useEffect(() => {
    let live = true;
    const timers: number[] = [];
    const el = gate.current as (HTMLDivElement & { __ld?: Ld }) | null;
    const fill = el?.querySelector<HTMLElement>(".ld-fill");
    // The inline script ran if the page came from the server; after a move inside the app it didn't.
    let shown = 0;
    const ld: Ld = el?.__ld ?? {
      set(p) {
        if (!fill || p <= shown) return;
        shown = p;
        fill.style.animation = "none";
        fill.style.transform = `translateX(${p * 100 - 100}%)`;
      },
      stop() {},
    };
    (async () => {
      ld.set(0.85);
      await appReady(el, CAP, timers, (p) => ld.set(0.85 + 0.15 * p));
      ld.stop();
      if (!live) return;
      if (fellBack(el)) return setPhase("done");
      const stage = el?.querySelector(".ld-stage");
      const since = clock(stage, "skel-in-fade") - WAIT;
      if (since < 0) {
        // Ready before the bar showed: the app just fades in.
        setMode("ld-skip");
        setPhase("reveal");
        await later(REVEAL_MS + 60, timers);
      } else {
        ld.set(1);
        await later(Math.max(FILL_MS, MIN_SHOWN - since), timers);
        if (!live) return;
        setMode("ld-out");
        setPhase("reveal");
        await later(Math.max(OUT_MS, REVEAL_MS) + 60, timers);
      }
      if (live) setPhase("done");
    })();
    return () => {
      live = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  if (phase === "done") return null;
  return (
    <div ref={gate} data-skeleton-gate aria-hidden className={`ld-gate ${mode} ${className}`}>
      <style>{BASE}</style>
      <style>{phase === "hold" ? hold(FALLBACK) : REVEAL}</style>
      <noscript>
        <style>{NOSCRIPT}</style>
      </noscript>
      <div className="ld-stage">
        <div className="ld-mark">{mark}</div>
        <span className="ld-bar">
          <span className="ld-track">
            <i className="ld-fill" />
          </span>
        </span>
      </div>
      <script dangerouslySetInnerHTML={{ __html: PROGRESS }} />
    </div>
  );
}
