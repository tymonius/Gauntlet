# Gauntlet Tabletop Simulator assets

This directory contains Gauntlet's supported Tabletop Simulator export, packaging, QA, and publication path.

Current-development TTS identity is derived directly from `game-data/current-game.json`. Published-release identity remains separate and is resolved from release lifecycle metadata.

## Source and release identity

Active-development game authority comes from:

- `game-data/current-game.json` and the source files it names;
- `config/tts-component-contract.json` for physical faction/shared components and TTS representation metadata; and
- `config/tts-release-target.json` for versioned publication/QA targeting only; it does not determine current-development TTS identity.

`config/release-lifecycle.json` and `config/github-release-contract.json` describe the immutable currently published web/release state. They are used where published-release fallback or publication validation is required, but they do not determine current-development TTS identity.

Generated current-development metadata takes its version and display identity from `current-game`, while the currently published release is resolved independently from release metadata.

The runtime does not hard-code starter, card, Leader, or Territory counts.

## Single card-face render authority

All TTS card faces are captured from the canonical `card-design/face-render.html` route using a FaceSpec identity. TTS owns packaging, not a second visual system. The pages under `tts/*-renderer/` and the older Card Design renderer URLs remain compatibility redirects; they delegate query translation to `card-design/legacy-face-redirect.mjs` and contain no rendering implementation.

This means parchment, faction symbols, border colors, artwork framing, reference-card divider policy, the Universal Reference G watermark, typography, and component geometry come from the same CSS/markup that powers `/card-design`. Compatibility pages are not valid card-face authorities.

The printed version footer for current TTS captures comes from the current-game authority's `displayVersion`. No separate current-development TTS version override is maintained.

