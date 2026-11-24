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
- **Zoom in the way Marcos does.** He enlarges his phone screenshots and sees
  a stroke that is 1 px thinner on one side. Before shipping anything with
  outlines, curves or nested corners, take the screenshot at
  `deviceScaleFactor: 3`, crop the edges and corners and enlarge them
  (nearest-neighbour). Read his screenshots the same way: crop the area he
  points at from the full-size file and enlarge it before you guess the cause.
  Puncheo's corner keys looked fine at 1× and were visibly broken at 3×.

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
| Lock and swipe | A picture tied to an entry (`like`), held 1.6 s from the first touch, stays up: a hairline under the hint fills while it charges. Locked, the verdict keys sit fixed at its resting bottom corners, above it (Less left, More right). Swiping it sideways tilts it under the key it heads for, which grows and warms; past the mark, the verdict, and it goes home. Down, Escape or a tap beside it: home. Up or a tap on it: open. The holding finger can carry on into the swipe. | `components/updatr/HoldImage.tsx` (`LockFace`, `LockKeys`), `lib/updatr/carrier.ts` (`nudge` takes x and a tilt) | lock 1.6 s; swipe 30% of width (≥ 80 px) or 0.5 px/ms; down 110 px; tilt 0.07°/px, ≤ 14° |
| Pages (snap) | Every section of the magazine one screen tall (`100svh`), mandatory snap on the document, so a flick lands on a page with native momentum and everything scroll-driven keeps working. Long sections are `tall` and carry their own stops a screen apart. Blocks grow with their page's arrival (`usePageProgress`), not with a line on the screen. Animated jumps turn snapping off while they run. | `components/updatr/Pages.tsx`, `Grow.tsx`, `MagazineScreen.tsx` | page `100svh`; grow from 30% to 86% of the page's arrival, +7% / +4% per lag step |
| Press for the fan | A text entry (a brief) held 0.42 s pops the like fan at the finger, kept on screen. Slide and let go to pick, or let go and tap. | `components/updatr/PressLike.tsx` (with `Choice` from `LikeFan.tsx`) | hold 420 ms; centre kept 82 px from the sides and 140 px from the top |
| Snap strip | Our own spring carousel, not CSS snap. Axis lock, rubber-banded ends, momentum projection. Always lands on a card. The whole viewport takes the gesture. | `components/updatr/SnapStrip.tsx` | advance at 18% of a card or 320 px/s; project 0.22 s; rubber 0.32 |
| Home square | Bottom navigation folded into a 60 px corner square. Its ink grows with reading progress. A tap morphs it into the tab bar (one spring value drives it). Pull it down or right to fold. | `components/updatr/BottomBar.tsx` | chrome spring `{280, 30}`; tabs live at 90% open and after 320 ms |
| Grow from the bottom | Blocks grow slightly into place as they enter from the bottom edge, and shrink back on the way out. Scroll-linked and spring-smoothed. | `components/updatr/Grow.tsx` | 0.92–0.95 → 1; spring `{240, 19, mass 0.6}` |
| Edge squish | Rubber band at the page's top and bottom, on top of the native bounce. Turned off on edges that pull. | `components/updatr/useEdgeSquish.ts` | up to 5% over 300 px |
| Edge pulls | Fresh-gesture-only pull at either edge, with friction, arming and commit. Touch and wheel. | `useEdgePull` in `components/updatr/Reload.tsx` | lift `160·(1−e^(−0.6d/160))`, commits at 140 px |
| Loading screen | Technical fetch screen: three-digit percent, a hairline, the server's steps logging in, elapsed seconds. Rises from where the pull left off. Slide down, scroll up or Escape cancels. | `ReloadScreen` in `components/updatr/Reload.tsx` | demo 3 s; eases toward 96% until the server answers |
| Calendar picker | Roomy month blocks; a row is an ISO week. The item in view is ink, today has an accent dot, unavailable weeks are faint. | `components/updatr/Editions.tsx` | rows 52 px; 56 px gutter |
| Follow (bookmark) | Toggle in the article's controls, with a short confirmation note. Date-first list of followed items. | `lib/updatr/watch.ts`, `components/updatr/Watching.tsx`, `Bookmark.tsx` | stored on the device until the server exists |
| Opener | One article at a time. A closing one gives way to a new tap. | `components/updatr/useOpener.ts` | — |
| Top bar peek | On a screen change (walk ↔ search, a filter, a jump to a room), if the top bar was out of sight it drops in from above the frame, as if it had been waiting there, even when the new screen starts at the top. Only the bar, never the cards under it. Fully opaque, no fade. Its overshoot carries the whole page down with it at the same rhythm, and its fill (not its labels) stretches up to the frame's top so no gap opens. Sticky only while peeking; the next touch or wheel outside it sends it back up, and at the very top it is just in its place. A room jump lands just under where the bar will sit. | `PunchApp.tsx` (`reveal`, `park`, `PEEK_SPRING`), `Header.tsx` (`HeadPeek`), `RoomScroll.tsx` (`onArrive`) in `components/puncheo/` | spring `visualDuration 0.42, bounce 0.4`; starts bar height + 8 px above; hides on `{420, 40}` |

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
- **A button on a loading screen answers on its own.** While a page builds a
  3D scene, a tap waits for whatever task is running: React taking over the
  page, the build, the GPU compiling shaders at the first frame. Answer the
  button from an inline script that is in the page from the first paint, and
  start its audio there, inside the tap (iOS allows it nowhere else). Build in
  slices that hand the page back every few milliseconds, and wait for each
  shader program alone before the first frame. The Cubes,
  `lib/axis-cube/gate.ts` and `warm()` in `lib/axis-cube/scene.js`.

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
- **Don't rely on a motion value to hide something across a scroll jump.**
  Motion writes a motion value to the element on its next frame, but a
  scroll jump (`scrollTo`) is painted at once. Puncheo's top bar showed in
  its place for one frame after the jump to the top, then vanished and
  dropped in: a flicker Marcos caught. Hide it before the jump (it is out of
  sight then anyway) and write the transform to the element straight away
  (`el.style.transform`) as well as setting the value (`park` in
  `components/puncheo/PunchApp.tsx`). Check it frame by frame: record the
  transition (Playwright `recordVideo`, then `ffmpeg -vf fps=25`) or log the
  element's position on every `requestAnimationFrame`.
