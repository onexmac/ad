import fs from "node:fs";
import path from "node:path";

/**
 * Every app keeps a CHANGELOG.md in its folder (docs/changelog.md has the rule) and shows its version, with the list
 * of changes a tap away. This reads an app's changelog when the site is built: its whole text, and the version it is
 * at, the first `## x.y.z · date` heading (a planned version has no date and does not count).
 *
 * `appDir` is the app's folder from the repo's root, e.g. `app/(axis-cube)/kit/axis-cube`.
 */
export function readChangelog(appDir: string): { text: string; version: string } {
  const text = fs.readFileSync(path.join(process.cwd(), appDir, "CHANGELOG.md"), "utf8");
  const m = /^## (\d+\.\d+\.\d+) ·/m.exec(text);
  return { text, version: m ? m[1] : "" };
}

/** The changelog as a page of its own (`<app>/changelog/route.ts`), made once when the site is built. */
export function changelogResponse(appDir: string): Response {
  return new Response(readChangelog(appDir).text, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
