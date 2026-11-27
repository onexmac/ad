import { changelogResponse } from "@/lib/changelog";
import { FIORI_DIR } from "@/lib/ps2-fiori/version";

// PS2 Fiori's list of changes, for the screen the version opens. Made once, when the site is built.
export const dynamic = "force-static";

export function GET() {
  return changelogResponse(FIORI_DIR);
}
