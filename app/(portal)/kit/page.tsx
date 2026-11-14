import type { Metadata } from "next";
import { SectionIndex } from "@/components/section-index";

export const metadata: Metadata = { title: "Kit" };

export default function Page() {
  return <SectionIndex slug="kit" />;
}
