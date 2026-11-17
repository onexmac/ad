import type { Metadata } from "next";
import { franchises, items } from "@/data/updatr/items";
import { IndexScreen } from "@/components/updatr/IndexScreen";

export const metadata: Metadata = { title: "Updatr — B" };

export default function Page() {
  return <IndexScreen items={items} franchises={franchises} />;
}
