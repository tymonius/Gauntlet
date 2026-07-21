# Gauntlet

Gauntlet is a two-player tactical card-and-territory game about deck construction, hidden battle commitments, territorial control, faction asymmetry, and running the Gauntlet.

**Project site:** [gauntlet.run](https://gauntlet.run/) — the custom URL for the Gauntlet repository materials, releases, and hosted browser tools.

## Canonical release

**Current canonical version:** v0.6.0 — Faction Framework Release

The complete package is under [`releases/v0.6/`](releases/v0.6/):

- official rulebook in Markdown, DOCX, and PDF;
- quick-reference guide;
- canonical structured data and manifest;
- release notes and changelog;
- print-and-play Neutral cards and Territories;
- six faction/component packages; and
- one combined all-cards print-and-play PDF.

Earlier releases remain available for historical reference but are obsolete for current playtesting.

## Game overview

Each player builds a Deck consisting of:

- one faction;
- one Leader;
- one Playable Deck of at least 30 cards and no more than 60 total deckbuilding value;
- three different Territories; and
- any required faction- or Leader-specific supplemental components.

The players secretly arrange their Territories, reveal all six, and join them into the Gauntlet. They then advance, fight battles, occupy enemy-controlled Territories, survive counterattacks, capture ground, and attempt to run the Gauntlet.

To run the Gauntlet, a player must defeat the opponent on their final Territory, occupy and capture it, advance beyond the Territory column, and win the opponent's Last Stand.

## Factions

| Faction | Leaders | Core system | Additional victory |
|---|---|---|---|
| Military | General, Commandant | Command and Orders | None |
| Diplomats | Ambassador, Senator | Influence, Terms, Proposals | Peace Treaty |
| Financiers | Banker, Executive | Capital, Treasury, Deeds | Controlling Interest |
| Intelligence | Ranger, Spymaster | Intel, Missions, Operation Progress | Special Operation |
| Mystics | Alchemist, Spirit Walker | Rites, Invocation, Transmutation | Ritual |
| Inquisition | Grand Inquisitor, Witch Hunter | Conviction, Condemnation, Purge | Purification |

## Playtest tools

- [Gauntlet v0.6 Deckbuilder](https://gauntlet.run/deckbuilder-v0.6/) — build, validate, save, export, randomize, and print faction-era Decks.
- [Gauntlet v0.6 Faction Sheets](https://gauntlet.run/faction-sheets/) — browser-printable faction cards and supplemental components.
- [Gauntlet v0.5 Deckbuilder](https://gauntlet.run/deckbuilder/) — historical pre-faction deckbuilder.

Scan to open the v0.6 Deckbuilder:

<img src="images/qr/gauntlet-v0.6-deckbuilder.svg" alt="QR code for the Gauntlet v0.6 Deckbuilder" width="180">

## Canonical source hierarchy

1. [`releases/v0.6/Gauntlet_v0.6.0_Rulebook.md`](releases/v0.6/Gauntlet_v0.6.0_Rulebook.md) governs shared rules.
2. The six definitive faction guides under [`releases/v0.6/faction-guides/`](releases/v0.6/faction-guides/) govern faction-specific rules and exact faction-card text.
3. [`docs/Gauntlet_v0.6_Neutral_Card_Pool.md`](docs/Gauntlet_v0.6_Neutral_Card_Pool.md) governs exact Neutral-card text.
4. [`docs/Gauntlet_v0.6_Territory_Pool.md`](docs/Gauntlet_v0.6_Territory_Pool.md) governs exact Territory and Arena text.
5. `Gauntlet_v0.6.0_Canonical_Data.json` is generated from those sources and must not be edited independently.

Generated PDFs, DOCX files, printable sheets, and deckbuilder output are derived production artifacts. If a derived file conflicts with its governing source, correct the source and regenerate the artifact.

## Repository map

### `releases/`

Versioned canonical and historical release packages. The current package is [`releases/v0.6/`](releases/v0.6/).

### `docs/`

Active design, testing, source-card, Territory, project-index, and production documentation. Archived or superseded records are under `docs/Archive/`.

### `faction-sheets/`

Browser-printable faction cards, Leader Cards, trackers, references, Deeds, Proposals, Treaty Articles, and Rites.

### `images/`

Leader portraits and production artwork. Canonical rulebook Leader sketches are under `images/sketches/`. QR codes for public tools are under `images/qr/`.

### `deckbuilder-v0.6/`

Faction-era browser deckbuilder. It reads the active canonical card and Territory sources and produces complete Deck packages.

### `deckbuilder/`

Historical v0.5 deckbuilder.

### `scripts/`

Canonical-data generation, document rendering, card-sheet rendering, package validation, and release-production scripts.

### `.github/workflows/`

Automated validation, rendering, and release-publication workflows.

### `src/`

Framework-neutral TypeScript rules-engine and digital-prototype scaffolding. It is development software, not the authoritative rules source.

## Development workflow

1. Change the appropriate canonical Markdown source.
2. Regenerate and validate canonical data.
3. Regenerate the affected documents, cards, or tools.
4. Visually inspect rendered documents and print sheets.
5. Record release-facing changes in the changelog.
6. Do not silently resolve open design questions in generated data or production artifacts.

## Running browser tools locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
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

Submitted comments, corrections, suggestions, and playtest feedback may be used or adapted in future versions without compensation or attribution unless agreed otherwise in writing.
