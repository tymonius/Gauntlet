# Gauntlet Documentation

This directory contains the active design, testing, setting, and source-card documents for Gauntlet.

For the current playable release, begin with the [canonical v0.6.3 package](../releases/v0.6.3/). Valid older releases remain historical; the original v0.6.2 and v0.6.3 packages are preserved separately as withdrawn evidence under `releases/v0.6.2-withdrawn/` and `releases/v0.6.3-withdrawn/` and are not current authority.

## Canonical v0.6.3 sources

These files define the certified current playtest authority set:

1. [Release Manifest](../releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json) — release identity, authority-set ID, source hashes, and publication metadata.
2. [Official Rulebook](../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md) — shared rules.
3. [Faction Guides](../releases/v0.6.3/faction-guides/) — faction rules, Leaders, supplemental components, and faction procedures.
4. [Canonical Data](../releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json) — certified structured release data.
5. [Card and Territory Reference](../releases/v0.6.3/Gauntlet_v0.6.3_Card_and_Territory_Reference.md) — generated human-readable card and Territory reference.
6. [Starter Decks](../releases/v0.6.3/Gauntlet_v0.6.3_Starter_Decks.json) and [Starter Deck Catalog](../releases/v0.6.3/Gauntlet_v0.6.3_Starter_Deck_Catalog.md) — certified recommended Leader Decks.

When a derived PDF, printable sheet, Deckbuilder entry, Rules Arbiter surface, or digital implementation conflicts with these sources, correct the governing source and regenerate or synchronize the derived artifact.

## Historical release evidence

- [`releases/v0.6.2-withdrawn/`](../releases/v0.6.2-withdrawn/) preserves the original published v0.6.2 package that was withdrawn after release-authority and Rulebook-completeness defects were discovered.
- [`releases/v0.6.3-withdrawn/`](../releases/v0.6.3-withdrawn/) preserves the original published v0.6.3 package that was disqualified during reconstruction.
- [`releases/v0.6.3/`](../releases/v0.6.3/) is the certified reconstructed package and the only current v0.6.3 release authority.

The withdrawn trees are preserved as immutable provenance. Their contents should not be edited to make them look current and should not be used as source material for current browser tools, rules adjudication, printing, or release generation.

## Historical implementation records

The v0.6.1 and v0.6.2 implementation records below preserve the decisions and validation work used to assemble those releases. They are provenance, not current authority.

### v0.6.2

- [v0.6.2 Shared Rules Candidate](Gauntlet_v0.6.2_Shared_Rules_Candidate.md) — adopted Wave A player-facing and technical text for the turn, Action, movement, pending-battle, Terms, Onset, Defensive Edge, Tiebreak Roll, Front Line, withdrawal, and retreat systems.
- [v0.6.2 Shared Reference Candidate](Gauntlet_v0.6.2_Shared_Reference_Candidate.md) — compact tableside form of the adopted Wave A shared rules.
- [v0.6.2 Shared Rules Test Matrix](Gauntlet_v0.6.2_Shared_Rules_Test_Matrix.md) — normative scenarios and cross-surface acceptance gates for the Wave A shared-rule implementation.
- [v0.6.2 Faction and Component Candidate](Gauntlet_v0.6.2_Faction_and_Component_Candidate.md) — normative Wave B faction rules, Proposal text, revised components, seven-card expansion, Territory changes, and interaction requirements.
- [v0.6.2 Faction and Component Compatibility Audit](Gauntlet_v0.6.2_Faction_Component_Compatibility_Audit.md) — exact inherited-source replacements for retired timing, visibility, movement, tie, and control language.
- [v0.6.2 Faction and Component Test Matrix](Gauntlet_v0.6.2_Faction_Component_Test_Matrix.md) — 85 primary cross-faction and component scenarios governing later structured-data and digital propagation.
- [v0.6.2 Faction and Component Compatibility Test Matrix](Gauntlet_v0.6.2_Faction_Component_Compatibility_Test_Matrix.md) — 26 inherited-source scenarios; together the Wave B matrices contain 111 normative cases.
- [v0.6.2 Wave B Review Checklist](Gauntlet_v0.6.2_Wave_B_Review_Checklist.md) — focused review gate for faction, component, compatibility, and source-boundary changes.
- [v0.6.2 Starter Decks Candidate](Gauntlet_v0.6.2_Starter_Decks_Candidate.json) — twelve exact 30-card, 60-value Leader starters rebuilt from the full legal v0.6.2 pools, with ordered Territories, signature packages, opening plans, and consistency thresholds.
- [v0.6.2 First-Game and Tableside Candidate](Gauntlet_v0.6.2_First_Game_and_Tableside_Candidate.md) — normative Wave C teaching order, faction and opponent summaries, physical zones, bound-card handling, active-player marker text, pairings, and guided first battle.
- [v0.6.2 Wave C Test Matrix](Gauntlet_v0.6.2_Wave_C_Test_Matrix.md) — 66 normative starter, onboarding, tableside, and faction-teaching scenarios.
- [v0.6.2 Wave C Review Checklist](Gauntlet_v0.6.2_Wave_C_Review_Checklist.md) — review gate for starter legality, Leader identity, early access, teaching sequence, faction presentation, and release boundaries.
- [v0.6.2 Wave D Test Matrix](Gauntlet_v0.6.2_Wave_D_Test_Matrix.md) — 48 normative structured-data, candidate-surface, starter-handoff, generated-reference, and release-integrity scenarios.
- [v0.6.2 Wave D Review Checklist](Gauntlet_v0.6.2_Wave_D_Review_Checklist.md) — review gate for the effective 128-card data source, versioned Start and Deckbuilder surfaces, generated reference, and release-integrity scenarios.
- [v0.6.2 Candidate Player Surfaces](../v0.6.2/) — versioned candidate surfaces assembled during the v0.6.2 cutover.
- [v0.6.2 Implementation Ledger](Gauntlet_v0.6.2_Implementation_Ledger.md) — adopted post-playtest changes, release dependencies, ordered propagation waves, and validation gates used to assemble the release.

