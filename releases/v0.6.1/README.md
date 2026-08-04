# Gauntlet v0.6.1 First Playtest Revision

**Status:** Published canonical playtest edition  
**Publication date:** July 30, 2026

Gauntlet v0.6.1 is the first physical-playtest revision of the faction-era game. It preserves the v0.6.0 card counts, faction structure, Territory pool, Deck construction rules, and principal victory conditions while revising battle vocabulary, timing, onboarding, card text, and playtest infrastructure.

This package is the current canonical release for Gauntlet playtesting. v0.6.0 remains archived for historical reference.

## Governing sources

- `Gauntlet_v0.6.1_Rulebook.md` — shared rules, supplemental-component guide, and complete battle procedure.
- `faction-guides/` — six definitive faction sources, including Leaders and exact faction-card text.
- `../../docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md` — exact Neutral-card text.
- `../../docs/Gauntlet_v0.6.1_Territory_Pool.md` — exact Territory and Arena text.

The governing Markdown sources must be updated before any generated data, printable sheet, browser tool, or digital implementation.

## Completed release sources and outputs

The published release contains or drives:

- the layered Markdown Rulebook and compact Reference Guide;
- a 76-page color reader Rulebook and a grayscale-compatible 38-side imposed color booklet PDF;
- release notes, detailed changelog, package manifest, and first-game material;
- canonical structured JSON and a complete one-file card reference;
- all six definitive faction guides;
- synchronized Browser Rulebook, Card Reference, and Deckbuilder sources;
- canonical-data-driven Neutral, Territory, faction, and all-components print packages;
- Leaders, trackers, Proposals, Deeds, Rites, and references;
- a printable formal playtest sheet and player mat;
- a formal-session batch generator, private host manifest, join page, and single-use-code lifecycle;
- Rules Arbiter and playtest-session Worker sources sharing one D1 schema; and
- automated source, browser, document, card-overflow, PDF-page, session, and release validation.

## Principal changes

- Introduces **Gambit**, **Reserve**, and **Tactic** as the three battle-card concepts.
- Separates Gambit reveal from Tactic choice and reveal.
- Formalizes the **Aftermath of the battle**.
- Defines simultaneous reveal, shared timing, replacement, revised choices, and additional Tactics.
- Separates effect-caused withdrawal from retreat after a loss.
- Clarifies movement ending when a battle begins and movement after battle.
- Adds Asset replacement at capacity and Territory-linked Overlay control.
- Adds copied-effect rules and consistent effect verbs.
- Audits and rewrites all six faction pools for the revised battle system.
- Reworks Mystics' final victory into the Ritual of Ascendance battle.
- Expands Intelligence Surveillance to separate Gambit and Tactic opportunities.
- Adds Diplomat mirror Terms priority.
- Rebuilds the rulebook using **How it works** followed by **Complete rules**.
- Explains how to prepare and use every faction's supplemental cards and trackers.
- Expands onboarding, player-zone guidance, Rules Arbiter standards, and playtest-session records.

## Package counts

The release retains:

- six factions;
- twelve Leaders;
- 50 Neutral cards;
- 72 faction cards;
- 122 playable card titles total; and
- 25 Territories, including four Arenas.

## Validation completed

The current source candidate has passed:

- obsolete-terminology and exact-source validation;
- card, Territory, faction, value, uniqueness, and legality checks;
- Rules Arbiter retrieval and Worker helper tests;
- playtest-session service tests;
- a complete in-memory coded-session lifecycle test: create session, join, record event, link an Arbiter interaction, close, and reject later use;
- Deckbuilder source and recommended-Deck validation;
- desktop and mobile browser smoke tests;
- 76-page color reader Rulebook and 38-side imposed color booklet generation, complete visual review, and grayscale preflight;
- playtest-sheet and player-mat generation;
- six-faction card-overflow validation;
- exact faction-PDF page counts with nonblank final pages;
- canonical generation of the Neutral, Territory, six faction, and all-components PDFs; and
- page-by-page visual inspection of the standalone packages and the 26-page all-components PDF at rendered print scale.

No clipping, overlap, broken glyphs, blank pages, or unintended trailing pages were found in the final print-package review.

The archived v0.6.0 PDFs remain byte-for-byte aligned with `main`; the legacy v0.6.0 renderer is prevented from overwriting them from this revision branch.

## Public release links

- [Project site](https://gauntlet.run/)
- [Browser Rulebook](https://gauntlet.run/rulebook/)
- [Rulebook PDF](https://gauntlet.run/releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf)
- [Imposed Booklet PDF](https://gauntlet.run/releases/v0.6.1/Gauntlet_v0.6.1_Rulebook_Booklet.pdf)
- [Card Reference](https://gauntlet.run/card-reference/)
- [Deckbuilder](https://gauntlet.run/deckbuilder/)
- [Faction Sheets](https://gauntlet.run/faction-sheets/)
- [Playtest Sheet](https://gauntlet.run/playtest/)

## Publication verification

Production D1 migrations and both Cloudflare Worker deployments passed, both health endpoints were verified, and the physical coded-sheet lifecycle passed in production on July 30, 2026. The completed evidence is preserved in `Gauntlet_v0.6.1_Physical_Verification_Checklist.md` and `deployment-status.json`.

The final 76-page Rulebook was printed on Letter paper from the imposed color booklet PDF, duplexed with short-edge flip, folded, assembled, and verified successfully on August 4, 2026. Page order, orientation, fold margins, color, grayscale legibility, and small-type readability passed the physical test.

## Deferred final priority: playable digital implementation

The automated TypeScript game engine is not a dependency for publishing the v0.6.1 tabletop release. Exploratory work adapting the engine to Gambits, Reserves, Tactics, and the revised Aftermath has been preserved separately on `feature/v061-digital-engine-migration`.

That work resumes only after the tabletop package is published. Before a v0.6.1-compatible playable digital build can be declared complete, the engine must replace the legacy hand-commitment and Battle Hand procedure, migrate every affected card and faction handler, enforce the revised information and timing rules, and pass complete regression and multiplayer validation.

Issues #288 and #289 remain part of that future digital-engine remediation, not this tabletop publication gate.

## Validation requirements

Before publication:

1. search all v0.6.1 sources for obsolete battle terminology;
2. compare exact card text across faction guides, Neutral source, canonical data, printable sheets, and browser references;
3. validate card counts, values, uniqueness, faction legality, Territory counts, and Arena limits;
4. test setup, normal turns, Terms, Gambits, Reserves, Tactics, withdrawal, retreat, capture, Last Stand, and each faction victory route;
5. inspect every generated PDF and printable sheet at 100% scale;
6. test Deckbuilder and reference tools on desktop and mobile; and
7. verify that the Rules Arbiter identifies v0.6.1 sources and labels answers Explicit, Inferred, or Unresolved.

## Source hierarchy

1. `Gauntlet_v0.6.1_Rulebook.md` governs shared rules.
2. Definitive faction guides govern faction-specific rules and exact faction-card text.
3. The v0.6.1 Neutral and Territory pool documents govern their exact player-facing text.
4. Generated canonical data mirrors those sources and must not be edited independently.
5. Printable, browser, and digital implementations are derived artifacts and must be corrected through their governing sources.

## Copyright and use

Gauntlet is an unpublished playtest project.

Copyright © 2026 Tymon Scott. All rights reserved.

Repository materials are provided for private review and playtesting only. They may not be copied, redistributed, sold, republished, or used to create commercial derivative works without written permission.
