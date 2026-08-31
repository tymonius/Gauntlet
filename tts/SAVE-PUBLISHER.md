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

`game-data/current-game.json` is the identity source for current-development TTS builds. Their package version, display version, source version, and status are derived directly from that authority. `config/tts-release-target.json` remains a versioned publication/QA target for the frozen v0.7.0 release and does not control current-development TTS identity. Published-release metadata remains separate; generating a current-development TTS package does not move a Git tag or publish a GitHub Release by itself.

## Review Scaffold outputs

The publisher writes the versioned Review Scaffold under the current-development identity, for example:

- `tts/generated/v0.7.1-candidate/Gauntlet_v0.7.1-candidate_TTS_Review_Scaffold.json`
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

Deckbuilder-to-TTS import is a **v0.7.1 feature**. In the Deckbuilder, the existing ruleset toggle is the exposure boundary: the released v0.7.0 view does not show TTS export, while the `v0.7.1-candidate` view shows the Tabletop Simulator transfer section for private QA. The published v0.7.0 Workshop mod remains the only public TTS version during candidate testing.

The Deckbuilder copies a compact versioned `GDL1:` Deck Code containing the current game version, Deck name, faction/Leader ids, playable-card ids with quantities, and the three selected Territory ids. Mystics codes additionally carry the three selected Rite ids.

The assembled v0.7.1-candidate and later TTS saves install a global **DECK IMPORT** control after faction supplementals are assembled. Import validates the Deck Code against the generated card/Territory/Rite assets and exact TTS game version.

During save generation, the importer captures a pruned snapshot of each fully assembled faction/Leader starter kit and stores those snapshots as the contents of one locked, non-selectable internal Bag below the table. The large object trees therefore remain native TTS save data rather than being serialized into Global Lua. A hard build-time size guard prevents the importer Global script from growing beyond 100 KB.

At runtime, custom import reads only the requested starter template from that internal library and clones it. The custom Bag preserves the correct Leader, faction-colored utility pieces, references, trackers, Proposals/Deeds, and other ready supplementals while replacing the playable Deck and selected Territory stack. For Mystics, it also rebuilds the **Rites + Ritual** stack from the three selected Rites plus Ritual of Ascension.

Visible official starter Bags still carry `gauntlet:starter-kit:<starter-id>` GM notes for save validation and ordinary setup, but they are **not runtime importer dependencies**. Players may move, unpack, or delete them without breaking later custom Deck imports.

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

The active development QA record is:

- `tts/release-qa/v0.7.1-candidate.json`

It begins `in-progress`, with all 18 manual checks false and `approvedForWorkshop: false`. The completed v0.7.0 record remains preserved separately at `tts/release-qa/v0.7.0.json` as evidence for the already-published Workshop version.

A release QA record remains `in-progress` until the corresponding in-game checks are actually completed. Schema version 3 records the **18 required checks**, grouped as follows.

### Table and setup

- successful load of the hosted save for the version under QA and its custom assets;
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

Candidate builds are not publication targets. The `v0.7.1-candidate` QA record deliberately leaves Workshop approval false, so the guarded promotion path cannot produce a publishable candidate mod. When the authority advances to stable v0.7.1, that version receives its own QA record before any final save is promoted.

The already-promoted v0.7.0 save remains hosted at `https://gauntlet.run/tts/v0.7.0/Gauntlet_v0.7.0_TTS_Mod.json` and remains the save behind the public Workshop item `https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635`.

## Review boundary

The current development target remains an accurate and pleasant digital tabletop implementation of the physical game. Players still perform setup, battle resolution, card handling, and faction rules themselves unless automation is separately approved.

The generated Review Scaffold is therefore allowed to exist while a component or manual-QA blocker remains. The final save is not.

## In-game review checklist

The versioned QA record is the authoritative checklist. Before Workshop promotion, complete every table/setup, faction-component, and handling-validation check recorded there and add notes for any noteworthy friction or fixes.

After promotion and publication, subscribe to/load the public Workshop item from a clean client and confirm every hosted asset resolves. The v0.7.0 public Workshop copy completed that smoke test successfully on 2026-08-27.
