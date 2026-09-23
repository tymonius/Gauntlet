# Gauntlet Tabletop Simulator assets

This directory contains Gauntlet's supported Tabletop Simulator export, packaging, QA, and publication path.

Current-development TTS identity is derived directly from `packages/game-data/current-game.json`. Published-release identity remains separate and is resolved from release lifecycle metadata.

## Source and release identity

Active-development game authority comes from:

- `packages/game-data/current-game.json` and the source files it names;
- `config/tts-component-contract.json` for physical faction/shared components and TTS representation metadata; and
- `config/tts-release-target.json` for versioned publication/QA targeting only; it does not determine current-development TTS identity.

`config/release-lifecycle.json` and `config/github-release-contract.json` describe the immutable currently published web/release state. They are used where published-release fallback or publication validation is required, but they do not determine current-development TTS identity.

Generated current-development metadata takes its version and display identity from `current-game`, while the currently published release is resolved independently from release metadata.

The runtime does not hard-code starter, card, Leader, or Territory counts.

## Single card-face render authority

All TTS card faces are captured from the production **Card Design** surfaces. TTS owns packaging, not a second visual system:

- playable cards: `card-design/card-review-render.html`;
- Territories: `card-design/territory-review-render.html`;
- Leaders, trackers, references, Rites, Proposals/Treaties, Capital Ledger, and Deeds: `card-design/component-print-render.html`.

This means parchment, faction symbols, border colors, artwork framing, reference-card divider policy, the Universal Reference G watermark, typography, and component geometry come from the same CSS/markup that powers `/card-design`. The older standalone TTS render pages are not valid card-face authorities.

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

## v0.7.2 candidate package

The frozen v0.7.2 gameplay candidate is now the current-development TTS source. Pull-request TTS builds therefore regenerate playable-card sheets, Territory sheets, Leader faces, starter packages, supplemental/reference components, and the Review Scaffold from `packages/game-data/current-game.json` at `v0.7.2-candidate`.

The candidate inherits the ordinary data-driven TTS pipeline rather than maintaining a separate v0.7.2 card list. In particular, the generated package picks up the final v0.7.2 Territory/starter rebalance, revised starter Decks, New Recruits update, Financier reference changes, Intelligence reference changes, and Inquisition reference changes directly from current authority.

The v0.7.2 TTS package also consumes the modular publication pipeline. It renders all eight current rules publications in both print-imposed and sequential reader forms, then stages only the reader-order Half Letter PDFs for TTS. The Player's Guide and Complete Rules are placed on the shared table; each starter Bag contains the reader-order guide for its faction. The Letter-landscape saddle-stitch impositions remain print artifacts and are never used as TTS Custom PDF sources.

The repository owner reports updating the permanent Steam Workshop item to **v0.7.2** after the stable release/tag, hosted TTS assets, passed manual QA, explicit approval, and successful final mod-save publication. The Steam listing and a clean subscribed-copy load have not been independently verified. Candidate PR previews remain QA artifacts only.

Historical candidate QA is tracked in `tts/release-qa/v0.7.2-candidate.json`; the stable v0.7.2 approval authority is `tts/release-qa/v0.7.2.json`, with all 18 manual checks passed and `approvedForWorkshop` true on the owner's attestation.

## Historical published v0.7.1 package

The published v0.7.1 package is generated from the stable v0.7.1 release authority and contains:

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

For TTS export, the production surface is captured at exact 400 × 560 geometry. The exporter overlays the current-game display version on the captured footer. The frozen source retains its `v0.7.2-candidate` identity, while publication-verified stable v0.7.2 TTS faces are stamped `v0.7.2`; the historical v0.7.1 package remains frozen. Source provenance remains separately recorded in `leader-manifest.json`.

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

The historical stable v0.7.1 supplemental manifest contains the complete production-ready faction component set, including the six Mystics Rite cards and Ritual of Ascension.

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
- for v0.7.2 packages, shared **Player's Guide** and **Complete Rules** Custom PDF objects using sequential Half Letter reader PDFs published as content-versioned TTS network assets;
- one selectable starter Bag for every current starter, with the matching reader-order **Faction Guide** inside each Bag; and
- for legacy v0.7.1 publication maintenance only, the historical single shared reader-order Rulebook object.

