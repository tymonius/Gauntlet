# Gauntlet Tabletop Simulator assets

This directory contains the supported export path from Gauntlet's **current published release** and shared production renderers to Tabletop Simulator-ready assets, starter manifests, hosted release assets, and the review-save scaffold.

## Release-driven source discipline

The TTS pipeline does not hard-code a game version. It resolves the current release from the same repository metadata used by publication:

- `config/release-lifecycle.json` declares which release is current and publicly cut over;
- `config/github-release-contract.json` must agree on that release and identifies its published canonical-data and starter-deck assets;
- `scripts/tts-current-catalog.mjs` validates that agreement, finds the current release assets, and derives the versioned output path;
- `config/tts-component-contract.json` declares physical-component families, faction supplemental components, production readiness, back behavior, and TTS interaction metadata that are not part of the ordinary playable-card dataset.

The exporters then consume the resolved current canonical dataset, current starter decks, shared production renderers, approved artwork, and the physical-component contract. A normal release cutover should require **no TTS script fork, count update, or version-string edit**.

## Commands

```bash
npm run tts:components:check
npm run tts:supplementals:check
npm run tts:check
npm run tts:catalog
npx playwright install chromium
npm run tts:cards
npm run tts:territories
npm run tts:leaders
npm run tts:starters
npm run tts:supplementals
npm run tts:build
npm run tts:release:stage
npm run tts:save
npm run tts:package
```

- `tts:components:check` validates the physical-component contract, current faction inventories, standard-back resolution, two-sided requirements, and sliding-tracker metadata.
- `tts:supplementals:check` verifies that every component currently marked ready has a supported export path, a usable canonical source, and any required reverse artwork; pending components remain cataloged but are not rendered.
- `tts:check` runs the component-contract, supplemental, and existing current-release source checks without writing raster output.
- `tts:catalog` writes deterministic playable/Territory catalog JSON/browser data under both the current release and `tts/generated/current/`.
- `tts:cards` renders current playable-card faces, all six standard-back color variants, TTS face sheets, and `manifest.json`.
- `tts:territories` renders current landscape Territory/Arena faces and sheets. It deliberately does **not** create a Territory-specific back.
- `tts:leaders` renders current production Leader faces and resolves their backs through the standard-back policy.
- `tts:starters` joins current starter data to generated card, Territory, and Leader manifests and resolves one standard back for each player package.
- `tts:supplementals` renders only contract components whose production status is `ready`, writes the supplemental catalog/manifest, and leaves all other component records pending without TTS objects.
- `tts:build` validates the component contract, renders cards, Territories, and Leaders, then assembles the starter manifests.
- `tts:release:stage` stages only network assets required by TTS, including ready supplemental fronts/reverses and the supplemental manifest, with deterministic GitHub Release filenames, hashes, and hosted URLs.
- `tts:save` builds the current review-save scaffold from the staged starter assets. Supplemental placement is still intentionally deferred.
- `tts:package` performs the core build, supplemental rendering, staging, and save pipeline.

The generated directory is ignored by Git. GitHub Actions uploads `tts/generated/` as a review artifact rather than committing derived PNGs.

## Physical-component contract

`config/tts-component-contract.json` is the durable source of truth for physical components that do not naturally live in the current playable-card dataset. It records:

- the standard-back mode and available back variants;
- default back policy for playable cards, Leaders, and Territories;
- shared Player Tokens and dice;
- faction supplemental component identities and quantities;
- whether a component is ready, artwork-pending, export-pending, or design-pending;
- whether a card-like component uses `standardBack`, is `twoSided`, or has a declared `specialBack`;
- TTS representation metadata, including non-stackable sliding trackers and stacked tracker assemblies.

A pending component remains visible in the contract instead of being silently omitted. Structural errors still fail closed: duplicate IDs, invalid quantities or factions, missing two-sided reverses, unresolved standard backs, invalid special backs, or incomplete sliding-tracker metadata fail validation.

The current faction supplemental inventory encoded by the contract is:

