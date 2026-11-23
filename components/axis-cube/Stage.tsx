"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { mountAxisCube } from "@/lib/axis-cube/scene";

type Look = "a" | "b" | "c";

/** The room and its puzzles. Each look has its own route; the picker in the scene moves between them. */
export function Stage({ look = "a" }: { look?: Look }) {
  const host = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(
    () => (host.current ? mountAxisCube(host.current, { look, onLook: (k: Look) => router.replace(`/kit/axis-cube/${k}`) }) : undefined),
    [look, router],
  );
  return <div ref={host} className="axis" />;
}
