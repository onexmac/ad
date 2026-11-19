# Falcon UI

The Figma file for the Puncheo UI (Leia skin):
https://www.figma.com/design/10uxO79DzZzFbgBpeN90vT

## Versions

| Version | Date | What |
| --- | --- | --- |
| v1 · Claude baseline | 2026-11-18 | Built by Claude from `/ad/puncheo` (B), as of PR #40. Snapshot: `v1-baseline.json`. |
| v1.1 · sin auto layout | 2026-11-18 | Marcos asked for no auto layout. Claude removed it everywhere and detached the screens' instances so every layer edits directly; the library stays. **Current baseline:** `v1.1-baseline.json`. |

### Marcos's edits

| Seen | What |
| --- | --- |
| v1.1 | A copy of "Puncheo · Foto (anotar)" at x 3110 (`9:714`): the viewer strip in a pink tone, the slide-to-delete handle red with a white bin, the track darker. Detached by Claude in v1.1, otherwise untouched. |

Everything after the current baseline is Marcos's edits. The canvas carries the same
mark: the yellow "Nota de versión" frame on the Puncheo page.

## Reading Marcos's changes

1. Snapshot the Puncheo page again with the same serializer (format described in
   the `format` field of the current baseline; instances are not expanded, component
   definitions are).
2. Diff by node id: added, removed, renamed, moved or resized nodes; changed text,
   fills, radii, effect styles, auto layout, component props and variable values.
3. Write the changes down as the next version row here, with what they mean for the
   app's code, before touching `components/puncheo/`.

Figma's plugin API can't save to version history, so the named version in Figma
(if any) is saved by hand: "v1.1 · sin auto layout".