- **Don't leave a `layout` animation listening to every render.** An element
  with `layout` re-animates whenever anything re-renders and moves it. When
  the header dropped in, the Planos key vanished and trailed behind it, which
  read as the header fading. Give it `layoutDependency` (the state that
  really reshapes it) so only that sets it off.
- **Don't take "it fades" at face value.** Twice the "fade" Marcos saw was
  something else: a child lagging on a layout animation, and the content
  under the bar fading in. Record it and look before changing the spring.

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
- **Don't let the click that ends a long press act.** The browser sends it
  to whatever is under the finger when it lifts, which by then can be a key
  that appeared under it (the fan's centre, a verdict key) or the page beside
  a lifted picture. Act only on a press that started on the control, or ignore
  clicks for 400 ms after the hold ends.
- **Don't let a swiped card carry its target off screen.** Keys that a swipe
  aims at stay fixed where the card rests; the card slides under them.
- **Don't animate `scrollTo` frame by frame under mandatory snap.** Each
  frame is snapped to the nearest page. Turn snapping off for the jump and
  land on a page's top.
- **Don't tie scroll-linked growth to a line on the screen inside snapped
  pages.** A block low on a page never passes the line once the page has
  landed and stays half grown. Tie it to the page's arrival.
- **Don't put `block` next to `line-clamp-*`.** It overrides the clamp's
  `display`, and the text runs on and is cut mid-line.
- **Don't test snapping with `Input.synthesizeScrollGesture`.** In headless
  Chrome it did not scroll a snapped page at all. Dispatch real touch moves
  and read where it settles.
- **Sideways on a locked picture is the verdict, not the back swipe.** Marcos
  asked for it the way cards are swiped. That overlay closes by sliding down,
  a tap beside it or Escape.

### Layout and chrome
- **Don't let a clipping ancestor eat an outline.** An outline drawn as an
  outer ring or drop shadow (`box-shadow: 0 0 0 1px …, 0 1px 1px …`, every
  Leia key) sits *outside* the element's box. Any ancestor with
  `overflow: hidden` (a wrapper that folds a key away, a collapsing panel)
  cuts it off at the box, so the ring disappears on straight edges and
  survives only where a rounded corner leaves room inside the box: a stroke of
  uneven width. Fix: give the wrapper a rim of padding (3 px covers a 1 px
  ring and its shadow) and take it back with a negative margin so nothing
  moves; if the wrapper collapses to nothing, fade it out at the end so the
  rim doesn't leave a sliver. Before shipping, check every outlined key for an
  `overflow: hidden` ancestor. (Puncheo's bar, `components/puncheo/Footer.tsx`,
  `RIM`.)
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

## What Noticss B added (`/kit/noticss`, where Noticss opens; A is at `/kit/noticss/a`)

The Paper / Push Pop Press grammar, built on the pieces above. Code in
`components/noticss/PaperB.tsx` and `components/noticss/b/`.

| Pattern | What it does | Code | Values that felt right |
|---|---|---|---|
| Cards are the pages | A tray card is the full page drawn at full size and scaled down (k = 0.4 to 1). Its corner radius lives in page pixels, so it scales with the card. | `RowCard` in `PaperB.tsx` | gap 14 page px (5.6 on the tray); radius 44 page px |
| Grab point stays put | Lifting keeps the grabbed point under the finger: openness = −dy / ((1 − fy)·H·(1 − k₀) − bottom). The card drifts sideways with the finger too. | `travel()` in `PaperB.tsx` | minimum travel 170 px |
| The thread (cascade) | Every card has its own openness. The lifted one leads; each other card chases its neighbour on a stiff spring, so they come up in a cascade. Going down, no card is ever more open than the one before it. | `Tray.pi` / `step` in `b/model.ts` | link response 0.22 s, damping 0.86 |
| Overrides over jumps | A page that arrives from elsewhere (from below, out of a row of notes) is a visual override, drawn on top of a jump the row has already made underneath. The override is released once it is covered. Transitions can always be finished at once (`Tray.begin` / `settle`). | `presentFrom`, `commitNext` in `PaperB.tsx` | pop: response 0.46 s, damping 0.8 |
| Momentum, then a card | A fling glides on with exponential deceleration (iOS), aimed to stop exactly on a card, starting at the release velocity. | `Tray.glide` in `b/model.ts` | travel = 0.5 s of speed |
| Springs in the value's units | Springs are given as response and damping ratio. Every spring gets an explicit start velocity (an instant jump must not leave one). Rest tolerance follows the unit: fractions and cards settle finely, pixels at half a pixel. | `spring()` and `Tray.run` in `b/model.ts` | expand 0.5 / 0.86, page 0.4 / 1 |
| The top of the screen | B is a vvt: the page itself runs up behind the clock (cover, photo or paper). In Safari that needs a scrolled document, so on an iPhone in the browser B is 80 px taller than the screen and pins the document scrolled by 80, with nothing fixed at the top edge. Once an open page scrolls past its photo, a band in its own paper keeps the words below the cut. | `bleed` in `PaperB.tsx`, `b/TopFill.tsx` | bleed 80 px |
| Under Safari's bottom bar | The frame ends above the bar (`useVvvInset`); black beyond it, from a fixed layer at the bottom edge that Safari tints its bar from. | `PaperB.tsx` | gutter 6 px |
| Hoy is the front page, in highlights | Hoy carries the most important storyline of each section, most important first, each as its synopsis and its single most important note (its page says how many more notes are in its section), then the day's figures. The rest of those storylines' notes stay in their own sections: nothing is shown twice, nothing is lost. | `sectionsOf` in `b/model.ts` | one storyline per lens, one note each (`HOY_NOTES`) |
| On past the tray's ends | Pushing on past the last card of a tray pulls the next section in from the right against friction, with a pill ("Siga a Política"); back past the first card pulls the previous one in from the left ("Vuelva a Hoy"), already showing its last cards. Past the mark the pill reads "Suelte: …" and letting go goes there, carried by the finger's speed; short of it, it springs back. The sideways twin of the open page's "Siga para la siguiente". | tray `x` in `move()` / `end()`, `PaperB.tsx` | the page's end-pull friction and mark (commit at 120 px); the section moves 0.6 of the lift |
| Like: Path's fan, Pinterest's press | Next to the bookmark. The choices (Me gusta, Menos así) spin out of the button along an arc on a spring that overshoots and settles, like first and dislike close behind; each label rides its circle, its spin a beat behind and fading in late; the button's heart spins into a cross. A tap opens them, tap one; or press and slide, and let go on one. **Gravity**: while the finger slides, the nearest choice leans toward it, more the closer it gets, and slides under the finger within reach, so the pick takes less travel than it looks. It is caught judged where gravity has drawn it. The choice turns red as the finger nears, so it shows red before the finger hides it. Picking the same verdict again takes it back. The control keeps its own finger (`data-own-gesture`). | `b/LikeFan.tsx` | out: stiffness 520, damping 16, spin −220°; like first, dislike 150 ms after; each label turns about its circle's centre (it orbits with it) but its spin trails by 60 ms on a calmer spring (260 / 30) and it fades in from 240 ms; labels are light text on a dark tag; back in, labels go first; the nearest choice warms to red from 120 px and is full red by 72 px, before the finger covers it (circle, mark and tag); pull 0.9·(1 − d/140)^1.5, at most 34 px; catch 40 px; hold 240 ms |
| Taste, learned on the device | Every story is a bag of features (section, CR or world, tags, outlet, kind of note, title stems). A like is a positive example, a dislike a negative; following a topic (0.6) and reading a page for 20 s (0.3) are weaker ones. A logistic regression is retrained from the whole log on each change, so a verdict taken back is forgotten exactly. | `lib/noticss/taste.ts` | 12 passes, rate 0.35, L2 0.004 |
| 30% suggested | Each section mixes in storylines the taste ranks highest (the edition's suggestion pool, then earlier editions), until they are 30% of its cards, spread evenly after its lead. Score = chance of a like + 0.22 × novelty (features it has not seen) + a touch of importance, minus age and minus what was already opened; disliked ones never come back. Each is marked "Sugerida", with the reason when the model has one. The taste is frozen per edition and visit, so cards never reshuffle under the finger. | `sectionsOf` in `b/model.ts` | share 0.3; 2 notes per suggestion |

More traps found here:

- **React routes events through a carried element's old parents.** A gallery
  that holds a page's own `<img>` must listen natively, not through React
  props.
- **A touch that only stops motion must not act.** Check velocities (and a
  recent native scroll) before stopping anything.
- **Every way a gesture ends must put back what its touch stopped**: the
  section, the tray and the page. Do it before any early return.
- **`MotionValue.set()` leaves a velocity that `animate()` picks up.** Use
  `jump()`, or pass `velocity` explicitly.
- **Don't promote a layer for a motion that changes scale.** Chromium keeps
  the small raster and blurs the text.

## vvv: the vintage vignette viewport (`/`, `/ad`, `/kit`)

**vvv** (vintage vignette viewport) is what Marcos calls the page as a rounded
frame on a black screen. It works like an old screen's vignette: the page
lives inside the frame, and beyond its edge everything is black. That covers
under the status bar, under Safari's bottom bar, past the four corners and
in the bounce. When he says "vvv", this is what he means.

Code: `components/vvv/Vvv.tsx`. First used on a Pads index that has since
been folded into `/ad` (the pads are AD apps now, at `/ad/pad01` and so on;
the old `/ad/pads/…` paths redirect). Its look (technical minimalism) is a
component of its own, `components/tech-index/TechIndex.tsx`, with its
stylesheet `tech.css` and its faces in `lib/tech-fonts.ts`. The portal's own
pages (`/`, `/ad`, `/kit`; `app/(index)/`, `PortalHome`, `SectionHome`) wear it
in a vvs.

### Two fits: vvs and vvt

| | vvs (short), the default | vvt (tall) |
|---|---|---|
| Top of the frame | below the status bar, plus a gutter | the top of the screen |
| Top corners | rounded | none: the phone's own corners round it |
| Dynamic Island | hidden in the black | shows, with the page around it |
| Content start and snap stops | the frame's top | below the status bar (`padding-top` and `scroll-padding-top` = safe-area top); it scrolls on up under the island |
| Bottom | above Safari's bar, rounded | same |
| Code | `<Vvs>` or `<Vvv fit="short">` | `<Vvt>` or `<Vvv fit="tall">` |

The portal's indices use vvs. Noticss B (`/kit/noticss`) uses vvt: like The Cubes it lays
its own frame (`useVvvInset`), and an open page fills that frame, its top
corners going square as it opens and its bottom ones the frame's (44 px, the
same as a card's).

### How it's made

1. **Beyond the frame is always black.** That is what makes it vvv. The
   layout sets `html, body` background black, `themeColor: "#000000"` and
   `viewportFit: "cover"`, so Safari's own bars and the overscroll are black
   too. The frame's own surface (its gutters) can be another colour, given
   through `<Vvv className>`. The indices use `#191C22`, with its darkest plates in
   true black on it, so the frame reads against the black around it.
2. **Wrap the page in `<Vvv>`.** It is a fixed, black, `100lvh` surface. On
   it sits the frame: a scroller with `border-radius` **and**
   `clip-path: inset(0 round r)`.
3. **The document doesn't scroll.** `Vvv` locks `html`/`body` (overflow
   hidden, overscroll none). The frame scrolls inside itself, and iOS gives
   it its native bounce, clipped by the frame.
4. **Where the frame sits:**
   - Top: the status bar (`env(safe-area-inset-top)`) plus a gutter.
   - Bottom: whatever the browser keeps there, plus a gutter. Safari's bar
     is the largest of `100lvh − 100svh`, `100lvh − 100dvh` and
     `100lvh − visualViewport.height`. Use the home indicator
     (`env(safe-area-inset-bottom)`) when there is no bar.
   - Re-measure on `resize` and on the visual viewport's `resize`
     (`useVvvInset`).
5. **Everything that reads scroll reads the frame, not the window.**
   - Snap: `<Vvv snap>`, with children marked `snap-start` / `snap-end`.
     Their `scroll-margin` is the gutter.
   - Reveals: `VvvGrow`, which is Noticss A's Grow with
     `useScroll({ container })`.
   - Anything else: `useVvvScroller()` gives you the scroller.
6. **Radii nest.** The frame's radius must be at least the panels' radius
   plus the padding between them. The indices use a 32 px frame, 22 px panels and
   a 6 px gutter.
7. **Corners near the frame's corners follow its curve.** Anything that sits
   close to one of the frame's corners (a key at the end of a bottom bar, a
   card pressed against the top) rounds *that one corner* as the frame's own
   curve drawn inward by its distance from each edge, as if it were a stroke
   inside the frame's line. The rest of its corners keep their own radius.
   - The corner is `frame radius − distance from the side` across and
     `frame radius − distance from the top or bottom` up: an elliptical
     corner, because the two distances are rarely equal.
   - Code: `useVvvCorner(dx, dy, min)` inside the frame (it reads the frame's
     radius), or `vvvCorner(radius, dx, dy, min)`. `min` keeps it from going
     below the element's other corners.
   - vvt has no top curve: only its bottom corners pass the curve on.
   - When the element that sits in the corner changes (a key folds away and
     the next one slides in), the newcomer takes the curve with a short
     `border-radius` transition.

