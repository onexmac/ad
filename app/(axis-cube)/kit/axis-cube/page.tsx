"use client";

import { useEffect, useRef } from "react";
import { mountAxisCube } from "@/lib/axis-cube/scene";

export default function Page() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => (host.current ? mountAxisCube(host.current) : undefined), []);
  return <div ref={host} className="axis" />;
}
