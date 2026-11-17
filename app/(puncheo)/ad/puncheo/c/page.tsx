import type { Metadata } from "next";
import { sheet } from "@/data/puncheo/formaleta-n1";
import { ScreenC } from "@/components/puncheo/ScreenC";

export const metadata: Metadata = { title: "Puncheo — C" };

export default function Page() {
  return <ScreenC sheet={sheet} />;
}
