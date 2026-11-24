"use client";

import { useState } from "react";
import type { Item } from "@/data/updatr/types";
import { setVerdict, useTaste, verdictOf, type Verdict } from "@/lib/updatr/taste";
import { LikeFan, type Fan } from "./LikeFan";

/**
 * More like this, or less: the open entry's verdict, through the like fan.
 * Picking the verdict already given takes it back. It teaches the taste model
 * (lib/updatr/taste.ts), which picks part of the next issue.
 */
export function ItemLike({ item, say }: { item: Item; say: (text: string) => void }) {
  useTaste();
  const [fan, setFan] = useState<Fan>(null);
  const verdict = verdictOf(item.id);
  const choose = (v: Verdict) => {
    const next = verdict === v ? null : v;
    setVerdict(item, next);
    say(next === "like" ? "More like this" : next === "dislike" ? "Less like this" : "No opinion");
  };
  return <LikeFan verdict={verdict} fan={fan} setFan={setFan} onChoose={choose} enabled />;
}
