# The Cubes: changelog

The Cubes lives at [/kit/axis-cube](https://magi0s.vercel.app/kit/axis-cube). It was called Axis Cube until 0.6.5.

## How versions are numbered

Every push to Vercel that changes the app gets an entry here. The first push was 0.1.0, and each version after it jumps by how big its push was:

| Jump | When |
| :--- | :--- |
| +0.0.1 | a small change |
| +0.0.2 or +0.0.3 | a bigger one |
| +0.0.5 | a big one |
| +0.1.0 | one too big for that (the last number goes back to 0) |
| +0.5.0 | only something massive |
| 1.0.0 | a milestone: the stopwatch and the leaderboard |

Each entry gives the date and time in Costa Rica, the commit, and the pull request that took it to `main` (and so to magi0s). An entry that fixes a bug Marcos reported starts with it. Versions 0.1.0 to 0.3.7 came before the app first reached `main`: they were seen as artifacts and branch builds, and reached magi0s together in #64.

## Bugs Marcos reported

The bugs Marcos reported come first in the version that fixed them: his words, the cause, and what not to do. In short:

- **0.1.6** Don't push an effect past what real light does.
- **0.1.16** Nothing rests on something soft without sinking in.
- **0.2.2** A new control doesn't take away a gesture that worked.
- **0.2.9** A swipe control's hit area runs the length of its swipe.
- **0.3.3** Controls follow the puzzle in hand.
- **0.3.6** A gesture that undoes something isn't reachable by an ordinary one; blacks stay black.
- **0.3.7** A portal link doesn't work before `main`; say so.
- **0.3.12** A puzzle turns about its own axes.
- **0.3.14** Dust shows only in the light, and is tiny.
- **0.4.10** Printed matter is real images, not drawn in code.
- **0.4.12** Focus goes where the eye should go, not by depth alone.
- **0.4.15** Line detail falls off with distance; a painted look comes from materials, not a filter.
- **0.5.0** Never resize a canvas between drawing and showing; check Safari's smoothness after each effect.
- **0.5.5** Bokeh near the lens stays small.
- **0.5.15** When an ask reads two ways, show both.
- **0.5.16** Look at every corner of an icon enlarged.
- **0.5.19** A kept copy mustn't hide a new version; test a cold first opening.
- **0.5.20** One animation per element, on its own wrapper.
- **0.6.7** No heavy sound on a frequent event.
- **0.6.10** No pitch slides; vary repeated sounds.
- **0.6.18** On iOS, no sound before a touch.
- **0.6.27** A known object's form isn't built from boxes.
- **0.6.30** Real objects are modelled from photographs, not memory.

Open:

- Lines over the room. Marcos, 24 Nov 00:24: "There's like a set of lines overlaying the room." Not found yet: it needs a screenshot.

## 1.0.0 (planned)

- A stopwatch for solves.
- A leaderboard on the iMac's screen.

## 0.6.30 · 2026-11-24 08:03

- **Bug fix.** Marcos, 24 Nov 07:18: "Something is off it doesn't look like an iMac."
  - Cause: it was modelled from memory: all blue, with a white frame on the front. On the real one the white is a hood and a skirt, and the blue is only between them.
  - Don't: model a real object from memory. Work from photographs, front, side and back, and compare the renders with them side by side.
- The iMac is rebuilt from photographs of the real one, laid out as its plastics are:
  - a hood of frosted ice over the face and the front of the top;
  - a skirt of the same ice all the way round the bottom;
  - the blue only between them, over the sides and the round back. Before, it was all blue with a white frame on the front.
- Its side is a rounded wedge, as on the original:
  - the face leans back a little;
  - the top runs back almost level, then falls in one long curve to a back that is deepest low down;
  - the line between the blue and the skirt climbs from the face to the back.
  - Seen from above, the sides still draw in toward the back.
- The face is the original's:
  - a large 4:3 screen in a grey-white frame, with "iMac" under it;
  - on the skirt below, the two teal speakers at the corners, the CD tray in the middle and the power button.
  - The blue band that used to sit under the screen is gone.
- On the shell:
  - The blue is greener at its front edge, where the real plastic is thick.
  - On the fall of the back are three vents, and the handle: a loop of ice round a dark hollow, with the grip across it.
  - On the right side of the skirt is the door, with its blue latch.
  - Underneath are the foot that folds out and four small feet.
- Inside, the tube shows through the blue, square at the face and drawing in to its neck. The flat panels that used to show through, and the corner of the tube's mask that poked out of the shell, are gone.
- The screen's light is now a wide spot just off the glass, pointing into the room. It lights what is in front of the screen, but no longer the iMac's own face or glass, which had glowed under the screen. ([#154](https://github.com/onexmac/ad/pull/154))

## 0.6.27 · 2026-11-24 07:02

- **Bug fix.** Marcos, 24 Nov 06:57: "The model have to match the iMac egg curves."
  - Cause: the shell was a box tapering back.
  - Don't: build a known object's form out of boxes.
- The iMac has the original's egg curves. It is built from superellipses instead of a box tapering back.
  - Seen from above, its sides curve in from the face to a narrow, round back.
  - Seen from the side, its top runs back level and then down in one long arc to a round end, and its bottom lifts toward the back.
  - The shell rolls over the edge of the face as a lip.
- The face and the band of speakers under it are cushions: rounded at the edges, a little domed.
- The handle sits lower on the shell. ([#150](https://github.com/onexmac/ad/pull/150))

## 0.6.25 · 2026-11-24 06:54

- The first iMac (1998), in Bondi blue, takes the glass mushroom lamp's place on the sideboard under the window.
  - A frosted ice-white face holds the screen, with a blue band and the speakers at its foot.
  - Behind it, the translucent blue shell tapers back, with the tube and the chassis showing through and a handle at the top.
  - It stands to the left of a puzzle in hand, turned three-quarters to the camera.
- Its screen is white on black: TOP SCORES, with empty rows for now, waiting for the score system.
- The screen gives off a little cool light in place of the lamp's warm one. The arc lamp over the chair stays, since it is what lights the puzzles.
- To make room, the turntable moves along the sideboard and the ashtray goes.
- Under the hood: a test can set its own camera to look at something in the room. ([#149](https://github.com/onexmac/ad/pull/149))

## 0.6.20 · 2026-11-24 00:31

- The welcome's button says Start. ([66f3ed7](https://github.com/onexmac/ad/commit/66f3ed7) · [#145](https://github.com/onexmac/ad/pull/145))

## 0.6.19 · 2026-11-23 23:48

- The welcome is the loading screen itself.
  - The loading cube is already turning in the middle from the first paint.
  - The app's name and Start sit where the bar will be, and the bar waits out of sight.
  - On Start, the name and the button fade, the bar comes up in their place and runs out to the room.
- The cube keeps turning while the room is built behind it. ([8e6fd47](https://github.com/onexmac/ad/commit/8e6fd47) · [#139](https://github.com/onexmac/ad/pull/139))

## 0.6.18 · 2026-11-23 23:36

- **Bug fix.** Marcos, 23 Nov 21:33: "You didn't add a bolololipipob when the startup loading bar finishes."
  - Cause: it was there, but an iPhone lets a page make sound only after a touch. Opening from the home screen has none, so it played in silence.
  - Don't: count on a sound before the first touch on iOS. Give it a tap first.
- A welcome on iPhone and iPad whenever the install screen isn't shown: from the home screen, in Safari after the first visit, and inside the browsers of social apps.
  - It has the cube of the icon, the app's name and an OK.
  - An iPhone only lets a page make sound after a touch, so without it the notes at the end of loading could not be heard. Its tap is that touch.
- The room is built behind the welcome and the install screen instead of after them.
  - The loader waits for the screen to go.
  - Once the room is ready it stops drawing, to save battery.
  - After the tap the bar runs out at once and the room comes in to its bolololipipob.
- If the room is already waiting, the tap's own bolololip is skipped, since the longer phrase answers it a moment later.
- No welcome on Android: an installed app may play there without a touch. ([4485b43](https://github.com/onexmac/ad/commit/4485b43) · [#136](https://github.com/onexmac/ad/pull/136))

## 0.6.15 · 2026-11-23 21:31

- After the clack of a finished turn comes the lolip if the turn brought the puzzle closer to solved, or a lower, softer lolop if it didn't.
- The 2×2 is judged exactly.
  - All its 3,674,160 states are known, none more than 11 turns from solved.
  - The table is built in the background the first time the 2×2 is picked up. After that, a turn is two lookups.
- The 3×3, the Axis Cube and the Ghost Cube are judged by the layer method, in its order: the cross, the first corners, the middle edges, the last layer's edges turned up, its corners turned up, its corners in place, its edges in place.
  - On the two shape mods, the centres turned right are a last step.
  - Progress is counted from whichever face is furthest along.
- Undoing the last turn also counts as closer.
- A judgement takes about 20 µs, so the app doesn't slow down. ([d29c2e3](https://github.com/onexmac/ad/commit/d29c2e3) · [#125](https://github.com/onexmac/ad/pull/125))

## 0.6.10 · 2026-11-23 21:09

- **Bug fix.** Marcos, 23 Nov 21:04: "It sounds like a water drop", and it was repetitive.
  - Cause: each note slid up into its pitch, which is the sound of a drop, and the same phrase played every time.
  - Don't: slide a note into its pitch. Vary any sound that repeats.
- Notes are struck instead of sliding up into their pitch. The slide made them sound like drops of water. They are also brighter, through a more open filter.
- Each puzzle plays its own instrument: an electric piano for the Axis Cube, a marimba for the 3×3, a kalimba for the 2×2 and glass for the Ghost Cube. The install screen and the end of loading use the piano.
- Each phrase is drawn from a few figures in E minor pentatonic, never the one just played, and is a little loose in time and touch. ([2b14eb3](https://github.com/onexmac/ad/commit/2b14eb3) · [#115](https://github.com/onexmac/ad/pull/115))

## 0.6.7 · 2026-11-23 20:51

- **Bug fix.** Marcos, 23 Nov 20:45: "There's like synth bass sound when we finish flipping an axis."
  - Cause: every landed turn played a wobbling bass note under its clack.
  - Don't: put a heavy sound on an event that happens dozens of times a minute.
- A finished turn no longer plays the synth bass note. It keeps its clack and gets a lolip: two notes starting at the turned face's pitch, so turning the puzzle plays a line.
- A bolololipipob when the loading ends: the four notes, a brighter one above them, and a round one that comes back down. ([92ea820](https://github.com/onexmac/ad/commit/92ea820) · [#115](https://github.com/onexmac/ad/pull/115))

## 0.6.5 · 2026-11-23 20:44

- Renamed The Cubes: page title, home-screen name, manifest, portal entry and install screen. The address stays /kit/axis-cube, so installed copies and shared links keep working. "Axis Cube" remains the name of one of the four puzzles.
- The puzzles at rest are 15% smaller and closer together, and the camera over the ottoman comes in by the same amount.
  - On screen they keep their size and place, within 3 px.
  - The ottoman looks 18% bigger around them, with room for more puzzles.
  - In the hand, a puzzle is the size it always was. ([6b0d78d](https://github.com/onexmac/ad/commit/6b0d78d) · [#115](https://github.com/onexmac/ad/pull/115))

## 0.6.2 · 2026-11-23 20:31

- A bolololip when something is chosen: a puzzle picked up, or the install screen's button. It is four soft notes running up, the last one short and bright, with a little echo.
- The camera's move to a puzzle is a low, muffled swoosh, like a whoosh slowed down. The way back, when the puzzle is put down, falls the same way before the thump.
- The install screen's tap now wakes the sound, so the room isn't silent until a second touch. ([7597b5d](https://github.com/onexmac/ad/commit/7597b5d) · [#107](https://github.com/onexmac/ad/pull/107))

## 0.6.0 · 2026-11-23 20:27

- Sound, all synthesised on the spot, with no audio files:
  - a rising whoosh when a puzzle is picked up, and a falling one when it is put down, then a thump as it lands;
  - a clack when a layer lands on its quarter turn, with a bass note that wobbles (each face its own note);
  - a tick for each quarter a free spin passes, and wind for fast spins;
  - a growl that rises while a finger is held on the puzzle;
  - a wobble bass that speeds up while the puzzle scrambles or solves itself.
- The bass is shaped so a phone speaker can play it.
- Sound starts with the first touch and sleeps after 20 s of silence. On iPhone it follows the silent switch and mixes with whatever else is playing. ([2fabeca](https://github.com/onexmac/ad/commit/2fabeca) · [#107](https://github.com/onexmac/ad/pull/107))

## 0.5.30 · 2026-11-23 20:09

- An install screen the first time the app opens in a phone's browser.
  - It has the cube of the icon, how to put the app on the home screen, and a button.
  - On iPhone, the steps are Share, then Add to Home Screen, and the button says Listo.
  - On Android, once Chrome offers to install, the button becomes Instalar and opens Chrome's own dialog. Chrome's own banner is always declined.
- Not shown from the home screen, on a desktop, or inside social apps' browsers. Once past it, it doesn't come back in that browser.
- The three icon files lose faint hairlines beside the cube. ([27fbc4a](https://github.com/onexmac/ad/commit/27fbc4a) · [#106](https://github.com/onexmac/ad/pull/106))

## 0.5.25 · 2026-11-23 19:47

- The room is a rounded frame on a black screen (the short vvv fit).
  - The frame sits below the status bar and above Safari's bar, with black beyond.
  - On a wider screen it keeps a gutter at the sides too.
- The scene measures itself and every touch against the frame rather than the window, and follows the frame as the browser's bars move. ([75a47dd](https://github.com/onexmac/ad/commit/75a47dd) · [#98](https://github.com/onexmac/ad/pull/98))

## 0.5.20 · 2026-11-23 19:04

- **Bug fix.** Marcos, 23 Nov 18:53: "The loading cube doesn't roll."
  - Cause: each piece ran two animations on the same property, the opening and then the loop. The browser runs that on the main thread, which was busy building the scene, so the cube showed about one picture a second. Reduce Motion also stopped it.
  - Don't: put two animations on one element's transform. Give each its own nested wrapper, so the compositor runs it, and test the loader while the scene is being built.
- The loading cube keeps turning while the room is being built. It used to freeze, showing about one picture a second.
- It also turns under Reduce Motion, since a still cube reads as a stalled app.
- The solved cube rests a little less before its first turn. ([8acd7c6](https://github.com/onexmac/ad/commit/8acd7c6) · [#87](https://github.com/onexmac/ad/pull/87))

## 0.5.19 · 2026-11-23 18:04

- **Bug fix.** Marcos, 23 Nov 17:59: "Vercel doesn't have the loading cube."
  - Cause: Vercel had it. The app waited half a second for the network and otherwise opened the copy kept on the phone, so a phone opening cold always saw each version one opening late.
  - Don't: let a kept copy hide a new version. Test the first opening after a deploy, cold, on a slow network.
- A new version shows the first time the app is opened, even on a slow network.
  - Before, a phone opening the app cold saw each new version one opening late, which is why the loading cube didn't appear on it.
  - Now the page starts over once on the newer copy: only in its first seconds, and only if nobody has touched it yet. ([82f7923](https://github.com/onexmac/ad/commit/82f7923) · [#85](https://github.com/onexmac/ad/pull/85))

## 0.5.17 · 2026-11-23 15:10

- Icon: the turning side's corner is rounded instead of cut, in keeping with the rounded tiles. ([6a6154f](https://github.com/onexmac/ad/commit/6a6154f) · [#82](https://github.com/onexmac/ad/pull/82))

## 0.5.16 · 2026-11-23 15:07

- **Bug fix.** Marcos, 23 Nov 15:03: "hay un pico negro en el vértice."
  - Cause: the turning layer's corner poked out over the white tile beside it.
  - Don't: ship an icon without looking at every corner enlarged.
- Icon: the frame that was picked, with the cube mixed and its right side 24° into a turn.
  - The black spike at the turning side's corner is cut at 45°.
  - The faint grey hairlines along the black pieces' seams are taken out. ([825d732](https://github.com/onexmac/ad/commit/825d732) · [#81](https://github.com/onexmac/ad/pull/81))

## 0.5.15 · 2026-11-23 15:02

- **Bug fix.** Marcos, 23 Nov 15:01: "Flip it more."
  - Cause: in 0.5.13 his "a little bit more up" was read backwards, and the side was turned less (36°) instead of more.
  - Don't: guess a direction. When an ask can be read two ways, show both before shipping.
- Icon: the turning side is caught going up, 64° into its turn, so the face coming round underneath opens into whole tiles. ([0660a60](https://github.com/onexmac/ad/commit/0660a60) · [#80](https://github.com/onexmac/ad/pull/80))

## 0.5.14 · 2026-11-23 14:58

- Fonts now come from the repository's own dependencies instead of being fetched from Google during each build. That fetch had been failing deployments at random. ([f5f6634](https://github.com/onexmac/ad/commit/f5f6634) · [#79](https://github.com/onexmac/ad/pull/79))

## 0.5.13 · 2026-11-23 14:50

- Icon: the turning layer is caught at 36° instead of 45°, so its lower face opens into tiles instead of reading as a flat sliver. ([5bb11b7](https://github.com/onexmac/ad/commit/5bb11b7) · [#79](https://github.com/onexmac/ad/pull/79))

## 0.5.12 · 2026-11-23 14:47

- Icon: a moment from the loop, where every face in view mixes white and black tiles. ([b3207aa](https://github.com/onexmac/ad/commit/b3207aa) · [#78](https://github.com/onexmac/ad/pull/78))

## 0.5.11 · 2026-11-23 14:44

- The home-screen icon is the loading screen's flat 2×2 on black, halfway through a turn, instead of a crop of the room.
- It is rendered from the loader's own markup, with bolder tile edges so they hold at icon size. ([e003768](https://github.com/onexmac/ad/commit/e003768) · [#77](https://github.com/onexmac/ad/pull/77))

## 0.5.9 · 2026-11-23 14:39

- The loading cube is never solved again once it starts. An opening of four turns mixes it, then a loop of ten turns keeps every face in view mixed at every rest, with no pause or jump at the join. ([70f02a0](https://github.com/onexmac/ad/commit/70f02a0) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.8 · 2026-11-23 14:32

- The loading cube's turns follow the shape of a solving algorithm: the right side up or down, then the top row across, strictly in turn. ([873b647](https://github.com/onexmac/ad/commit/873b647) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.7 · 2026-11-23 14:30

- The loading cube no longer tumbles whole. It is eight corner pieces, turned a layer at a time as when solving.
- It is faster: 0.4 s from one turn to the next, down from 0.75 s. ([7071f7a](https://github.com/onexmac/ad/commit/7071f7a) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.5 · 2026-11-23 14:22

- **Bug fix.** Marcos, 23 Nov 14:18: more sheets of dust, further away; the blur up close was too big.
  - Cause: there were three sheets, and the wide out-of-focus discs near the lens read as a smudge on the glass.
  - Don't: let bokeh near the lens grow big. It looks like dirt on the glass.
- Five sheets of dust at five distances. The furthest are many slow points; each nearer sheet is larger, sparser and a little faster.
- The out-of-focus discs nearest the lens are half the size, since a wide blur read as a smear on the glass. ([8cae56f](https://github.com/onexmac/ad/commit/8cae56f) · [#75](https://github.com/onexmac/ad/pull/75))

## 0.5.4 · 2026-11-23 14:18

- A flat 2×2 cube at the centre of the loading screen: white or black tiles with white edges, flipping a quarter turn at a time in a seamless loop.
- The bar moves to three quarters of the way down. ([78c5a31](https://github.com/onexmac/ad/commit/78c5a31) · [#76](https://github.com/onexmac/ad/pull/76))

## 0.5.1 · 2026-11-23 14:11

- A newer page only replaces the one kept on the device once its scripts are kept too, so the app always opens with no network. ([8ca7af5](https://github.com/onexmac/ad/commit/8ca7af5) · [#74](https://github.com/onexmac/ad/pull/74))

## 0.5.0 · 2026-11-23 14:05

- **Bug fix.** Marcos, 23 Nov 13:49: Safari was "not as smooth as before", there was "a flicker sometimes", and "the dust stopped floating".
  - Causes:
    - the effects ran at full cost on every frame;
    - when the app lowered its resolution on a slow device, it resized the canvas after drawing, which leaves one blank frame;
    - the dust drifted at 2 to 4 px a second, which reads as still.
  - Don't: resize a canvas between drawing a frame and showing it. Check Safari's smoothness after adding an effect, and make anything meant to move move visibly.
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

## 0.4.25 · 2026-11-23 13:47

- A loading screen: black, with one bar with rounded ends filling in white.
  - It is in the page before any script arrives and keeps filling while the scene is built.
  - It lifts when the room has been drawn and every photograph is in.
- The A/B/C picker comes out and the app is look A. B and C stay at their addresses, unlisted. ([aca781b](https://github.com/onexmac/ad/commit/aca781b) · [#73](https://github.com/onexmac/ad/pull/73))

## 0.4.20 · 2026-11-23 11:29

- A Ghost Cube rests behind the V, in its own hollow.
  - It is a 3×3 whose cuts are turned and set off centre, so no two pieces are alike.
  - Every sticker is the same white outline on black, so it is solved by shape alone.
  - It is picked up, turned, scrambled and put down like the others. ([73624e0](https://github.com/onexmac/ad/commit/73624e0) · [#72](https://github.com/onexmac/ad/pull/72))

## 0.4.15 · 2026-11-23 11:16

- **Bug fix.** Marcos, 23 Nov 10:48: far away the lines were drawn "between the dent on far objects", and the anime look "looks like a cheap render".
  - Cause: lines were drawn at one threshold at every distance, and B and C were the photographic render under a filter.
  - Don't: draw the same line detail near and far, and don't make a painted look with a filter. It comes from flat materials.
- A look picker (A, B, C) as a pill at the bottom, only while choosing a puzzle. Changing the look keeps the puzzles and the camera as they were.
- B and C are painted as cels instead of filtered photographs.
  - Each surface is one flat colour with a single hard shadow tone tinted by the ambient light.
  - The sun comes through the blinds as one clean shape.
- The ink lines simplify with distance: far away a shelf of books is one shape, and creases are drawn only up close. ([bb59d11](https://github.com/onexmac/ad/commit/bb59d11) · [#71](https://github.com/onexmac/ad/pull/71))

## 0.4.12 · 2026-11-23 10:42

- **Bug fix.** Marcos, 23 Nov 10:31, on the artifact: "This arm rest looks too sharp. Focus should be on the cube."
  - Cause: the lens blurred by depth alone, and the armrest was as far from the camera as the puzzle.
  - Don't: aim focus by depth alone. It goes where the eye should go.
- The lens stays on the puzzle. The focus also softens to its sides, as an old lens does away from its centre, so the lounge chair's arm at the edge no longer competes. ([e260d95](https://github.com/onexmac/ad/commit/e260d95) · [#70](https://github.com/onexmac/ad/pull/70))

## 0.4.10 · 2026-11-23 08:43

- **Bug fix.** Marcos, 23 Nov 07:20: the covers and posters drawn in code made the room "feel cheap".
  - Cause: generated art reads as fake, most of all on what faces the camera.
  - Don't: draw printed matter in code. Use real images, public domain and credited.
- Real printed matter instead of covers drawn in code. All of it is public domain or museum open access, and credited in `public/kit/axis-cube/tex/CREDITS.md`:
  - a WPA Federal Art Project poster behind a mat;
  - paintings by Hartley, Kandinsky, Mondrian and Freundlich;
  - photographs by Toni Frissell and William P. Gottlieb;
  - four magazine covers from 1894 to 1926.
- Under the hood: tests can run the motion without drawing it. ([b6e5e55](https://github.com/onexmac/ad/commit/b6e5e55) · [#69](https://github.com/onexmac/ad/pull/69))

## 0.4.7 · 2026-11-23 08:21

- Three looks of the same room, each at its own address:
  - **A, analogue:** a film photograph, with depth of field on the puzzle in hand, halation, a trace of colour fringing, split toning and grain.
  - **B, brush:** inked and painted.
  - **C, classic:** night, with cool shadows against the warm lamps, more contrast, glow and an old print's specks. ([a7afda8](https://github.com/onexmac/ad/commit/a7afda8) · [#69](https://github.com/onexmac/ad/pull/69))

## 0.4.2 · 2026-11-22 22:52

- The description, the screen-reader label and the portal entry speak of the library and the ottoman instead of the bed. ([7c569d7](https://github.com/onexmac/ad/commit/7c569d7) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.4.1 · 2026-11-22 22:33

- The plant stands forward of the CD tower, and the Discman and discs sit inside the view from above. ([d5b0de3](https://github.com/onexmac/ad/commit/d5b0de3) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.4.0 · 2026-11-22 22:13

- The room becomes a mid-century home library in the nineties:
  - walnut shelving with books, records and compact discs;
  - a sideboard with the hi-fi under the window;
  - a cognac lounge chair and its ottoman;
  - an arc lamp and a glass mushroom lamp as the main lights, with a low, dim sun through the blinds.
- The puzzles rest on the ottoman's leather cushion, which dents under each one and rises again when a puzzle is picked up. ([3b7e30b](https://github.com/onexmac/ad/commit/3b7e30b) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.3.14 · 2026-11-22 21:35

- **Bug fix.** Marcos, 22 Nov 21:22: the "dust cannot feel like fairy dust".
  - Cause: the specks were big, showed everywhere and glittered.
  - Don't: show dust outside the light. Real dust is a pixel or two, seen only where the sun crosses it.
- Dust that looks like dust instead of fairy dust.
  - It is invisible until the sun catches it, then specks of a pixel or two, brightest when the light comes toward the eye.
  - It hangs in uneven clouds and drifts on slow air, with a few flakes that turn and glint softly.
  - Specks near the lens are faint out-of-focus discs. ([70a4404](https://github.com/onexmac/ad/commit/70a4404) · [#68](https://github.com/onexmac/ad/pull/68))

## 0.3.12 · 2026-11-22 21:16

- **Bug fix.** Marcos, 22 Nov 20:52: "Flipping the cube should behave a little bit into its axis. Right now it feels too random."
  - Cause: it spun about whatever axis the finger drew, then snapped to the nearest square pose, so a slanted swipe landed on a face no one could predict.
  - Don't: spin a puzzle about a free axis. It turns about its own axes, picked by the swipe's first pixels.
- Flipping the puzzle turns it about its own axes. The swipe's first pixels pick the axis: sideways for the upright one, up or down for the one across.
- It follows the finger, coasts, ticks at each quarter and lands on the next quarter turn. The cross direction only wobbles and springs back.
- A tap is told from a hold on the hold's own clock, so a slow frame can't swallow a tap. ([d988a82](https://github.com/onexmac/ad/commit/d988a82) · [#67](https://github.com/onexmac/ad/pull/67))

## 0.3.10 · 2026-11-22 20:25

- The TV is off: a dead grey-green tube under reflective glass. The flickering blue light of the static is gone, and the VCR clock still blinks 12:00. ([08847ac](https://github.com/onexmac/ad/commit/08847ac) · [#66](https://github.com/onexmac/ad/pull/66))

## 0.3.9 · 2026-11-22 19:44

- A tap on a face of the puzzle in hand turns that face to the front: of the 24 square poses, the one that turns it most toward you.
- Tapping the face already in front only nudges the puzzle. ([42f5ba0](https://github.com/onexmac/ad/commit/42f5ba0) · [#65](https://github.com/onexmac/ad/pull/65))

## 0.3.7 · 2026-11-22 19:31

- **Bug fix.** Marcos, 21 Nov 09:38: the magi0s link gave "404".
  - Cause: the app was still only on its branch (sim), and the portal serves `main`.
  - Don't: leave a portal link to be tried before the app is on `main`. Say up front where to look meanwhile.
- First on magi0s: everything up to here reaches `main`.
- No web font. The app shows no text that needs one, and fetching it at build time had failed several builds. ([6802c7e](https://github.com/onexmac/ad/commit/6802c7e) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.3.6 · 2026-11-21 19:53

- **Bug fix.** Marcos, 21 Nov 19:11: "Sliding down has to be more intentional", and the room needed "better blacks".
  - Cause: a fifth of the screen, even at a slant, put the puzzle down, so an ordinary spin could do it. And a faded-film veil lifted every black.
  - Don't: let a gesture that undoes something be reached by an ordinary one. And don't lift the blacks for a film look.
- Putting a puzzle down is deliberate: a pull straight down, across a third of the screen.
  - The first stretch is free, so an ordinary downward spin never starts it.
  - After that the puzzle sinks toward the bed, and letting go past the mark puts it down.
- A hold is a finger that stays put. Any drag cancels it and spins the puzzle instead.
- A darker room with real blacks:
  - less ambient light and a dimmer room lamp;
  - a black point and an S-curve on brightness only;
  - no grain in the shadows. ([30d901e](https://github.com/onexmac/ad/commit/30d901e) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.3.3 · 2026-11-21 16:22

- **Bug fix.** Marcos, 21 Nov 16:09: "Two by two should have four dots. The others should have a 3x3 grid."
  - Cause: every puzzle got the same cross of rings, and the 2×2 only lost its middle one.
  - Don't: give every puzzle one layout. The controls follow the face of the puzzle in hand.
- The rings are a grid laid out like the puzzle's face: nine for the Axis Cube and the 3×3, four for the 2×2.
  - A sideways swipe turns the row it starts in; up or down turns the column.
  - The ring under the finger lights on touch, then its whole row or column lights while it turns.
- The grid sits lower, clear of the puzzles resting on the bed. ([b3fcf7c](https://github.com/onexmac/ad/commit/b3fcf7c) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.3.0 · 2026-11-21 13:35

- Three puzzles rest on the bed in a shallow V: a 2×2, the Axis Cube and a classic 3×3. Each presses its own hollow in the duvet.
- A tap picks one up: it floats into the light, the camera drops to face it, and the rings fade in.
- A long swipe straight down puts it back, and the camera rises to choose again.
- The rings become a cross of five, and the 2×2 has no middle ring. ([a71e966](https://github.com/onexmac/ad/commit/a71e966) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.2.10 · 2026-11-21 11:44

- The bed stands off the wall, clear of the sill. Sneakers, comics on the floor and a model plane come in. ([87a270d](https://github.com/onexmac/ad/commit/87a270d) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.2.9 · 2026-11-21 11:31

- **Bug fix.** Marcos, 21 Nov 11:25: the rings had to be hit on the dot; "it's easier to start dragging from afar from the point".
  - Cause: each ring answered only in a small circle around it.
  - Don't: size a swipe control's hit area by its drawing. It runs the length of its swipe, generously.
- Each ring's reach runs along the way it is swiped. A layer ring owns its whole row, edge to edge, and a slice ring owns a tall column, so a swipe can start far from the ring.
- Where a row crosses a column, the first pixels of the swipe decide. ([fd97821](https://github.com/onexmac/ad/commit/fd97821) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.2.7 · 2026-11-21 11:25

- The room rebuilt at real scale: a 3.6 × 4.2 m bedroom with a 2.6 m ceiling, smaller and fuller.
  - A single bed under the window, a nightstand with the lava lamp, a taller shelf with LPs, a desk with drawers, a dresser.
  - A chair with a denim jacket, a crate of records, a backpack, sneakers and boxes under the bed.
- Draw calls drop from 339 to 106.
- The cube sits higher on a phone screen, and the camera stays inside the walls. ([3dd2d84](https://github.com/onexmac/ad/commit/3dd2d84) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.2.2 · 2026-11-21 11:24

- **Bug fix.** Marcos, 21 Nov 11:17: "I should be able to rotate the cube by swiping in it just like before."
  - Cause: the ring controls of 0.2.0 took over the touch, and the swipe on the cube was lost with them.
  - Don't: let a new control take away a gesture that already worked. Retest the old gestures after every change to input.
- A swipe on the cube spins it. It follows the finger, coasts, and settles on the nearest of the 24 poses square to the screen.
- The camera leans a little into the spin. ([f9a77b7](https://github.com/onexmac/ad/commit/f9a77b7) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.2.0 · 2026-11-21 10:56

- Ring controls replace the buttons: six stroked rings, one column turning the horizontal layers and one row turning the vertical slices.
  - A turn follows the finger, keeps its momentum and snaps onto the nearest quarter turn with a spring.
  - A strong flick can travel several quarters.
- Holding the cube opens it, then scrambles or solves it in one go.
- The cube faces the camera square, so the rings' layers are the ones you see. ([cd7c74c](https://github.com/onexmac/ad/commit/cd7c74c) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.16 · 2026-11-21 10:42

- **Bug fix.** Marcos, 21 Nov 10:35: "la almohada parece que flota", and things set on the bed should press it down.
  - Cause: the bed was hard shapes, and things were set on top of them with no contact.
  - Don't: rest anything on something soft without sinking it in. Check every contact up close.
- The bed is rebuilt as cloth: one quilted duvet that wraps the mattress, hangs in folds and is turned back at the head.
- Things set on it press it down: the record and its sleeve settle into hollows, and the pillow no longer floats.
- The hanging plant by the window is gone. ([9a432c7](https://github.com/onexmac/ad/commit/9a432c7) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.14 · 2026-11-21 10:28

- A lived-in room, from new references.
  - Cream plaster walls and an old board floor.
  - Half-open venetian blinds let the sun in striped, with a soft tree outside.
- Things lying around: plants, album sleeves and a record on the bed, a skateboard on the wall, snapshots above the desk, headphones on the chair. ([26626fe](https://github.com/onexmac/ad/commit/26626fe) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.11 · 2026-11-21 10:15

- Dusk only: the day look and its toggle are gone.
- More of the room is modelled: a real pillow, finials on the headboard, cloth-bound books, cassettes, a notebook and pencils, a light switch, a braided rag rug. ([699df0f](https://github.com/onexmac/ad/commit/699df0f) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.9 · 2026-11-21 10:07

- Photo textures (Poly Haven, CC0): cedar, mahogany, wool, cotton and carpet.
- Finer modelling: chamfered furniture, a blanket that falls in folds, and a CRT with a bulging glass face. ([1a07eab](https://github.com/onexmac/ad/commit/1a07eab) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.6 · 2026-11-21 09:57

- **Bug fix.** Marcos, 21 Nov 09:55: "Muy mágico se siente el rayo de sol, muy fuerte."
  - Cause: the shafts of light were dense, and the dust glittered in them.
  - Don't: push an effect past what real light does. Light in the air is faint, and dust doesn't sparkle.
- A quieter sunbeam, and fewer sparkles in the dust. ([b9a2993](https://github.com/onexmac/ad/commit/b9a2993) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.5 · 2026-11-20 21:46

- A fuller, more realistic room:
  - varnished paneling and crown moulding;
  - a shelf of VHS tapes with a globe;
  - a desk with the TV on a VCR, the lava lamp and a boombox;
  - posters and a polaroid.
- A warm lamp with shadows, ambient occlusion, and a warm grade. ([423b3e2](https://github.com/onexmac/ad/commit/423b3e2) · [#64](https://github.com/onexmac/ad/pull/64))

## 0.1.0 · 2026-11-20 21:30

- First version, as Axis Cube: a floating Axis Cube in a dusk room. It is the scene Marcos sent, moved into the portal at /kit/axis-cube. ([7cef55c](https://github.com/onexmac/ad/commit/7cef55c) · [#64](https://github.com/onexmac/ad/pull/64))
