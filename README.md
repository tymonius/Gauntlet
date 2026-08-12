# Gauntlet

**Current canonical version:** v0.6.3 — Third Playtest Revision  
**Published:** August 12, 2026  
**Status:** Active playtest development

Gauntlet is a two-player strategic card game about rival factions fighting over a six-position territorial line while pursuing both battlefield and faction-specific paths to victory.

## Current release

The immutable source package for the current release is [`releases/v0.6.3/`](releases/v0.6.3/). Its manifest, canonical data, Rulebook source, starter Decks, and print materials are the governing v0.6.3 artifacts.

The repository-wide machine-readable current-release pointer is [`config/current-release.json`](config/current-release.json). Current-facing repository and web surfaces are required to agree with it.

### Current player tools

- [Start / first-game onboarding](https://gauntlet.run/v0.6.3/start/)
- [Browser Rulebook](https://gauntlet.run/v0.6.3/rulebook/)
- [Deckbuilder](https://gauntlet.run/v0.6.3/deckbuilder/)
- [Card Reference](https://gauntlet.run/v0.6.3/reference/)
- [Print materials](https://gauntlet.run/v0.6.3/print/)
- [Formal playtest tools](https://gauntlet.run/playtest/)
- [Rules Arbiter](https://gauntlet.run/) — the public widget uses the published v0.6.3 rules corpus

The versioned Start, Rulebook, Deckbuilder, and Card Reference routes hand off to the polished root production applications while retaining v0.6.3 data/rules authority.

## v0.6.3 gameplay baseline

Each player chooses a faction and one of its two Leaders, builds a 30-card / 60-value Deck, and selects three Territories.

At setup, each player draws four cards, discards one face up, and keeps three as the opening Hand. **After seeing that opening Hand and discard,** the player secretly arranges their three Territories.

The central conflict is a contiguous six-position territorial line. Movement uses **Advance, Hold, and Fall Back**. Battle ties use **Defensive Edge** and, when required, a **Tiebreak Roll**.

A player can win the normal war in either of two independent ways:

- **Capture the opponent's final Territory**; or
- force the opponent beyond their own end and **win the opponent's Last Stand**.

You do **not** need to capture the final Territory before winning a Last Stand.

Each faction also has its own additional victory route and strategic economy.

## Canonical source hierarchy

For the current version, use these sources in this order:

1. [`releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json`](releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json)
2. [`releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json`](releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json)
3. [`releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md`](releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md)
4. [`releases/v0.6.3/Gauntlet_v0.6.3_Starter_Decks.json`](releases/v0.6.3/Gauntlet_v0.6.3_Starter_Decks.json)
5. published print artifacts and browser surfaces generated from or validated against those sources

Older immutable packages under `releases/v0.6.2/`, `releases/v0.6.1/`, and earlier versioned material are historical sources for those releases only.

## Repository map

- `config/current-release.json` — single current-release declaration
- `releases/v0.6.3/` — immutable current published package
- `v0.6.3/` — versioned current public routes and release surfaces
- `start/` — polished current onboarding application
- `rulebook/` — polished current browser Rulebook
- `deckbuilder/` — polished current Deckbuilder
- `card-reference/` — polished current Card Reference
- `factions/` — six public faction pages
- `rules-assistant/` — Rules Arbiter widget, current/historical Workers, tests, migrations, and corpus tooling
- `playtest/` — current formal/standalone playtest interfaces
- `workers/playtest-sessions/` — playtest session service and historical-compatibility stack
- `src/content/current.ts` — digital rules current-version pointer
- `docs/` — active development documents and historical implementation records
- `scripts/validate-current-release-integrity.mjs` — repository-wide current-release coherence gate

## Development checks

Install dependencies and run the full suite:

```bash
npm install
npm test
```

Run the release-integrity gate directly:

```bash
npm run test:release-integrity
```

The release-specific v0.6.3 validation remains available through the v0.6.3 release scripts. The generic Current Release Integrity check is intentionally separate: version-specific validation proves the release package is valid; the generic gate proves that the repository and public/current systems all agree about which release is current.

For local browser review:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`, `/start/`, `/rulebook/`, `/deckbuilder/`, `/card-reference/`, `/playtest/`, or the versioned v0.6.3 routes.

## Release engineering

The governing release-integrity process is documented in [`docs/Gauntlet_Release_Integrity_Standard.md`](docs/Gauntlet_Release_Integrity_Standard.md). A release is not considered fully promoted until both its version-specific validation and the repository-wide current-release integrity gate pass, followed by live post-merge verification.

Copyright © 2026 Tymon Scott. All rights reserved.
