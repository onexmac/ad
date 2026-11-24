# The Cubes: changelog

The Cubes lives at [/kit/axis-cube](https://magi0s.vercel.app/kit/axis-cube). It was called Axis Cube until 0.8.2.

## How versions are numbered

Every push of the app's code is a version here: one commit, which Vercel built as it arrived.

- **Minor** (0.x.0): something new.
- **Patch** (0.x.y): refinements and fixes.
- **1.0.0**: comes with the stopwatch and the leaderboard.

Each entry gives the date and time in Costa Rica, the commit, and the pull request that took it to `main` (and so to magi0s). Versions 0.1.0 to 0.1.15 came before the app first reached `main`: they were seen as artifacts and branch builds, and reached magi0s together in #64.

## 1.0.0 (planned)

- A stopwatch for solves.
- A leaderboard.

## 0.8.8 · 2026-11-24 00:31

- The welcome's button says Start. ([66f3ed7](https://github.com/onexmac/ad/commit/66f3ed7) · [#145](https://github.com/onexmac/ad/pull/145))

## 0.8.7 · 2026-11-23 23:48

- The welcome is the loading screen itself.
  - The loading cube is already turning in the middle from the first paint.
  - The app's name and Start sit where the bar will be, and the bar waits out of sight.
  - On Start, the name and the button fade, the bar comes up in their place and runs out to the room.
- The cube keeps turning while the room is built behind it. ([8e6fd47](https://github.com/onexmac/ad/commit/8e6fd47) · [#139](https://github.com/onexmac/ad/pull/139))

## 0.8.6 · 2026-11-23 23:36

- A welcome on iPhone and iPad whenever the install screen isn't shown: from the home screen, in Safari after the first visit, and inside the browsers of social apps.
  - It has the cube of the icon, the app's name and an OK.
  - An iPhone only lets a page make sound after a touch, so without it the notes at the end of loading could not be heard. Its tap is that touch.
- The room is built behind the welcome and the install screen instead of after them.
  - The loader waits for the screen to go.
  - Once the room is ready it stops drawing, to save battery.
  - After the tap the bar runs out at once and the room comes in to its bolololipipob.
- If the room is already waiting, the tap's own bolololip is skipped, since the longer phrase answers it a moment later.
- No welcome on Android: an installed app may play there without a touch. ([4485b43](https://github.com/onexmac/ad/commit/4485b43) · [#136](https://github.com/onexmac/ad/pull/136))

## 0.8.5 · 2026-11-23 21:31

- After the clack of a finished turn comes the lolip if the turn brought the puzzle closer to solved, or a lower, softer lolop if it didn't.
- The 2×2 is judged exactly.
  - All its 3,674,160 states are known, none more than 11 turns from solved.
  - The table is built in the background the first time the 2×2 is picked up. After that, a turn is two lookups.
- The 3×3, the Axis Cube and the Ghost Cube are judged by the layer method, in its order: the cross, the first corners, the middle edges, the last layer's edges turned up, its corners turned up, its corners in place, its edges in place.
  - On the two shape mods, the centres turned right are a last step.
  - Progress is counted from whichever face is furthest along.
- Undoing the last turn also counts as closer.
- A judgement takes about 20 µs, so the app doesn't slow down. ([d29c2e3](https://github.com/onexmac/ad/commit/d29c2e3) · [#125](https://github.com/onexmac/ad/pull/125))

## 0.8.4 · 2026-11-23 21:09

- Notes are struck instead of sliding up into their pitch. The slide made them sound like drops of water. They are also brighter, through a more open filter.
- Each puzzle plays its own instrument: an electric piano for the Axis Cube, a marimba for the 3×3, a kalimba for the 2×2 and glass for the Ghost Cube. The install screen and the end of loading use the piano.
- Each phrase is drawn from a few figures in E minor pentatonic, never the one just played, and is a little loose in time and touch. ([2b14eb3](https://github.com/onexmac/ad/commit/2b14eb3) · [#115](https://github.com/onexmac/ad/pull/115))

## 0.8.3 · 2026-11-23 20:51

- A finished turn no longer plays the synth bass note. It keeps its clack and gets a lolip: two notes starting at the turned face's pitch, so turning the puzzle plays a line.
- A bolololipipob when the loading ends: the four notes, a brighter one above them, and a round one that comes back down. ([92ea820](https://github.com/onexmac/ad/commit/92ea820) · [#115](https://github.com/onexmac/ad/pull/115))

## 0.8.2 · 2026-11-23 20:44

- Renamed The Cubes: page title, home-screen name, manifest, portal entry and install screen. The address stays /kit/axis-cube, so installed copies and shared links keep working. "Axis Cube" remains the name of one of the four puzzles.
- The puzzles at rest are 15% smaller and closer together, and the camera over the ottoman comes in by the same amount.
  - On screen they keep their size and place, within 3 px.
  - The ottoman looks 18% bigger around them, with room for more puzzles.
  - In the hand, a puzzle is the size it always was. ([6b0d78d](https://github.com/onexmac/ad/commit/6b0d78d) · [#115](https://github.com/onexmac/ad/pull/115))

## 0.8.1 · 2026-11-23 20:31

- A bolololip when something is chosen: a puzzle picked up, or the install screen's button. It is four soft notes running up, the last one short and bright, with a little echo.
- The camera's move to a puzzle is a low, muffled swoosh, like a whoosh slowed down. The way back, when the puzzle is put down, falls the same way before the thump.
- The install screen's tap now wakes the sound, so the room isn't silent until a second touch. ([7597b5d](https://github.com/onexmac/ad/commit/7597b5d) · [#107](https://github.com/onexmac/ad/pull/107))

## 0.8.0 · 2026-11-23 20:27

- Sound, all synthesised on the spot, with no audio files:
  - a rising whoosh when a puzzle is picked up, and a falling one when it is put down, then a thump as it lands;
  - a clack when a layer lands on its quarter turn, with a bass note that wobbles (each face its own note);
  - a tick for each quarter a free spin passes, and wind for fast spins;
  - a growl that rises while a finger is held on the puzzle;
  - a wobble bass that speeds up while the puzzle scrambles or solves itself.
- The bass is shaped so a phone speaker can play it.
- Sound starts with the first touch and sleeps after 20 s of silence. On iPhone it follows the silent switch and mixes with whatever else is playing. ([2fabeca](https://github.com/onexmac/ad/commit/2fabeca) · [#107](https://github.com/onexmac/ad/pull/107))

## 0.7.0 · 2026-11-23 20:09

- An install screen the first time the app opens in a phone's browser.
  - It has the cube of the icon, how to put the app on the home screen, and a button.
  - On iPhone, the steps are Share, then Add to Home Screen, and the button says Listo.
  - On Android, once Chrome offers to install, the button becomes Instalar and opens Chrome's own dialog. Chrome's own banner is always declined.
- Not shown from the home screen, on a desktop, or inside social apps' browsers. Once past it, it doesn't come back in that browser.
- The three icon files lose faint hairlines beside the cube. ([27fbc4a](https://github.com/onexmac/ad/commit/27fbc4a) · [#106](https://github.com/onexmac/ad/pull/106))

## 0.6.0 · 2026-11-23 19:47

- The room is a rounded frame on a black screen (the short vvv fit).
  - The frame sits below the status bar and above Safari's bar, with black beyond.
  - On a wider screen it keeps a gutter at the sides too.
- The scene measures itself and every touch against the frame rather than the window, and follows the frame as the browser's bars move. ([75a47dd](https://github.com/onexmac/ad/commit/75a47dd) · [#98](https://github.com/onexmac/ad/pull/98))

## 0.5.16 · 2026-11-23 19:04

- The loading cube keeps turning while the room is being built. It used to freeze, showing about one picture a second.
- It also turns under Reduce Motion, since a still cube reads as a stalled app.
- The solved cube rests a little less before its first turn. ([8acd7c6](https://github.com/onexmac/ad/commit/8acd7c6) · [#87](https://github.com/onexmac/ad/pull/87))

## 0.5.15 · 2026-11-23 18:04

- A new version shows the first time the app is opened, even on a slow network.
  - Before, a phone opening the app cold saw each new version one opening late, which is why the loading cube didn't appear on it.
  - Now the page starts over once on the newer copy: only in its first seconds, and only if nobody has touched it yet. ([82f7923](https://github.com/onexmac/ad/commit/82f7923) · [#85](https://github.com/onexmac/ad/pull/85))

## 0.5.14 · 2026-11-23 15:10

- Icon: the turning side's corner is rounded instead of cut, in keeping with the rounded tiles. ([6a6154f](https://github.com/onexmac/ad/commit/6a6154f) · [#82](https://github.com/onexmac/ad/pull/82))

## 0.5.13 · 2026-11-23 15:07

- Icon: the frame that was picked, with the cube mixed and its right side 24° into a turn.
  - The black spike at the turning side's corner is cut at 45°.
  - The faint grey hairlines along the black pieces' seams are taken out. ([825d732](https://github.com/onexmac/ad/commit/825d732) · [#81](https://github.com/onexmac/ad/pull/81))

## 0.5.12 · 2026-11-23 15:02

- Icon: the turning side is caught going up, 64° into its turn, so the face coming round underneath opens into whole tiles. ([0660a60](https://github.com/onexmac/ad/commit/0660a60) · [#80](https://github.com/onexmac/ad/pull/80))

## 0.5.11 · 2026-11-23 14:58

- Fonts now come from the repository's own dependencies instead of being fetched from Google during each build. That fetch had been failing deployments at random. ([f5f6634](https://github.com/onexmac/ad/commit/f5f6634) · [#79](https://github.com/onexmac/ad/pull/79))

## 0.5.10 · 2026-11-23 14:50

- Icon: the turning layer is caught at 36° instead of 45°, so its lower face opens into tiles instead of reading as a flat sliver. ([5bb11b7](https://github.com/onexmac/ad/commit/5bb11b7) · [#79](https://github.com/onexmac/ad/pull/79))

## 0.5.9 · 2026-11-23 14:47

- Icon: a moment from the loop, where every face in view mixes white and black tiles. ([b3207aa](https://github.com/onexmac/ad/commit/b3207aa) · [#78](https://github.com/onexmac/ad/pull/78))

## 0.5.8 · 2026-11-23 14:44

- The home-screen icon is the loading screen's flat 2×2 on black, halfway through a turn, instead of a crop of the room.
- It is rendered from the loader's own markup, with bolder tile edges so they hold at icon size. ([e003768](https://github.com/onexmac/ad/commit/e003768) · [#77](https://github.com/onexmac/ad/pull/77))

## 0.5.7 · 2026-11-23 14:39

- The loading cube is never solved again once it starts. An opening of four turns mixes it, then a loop of ten turns keeps every face in view mixed at every rest, with no pause or jump at the join. ([70f02a0](https://github.com/onexmac/ad/commit/70f02a0) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.6 · 2026-11-23 14:32

- The loading cube's turns follow the shape of a solving algorithm: the right side up or down, then the top row across, strictly in turn. ([873b647](https://github.com/onexmac/ad/commit/873b647) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.5 · 2026-11-23 14:30

- The loading cube no longer tumbles whole. It is eight corner pieces, turned a layer at a time as when solving.
- It is faster: 0.4 s from one turn to the next, down from 0.75 s. ([7071f7a](https://github.com/onexmac/ad/commit/7071f7a) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.4 · 2026-11-23 14:22

- Five sheets of dust at five distances. The furthest are many slow points; each nearer sheet is larger, sparser and a little faster.
- The out-of-focus discs nearest the lens are half the size, since a wide blur read as a smear on the glass. ([8cae56f](https://github.com/onexmac/ad/commit/8cae56f) · [#75](https://github.com/onexmac/ad/pull/75))

## 0.5.3 · 2026-11-23 14:18

- A flat 2×2 cube at the centre of the loading screen: white or black tiles with white edges, flipping a quarter turn at a time in a seamless loop.
- The bar moves to three quarters of the way down. ([78c5a31](https://github.com/onexmac/ad/commit/78c5a31) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.2 · 2026-11-23 14:11

- A newer page only replaces the one kept on the device once its scripts are kept too, so the app always opens with no network. ([8ca7af5](https://github.com/onexmac/ad/commit/8ca7af5) · [#74](https://github.com/onexmac/ad/pull/74))

## 0.5.1 · 2026-11-23 14:05

- Kept on the device.
  - The page, the loading screen, the scripts and the room's photographs are stored, so the app opens from the home screen without waiting for the network.
  - It also gets a manifest and icons.
- Lighter to draw in Safari:
  - the light in the air is drawn at half resolution;
  - the depth of field takes 16 samples instead of 24;
  - colour fringing is only worked out toward the corners;
  - shadows are redrawn only while a puzzle moves.
- The occasional blank frame (a flicker) is gone.
- Dust floats again, as drifting sheets of specks instead of 14,000 particles. It shows only inside the beam. ([dcb63d2](https://github.com/onexmac/ad/commit/dcb63d2) · [#74](https://github.com/onexmac/ad/pull/74))

## 0.5.0 · 2026-11-23 13:47

- A loading screen: black, with one bar with rounded ends filling in white.
  - It is in the page before any script arrives and keeps filling while the scene is built.
  - It lifts when the room has been drawn and every photograph is in.
- The A/B/C picker comes out and the app is look A. B and C stay at their addresses, unlisted. ([aca781b](https://github.com/onexmac/ad/commit/aca781b) · [#73](https://github.com/onexmac/ad/pull/73))

## 0.4.0 · 2026-11-23 11:29

- A Ghost Cube rests behind the V, in its own hollow.
  - It is a 3×3 whose cuts are turned and set off centre, so no two pieces are alike.
  - Every sticker is the same white outline on black, so it is solved by shape alone.
  - It is picked up, turned, scrambled and put down like the others. ([73624e0](https://github.com/onexmac/ad/commit/73624e0) · [#72](https://github.com/onexmac/ad/pull/72))

## 0.3.3 · 2026-11-23 11:16

- A look picker (A, B, C) as a pill at the bottom, only while choosing a puzzle. Changing the look keeps the puzzles and the camera as they were.
- B and C are painted as cels instead of filtered photographs.
  - Each surface is one flat colour with a single hard shadow tone tinted by the ambient light.
  - The sun comes through the blinds as one clean shape.
- The ink lines simplify with distance: far away a shelf of books is one shape, and creases are drawn only up close. ([bb59d11](https://github.com/onexmac/ad/commit/bb59d11) · [#71](https://github.com/onexmac/ad/pull/71))

## 0.3.2 · 2026-11-23 10:42

- The lens stays on the puzzle. The focus also softens to its sides, as an old lens does away from its centre, so the lounge chair's arm at the edge no longer competes. ([e260d95](https://github.com/onexmac/ad/commit/e260d95) · [#70](https://github.com/onexmac/ad/pull/70))

## 0.3.1 · 2026-11-23 08:43

- Real printed matter instead of covers drawn in code. All of it is public domain or museum open access, and credited in `public/kit/axis-cube/tex/CREDITS.md`:
  - a WPA Federal Art Project poster behind a mat;
  - paintings by Hartley, Kandinsky, Mondrian and Freundlich;
  - photographs by Toni Frissell and William P. Gottlieb;
  - four magazine covers from 1894 to 1926.
- Under the hood: tests can run the motion without drawing it. ([b6e5e55](https://github.com/onexmac/ad/commit/b6e5e55) · [#69](https://github.com/onexmac/ad/pull/69))

## 0.3.0 · 2026-11-23 08:21

- Three looks of the same room, each at its own address:
  - **A, analogue:** a film photograph, with depth of field on the puzzle in hand, halation, a trace of colour fringing, split toning and grain.
  - **B, brush:** inked and painted.
  - **C, classic:** night, with cool shadows against the warm lamps, more contrast, glow and an old print's specks. ([a7afda8](https://github.com/onexmac/ad/commit/a7afda8) · [#69](https://github.com/onexmac/ad/pull/69))

## 0.2.2 · 2026-11-22 22:52

- The description, the screen-reader label and the portal entry speak of the library and the ottoman instead of the bed. ([7c569d7](https://github.com/onexmac/ad/commit/7c569d7) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.2.1 · 2026-11-22 22:33

- The plant stands forward of the CD tower, and the Discman and discs sit inside the view from above. ([d5b0de3](https://github.com/onexmac/ad/commit/d5b0de3) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.2.0 · 2026-11-22 22:13

- The room becomes a mid-century home library in the nineties:
  - walnut shelving with books, records and compact discs;
  - a sideboard with the hi-fi under the window;
  - a cognac lounge chair and its ottoman;
  - an arc lamp and a glass mushroom lamp as the main lights, with a low, dim sun through the blinds.
- The puzzles rest on the ottoman's leather cushion, which dents under each one and rises again when a puzzle is picked up. ([3b7e30b](https://github.com/onexmac/ad/commit/3b7e30b) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.1.19 · 2026-11-22 21:35

- Dust that looks like dust instead of fairy dust.
  - It is invisible until the sun catches it, then specks of a pixel or two, brightest when the light comes toward the eye.
  - It hangs in uneven clouds and drifts on slow air, with a few flakes that turn and glint softly.
  - Specks near the lens are faint out-of-focus discs. ([70a4404](https://github.com/onexmac/ad/commit/70a4404) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.1.18 · 2026-11-22 21:16

- Flipping the puzzle turns it about its own axes. The swipe's first pixels pick the axis: sideways for the upright one, up or down for the one across.
- It follows the finger, coasts, ticks at each quarter and lands on the next quarter turn. The cross direction only wobbles and springs back.
- A tap is told from a hold on the hold's own clock, so a slow frame can't swallow a tap. ([d988a82](https://github.com/onexmac/ad/commit/d988a82) · [#67](https://github.com/onexmac/ad/pull/67))

## 0.1.17 · 2026-11-22 20:25

- The TV is off: a dead grey-green tube under reflective glass. The flickering blue light of the static is gone, and the VCR clock still blinks 12:00. ([08847ac](https://github.com/onexmac/ad/commit/08847ac) · [#66](https://github.com/onexmac/ad/pull/66))

## 0.1.16 · 2026-11-22 19:44

- A tap on a face of the puzzle in hand turns that face to the front: of the 24 square poses, the one that turns it most toward you.
- Tapping the face already in front only nudges the puzzle. ([42f5ba0](https://github.com/onexmac/ad/commit/42f5ba0) · [#65](https://github.com/onexmac/ad/pull/65))

## 0.1.15 · 2026-11-22 19:31

- First on magi0s: everything up to here reaches `main`.
- No web font. The app shows no text that needs one, and fetching it at build time had failed several builds. ([6802c7e](https://github.com/onexmac/ad/commit/6802c7e) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.14 · 2026-11-21 19:53

- Putting a puzzle down is deliberate: a pull straight down, across a third of the screen.
  - The first stretch is free, so an ordinary downward spin never starts it.
  - After that the puzzle sinks toward the bed, and letting go past the mark puts it down.
- A hold is a finger that stays put. Any drag cancels it and spins the puzzle instead.
- A darker room with real blacks:
  - less ambient light and a dimmer room lamp;
  - a black point and an S-curve on brightness only;
  - no grain in the shadows. ([30d901e](https://github.com/onexmac/ad/commit/30d901e) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.13 · 2026-11-21 16:22

- The rings are a grid laid out like the puzzle's face: nine for the Axis Cube and the 3×3, four for the 2×2.
  - A sideways swipe turns the row it starts in; up or down turns the column.
  - The ring under the finger lights on touch, then its whole row or column lights while it turns.
- The grid sits lower, clear of the puzzles resting on the bed. ([b3fcf7c](https://github.com/onexmac/ad/commit/b3fcf7c) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.12 · 2026-11-21 13:35

- Three puzzles rest on the bed in a shallow V: a 2×2, the Axis Cube and a classic 3×3. Each presses its own hollow in the duvet.
- A tap picks one up: it floats into the light, the camera drops to face it, and the rings fade in.
- A long swipe straight down puts it back, and the camera rises to choose again.
- The rings become a cross of five, and the 2×2 has no middle ring. ([a71e966](https://github.com/onexmac/ad/commit/a71e966) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.11 · 2026-11-21 11:44

- The bed stands off the wall, clear of the sill. Sneakers, comics on the floor and a model plane come in. ([87a270d](https://github.com/onexmac/ad/commit/87a270d) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.10 · 2026-11-21 11:31

- Each ring's reach runs along the way it is swiped. A layer ring owns its whole row, edge to edge, and a slice ring owns a tall column, so a swipe can start far from the ring.
- Where a row crosses a column, the first pixels of the swipe decide. ([fd97821](https://github.com/onexmac/ad/commit/fd97821) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.9 · 2026-11-21 11:25

- The room rebuilt at real scale: a 3.6 × 4.2 m bedroom with a 2.6 m ceiling, smaller and fuller.
  - A single bed under the window, a nightstand with the lava lamp, a taller shelf with LPs, a desk with drawers, a dresser.
  - A chair with a denim jacket, a crate of records, a backpack, sneakers and boxes under the bed.
- Draw calls drop from 339 to 106.
- The cube sits higher on a phone screen, and the camera stays inside the walls. ([3dd2d84](https://github.com/onexmac/ad/commit/3dd2d84) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.8 · 2026-11-21 11:24

- A swipe on the cube spins it. It follows the finger, coasts, and settles on the nearest of the 24 poses square to the screen.
- The camera leans a little into the spin. ([f9a77b7](https://github.com/onexmac/ad/commit/f9a77b7) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.7 · 2026-11-21 10:56

- Ring controls replace the buttons: six stroked rings, one column turning the horizontal layers and one row turning the vertical slices.
  - A turn follows the finger, keeps its momentum and snaps onto the nearest quarter turn with a spring.
  - A strong flick can travel several quarters.
- Holding the cube opens it, then scrambles or solves it in one go.
- The cube faces the camera square, so the rings' layers are the ones you see. ([cd7c74c](https://github.com/onexmac/ad/commit/cd7c74c) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.6 · 2026-11-21 10:42

- The bed is rebuilt as cloth: one quilted duvet that wraps the mattress, hangs in folds and is turned back at the head.
- Things set on it press it down: the record and its sleeve settle into hollows, and the pillow no longer floats.
- The hanging plant by the window is gone. ([9a432c7](https://github.com/onexmac/ad/commit/9a432c7) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.5 · 2026-11-21 10:28

- A lived-in room, from new references.
  - Cream plaster walls and an old board floor.
  - Half-open venetian blinds let the sun in striped, with a soft tree outside.
- Things lying around: plants, album sleeves and a record on the bed, a skateboard on the wall, snapshots above the desk, headphones on the chair. ([26626fe](https://github.com/onexmac/ad/commit/26626fe) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.4 · 2026-11-21 10:15

- Dusk only: the day look and its toggle are gone.
- More of the room is modelled: a real pillow, finials on the headboard, cloth-bound books, cassettes, a notebook and pencils, a light switch, a braided rag rug. ([699df0f](https://github.com/onexmac/ad/commit/699df0f) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.3 · 2026-11-21 10:07

- Photo textures (Poly Haven, CC0): cedar, mahogany, wool, cotton and carpet.
- Finer modelling: chamfered furniture, a blanket that falls in folds, and a CRT with a bulging glass face. ([1a07eab](https://github.com/onexmac/ad/commit/1a07eab) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.2 · 2026-11-21 09:57

- A quieter sunbeam, and fewer sparkles in the dust. ([b9a2993](https://github.com/onexmac/ad/commit/b9a2993) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.1 · 2026-11-20 21:46

- A fuller, more realistic room:
  - varnished paneling and crown moulding;
  - a shelf of VHS tapes with a globe;
  - a desk with the TV on a VCR, the lava lamp and a boombox;
  - posters and a polaroid.
- A warm lamp with shadows, ambient occlusion, and a warm grade. ([423b3e2](https://github.com/onexmac/ad/commit/423b3e2) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.0 · 2026-11-20 21:30

- First version, as Axis Cube: a floating Axis Cube in a dusk room. It is the scene Marcos sent, moved into the portal at /kit/axis-cube. ([7cef55c](https://github.com/onexmac/ad/commit/7cef55c) · [#64](https://github.com/onexmac/ad/pull/64))
