import type { Metadata } from "next";
import { sheet } from "@/data/puncheo/formaleta-n1";
import { ScreenB } from "@/components/puncheo/ScreenB";

export const metadata: Metadata = { title: "Puncheo — B" };

export default function Page() {
  return <ScreenB sheet={sheet} />;
}
