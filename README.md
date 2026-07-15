# Gauntlet

Gauntlet is a two-player tactical card-and-territory game about advancing across a contested battlefield, capturing ground, managing limited cards, surviving counterattacks, and breaking through the opponent's final position.

The project is in private pre-release development and physical playtesting.

## Current status

- **Latest completed pre-faction playtest line:** v0.5.7
- **Active development line:** v0.6
- **v0.6 focus:** six factions, two leaders per faction, faction resources, alternate victory paths, canonical-data production, and faction playtesting
- **Playable-card review:** complete for all 54 v0.5.7 source cards
- **Completed faction pools:** Military, Diplomats, and Inquisition
- **Territory review:** complete for all 25 v0.5.7 Territories and Arenas
- **Conditions:** retired as a v0.6 game concept; persistent effects now use Assets, Overlays, or immediate/self-tracking resolution
- **Live checkpoint:** `docs/Gauntlet_v0.6_Project_Index.md`

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
- [Gauntlet v0.6 Faction Sheets](https://tymonius.github.io/Gauntlet/faction-sheets/) — browser-printable working sheets for completed v0.6 faction packages and supplemental cards.

The current deckbuilder is versioned for the v0.5 line. The v0.6 faction sheets use active working exact text while faction development continues; a canonical v0.6 deckbuilder mode remains planned after the remaining packages stabilize.

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

- `docs/Gauntlet_v0.6_Project_Index.md` — current source-of-truth map and milestone checkpoint;
- `docs/Gauntlet_v0.6_Working_Rules.md` — active v0.6 rules framework;
- `docs/Gauntlet_v0.6_Neutral_Card_Pool.md` — authoritative working Neutral exact text;
- `docs/Gauntlet_v0.6_Military_Card_Pool.md` — authoritative working Military exact text;
- `docs/Gauntlet_v0.6_Diplomat_Card_Pool.md` — authoritative working Diplomat exact text;
- `docs/Gauntlet_v0.6_Diplomat_Supplemental_Cards.md` — Ambassador, Senator, Proposal / Treaty Article cards, reference, and sliding Influence Tracker;
- `docs/Gauntlet_v0.6_Inquisition_Card_Pool.md` — authoritative working Inquisition exact text;
- `docs/Gauntlet_v0.6_Inquisition_Supplemental_Cards.md` — Grand Inquisitor, Witch Hunter, faction references, and Conviction tracker;
- `docs/card-reviews/STATUS.md` — consolidated playable-card checkpoint and exact-text blockers;
- `docs/Gauntlet_v0.6_Card_Review_Log.md` — decisions for all 54 reviewed playable cards;
- `docs/Gauntlet_v0.6_Card_Metadata.md` — card allegiance, complexity, starter, and watchlist metadata;
- `docs/card-reviews/CONDITION_AUDIT.md` — former Condition conversions and retirement rationale;
- `docs/territory-reviews/STATUS.md` — Territory-review checkpoint;
- `docs/territory-reviews/GENERAL_RULES.md` — Territory activation and suppression rules;
- `docs/Gauntlet_v0.6_Open_Questions.md` — unresolved current decisions;
- `docs/Gauntlet_Design_Principles_and_Guardrails.md` — design constraints;
- `docs/Gauntlet_Playtest_Targets_and_Metrics.md` — pacing and telemetry standards.

`docs/Archive/` contains completed audits and superseded historical records. Archived files provide provenance but do not override active documents or canonical release data.

### `faction-sheets/`

Browser-printable working sheets for v0.6 faction cards and supplemental components. Military and Inquisition have complete two-sheet packages; Diplomats have a four-sheet package with duplex Proposal / Treaty Article faces. See `faction-sheets/README.md` for rendered links and instructions.

### `images/`

Current v0.6 leader portrait assets are stored at the top level, with matching production sketches under `images/sketches/`.

### `deckbuilder/`

Static browser deckbuilder for the v0.5 pre-faction ruleset. It supports card filtering, duplicate cards, Territory selection, validation, local saves, JSON import/export, text export, random deck generation, and browser print-to-PDF.

### `data/`

Early machine-readable starter data and schema work for digital development. It is not the authoritative source for v0.5.7 or v0.6.

### `src/`

Framework-neutral TypeScript rules-engine scaffolding, including state, legal actions, hidden-information views, battle and turn flow, Asset-bank enforcement, occupation/capture logic, CLI development tools, and a local browser GUI.

The digital prototype's Condition zone has been removed, but the prototype is not yet a complete implementation of the full v0.5.7 card pool or developing v0.6 factions.

### `.github/workflows/`

Automation and repository workflows.

## Development workflow

1. Treat released canonical data as authoritative for its matching version.
2. Treat active v0.6 documents as the working source of truth until canonical v0.6 data exists.
3. Record approved decisions in the relevant active review or rules source.
4. Roll standalone decisions into the consolidated Review Log and Metadata registry at material checkpoints.
5. Reserve README and Project Index updates for material milestones, source-hierarchy changes, and batch checkpoints.
6. Keep rules, testing rationale, lore, production art direction, and digital implementation status in their designated documents.
7. Move completed audits and superseded working records into `docs/Archive/` when they remain useful for provenance.
8. Do not create canonical v0.6 data by silently resolving open design questions.

## Running digital tools locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/deckbuilder/
http://localhost:8000/faction-sheets/
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
