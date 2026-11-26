import { changelogResponse } from "@/lib/changelog";
import { AXIS_DIR } from "@/lib/axis-cube/version";

// The Cubes' list of changes, for the screen the version opens. Made once, when the site is built.
export const dynamic = "force-static";

export function GET() {
  return changelogResponse(AXIS_DIR);
}
