# Gauntlet

Gauntlet is a two-player tactical card-and-territory game about Deck construction, hidden battle commitments, territorial control, faction asymmetry, and running the Gauntlet.

**Project site:** [gauntlet.run](https://gauntlet.run/) — the public home for current rules, browser tools, releases, and playtest resources.

## Canonical release

**Current canonical version:** v0.6.2 — Second Playtest Revision

The immutable source package is under [`releases/v0.6.2/`](releases/v0.6.2/). It contains:

- the official rulebook and compact reference guide;
- the faction and component guide;
- the first-game guide and twelve recommended starter Decks;
- the complete 128-card, 25-Territory, and nine-Proposal references;
- canonical structured data and release manifests;
- release notes; and
- [What Changed Since v0.6.1](releases/v0.6.2/Gauntlet_v0.6.2_Returning_Player_Changes.md), a returning-player summary.

v0.6.1 remains available under [`releases/v0.6.1/`](releases/v0.6.1/) as an immutable historical release. It is obsolete for current playtesting but preserved for comparison and existing playtest records.

## Game overview

Each player chooses:

- one faction;
- one Leader;
- a Playable Deck of at least 30 cards and no more than 60 total value;
- three different Territories; and
- any required faction- or Leader-specific supplemental components.

The players secretly arrange their Territories, reveal all six, and join them into the Gauntlet. They then advance, fight battles, occupy enemy-controlled Territories, survive Counterattacks, capture supported ground, and attempt to run the Gauntlet.

A Player Token always has a Position. Occupation begins only when that token is on an opposing Territory the player does not control. Territory control advances contiguously from each player’s end as their Front Line.

To run the Gauntlet, a player must capture the opponent’s final Territory, advance beyond the Territory column, force a Last Stand, and win the resulting battle.

## Factions

| Faction | Leaders | Core system | Additional victory |
|---|---|---|---|
| Military | General, Commandant | Command and Orders | None |
| Diplomats | Ambassador, Senator | Influence, Terms, and Proposals | Peace Treaty |
| Financiers | Banker, Executive | Capital, Treasury, and Deeds | Controlling Interest |
| Intelligence | Ranger, Spymaster | Intel, Missions, and Operation Progress | Special Operation |
| Mystics | Alchemist, Spirit Walker | Rites, Invocation, and Transmutation | Ritual |
| Inquisition | Grand Inquisitor, Witch Hunter | Conviction, Condemnation, and Purge | Purification |

## Current player tools

- [Start Playing](https://gauntlet.run/v0.6.2/start/) — layered first-game guidance, recommended Leaders and pairings, faction teaching cards, and direct starter-Deck handoff.
- [Gauntlet v0.6.2 Browser Rulebook](https://gauntlet.run/v0.6.2/rulebook/) — searchable rendering of the complete current rules.
- [Gauntlet v0.6.2 Deckbuilder](https://gauntlet.run/v0.6.2/deckbuilder/) — load one of twelve recommended Leader Decks or build, validate, save, export, and print a complete playtest package containing the Leader, Territories, playable cards, and required faction components.
- [Gauntlet v0.6.2 Card Reference](https://gauntlet.run/v0.6.2/reference/) — search all 128 playable cards, 25 Territories, and nine Proposals.
- [What Changed Since v0.6.1](https://gauntlet.run/v0.6.2/changes/) — practical patch notes for returning playtesters.
- [Rules Arbiter](https://gauntlet.run/#rules-assistant) — asks the published v0.6.2 corpus and labels written rules, clarifications, and provisional rulings distinctly.
- [Gauntlet v0.6.2 Release Package](https://gauntlet.run/releases/v0.6.2/) — canonical source documents, data, and manifests.
- [Playtest resources](https://gauntlet.run/playtest/) — tracked sessions, questionnaires, and organizer tools.

Historical Rules Arbiter access remains available at `/api/v061/rules`. The public `/api/rules` and explicit `/api/v062/rules` routes use published v0.6.2 sources.

## Canonical source hierarchy

For v0.6.2:

1. [`releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md`](releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md) governs shared rules.
2. [`releases/v0.6.2/Gauntlet_v0.6.2_Faction_and_Component_Guide.md`](releases/v0.6.2/Gauntlet_v0.6.2_Faction_and_Component_Guide.md) governs faction, Leader, Proposal, and supplemental-component rules.
3. [`releases/v0.6.2/Gauntlet_v0.6.2_Complete_Card_Reference.md`](releases/v0.6.2/Gauntlet_v0.6.2_Complete_Card_Reference.md) provides the complete current card and Territory reference.
4. [`releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json`](releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json) is the published machine-readable data generated from the adopted sources and must not be edited independently.
5. [`releases/v0.6.2/Gauntlet_v0.6.2_Manifest.json`](releases/v0.6.2/Gauntlet_v0.6.2_Manifest.json) and [`v0.6.2/release-manifest.json`](v0.6.2/release-manifest.json) record package and public-default status.

Browser pages, Deckbuilder output, Rules Arbiter packets, and digital state behavior are derived production surfaces. When a derived surface conflicts with a governing source, correct the source or generator and regenerate the affected output.

## Repository map

### `releases/`

Immutable versioned release packages. [`releases/v0.6.2/`](releases/v0.6.2/) is current; [`releases/v0.6.1/`](releases/v0.6.1/) remains historical.

### `v0.6.2/`

Versioned current player surfaces and the canonical-data builder used to materialize the published package.

### `docs/`

Design sources, propagation matrices, release-closeout records, testing documentation, and the [documentation index](docs/README.md).

### `factions/`

Public faction overviews synchronized to current v0.6.2 terminology and timing.

### `faction-sheets/`

Legacy browser-printable faction sheets retained only for compatibility with old bookmarks and release-era references. They are no longer an active production surface. Use the current Deckbuilder for complete-package printing.

### `rules-assistant/`

Published and historical Rules Arbiter workers, deterministic rulings, corpus builders, route tests, and browser widget.

### `src/v062/` and `src/content/`

Executable v0.6.2 shared rules, new and migrated card behavior, faction procedures, and the current digital-content selector.

### `scripts/`

Release generation, source synchronization, validation, media generation, and production checks.

### `.github/workflows/`

Automated testing, release materialization, source validation, rendering, and asset-generation workflows.

## Development workflow

1. Change the appropriate governing source or adopted candidate document.
2. Update the relevant structured-data or executable behavior layer.
3. Regenerate synchronized release and public outputs.
4. Run type checking, the full test chain, and version-specific validation.
5. Visually inspect affected browser, print, card, and rulebook surfaces.
6. Record release-facing changes in release notes and returning-player documentation.
7. Preserve unresolved design questions in the issue tracker rather than silently settling them in generated files.

## Running browser tools locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
http://localhost:8000/v0.6.2/start/
http://localhost:8000/v0.6.2/rulebook/
http://localhost:8000/v0.6.2/deckbuilder/
http://localhost:8000/v0.6.2/reference/
http://localhost:8000/playtest/
```

For repository validation:

```bash
npm install
npm run typecheck
npm test
```

## Copyright and use

Copyright © 2026 Tymon Scott. All rights reserved.

Gauntlet is an unpublished playtest project. Repository materials are provided for private review and playtesting only. They may not be copied, redistributed, sold, republished, or used to create commercial derivative works without written permission.

Submitted comments, corrections, suggestions, and playtest feedback may be used or adapted in future versions without compensation or attribution unless agreed otherwise in writing.