Landscape presentation is also centralized: Territories and landscape supplementals use the same +90° quarter-turn when their approved 3.5 × 2.5 face is packed into TTS's standard portrait Custom Card cell. Native `SidewaysCard` then supplies the landscape physical orientation in play.

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
node tts/validate-current-authoritative-save.mjs
npm run tts:release:status
npm run tts:release:strict
npm run tts:package
npm run tts:save:promote
```

`tts:package` is the complete **Review Scaffold** build. It renders and assembles the package, validates the authoritative save contract, and writes a non-strict readiness report, but it deliberately does not promote the save to final Workshop identity.

`tts:save:promote` is a separate guarded action. It is documented in `tts/SAVE-PUBLISHER.md` and requires clean machine readiness plus the versioned manual-QA gate.

## Current v0.7.1 package

The current package is generated from the stable v0.7.1 current-game authority and contains:

- 142 playable cards;
- 25 landscape Territories, including 4 Arenas;
- 12 Leader Cards;
- 12 starter Bags;
- the complete current faction supplemental component set;
- the required supplemental objects assembled across the twelve starter Bags; and
- the staged network assets required by the stable v0.7.1 package.

Those counts are observations from the current generated manifests, not constants embedded in the runtime.

The current faction component families are:

| Faction | Generated components |
| --- | --- |
| Military | Command Tracker |
| Diplomats | Influence Tracker; Diplomat Reference Card; 9 Proposal / Treaty Article cards |
| Financiers | Financier Reference Card; Capital Limit Tracker; Capital Ledger; Deed Card (8 copies per starter) |
| Intelligence | Mission Reference Card; Operations Reference Card; Intel Tracker; Operation Progress Tracker |
| Mystics | Mystics Reference Card; six Rite cards; Ritual of Ascension |
| Inquisition | Inquisition Doctrine Reference Card; Purge Reference Card; Conviction Tracker |

The Universal Reference Card is a shared component and is tracked separately from this faction-component inventory.

## Back policy

The v0.7.1 TTS package distinguishes ordinary hidden-information Deck/Territory backs from public faction-component backs:

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

For TTS export, the production surface is captured at exact 400 × 560 geometry. The exporter overlays the current-game display version on the captured footer, so the current package is visibly stamped `v0.7.1`. Source provenance remains separately recorded in `leader-manifest.json`.

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

The current stable v0.7.1 supplemental manifest contains the complete production-ready faction component set, including the six Mystics Rite cards and Ritual of Ascension.

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

## Financiers Capital Ledger in TTS

The Financiers' physical Capital Ledger remains the visible component in TTS; there is no separate Capital Counter. When the Ledger is removed from the starter Bag it exposes an **OPEN LEDGER** interaction and a public parchment-style transaction window.

The TTS Ledger:

- begins at the rules-authoritative Opening Capital of **2**;
- records transaction description, signed change, and running Balance;
- calculates the running balance automatically while allowing Capital to exceed the separate Capital Limit temporarily;
- prevents a posted transaction from taking Capital below 0;
- provides 11 transaction rows per page, matching the physical ledger;
- can turn to additional pages without discarding prior history;
- supports Previous/Next page navigation and Undo Last Entry; and
- persists the ledger pages, current page, and draft fields through the object's native TTS save state.

The existing Capital Limit sliding tracker remains independent and continues to show the derived limit. The Ledger is the authoritative current-Capital record and audit trail; the script performs bookkeeping arithmetic but does not automate income, spending, purchases, or other game rules.

## Supplemental save assembly contract

`scripts/assemble-tts-supplemental-save.mjs` injects every ready faction supplemental into every matching starter Bag using the generated component quantities and staged hosted assets.

Assembly is idempotent. Generated supplemental objects carry a `gauntlet:supplemental:<component-id>` marker, so a rebuild removes prior generated supplementals before inserting the current set while leaving the base Deck, Leader, and Territories intact.

The current package assembles the authoritative supplemental quantities across the 12 starter Bags. Landscape supplemental cards are created at standard `CardCustom` scale and final landscape orientation. Sliding trackers are created at their final `Custom_Tile` geometry and snap registration from the shared geometry contract.

## Review Scaffold contract

`scripts/generate-tts-save.mjs` creates a two-player Review Scaffold with:

- White and Green hand/reserve zones plus wide private tabletop Hand parking strips;
- six center-line Gauntlet snap points;
- both Asset Banks grouped on the west side;
- a dedicated shared Battle Zone between the Asset Banks, with compact overlapping snap rows for multiple Gambits and Tactics;
- combined Faction / Leader & References workspaces on the east side;
- compact Draw and Discard areas near the Gauntlet;
- deliberately isolated Graveyards at the outer east edge;
- Deed snap columns at **x = ±3.95**, close to the Territory column;
- one battle d6 per player;
- one Player Token per player;
- one shared in-table **Custom PDF Rulebook** using a reader-order half-letter PDF derived from the imposed stable Rulebook and published as a content-versioned TTS network asset; and
- one selectable starter Bag for every current starter.

The shared Rulebook is parked in the neutral east-center gap between the two combined Faction / Leader & References workspaces, opposite the west-side Battle Zone. Its tabletop object uses the approved 2.55× scale so it reads as a physical half-letter rulebook rather than another card-sized component. `scripts/generate-tts-rulebook-reader.mjs` de-imposes the print booklet into sequential half-letter reader pages, and TTS loads that content-versioned hosted PDF. It opens at the beginning and remains a normal shared TTS object rather than duplicating the rules into scripted UI.

The base scaffold receives the authoritative table layout, is assembled with faction supplementals, and is then validated by `tts/validate-current-authoritative-save.mjs`. Validation is fail-closed: it checks the generated save as written and does not repair object geometry.

Behavioral tests construct the returned save JSON and verify the core table structure, starter core contents, landscape Territory presentation, supplemental packaging, tracker geometry, and HTTPS custom-object URLs. Actual TTS usability still requires in-game QA.

## Machine readiness

`npm run tts:release:status` writes `tts-release-readiness.json` without failing solely because a known release blocker remains. `npm run tts:release:strict` converts those blockers into a final closeout failure.

The readiness pass verifies generated component coverage, starter supplemental quantities, and hosted object URL structure. The current stable v0.7.1 package is the authority used by the live v0.7.1 Workshop build.

The generator still emits a Review Scaffold by default. Stable v0.7.1 has a completed manual-QA record with explicit Workshop approval; the completed v0.7.0 approval remains preserved as historical evidence.

## Manual QA and final promotion

The stable publication QA record is:

- `tts/release-qa/v0.7.1.json`

It records all 18 required table/setup, faction-component, and focused handling checks as passed and sets `approvedForWorkshop` to true. The earlier `tts/release-qa/v0.7.1-candidate.json` record remains preserved as pre-release evidence, and the passed v0.7.0 record remains preserved at `tts/release-qa/v0.7.0.json` as historical evidence for the previous Workshop release.

## GitHub Release asset hosting

`scripts/stage-tts-release-assets.mjs` copies only network assets required by TTS into `tts/generated/release-assets/`, assigns deterministic `Gauntlet_v0.7.1_TTS_*` names, records byte sizes and SHA-256 digests, and generates public GitHub Release download URLs.

The current package stages the required network assets under the v0.7.1 target, including the custom campaign-table image and command-tent panorama. Stable v0.7.1 assets are hosted from the v0.7.1 GitHub Release with content-versioned URLs for cache safety.

Publication remains explicit. Because those deterministic filenames are intentionally replaced in place, every generated TTS object URL carries a `?v=<sha256-prefix>` content revision. When a rendered sheet changes without changing its release filename, Tabletop Simulator therefore requests a new URL instead of silently reusing its local cache of the older image.

The **Generate TTS card assets** workflow can be dispatched from `main` with `publish_release_assets` enabled only after the matching GitHub Release exists. The workflow uploads the deterministic assets without moving the release tag and then verifies every published content-versioned URL with live HTTP requests.

The workflow intentionally does not create a GitHub Release itself.

## Workshop publication

Workshop copy, setup notes, publication-gate history, listing images, and post-publication verification are maintained in:

- `tts/WORKSHOP-PUBLISHING.md`

The v0.7.1 mod is public at https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635. The existing Workshop item was updated in place; its permanent id is unchanged. The stable v0.7.1 QA gate is complete and explicitly Workshop-approved.

## Generated output

Derived output is ignored by Git and written under:

- `tts/generated/v0.7.1/` for the current stable package;
- `tts/generated/current/` for current aliases; and
- `tts/generated/release-assets/` for deterministic hosted assets.

Pull-request CI uploads the generated tree as the `gauntlet-current-tts-card-assets` artifact rather than committing derived PNGs and save JSON.

For TTS-affecting pull requests, the workflow also publishes those staged network assets to an ephemeral prerelease named `tts-<version>-qa-pr-<number>` and uploads a rewritten `Gauntlet_<version>_TTS_PR<number>_Preview.json`. That preview save points only at the prerelease assets, so live TTS QA does not depend on unpublished production-release files or manual local image loading.
