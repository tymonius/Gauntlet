# Gauntlet v0.6.1 First Playtest Revision

**Status:** Draft release package under implementation  
**Publication date:** To be assigned after validation

Gauntlet v0.6.1 is the first physical-playtest revision of the faction-era game. It preserves the v0.6.0 card counts, faction structure, Territory pool, Deck construction rules, and principal victory conditions while revising battle vocabulary, timing, onboarding, card text, and playtest infrastructure.

Until this package is complete, validated, and published, v0.6.0 remains the current canonical release.

## Governing sources

- `Gauntlet_v0.6.1_Rulebook.md` — shared rules and complete battle procedure.
- `faction-guides/` — six definitive faction sources, including Leaders and exact faction-card text.
- `../../docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md` — exact Neutral-card text.
- `../../docs/Gauntlet_v0.6.1_Territory_Pool.md` — exact Territory and Arena text.

The governing Markdown sources must be updated before any generated data, printable sheet, browser tool, or digital implementation.

## Release documentation

- `Gauntlet_v0.6.1_Reference_Guide.md` — compact setup, turn, battle, Aftermath, faction, and Territory reference.
- `Gauntlet_v0.6.1_Release_Notes.md` — player-facing overview of the revision.
- `Gauntlet_v0.6.1_Changelog.md` — detailed changes from v0.6.0.

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
- Expands onboarding, player-zone guidance, Rules Arbiter standards, and playtest-session records.

## Package counts

The intended release retains:

- six factions;
- twelve Leaders;
- 50 Neutral cards;
- 72 faction cards;
- 122 playable card titles total; and
- 25 Territories, including four Arenas.

## Files still to generate or validate

The following are intentionally not yet treated as release-ready:

- canonical structured JSON;
- package manifest and validated counts;
- complete one-file card reference;
- editable DOCX and print-ready PDF rulebook;
- PDF reference guide;
- printable Neutral, faction, Territory, Leader, and supplemental-component sheets;
- synchronized faction sheets;
- Deckbuilder data and print output;
- browser rulebook and standalone card reference;
- Rules Arbiter source package;
- digital-engine rules and exact card data;
- formal playtest sheet with session QR and fallback serial; and
- player mat or compact zone reference.

These files must be regenerated from the governing sources and checked before the draft designation is removed.

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
