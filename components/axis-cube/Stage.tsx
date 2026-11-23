"use client";

import { useEffect, useRef } from "react";
import { mountAxisCube } from "@/lib/axis-cube/scene";

/** The scene, mounted into one element. `look`: a analogue (film), b brush (ink and paint), c classic (cel-era night). */
export function Stage({ look = "a" }: { look?: "a" | "b" | "c" }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => (host.current ? mountAxisCube(host.current, { look }) : undefined), [look]);
  return <div ref={host} className="axis" />;
}
