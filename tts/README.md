# Gauntlet Tabletop Simulator assets

This directory contains the supported export path from Gauntlet's **current published release** and shared production renderers to Tabletop Simulator-ready assets, starter manifests, hosted release assets, and the review-save scaffold.

## Release-driven source discipline

The TTS pipeline does not hard-code a game version. It resolves the current release from the same repository metadata used by publication:

- `config/release-lifecycle.json` declares which release is current and publicly cut over;
- `config/github-release-contract.json` must agree on that release and identifies its published canonical-data and starter-deck assets;
- `scripts/tts-current-catalog.mjs` validates that agreement, finds the current release assets, and derives the versioned output path;
- `config/tts-component-contract.json` declares physical-component families, faction supplemental components, production readiness, back behavior, source selectors, and TTS interaction metadata that are not part of the ordinary playable-card dataset.

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
npm run tts:save:assemble
npm run tts:package
```

- `tts:components:check` validates the physical-component contract, current faction inventories, standard-back resolution, two-sided requirements, and sliding-tracker metadata.
- `tts:supplementals:check` verifies that every component currently marked ready has a supported export path and usable production/current-guide inputs; artwork-backed sides must also resolve their artwork.
- `tts:check` runs the component-contract, supplemental, current-release, save-publisher, and supplemental-save-assembler source checks without writing raster output.
- `tts:catalog` writes deterministic playable/Territory catalog JSON/browser data under both the current release and `tts/generated/current/`.
- `tts:cards` renders current playable-card faces, all six standard-back color variants, TTS face sheets, and `manifest.json`.
- `tts:territories` renders current landscape Territory/Arena faces and sheets. It deliberately does **not** create a Territory-specific back.
- `tts:leaders` renders current production Leader faces and resolves their backs through the standard-back policy.
- `tts:starters` joins current starter data to generated card, Territory, and Leader manifests and resolves one standard back for each player package.
- `tts:supplementals` renders only contract components whose production status is `ready`, including both sides of public reference cards and Rite cards plus production sliding-tracker faces and measured snap registrations; all other component records remain pending without TTS objects.
- `tts:build` validates the component contract, renders cards, Territories, and Leaders, then assembles the starter manifests.
- `tts:release:stage` stages only network assets required by TTS, including ready supplemental fronts/reverses, tracker faces, and the supplemental manifest, with deterministic GitHub Release filenames, hashes, and hosted URLs.
- `tts:save` builds the base current review-save scaffold from the staged starter assets.
- `tts:save:assemble` consumes the current starter and supplemental manifests plus staged hosted URLs, then injects every ready faction supplemental into every matching starter kit, including non-stackable sliding trackers and their tagged cover cards.
- `tts:package` performs the complete core build, supplemental rendering, staging, scaffold generation, and ready-component assembly pipeline.

The generated directory is ignored by Git. GitHub Actions uploads `tts/generated/` as a review artifact rather than committing derived PNGs.

## Physical-component contract

`config/tts-component-contract.json` is the durable source of truth for physical components that do not naturally live in the current playable-card dataset. It records:

- the standard-back mode and available back variants;
- default back policy for playable cards, Leaders, and Territories;
- shared Player Tokens and dice;
- faction supplemental component identities and quantities;
- whether a component is ready, artwork-pending, export-pending, or design-pending;
- whether a card-like component uses `standardBack`, is `twoSided`, or has a declared `specialBack`;
- source selectors for generated two-sided reference faces;
- TTS representation metadata, including non-stackable sliding trackers and stacked tracker assemblies.

A pending component remains visible in the contract instead of being silently omitted. Structural errors still fail closed: duplicate IDs, invalid quantities or factions, missing two-sided reverses, unresolved standard backs, invalid special backs, missing ready-family exporters, unresolved reference headings, missing production tracker surfaces, or incomplete sliding-tracker metadata stop packaging.

The current faction supplemental inventory encoded by the contract is:

| Faction | Supplemental components |
| --- | --- |
| Military | Command Tracker |
| Diplomats | Influence Tracker; Diplomat Reference Card; 9 double-sided Proposal / Treaty Article cards |
| Financiers | Financier Reference Card; Capital Ledger; 8 identical full-size Deed Cards |
| Intelligence | Mission Reference Card; Operations Reference Card; Intel Tracker; Operation Progress Tracker |
| Mystics | Mystics Reference Card; 3 double-sided Rite cards |
| Inquisition | Inquisition Doctrine Reference Card; Purge Reference Card; Conviction Tracker |

The three Mystics Rite cards, all seven faction reference cards, and all five sliding trackers are ready. The nine Diplomat Proposal/Treaty cards remain artwork-pending. The Financier Capital Ledger remains export-pending and the eight Deeds remain design-pending.

## Standard card-back policy

Every ordinary card-like component uses `standardBack` unless it is explicitly `twoSided` or declares a `specialBack`.

Ordinary standard-backed cards currently include playable cards, Leaders, Territories, tracker cards, Deeds, and other card-shaped supplemental components that do not declare another policy.

**Reference cards are an explicit exception because they are two-sided public reference material.** They do not use the playable Deck back on either side. Keeping both faces visibly informational also prevents a reference card from being mistaken for or shuffled into the Deck.

Territories have **no Territory-specific back**. In a starter package, each Territory receives the same resolved standard back as that player's playable Deck and Leader.

`config/tts-component-contract.json` currently preserves the existing faction-color behavior:

```json
"standardBack": {
  "mode": "faction"
}
```

The policy also supports `universal-black`. The current universal variant points at the existing black Intelligence back. Switching between faction-colored backs and one universal black back therefore changes one policy field rather than every standard-backed component definition.

All six production variants continue to be rendered because they are cheap shared assets and allow either policy without redesigning the renderer. The final face-sheet slot uses the black variant only as a deterministic hidden-card fallback image; it does not override the resolved `BackURL`.

Neutral playable cards always use the same standard back as the rest of their player's Deck so face-down allegiance is never leaked.

## Sliding trackers in TTS

Sliding trackers are represented as non-stackable, card-proportioned Custom Tiles rather than normal stackable cards. The contract records the physical interaction rather than hard-coding faction logic into the save builder:

- `representation: sliding-tracker`;
- `stackable: false`;
- movement axis;
- assembly identifier;
- layer;
- snap tag;
- `snapPositions: renderer-derived`;
- the production tracker component to render; and
- the Leader or Reference Card used as its physical cover/pointer.

Military Command, Diplomat Influence, Intelligence Intel, Intelligence Operation Progress, and Inquisition Conviction all use the same generic interaction model.

The exporter opens the production `/card-design/` supplemental-card surface, finds the declared `.sliding-tracker-card`, and measures the actual `.tracker-registration-line` positions. Those rendered registrations become the TTS snap offsets. There is no second faction-specific coordinate table, so later changes to the physical value-band geometry flow into TTS automatically.

The physical tracker scale is intentionally separate from any rules maximum. For example, Command currently has a rules maximum of 2 while its printed tracker provides headroom through 4; Intel and Operation Progress are rules-uncapped but use practical finite printed scales. TTS follows the production physical component rather than treating a rules cap as layout geometry.

The cover mapping is:

| Tracker | Physical cover / pointer |
| --- | --- |
| Command | selected Military Leader Card |
| Influence | selected Diplomat Leader Card |
| Intel | Operations Reference Card |
| Operation Progress | Mission Reference Card |
| Conviction | selected Inquisition Leader Card |

Each tracker receives object-attached snap points tagged with its declared resource tag, and only its cover card receives the matching tag. Value 0 is the fully covered position. Positive values slide the cover upward until its bottom edge aligns with the corresponding production registration line.

The Intelligence trackers share the `intelligence-progress` assembly but occupy separate layers and use separate snap tags and covers. They can therefore be physically stacked while Intel and Operation Progress remain independently draggable. No Lua rule changes a resource value automatically; the interaction reproduces the physical tracker.

See `docs/tts-sliding-trackers.md` for the implementation contract.

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

The Mystics `rite-card` renderer extracts the incomplete face from the Rite's current-guide heading and composes the approved shared Completed artwork into the established Rite frame.

The `reference-card` renderer generates both informational sides from source selectors declared in the physical contract. Selectors name current faction-guide headings rather than copying rules text into the contract. The Markdown parser preserves paragraphs, lists, labelled rules, subheadings, and tables. Missing headings, missing faces, or content that cannot fit the physical card fail the build rather than silently deleting canonical reference text.

Reference cards intentionally use no ordinary Deck back. Both generated sides carry the faction treatment and an explicit public-supplemental footer so their physical role remains unambiguous in TTS.

The `sliding-tracker` renderer uses the existing production supplemental-card surface rather than recreating tracker art inside TTS. It captures the declared production tracker at exact poker-card geometry and derives its snap registration from the rendered lines. Tracker backs reuse the starter's resolved standard-back asset instead of creating duplicate tracker-back files.

Ready supplemental cards use deterministic one-card deck IDs beginning at 200, after the existing playable-card, Territory, and Leader ranges. Sliding trackers are Custom Tiles and consume no CustomDeck ID. The manifest records both representation types for the later save-assembly step.

## Supplemental save assembly contract

`scripts/assemble-tts-supplemental-save.mjs` is the generic placement layer between rendered supplemental assets and starter Bags.

For every generated starter it:

1. identifies that starter's faction from `starter-deck-manifest.json`;
2. selects only `supplemental-manifest.json` records whose `productionStatus` is `ready` and whose faction matches the starter;
3. resolves each ready object's hosted assets through the staged release-asset manifest rather than embedding local file paths;
4. expands the contract quantity without any faction-specific quantity constant;
5. inserts card or sliding-tracker representations into the starter Bag with deterministic non-colliding GUIDs;
6. tags the declared Leader/Reference cover for each tracker; and
7. leaves every pending component absent from the save.

Assembly is idempotent. Generated supplemental objects carry a `gauntlet:supplemental:<component-id>` marker in `GMNotes`; rerunning assembly removes the prior generated supplemental objects before rebuilding the current ready set. The base Deck, Leader, Territories, and other Bag contents are untouched.

Sliding trackers are non-stackable Custom Tiles with the production tracker face as their primary image and the starter's resolved standard card back as their secondary image. Their object-attached snap points come directly from the measured production registrations. The corresponding cover card receives the matching tag so it can slide and snap as the physical pointer.

With the current contract:

- Military starter Bags receive the Command Tracker and tag the selected Leader as its cover;
- Diplomat Bags receive the Influence Tracker plus the Diplomat Reference Card and tag the selected Leader as the tracker cover;
- Intelligence Bags receive Mission and Operations Reference Cards plus both stacked trackers, with each reference tagged for its corresponding tracker;
- Mystics Bags receive their Reference Card and all three Rites;
- Inquisition Bags receive Doctrine and Purge Reference Cards plus the Conviction Tracker and tag the selected Leader as its cover; and
- Financier Bags currently receive the ready Financier Reference Card while the Ledger and Deeds remain pending.

Rules automation remains out of scope. Assembly reproduces physical components; it does not implement resource changes, Rite completion, battle resolution, or other gameplay rules in Lua.

## GitHub Release asset hosting

The network-hosting layer stages only files TTS must request directly:

- playable-card face sheets;
- the six standard-back variants;
- Territory face sheets;
- individual rendered Leader faces;
- ready supplemental fronts and reverse sides;
- ready sliding-tracker faces;
- generated card, Territory, Leader, starter, and supplemental manifests; and
- a release-asset manifest mapping generated source paths to deterministic public download URLs.

There is no separate Territory or tracker back asset. Territories and trackers reuse the already-staged standard-back variant selected for the starter package.

Every staged network asset records byte size and SHA-256 digest. Publication remains explicit: run the **Generate TTS card assets** workflow from `main` with release publication enabled after the current GitHub Release exists.

## Release durability contract

For an ordinary future release, TTS should continue working when the normal release process:

1. advances `config/release-lifecycle.json` and `config/github-release-contract.json` to the new current release;
2. publishes the new canonical data and starter-deck data;
3. updates shared production render surfaces and artwork as needed;
4. updates `config/tts-component-contract.json` only when the physical component inventory, status, back behavior, source selectors, production tracker mapping, or interaction model changes; and
5. runs `npm run tts:package` / the TTS asset workflow.

Playable-card and Territory counts already derive from current canonical data. Supplemental quantities, readiness, and behavior have one declared contract instead of being scattered through future save-builder special cases. Changing a component from pending to ready is intentionally a validation boundary: the package will refuse to ship it until an exporter exists for that family and the save assembler supports its TTS representation.

## Remaining TTS work

Ready card and sliding-tracker supplementals now flow end to end from the physical contract through rendering, hosting, and faction starter placement. Remaining physical-component work is driven by genuinely unfinished production inputs:

- complete artwork for the nine Diplomat Proposal / Treaty Article cards;
- define and export the Financier Capital Ledger and eight Deeds;
- assemble the finished component set into the final playable table layout once those remaining physical components are production-ready; and
- keep rules execution manual unless a separate, explicit automation phase is approved later.

Future component completion is additive: finish the production source, change its contract status to `ready`, let the supplemental exporter render it, and let the save assembly layer place it into every matching starter without adding faction-specific gameplay rules to the scaffold.
