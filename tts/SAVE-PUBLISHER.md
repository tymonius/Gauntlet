# Gauntlet Tabletop Simulator save publisher

The TTS save publisher turns Gauntlet's generated manifests and hosted release assets into a loadable two-player Tabletop Simulator save.

The normal package output is intentionally a **Review Scaffold**. It contains the generated starter kits and every faction supplemental component that currently has a production-ready export path, but it does not become the final Workshop save until machine readiness and manual in-game QA both pass. Game rules remain player-operated.

## Build

```bash
npm run tts:package
```

That command runs, in order:

1. current playable-card, Territory, Leader, and starter-Deck generation;
2. ready supplemental-component generation;
3. the finalized Proposal/Treaty, Capital Ledger, and Deed export bridge;
4. hosted release-asset staging;
5. Review Scaffold generation;
6. supplemental-component assembly into each matching starter Bag;
7. landscape supplemental presentation finalization; and
8. the machine-readable release-readiness report.

Individual stages remain available through the `tts:*` package scripts when a narrower regeneration or check is needed.

## Release identity and source provenance

The active TTS package has its own explicit target in:

- `config/tts-release-target.json`

The active development target is **v0.7.1**. Generated TTS output, save names, hosted-asset names, manifests, and card/component release labels therefore use v0.7.1, while the current public release and Workshop item remain v0.7.0.

The TTS target does not rewrite the version identity of the gameplay authority. `game-data/current-game.json` is still v0.7.0 and is recorded separately as the v0.7.1 package's `sourceVersion`. This allows TTS packaging work to advance ahead of the next public game-version cutover without pretending that v0.7.1 is already the published rules authority.

Published-release metadata remains a separate concern. Changing the active TTS target or generating a v0.7.1 Review Scaffold does not move a Git tag, publish a GitHub Release, update the Pages-hosted v0.7.0 save, or update the Steam Workshop item.

## Review Scaffold outputs

The publisher writes the versioned Review Scaffold under the resolved TTS target, for example:

- `tts/generated/v0.7.1/Gauntlet_v0.7.1_TTS_Review_Scaffold.json`
- `tts/generated/current/Gauntlet_TTS_Review_Scaffold.json`

Generated output remains ignored by Git. Pull-request CI includes the generated TTS tree inside the `gauntlet-current-tts-card-assets` Actions artifact.

## Source authority

The publisher consumes:

- the current-game authority and its resolved source inputs;
- `starter-deck-manifest.json` produced by the current TTS build;
- `supplemental-manifest.json` produced by the supplemental export pipeline;
- the staged `Gauntlet_*_TTS_Release_Assets.json` hosted-asset manifest; and
- only HTTPS object URLs mapped by that manifest.

The publisher therefore does not hard-code a playable-card count, Territory count, Leader count, starter count, faction supplemental count, or hosted GitHub asset filename.

## TTS object translation

Playable Decks use `DeckCustom` with the deterministic CardIDs emitted by the raster manifests. Each referenced sheet becomes a TTS `CustomDeck` entry using:

- `FaceURL`
- the selected player's faction `BackURL`
- `NumWidth`
- `NumHeight`
- `BackIsHidden: true`
- `UniqueBack: false`

Neutral cards in a starter still receive that starter's faction back. The save publisher never chooses a back from the individual card's allegiance.

Leader Cards and Territories use the same hosted-manifest mapping rather than rebuilding image URLs independently. Landscape Territories and landscape supplemental cards are marked sideways for TTS after assembly.

## Starter kits

Every starter in the current manifest becomes a selectable Bag. Before supplemental assembly it contains:

- the complete playable Deck;
- the selected Leader Card; and
- the three selected Territories.

The supplemental assembly layer then adds the production-ready faction components required by that starter's faction at the quantities declared by the component manifest. The release-readiness check verifies those quantities against every matching starter Bag.

The bag description records the starter summary and recommended Territory order. Starter Bags are laid out dynamically, so future starter-count changes do not require a hard-coded table-layout constant.

## Deckbuilder custom Deck import

Deckbuilder-to-TTS import is a **v0.7.1 feature**. The active v0.7.1 TTS development package installs the importer, but the public v0.7.0 Deckbuilder still does not expose **Copy for Tabletop Simulator** while the current-game authority remains v0.7.0. That prevents the live website from advertising a workflow whose matching TTS version has not been published.

Once the game authority advances to v0.7.1, the Deckbuilder can copy a compact versioned `GDL1:` Deck Code containing only the current game version, Deck name, faction/Leader ids, playable-card ids with quantities, and the three selected Territory ids.

