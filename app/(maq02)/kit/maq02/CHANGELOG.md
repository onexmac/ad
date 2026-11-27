# MAQ02: changelog

MAQ02 lives at [/kit/maq02](https://magi0s.vercel.app/kit/maq02): a self-loading concrete mixer (the
MAZA MZ-20) as an item in an inventory screen, to turn, load and mix. It began as Marcos's artifact, the
Self-Loading Mixer page, in a PS2 look; since 0.2.0 it wears paper and ink, after three references he sent (a pixel
keypad, a line-art widget screen, a retro desktop). It was PS2 Fiori, at /kit/ps2-fiori, until 0.2.1; the old link
still lands here.

## How versions are numbered

Every push to Vercel that changes the app gets an entry here. The first push was 0.1.0, and each version after it
jumps by how big its push was:

| Jump | When |
| :--- | :--- |
| +0.0.1 | a small change |
| +0.0.2 or +0.0.3 | a bigger one |
| +0.0.5 | a big one |
| +0.1.0 | one too big for that (the last number goes back to 0) |
| +0.5.0 | only something massive |
| 1.0.0 | a milestone Marcos names |

The second and third numbers roll over like an odometer: 0.1.9 then 0.2.0. Each entry gives the date and time in
Costa Rica and what changed. An entry that fixes a bug Marcos reported starts with it: his words, the cause, and what
not to do.

## Bugs Marcos reported

- **0.2.3** A request about the UI changes the UI only: never restyle the mixer or its scene unless Marcos asks for
  the scene itself.

Open: none.

## 0.2.3 · 2026-11-26 21:46

**Claude:** The mixer is back in its original finish (bloom, dither, chrome and all), now parked in a white-and-gray showroom under the new paper screen. Sorry, little truck.

- **Bug fix.** Marcos, 26 Nov 21:46: "Ui is perfect. Why did you change the mixer? Have it back to the way it was rendered before, keep whites/grays for the background but with the first approach"
  - Cause: 0.2.0 was asked to make the UI look like his references, and it restyled the 3D scene too (cel shading, ink outlines, paper floor, pastel sky, falling leaves), which nobody asked for.
  - Don't: carry a UI request into the scene. The screen and the scene change separately, each only when asked.

- The mixer renders as in 0.1.0 again: lit per vertex with the sphere-map shine, dithered to 5 bits a channel, its
  original whites, grays, orange stripes, red rams and chrome; the half-size bloom, the scanlines and the vignette
  over it; the hexagonal pedestal with its rings, the beam of light, the grid floor fading into fog, sparkles rising.
- The room is white and gray instead of the artifact's blue: Paper is a white-to-light-gray sky over a pale gray
  floor with a gray grid, gray rings and sparkles, and a soft bloom; Ink is the same in charcoal, with the rings and
  sparkles in paper and the stronger bloom.
