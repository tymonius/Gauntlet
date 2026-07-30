# Gauntlet v0.6.1 First Playtest Revision

**Status:** Draft release candidate under final production validation  
**Publication date:** To be assigned after deployment and physical verification

Gauntlet v0.6.1 is the first physical-playtest revision of the faction-era game. It preserves the v0.6.0 card counts, faction structure, Territory pool, Deck construction rules, and principal victory conditions while revising battle vocabulary, timing, onboarding, card text, and playtest infrastructure.

Until this package is completely validated and published, v0.6.0 remains the current canonical release.

## Governing sources

- `Gauntlet_v0.6.1_Rulebook.md` — shared rules, supplemental-component guide, and complete battle procedure.
- `faction-guides/` — six definitive faction sources, including Leaders and exact faction-card text.
- `../../docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md` — exact Neutral-card text.
- `../../docs/Gauntlet_v0.6.1_Territory_Pool.md` — exact Territory and Arena text.

The governing Markdown sources must be updated before any generated data, printable sheet, browser tool, or digital implementation.

## Completed release sources and outputs

The draft release candidate now contains or drives:

- the layered Markdown Rulebook and compact Reference Guide;
- editable DOCX and print-ready PDF versions of both documents;
- release notes, detailed changelog, package manifest, and first-game material;
- canonical structured JSON and a complete one-file card reference;
- all six definitive faction guides;
- synchronized Browser Rulebook, Card Reference, and Deckbuilder sources;
- canonical-data-driven faction sheets, Leaders, trackers, Proposals, Deeds, Rites, and references;
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
- Rulebook and Reference Guide generation and visual review;
- playtest-sheet and player-mat generation;
- six-faction card-overflow validation; and
- exact faction-PDF page counts with nonblank final pages, followed by visual review.

The archived v0.6.0 PDFs remain byte-for-byte aligned with `main`; the legacy v0.6.0 renderer is prevented from overwriting them from this revision branch.

## Remaining before publication

The following work remains intentionally open:

1. assemble and visually inspect the final v0.6.1 Neutral, Territory, faction, and all-components release PDFs at 100% scale;
2. configure the production Cloudflare account/token and facilitator secret;
3. apply the shared D1 migrations and deploy both Workers;
4. verify both production health endpoints;
5. perform one physical coded-sheet test: print, scan, join, ask the Rules Arbiter, close the session, and confirm that the retired code cannot be reused; and
6. set the publication date, release status, public links, and final manifest flags only after those checks pass.

## Deferred final priority: playable digital implementation

The automated TypeScript game engine is not a dependency for publishing the v0.6.1 tabletop release. Exploratory work adapting the engine to Gambits, Reserves, Tactics, and the revised Aftermath has been preserved separately on `feature/v061-digital-engine-migration`.

That work resumes only after the tabletop package is published. Before a v0.6.1-compatible playable digital build can be declared complete, the engine must replace the legacy hand-commitment and Battle Hand procedure, migrate every affected card and faction handler, enforce the revised information and timing rules, and pass complete regression and multiplayer validation.

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
