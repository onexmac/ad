"use client";

import { BarGate } from "./BarGate";
import { BACK, SPRING_IN } from "./gate";
import { Bone, SkeletonGate } from "./SkeletonGate";

/**
 * Each app's loading.
 *
 * Slow apps get a bar (BarGate): on a slow phone network Updatr and Noticss take 9 to 10 s to come alive and
 * Histok about 3, so a bar that fills tells the truth about the wait.
 *
 * Quick apps get a skeleton (SkeletonGate): their first screen as rounded rectangles, placed where the real
 * cards, lines, keys and bars are (measured on a 393 px wide phone), in the app's own tokens, numbered in reading
 * order: a card, then what is in it.
 */

/* ── Bars ──────────────────────────────────────────────────────────────── */

export function HistokLoading() {
  return <BarGate mark={<HistokLoaderMark />} />;
}

/**
 * Histok's mark while it loads: the H and its "!" (BrandPills: four pills, 8 wide, the tall one 18, the dots 10,
 * 5 apart). The tall one walks down the four and round again, for ever: each dot grows into the "!" as the one
 * before it shrinks back to a dot, on the same spring, so the column keeps its height. Pure CSS, so it moves from
 * the first paint, like The Cubes' cube.
 */
const HK_SLOT = 0.4; // s each pill stands tall
const HK_SWAP = 0.55; // share of a slot spent handing over
function HistokLoaderMark() {
  const period = HK_SLOT * 4;
  const swap = (HK_SWAP * 25).toFixed(2); // % of the cycle
  const css = `
.hk-ld{display:flex;align-items:center;justify-content:center;gap:12px}
.hk-ld-pills{display:flex;flex-direction:column;gap:5px}
.hk-ld-pills i{display:block;width:8px;height:10px;border-radius:4px;opacity:.3;
  animation:hk-ld-walk ${period}s linear infinite}
@keyframes hk-ld-walk{
  0%{height:18px;opacity:1}
  ${(25 - +swap).toFixed(2)}%{height:18px;opacity:1;animation-timing-function:${BACK}}
  25%{height:10px;opacity:.3}
  ${(100 - +swap).toFixed(2)}%{height:10px;opacity:.3;animation-timing-function:${BACK}}
  100%{height:18px;opacity:1}}
@supports (animation-timing-function: linear(0, 1)){
  @keyframes hk-ld-walk{
    0%{height:18px;opacity:1}
    ${(25 - +swap).toFixed(2)}%{height:18px;opacity:1;animation-timing-function:${SPRING_IN}}
    25%{height:10px;opacity:.3}
    ${(100 - +swap).toFixed(2)}%{height:10px;opacity:.3;animation-timing-function:${SPRING_IN}}
    100%{height:18px;opacity:1}}}`;
  return (
    <span className="hk-ld" aria-label="Histok">
      <style>{css}</style>
      <span className="select-none text-6xl font-medium leading-none tracking-tight">H</span>
      <span className="hk-ld-pills" aria-hidden>
        {[0, 1, 2, 3].map((k) => (
          // Pill k stands tall in slot k: its clock runs k slots behind the first's.
          <i key={k} className="bg-current" style={{ animationDelay: `${(k * HK_SLOT - period).toFixed(2)}s` }} />
        ))}
      </span>
    </span>
  );
}

export function UpdatrLoading() {
  return <BarGate mark={<span className="block text-[64px] font-bold leading-[0.8] tracking-[-0.07em]">Updatr</span>} />;
}

export function NoticssLoading() {
  return (
    <BarGate
      mark={
        <span
          className="block text-[64px] font-medium leading-[0.84] tracking-[-0.035em]"
          style={{ fontVariationSettings: '"opsz" 72' }}
        >
          Noticss
        </span>
      }
    />
  );
}

/* ── Skeletons ─────────────────────────────────────────────────────────── */

