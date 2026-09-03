# Gauntlet

Gauntlet is a two-player tactical card-and-territory game about deck construction, hidden battle commitments, territorial control, faction asymmetry, and running the Gauntlet.

**Project site:** [gauntlet.run](https://gauntlet.run/) — the public home for current rules, factions, cards, Deckbuilder, and playtest tools.

## Canonical release

**Current canonical release:** defined by `config/release-lifecycle.json` and the matching frozen package under `releases/`.

The frozen canonical package is [releases/v0.7.1/](releases/v0.7.1/). Its manifest identifies the certified authority set and hashes the published payload. The package contains:

- the complete v0.7.1 Rulebook source;
- the imposed half-letter Rulebook booklet PDF;
- canonical structured gameplay data;
- the twelve locked starter Decks;
- source-provenance data; and
- the production Card Anatomy and Arcane-trait figures.

Published release snapshots are immutable. Live browser tools and production renderers consume the complete current authorities in game-data/current-game.json and rulebook/player-facing/current-rulebook.md; release publication freezes copies of those authorities under releases/.

Earlier valid releases remain historical. Withdrawn reconstructed packages are explicitly named as withdrawn and must not be used as current rules or tool inputs.

## Game overview

Each player builds a Deck consisting of:

- one faction;
- one Leader;
- one Playable Deck of at least 30 cards and no more than 60 total Deckbuilding Value;
- three different Territories, with no more than one Arena; and
- any required faction- or Leader-specific supplemental components.

Players secretly arrange their Territories, reveal all six, and join them into the Gauntlet. They Advance, fight battles, occupy enemy-controlled Territories, survive Counterattacks, advance their Front Line, and attempt to run the Gauntlet.

A battle proceeds through:

1. **Onset**
2. **Set Gambits**
3. **Form Reserves**
4. **Reveal Gambits**
5. **Choose Tactics**
6. **Reveal Tactics**
7. **Outcome**
8. **Aftermath**

A player wins by capturing the Territory at the opponent's end or by forcing and winning the opponent's Last Stand. Five factions also have an additional faction victory route.

## Factions

| Faction | Leaders | Core system | Additional victory |
|---|---|---|---|
| **Military** | General, Commandant | Command and Orders | None |
| **Diplomats** | Ambassador, Senator | Influence, Terms, Proposals | Peace Treaty |
| **Financiers** | Banker, Executive | Capital, Treasury, Deeds | Controlling Interest |
| **Intelligence** | Ranger, Spymaster | Intel, Missions, Operation Progress | Special Operation |
| **Mystics** | Alchemist, Spirit Walker | Rites, Invocation, Transmutation | Ritual |
| **Inquisition** | Grand Inquisitor, Witch Hunter | Conviction, Condemnation, Purge | Purification |

The v0.7.1 playable pool contains **142 cards**: **52 Neutral cards and 15 cards in each faction**, plus **25 Territories/Arenas**, **12 Leaders**, and **12 locked starter Decks**.

## Playtest tools

- [Start Playing](https://gauntlet.run/start/) — faction and Leader discovery plus starter-Deck handoff.
- [Browser Rulebook](https://gauntlet.run/rulebook/) — searchable current Rulebook.
- [Rulebook booklet](releases/v0.7.1/Gauntlet_v0.7.1_Rulebook_Booklet.pdf) — imposed Letter duplex booklet, printed short-edge.
- [Card Reference](https://gauntlet.run/card-reference/) — current card and Territory reference.
- [Faction pages](https://gauntlet.run/factions/) — current faction systems and Leader references.
- [Deckbuilder](https://gauntlet.run/deckbuilder/) — build, validate, save, export, randomize, and print complete v0.7.1 Deck packages.
- [Rules Arbiter](https://gauntlet.run/rules-arbiter/) — current rules lookup and adjudication surface.
- [Playtest tools](https://gauntlet.run/playtest/) — tracked/formal playtest workflows and feedback tools.
- [Tabletop Simulator](https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635) — public v0.7.1 Workshop mod with all twelve starter kits, the six-Rite Mystics package, and Deck Code import.

## Canonical source hierarchy

For current development and public browser tooling:

1. game-data/current-game.json is the complete current gameplay authority.
2. rulebook/player-facing/current-rulebook.md is the complete current Rulebook authority.
3. config/publishing-authority.json is the current publishing-imprint authority for maintained development and player-facing surfaces; published release snapshots retain their recorded publishing identity.
4. releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json identifies the frozen v0.7.1 published authority set.
5. releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json is the frozen machine-readable release snapshot.
6. releases/v0.7.1/Gauntlet_v0.7.1_Starter_Decks.json defines the frozen public starter Deck set.

Generated PDFs, browser pages, printable tools, and TTS assets are derived production surfaces. If a derived surface conflicts with its governing current source, correct the governing source and regenerate the supported artifact. Do not silently rewrite a frozen published release package.

## Repository map

The repository's current/historical/generated path classifications and cleanup target are defined in [Repository Architecture](docs/Repository_Architecture.md). Stable public paths remain at the repository root until source/deployment separation can preserve their URLs explicitly.

### game-data/

Complete current gameplay authority and runtime adapter. Current browser tools, TTS generation, card/component renderers, Deckbuilder, Card Reference, and release publication derive from this source.

### rulebook/

Complete current Rulebook authority plus the responsive Browser Rulebook and print-generation support.

### releases/

Frozen versioned release packages and historical release evidence. Published packages include [releases/v0.7.1/](releases/v0.7.1/).

### card-design/

Production card compositor, renderers, artwork authoring tools, reference-card production, and shared print surfaces.

### deckbuilder/

Current faction-era Deckbuilder and complete-package print/export surface.

### deckbuilder-v0.5/ and deckbuilder-v0.6/

Historical Deckbuilder surfaces retained for versioned compatibility.

### card-reference/, factions/, and start/

Current public discovery/reference surfaces generated from current authority.

### rules-assistant/

Rules Arbiter widget, canonical-source retrieval, regression tests, and deployable endpoint.

### playtest/ and workers/playtest-sessions/

Formal playtest browser surfaces and session service.

### tts/

Tabletop Simulator build, hosted assets, Workshop packaging, QA records, and generation tooling.

### scripts/ and .github/workflows/

Canonical-data validation, document/card rendering, TTS generation, release publication, and cross-surface validation.

### src/ and legacy/

`src/` is the active rules-aware digital-engine codebase, with some older/transitional modules retained as migration evidence while current-release parity work proceeds. `legacy/` contains historical implementation material that is not current authority; the original prototype data now lives under `legacy/digital-prototype-data/`.

## Development workflow

1. Change the appropriate complete current authority.
2. Regenerate and validate affected canonical/derived data.
3. Regenerate affected documents, cards, components, browser tools, or TTS assets.
4. Run automated tests and visual/physical QA where relevant.
5. Record player-facing changes in the changelog.
6. Preserve published release packages as immutable historical evidence.
7. Record unresolved testing concerns in [Gauntlet Development Status](docs/Gauntlet_Development_Status.md).

## Running browser tools locally

From the repository root:

~~~bash
python3 -m http.server 8000
~~~

Then open:

~~~text
http://localhost:8000/
http://localhost:8000/rulebook/
http://localhost:8000/deckbuilder/
http://localhost:8000/card-reference/
http://localhost:8000/playtest/
~~~

For the rules-aware digital-engine codebase:

~~~bash
npm install
npm run typecheck
npm test
~~~

The promoted engine API lives at `src/content/current.ts`. Its published digital-rules target is the current release declared by the release lifecycle and current manifest; the promoted implementation may lag that target during migration, so consult `src/README.md` for the implementation baseline rather than assuming current-release parity.

The promoted v0.7.0 engine has a reducer-level developer CLI using the certified v0.7.0 starter package:

~~~bash
npm run dev:v070:cli
~~~

It exposes setup, turn, and battle reducer actions directly and preserves explicit unsupported-effect halts. The older CLI/GUI runners remain legacy pre-current-engine scaffolding:

~~~bash
npm run dev:legacy:cli
npm run dev:legacy:gui
~~~

## Current development priorities

See [Gauntlet Development Status](docs/Gauntlet_Development_Status.md). The immediate release-followup emphasis is broad human playtesting, matchup/faction balance, winner/loser experience, self-serve onboarding, post-release Tabletop Simulator smoke testing/maintenance, and active synchronization of the rules-aware digital engine with the published tabletop authority.

## Copyright and use

<!-- PUBLISHING-FACT:publisher.line -->Published by TDS Games<!-- /PUBLISHING-FACT -->

<!-- PUBLISHING-FACT:publisher.parent_line -->An imprint of Misty Hollow Enterprises<!-- /PUBLISHING-FACT -->

<!-- PUBLISHING-FACT:copyright.notice -->Copyright © 2026 Tymon Scott. All rights reserved.<!-- /PUBLISHING-FACT -->

Repository materials are provided for private review and playtesting only. They may not be copied, redistributed, sold, republished, or used to create commercial derivative works without written permission.

Submitted comments, corrections, suggestions, and playtest feedback may be used or adapted in future versions without compensation or attribution unless agreed otherwise in writing.