| Faction | Supplemental components |
| --- | --- |
| Military | Command Tracker |
| Diplomats | Influence Tracker; Diplomat Reference Card; 9 double-sided Proposal / Treaty Article cards |
| Financiers | Financier Reference Card; Capital Ledger; 8 identical full-size Deed Cards |
| Intelligence | Mission Reference Card; Operations Reference Card; Intel Tracker; Operation Progress Tracker |
| Mystics | Mystics Reference Card; 3 double-sided Rite cards |
| Inquisition | Inquisition Doctrine Reference Card; Purge Reference Card; Conviction Tracker |

The three Mystics Rite cards are marked ready. The nine Diplomat Proposal/Treaty cards are marked artwork-pending. Other supplemental components retain their current export/design status until their production assets are integrated.

## Standard card-back policy

Every ordinary card-like component uses `standardBack` unless it is explicitly `twoSided` or declares a `specialBack`.

This includes:

- playable cards;
- Leaders;
- Territories;
- reference cards;
- tracker cards and other ordinary card-shaped supplemental components.

Territories have **no Territory-specific back**. In a starter package, each Territory receives the same resolved standard back as that player's playable Deck and Leader.

`config/tts-component-contract.json` currently preserves the existing faction-color behavior:

```json
"standardBack": {
  "mode": "faction"
}
```

The policy also supports `universal-black`. The current universal variant points at the existing black Intelligence back. Switching between faction-colored backs and one universal black back therefore changes one policy field rather than every component definition.

All six production variants continue to be rendered because they are cheap shared assets and allow either policy without redesigning the renderer. The final face-sheet slot uses the black variant only as a deterministic hidden-card fallback image; it does not override the resolved `BackURL`.

Neutral playable cards always use the same standard back as the rest of their player's Deck so face-down allegiance is never leaked.

## Sliding trackers in TTS

Sliding trackers are represented as non-stackable, card-proportioned TTS objects rather than normal stackable cards. The contract records the interaction rather than hard-coding faction logic into the save builder:

- `representation: sliding-tracker`;
- `stackable: false`;
- movement axis;
- assembly identifier;
- layer;
- snap tag;
- registration positions, currently `artwork-defined` until final exported geometry supplies exact coordinates.

Military Command, Diplomat Influence, Intelligence Intel, Intelligence Operation Progress, and Inquisition Conviction all use the same generic interaction model.

The Intelligence trackers share the `intelligence-progress` assembly but occupy separate layers and use separate snap tags. That allows the two sliding trackers to remain physically stacked while moving independently in TTS. When their final raster geometry is integrated, the generic exporter can derive the legal snap points from the artwork registrations rather than adding Intelligence-specific Lua rules.

## Playable-card sheet contract

- 10 columns × 7 rows
- 69 playable face slots per sheet
- final slot reserved for the fallback hidden-card image
- 400 × 560 pixels per card/back
- 4000 × 3920 pixels per sheet
- `BackIsHidden: true`
- `UniqueBack: false`
- six selectable standard-back files under `tts/generated/<current-release>/backs/`
- sheet count derived from the current canonical card count

`manifest.json` records deterministic TTS CardIDs, face-sheet positions, all six back variants, current release authority, artwork gaps, and the standard-back policy.

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
- `backPolicy: standardBack`

The sheet's hidden fallback slot uses the already-rendered black standard-back asset. `tts:territories` therefore expects `tts:cards` to have run first when invoked independently; `tts:build` already guarantees that order.

The Territory manifest intentionally contains no `territory-back.png` or alternate-back contract. Starter assembly resolves its Territory `BackURL` from the same player standard-back policy used by the Deck and Leader.

## Leader asset contract

Leader export does not maintain a second copy of Leader rules or layout. Current canonical data supplies the faction/Leader roster while `/card-design/` supplies the production face, rules text, portrait, faction treatment, and card geometry.

For every current Leader, `tts:leaders`:

