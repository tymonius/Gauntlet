# Gauntlet Development Status

**Current canonical version:** v0.6.3 — Third Playtest Revision  
**Release status:** Published  
**Published:** August 12, 2026

The immutable current package is [`../releases/v0.6.3/`](../releases/v0.6.3/). The public site, polished browser tools, Rules Arbiter default, digital current pointer, and formal playtest pipeline are expected to operate against v0.6.3.

## Current state

v0.6.3 is the active playtest baseline. It contains 128 playable cards, 25 Territories, 9 Proposals, 6 factions, 12 Leaders, 12 validated starter Decks, and 11 published print PDFs.

The August 12 publication exposed a release-engineering failure: several current-facing repository documents and production interfaces were not included in the cutover inventory. The Deckbuilder/Card Reference and Start/Rulebook regressions were corrected in PRs #579 and #581; the repository-wide release-integrity audit that followed established `config/current-release.json` and `docs/Gauntlet_Release_Integrity_Standard.md` so future promotions have one explicit current-version contract.

## Current rules baseline

High-value v0.6.3 invariants include:

- opening draw 4, discard 1, keep 3;
- arrange Territories after seeing the opening Hand and opening discard;
- Advance / Hold / Fall Back movement terminology;
- Defensive Edge and Tiebreak Roll for battle ties;
- contiguous Front Line Capture;
- capture of the opponent's final Territory and victory in the opponent's Last Stand are independent normal victory routes;
- final-Territory capture is not required before a Last Stand win.

## Current priorities

1. **Run structured v0.6.3 playtests** against the published package and capture clean version-attributed evidence.
2. **Stabilize post-release infrastructure** only where real production or playtest evidence identifies a defect.
3. **Prepare the next rules/card revision** from playtest evidence rather than rolling unreviewed ideas directly into the current release.
4. **Maintain release integrity**: every current-facing surface must continue to pass the generic current-release gate as well as version-specific checks.

## Current playtest watchlist

### Spirit Walker — Guardians of the Circle

Continue watching whether the Spirit Walker's Guardian package creates interesting ritual progression and battlefield choices without becoming automatic or overly resilient. Record actual game states and matchup context before changing the package.

### Financiers — Financial Capacity

Continue watching whether Financial Capacity, Treasury growth, Assets, and associated draw/economy engines produce meaningful tradeoffs rather than runaway compounding. Distinguish strong execution from deterministic advantage.

## Digital and Rules Arbiter status

The current digital rules pointer is `src/content/current.ts`, which exports v0.6.3. The public Rules Arbiter uses the current v0.6.3 route while historical v0.6.1/v0.6.2 and candidate endpoints remain preserved for provenance and compatibility.

The polished production browser applications are the root `/start/`, `/rulebook/`, `/deckbuilder/`, and `/card-reference/` interfaces. Current versioned routes hand off to those applications rather than promoting candidate UI implementations.

## Release engineering

`config/current-release.json` is the machine-readable current-release declaration. `scripts/validate-current-release-integrity.mjs` checks repository documentation, current public interfaces, runtime/data pointers, formal playtest creation, and CI wiring against it.

The governing process is [`Gauntlet_Release_Integrity_Standard.md`](Gauntlet_Release_Integrity_Standard.md). A release is not complete until the version-specific package is valid **and** the whole repository/product agrees that it is current.
