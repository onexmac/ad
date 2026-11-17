import { franchises, items } from "@/data/updatr/items";
import { GridScreen } from "@/components/updatr/GridScreen";

export default function Page() {
  return <GridScreen items={items} franchises={franchises} />;
}
