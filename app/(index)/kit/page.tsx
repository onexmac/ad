import type { Metadata } from "next";
import { getSection } from "@/lib/apps";
import { SectionHome } from "@/components/tech-index/SectionHome";

export const metadata: Metadata = { title: "Kit · MAGI" };

export default function Page() {
  return <SectionHome section={getSection("kit")} />;
}
