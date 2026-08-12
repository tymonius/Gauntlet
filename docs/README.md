# Gauntlet Documentation

**Current playable release:** v0.6.3 — Third Playtest Revision  
**Published:** August 12, 2026

The immutable current release package is [`../releases/v0.6.3/`](../releases/v0.6.3/). For rules, cards, Territories, Proposals, starter Decks, and print artifacts, that package is the governing source.

## Current authorities

- [v0.6.3 release package](../releases/v0.6.3/)
- [Canonical data](../releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json)
- [Rulebook source](../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md)
- [Starter Decks](../releases/v0.6.3/Gauntlet_v0.6.3_Starter_Decks.json)
- [Development Status](Gauntlet_Development_Status.md)
- [Digital Roadmap](Gauntlet_Digital_Roadmap.md)
- [Release Integrity Standard](Gauntlet_Release_Integrity_Standard.md)

## Historical implementation records

Version-specific ledgers, candidate matrices, test plans, release closeout documents, and prior package records remain in this directory for provenance. A version number in a historical document does not make that document a current authority.

The v0.6.3 cross-surface closeout matrix is preserved as the completed **pre-publication** gate that governed the August 12, 2026 cutover. v0.6.2 and v0.6.1 documentation remains historical material for those releases.

The former `Gauntlet_Digital_Prototype_Roadmap.md` is explicitly marked as a superseded historical audit snapshot; current digital direction lives in `Gauntlet_Digital_Roadmap.md`.

## Current-release rule

Anything in this repository that presents itself as “current”, “canonical”, “recommended”, or the default public release must agree with `../config/current-release.json`. `scripts/validate-current-release-integrity.mjs` enforces that contract in CI.
