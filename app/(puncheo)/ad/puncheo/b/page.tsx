import type { Metadata } from "next";
import { roomSheet as sheet } from "@/data/puncheo/rooms";
import { ScreenB } from "@/components/puncheo/ScreenB";

export const metadata: Metadata = { title: "Puncheo — B" };

export default function Page() {
  return <ScreenB sheet={sheet} />;
}
