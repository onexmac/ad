import { franchises, items } from "@/data/updatr/items";
import { MagazineScreen } from "@/components/updatr/MagazineScreen";
import { UpdatrSkeleton } from "@/components/skeleton/shapes";

export default function Page() {
  return (
    <>
      <MagazineScreen items={items} franchises={franchises} />
      <UpdatrSkeleton />
    </>
  );
}
