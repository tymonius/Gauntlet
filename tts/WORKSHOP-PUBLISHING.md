# Gauntlet — Tabletop Simulator Workshop publication

This file records the permanent Gauntlet Tabletop Simulator Workshop item, the repository owner's reported v0.7.2 publication, the completed release gates, and retained v0.7.1/v0.7.0 history. The owner subsequently confirmed a fresh subscribed-copy smoke test; independent Steam listing verification remains outstanding.

## Workshop item

- **Steam Workshop ID:** `3790840635`
- **Workshop URL:** https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635
- **Current visibility:** public
- **Current version (owner-confirmed):** v0.7.2
- **v0.7.2 Workshop update (owner-confirmed):** 2026-09-23
- **Post-update listing title:** not independently verified

The repository owner reports updating the existing Workshop item in place using the approved v0.7.2 mod JSON. The permanent Workshop ID remains `3790840635`; no new Workshop listing was requested. The owner subsequently confirmed that a fresh subscribed Workshop copy loads correctly. Independent retrieval of the Steam listing has not been completed.

## v0.7.2 prepublication provenance

v0.7.2 gameplay/rules content was frozen for release on 2026-09-22. The TTS refresh was prepared as a candidate first; automated candidate generation alone did not authorize replacement of the v0.7.1 Workshop item.

The v0.7.2 candidate build regenerates the data-driven TTS surfaces from the frozen current authority, including:

- the v0.7.2 Territory and recommended starter-package rebalance;
- the updated New Recruits face and all twelve resulting starter Deck substitutions;
- current Financier references for the action-economy and Deed-pricing changes;
- current Intelligence references for recurring Intel and Operational Capacity;
- current Inquisition references for Conviction/Purge tuning;
- all six faction guides as sequential Half Letter reader-order PDFs packaged inside each matching starter Bag;
- the Player's Guide and Complete Rules as shared reader-order Custom PDF objects on the table; and
- every other card/Leader/reference text change already present in the frozen v0.7.2 authority.

The TTS package must never use the Letter-landscape saddle-stitch `*_Booklet.pdf` outputs for these documents. Those remain physical-print impositions; TTS stages the corresponding sequential `*_Reader.pdf` files generated from the same approved modular publication composition.

Candidate hands-on QA is tracked at `tts/release-qa/v0.7.2-candidate.json`. All 18 checks begin false and `approvedForWorkshop` is false.

The v0.7.2 public release/tag, stable hosted TTS assets, stable save machine readiness, the owner's completed 18-check manual QA, and explicit Workshop approval were all recorded before the owner-reported Workshop update. PR-preview releases and candidate save files remain test artifacts, not publication authority.

## v0.7.2 publication and post-publication verification

On 2026-09-23, the owner confirmed that all 18 stable v0.7.2 TTS manual QA checks passed and explicitly approved Workshop publication. The stable QA authority is `tts/release-qa/v0.7.2.json` (`status: passed`, `approvedForWorkshop: true`); the candidate QA record remains historical and does not authorize publication.

