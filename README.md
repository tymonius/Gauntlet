# Gauntlet

Gauntlet is a two-player tactical card-and-territory game about deck construction, hidden battle commitments, territorial control, faction asymmetry, and running the Gauntlet.

**Project site:** [gauntlet.run](https://gauntlet.run/) — the custom URL for Gauntlet repository materials, releases, and browser tools.

## Canonical release

**Current canonical version:** v0.6.3 — Third Playtest Revision

The certified reconstructed package is the canonical [`releases/v0.6.3/`](releases/v0.6.3/) release. It contains:

- the official Rulebook in Markdown, reader PDF, and imposed booklet PDF;
- six faction guides;
- the complete card-and-Territory reference;
- canonical structured data and starter-Deck data;
- the starter-Deck catalog and Deck export schema; and
- the release manifest identifying the certified authority set.

Historical release evidence is preserved separately. `releases/v0.6.2-withdrawn/` and `releases/v0.6.3-withdrawn/` are the original packages that were disqualified during release reconstruction; they are preserved for provenance and **must not be used as current rules or tool inputs**. Valid earlier releases such as v0.6.0 and v0.6.1 remain historical rather than withdrawn.

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

- [Gauntlet v0.6.3 Browser Rulebook](https://gauntlet.run/rulebook/) — searchable, responsive rendering of the complete canonical Rulebook with direct section links and integrated Rules Arbiter access.
- [Gauntlet v0.6.3 Rulebook (PDF)](releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.pdf) — the complete official rules for the current release.
- [Gauntlet v0.6.3 Imposed Booklet (PDF)](releases/v0.6.3/Gauntlet_v0.6.3_Rulebook_Booklet.pdf) — color, grayscale-compatible, and ordered for Letter duplex printing with short-edge flip.
- [Gauntlet v0.6.3 Rules Arbiter](https://gauntlet.run/rules-arbiter/) — ask about rules, cards, Leaders, faction systems, Territories, timing, and victory conditions using canonical v0.6.3 sources.
- [Gauntlet v0.6.3 Deckbuilder](https://gauntlet.run/deckbuilder/) — load a recommended Leader Deck or build, validate, save, export, randomize, and print a complete package containing its Leader, Territories, playable cards, and required faction components.
- [Playtest browser tools](https://gauntlet.run/playtest/) — current v0.6.3 tracked/formal playtest workflows and feedback tools.
- [Gauntlet v0.7.0 on Tabletop Simulator](https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635) — public Steam Workshop mod for online play.

Scan to open the v0.6 Deckbuilder:

<img src="images/qr/gauntlet-v0.6-deckbuilder.svg" alt="QR code for the Gauntlet v0.6.3 Deckbuilder" width="180">

## Canonical source hierarchy

1. [`releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json`](releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json) identifies the current release and certified authority set.
2. [`releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md`](releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md) governs shared rules.
3. The six faction guides under [`releases/v0.6.3/faction-guides/`](releases/v0.6.3/faction-guides/) govern faction-specific rules, Leaders, and supplemental systems.
4. [`releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json`](releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json) is the certified machine-readable release data.
5. [`releases/v0.6.3/Gauntlet_v0.6.3_Card_and_Territory_Reference.md`](releases/v0.6.3/Gauntlet_v0.6.3_Card_and_Territory_Reference.md) is the generated human-readable card and Territory reference.
6. [`releases/v0.6.3/Gauntlet_v0.6.3_Starter_Decks.json`](releases/v0.6.3/Gauntlet_v0.6.3_Starter_Decks.json) and the [Starter Deck Catalog](releases/v0.6.3/Gauntlet_v0.6.3_Starter_Deck_Catalog.md) define the certified recommended starter Decks.

Generated PDFs, browser surfaces, printable tools, and Deckbuilder output are derived production artifacts. If a derived file conflicts with its governing source, correct the source and regenerate the supported artifact.

## Repository map

### `releases/`

Versioned canonical and historical release packages. The current package is [`releases/v0.6.3/`](releases/v0.6.3/). Withdrawn original packages are explicitly named `v0.6.2-withdrawn` and `v0.6.3-withdrawn` so they cannot be mistaken for current authority.

### `docs/`

The [documentation index](docs/README.md) separates canonical sources, active design and testing documents, and archived provenance. Current post-release priorities are in [Gauntlet Development Status](docs/Gauntlet_Development_Status.md).

### `faction-sheets/`

Legacy browser-printable faction sheets retained for compatibility with existing bookmarks and release-era references. They are no longer actively maintained, linked from the public site, or treated as a supported production surface. Use the Deckbuilder for current complete-package printing.

### `images/`

Leader portraits and production artwork. Canonical Rulebook Leader sketches are under `images/sketches/`. QR codes for public tools are under `images/qr/`.

### `deckbuilder/`

Faction-era browser Deckbuilder and the supported printing surface for complete Deck packages, including Leaders, Territories, playable cards, and required faction supplemental components.

### `deckbuilder-v0.5/`

Historical v0.5 Deckbuilder.

### `rulebook/`

Responsive browser Rulebook. It renders the canonical v0.6.3 Markdown source directly, with search, anchored navigation, print support, and Rules Arbiter access.

### `rules-assistant/`

Static Rules Arbiter widget, canonical-source retrieval, regression tests, and deployable serverless endpoint. The current unversioned Arbiter and browser fallback use v0.6.3 sources; explicit older version routes remain for historical compatibility.

### `playtest/` and `workers/playtest-sessions/`

Current v0.6.3 playtest browser surfaces and session service. New game sessions use `G063-…` serials and event containers use `EV063-…`; historical stored records retain their persisted version and serial.

### `scripts/`

Canonical-data generation, document rendering, package validation, and release-production scripts.

### `.github/workflows/`

Automated validation, rendering, and release-publication workflows.

### `src/` and `data/`

Legacy pre-v0.6 digital-prototype code and starter data. They are retained for architecture and testing provenance but do not implement the canonical faction-era game. Future work is governed by the [Digital Roadmap](docs/Gauntlet_Digital_Roadmap.md).

## Development workflow

1. Change the appropriate canonical source.
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

## New-player onboarding

- [Start Playing](https://gauntlet.run/start/) — current guided faction/Leader selection and starter-Deck handoff.
- [Faction guides](releases/v0.6.3/faction-guides/) — current faction-specific rules and Leader references.
- [Playtest tools](playtest/) — current tracked/formal session and feedback workflows.
- [Tabletop Simulator](https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635) — public v0.7.0 Workshop mod for online play.
- [Player Mat and Zone Reference](playtest/player-mat/)

## Copyright and use

Copyright © 2026 Tymon Scott. All rights reserved.

Gauntlet is an unpublished playtest project. Repository materials are provided for private review and playtesting only. They may not be copied, redistributed, sold, republished, or used to create commercial derivative works without written permission.

Submitted comments, corrections, suggestions, and playtest feedback may be used or adapted in future versions without compensation or attribution unless agreed otherwise in writing.
