# Gauntlet Tabletop Simulator assets

This directory contains the supported export path from Gauntlet's **current published release** and shared production renderers to Tabletop Simulator-ready raster assets and starter-deck manifests.

## Release-driven source discipline

The TTS pipeline does not hard-code a game version. It resolves the current release from the same repository metadata used by publication:

- `config/release-lifecycle.json` declares which release is current and publicly cut over;
- `config/github-release-contract.json` must agree on that release and identifies its published canonical-data and starter-deck assets;
- `scripts/tts-current-catalog.mjs` validates that agreement, finds the current release assets, and derives the versioned output path.

The exporters then consume:

- the resolved current canonical dataset;
- the resolved current starter-deck dataset;
- approved playable-card artwork under `images/artwork/cards/`;
- the shared production playable-card renderer under `card-design/` and `tts/renderer/`;
- the shared production card-back component under `card-design/card-back.css` and `card-design/card-back.js`;
- the shared Territory renderer under `card-design/territory-card.css` and `tts/territory-renderer/`.

A release cutover should therefore require **no TTS script fork, rename, count update, or version-string edit**. Advancing the normal release lifecycle and GitHub release contract is enough for the supported TTS commands to follow the new current release.

## Commands

```bash
npm run tts:check
npm run tts:catalog
npx playwright install chromium
npm run tts:cards
npm run tts:territories
npm run tts:starters
npm run tts:build
```

- `tts:check` resolves the current release and validates its canonical cards, Territories, published starter decks, IDs, construction limits, release metadata, and artwork coverage without writing raster output.
- `tts:catalog` writes deterministic catalog JSON/browser data under both `tts/generated/<current-release>/` and the generated `tts/generated/current/` alias used by the render surfaces.
- `tts:cards` renders every current playable-card face, six production faction back assets, as many 10 × 7 TTS face sheets as necessary, and `manifest.json`.
- `tts:territories` renders every current landscape Territory/Arena, as many 7 × 4 sheets as necessary, the temporary landscape Territory back, and `territory-manifest.json`.
- `tts:starters` joins the current published starter-deck source to those generated card/Territory manifests and writes `starter-deck-manifest.json` under both the versioned output and `tts/generated/current/`.
- `tts:build` renders cards and Territories, then assembles the starter decks from the exact manifests produced by that build.

The generated directory is intentionally ignored by Git. GitHub Actions uploads the complete `tts/generated/` tree as a review artifact instead of committing derived PNGs.

## Playable-card backs

The playable-card back is production artwork, not a prototype. The exporter renders the exact shared component used on `/card-design/` in six colorways:

- Military
- Diplomats
- Financiers
- Intelligence
- Mystics
- Inquisition

Back assignment is **by player faction**, not by the allegiance printed on the card face. Every card in a player's deck—including Neutral cards—must use that player's faction back. This prevents a face-down card from revealing whether it is Neutral or faction-specific.

The face sheets remain shared across all players. A TTS save/mod publisher should use the chosen faction back as that player's deck `BackURL`, with `BackIsHidden: true` and `UniqueBack: false`. The final face-sheet slot contains the Intelligence back only as a deterministic fallback image; it is not the intended back for every player deck.

## Playable-card sheet contract

- 10 columns × 7 rows
- 69 playable face slots per sheet
- final slot reserved for the fallback hidden-card image
- 400 × 560 pixels per card/back
- 4000 × 3920 pixels per sheet
- `BackIsHidden: true`
- `UniqueBack: false`
- six selectable faction back files under `tts/generated/<current-release>/backs/`
- sheet count derived from the current canonical card count

`manifest.json` records deterministic TTS CardIDs, face-sheet positions, all six back variants, the resolved release authority, and the player-faction back policy.

## Territory sheet contract

Territories and Arenas use the current 3.5 × 2.5-inch landscape production face renderer.

- 7 columns × 4 rows
- 27 Territory face slots per sheet plus the final hidden-card image
- 560 × 400 pixels per Territory
- 3920 × 1600 pixels per sheet
- deterministic deck IDs beginning at 50, separate from playable-card deck IDs
- additional sheets/deck IDs created automatically if the current Territory pool grows beyond 27 cards
- `BackIsHidden: true`
- `UniqueBack: false`

The Territory back is still explicitly temporary; designing a production landscape back is separate from the now-finished playable-card backs.

## Starter-deck assembly contract

The starter assembler does **not** duplicate face-sheet placement logic. It validates the published starter-deck source against the current canonical catalog, then joins each selected card and Territory to the CardIDs and sheet records in the manifests produced by `tts:cards` and `tts:territories`.

For every current starter deck, `starter-deck-manifest.json` records:

- starter ID, display name, faction, and Leader ID;
- the faction back file that must be applied to the whole playable deck;
- canonical card IDs, quantities, costs, factions, and generated TTS CardIDs;
- an expanded `deckCardIds` list ready for later Deck construction;
- exactly which shared face sheets that starter uses;
- selected Territory IDs and their generated TTS CardIDs;
- recommended Territory order and setup guidance from the published starter source.

Source validation derives its limits from the starter artifact's own `construction` object. It verifies card count, deckbuilding value, faction legality, Unique-card copy limits, Territory count, Arena limits, and that recommended Territory order contains exactly the selected Territories. It does not hard-code the number of starter decks.

## Release durability contract

For an ordinary future release, TTS should continue working when the release process does these things:

1. update `config/release-lifecycle.json` so the new release is `current` with `public_cutover: true`;
2. update `config/github-release-contract.json` so `current_release.tag` matches and its `assets` list contains the new canonical-data and starter-deck JSON files;
3. publish those data files and any new artwork/rendering changes through the normal shared surfaces.

The TTS resolver fails closed if the two release authorities disagree or if the current GitHub release contract does not publish the required source assets. Card, Territory, and starter-deck counts are read from current release data rather than duplicated in exporter constants.

## Remaining TTS work

These exports deliberately contain no hosted asset URLs and do not yet constitute a playable TTS save. The next layer is the mod publisher/table implementation: host the generated sheets and backs, translate the starter manifest into real CustomDeck/Deck objects, add Leader components, and assemble the Gauntlet table/save definition.