The assembled v0.7.1 TTS save installs a global **IMPORT DECK** control after faction supplementals are assembled. Import validates the Deck Code against the same generated card/Territory manifests and exact TTS game version, then uses the matching official starter Bag as the runtime template. The custom Bag therefore keeps the correct Leader, faction-colored utility pieces, references, trackers, Proposals/Deeds/Rites, and other ready supplementals while replacing only the playable Deck and selected Territory stack.

Official starter Bags carry `gauntlet:starter-kit:<starter-id>` GM notes so the importer can locate a safe template. The source starter Bag is never modified.

A Deck Code from another game version is rejected rather than migrated silently; re-open that Deck in the current Deckbuilder and export a fresh code.

## Review table

The scaffold creates:

- a custom two-player table and environment;
- White and Green hand/reserve zones;
- one faction-colored battle d6 and Player Token inside each selected starter Bag; and
- six center-line snap points for the Gauntlet.

Players choose one starter kit each, unpack the kits, arrange the six selected Territories on the center snap points, and complete normal opening setup from the current Rulebook.

## Machine readiness

```bash
npm run tts:release:status
```

writes the machine-readable `tts-release-readiness.json` report. It checks the generated component package, starter supplemental quantities, and hosted object URL structure while preserving manual TTS usability as a separate gate.

For final closeout:

```bash
npm run tts:release:strict
```

must pass. A non-ready component, missing required generated object, starter-assembly mismatch, or invalid hosted URL prevents strict readiness.

## Manual QA record

The active v0.7.1 development gate is recorded in:

- `tts/release-qa/v0.7.1.json`

It begins `in-progress` with all 18 manual checks false and `approvedForWorkshop: false`. The completed v0.7.0 record remains preserved separately at `tts/release-qa/v0.7.0.json` as the evidence for the already-published Workshop version.

A release QA record remains `in-progress` until the corresponding in-game checks are actually completed. Schema version 3 records the **18 required checks**, grouped as follows.

### Table and setup

- successful load of the hosted v0.7.0 save and custom assets;
- White/Green player perspectives and hand/reserve zones;
- all six Gauntlet snaps and Territory orientation;
- Player Tokens and battle dice;
- opening setup from the current Rulebook; and
- clear separation of Draw Pile, Discard Pile, Graveyard, Asset Bank, Leader/faction area, Reserve, Gambit, and Tactic during play.

### Faction components

- Military Command tracker;
- Diplomat Influence tracker;
- Diplomat Proposals and ratified Treaty reverse faces;
- Financier Capital Limit tracker;
- Financier Capital Ledger;
- Financier Deeds;
- Intelligence nested Operation stack;
- Mystic Rites and Completed faces; and
- Inquisition Conviction, Doctrine, and Purge components.

### Handling validation

- core handling exercised in TTS;
- focused faction drills completed for interactions not already covered; and
- any TTS-specific friction found during testing resolved before approval.

A remote two-player game is not currently a required release check. Workshop approval is a separate explicit boolean after all 18 required checks. Do not mark a check complete merely because the JSON package generated successfully; these fields represent actual Tabletop Simulator testing.

## Final save promotion

The final Workshop save is produced only by the explicit promotion command:

```bash
npm run tts:save:promote
```

Promotion is deliberately excluded from `npm run tts:package`. The command refuses to run unless:

1. the versioned machine-readiness report is `machineReady: true`;
2. all 18 required manual-QA checks are complete; and
3. the QA record explicitly sets `approvedForWorkshop: true`.

A successful v0.7.1 promotion would preserve the Review Scaffold and write a separate final save:

- `tts/generated/v0.7.1/Gauntlet_v0.7.1_TTS_Mod.json`
- `tts/generated/current/Gauntlet_TTS_Mod.json`

That promotion is currently blocked by the intentionally incomplete v0.7.1 QA record. The already-promoted v0.7.0 save remains hosted at `https://gauntlet.run/tts/v0.7.0/Gauntlet_v0.7.0_TTS_Mod.json` and remains the save behind the public Workshop item `https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635`.

## Review boundary

The v0.7.1 development target remains an accurate and pleasant digital tabletop implementation of the physical game. Players still perform setup, battle resolution, card handling, and faction rules themselves unless automation is separately approved.

The generated Review Scaffold is therefore allowed to exist while a component or manual-QA blocker remains. The final save is not.

## In-game review checklist

The versioned QA record is the authoritative checklist. Before Workshop promotion, complete every table/setup, faction-component, and handling-validation check recorded there and add notes for any noteworthy friction or fixes.

After promotion and publication, subscribe to/load the public Workshop item from a clean client and confirm every hosted asset resolves. The v0.7.0 public Workshop copy completed that smoke test successfully on 2026-08-27.
