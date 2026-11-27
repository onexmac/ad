@AGENTS.md

# MAGI portal — working rules

- This repo is **public**; `onexmac/magi` is the private one. Never commit
  secrets, tokens, `.env` files, or content copied from `onexmac/magi` without
  Marcos's explicit yes on the exact diff. App code from the legacy repos
  (`onexmac/root` and the per-app repos) belongs here: move it in without asking.
- All apps live in this repo under `app/<section>/<slug>/`, listed in
  `lib/apps.json`. Sections are `kit` (personal) and `ad` (Adelante). Do not
  create or suggest new repositories for apps.
- Deploys happen through Vercel's GitHub integration on push to `main`. Do not
  deploy with the Vercel CLI or a token.
- Publishing mode, `sim` or `launch`. Before the first build of a session that
  works on an app, if Marcos hasn't said, ask him once: sim or launch? Suggest
  `sim` for a new app and `launch` for one already live, more so when the
  session comes from desktop (`get_session` origin `desktop_app`).
  - `sim`: every iteration is shown in the chat as a Claude artifact (Artifact
    tool); nothing reaches Vercel until he types `launch`.
  - `launch`: every iteration ships to `main` (branch → PR → merge, without
    waiting to be asked) and he gets the portal link,
    `https://magi0s.vercel.app/<section>/<slug>`. An artifact only if he asks.
  - Links at the end: links to a published app or an artifact go at the end
    of the message, after the explanation, never at the top, so Marcos doesn't
    scroll up after each push. Not necessarily the literal last line; a short
    note after them is fine.
  - Changelog (an Eva rule): every app keeps a `CHANGELOG.md` in its folder
    (The Cubes: `app/(axis-cube)/kit/axis-cube/CHANGELOG.md`). Its first push
    to Vercel is 0.1.0; every push after it that changes the app adds an entry
    in that same commit: the version, the date and time (Costa Rica) and what
    changed, in detail. The jump says how big the push was: +0.0.1 small,
    +0.0.2 or +0.0.3 bigger, +0.0.5 big, +0.1.0 too big for that (the last
    number back to 0), +0.5.0 only for something massive. The second and
    third numbers are single digits that roll over like an odometer (1.0.9
    then 1.1.0; 1.0.8 + 0.0.3 is 1.1.1); only the first can pass 9. 1.0.0 is
    a milestone Marcos names. An app without one starts it at its next push,
    counted from its first push to Vercel. Bugs Marcos reports come first in
    the entry of the push that fixes them: his words, the cause, and what not
    to do. The changelog keeps a short list of those lessons at the top, and
    the bugs still open, so the next change doesn't repeat them. Each change
    gets its own entry, even when several ship in one push, and opens with
    Claude's line in the voice of early game-dev release notes (now and then
    a funny tidbit), shown beside what Marcos said. Every app shows
    its version in a quiet place and opens the list of changes from it, read
    from the same file. The whole system, with the shared reader
    (`lib/changelog.ts`) and how an app shows it: `docs/changelog.md`.
  - He can set it in his first message (`eva sim …`, `eva launch …`) and switch
    any time by typing `sim` or `launch`; `launch` mid-session also ships what
    is there now.
  - Never a Vercel branch preview (it sits behind a Vercel login), never
    screenshots instead of the artifact or the link. The only stop before
    `main` is the first rule above: secrets or content from `magi`.
  - The artifact is built from this repo's own code, not a copy. For Updatr:
    `npm i --no-save esbuild@0.24.2`, then
    `node scripts/updatr/artifact/build.mjs <outDir>`, and publish `updatr.html`
    with its `img/` files.
- New app? Read `docs/ux-playbook.md` first: the UX learnings from Updatr
  (principles, patterns with their code and values, iOS traps, QA).
- Mobile first, native feel: navigation lives at the bottom (tab bar or bottom
  bar), never a top nav bar. Every overlay closes by pull-down and by a
  right swipe (Histok's back-swipe), and a scrolling one also by pushing on past
  its end against friction (a fresh gesture that starts at the end, released
  past the mark). Pages rubber-band at their top and bottom
  (`components/updatr/useEdgeSquish.ts`). Every horizontal strip lands on a
  card on a spring, and images open and close by flying from and to their place
  in the layout. One image element per picture, carried between places, never a
  second copy for an effect (black and white is a filter on that element).
  Taps open on the native click, so a touch that stops a scroll opens nothing.
  Springs and haptics: `lib/histok/springs.ts`, `lib/histok/haptic.ts`;
  Updatr's gesture pieces: `lib/updatr/flight.ts`, `lib/updatr/carrier.ts`,
  `components/updatr/` (`Detail`, `HoldImage`, `SnapStrip`, `BottomBar`).
- **vvv** = vintage vignette viewport: the page as a rounded frame on a black
  screen, scrolling inside itself, black beyond (status bar, Safari's bar,
  corners, bounce). Use `components/vvv/Vvv.tsx`; how-to and don'ts in
  `docs/ux-playbook.md` ("vvv"). When Marcos says vvv, this is it. Two fits:
  **vvs** (short: the frame starts below the status bar and hides the Dynamic
  Island) and **vvt** (tall: no top curve, the frame runs to the screen's top
  and the Dynamic Island shows). Anything near one of the frame's corners
  rounds that corner as the frame's curve drawn inward by its distance from
  each edge (`useVvvCorner`), never the frame's radius itself.
- Look: technical minimalism is the starting point for a new app, not a
  mandate: an app can take its own look when Marcos wants one. It is what the
  portal's own pages (`/`, `/ad`, `/kit`) wear:
  `components/tech-index/` (`TechIndex.tsx`, `tech.css`, `lib/tech-fonts.ts`),
  black beyond a vvs frame, light panels on a 6 px gutter, mono labels,
  Chakra Petch numerals, signal green `#86AD00`. Whatever the look, each app
  keeps its colours as tokens in its own layout's stylesheet and reuses them;
  no inline colours.
- Scrolling content never vanishes into its own background: wherever a scroll
  is cut (a footer with a button, a fixed bar), a line marks the cut,
  so the content reads as sliding under it. It need not reach the edges
  (playbook, "Layout and chrome").
- Nested radii: a container's corner radius is always bigger than the radius
  of anything inside it (ideally outer = inner + the padding between them).
  A round 34 px button needs a card radius above 17; a pill inside a pill
  needs the outer one taller. Check every nesting before shipping.
- Outlines and zoom: a key's ring or drop shadow sits outside its box, so an
  `overflow: hidden` ancestor clips it into an uneven stroke; give the wrapper
  a padded rim, taken back with a negative margin. Check edges and corners in
  3× screenshots, cropped and enlarged, before shipping (playbook, "Layout and
  chrome" and "How Marcos works").
- Motion across a screen change: a motion value reaches the element a frame
  late, but a scroll jump paints at once, so hide anything before the jump
  and write its transform straight to the element; bound `layout` animations
  with `layoutDependency`. Check transitions frame by frame in a recording
  (playbook, "Images and motion"; the top bar peek in "Patterns").