- Kept from 0.2.0: the whole screen (windows, LCD, keys, dialogs), and the springs on the mixer: it pops in past its
  size, squashes on a mix and hops when a load finishes. ([#225](https://github.com/onexmac/ad/pull/225))

## 0.2.1 · 2026-11-26 21:40

**Claude:** Same mixer, new name on the door: MAQ02. The old address forwards here, so nobody gets lost on the way to the drum.

Asked by Marcos, 26 Nov 21:40: "Let's call this app MAQ at vercel MAQ02"

- The app is MAQ02 now, at /kit/maq02: in the kit index, the page's title and its home-screen name.
- /kit/ps2-fiori and its list of changes forward to /kit/maq02.
- The theme picked before the rename is kept. ([#224](https://github.com/onexmac/ad/pull/224))

## 0.2.0 · 2026-11-26 21:38

**Claude:** New coat of paint: paper, ink and pastel folders, keys you can actually press, and a mixer drawn in fat pixel lines. Everything bounces now. The mixer included. Especially the mixer.

Asked by Marcos, 26 Nov 21:30: "Have the ui look like this. With springy and bouncy ux"

- **The look.** Paper and ink, after his three references: a pixel keypad (The Cubes'), a line-art phone screen of
  widgets, a retro desktop with windows and pastel folders.
  - Every panel is a window: paper, a 2.5 px ink stroke, a 22 px corner, an ink lip 3 px below and a soft shadow; a
    title bar with a dot and its name, a line under it.
  - The top: the inventory widget (ITEMS / KEY / EQUIP in an ink pill with the lit one in paper, "Inventory" in
    Nunito 900, the version under it) and the concrete widget, its value on an LCD (DSEG7, the unlit 8.8 behind) over
    a pill bar. The theme chip below it: Paper or Ink.
  - The item's window: its title bar with ×01 on the LCD, the brand and the stars, the description typing itself,
    three stat tiles in pastel (pink, blue, yellow) with segmented bars, and three pixel keycaps.
  - The keys are drawn as pixel glyphs (✕, a solid triangle, a square) with their names in Silkscreen; each sits on a
    lip and goes down onto it under the finger.
  - The warnings are System warning dialogs with a pixel ⚠ and a yellow dot; good news comes as System with a mint dot.
    The +1.8 m³ is a yellow sticker, tilted.
  - The list of changes is a window too: versions on the LCD, INPUT and OUTPUT as pink and blue tags.
- **The scene in the same look.** Still drawn at 448 px tall and scaled up square-edged, so every line is a fat pixel.
  - Cel-shaded in three flat bands, with a hard highlight, still dithered to 5 bits a channel. The PS2 sphere-map
    shine, the bloom, the scanlines, the vignette and the beam are gone.
  - Every piece is inked: a back-face outline 1.25 of its pixels wide, plus lines on the hard edges.
  - The mixer in paper with peach stripes and a pale-blue cab glass; the pedestal in paper, its rings and the shadow
    in ink; a paper floor with a faint ruled grid; pastel waves in the sky above the horizon; ink leaves drifting down
    and swaying instead of sparkles rising.
  - Ink (the dark theme) swaps paper and ink, on screen and in the scene. Paper is now the first theme.
- **Springs.** Damped springs everywhere (ζ 0.38 for pops, 0.55 for settles), as CSS easings and in the scene:
  - The windows pop in past their size one after another (70 ms apart) and settle; the stat bars fill cell by cell.
  - A key snaps down in 50 ms and springs back up in 600 ms; the theme chip and the version do the same.
  - Mixing squashes the mixer and lets it spring back; a finished load makes it hop; it pops in when the page opens.
  - The concrete widget bumps on each mix; its bar slides on a spring; a theme change wobbles every window.
  - Dialogs spring in from half size; the list of changes rises on a spring and, let go mid-drag, springs back.
- Haptics: a tick on load, spin, the theme and each dialog; a double tap on a mix; a buzz on a warning.
  ([#223](https://github.com/onexmac/ad/pull/223))

## 0.1.0 · 2026-11-26 21:25

**Claude:** The mixer moved out of its artifact and into the portal. Same drum, same dither, same 448 lines of glorious low resolution; the drum still never stops turning (we checked, twice).

Asked by Marcos, 26 Nov 21:12: "I need this as code ad and on magi0s / kit"

- **The item.** The MAZA MZ-20 self-loading mixer, built in the browser from boxes, lathes and extrusions: the
  striped drum on its tilt, the cab with its glass and orange beacon, four wheels, the loading shovel on its arms with
  two red rams that follow it, the hopper and the chute.
- **The PS2 look.** The scene renders 448 px tall and is scaled up without smoothing; every surface is lit per vertex
  with a sphere map for its shine and dithered down to 5 bits a channel. A half-size blurred copy lies over it as the
  glow, with scanlines and a vignette above. The item floats over a hexagonal pedestal in a beam of light, over a grid
  floor that fades into fog, with sparkles rising.
- **The screen.** INVENTORY at the top with its tabs (EQUIPMENT lit) and the concrete meter; the item's card at the
  bottom (beside it on a wide screen): name, stars, a description that types itself, three stat bars and three keys.
  - Drag to turn it, pinch or scroll to come closer; when left alone it turns by itself.
  - **Load** (△, or L): the shovel comes down, scoops, rises and tips the aggregate into the drum, 3.6 s.
  - **Mix** (✕, or X): the drum spins up and the item shakes, a flash, +1.8 m³ on the meter; past 9 m³ the slab is
    poured and the meter starts again. Mixing an empty drum, or loading a full one, says so.
  - **Spin** (□, or G) stops and starts the turning by itself; **SELECT** (or M) switches dark and light, and the
    page remembers it.
- **What changed from the artifact.** The version sits under the tabs and opens this list. The HUD clears the status
  bar on a phone. A finger the system takes away no longer flings the item, and one finger left of a pinch turns it
  again without a jump. ([#220](https://github.com/onexmac/ad/pull/220))
