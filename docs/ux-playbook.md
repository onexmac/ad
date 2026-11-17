# UX playbook: what Updatr taught us

Read this before building a new app in the portal. It distils the interaction
work done on Updatr (`/kit/updatr`) into rules, the reasons behind them, the
values that feel right, and where the code lives so it can be lifted rather
than reinvented. Histok (`/kit/histok`) is the older reference that Updatr
matched; when they differ, Updatr is the newer and better-tested one.

- **Live:** https://magi0s.vercel.app/kit/updatr
- **The working session** (every decision, the bugs and why they were bugs):
  https://claude.ai/code/session_01RJyUnajPcXxUHpDcQy6UBm. It is also filed
  under MAGI.
- **History:** pull requests #2–#16 in this repo; each description says what
  changed and how it was checked.

## How Marcos works (process)

- **Ask once at the start: `sim` or `launch`** (rules in `CLAUDE.md`).
  - `sim`: each iteration goes to the chat as an artifact.
  - `launch`: each iteration goes straight to `main`, and the reply carries the
    magi0s link.
  - Either way, the app's only home is `https://magi0s.vercel.app/<section>/<slug>`.
    Never send a Vercel branch preview (it sits behind a login).
- **The artifact is built from the repo's own code** (see
  `scripts/updatr/artifact/`):
  - esbuild bundles the screen components.
  - A `next/link` shim routes with the URL hash.
  - Images are downloaded and resized, because the artifact's content policy
    blocks hotlinks.
  - The artifact page has no viewport meta tag. To test it locally, wrap it in
    one, or the page lays out at 980px wide.
- **Feedback arrives as artifact comments** anchored to an element, and as
  phone screenshots. Read a screenshot for what is actually wrong: the "white
  background" bug turned out to be the Claude app's own frame bouncing.
- **QA is part of the work, not a phase.** Every change gets Playwright checks
  on a production build (`next build && next start`; the dev overlay
  intercepts taps). Use the iPhone 13 profile with CDP touch events
  (`Input.dispatchTouchEvent`). For anything with real risk, run an
  independent review, then a skeptic pass that tries to refute each finding.
  This caught about 40 real bugs that the author's own tests missed.
- **Say what was not tested.** Chromium emulation is not iOS Safari. Name what
  needs a real-phone check.

## Principles

1. **Mobile first, native feel.**
   - Navigation sits at the bottom, never in a top bar.
   - Everything answers the thumb.
   - Haptics on every commit (`lib/histok/haptic.ts`: `select` for a step,
     `complete` for a commit, `drag` when a drag locks).
2. **Physics, not timelines.**
   - Motion runs on springs (`lib/histok/springs.ts`) driven by motion values
     that a finger can hold at any point.
   - Every gesture hands off to a spring carrying the release velocity.
   - Interrupting a spring continues from where it is, never jumps.
