# Gauntlet

Gauntlet is a two-player tactical card-and-territory game about advancing across a contested battlefield, capturing ground, managing limited cards, surviving counterattacks, and breaking through the opponent's final position.

The project is in private pre-release development and physical playtesting.

## Current status

- **Latest completed pre-faction playtest line:** v0.5.7
- **Active development line:** v0.6
- **v0.6 focus:** six factions, two leaders per faction, faction resources, alternate victory paths, card-pool migration, and faction playtesting
- **Current card-review checkpoint:** completed through **Sabotage**; next card is **Scorched Earth**

The six developing factions are:

| Faction | Identity |
|---|---|
| Military | conquest, battlefield momentum, and Orders |
| Diplomats | Terms, Influence, concessions, and Peace Treaty |
| Inquisition | Conviction, condemnation, Purge, and Purification |
| Arcane | Rites, sacrifice, transformation, and Ritual victory |
| Financiers | Capital, Treasury, Deeds, and Controlling Interest |
| Intelligence | Intel, Missions, Surveillance, and Special Operation |

## Playtest tools

- [Gauntlet v0.5 Deckbuilder](https://tymonius.github.io/Gauntlet/deckbuilder/) — build, validate, save, randomize, export, and print pre-faction v0.5 decks.

The current deckbuilder is versioned for the v0.5 line. A separate v0.6+ rules/data mode is planned after the faction card pool and canonical data stabilize.

## Game overview

Players begin on opposite sides of a short line of Territories called the Gauntlet. Each player constructs a deck and selects Territories. During play, they draw cards, play Actions, bank Assets, move, contest ground, fight battles, occupy enemy Territories, survive counterattacks, and capture positions.

The universal victory condition is to reach and defeat the opponent in their Heartland. v0.6 factions add distinct ways of creating pressure and, for most factions, visible alternate victory paths.

Gauntlet is designed around:

- tactical movement and territorial control;
- hidden hand commitments and battle draws;
- public board pressure and private card management;
- occupation, counterattack, and delayed capture;
- meaningful but reversible progress;
- Asset-bank capacity linked to Territory control;
- strategic asymmetry without replacing the core positional game.

## Repository map

### `releases/`

Immutable historical playtest packages. Each version folder may contain canonical data, rules, printable cards, deck lists, feedback forms, release notes, and build scripts.

Use the highest completed version for the latest released physical playtest baseline. Do not edit an old release folder to represent later rules.

### `docs/`

Active design, rules, testing, setting, and production documentation.

Start with:

- `docs/Gauntlet_v0.6_Project_Index.md` — current source-of-truth map and checkpoint;
- `docs/Gauntlet_v0.6_Working_Rules.md` — active v0.6 rules framework;
- `docs/Gauntlet_v0.6_Card_Metadata.md` — card allegiance, starter eligibility, complexity, and watchlist metadata;
- `docs/Gauntlet_v0.6_Card_Review_Log.md` — consolidated migration decisions;
- `docs/Gauntlet_v0.6_Open_Questions.md` — unresolved current decisions;
- `docs/Gauntlet_Design_Principles_and_Guardrails.md` — design constraints;
- `docs/Gauntlet_Playtest_Targets_and_Metrics.md` — pacing and telemetry standards.

`docs/Archive/` contains completed audits and superseded historical records. Archived files provide provenance but do not override active documents or canonical release data.

### `deckbuilder/`

Static browser deckbuilder for the v0.5 pre-faction ruleset. It supports card filtering, duplicate cards, Territory selection, validation, local saves, JSON import/export, text export, random deck generation, and browser print-to-PDF.

### `data/`

Early machine-readable starter data and schema work for digital development. It is not the authoritative source for v0.5.7 or v0.6.

### `src/`

Framework-neutral TypeScript rules-engine scaffolding, including state, legal actions, hidden-information views, battle and turn flow, Asset-bank enforcement, occupation/capture logic, CLI development tools, and a local browser GUI.

The digital prototype is not yet a complete implementation of the full v0.5.7 card pool or developing v0.6 factions.

### `.github/workflows/`

Automation and repository workflows.

## Development workflow

1. Treat released canonical data as authoritative for its matching version.
2. Treat active v0.6 documents as the working source of truth until canonical v0.6 data exists.
3. Record approved decisions in the repository rather than relying on chat history.
4. Keep rules, testing rationale, lore, production art direction, and digital implementation status in their designated documents.
5. Move completed audits and superseded working records into `docs/Archive/` when they remain useful for provenance.

## Running digital tools locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open the deckbuilder at:

```text
http://localhost:8000/deckbuilder/
```

For the TypeScript development tools:

```bash
npm install
npm run typecheck
npm test
npm run dev:cli
npm run dev:gui
```

## Copyright and use

Copyright © 2026 Tymon Scott. All rights reserved.

Gauntlet is an unpublished playtest project. Repository materials are provided for private review and playtesting only. They may not be copied, redistributed, sold, republished, or used to create commercial derivative works without written permission.

Submitted comments, corrections, suggestions, and playtest feedback may be used or adapted in future versions without compensation, attribution, or obligation.
