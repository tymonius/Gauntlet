# Gauntlet

Gauntlet is a two-player tactical card-and-territory game about deck construction, hidden battle commitments, territorial control, faction asymmetry, and running the Gauntlet.

**Project site:** [gauntlet.run](https://gauntlet.run/) — the custom URL for Gauntlet repository materials, releases, and browser tools.

## Canonical release

**Current canonical version:** v0.6.1 — First Playtest Revision

The complete package is under [`releases/v0.6.1/`](releases/v0.6.1/):

- official rulebook in Markdown, a color reader PDF, and a grayscale-compatible imposed color booklet PDF;
- quick-reference guide;
- canonical structured data and manifest;
- release notes and changelog;
- archived release printables; and
- complete canonical source and reference materials.

Earlier releases remain available for historical reference but are obsolete for current playtesting.

## Game overview

Each player builds a Deck consisting of:

- one faction;
- one Leader;
- one Playable Deck of at least 30 cards and no more than 60 total card value;
- three different Territories; and
- any required faction- or Leader-specific supplemental components.

The players secretly arrange their Territories, reveal all six, and join them into the Gauntlet. They then advance, fight battles, become occupiers of enemy-controlled Territories, survive Counterattacks, capture ground, and attempt to run the Gauntlet.

A Player Token always has a Position. Occupation begins only when that token is on an opposing Territory the player does not control.

To run the Gauntlet, a player must defeat the opponent on their final Territory, become its occupier and capture it, advance beyond the Territory column, force the opponent to make a Last Stand, and win the resulting battle.

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

- [Gauntlet v0.6.1 Browser Rulebook](https://gauntlet.run/rulebook/) — searchable, responsive rendering of the complete canonical rulebook with direct section links and integrated Rules Arbiter access.
- [Gauntlet v0.6.1 Rulebook (PDF)](releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf) — the complete official rules for the current release.
- [Gauntlet v0.6.1 Imposed Booklet (PDF)](releases/v0.6.1/Gauntlet_v0.6.1_Rulebook_Booklet.pdf) — color, grayscale-compatible, and ordered for Letter duplex printing with short-edge flip.
- [Gauntlet v0.6.1 Rules Arbiter](https://gauntlet.run/#rules-assistant) — ask about rules, cards, Leaders, faction systems, Territories, timing, and victory conditions using canonical v0.6.1 sources.
- [Gauntlet v0.6.1 Deckbuilder](https://gauntlet.run/deckbuilder/) — load a recommended Leader Deck or build, validate, save, export, randomize, and print a complete package containing its Leader, Territories, playable cards, and required faction components.
- [Gauntlet v0.6.1 Printable Playtest Sheet (PDF)](playtest/Gauntlet_v0.6.1_Playtest_Sheet.pdf) — one-page paper questionnaire designed to be printed and completed by hand.
- [Playtest Sheet browser page](https://gauntlet.run/playtest/) — preview the sheet and print or save it directly from a browser.

Scan to open the v0.6 Deckbuilder:

<img src="images/qr/gauntlet-v0.6-deckbuilder.svg" alt="QR code for the Gauntlet v0.6.1 Deckbuilder" width="180">

## Canonical source hierarchy

1. [`releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md`](releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md) governs shared rules.
2. The six definitive faction guides under [`releases/v0.6.1/faction-guides/`](releases/v0.6.1/faction-guides/) govern faction-specific rules and exact faction-card text.
3. [`docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md`](docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md) governs exact Neutral-card text.
4. [`docs/Gauntlet_v0.6.1_Territory_Pool.md`](docs/Gauntlet_v0.6.1_Territory_Pool.md) governs exact Territory and Arena text.
5. `Gauntlet_v0.6.1_Canonical_Data.json` is generated from those sources and must not be edited independently.

Generated PDFs, printable sheets, and Deckbuilder output are derived production artifacts. The retired DOCX files remain only as historical release artifacts and are not maintained. If a derived file conflicts with its governing source, correct the source and regenerate the supported artifact.

## Repository map

### `releases/`

Versioned canonical and historical release packages. The current package is [`releases/v0.6.1/`](releases/v0.6.1/).

### `docs/`

The [documentation index](docs/README.md) separates canonical sources, active design and testing documents, and archived provenance. Current post-release priorities are in [Gauntlet Development Status](docs/Gauntlet_Development_Status.md).

### `faction-sheets/`

Legacy browser-printable faction sheets retained for compatibility with existing bookmarks and release-era references. They are no longer actively maintained, linked from the public site, or treated as a supported production surface. Use the Deckbuilder for current complete-package printing.

### `images/`

Leader portraits and production artwork. Canonical rulebook Leader sketches are under `images/sketches/`. QR codes for public tools are under `images/qr/`.

### `deckbuilder/`

Faction-era browser Deckbuilder and the supported printing surface for complete Deck packages, including Leaders, Territories, playable cards, and required faction supplemental components.

### `deckbuilder-v0.5/`

Historical v0.5 Deckbuilder.

### `rulebook/`

Responsive browser rulebook. It renders the canonical v0.6.1 Markdown source directly, with search, anchored navigation, print support, and Rules Arbiter access.

### `rules-assistant/`

Static Rules Arbiter widget, canonical-source retrieval, regression tests, and a deployable serverless OpenAI endpoint. The browser automatically falls back to direct source lookup when the AI endpoint is unavailable.

### `scripts/`

Canonical-data generation, document rendering, package validation, and release-production scripts.

### `.github/workflows/`

Automated validation, rendering, and release-publication workflows.

### `src/` and `data/`

Legacy pre-v0.6 digital-prototype code and starter data. They are retained for architecture and testing provenance but do not implement the canonical faction-era game. Future work is governed by the [Digital Roadmap](docs/Gauntlet_Digital_Roadmap.md).

## Development workflow

1. Change the appropriate canonical Markdown source.
2. Regenerate and validate canonical data.
3. Regenerate the affected documents, cards, or supported tools.
4. Visually inspect rendered documents and Deckbuilder print output.
5. Record release-facing changes in the changelog.
6. Record open testing concerns in `docs/Gauntlet_Development_Status.md`; do not silently settle them in generated data or production artifacts.

## Running browser tools locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
http://localhost:8000/rulebook/
http://localhost:8000/deckbuilder/
http://localhost:8000/playtest/
```

The Rules Arbiter source-lookup mode works through the local server without an API key. Deploying the optional AI endpoint is documented in [`rules-assistant/README.md`](rules-assistant/README.md).

For the legacy TypeScript prototype:

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


## New-player onboarding

- [First-Game Guide](releases/v0.6.1/Gauntlet_v0.6.1_First_Game_Guide.md)
- [Faction Introductions](releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md)
- [Printable Playtest Sheet](playtest/)
- [Player Mat and Zone Reference](playtest/player-mat/)
