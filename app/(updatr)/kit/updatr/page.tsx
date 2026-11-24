import { franchises, items } from "@/data/updatr/items";
import { MagazineScreen } from "@/components/updatr/MagazineScreen";
import { UpdatrLoading } from "@/components/loading/apps";

export default function Page() {
  return (
    <>
      <MagazineScreen items={items} franchises={franchises} />
      <UpdatrLoading />
    </>
  );
}
