# PS2 Fiori: changelog

PS2 Fiori lives at [/kit/ps2-fiori](https://magi0s.vercel.app/kit/ps2-fiori): a self-loading concrete mixer (the
MAZA MZ-20) as an item in a PS2-era inventory screen, to turn, load and mix. It began as Marcos's artifact, the
Self-Loading Mixer page.

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

None yet.

Open: none.

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
  again without a jump.
