import { franchises } from "@/data/updatr/items";
import { editions } from "@/lib/updatr/editions";
import { MagazineScreen } from "@/components/updatr/MagazineScreen";
import { UpdatrLoading } from "@/components/loading/apps";

export default function Page() {
  return (
    <>
      <MagazineScreen editions={editions} franchises={franchises} />
      <UpdatrLoading />
    </>
  );
}
