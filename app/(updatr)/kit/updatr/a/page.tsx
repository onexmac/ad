import type { Metadata } from "next";
import { franchises, items } from "@/data/updatr/items";
import { GridScreen } from "@/components/updatr/GridScreen";

export const metadata: Metadata = { title: "Updatr — A" };

export default function Page() {
  return <GridScreen items={items} franchises={franchises} />;
}
