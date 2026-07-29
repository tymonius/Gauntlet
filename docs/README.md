# Gauntlet Documentation

This directory contains the active design, testing, setting, and source-card documents for Gauntlet.

For the current playable release, begin with the [v0.6.0 release package](../releases/v0.6.0/README.md). The [v0.6.1 release package](../releases/v0.6.1/README.md) is an implementation draft and is not yet canonical.

## Canonical v0.6.0 sources

These files govern the current published game:

1. [Official Rulebook](../releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.md) — shared rules.
2. [Definitive faction guides](../releases/v0.6.0/faction-guides/) — faction rules, Leaders, supplemental components, and exact faction-card text.
3. [Neutral Card Pool](Gauntlet_v0.6_Neutral_Card_Pool.md) — exact Neutral-card text.
4. [Territory Pool](Gauntlet_v0.6_Territory_Pool.md) — exact Territory and Arena text.
5. [Canonical Data](../releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json) — generated structured data; do not edit independently.

When a derived PDF, printable sheet, Deckbuilder entry, or digital implementation conflicts with these sources, correct the governing source and regenerate the derived artifact.

## Active v0.6.1 governing-source draft

The following sources contain the implemented v0.6.1 rules and exact player-facing text. They remain draft until the package is synchronized, generated, validated, and published.

1. [v0.6.1 Rulebook](../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md) — shared rules, including Gambits, Reserves, Tactics, Aftermath, withdrawal, retreat, Assets, Overlays, and copied effects.
2. [v0.6.1 faction guides](../releases/v0.6.1/faction-guides/) — all six faction systems, Leaders, supplemental components, and exact faction-card text.
3. [v0.6.1 Neutral Card Pool](Gauntlet_v0.6.1_Neutral_Card_Pool.md) — exact Neutral-card text.
4. [v0.6.1 Territory Pool](Gauntlet_v0.6.1_Territory_Pool.md) — exact Territory and Arena text.
5. [v0.6.1 Reference Guide](../releases/v0.6.1/Gauntlet_v0.6.1_Reference_Guide.md) — compact play reference derived from the governing sources.
6. [v0.6.1 Release Notes](../releases/v0.6.1/Gauntlet_v0.6.1_Release_Notes.md) and [Changelog](../releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md) — release explanation and detailed changes from v0.6.0.

## Active v0.6.1 implementation records

- [v0.6.1 Implementation Ledger](Gauntlet_v0.6.1_Implementation_Ledger.md) — approved first-playtest corrections and synchronization checklist.
- [v0.6.1 Rulebook Layering Standard](Gauntlet_v0.6.1_Rulebook_Layering_Standard.md) — approved **How it works / Complete rules** structure for combining first-game teaching with technical reference.

These implementation records do not override the published v0.6.0 package. After publication, move them to the archive or reduce them to continuing implementation notes rather than maintaining duplicated rules.

## Active development documents and tools

- [Development Status](Gauntlet_Development_Status.md) — current post-release priorities and playtest watchlist.
- [Design Principles and Guardrails](Gauntlet_Design_Principles_and_Guardrails.md) — durable game-design constraints.
- [Visual Design Language](Gauntlet_Visual_Design_Language.md) — approved graphic and component principles for faction identity, cards, print materials, and interfaces.
- [Illustration Art Direction](Gauntlet_Illustration_Art_Direction.md) — shared visual-world standards for architecture, clothing, technology, environments, faction depiction, and card illustration.
- [Illustration Color Addendum](Gauntlet_Illustration_Color_Addendum.md) — approved color-richness standard balancing historical realism with attractive, collectible card art.
- [Illustration Environmental Detail Guardrails](Gauntlet_Illustration_Environmental_Detail_Guardrails.md) — approved rules for flags, signage, visible writing, environmental labeling, scene density, and card-size focal clarity.
- [Faction Card Design Guide](Gauntlet_v0.6_Faction_Card_Design_Guide.md) — standards for faction-card pools and future revisions.
- [Playtest Targets and Metrics](Gauntlet_Playtest_Targets_and_Metrics.md) — complete evidence targets and thresholds for controlled testing.
- [One-Page Playtest Sheet](../playtest/) — the routine paper questionnaire, designed to be printed and completed by hand.
- [Leader Design Bible](Gauntlet_v0.6_Leader_Design_Bible.md) — current individual Leader art, silhouette, prop, pose, and miniature direction.
- [Spirit Walker Visual Design Update](Gauntlet_Spirit_Walker_Visual_Design_Update.md) — canonical redesign supplement superseding older Spirit Walker portrait and character guidance where they conflict.
- [Lore Development Notes](Gauntlet_Lore_Development_Notes.md) — incremental setting development.
- [Digital Roadmap](Gauntlet_Digital_Roadmap.md) — future canonical engine and interface direction.
- [v0.7 Parking Lot](Gauntlet_v0.7_Parking_Lot.md) — deferred modules and post-v0.6 concepts.
- [Game Design Glossary](Game_Design_Glossary.md) — general design vocabulary.

## Archive

[Archive](Archive/README.md) contains completed audits, superseded working rules, migration records, and historical development directions. Archived documents preserve rationale and provenance but never override current canonical sources.

## Documentation rule

A document should remain active only when it has a distinct continuing purpose. Completed audits and superseded snapshots should move to `Archive/`; current rules should not be duplicated into new development documents.