3. **Every overlay leaves the way it came, and more.**
   - A right swipe from anywhere closes it (Histok's back-swipe).
   - So does a pull-down at its top.
   - A scrolling overlay also closes on a push past its end, against friction.
   - Escape and a visible button always work too.
4. **Edges do things, with friction to confirm intent.**
   - Only a fresh gesture that starts at the edge counts. A scroll that merely
     arrives there (momentum included) never triggers anything.
   - The pull resists and arms past a mark (accent plus a haptic tick), and
     release past the mark commits.
   - In Updatr: the top of the issue pulls down the calendar of past editions,
     and the bottom pulls the next issue.
5. **One picture, one element.**
   - An image is a single `<img>`. Black and white is a CSS filter on that same
     element.
   - Opening, lifting and closing carry the live element between its tile, a
     flight layer and the article (`lib/updatr/carrier.ts`).
   - Never cross-fade two copies for an effect: it glitches on any size
     change. That was the first complaint, and the reason for this design.
6. **Taps open on the native click.**
   - Never open on pointerup. A touch that only stops a fling sends
     pointerdown/up but no click, so pointerup-based opening fires on every
     scroll-stop.
   - Hold behaviours (press and hold to lift) cancel the click explicitly.
7. **Technical minimalism.**
   - Forced light mode, one ground colour, one ink, hairlines, one accent.
   - Mono uppercase labels; type sizes do the hierarchy.
   - Roomy padding, three-digit counters, folios (P.04), Nº numbers.
   - Draw arrows and icons as SVG hairlines with square caps and mitred joins.
     Characters like ↘ ↗ turn into colour emoji on iOS.
   - The house arrow is a diagonal shaft with a right-angle head
     (`components/updatr/Arrow.tsx`).
   - Nested radii shrink inward: a container's radius is always bigger than
     the radius of what it holds (outer = inner + padding is the goal). A
     round button in a card needs a card radius above the button's.

## Patterns and where they live

| Pattern | What it does | Code | Values that felt right |
|---|---|---|---|
| Carrier flight | Moves the live element between places along a spring. The target can be a function, re-read every frame, so it tracks a moving tile. The flight starts on the next frame, so a heavy render doesn't eat the first frame. Clips under chrome, and keeps a dimmed ancestor's opacity. | `lib/updatr/carrier.ts`, `lib/updatr/flight.ts` | open `{120, 18}`, close `{150, 22}`, cancel `{210, 26}` (stiffness, damping) |
| Detail (article) | Sheet with a hero slot. Closes by right swipe, pull-down at top, push past the end, Back or Escape. A closing picture flies home if its tile is on screen, otherwise the sheet is flung away. | `components/updatr/Detail.tsx` | back-swipe commits at 34% of width or 520 px/s; pull commits at 110 px; end lift `200·(1−e^(−0.6d/200))`, commits at 130 px |
| Press and hold | After 260 ms the picture lifts to the centre at its own proportions, in colour, with the page blurred behind. Slide up and release to open. | `components/updatr/HoldImage.tsx` | hold 260 ms; move-cancel 10 px; open at −70 px |
| Snap strip | Our own spring carousel, not CSS snap. Axis lock, rubber-banded ends, momentum projection. Always lands on a card. The whole viewport takes the gesture. | `components/updatr/SnapStrip.tsx` | advance at 18% of a card or 320 px/s; project 0.22 s; rubber 0.32 |
| Home square | Bottom navigation folded into a 60 px corner square. Its ink grows with reading progress. A tap morphs it into the tab bar (one spring value drives it). Pull it down or right to fold. | `components/updatr/BottomBar.tsx` | chrome spring `{280, 30}`; tabs live at 90% open and after 320 ms |
| Grow from the bottom | Blocks grow slightly into place as they enter from the bottom edge, and shrink back on the way out. Scroll-linked and spring-smoothed. | `components/updatr/Grow.tsx` | 0.92–0.95 → 1; spring `{240, 19, mass 0.6}` |
| Edge squish | Rubber band at the page's top and bottom, on top of the native bounce. Turned off on edges that pull. | `components/updatr/useEdgeSquish.ts` | up to 5% over 300 px |
| Edge pulls | Fresh-gesture-only pull at either edge, with friction, arming and commit. Touch and wheel. | `useEdgePull` in `components/updatr/Reload.tsx` | lift `160·(1−e^(−0.6d/160))`, commits at 140 px |
| Loading screen | Technical fetch screen: three-digit percent, a hairline, the server's steps logging in, elapsed seconds. Rises from where the pull left off. Slide down, scroll up or Escape cancels. | `ReloadScreen` in `components/updatr/Reload.tsx` | demo 3 s; eases toward 96% until the server answers |
| Calendar picker | Roomy month blocks; a row is an ISO week. The item in view is ink, today has an accent dot, unavailable weeks are faint. | `components/updatr/Editions.tsx` | rows 52 px; 56 px gutter |
| Follow (bookmark) | Toggle in the article's controls, with a short confirmation note. Date-first list of followed items. | `lib/updatr/watch.ts`, `components/updatr/Watching.tsx`, `Bookmark.tsx` | stored on the device until the server exists |
| Opener | One article at a time. A closing one gives way to a new tap. | `components/updatr/useOpener.ts` | — |

## iOS Safari traps (each cost a round)

- **`preventDefault` must come early.** Call it on the first `touchmove`, with
  a non-passive listener, or iOS commits to its own scroll. If an event isn't
  cancelable, iOS already owns the scroll: give the gesture back.
- **A reparented element's touches no longer bubble through its old parent.**
  When the touch target moves to another container, block the page scroll at
  the document (capture phase), not on the original button.
- **Nothing transparent fixed at a screen edge.** Safari tints its toolbar
  from fixed edge elements. Mount edge readouts only while in use, give them
  the ground colour, and remove flight layers when empty.
- **Contain overscroll.** Use `overscroll-behavior-y: contain` on html and
  body. Inside the Claude app's artifact viewer, the host frame otherwise
  bounces white around the page.
- **Left-edge guard while an overlay is open.** Call `preventDefault` on
  `touchstart` within 30 px of the left edge, but not on buttons or links.
  Otherwise Safari's history swipe leaves the app. Don't use
  `history.pushState` for overlays: Safari animates into the duplicate
  history entry.
- **Body scroll lock shifts desktop layouts.** Use
  `scrollbar-gutter: stable` on html.
- **Discard stale fling velocity.** Velocity from a finger that rested more
  than 80 ms before release is not a fling (`freshVelocity` in `flight.ts`).
- **Multi-touch.** One finger drives a gesture. A second finger settles it;
  it must never leave UI stuck half-way.

## Don'ts (each one happened; most errors came from here)

### Process
- **Don't send a Vercel branch preview, or any `<project>.vercel.app` link.**
  Branch previews sit behind a Vercel login. The only link is the magi0s
  portal URL.
- **Don't push a build in `sim` mode, and don't send screenshots instead of
  the artifact or the link.**
- **Don't build the artifact from a copy.** It comes from the repo's code via
  the build script, and it is published at the same file path so its URL
  stays the same.
- **Don't attach repos or answer setup questions from memory.** Check what is
  already attached, and read the CLAUDE.md files first.
- **Don't reformat files you didn't change.** A Prettier run once rewrote 400
  lines of a file in a repo that doesn't use Prettier.
- **Don't force-push or rebase a branch after its pull request was squash
  merged.** Merge `origin/main` into the branch with `-X ours` (the branch
  already holds the content), then push.
- **Don't trust a test against a stale server.**
  - Rebuild, and kill the old `next-server` by pid; it survives `pkill` of
    its parent.
  - Don't test with Playwright against `next dev`: its overlay swallows taps.
  - Don't test the artifact without a viewport meta tag, or it lays out at
    980 px wide.
- **Don't report a test-harness artifact as a bug, or a bug as an artifact.**
  The coarse-step "jump" checks are noisy. Look at the frames before
  deciding.
- **Don't claim it works on iOS from Chromium emulation.** Say what still
  needs a real phone.

### Images and motion
- **Don't render two images for one picture.** No black-and-white copy
  cross-fading over a colour copy, and no shared `layoutId` duplicates. Both
  glitch the moment sizes change. Use one element and a filter.
- **Don't use motion's `layoutId` projection for elements inside a
  transformed container** (a sheet being pulled or swiped). It measures the
  untransformed box and the image jumps on close. Use our own rect-based
  flights.
- **Don't start a flight's spring in the same frame as a heavy render**, or
  its first visible frame skips ahead. Start it on the next frame
  (`Carrier.fly` does).
- **Don't fly to a rect measured once if the target can move.** Pass a
  function. The page may scroll, or a strip may settle, mid-flight.
- **Don't let a flying picture draw over chrome it should pass under**, and
  don't let it ignore its ancestor's opacity. Clip it and carry the opacity.
- **Don't use CSS scroll-snap for strips that should feel physical.** Use the
  spring strip. Its ends rubber-band and it always lands on a card.

### Touch and gestures
- **Don't open on pointerup.** Open on the native click: a touch that stops a
  fling has no click.
- **Don't add passive touchmove listeners where you might need to take the
  gesture.** Call `preventDefault` on the first move, before iOS commits to
  its own scroll.
- **Don't stop a spring on pointerdown unless you re-settle it on every way a
  gesture can end:** pointerup, pointercancel, a vertical scroll, a held
  child that swallows the release, or a second finger. Otherwise strips and
  sheets park half-way.
- **Don't let a second finger break a drag.** Track one pointer id and settle
  on any other.
- **Don't trust velocity at release.** A finger that rested more than 80 ms
  has none.
- **Don't let React events from a carried element reach its old parents.**
  The picture inside the article still bubbles, through React, to the tile
  and strip it came from. Check `currentTarget.contains(target)`.
- **Don't let invisible controls take taps.**
  - Tabs fading in are not tappable yet: double taps went to Archive.
  - Sliding indicators (layoutId pills) need `pointer-events-none`.
- **Don't make a dismissing tap also act.** A tap outside an open bar closes
  it and nothing else, as in iOS menus.
- **Don't trigger edge actions from a scroll that merely arrives at the
  edge.** Fresh gestures only, with friction and a mark.
- **Don't use `history.pushState` to make an overlay "back-able".** Safari's
  edge swipe animates into the duplicate history entry. Guard the left edge
  instead.
- **Don't treat `touchcancel` as a release.** The system took the touch, so
  settle back.

### Layout and chrome
- **Don't put a rounder element inside a less round container.** A 17 px
  radius button in a 12 px radius card reads as broken. Raise the container's
  radius or square the element.
- **Don't put a navigation bar at the top.** And don't leave a full-width
  transparent wrapper fixed at the bottom either: Safari tints its toolbar
  from it.
- **Don't leave fixed layers mounted when idle** (flight layers, pull
  readouts).
