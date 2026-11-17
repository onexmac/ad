import type { Metadata } from "next";
import { roomSheet } from "@/data/puncheo/rooms";
import { PunchApp } from "@/components/puncheo/PunchApp";

export const metadata: Metadata = { title: "Puncheo — legado A" };

export default function Page() {
  return <PunchApp sheet={roomSheet} variant="a" />;
}
