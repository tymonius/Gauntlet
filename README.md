# Gauntlet

Gauntlet is a two-player tactical card-and-territory game about advancing across a contested battlefield, capturing ground, managing limited cards, surviving counterattacks, and running the Gauntlet.

The project is in private pre-release development and physical playtesting.

## Current status

- **Latest completed pre-faction playtest line:** v0.5.7
- **Active development line:** v0.6
- **v0.6 focus:** six factions, two leaders per faction, faction resources, alternate victory paths, canonical-data production, and faction playtesting
- **Playable-card review:** complete for all 54 v0.5.7 source cards
<<<<<<< ours
- **Completed faction pools:** Military, Diplomats, Inquisition, Financiers, and Intelligence
- **Preliminary v0.6 core rulebook:** self-contained shared rules draft at `releases/v0.6/Gauntlet_v0.6_Preliminary_Core_Rules.md`
- **Definitive faction guides:** Military, Diplomats, Inquisition, Financiers, and Intelligence are packaged in Markdown, DOCX, and PDF under `releases/v0.6/faction-guides/`
- **Territory review:** complete for all 25 v0.5.7 Territories and Arenas; exact text consolidated in `docs/Gauntlet_v0.6_Territory_Pool.md`
- **Conditions:** retired as a v0.6 game concept; persistent effects now use Assets, Overlays, or immediate/self-tracking resolution
- **v0.6 deckbuilder:** live and reading the active Neutral, Military, Diplomat, Inquisition, Financier, Intelligence, and Territory Markdown sources
=======
- **Completed definitive faction pools:** Military, Diplomats, Inquisition, and Mystics
- **Selected working faction pool:** Financiers
- **Current playable designs:** 114
- **Preliminary v0.6 core rulebook:** self-contained shared rules draft at `releases/v0.6/Gauntlet_v0.6_Preliminary_Core_Rules.md`
- **Definitive faction guides:** Military, Diplomats, Inquisition, and Mystics are packaged under `releases/v0.6/faction-guides/`
- **Territory review:** complete for all 25 v0.5.7 Territories and Arenas; exact text consolidated in `docs/Gauntlet_v0.6_Territory_Pool.md`
- **Conditions:** retired as a v0.6 game concept; persistent effects now use Assets, Overlays, or immediate/self-tracking resolution
- **v0.6 deckbuilder:** live and reading the implemented Neutral, Military, Diplomat, Inquisition, and Territory Markdown sources; Mystics integration remains a production follow-up
>>>>>>> theirs
- **Live checkpoint:** `docs/Gauntlet_v0.6_Project_Index.md`

The six v0.6 factions are:

| Faction | Identity |
|---|---|
| Military | conquest, battlefield momentum, and Orders |
| Diplomats | Terms, Influence, concessions, and Peace Treaty |
| Inquisition | Conviction, condemnation, Purge, and Purification |
| Mystics | Rites, sacrifice, Graveyard transformation, and Ritual victory |
| Financiers | Capital, Treasury, Deeds, and Controlling Interest |
| Intelligence | Intel, Missions, Surveillance, and Special Operation |

## Playtest tools