- **Don't track the current section with IntersectionObserver.** After a jump
  it reports the wrong section. Read scroll positions on scroll frames
  instead.
- **Don't lock body scroll without `scrollbar-gutter: stable`.**
- **Don't keep re-rendering on every scroll percent.** Write labels directly,
  or quantise the value.
- **Don't measure a "visible" tile against the whole viewport** when chrome
  covers part of it. Use the open area. Mark chrome with
  `data-updatr-chrome` (`top`, `bottom` or `corner`).

### Look
- **Don't type arrows or symbols that iOS can turn into emoji** (↘ ↗ ← →).
  Draw them as SVG.
- **Don't add ©/® or other decoration to wordmarks** unless asked.
- **Don't add inline colours.** Use the tokens.
- **Don't fill empty states with nothing.** Say what to do, and use the real
  icon.

## Starting a new app

1. Register it in `lib/apps.json` and create `app/<section>/<slug>/`. Give it
   its own route-group layout if it needs its own fonts or tokens (Updatr:
   `app/(updatr)/kit/updatr/`).
2. Ask `sim` or `launch`.
3. Import the gesture pieces instead of copying them where you can:
   - Springs and haptics come from `lib/histok/`.
   - Flights from `lib/updatr/carrier.ts` and `flight.ts`.
   - Strips, Grow, edge pulls and squish come from `components/updatr/`.
   - If a piece needs changing for the new app, lift it into a shared place
     rather than forking it.
4. Write the Playwright checks alongside the feature. The scripts from the
   Updatr session (touch, single-image continuity, edge pulls, home square)
   show the shape: they track the element frame by frame and flag jumps.
5. Ship in small pull requests with a QA section, and keep a "not tested on a
   real phone" line honest.
