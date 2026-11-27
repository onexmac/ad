import { Inventory } from "@/components/maq02/Inventory";
import { MAQ_VERSION } from "@/lib/maq02/version";

export default function Page() {
  return <Inventory version={MAQ_VERSION} />;
}