/**
 * Puncheo: its vvs frame on the black, and in it the top bar with the A/B/C switch, the project card (name, the
 * big code, Planos, the count), the legend, the room (its header, the stage, the key panel, the first check) and
 * the bottom bar with its two keys and Cerrar ficha. The frame is 28 with a 6 px gutter; the corner keys round as
 * the frame's curve drawn in, the rest as the app's own 6.
 */
export function PuncheoSkeleton() {
  const light = "[--skel-bone:var(--card)]";
  const mid = "[--skel-bone:var(--hair)]";
  const dark = "[--skel-bone:var(--hair-2)]";
  return (
    <SkeletonGate shell className="[--skel-sheen:var(--ground)]">
      <div className="skel-shell leia-ground absolute inset-x-0 bottom-[calc(6px+env(safe-area-inset-bottom,0px))] top-[calc(6px+env(safe-area-inset-top,0px))] mx-auto max-w-[552px] overflow-hidden rounded-[28px]">
        {/* top bar, flush with the frame's top (its curve), and on it the name and the switch */}
        <Bone i={0} r="28px 28px 6px 6px" className={`${mid} absolute inset-x-0 top-0 h-[50px]`} />
        <Bone i={1} r={7} className={`${dark} absolute left-[12px] top-[16px] h-[16px] w-[90px]`} />
        <Bone i={2} r={15} className={`${dark} absolute left-1/2 top-[10px] h-[30px] w-[100px] -translate-x-1/2`} />
        {/* project card */}
        <div className="absolute inset-x-4 top-[66px] h-[110px]">
          <Bone i={3} r={6} className={`${light} absolute inset-0`} />
          <Bone i={4} r={6} className={`${dark} absolute left-4 top-[12px] h-[18px] w-[108px]`} />
          <Bone i={5} r={6} className={`${mid} absolute right-4 top-[14px] h-[13px] w-[44%]`} />
          <Bone i={6} r={8} className={`${dark} absolute left-4 top-[56px] h-[40px] w-[79px]`} />
          <Bone i={7} r={4} className={`${dark} absolute left-[111px] top-[59px] h-[36px] w-[93px]`} />
          <Bone i={8} r={6} className={`${dark} absolute right-4 top-[67px] h-[20px] w-[53px]`} />
        </div>
        {/* legend */}
        <div className="absolute inset-x-[28px] top-[194px] h-[12px]">
          <Bone i={9} r={6} className={`${light} absolute left-0 h-full w-[48px]`} />
          <Bone i={10} r={6} className={`${light} absolute left-[66px] h-full w-[72px]`} />
          <Bone i={11} r={6} className={`${light} absolute right-[83px] h-full w-[46px]`} />
          <Bone i={12} r={6} className={`${light} absolute right-[15px] h-full w-[46px]`} />
        </div>
        {/* the room */}
        <div className="absolute inset-x-4 bottom-[60px] top-[230px] overflow-hidden rounded-[6px]">
          <Bone i={13} r={6} className={`${light} absolute inset-0`} />
          <Bone i={14} r="6px 6px 0 0" className={`${dark} absolute inset-x-0 top-0 h-[54px]`} />
          <Bone i={15} r={6} className={`${mid} absolute left-3 top-[66px] h-[18px] w-[99px]`} />
          <Bone i={16} r={6} className={`${mid} absolute left-3 right-6 top-[92px] h-[12px]`} />
          <Bone i={17} r={6} className={`${mid} absolute left-3 top-[108px] h-[12px] w-[50%]`} />
          <Bone i={18} r={0} className={`${mid} absolute inset-x-0 top-[134px] h-[153px]`} />
          <Bone i={19} r={8} className={`${dark} absolute left-3 top-[300px] h-[30px] w-[37px]`} />
          <Bone i={20} r={6} className={`${mid} absolute left-[70px] top-[302px] h-[18px] w-[126px]`} />
          <Bone i={21} r={6} className={`${mid} absolute left-[70px] right-[130px] top-[328px] h-[13px]`} />
          <Bone i={22} r={4} className={`${dark} absolute right-[70px] top-[302px] h-[38px] w-[38px]`} />
          <Bone i={23} r={4} className={`${dark} absolute right-[12px] top-[302px] h-[38px] w-[38px]`} />
        </div>
        {/* bottom bar: the corner key, search, Cerrar ficha */}
        <Bone i={24} r="6px 6px 6px 16px / 6px 6px 6px 20px" className={`${light} absolute bottom-[8px] left-[12px] h-[44px] w-[44px]`} />
        <Bone i={25} r={6} className={`${light} absolute bottom-[8px] left-[64px] h-[44px] w-[44px]`} />
        <Bone i={26} r="6px 6px 16px 6px / 6px 6px 20px 6px" className={`${light} absolute bottom-[8px] left-[116px] right-[12px] h-[44px]`} />
      </div>
    </SkeletonGate>
  );
}