- resolves a stable Leader ID from the canonical Leader name;
- requires a matching Leader face under the matching faction on the production review surface;
- requires the production face to fit the standard 400 × 560 portrait raster with no fit warning;
- requires the Leader portrait to load successfully;
- requires the rendered footer version to match the current published release;
- resolves `standardBack` through the component contract;
- assigns a deterministic one-card CustomDeck ID beginning at 100; and
- writes the face under `tts/generated/<current-release>/leaders/`.

## Starter-deck assembly contract

The starter assembler does not duplicate face-sheet placement logic. It validates published starter data against the current canonical catalog and Leader roster, then joins each selected card, Territory, and Leader to the generated manifests.

For each starter it records the exact rendered Leader, playable-card IDs and quantities, selected Territories, recommended Territory order, shared face sheets, and the single resolved standard back to use across the player's ordinary card-like package. In faction mode this is the player's faction back. In universal-black mode it is the black variant for every faction.

The assembler validates construction limits from the starter artifact itself; it does not hard-code starter, card, Leader, or Territory counts.

## Supplemental asset contract

`scripts/generate-tts-supplemental-assets.mjs` is the bridge between the physical-component contract and TTS-ready supplemental files.

It does not keep a second hand-maintained list of components. On every run it partitions `config/tts-component-contract.json` by `productionStatus`:

- `ready` components must have a supported renderer and all required inputs or the export fails closed;
- every other component is retained in `supplemental-catalog.json` and `supplemental-manifest.json` with its status, but produces no face, reverse, hosted asset, or TTS object yet.

The first supported family is the Mystics `rite-card` family. The incomplete fronts use the established physical Rite presentation while their wording is extracted from each Rite's heading in the current canonical Mystics guide. That keeps the TTS faces synchronized with current rules wording instead of copying v0.6-era component text into the exporter. The completed side uses the approved shared `reverseArtwork` declared by the component contract and is rasterized once even when several ready cards share it.

Ready supplemental cards use deterministic one-card deck IDs beginning at 200, after the existing playable-card, Territory, and Leader ranges. The manifest records both faces and their TTS IDs, but `placement.includedInReviewSave` remains `false` until the component-assembly layer decides where and how each faction's supplementals belong on the table.

## GitHub Release asset hosting

The network-hosting layer stages only files TTS must request directly:

- playable-card face sheets;
- the six standard-back variants;
- Territory face sheets;
- individual rendered Leader faces;
- ready supplemental fronts and shared reverse rasters;
- generated card, Territory, Leader, starter, and supplemental manifests; and
- a release-asset manifest mapping generated source paths to deterministic public download URLs.

There is no separate Territory back asset. Territories reuse one of the already-staged standard-back variants selected by starter assembly.

Every staged network asset records byte size and SHA-256 digest. Publication remains explicit: run the **Generate TTS card assets** workflow from `main` with release publication enabled after the current GitHub Release exists.

## Release durability contract

For an ordinary future release, TTS should continue working when the normal release process:

1. advances `config/release-lifecycle.json` and `config/github-release-contract.json` to the new current release;
2. publishes the new canonical data and starter-deck data;
3. updates shared production render surfaces and artwork as needed;
4. updates `config/tts-component-contract.json` only when the physical component inventory, status, back behavior, or interaction model changes; and
5. runs `npm run tts:package` / the TTS asset workflow.

Playable-card and Territory counts already derive from current canonical data. Supplemental quantities, readiness, and behavior have one declared contract instead of being scattered through future save-builder special cases. Changing a component from pending to ready is intentionally a validation boundary: the package will refuse to ship it until an exporter exists for that family and all required production inputs are present.

## Remaining TTS work

Ready supplemental components can now be rendered and hosted without changing the review save. The next integration layer is **component assembly**: consume `supplemental-manifest.json`, add the appropriate ready components to each faction package, and instantiate tracker assemblies/snap behavior only after their production exports are ready.

That keeps the current review scaffold usable while making future component completion additive: finish the artwork/export source, change its declared readiness, let the supplemental exporter pick it up, and then let the assembly layer place it without rebuilding faction-specific rules in the save generator.
