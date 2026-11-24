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
- Look: forced light mode, tokens in `app/globals.css` (ground, card, ink,
  brand). Reuse them; do not add inline colours.
- Nested radii: a container's corner radius is always bigger than the radius
  of anything inside it (ideally outer = inner + the padding between them).
  A round 34 px button needs a card radius above 17; a pill inside a pill
  needs the outer one taller. Check every nesting before shipping.
