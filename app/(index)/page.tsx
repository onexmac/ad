import { sections } from "@/lib/apps";
import { PortalHome } from "@/components/tech-index/PortalHome";

export default function Page() {
  return <PortalHome sections={sections} />;
}
