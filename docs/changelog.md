# The changelog system

Every app in the portal keeps a changelog and shows it. It is an Eva rule: Marcos set it on The Cubes and it holds for every app from now on. The short form is in `CLAUDE.md`; this is the whole of it. A session that starts with `eva` or `magi0s` reads this file (the `magi0s` command in `onexmac/magi` lists it).

## The file

- `CHANGELOG.md` in the app's own folder, next to its `page.tsx` (The Cubes: `app/(axis-cube)/kit/axis-cube/CHANGELOG.md`, the example to copy).
- An app's first push to Vercel is **0.1.0**. An app that has no changelog yet starts it at its next push, counted from its first push to Vercel.
- Every push that changes the app adds its entry **in the same commit**, with the pull request's link (open the PR as a draft, put its number in the entry, push, then merge).
- A lab is not an app: it is a snippet of one, built as an artifact to try something (The Cubes' Sidebar and Side-B are its high-score screen). A push that only changes a lab gets no entry and no version, and a lab shows neither: no version, no list of changes. Marcos, 26 Nov: "No changelog. Sidebar is not a full app. Just the highscore snippet".

### Versions

| Jump | When |
| :--- | :--- |
| +0.0.1 | a small change |
| +0.0.2 or +0.0.3 | a bigger one |
| +0.0.5 | a big one |
| +0.1.0 | one too big for that (the last number goes back to 0) |
| +0.5.0 | only something massive |
| 1.0.0 | a milestone Marcos names |

The second and third numbers are single digits and roll over like an odometer: a jump that takes one past 9 carries into the number before it, so 1.0.9 + 0.0.1 is 1.1.0 and 1.0.8 + 0.0.3 is 1.1.1. Only the first number can pass 9 (10.0.0). Marcos, 26 Nov: "From 1.0.9 goes 1.1.0 [...] Just the first version can have more than two digits like 10.0.0".

### The head of the file

1. A line on what the app is and where it lives (its portal link).
2. How versions are numbered (the table above).
3. **Bugs Marcos reported**: one line per lesson, `- **x.y.z** what not to do`, then `Open:` with the bugs not fixed yet (his words, the date, what is known).
4. A planned milestone, if Marcos named one (`## 1.0.0 (planned)`, no date: it does not count as the current version).

### An entry

```
## 0.6.62 · 2026-11-25 21:51

**Claude:** Tapping the iMac mid-mix works now, and the logo solves itself one square at a time (it takes its time; it has earned it).

- **Bug fix.** Marcos, 25 Nov 21:50: "his words, as he wrote them"
  - Cause: what made it happen.
  - Don't: what not to do, so it is not repeated.

Asked by Marcos, 25 Nov 21:50: "his words, when the push is an ask and not a fix"

- What changed, in detail: what it does now, with the numbers (times, sizes, angles), and what it did before. ([#173](https://github.com/onexmac/ad/pull/173))
```

- **Claude's line** comes first, right under the heading: one or two sentences, at most about 220 characters, in the voice of early game-developer release notes (shareware readmes, .plan updates). Concrete about what changed for the player, warm, a bit cheeky; about one in five carries a funny tidbit, never at Marcos's expense or making light of his report. No jargon, no code names. It is what the app shows first, beside what Marcos said.
- The heading is the version, ` · `, and the date and time in Costa Rica (`TZ=America/Costa_Rica date "+%Y-%m-%d %H:%M"`). The app reads its current version from the first heading of that shape.
- A bug Marcos reported comes **first** in the entry of the push that fixes it: his words, the cause, and a `Don't:`. Its lesson goes into the list at the top.
- **One entry per change.** When one push carries several changes (asks from several messages, or one message with several asks), each gets its own entry and version, in order, and says it shipped in the same push as the others. Bundling them hides what changed when.
- Plain sentences, no jargon, short lines; nested points for the detail.

## In the app

Every app shows its version somewhere quiet, and a tap on it opens the list of every change, read from the same `CHANGELOG.md`. Where the version goes is the app's own choice (The Cubes: the bottom right of the cube picker, in the machine's pixel letters).

- **Reading it.** `lib/changelog.ts` reads the file when the site is built: `readChangelog(appDir)` gives `{ text, version }`.
- **The version.** The app's server `page.tsx` passes the version to its client component (The Cubes: `lib/axis-cube/version.ts`, then `<Stage version={AXIS_VERSION} />`), so it is in the page from the first paint.
- **The list.** A static page of the app's own serves the text, made once at build:

  ```ts
  // app/<section>/<slug>/changelog/route.ts
  import { changelogResponse } from "@/lib/changelog";
  export const dynamic = "force-static";
  export function GET() { return changelogResponse("app/<section>/<slug>"); }
  ```

  The app fetches it only when the list is opened, so the page stays light.
- **The screen.** Release notes as one long list, newest first, nothing folded (Marcos, 26 Nov: "Do not collapse the changelog. One long list"). Each version shows its number and date, what Marcos said under INPUT (his ask, or his bug report, marked as one), Claude's line under OUTPUT, and every detail (the bullets, a bug's cause and don't). In the app's own type and colours: The Cubes sets it in Cube OS, its pixel letters as a font, ink on paper. It is an overlay like any other: it closes by a pull down from its top, a slide to the right, a push on past its end, and a close control at the bottom (never a top bar). The Cubes' sheet is in `lib/axis-cube/scene.js` (`openLog`, `parseLog`, `logEntries`); `parseLog` reads the entry format above.
- **Artifacts.** An artifact build carries the changelog in the page (The Cubes: `scripts/axis-cube/artifact/build.mjs` puts it in `window.AXIS_CHANGELOG`, escaped to plain ASCII).
