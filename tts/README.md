# Gauntlet Tabletop Simulator assets

This directory contains Gauntlet's supported Tabletop Simulator export, packaging, QA, and publication path.

For the v0.7.0 closeout, the active TTS product identity is **v0.7.0** while the approved current-game source bundle retains its own provenance. The TTS pipeline deliberately separates those concepts rather than relabeling source data.

## Source and release identity

Active-development game authority comes from:

- `game-data/current-game.json` and the source files it names;
- `game-data/current-game.json#componentContract` for physical faction/shared components and TTS representation metadata; and
- `config/tts-release-target.json` for the active TTS package version.

`config/release-lifecycle.json` and `config/github-release-contract.json` still describe the immutable currently published web/release state. They are used where published-release fallback or publication validation is required, but they do not determine the v0.7.0 development package identity.

Generated metadata records both the TTS package version and source/canonical-data version. For the current closeout that means:

- TTS package/display version: `v0.7.0`;
- current-game source version: `v0.6.4-candidate`; and
- currently published release: independently resolved from release metadata.

The runtime does not hard-code starter, card, Leader, or Territory counts.

## Commands

```bash
npm run tts:components:check
npm run tts:supplementals:check
npm run tts:finalized-supplementals:check
npm run tts:check
npm run tts:catalog
npx playwright install chromium
npm run tts:cards
npm run tts:territories
npm run tts:leaders
npm run tts:starters
npm run tts:supplementals
npm run tts:finalized-supplementals
npm run tts:release:stage
npm run tts:save
npm run tts:save:assemble
node tts/validate-v070-authoritative-save.mjs
npm run tts:release:status
npm run tts:release:strict
npm run tts:package
npm run tts:save:promote
```

`tts:package` is the complete **Review Scaffold** build. It renders and assembles the package, validates the authoritative save contract, and writes a non-strict readiness report, but it deliberately does not promote the save to final Workshop identity.

`tts:save:promote` is a separate guarded action. It is documented in `tts/SAVE-PUBLISHER.md` and requires clean machine readiness plus the versioned manual-QA gate.

## Current v0.7.0 package

The current generated package contains:

- 142 playable cards;
- 25 landscape Territories, including 4 Arenas;
- 12 Leader Cards;
- 12 starter Bags;
- 27 ready faction supplemental component definitions;
- 68 supplemental object copies assembled across the starter Bags; and
- 73 staged network assets.

Those counts are observations from the current generated manifests, not constants embedded in the runtime.

The 27 ready faction component definitions are:

| Faction | Generated components |
| --- | --- |
| Military | Command Tracker |
| Diplomats | Influence Tracker; Diplomat Reference Card; 9 Proposal / Treaty Article cards |
| Financiers | Financier Reference Card; Capital Limit Tracker; Capital Ledger; Deed Card (8 copies per starter) |
| Intelligence | Mission Reference Card; Operations Reference Card; Intel Tracker; Operation Progress Tracker |
| Mystics | Mystics Reference Card; Rite of Echoes; Rite of Blood; Rite of Crossing |
| Inquisition | Inquisition Doctrine Reference Card; Purge Reference Card; Conviction Tracker |

The Universal Reference Card is a shared component and is tracked separately from this faction-component inventory.

## Back policy

The v0.7.0 TTS package distinguishes ordinary hidden-information Deck/Territory backs from public faction-component backs:

- playable Decks use the universal black back;
- Territories use the same universal black back;
- Neutral playable cards always use the same standard back as the rest of their player's Deck, so face-down allegiance is never leaked;
- Leader Cards use faction-color component backs;
- single-sided faction component cards such as Deeds use the matching faction-color component back; and
- two-sided public components such as reference cards, Rites, Proposals/Treaties, and the Capital Ledger use their generated reverse face rather than an ordinary Deck back.

The six production faction back images are still rendered because they are required by Leaders and faction components even though playable Decks and Territories use universal black.

## Playable-card asset contract

Playable card export uses the shared production card renderer and writes deterministic face sheets plus `manifest.json`.

- 400 × 560 pixels per card;
- 10 × 7 sheet geometry;
- deterministic TTS CardIDs;
- `BackIsHidden: true`;
- `UniqueBack: false`; and
- sheet count derived from the current playable-card catalog.

Approved artwork is resolved through the current-game catalog. Missing artwork can be made fatal through the strict-art workflow option.

## Territory asset contract

Territories and Arenas use the current landscape production surface.

- 560 × 400 pixels per Territory;
- 7 × 4 sheet geometry;
- deterministic Territory deck IDs beginning in their reserved range;
- standard `CardCustom` scale with landscape presentation in the generated save; and
- universal black hidden back in starter packages.

There is no separate Territory-specific back asset.

## Leader asset contract

Leader export does not maintain a second copy of Leader rules or layout. The current-game authority supplies the roster and `/card-design/` supplies the production face, portrait, faction treatment, rules, and geometry.

For TTS export, the production surface is captured at exact 400 × 560 geometry. The exporter overlays the active TTS package display version on the captured footer so a v0.7.0 TTS Leader does not inherit the older source-bundle label. Source provenance remains separately recorded in `leader-manifest.json`.

Leader Cards use faction-color component backs and deterministic one-card CustomDeck IDs.

## Starter-deck assembly contract

The starter assembler validates starter construction against the current catalog, then joins each selected playable card, Territory, and Leader to the generated manifests.

For each starter it records:

- exact playable-card IDs and quantities;
- selected Leader;
- three selected Territories and recommended order;
- shared face-sheet references;
- universal black Deck/Territory back; and
- the faction-color component back used by the Leader and applicable supplemental components.

It does not hard-code starter, card, Leader, or Territory counts; those are derived from current source data and manifests.

## Supplemental asset contract

`scripts/generate-tts-supplemental-assets.mjs` renders components already marked production-ready in the physical component contract. `scripts/generate-tts-finalized-supplementals.mjs` is the explicit production bridge for final Proposal/Treaty, Capital Ledger, and Deed definitions whose raw contract status remains export-pending for provenance.

After both passes, the current v0.7.0 generated supplemental manifest has 27 ready and 0 pending faction component definitions.

Supported representations include:

- two-sided Custom Cards;
- single-sided faction-backed Custom Cards;
- landscape supplemental cards; and
- non-stackable sliding-tracker Custom Tiles with renderer-derived snap registration.

Rules automation remains out of scope.

## Sliding trackers in TTS

The generated package currently includes six sliding trackers:

- Military Command;
- Diplomat Influence;
- Financier Capital Limit;
- Intelligence Intel;
- Intelligence Operation Progress; and
- Inquisition Conviction.

Tracker snap positions are derived from registration lines on the production component surface rather than maintained in a second faction-specific coordinate table. `scripts/tts-supplemental-geometry.mjs` owns the single conversion from printed-card geometry to TTS `Custom_Tile` geometry, including the card-sized tile footprint, rounded-rectangle tile type, and local snap coordinates. The assembler writes that final geometry directly into each tracker object; no post-generation physical correction pass exists.

The Intelligence trackers share a nested assembly while remaining independently draggable through separate layers/tags.

See `docs/tts-sliding-trackers.md` for the implementation contract.

## Supplemental save assembly contract

`scripts/assemble-tts-supplemental-save.mjs` injects every ready faction supplemental into every matching starter Bag using the generated component quantities and staged hosted assets.

Assembly is idempotent. Generated supplemental objects carry a `gauntlet:supplemental:<component-id>` marker, so a rebuild removes prior generated supplementals before inserting the current set while leaving the base Deck, Leader, and Territories intact.

The current package assembles 68 expected supplemental copies across the 12 starter Bags. Landscape supplemental cards are created at standard `CardCustom` scale and final landscape orientation. Sliding trackers are created at their final `Custom_Tile` geometry and snap registration from the shared geometry contract.

## Review Scaffold contract

`scripts/generate-tts-save.mjs` creates a two-player Review Scaffold with:

- Red and Blue hand zones;
- six center-line Gauntlet snap points;
- one battle d6 per player;
- one Player Token per player; and
- one selectable starter Bag for every current starter.

The base scaffold receives the authoritative table layout, is assembled with faction supplementals, and is then validated by `tts/validate-v070-authoritative-save.mjs`. Validation is fail-closed: it checks the generated save as written and does not repair object geometry.

Behavioral tests construct the returned save JSON and verify the core table structure, starter core contents, landscape Territory presentation, supplemental packaging, tracker geometry, and HTTPS custom-object URLs. Actual TTS usability still requires in-game QA.

## Machine readiness

`npm run tts:release:status` writes `tts-release-readiness.json` without failing solely because a known release blocker remains. `npm run tts:release:strict` converts those blockers into a final closeout failure.

The readiness pass verifies generated component coverage, starter supplemental quantities, and hosted object URL structure. For the current v0.7.0 package it reports 27/27 ready component definitions and 68/68 expected assembled supplemental copies.

The Review Scaffold name remains an intentional warning until manual QA and final promotion.

## Manual QA and final promotion

The versioned manual QA record is:

- `tts/release-qa/v0.7.0.json`

It contains explicit checks for table/setup behavior, each faction component family, and full-game validation. See `tts/SAVE-PUBLISHER.md` for the complete gate.

The committed record remains pending. `npm run tts:save:promote` refuses to create final Workshop identity unless machine readiness is clean, every required manual check is true, and `approvedForWorkshop` is explicitly true.

## GitHub Release asset hosting

`scripts/stage-tts-release-assets.mjs` copies only network assets required by TTS into `tts/generated/release-assets/`, assigns deterministic `Gauntlet_v0.7.0_TTS_*` names, records byte sizes and SHA-256 digests, and generates public GitHub Release download URLs.

The current package stages 73 network assets under the v0.7.0 target. Generated TTS saves reference those staged HTTPS URLs rather than local paths.

Publication remains explicit. The **Generate TTS card assets** workflow can be dispatched from `main` with `publish_release_assets` enabled only after the matching GitHub Release exists. The workflow uploads the deterministic assets without moving the release tag and then verifies every published URL with live HTTP requests.

The workflow intentionally does not create a GitHub Release itself.

## Workshop publication

Draft Workshop copy, setup notes, pre-publication gates, and post-publication clean-client verification are maintained in:

- `tts/WORKSHOP-PUBLISHING.md`

The Workshop preview image remains a separate explicit visual task and is not generated by the packaging pipeline.

## Generated output

Derived output is ignored by Git and written under:

- `tts/generated/v0.7.0/` for the active versioned package;
- `tts/generated/current/` for current aliases; and
- `tts/generated/release-assets/` for deterministic hosted assets.

Pull-request CI uploads the generated tree as the `gauntlet-current-tts-card-assets` artifact rather than committing derived PNGs and save JSON.