| Value | Puncheo (`/ad/puncheo`, vvs) |
|---|---|
| Frame radius | 28 px |
| Bar keys | 44 px tall in a 60 px bar, 12 px from the sides (8 px from the bottom) |
| Corner keys' outer corner | 16 × 20 px (28 − 12, 28 − 8) |
| Their other corners | 6 px |
| Which keys | left: the rooms key, or the close key while searching; right: Cerrar ficha, or the open search field |

| Value | The indices |
|---|---|
| Frame radius | 32 px |
| Gutter (frame to bars, panel to panel) | 6 px |
| Panel radius | 22 px |
| Beyond the frame | `#000`, always |
| Frame surface (gutters) | `#191C22` (plates in `#000` on it) |
| Snap | mandatory, a stop per block |
| Grow | from 0.94, 18 px, opacity 0.35, `GROW_SPRING` |

### A page that doesn't scroll (The Cubes, `/kit/axis-cube`)

A canvas has nothing to scroll, so it doesn't take the `Vvv` scroller. It lays
the same two boxes in its own stylesheet (a black ground `100lvh` tall, and
the frame on it) and asks `useVvvInset` where the frame sits. That hook is in
`components/vvv/inset.ts`, a file with no other dependencies, so the page
doesn't load the scroller or its animation library. Two things to carry over:

- **The canvas takes the radius itself** (`border-radius: inherit`). It is a
  layer of its own, and the frame's `overflow` won't round it everywhere.
- **Measure against the canvas's box, not the window**: its size, and every
  touch (`getBoundingClientRect`). Watch the box with a `ResizeObserver`; the
  frame moves when the browser's bars do, with no `resize` on the window.

### What not to do (each one happened)

- **Don't fake the frame with corner masks over a scrolling document.** The
  first version pinned black quarter-rounds to the screen's corners. The
  corners looked right, but the page went on showing under the status bar,
  under Safari's bar and beside the masks. The frame has to clip; masks only
  cover.
- **Don't let the document scroll.** If it does, Safari draws the page under
  its translucent bars and the frame is a lie.
- **Don't rely on `border-radius` + `overflow` alone to round the
  scroller.** Safari doesn't clip composited children (anything animating a
  transform, like Grow) to it. Add the `clip-path`. Noticss B learned the
  same thing.
- **Don't put the frame's bottom at `100lvh`.** It ends under Safari's bar,
  and the content shows through the glass. Measure the bar.
- **Don't leave window-based scroll pieces on a vvv page.** They read a
  window that never moves: `useEdgeSquish`, Updatr's `Grow`, `useScroll()`
  without a container, `scroll-snap-type` on `html`. Point them at the
  frame.