/** pad01: a worker card, the open one (status, name, five rows of label and chip), another card; burger and add. */
export function Pad01Skeleton() {
  const card = "[--skel-bone:var(--color-white)]";
  const line = "[--skel-bone:var(--color-gray-100)]";
  const key = "[--skel-bone:var(--color-gray-200)]";
  const rows = [
    [34, 87],
    [23, 91],
    [42, 93],
    [23, 65],
    [42, 125],
  ];
  let i = 0;
  const closed = () => (
    <div className="relative h-[88px] shrink-0">
      <Bone i={i++} r={16} className={`${card} absolute inset-0`} />
      <Bone i={i++} r={8} className={`${line} absolute left-5 top-[32px] h-[22px] w-[135px]`} />
      <Bone i={i++} r={14} className={`${line} absolute right-[96px] top-[30px] h-[28px] w-[28px]`} />
      <Bone i={i++} r={16} className={`${key} absolute right-5 top-[20px] h-[48px] w-[64px]`} />
    </div>
  );
  return (
    <SkeletonGate className="[--skel-sheen:var(--color-background)]">
      <div className="mx-auto flex max-w-[402px] flex-col gap-4 px-5 pt-6">
        {closed()}
        <div className="relative h-[354px] shrink-0">
          <Bone i={i++} r={16} className={`${card} absolute inset-0`} />
          <Bone i={i++} r={14} className={`${key} absolute left-5 top-[30px] h-[28px] w-[96px]`} />
          <Bone i={i++} r={16} className={`${key} absolute right-5 top-[20px] h-[48px] w-[64px]`} />
          <Bone i={i++} r={8} className={`${line} absolute left-5 top-[89px] h-[24px] w-[267px] max-w-[calc(100%-40px)]`} />
          {rows.map(([label, chip], k) => (
            <div key={k} className="absolute inset-x-5 h-[28px]" style={{ top: 137 + k * 42 }}>
              <Bone i={i++} r={6} className={`${line} absolute left-0 top-[6px] h-[16px]`} style={{ width: label }} />
              <Bone i={i++} r={14} className={`${line} absolute left-[92px] top-0 h-[28px]`} style={{ width: chip + 32 }} />
            </div>
          ))}
        </div>
        {closed()}
      </div>
      <Bone i={i++} r={32} className={`${key} absolute bottom-[calc(32px+env(safe-area-inset-bottom,0px))] left-4 h-[80px] w-[80px]`} />
      <Bone i={i++} r={24} className={`${key} absolute bottom-[calc(32px+env(safe-area-inset-bottom,0px))] right-4 h-[80px] w-[84px]`} />
    </SkeletonGate>
  );
}

