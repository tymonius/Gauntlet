# Gauntlet Tabletop Simulator assets

This directory contains the first supported export path from Gauntlet's governing v0.6.1 card sources to Tabletop Simulator-ready raster assets.

## Source discipline

The export pipeline reads the same canonical Markdown sources used by the current Deckbuilder. It does not edit or treat `Gauntlet_v0.6.1_Canonical_Data.json` as an independent authoring surface.

Current inputs:

- `docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md`
- the six definitive v0.6.1 faction guides
- `docs/Gauntlet_v0.6.1_Territory_Pool.md`
- approved card artwork under `images/artwork/cards/`
- the shared card frame under `card-design/`

## Commands

```bash
npm run tts:check
npm run tts:catalog
npx playwright install chromium
npm run tts:build
```

- `tts:check` parses every governing source, verifies canonical counts and IDs, and reports missing artwork without writing output.
- `tts:catalog` writes normalized deterministic JSON and browser data under `tts/generated/v0.6.1/`.
- `tts:build` also renders one 400 × 560 PNG per playable card, a temporary playtest back, 10 × 7 TTS face sheets, and `manifest.json`.

The generated directory is intentionally ignored by Git. The manual GitHub Actions workflow uploads it as a downloadable artifact instead of committing derived PNGs.

## Current scope

The first raster pass covers all 122 playable cards. The catalog already carries the 25 Territories so the next component-family pass can add their distinct frame without forcing them into the playable-card design.

The included card back is explicitly a prototype. Replace it when the universal production back is approved.

## TTS sheet contract

- 10 columns × 7 rows
- 69 playable face slots per sheet
- final slot reserved for the hidden-card image
- 400 × 560 pixels per card
- 4000 × 3920 pixels per sheet
- shared back, `BackIsHidden: true`, `UniqueBack: false`

`manifest.json` assigns deterministic TTS CardIDs and records each card's sheet and zero-based face index. Upload URLs are deliberately not embedded; the future mod publisher will combine the manifest with the chosen asset host.