- [Gauntlet v0.5 Deckbuilder](https://tymonius.github.io/Gauntlet/deckbuilder/) — build, validate, save, randomize, export, and print pre-faction v0.5 decks.
- [Gauntlet v0.6 Development Deckbuilder](https://tymonius.github.io/Gauntlet/deckbuilder-v0.6/) — build faction-era test decks with implemented leaders and Territories, save or export them, generate random valid decks, and print complete implemented faction packages.
- [Gauntlet v0.6 Faction Sheets](https://tymonius.github.io/Gauntlet/faction-sheets/) — browser-printable working sheets for implemented v0.6 faction packages and supplemental cards.

The v0.6 deckbuilder is intentionally a development tool rather than canonical release data. It supports implemented faction and leader selection, playable-card and Territory validation, local saves, JSON and text export, random test-deck generation, and browser Print / PDF output containing the selected leader, playable cards, Territories, trackers, references, and required supplemental faces. The definitive Mystics source is complete, but its deckbuilder and printable-sheet implementation remains pending.

## Game overview

Players begin on opposite sides of a short line of Territories called the Gauntlet. Each player constructs a deck and selects Territories. During play, they draw cards, play Actions, bank Assets, move, contest ground, fight battles, occupy enemy Territories, survive counterattacks, and capture positions.

The universal victory condition is to **run the Gauntlet**: advance through the contested line and defeat the opponent in their Heartland. v0.6 factions add distinct ways of creating pressure and, for most factions, visible alternate victory paths.

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

Versioned playtest and release-ready packages. Completed historical releases remain immutable. Developing v0.6 release inserts may be assembled here once a faction source is definitive.

The preliminary shared v0.6 rulebook is:

- `releases/v0.6/Gauntlet_v0.6_Preliminary_Core_Rules.md`

This is the current self-contained, player-facing core rules draft intended to accompany the faction guides. It consolidates the v0.5.7 baseline and approved v0.6 core decisions, but remains preliminary until all six faction packages and release blockers are complete. `docs/Gauntlet_v0.6_Working_Rules.md` remains the active development superset.

The definitive Military package is:

- `releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`
- `releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.docx`
- `releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.pdf`

The Markdown file is the definitive Military source. The DOCX and PDF are matching release-formatted editions prepared for insertion into the complete v0.6 release guide.

The definitive Diplomat package is:

- `releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md`
- `releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.docx`
- `releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.pdf`

The Markdown file is the definitive Diplomat source. The DOCX and PDF are matching release-formatted editions prepared for insertion into the complete v0.6 release guide.

The definitive Inquisition package is:

- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`
- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.docx`
- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.pdf`

The Markdown file is the definitive Inquisition source. The DOCX and PDF are matching release-formatted editions.

<<<<<<< ours
The definitive Financier package is:

- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`
- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.docx`
- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.pdf`

The Markdown file is the definitive Financier source. The DOCX and PDF are matching release-formatted editions.

The definitive Intelligence package is:

- `releases/v0.6/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md`
- `releases/v0.6/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.docx`
- `releases/v0.6/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.pdf`

The Markdown file is the definitive Intelligence source. The DOCX and PDF are matching release-formatted editions.
=======
The definitive Mystics package is:

- `releases/v0.6/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md`
- `releases/v0.6/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.docx`
- `releases/v0.6/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.pdf`

The Markdown file is the definitive Mystics source. The DOCX and PDF are matching release-formatted editions covering the leaders, three Rites, Ritual progression, references, strategy, rules clarifications, and canonical twelve-card pool.
>>>>>>> theirs

### `docs/`

Active design, rules, testing, setting, and production documentation.

Start with:

- `docs/Gauntlet_v0.6_Project_Index.md` — current source-of-truth map and milestone checkpoint;
- `releases/v0.6/Gauntlet_v0.6_Preliminary_Core_Rules.md` — self-contained preliminary shared rulebook for use with completed faction guides;
- `docs/Gauntlet_v0.6_Working_Rules.md` — active v0.6 development rules framework and superset;
- `docs/Gauntlet_v0.6_Neutral_Card_Pool.md` — authoritative working Neutral exact text;
- `docs/Gauntlet_v0.6_Territory_Pool.md` — authoritative working Territory and Arena exact text;
<<<<<<< ours
- `releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md` — definitive Military rules, leaders, components, strategy, and exact card pool;
- `releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md` — definitive Diplomat rules, leaders, Influence, Terms, Proposals / Treaty Articles, components, strategy, and exact card pool;
- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` — definitive Inquisition rules, leaders, components, strategy, and exact card pool;
- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md` — definitive Financier rules, leaders, Capital, Treasury, Deeds, components, strategy, and exact card pool;
- `releases/v0.6/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md` — definitive Intelligence rules, leaders, Missions, references, tracker, strategy, and exact card pool;
=======
- `releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md` — definitive Military source;
- `releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md` — definitive Diplomat source;
- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` — definitive Inquisition source;
- `releases/v0.6/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md` — definitive Mystics source;
- `docs/Gauntlet_v0.6_Financier_Card_Pool.md` — authoritative working Financier card pool pending definitive-guide consolidation;
>>>>>>> theirs
- `docs/card-reviews/STATUS.md` — consolidated playable-card checkpoint and exact-text blockers;
- `docs/Gauntlet_v0.6_Card_Review_Log.md` — decisions for all 54 reviewed playable source cards;
- `docs/Gauntlet_v0.6_Card_Metadata.md` — card allegiance, complexity, trait, uniqueness, starter, and watchlist metadata;
- `docs/card-reviews/CONDITION_AUDIT.md` — former Condition conversions and retirement rationale;
- `docs/territory-reviews/STATUS.md` — Territory-review checkpoint;
- `docs/territory-reviews/GENERAL_RULES.md` — Territory activation and suppression rules;
- `docs/Gauntlet_v0.6_Open_Questions.md` — unresolved current decisions;
- `docs/Gauntlet_Design_Principles_and_Guardrails.md` — design constraints;
- `docs/Gauntlet_Playtest_Targets_and_Metrics.md` — pacing and telemetry standards.

`docs/Archive/` contains completed audits and superseded historical records. Archived files provide provenance but do not override active documents, definitive faction guides, or canonical release data.

### `faction-sheets/`

<<<<<<< ours
Browser-printable working sheets for v0.6 faction cards and supplemental components. Military, Inquisition, and Intelligence have complete two-sheet packages; Diplomats have a four-sheet package with duplex Proposal / Treaty Article faces. See `faction-sheets/README.md` for rendered links and instructions.

The Military, Diplomat, Inquisition, and Intelligence sheets are derived production files governed by their definitive faction guides. The Financier definitive guide is complete; its dedicated browser-printable sheet remains a separate production task.
=======
Browser-printable working sheets for implemented v0.6 faction cards and supplemental components. Military and Inquisition have complete two-sheet packages; Diplomats have a four-sheet package with duplex Proposal / Treaty Article faces. See `faction-sheets/README.md` for rendered links and instructions.

The Military, Diplomat, and Inquisition sheets are derived production files governed by their definitive faction guides. Mystics sheet production remains to be implemented from the definitive Mystics guide and component specification.
>>>>>>> theirs

### `images/`

Current v0.6 leader portrait assets are stored at the top level, with matching production sketches under `images/sketches/`.

### `deckbuilder/`

Static browser deckbuilder for the v0.5 pre-faction ruleset. It supports card filtering, duplicate cards, Territory selection, validation, local saves, JSON import/export, text export, random deck generation, and browser print-to-PDF.

### `deckbuilder-v0.6/`

Development browser deckbuilder for the faction era. It reads the active Neutral, implemented completed-faction, and Territory Markdown sources at runtime; supports faction and leader selection, playable-card and Territory construction, legality checks, local saves, JSON/text export, and random valid test-deck generation; and produces complete browser-printable implemented faction packages. It remains development tooling rather than canonical v0.6 release data.

### `data/`

Early machine-readable starter data and schema work for digital development. It is not the authoritative source for v0.5.7 or v0.6.

### `src/`

Framework-neutral TypeScript rules-engine scaffolding, including state, legal actions, hidden-information views, battle and turn flow, Asset-bank enforcement, occupation/capture logic, CLI development tools, and a local browser GUI.

The digital prototype's Condition zone has been removed, but the prototype is not yet a complete implementation of the full v0.5.7 card pool or developing v0.6 factions.

### `.github/workflows/`

Automation and repository workflows.

## Development workflow

1. Treat released canonical data as authoritative for its matching version.
2. Treat definitive faction guides, the preliminary core rulebook, and active v0.6 documents as the working source set until canonical v0.6 data exists; the Working Rules govern later development decisions not yet rolled into the preliminary rulebook.
3. Record approved decisions in the relevant active source.
4. Roll standalone decisions into consolidated guides, the Review Log, and Metadata registry at material checkpoints.
5. Reserve README and Project Index updates for material milestones, source-hierarchy changes, and batch checkpoints.
6. Keep rules, testing rationale, lore, production art direction, and digital implementation status in their designated documents.
7. Archive or remove completed audits and superseded working records once their information is consolidated.
8. Do not create canonical v0.6 data by silently resolving open design questions.

## Running digital tools locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/deckbuilder/
http://localhost:8000/deckbuilder-v0.6/
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
