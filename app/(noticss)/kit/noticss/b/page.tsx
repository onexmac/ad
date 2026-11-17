import type { Metadata } from "next";
import { editions } from "@/lib/noticss/editions";
import { PaperB } from "@/components/noticss/PaperB";

export const metadata: Metadata = { title: "Noticss — B" };

export default function Page() {
  return <PaperB editions={editions} />;
}
