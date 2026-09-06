# Gauntlet Documentation

This directory contains maintained design, testing, setting, production, and development documentation for Gauntlet. Gameplay authority does **not** live here unless a governing source explicitly says otherwise.

## Current authority

For current gameplay and publication work, begin with:

1. [Current gameplay authority](../game-data/current-game.json)
2. [Current Rulebook authority](../rulebook/player-facing/current-rulebook.md)
3. [Current release lifecycle](../config/release-lifecycle.json)
4. [Frozen v0.7.1 release package](../releases/v0.7.1/)
5. [Repository Architecture](Repository_Architecture.md)

Published release snapshots under `releases/` are immutable historical evidence. Current browser tools, renderers, TTS generation, and other maintained surfaces derive from the complete current authorities rather than from old development documents in this directory.

## Active project documents

### Product and design

- [Development Status](Gauntlet_Development_Status.md)
- [Design Principles and Guardrails](Gauntlet_Design_Principles_and_Guardrails.md)
- [Playtest Targets and Metrics](Gauntlet_Playtest_Targets_and_Metrics.md)
- [Gauntlet: Arena](arena/README.md)
- [Game Design Glossary](Game_Design_Glossary.md)
- [v0.7 Parking Lot](Gauntlet_v0.7_Parking_Lot.md)

### Rules and editorial standards

- [Card Text Style Guide](Gauntlet_Card_Text_Style_Guide.md)
- [Rules Language and Editorial Standard](Gauntlet_Rules_Language_and_Editorial_Standard.md)
- [Editorial Style and Capitalization Guide](Gauntlet_Editorial_Style_and_Capitalization_Guide.md)

### Visual design and lore

- [Visual Identity and Design System](Gauntlet_Visual_Identity_and_Design_System.md)
- [Visual Design Language](Gauntlet_Visual_Design_Language.md)
- [Typography System](Gauntlet_Typography_System.md)
- [Illustration Art Direction](Gauntlet_Illustration_Art_Direction.md)
- [Illustration Color Addendum](Gauntlet_Illustration_Color_Addendum.md)
- [Illustration Environmental Detail Guardrails](Gauntlet_Illustration_Environmental_Detail_Guardrails.md)
- [Faction Card Design Guide](Gauntlet_v0.6_Faction_Card_Design_Guide.md)
- [Leader Design Bible](Gauntlet_v0.6_Leader_Design_Bible.md)
- [Spirit Walker Visual Design Update](Gauntlet_Spirit_Walker_Visual_Design_Update.md)
- [Lore Development Notes](Gauntlet_Lore_Development_Notes.md)

### Digital and production

- [Digital Roadmap](Gauntlet_Digital_Roadmap.md)
- [Digital Prototype Roadmap](Gauntlet_Digital_Prototype_Roadmap.md)
- [CI Quality System](ci-quality-system.md)
- [TTS Sliding Trackers](tts-sliding-trackers.md)
- [Typography Standards](typography-standards.md)
- [Artwork documentation](artwork/)
- [Rendering documentation](rendering/)

## Historical material

Completed audits, superseded working rules, migration records, prior-version implementation ledgers, and other historical development records belong under [`docs/Archive/`](Archive/README.md). Frozen recovery material remains under [`docs/recovery/`](recovery/) where required by recovery-integrity locks.

Versioned release packages and withdrawn-release evidence belong under [`releases/`](../releases/), not in the active documentation index.

## Documentation rule

A document should remain at the active `docs/` root only when it has a distinct continuing purpose. Completed audits and superseded snapshots should move to `Archive/`; current rules should not be duplicated into development documents.