GitHub Actions run `35855419415` (Generate TTS card assets #2981) completed successfully from `main`. Its guarded publication step passed strict readiness, promoted the save to `Gauntlet_v0.7.2_TTS_Mod.json`, uploaded it to the existing v0.7.2 GitHub release, verified the hosted asset digests, and checked all 95 hosted TTS object URLs. The approved mod save is attached at `https://github.com/tymonius/Gauntlet/releases/download/v0.7.2/Gauntlet_v0.7.2_TTS_Mod.json`.

After that run, the owner reported uploading the final v0.7.2 JSON to the existing Steam Workshop item `3790840635`. This is an owner report, **not** an independent Steam-listing verification. The post-upload listing title remains independently unverified. On 2026-09-23 the owner subsequently confirmed loading a fresh subscribed copy of the v0.7.2 Workshop item successfully, completing the subscriber-copy smoke test on owner-reported evidence.

## v0.7.1 historical Workshop package

The previous v0.7.1 mod preserved the established two-player table and manual-rules play model while adding the focused v0.7.1 release changes:

- the six-Rite Mystics package;
- the current Mystics Rite / Completed-face presentation;
- the stable Deckbuilder → TTS Deck Code importer;
- all twelve starter kits and their required faction components;
- the current v0.7.1 Rulebook/setup presentation; and
- the current v0.7.1 hosted TTS asset set.

Rules remain player-operated. TTS reproduces the physical game surface and component handling rather than automating battle resolution or faction rules.

## v0.7.1 publication gate — completed

The stable v0.7.1 Workshop update was authorized only after the versioned release gate was complete:

- `npm run tts:release:strict` passed for the stable v0.7.1 package;
- `tts/release-qa/v0.7.1.json` records all 18 required table/setup, faction-component, and focused handling checks as passed;
- `approvedForWorkshop` is explicitly `true`;
- the stable v0.7.1 save passed final hands-on TTS QA;
- the Deckbuilder → TTS Deck Code import path passed stable handling validation; and
- the Workshop update was explicitly approved.

The earlier `tts/release-qa/v0.7.1-candidate.json` record remains preserved as pre-release evidence and is not the publication authority.

## v0.7.1 post-publication history

The public Workshop item previously carried **v0.7.1** at the permanent URL above.

### 2026-09-01 official table-layout maintenance

The v0.7.1 TTS save was refreshed after post-release table-layout review. The updated save is the current official Gauntlet v0.7.1 TTS project save and keeps the same game/release version.

The accepted maintenance layout now also includes one shared **Gauntlet v0.7.1 Rulebook** as a native TTS Custom PDF object at the approved 2.55× tabletop scale. The TTS package de-imposes the stable print booklet into sequential half-letter reader pages and publishes that reader-order PDF as a content-versioned TTS network asset. The object sits in the neutral east-center space between the two Faction / Leader & References workspaces.

The accepted maintenance layout:

- keeps the Gauntlet as the central board;
- places both Asset Banks on the west side with a dedicated shared Battle Zone between them;
- gives each player compact overlapping Battle staging for multiple Gambits and especially multiple Tactics;
- combines each Faction Zone with its Leader/reference workspace on the east side;
- keeps Draw and Discard compact near the Gauntlet;
- keeps Graveyards deliberately isolated at the outer east edge;
- uses wide private/Hand parking strips along the player edges; and
- moves the two Deed snap columns inward to **x = ±3.95** so Deeds sit closer to the Territory column.

The final accepted Review Scaffold passed machine readiness with no blockers and was promoted to final mod identity as **Gauntlet v0.7.1**. This is a post-release maintenance revision of v0.7.1, not a new rules release.

The historical repository record did not independently confirm whether this v0.7.1 maintenance save was synchronized to Steam before the subsequent v0.7.2 update.

Any additional subscribed-copy smoke testing, hosted-asset verification, or publication-specific defects discovered after the live update are post-release maintenance evidence. They do not reopen the completed v0.7.1 promotion gate unless they reveal a concrete release defect.

## v0.7.0 history

v0.7.0 was the first public Gauntlet Workshop release on this permanent item. It was published on 2026-08-27 after its own strict readiness and 18-check manual QA gate, and its subscribed public copy passed post-publication smoke testing.

Its completed QA record remains preserved at:

- `tts/release-qa/v0.7.0.json`

That record is historical evidence for the previous release and for unchanged surfaces inherited during v0.7.1 delta QA.

## Future updates

Future Workshop versions should continue updating this same permanent Workshop item unless release planning explicitly requires a replacement.

For each future update:

1. build from the matching stable current authority;
2. complete the versioned machine-readiness and manual-QA gate;
3. record explicit Workshop approval;
4. update the existing Workshop item in place; and
5. record post-publication verification separately from pre-publication QA.