The v0.7.2 Player's Guide and Complete Rules sit in the neutral east-side shared-rules space, opposite the west-side Battle Zone. Each faction guide is packaged with both starters for that faction and is ordered immediately after the Leader in native Bag extraction order. All eight TTS PDFs come from the same modular rules composition used for physical publication, but TTS receives the sequential `*_Reader.pdf` outputs rather than the Letter-landscape duplex-imposed `*_Booklet.pdf` files.

The base scaffold receives the authoritative table layout, is assembled with faction supplementals, and is then validated by `tts/validate-current-authoritative-save.mjs`. Validation is fail-closed: it checks the generated save as written and does not repair object geometry.

Behavioral tests construct the returned save JSON and verify the core table structure, starter core contents, landscape Territory presentation, supplemental packaging, tracker geometry, and HTTPS custom-object URLs. Actual TTS usability still requires in-game QA.

## Machine readiness

`npm run tts:release:status` writes `tts-release-readiness.json` without failing solely because a known release blocker remains. `npm run tts:release:strict` converts those blockers into a final closeout failure.

The readiness pass verifies generated component coverage, starter supplemental quantities, and hosted object URL structure. The stable v0.7.2 package is generated from the frozen current-game authority with the aligned v0.7.2 publication target; the v0.7.1 package remains historical.

The generator still emits a Review Scaffold by default; final Workshop identity requires strict machine readiness and the stable approval gate. Stable v0.7.2 has the owner's completed 18-check manual QA and explicit Workshop approval; v0.7.1 and v0.7.0 approvals remain historical evidence.

## Manual QA and final promotion

The historical candidate QA record is `tts/release-qa/v0.7.2-candidate.json`; it cannot authorize Workshop publication. The latest stable publication QA record is `tts/release-qa/v0.7.2.json`. It records all 18 table/setup, faction-component, and focused handling checks as passed on the owner's confirmation and sets `approvedForWorkshop` to true. The earlier v0.7.1 and v0.7.0 approvals remain historical evidence. The owner reported uploading the approved v0.7.2 save to Steam; independent listing verification and a subscribed-copy smoke test remain outstanding.

## GitHub Release asset hosting

`scripts/stage-tts-release-assets.mjs` copies only network assets required by TTS into `tts/generated/release-assets/`, assigns deterministic `Gauntlet_<version>_TTS_*` names, records byte sizes and SHA-256 digests, and generates public GitHub Release download URLs.

The stable v0.7.2 package stages the custom campaign-table image, command-tent panorama, generated cards/components, current starter packages, and all eight reader-order rules PDFs. PR previews rewrite staged assets to immutable PR-specific prereleases. The final v0.7.2 GitHub package and approved mod save were published and verified in run `35855419415`.

Publication remains explicit. Because those deterministic filenames are intentionally replaced in place, every generated TTS object URL carries a `?v=<sha256-prefix>` content revision. When a rendered sheet changes without changing its release filename, Tabletop Simulator therefore requests a new URL instead of silently reusing its local cache of the older image.

The **Generate TTS card assets** workflow can be dispatched from `main` with `publish_release_assets` enabled only after the matching GitHub Release exists. The workflow uploads the deterministic assets without moving the release tag and then verifies every published content-versioned URL with live HTTP requests.

The workflow intentionally does not create a GitHub Release itself.

## Workshop publication

Workshop copy, setup notes, publication-gate history, listing images, and post-publication verification are maintained in:

- `tts/WORKSHOP-PUBLISHING.md`

The owner reports publishing v0.7.2 to the existing Workshop item at https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635; its permanent ID is unchanged. The v0.7.2 stable QA gate is complete and explicitly Workshop-approved. Independent Steam listing verification and a fresh subscribed-copy smoke test are still pending.

## Generated output

Derived output is ignored by Git and written under:

- `tts/generated/<current-version>/` for the current generated package;
- `tts/generated/current/` for current aliases; and
- `tts/generated/release-assets/` for deterministic hosted assets.

Pull-request CI uploads the generated tree as the `gauntlet-current-tts-card-assets` artifact rather than committing derived PNGs and save JSON.

For TTS-affecting pull requests, the workflow also publishes those staged network assets to an ephemeral prerelease named `tts-<version>-qa-pr-<number>` and uploads a rewritten `Gauntlet_<version>_TTS_PR<number>_Preview.json`. That preview save points only at the prerelease assets, so live TTS QA does not depend on unpublished production-release files or manual local image loading.
