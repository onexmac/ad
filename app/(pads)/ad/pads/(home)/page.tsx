import { getFolder } from "@/lib/apps";
import { PadsHome } from "@/components/pads/home/PadsHome";

export default function Page() {
  const pads = getFolder("ad", "pads");
  return <PadsHome apps={pads.apps} />;
}
