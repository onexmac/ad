import type { Metadata } from "next";
import { roomSheet as sheet } from "@/data/puncheo/rooms";
import { ScreenC } from "@/components/puncheo/ScreenC";

export const metadata: Metadata = { title: "Puncheo — C" };

export default function Page() {
  return <ScreenC sheet={sheet} />;
}