/** pad02: the title, five user rows (avatar, name, area, status), the filter bar and the add button. */
export function Pad02Skeleton() {
  const card = "[--skel-bone:var(--color-white)]";
  const line = "[--skel-bone:var(--color-gray-100)]";
  const key = "[--skel-bone:var(--color-gray-200)]";
  let i = 0;
  return (
    <SkeletonGate className="[--skel-sheen:var(--color-background)]">
      <div className="mx-auto flex max-w-[402px] flex-col px-4 pt-8">
        <Bone i={i++} r={8} className={`${key} ml-1 mt-[6px] h-[24px] w-[138px]`} />
        <div className="mt-[32px] flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((k) => (
            <div key={k} className="relative h-[82px] shrink-0">
              <Bone i={i++} r={24} className={`${card} absolute inset-0`} />
              <Bone i={i++} r={22} className={`${line} absolute left-5 top-[19px] h-[44px] w-[44px]`} />
              <Bone i={i++} r={7} className={`${line} absolute left-[76px] top-[22px] h-[16px] w-[91px]`} />
              <Bone i={i++} r={6} className={`${line} absolute left-[76px] top-[48px] h-[12px] w-[140px]`} />
              <Bone i={i++} r={14} className={`${key} absolute right-[22px] top-[27px] h-[28px] w-[28px]`} />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] mx-auto h-[80px] max-w-[402px]">
        <Bone i={i++} r={5} className={`${key} absolute bottom-[62px] left-6 h-[10px] w-[64px]`} />
        <div className="absolute bottom-0 left-4 h-[52px] w-[257px] max-w-[calc(100%-124px)]">
          <Bone i={i++} r={24} className={`${key} absolute inset-0`} />
          <Bone i={i++} r={20} className={`${card} absolute left-1 top-1 h-[44px] w-[83px]`} />
        </div>
        <Bone i={i++} r={24} className={`${key} absolute bottom-0 right-6 h-[80px] w-[84px]`} />
      </div>
    </SkeletonGate>
  );
}

/** pad03 (the Swift screen): a worker card, the open one (status, name, five label and value rows), another card; burger and add. */
export function Pad03Skeleton() {
  const card = "[--skel-bone:var(--color-card)]";
  const line = "[--skel-bone:var(--color-card-muted)]";
  const rows = [
    [29, 88],
    [19, 73],
    [37, 77],
    [19, 41],
    [37, 116],
  ];
  let i = 0;
  const closed = () => (
    <div className="relative h-[96px] shrink-0">
      <Bone i={i++} r={24} className={`${card} absolute inset-0`} />
      <Bone i={i++} r={8} className={`${line} absolute left-5 top-[38px] h-[20px] w-[145px]`} />
      <Bone i={i++} r={9} className={`${line} absolute right-[99px] top-[39px] h-[18px] w-[18px]`} />
      <Bone i={i++} r={14} className={`${line} absolute right-5 top-[20px] h-[56px] w-[60px]`} />
    </div>
  );
  return (
    <SkeletonGate className="[--skel-sheen:var(--color-background)]">
      <div className="mx-auto flex max-w-[402px] flex-col gap-4 px-[14px] pt-6">
        {closed()}
        <div className="relative h-[409px] shrink-0">
          <Bone i={i++} r={24} className={`${card} absolute inset-0`} />
          <Bone i={i++} r={12} className={`${line} absolute left-5 top-[36px] h-[25px] w-[80px]`} />
          <Bone i={i++} r={14} className={`${line} absolute right-5 top-[20px] h-[56px] w-[60px]`} />
          <Bone i={i++} r={8} className={`${line} absolute left-5 top-[92px] h-[24px] w-[290px] max-w-[calc(100%-40px)]`} />
          {rows.map(([label, value], k) => (
            <div key={k} className="absolute inset-x-5 h-[20px]" style={{ top: 151 + k * 53 }}>
              <Bone i={i++} r={6} className={`${line} absolute left-0 top-[2px] h-[14px]`} style={{ width: label }} />
              <Bone i={i++} r={7} className={`${line} absolute right-0 top-0 h-[18px]`} style={{ width: value }} />
            </div>
          ))}
        </div>
        {closed()}
      </div>
      <Bone i={i++} r={24} className={`${line} absolute bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-4 h-[80px] w-[84px]`} />
      <Bone i={i++} r={24} className={`${line} absolute bottom-[calc(24px+env(safe-area-inset-bottom,0px))] right-4 h-[80px] w-[84px]`} />
    </SkeletonGate>
  );
}
