# Gauntlet Tabletop Simulator assets

This directory contains the supported export path from Gauntlet's governing v0.6.1 sources to Tabletop Simulator-ready raster assets.

## Source discipline

The export pipeline reads the same canonical Markdown sources used by the current Deckbuilder. It does not edit or treat `Gauntlet_v0.6.1_Canonical_Data.json` as an independent authoring surface.

Current inputs:

- `docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md`
- the six definitive v0.6.1 faction guides
- `docs/Gauntlet_v0.6.1_Territory_Pool.md`
- approved card artwork under `images/artwork/cards/`
- the shared playable-card frame under `card-design/`
- the dedicated landscape Territory/Arena frame under `tts/territory-renderer/`

## Commands

```bash
npm run tts:check
npm run tts:catalog
npx playwright install chromium
npm run tts:cards
npm run tts:territories
npm run tts:build
```

- `tts:check` parses every governing source, verifies canonical counts and IDs, and reports missing playable-card artwork without writing output.
- `tts:catalog` writes normalized deterministic JSON and browser data under `tts/generated/v0.6.1/`.
- `tts:cards` renders the 122 playable cards, their temporary back, and the two playable-card sheets.
- `tts:territories` consumes an existing generated catalog and renders the 25 Territories, their temporary back, and the Territory sheet.
- `tts:build` runs the complete playable-card and Territory pipeline in order and writes the combined `manifest.json`.

The generated directory is intentionally ignored by Git. The GitHub Actions workflow uploads it as a downloadable artifact instead of committing derived PNGs.

## Playable-card contract

- portrait 2.5 × 3.5-inch frame
- 400 × 560 pixels per card
- 10 columns × 7 rows per sheet
- 69 playable face slots per sheet
- final slot reserved for the hidden-card image
- 4000 × 3920 pixels per sheet
- shared prototype back, `BackIsHidden: true`, `UniqueBack: false`

## Territory and Arena contract

Territories use a dedicated landscape component frame rather than the playable-card frame. Standard Territories use a navy-and-bronze treatment; Arenas use a crimson-and-bronze treatment. Only canonical player-facing name, category, complexity, and effect text appear on the component. Internal status and playtest-watchlist metadata are not rendered.

- landscape 3.5 × 2.5-inch frame
- 560 × 400 pixels per Territory
- 21 standard Territories and four Arenas
- canonical source order, numbered 1–25
- one 5-column × 6-row sheet
- 29 usable face slots; final slot reserved for the hidden-card image
- 2800 × 2400 pixels per sheet
- shared prototype Territory back, `BackIsHidden: true`, `UniqueBack: false`
- deterministic Territory deck ID `3`, following playable-card deck IDs `1` and `2`

`manifest.json` assigns deterministic TTS CardIDs and records each component's family, sheet, and zero-based face index. Upload URLs are deliberately not embedded; the future mod publisher will combine the manifest with the chosen asset host.

## Current boundaries

The raster pipeline now covers all 122 playable cards and all 25 Territories. The playable-card back and Territory back remain explicit playtest prototypes pending approval of production backs. Asset hosting and the TTS save/mod object remain separate later stages.
