import { Inventory } from "@/components/ps2-fiori/Inventory";
import { FIORI_VERSION } from "@/lib/ps2-fiori/version";

export default function Page() {
  return <Inventory version={FIORI_VERSION} />;
}
