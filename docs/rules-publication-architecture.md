# Rules Publication Architecture

Gauntlet uses one gameplay authority and multiple purpose-built rules surfaces. `game-data/current-game.json` remains the only current gameplay authority. Published rules, player guides, faction guides, reference cards, and the Rules Arbiter consume that authority rather than defining mechanics independently.

## Surfaces

### Gauntlet Player's Guide

The Player's Guide teaches the universal game in the order a new player needs it. It includes enough information about every faction for opponent literacy, but it does not teach another faction's operating procedures.

Its job is to answer:

- What am I trying to do?
- What happens on my turn?
- How do movement, battles, occupation, capture, and victory work?
- What is each faction broadly trying to do against me?

Mechanically substantive teaching passages declare semantic rule dependencies. Friendly wording may differ from technical wording, but the mechanic may not.

### Faction Guides

Each faction has its own player-facing guide. A faction guide assumes the reader already knows the universal game and teaches only what that faction adds or changes.

A faction guide covers:

1. the faction's identity and play pattern;
2. faction components and setup;
3. resources or progress systems;
4. faction features;
5. alternate victory, where applicable;
6. Leaders;
7. a worked example;
8. first-game guidance; and
9. where to find exact rulings.

Faction guides remain player-friendly. They do not contain a separately authored technical rules appendix.

### Comprehensive Gauntlet Rules

The Comprehensive Rules are the single complete technical rules corpus for the entire game. They include universal rules, all faction rules, and cross-system interaction rules.

They are organized for precise lookup rather than teaching. Faction sections define only what that faction adds or changes; they do not restate universal rules unless needed to identify the exact interaction point.

Publication numbering is not rule identity. Stable semantic rule IDs remain constant even when chapters or sections move.

### Reference Cards

Reference cards are procedural table aids. Their compact wording is derived from authority or explicitly dependency-tracked. They are never independent rules authorities.

### Rules Arbiter

The Rules Arbiter resolves questions from the Comprehensive Rules plus canonical game objects in `current-game.json`.

Its normal response style is player-friendly:

1. ruling;
2. plain-language explanation;
3. timing or exception when needed; and
4. technical citation when useful.

Teaching guides may help presentation, but they never resolve a conflict against technical authority.

## Semantic rule registry

`config/rules-surface-contract.json` registers stable semantic IDs such as:

- `core.battle.movement-initiation`
- `core.battlefield.last-stand`
- `faction.financiers.definition`
- `faction.diplomats.proposals`

Each ID points to one or more locations in the current authority. A rule ID is deliberately independent of a displayed chapter or section number.

The registry begins with broad domains and important high-risk leaf rules. It should become more granular as new publication copy is authored. A broad dependency is safe but may require more review than a precise dependency.

## Dependency modes

### Direct

Technical material is rendered or assembled directly from registered authority. A rules change should flow into the output without a human having to remember every publication location.

### Reviewed teaching

Human-authored teaching copy declares the semantic rules it explains. When that dependency set changes, its fingerprint changes and CI requires the passage to be reviewed before the teaching surface can be considered current again.

This is intentionally different from automatic regeneration: player-friendly prose remains human-authored, but stale prose cannot remain silently approved.

### Procedural

Reference copy is compact and table-oriented. Direct derivation is preferred. Bespoke phrasing must retain explicit authority dependencies.

## Content boundaries

The base Player's Guide may depend on faction definition/overview rules for opponent literacy. It must not pull faction operating rules into the universal teaching sequence.

A faction guide may depend on universal rules and its own faction rules. It must not become a second technical authority or import another faction's operating rules.

The Comprehensive Rules must cover every registered semantic rule. Cross-faction interactions are resolved there rather than by reconciling multiple faction technical manuals.

## Migration

The existing monolithic rulebook remains release-supported during migration.

1. Establish and validate the rules-surface contract.
2. Expand the semantic rule registry to the granularity needed by new copy.
3. Draft the new Player's Guide against declared dependencies.
4. Draft the six Faction Guides against declared dependencies.
5. Build the Comprehensive Rules as the technical projection of authority.
6. Audit reference cards against the same registry.
7. Point Rules Arbiter retrieval at the new technical corpus while retaining player-friendly answer presentation.
8. Crosswalk every rule in the legacy rulebook to the new system.
9. Retire the monolithic rulebook only after coverage is complete and validated.

The legacy rulebook is therefore a migration regression source, not the design template for the new publications.
