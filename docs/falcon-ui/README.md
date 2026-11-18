# Falcon UI

The Figma file for the Puncheo UI (Leia skin):
https://www.figma.com/design/10uxO79DzZzFbgBpeN90vT

## Versions

| Version | Date | What |
| --- | --- | --- |
| v1 · Claude baseline | 2026-11-18 | Built by Claude from `/ad/puncheo` (B), as of PR #40. Snapshot: `v1-baseline.json`. |

Everything after v1 is Marcos's edits. The canvas carries the same mark: the yellow
"Nota de versión · v1" frame on the Puncheo page.

## Reading Marcos's changes

1. Snapshot the Puncheo page again with the same serializer (format described in
   the `format` field of `v1-baseline.json`; instances are not expanded, component
   definitions are).
2. Diff by node id: added, removed, renamed, moved or resized nodes; changed text,
   fills, radii, effect styles, auto layout, component props and variable values.
3. Write the changes down as the next version row here, with what they mean for the
   app's code, before touching `components/puncheo/`.

Figma's plugin API can't save to version history, so the named version in Figma
(if any) is saved by hand: "v1 · Claude baseline".
