# The Cubes: changelog

The Cubes lives at [/kit/axis-cube](https://magi0s.vercel.app/kit/axis-cube). It was called Axis Cube until 0.8.1.

Every push to `main` that changes the app is a version here:

- **Minor** (0.x.0): something new.
- **Patch** (0.x.y): refinements and fixes.
- **1.0.0**: comes with the stopwatch and the leaderboard.

Dates are Costa Rica time. Each entry links the pull request that shipped it.

## 1.0.0 (planned)

- A stopwatch for solves.
- A leaderboard.

## 0.8.5 · 2026-11-24

- The welcome's button says Start. [#145](https://github.com/onexmac/ad/pull/145)

## 0.8.4 · 2026-11-23

- The welcome is the loading screen itself: the loading cube is already turning in it, with the app's name and Start where the bar will be. On Start they fade, and the bar comes up and runs out to the room. [#139](https://github.com/onexmac/ad/pull/139)

## 0.8.3 · 2026-11-23

- A welcome on iPhone and iPad whenever the install screen isn't shown, from the home screen too. An iPhone only lets a page make sound after a touch, and the welcome's tap is that touch.
- The room is built behind the welcome and the install screen instead of after them. After the tap the bar runs out at once and the room comes in to its bolololipipob. [#136](https://github.com/onexmac/ad/pull/136)

## 0.8.2 · 2026-11-23

- After the clack of a finished turn comes a lip if the turn brought the puzzle closer to solved, or a lower, softer lop if it didn't.
- The 2×2 is judged exactly. All its 3,674,160 states are known, none more than 11 turns from solved, from a table built in the background the first time it's picked up.
- The 3×3, the Axis Cube and the Ghost Cube are judged by the stages of the layer method: cross, first corners, middle edges, last layer oriented, then permuted. On the two shape mods the centres count too. Undoing the last turn also counts as closer. [#125](https://github.com/onexmac/ad/pull/125)

## 0.8.1 · 2026-11-23

- Renamed The Cubes: page title, home screen, manifest and portal. The address stays /kit/axis-cube, so installed copies and shared links keep working.
- The puzzles at rest are 15% smaller and the camera over the ottoman comes in to match. On screen they look the same; the ottoman has room for more.
- The synth bass after a turn is gone. In its place comes a lolip, and a bolololipipob when the loading ends.
- Notes are struck instead of sliding into pitch (they sounded like drops of water).
- Each puzzle has its own instrument: an electric piano for the Axis Cube, a marimba for the 3×3, a kalimba for the 2×2 and glass for the Ghost Cube. Phrases vary and never repeat back to back. [#115](https://github.com/onexmac/ad/pull/115)

## 0.8.0 · 2026-11-23

- Sound, all made on the spot, with no audio files:
  - a bolololip when a puzzle is chosen;
  - a low, slow-motion swoosh as the camera moves to it, and a thump when it lands back on the cushion;
  - clacks when a layer lands, ticks for each quarter of a free spin, wind for fast spins;
  - a rising growl while holding, and a dubstep wobble while the puzzle scrambles or solves itself.
- Sound starts with the first touch. On iPhone it follows the silent switch and mixes with whatever else is playing. [#107](https://github.com/onexmac/ad/pull/107)

## 0.7.0 · 2026-11-23

- An install screen the first time the app opens in a phone's browser: the icon's cube, how to add the app to the home screen, and Listo.
- On Android, once Chrome offers to install, the button becomes Instalar and opens Chrome's own dialog.
- Not shown from the home screen, on a desktop, or inside the browsers of social apps. [#106](https://github.com/onexmac/ad/pull/106)

## 0.6.0 · 2026-11-23

- The room is a rounded frame on a black screen (the short vvv fit): below the status bar and above Safari's bar, with black beyond. Touches are measured against the frame. [#98](https://github.com/onexmac/ad/pull/98)

## 0.5.11 · 2026-11-23

- The loading cube keeps turning while the room is being built (it froze on iPhone), and under Reduce Motion too. [#87](https://github.com/onexmac/ad/pull/87)

## 0.5.10 · 2026-11-23

- A new version shows the first time the app is opened, even on a slow network. The page starts over once on the newer copy, only if nobody has touched it yet. [#85](https://github.com/onexmac/ad/pull/85)

## 0.5.9 · 2026-11-23

- Icon: the turning side's corner is rounded instead of cut. [#82](https://github.com/onexmac/ad/pull/82)

## 0.5.8 · 2026-11-23

- Icon: the chosen frame, with the cube mixed and its right side 24° into a turn. The black spike at that corner is cut and the faint seams are cleaned. [#81](https://github.com/onexmac/ad/pull/81)

## 0.5.7 · 2026-11-23

- Icon: the turning side is flipped further, going up, so the face under it opens into tiles. [#80](https://github.com/onexmac/ad/pull/80)

## 0.5.6 · 2026-11-23

- Icon: the turning layer is caught at 36° so its lower face reads.
- Fonts now come from the repository's own dependencies instead of being fetched from Google during each build, which had been failing deployments at random. [#79](https://github.com/onexmac/ad/pull/79)

## 0.5.5 · 2026-11-23

- Icon: a moment from the loop, so every face in view mixes black and white tiles. [#78](https://github.com/onexmac/ad/pull/78)

## 0.5.4 · 2026-11-23

- The home-screen icon is the loading cube halfway through a turn, instead of a crop of the room. [#77](https://github.com/onexmac/ad/pull/77)

## 0.5.3 · 2026-11-23

- A flat 2×2 at the centre of the loading screen, turned a layer at a time as when solving. A short opening mixes it, then it loops without ever passing through solved.
- The bar moves to three quarters of the way down. [#76](https://github.com/onexmac/ad/pull/76)

## 0.5.2 · 2026-11-23

- Five sheets of dust at five distances, from many slow points far away to a few larger specks near the lens. The out-of-focus discs nearest the lens are half the size. [#75](https://github.com/onexmac/ad/pull/75)

## 0.5.1 · 2026-11-23

- Kept on the device: the page, loading screen, scripts and photographs are stored, so the app opens from the home screen without waiting for the network. It also gets a manifest and icons.
- Lighter to draw in Safari:
  - the light in the air is drawn at half resolution;
  - the depth of field takes fewer samples;
  - shadows are redrawn only while something moves.
- The occasional blank frame (a flicker) is gone.
- Dust floats again, as drifting sheets of specks instead of 14,000 particles. [#74](https://github.com/onexmac/ad/pull/74)

## 0.5.0 · 2026-11-23

- A loading screen: black, with one bar with rounded ends filling in white. It is on screen before any script arrives and lifts when the room is ready.
- The A/B/C picker comes out and the app is look A. B and C stay at their own addresses, unlisted. [#73](https://github.com/onexmac/ad/pull/73)

## 0.4.0 · 2026-11-23

- A Ghost Cube behind the other three. It is a 3×3 cut off centre and turned, so no two pieces are alike, and every sticker is the same white outline: it is solved by shape alone. [#72](https://github.com/onexmac/ad/pull/72)

## 0.3.2 · 2026-11-23

- A look picker (A, B, C) while choosing a puzzle.
- B and C are painted as cels instead of filtered photographs, and their ink lines simplify with distance. [#71](https://github.com/onexmac/ad/pull/71)

## 0.3.1 · 2026-11-23

- The lens stays on the puzzle: the focus also softens to its sides, so the chair's arm at the edge of the frame no longer competes. [#70](https://github.com/onexmac/ad/pull/70)

## 0.3.0 · 2026-11-23

- Three looks, each at its own address:
  - **A, analogue:** film, with depth of field, halation, colour fringing and grain.
  - **B, brush:** inked and painted.
  - **C, classic:** night, with cool shadows and an old print's specks.
- Real printed matter in the room: record sleeves, CD booklets, magazines and a WPA poster. All are public domain or open access, credited in `public/kit/axis-cube/tex/CREDITS.md`. [#69](https://github.com/onexmac/ad/pull/69)

## 0.2.0 · 2026-11-22

- The room becomes a mid-century home library in the nineties: walnut shelving with books, CDs and LPs, a cognac leather lounge chair and ottoman, orange glass lamps, a hi-fi and a Discman.
- The puzzles rest on the ottoman's leather cushion, which dents under each one.
- Dust behaves like dust in a sunbeam. [#68](https://github.com/onexmac/ad/pull/68)

## 0.1.3 · 2026-11-22

- Flipping the puzzle turns it about its own axes: a sideways swipe about the upright axis, up or down about the one across. It coasts and lands on the next quarter turn. [#67](https://github.com/onexmac/ad/pull/67)

## 0.1.2 · 2026-11-22

- The TV is off. [#66](https://github.com/onexmac/ad/pull/66)

## 0.1.1 · 2026-11-22

- A tap on a face of the puzzle in hand turns that face to the front. [#65](https://github.com/onexmac/ad/pull/65)

## 0.1.0 · 2026-11-22

- First release, as Axis Cube: a teenager's bedroom at dusk with three puzzles on the bed (a 2×2, an Axis Cube and a 3×3).
- Tap a puzzle to pick it up. A grid of rings turns its layers, with momentum and quarter-turn snapping.
- Swipe to spin it, hold to scramble or solve, pull down to put it back. [#64](https://github.com/onexmac/ad/pull/64)
