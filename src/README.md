# Gauntlet Digital Prototype Source

This directory contains the framework-neutral TypeScript rules engine and development interfaces for digital Gauntlet playtesting.

The engine is intentionally separated from presentation code. Game-state rules should be testable without a browser, and the CLI and GUI should submit actions to the same state transition layer rather than implementing legality independently.

For the broader roadmap, current limitations, and source-of-truth policy, see:

- `docs/Gauntlet_Digital_Prototype_Roadmap.md`
- `docs/Gauntlet_Playtest_Targets_and_Metrics.md`
- `docs/v0.5.7_rules_clarifications.md`

## Current areas

- `types/` — authoritative game state, identifiers, actions, and public/private player views.
- `state/` — setup validation, initialization, legal-action generation, reducers, turn and battle flow, movement, occupation, capture, Asset-bank enforcement, and win evaluation.
- `effects/` — card and rules-effect handlers.
- `cards/` — card definitions or card-facing engine integration.
- `cli/` — guided command-line development runner and session logging.
- `gui/` — local browser development server and clickable guided interface.

## Implemented development milestones

The prototype has progressed beyond initial state scaffolding. Current conversation and repository history include implementation for:

- authoritative and hidden-information state;
- setup validation and game initialization;
- public and private view generation;
- normal turn phases and guided legal actions;
- movement and battle initiation;
- optional hand commitment and battle-draw play;
- partial draws and discard reshuffling;
- battle-card reveal, cancellation, and destination handling;
- Homeland Advantage and separate Heartland defense;
- Action-card play windows;
- Assets and Asset-bank persistence;
- Territory-scaled Asset-bank capacity;
- player-selected discard-down when capacity contracts;
- occupation, counterattack, capture, and control changes;
- centralized win-condition evaluation;
- guided CLI sessions and JSON logs;
- local browser GUI development flow.

The former Condition zone has been removed from the v0.6-development state model. Persistent playable-card effects must now use Assets, Territory Overlays, or card-specific immediate/self-tracking resolution.

## Development commands

From the repository root:

```bash
npm install
npm run typecheck
npm test
npm run dev:cli
npm run dev:gui
```

## Important limitations

The current CLI and GUI are development harnesses, not a complete digital release.

- Example sessions still initialize small `0.5.6-dev` decks with placeholder card IDs.
- The full v0.5.7 card and Territory pool is not yet guaranteed to be executable.
- v0.6 faction systems and current card-review decisions are not yet represented by canonical v0.6 digital data.
- Only a small subset of reviewed card effects is automated; some new Asset and Overlay conversions still require implementation.
- Some unusual effects may be approximated, unimplemented, or require manual resolution.
- Local GUI functionality does not yet imply remote multiplayer, persistence, matchmaking, or production security.

Do not treat engine behavior as authoritative when it conflicts with the selected physical ruleset or canonical data. Digital implementation should expose physical-rules ambiguities so they can be resolved in shared documentation.

## Next priorities

1. Inventory modules and tests against the roadmap.
2. Choose the next explicit supported target: complete v0.5.7 or a separate v0.6-development mode.
3. Replace placeholder decks with validated canonical deck data for that mode.
4. Complete a full guided game without direct state editing.
5. Identify every missing or incorrect card and Territory interaction.
6. Add manual-resolution warnings for effects not yet automated.
7. Add structured telemetry using the playtest metrics document.
8. Add local save/load before attempting remote multiplayer.
