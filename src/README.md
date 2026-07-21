# Legacy Gauntlet Digital Prototype

This directory contains the pre-v0.6 TypeScript rules-engine experiment and its development interfaces.

The code is preserved because it contains useful architecture, state-transition tests, hidden-information work, and interface prototypes. It does **not** implement the canonical v0.6.0 faction-era game and is not an authoritative rules source.

Current references:

- `releases/v0.6/Gauntlet_v0.6.0_Rulebook.md`
- `releases/v0.6/Gauntlet_v0.6.0_Canonical_Data.json`
- `docs/Gauntlet_Digital_Roadmap.md`
- `docs/Gauntlet_Playtest_Targets_and_Metrics.md`

## Preserved areas

- `state/` — setup, actions, reducers, views, movement, battles, capture, and win-evaluation experiments.
- `effects/` — early card-effect handlers.
- `cards/` — prototype card integration.
- `cli/` — guided command-line runner and logs.
- `gui/` — local browser development server.

## Development commands

From the repository root:

```bash
npm install
npm run typecheck
npm test
npm run dev:cli
npm run dev:gui
```

These commands exercise the legacy prototype. Passing tests confirms internal consistency of that prototype, not compliance with v0.6.0.

## Reuse policy

New canonical engine work should extract reusable architecture deliberately rather than continuing the mixed-version model. Any retained module must be tested against v0.6.0 terminology, zones, timing, Battle Hands, Defender's Advantage, running the Gauntlet, faction systems, and supplemental components.
