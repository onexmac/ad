"use client";

import { Bone, SkeletonGate } from "./SkeletonGate";

/**
 * Each app's skeleton: its first screen drawn in blocks, in the app's own
 * tokens, numbered top to bottom for the cascade. Kept close to the real
 * layout so the app fades in where its bones were.
 */

/** Updatr: the issue line, the masthead, the cover. */
export function UpdatrSkeleton() {
  return (
    <SkeletonGate className="[--skel-bone:var(--rule-soft)] [--skel-sheen:var(--paper)]">
      <div className="mx-auto flex h-full max-w-[520px] flex-col pt-[calc(18px+var(--sat))]">
        <div className="flex justify-between px-5">
          <Bone i={0} className="h-[10px] w-[72px]" />
          <Bone i={1} className="h-[10px] w-[56px]" />
          <Bone i={2} className="h-[10px] w-[72px]" />
        </div>
        <Bone i={3} className="mx-5 mt-5 h-[68px] w-[58%]" />
        <Bone i={4} className="mt-6 min-h-0 flex-1" />
        <div className="flex flex-col gap-2 px-5 py-4">
          <Bone i={5} className="h-[10px] w-[44%]" />
          <Bone i={6} className="h-[22px] w-[78%]" />
        </div>
      </div>
    </SkeletonGate>
  );
}

/** Noticss: the masthead between its rules, the date line, the lead picture. */
export function NoticssSkeleton() {
  return (
    <SkeletonGate className="[--skel-bone:var(--rule-soft)] [--skel-sheen:var(--paper)]">
      <div className="mx-auto flex h-full max-w-[560px] flex-col px-[22px] pt-[calc(14px+var(--sat))]">
        <div className="flex justify-between">
          <Bone i={0} className="h-[10px] w-[36px]" />
          <Bone i={1} className="h-[10px] w-[76px]" />
        </div>
        <Bone i={2} className="mx-auto mt-3 h-[62px] w-[74%]" />
        <Bone i={3} className="mt-4 h-[2px] w-full" />
        <div className="mt-3 flex justify-between">
          <Bone i={4} className="h-[10px] w-[46%]" />
          <Bone i={5} className="h-[10px] w-[24%]" />
        </div>
        <Bone i={6} className="mt-3 h-px w-full" />
        <Bone i={7} className="mb-[calc(16px+var(--sab))] mt-5 min-h-0 flex-1" />
      </div>
    </SkeletonGate>
  );
}

/**
 * Puncheo: its vvs frame on the black, and in it the bar, the project card,
 * the legend, the room, the sheet and the bottom bar. The frame is 28 with a
 * 6 px gutter, so nothing inside rounds past 22.
 */
export function PuncheoSkeleton() {
  return (
    <SkeletonGate shell className="[--skel-bone:var(--hair-2)] [--skel-sheen:var(--card)]">
      <div className="skel-shell leia-ground absolute inset-x-0 bottom-[calc(6px+env(safe-area-inset-bottom,0px))] top-[calc(6px+env(safe-area-inset-top,0px))] mx-auto flex max-w-[552px] flex-col gap-[6px] overflow-hidden rounded-[28px] p-[6px]">
        <Bone i={0} className="h-[40px] shrink-0 rounded-[22px]" />
        <Bone i={1} className="mx-[8px] h-[92px] shrink-0 rounded-[10px]" />
        <Bone i={2} className="mx-auto my-[6px] h-[8px] w-[78%] shrink-0 rounded-full" />
        <Bone i={3} className="mx-[8px] h-[48px] shrink-0 rounded-[10px]" />
        <Bone i={4} className="mx-[8px] min-h-0 flex-1 rounded-[10px]" />
        <Bone i={5} className="h-[52px] shrink-0 rounded-[22px]" />
      </div>
    </SkeletonGate>
  );
}

/** pad01 and pad03: worker cards (one open), the burger and the add button. */
export function PadCardsSkeleton({ swift = false }: { swift?: boolean }) {
  // pad03 (Swift) has its own tokens: card and card-muted; pad01 uses the screens' white and grays.
  const card = swift ? "[--skel-bone:var(--color-card)]" : "[--skel-bone:var(--color-white)]";
  const line = swift ? "[--skel-bone:var(--color-card-muted)]" : "[--skel-bone:var(--color-gray-100)]";
  return (
    <SkeletonGate className="[--skel-sheen:var(--color-background)]">
      <div className={`mx-auto flex h-full max-w-[402px] flex-col gap-4 pt-6 ${swift ? "px-[14px]" : "px-5"}`}>
        <Bone i={0} className={`${card} h-[84px] shrink-0 rounded-[32px]`} />
        <div className="relative h-[300px] shrink-0">
          <Bone i={1} className={`${card} absolute inset-0 rounded-[32px]`} />
          <div className="absolute inset-x-5 top-6 flex flex-col gap-4">
            <Bone i={2} className={`${line} h-[26px] w-[34%] rounded-full`} />
            <Bone i={3} className={`${line} h-[18px] w-[76%] rounded-full`} />
            <Bone i={4} className={`${line} h-[14px] w-[60%] rounded-full`} />
            <Bone i={5} className={`${line} h-[14px] w-[66%] rounded-full`} />
            <Bone i={6} className={`${line} h-[14px] w-[52%] rounded-full`} />
          </div>
        </div>
        <Bone i={7} className={`${card} h-[84px] shrink-0 rounded-[32px]`} />
      </div>
      <Bone i={8} className="[--skel-bone:var(--color-gray-200)] absolute bottom-[calc(32px+env(safe-area-inset-bottom,0px))] left-4 h-[72px] w-[72px] rounded-[28px]" />
      <Bone i={9} className="[--skel-bone:var(--color-gray-200)] absolute bottom-[calc(32px+env(safe-area-inset-bottom,0px))] right-4 h-[72px] w-[72px] rounded-[28px]" />
    </SkeletonGate>
  );
}

/** pad02: the title, the user rows, the filter bar and the add button. */
export function PadListSkeleton() {
  const card = "[--skel-bone:var(--color-white)]";
  return (
    <SkeletonGate className="[--skel-sheen:var(--color-background)]">
      <div className="mx-auto flex h-full max-w-[402px] flex-col gap-3 px-4 pt-8">
        <Bone i={0} className="[--skel-bone:var(--color-gray-200)] mx-1 mb-2 h-[28px] w-[150px] rounded-[8px]" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Bone key={i} i={i} className={`${card} h-[66px] shrink-0 rounded-[24px]`} />
        ))}
      </div>
      <Bone i={7} className="[--skel-bone:var(--color-gray-200)] absolute bottom-[calc(28px+env(safe-area-inset-bottom,0px))] left-4 h-[56px] w-[58%] max-w-[230px] rounded-full" />
      <Bone i={8} className="[--skel-bone:var(--color-gray-200)] absolute bottom-[calc(22px+env(safe-area-inset-bottom,0px))] right-4 h-[68px] w-[68px] rounded-[24px]" />
    </SkeletonGate>
  );
}
