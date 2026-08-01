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
- the dedicated landscape Territory frame under `tts/territory-renderer/`

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
- `tts:cards` renders all playable cards, their temporary back, 10 × 7 face sheets, and `manifest.json`.
- `tts:territories` renders all 25 landscape Territories, their temporary back, one 7 × 4 face sheet, and `territory-manifest.json`.
- `tts:build` runs both raster families in sequence.

The generated directory is intentionally ignored by Git. The GitHub Actions workflow uploads it as a downloadable artifact instead of committing derived PNGs.

## Playable-card contract

- 400 × 560 pixels per card
- 10 columns × 7 rows
- 69 playable face slots per sheet
- final slot reserved for the hidden-card image
- 4000 × 3920 pixels per sheet
- shared back, `BackIsHidden: true`, `UniqueBack: false`

`manifest.json` assigns deterministic TTS CardIDs and records each playable card's sheet and zero-based face index.

## Territory contract

Territories retain the established landscape orientation because their orientation indicates control on the tabletop.

- 560 × 400 pixels per Territory
- 21 standard Territories and four Arenas
- 7 columns × 4 rows
- 25 occupied face slots and two unused slots
- final slot reserved for the hidden-card image
- 3920 × 1600 pixels per sheet
- one shared landscape back, `BackIsHidden: true`, `UniqueBack: false`
- TTS deck ID 50, kept separate from playable-card deck IDs

`territory-manifest.json` records each Territory's zero-based position, Arena status, and deterministic TTS CardID.

## Current boundaries

Both included backs are prototypes. Replace them when the production playable-card and Territory backs are approved.

Asset hosting URLs are deliberately not embedded. The future mod publisher will combine the manifests with the chosen asset host and TTS save object.