- **Don't give a corner key the frame's radius, or leave it at its own.**
  The frame's full radius on a key inset from it bulges past the frame's
  line; the key's small radius leaves a square corner under a round one.
  Draw the frame's curve inward (rule 7).
- **Don't clip a corner key's outline.** A key's dark ring and the shadow
  under it sit just outside the key. If its wrapper clips (a fold-away
  wrapper with `overflow: hidden`), the ring vanishes on the straight edges
  and survives only along the big corner curve, where the box leaves room:
  a stroke of uneven width. Give the wrapper a few px of padding around the
  key and take them back with a negative margin (Puncheo's Footer: 3 px).
- **Don't make beyond the frame anything but black.** Marcos: "vvv se queda
  en negro". A dark grey there once lost the vignette. Colour the frame's
  surface instead, and keep `themeColor` and the `html` background black, or
  a band shows at the bars and in the bounce.
- **Not yet tested on a real iPhone:** where the frame's bottom edge lands
  under iOS 26 Safari's floating bar. If it sits behind the bar or leaves too
  much black, adjust `useVvvInset`, not the page.

## Coming and going: tiles and skeletons

How the portal moves between pages. Code: `components/tech-index/tiles.tsx`
(the indices) and `components/loading/` (the apps).

### Leaving an index (`/`, `/ad`, `/kit`)

Every square of a technical-minimalism index is a `Tile`; every link on it is
a `TileLink`. A tap empties the page before it goes:

1. The squares inside the frame shrink to 0.78 and fade, on a spring that dips
   past its mark, one by one in a **random** order, spread over about 280 ms.
2. The squares of the tapped entry (its column and its plate) go **last**,
   80 ms after the others.
3. When the tapped one has faded, the page leaves: by the router inside the
   index shell (`/`, `/ad`, `/kit` share a root layout, so nothing reloads),
   and by a plain navigation anywhere else. About 550 ms from tap to leaving.

Squares below the fold vanish at once, so a bounce shows nothing behind.
Modified clicks (new tab) go straight through. Reduced motion skips it.

### Arriving at an index

The squares are hidden in the HTML (`[data-tile]` in `tech.css`) and spring in
when the page is ready: the ones in the frame one by one at random (0.86 to 1
with a little overshoot, 45 ms apart), the rest at once. It plays again when
Safari brings the page back from its cache (`pageshow`, `persisted`), because
the page was left empty.

### Arriving at an app: a bar or a skeleton

An app with no loading of its own gets a gate beside its content in its
`page.tsx` (`components/loading/`; each app's in `apps.tsx`). Which one
depends on how long the wait is, measured on a slow phone network
(1.6 Mbps, 150 ms):

| App | Ready after | Loading |
|---|---|---|
| Updatr, Noticss | 9 to 10 s (big scripts, a large cover) | bar |
| Histok | about 3 s | bar |
| Puncheo, pad01, pad02, pad03 | about 2 s | skeleton |
| The Cubes | its own loading screen | (its own) |

Both hold the app hidden until it is ready: hydrated, fonts in, and the
pictures of its first screen loaded (capped: 2.5 s for a skeleton, 6 s for a
bar). Neither shows for the first 140 ms, so a quick load (a second visit)
just fades the app in. Both are plain markup and CSS until they hydrate
(springs as CSS `linear()` easings), so they are there from the first paint,
and the page shows itself anyway if the script never runs (6 s for a
skeleton, 20 s for a bar; at once with scripting off).

**Bar** (`BarGate`, The Cubes' loader in the app's colours): the app's own
ground, its mark at the centre, and three quarters down a stroked bar
(radius 6 = fill 2.5 + gap 2 + stroke 1.5). The fill tells the truth:

1. Before any script, it creeps on a CSS curve.
2. An inline script, run as the page is parsed, fills it as the app's
   scripts arrive (the resource timings of its `<script src>`), up to 80%,
   with a creep between arrivals so it never stands still.
3. Hydrated: 85%, then fonts and first-screen pictures to 100%.
4. Full, the mark and the bar spring out and the app fades in.

**Skeleton** (`SkeletonGate`, `Bone`): the first screen as rounded
rectangles, placed where the real cards, lines, keys and bars are (measured
from the real screen at 393 px and overlaid on it to check), in the app's
own tokens, each bone with the radius of what it stands for. Bones are
numbered in reading order, a card then what is in it: they spring in in that
order and spring out in the same order while the app fades in where they
were. A bone that showed stays at least 380 ms. A skeleton on an opaque
surface (Puncheo's frame) marks it `.skel-shell` and the gate `shell`: the
app shows at once underneath and the shell fades over it, so there is no dip
in the cross-fade.

New app: give it a skeleton if it is ready in about 2 s on a slow network, a
bar if it takes longer, and nothing if it brings its own loading. Measure the
real screen for the bones; don't guess them.

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
