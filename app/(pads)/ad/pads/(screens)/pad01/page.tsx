"use client";

import { useState } from "react";
import { WorkerCard } from "@/components/pads/p2/worker-card";
import { MobileMorphSheet } from "@/components/pads/p2/mobile-morph-sheet";
import { mockWorkers } from "@/lib/pads/mock-workers";
import { BurgerMenu } from "@/components/pads/burger-menu";
import { Pad01Skeleton } from "@/components/loading/apps";

export default function P2Page() {
  const [expandedId, setExpandedId] = useState<string | null>("2");
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className="relative mx-auto flex min-h-screen w-full max-w-[402px] flex-col bg-background pb-32">
        <div className="flex flex-col gap-4 px-5 pt-6">
          {mockWorkers.map((w) => (
            <WorkerCard
              key={w.id}
              worker={w}
              expanded={expandedId === w.id}
              onToggle={() => setExpandedId((curr) => (curr === w.id ? null : w.id))}
            />
          ))}
        </div>

        {/* Bottom nav: burger and its menu (left), add (right, MobileMorphSheet).
            The burger slides out while the sheet is open, as in Swift. */}
        <BurgerMenu left={16} bottom={32} width={80} height={80} radius={32} z={25} hidden={sheetOpen} />

        <MobileMorphSheet onOpenChange={setSheetOpen} />
      </div>
      <Pad01Skeleton />
    </>
  );
}
