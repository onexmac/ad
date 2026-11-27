import { changelogResponse } from "@/lib/changelog";
import { MAQ_DIR } from "@/lib/maq02/version";

// MAQ02's list of changes, for the screen the version opens. Made once, when the site is built.
export const dynamic = "force-static";

export function GET() {
  return changelogResponse(MAQ_DIR);
}