### v0.6.1

- [v0.6.1 Implementation Ledger](Gauntlet_v0.6.1_Implementation_Ledger.md) — approved first-playtest corrections and synchronization checklist.
- [v0.6.1 Rulebook Layering Standard](Gauntlet_v0.6.1_Rulebook_Layering_Standard.md) — approved **How it works / Complete rules** structure for combining first-game teaching with technical reference.

These records may be archived when they no longer serve a continuing development or provenance purpose. They never override the current release package.

## Active development documents and tools

- [Gauntlet: Arena](arena/README.md) — active four-player free-for-all design, prototype rules, open questions, and test planning.
- [Development Status](Gauntlet_Development_Status.md) — current post-release priorities and playtest watchlist.
- [Design Principles and Guardrails](Gauntlet_Design_Principles_and_Guardrails.md) — durable game-design constraints.
- [Editorial Style and Capitalization Guide](Gauntlet_Editorial_Style_and_Capitalization_Guide.md) — audience-aware rules for Protected Words, public-facing prose, interface labels, and terminology consistency.
- [Visual Identity and Design System](Gauntlet_Visual_Identity_and_Design_System.md) — cross-channel framework for brand, typography, color, shapes, icons, cards, rulebook, website, tools, digital play, physical components, and production assets.
- [Typography System](Gauntlet_Typography_System.md) — approved working type families, role boundaries, Caslon italic usage, shared web tokens, and the print and screen tests required before exact sizes are locked.
- [Live Typography Specimen](../typography/) — internal browser specimen for P22 1722 Pro, Adobe Caslon Pro, Georgia, P22 Declaration Pro, Inter, and actual-size card typography tests.
- [Live Neutral Card-Front Prototype](../card-design/) — actual-size frame and hierarchy study using sparse, dense, and reminder-text Neutral cards.
- [Visual Design Language](Gauntlet_Visual_Design_Language.md) — approved detailed graphic and component principles for faction identity, cards, print materials, and interfaces.
- [Illustration Art Direction](Gauntlet_Illustration_Art_Direction.md) — shared visual-world standards for architecture, clothing, technology, environments, faction depiction, and card illustration.
- [Illustration Color Addendum](Gauntlet_Illustration_Color_Addendum.md) — approved color-richness standard balancing historical realism with attractive, collectible card art.
- [Illustration Environmental Detail Guardrails](Gauntlet_Illustration_Environmental_Detail_Guardrails.md) — approved rules for flags, signage, visible writing, environmental labeling, scene density, and card-size focal clarity.
- [Faction Card Design Guide](Gauntlet_v0.6_Faction_Card_Design_Guide.md) — standards for faction-card pools and future revisions.
- [Playtest Targets and Metrics](Gauntlet_Playtest_Targets_and_Metrics.md) — complete evidence targets and thresholds for controlled testing.
- [Playtest Tools](../playtest/) — current v0.6.3 routine, tracked, and formal playtest workflows. New game sessions use `G063-…` serials and event containers use `EV063-…`; historical stored sessions retain their persisted version and serial.
- [Rules Arbiter Adjudication Guide](../rules-assistant/Rules_Arbiter_Adjudication_Guide.md) — current v0.6.3 ruling and adjudication policy. The current unversioned Arbiter and browser fallback use v0.6.3 sources; explicit older version routes remain available as historical compatibility surfaces.
- [Leader Design Bible](Gauntlet_v0.6_Leader_Design_Bible.md) — current individual Leader art, silhouette, prop, pose, and miniature direction.
- [Spirit Walker Visual Design Update](Gauntlet_Spirit_Walker_Visual_Design_Update.md) — canonical redesign supplement superseding older Spirit Walker portrait and character guidance where they conflict.
- [Lore Development Notes](Gauntlet_Lore_Development_Notes.md) — incremental setting development.
- [Digital Roadmap](Gauntlet_Digital_Roadmap.md) — future canonical engine and interface direction.
- [Digital Prototype Roadmap](Gauntlet_Digital_Prototype_Roadmap.md) — current status and migration requirements for the legacy digital prototype.
- [v0.7 Parking Lot](Gauntlet_v0.7_Parking_Lot.md) — deferred modules and post-v0.6 concepts that have not entered active development.
- [Game Design Glossary](Game_Design_Glossary.md) — general design vocabulary.

## Archive

[Archive](Archive/README.md) contains completed audits, superseded working rules, migration records, and historical development directions. Archived documents preserve rationale and provenance but never override current canonical sources.

## Documentation rule

A document should remain active only when it has a distinct continuing purpose. Completed audits and superseded snapshots should move to `Archive/`; current rules should not be duplicated into new development documents.
