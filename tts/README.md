# Gauntlet Tabletop Simulator assets

This directory contains the supported export path from Gauntlet's governing v0.6.1 sources to Tabletop Simulator-ready raster assets.

## Source discipline

The export pipeline reads the same canonical Markdown sources used by the current Deckbuilder. It does not edit or treat `Gauntlet_v0.6.1_Canonical_Data.json` as an independent authoring surface.

Current inputs:

- `docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md`
- the six definitive v0.6.1 faction guides
- `docs/Gauntlet_v0.6.1_Territory_Pool.md`
- approved card artwork under `images/artwork/cards/`
- the shared card frame and parchment assets under `card-design/` and `images/artwork/card-backgrounds/`

## Commands

```bash
npm run tts:check
npm run tts:catalog
npx playwright install chromium
npm run tts:cards
npm run tts:territories
npm run tts:build
```

- `tts:check` parses every governing source, verifies canonical counts and IDs, and validates the Territory export contract without writing output.
- `tts:catalog` writes normalized deterministic JSON and browser data under `tts/generated/v0.6.1/`.
- `tts:cards` renders the 122 playable cards, the universal prototype back, 10 × 7 TTS face sheets, and `manifest.json`.
- `tts:territories` renders the 25 landscape Territories and Arenas, a landscape prototype back, one 7 × 4 face sheet, and `territory-manifest.json`.
- `tts:build` runs both raster exporters.

The generated directory is intentionally ignored by Git. GitHub Actions uploads it as a downloadable review artifact instead of committing derived PNGs.

## Component families

Playable cards use the normal 2.5 × 3.5-inch portrait frame. Territories and Arenas use a 3.5 × 2.5-inch landscape sibling of that same frame: the same ivory shell, parchment interior, historical title face, rules face, keylines, and footer grammar. Arenas remain Territories and differ only through restrained crimson title and rule accents.

The included backs are explicitly prototypes. Replace them when the universal production backs are approved.

## Playable-card sheet contract

- 10 columns × 7 rows
- 69 playable face slots per sheet
- final slot reserved for the hidden-card image
- 400 × 560 pixels per card
- 4000 × 3920 pixels per sheet
- shared back, `BackIsHidden: true`, `UniqueBack: false`

## Territory sheet contract

- 7 columns × 4 rows
- 27 face slots plus the final hidden-card image
- 560 × 400 pixels per Territory
- 3920 × 1600 pixels per sheet
- deck ID 50, separate from playable-card deck IDs
- shared landscape back, `BackIsHidden: true`, `UniqueBack: false`

The manifests assign deterministic TTS CardIDs and record each component's sheet and zero-based face index. Upload URLs are deliberately not embedded; the future mod publisher will combine the manifests with the chosen asset host.
