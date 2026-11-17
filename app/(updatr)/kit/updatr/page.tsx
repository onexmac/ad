import { franchises, items } from "@/data/updatr/items";
import { MagazineScreen } from "@/components/updatr/MagazineScreen";

export default function Page() {
  return <MagazineScreen items={items} franchises={franchises} />;
}
