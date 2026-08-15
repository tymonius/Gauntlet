# Gauntlet Tabletop Simulator assets

This directory contains the supported export path from the published Gauntlet v0.6.3 data and production card renderers to Tabletop Simulator-ready raster assets.

## Source discipline

The current TTS catalog reads the published canonical dataset directly:

- `releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json`
- approved playable-card artwork under `images/artwork/cards/`
- the shared production playable-card renderer under `card-design/` and `tts/renderer/`
- the shared production card-back component under `card-design/card-back.css` and `card-design/card-back.js`
- the shared Territory renderer under `card-design/territory-card.css` and `tts/territory-renderer/`

The older v0.6.2 generator files remain in `scripts/` only as historical tooling. The supported npm commands below use the v0.6.3 pipeline.

## Commands

```bash
npm run tts:check
npm run tts:catalog
npx playwright install chromium
npm run tts:cards
npm run tts:territories
npm run tts:build
```

- `tts:check` validates the published v0.6.3 catalog, canonical counts, IDs, and Territory export contract without writing raster output.
- `tts:catalog` writes deterministic v0.6.3 catalog JSON/browser data under `tts/generated/v0.6.3/`.
- `tts:cards` renders all 128 playable-card faces, six production faction back assets, two 10 × 7 TTS face sheets, and `manifest.json`.
- `tts:territories` renders all 25 landscape Territories/Arenas, one 7 × 4 face sheet, the temporary landscape Territory back, and `territory-manifest.json`.
- `tts:build` runs both raster exporters.

The generated directory is intentionally ignored by Git. GitHub Actions uploads it as a review artifact rather than committing derived PNGs.

## Playable-card backs

The playable-card back is production artwork, not a prototype. The exporter renders the exact shared component used on `/card-design/` in six colorways:

- Military
- Diplomats
- Financiers
- Intelligence
- Mystics
- Inquisition

Back assignment is **by player faction**, not by the allegiance printed on the card face. Every card in a player's deck—including Neutral cards—must use that player's faction back. This prevents a face-down card from revealing whether it is Neutral or faction-specific.

The face sheets remain shared across all players. A future TTS save/mod publisher should use the chosen faction back as that player's deck `BackURL`, with `BackIsHidden: true` and `UniqueBack: false`. The final face-sheet slot contains the Intelligence back only as a deterministic fallback image; it is not the intended back for every player deck.

## Playable-card sheet contract

- 10 columns × 7 rows
- 69 playable face slots per sheet
- final slot reserved for the fallback hidden-card image
- 400 × 560 pixels per card/back
- 4000 × 3920 pixels per sheet
- `BackIsHidden: true`
- `UniqueBack: false`
- six selectable faction back files under `tts/generated/v0.6.3/backs/`

`manifest.json` records deterministic TTS CardIDs, face-sheet positions, all six back variants, and the player-faction back policy.

## Territory sheet contract

Territories and Arenas use the current 3.5 × 2.5-inch landscape production face renderer.

- 7 columns × 4 rows
- 27 face slots plus the final hidden-card image
- 560 × 400 pixels per Territory
- 3920 × 1600 pixels per sheet
- deck ID 50, separate from playable-card deck IDs
- `BackIsHidden: true`
- `UniqueBack: false`

The Territory back is still explicitly temporary; designing a production landscape back is separate from the now-finished playable-card backs.

## Remaining TTS work

These exports deliberately contain no hosted asset URLs and do not yet constitute a playable TTS save. The next layer is the mod publisher/table implementation: host the generated sheets and backs, build CustomDeck/Deck objects from the manifests, construct the twelve starter decks with the correct player-faction back, and assemble the Gauntlet table/save definition.
