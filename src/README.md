# Gauntlet Digital Engine Work

This directory contains the maintained digital-engine implementation. Historical reconstruction snapshots, retired migration implementations, and the earlier playable architecture live under `legacy/`.

## Current authority boundary

The **current published digital-rules target is v0.7.1**. The v0.7.1 release manifest declares `public_defaults.digital_rules: v0.7.1`, and current tabletop/gameplay authority lives outside this engine under the maintained current authority surfaces.

The **implemented promoted engine baseline is still v0.7.0**. Engine-facing released content currently loads from:

- `releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json`
- `releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json`

That difference is an explicit implementation lag, not an alternate authority claim. `content/current.ts` is the promoted engine API boundary, but until v0.7.1 migration is completed it must not be interpreted as proof of full parity with the current published digital-rules target.

## Migration layers

- `content/v070.ts` — published v0.7.0 content index and release-contract validation.
- `v070/rules.ts` — released v0.7.0 shared turn, movement, Onset, withdrawal, battle-outcome, and Last Stand surface.
- `v070/starter-decks.ts` — released starter-package adapter with canonical card/Territory validation.
- `v070/engine.ts` — authoritative deterministic setup/game state with physical card-instance identity, opening selection, Territory arrangement, first-player resolution, turn state, and active battle state.
- `v070/turn-engine.ts` — Capture, Draw, Opening/Movement/Denouement/Cleanup lifecycle, deterministic reshuffles, Front Line capture, and battle initiation.
- `v070/battle-engine.ts` / `battle-types.ts` — executable Onset→Gambit→Reserve→Tactic→Outcome→Aftermath envelope, battle dice, Defensive Edge/Tiebreak, hidden commitments, and explicit unsupported-effect halts.
- `v070/views.ts` — player-scoped hidden-information views.
- `legacy/digital-engine-reconstruction/` — preserved clean v0.6.2/v0.6.3 reconstruction snapshots formerly under `src/reconstruction/`; retained as historical provenance outside the active `src/**/*.ts` typecheck boundary.
- `legacy/digital-engine-migration/v0.6.2/` — superseded v0.6.2 rules/card/faction migration code and tests; v0.6.3 owns its required types independently.
- `legacy/digital-engine-migration/v0.6.3/` — archived stale procedure library, content adapter, and tests. Preserved as implementation evidence only; no further development of those rules.
- `legacy/digital-engine-migration/v0.6.4/` — retired v0.6.4 Onset/movement transition implementation formerly under `src/v064/`; relevant shared procedures were audited into `v070/rules.ts` before archival. Its unused candidate content adapter and test are preserved in the archived `content/` subdirectory, removing the active import of reconstruction code.
- `legacy/digital-engine-v06/` — earlier playable v0.6-era architecture, historical content adapters, and preserved CLI/GUI runner sources. It is non-executable historical evidence, not a current engine dependency or supported development target.
- `cli/` — promoted v0.7.0 reducer REPL. It uses certified starter Decks and the authoritative setup/turn/battle reducers directly; it does not mask unsupported battle effects.
- `gui/` — promoted v0.7.0 reducer GUI. It uses certified starter Decks, player-scoped views, and the shared recorded-action dispatcher; older generic v0.5.6 runners are preserved under `legacy/digital-engine-dev-runners/` as non-executable provenance.

The promoted `content/current.ts` boundary currently identifies the v0.7.0 implementation baseline and exposes only that promoted shared-rules/starter/setup/private-view surface. Historical procedure libraries are not re-exported through `current.ts`; new engine work must implement the maintained release contract without depending on archived rule implementations.

There is intentionally no generic `content/index.ts` barrel. Active code must import `content/current.ts` when it means the promoted engine surface, or `content/v070.ts` when it needs that released content contract explicitly.

Issue #741 tracks completion of the playable engine against the current released rules.

## Implemented v0.7.0 content baseline

The currently implemented v0.7.0 engine content baseline contains:

- 142 playable titles;
- 52 Neutral cards;
- 15 cards in each of six factions;
- 25 Territories/Arenas;
- 12 Leaders.

Relative to the v0.6.3 baseline, v0.7.0 adds 15 cards, retires **No Martyrs**, formalizes Onset/Terms timing, and raises the Diplomat Peace Treaty threshold to six ratified Proposals. Current behavior must come from the released v0.7.0 contract, not from old tests or candidate terminology.

## Development commands

From the repository root:

```bash
npm install
npm run typecheck
npm test
npm run dev:v070:cli
npm run dev:v070:gui
```

The broad test/typecheck commands exercise maintained source under `src/`. Everything under `legacy/` is intentionally outside the default TypeScript/Vitest authority boundary and is not exposed through development commands. `dev:v070:cli` and `dev:v070:gui` expose the promoted v0.7.0 reducer over certified starter Decks; both preserve explicit unsupported-effect halts, and the GUI defaults to player-scoped hidden-information views. They are developer surfaces, not claims of v0.7.1 parity or complete battle-card support.

## Reuse policy

Reuse architecture and procedures deliberately. A historical handler is evidence, not authority. New or retained gameplay behavior must be checked against the published v0.7.0 Rulebook and canonical data before it is exposed through the current engine surface.

The promoted `src/v070/` implementation must remain structurally isolated from `legacy/digital-engine-v06/`, `legacy/digital-engine-reconstruction/`, and `legacy/digital-engine-migration/`. Shared code may move into an explicitly current/version-neutral module only after its authority and compatibility are established.

The archived v0.6 package keeps its former card/state/effect/dev sibling layout so historical relative imports and the opt-in development runners remain usable. Its generic card/state/effect/type barrels were already retired before archival; current code must not restore those compatibility surfaces or import the archive directly.

## Battle execution boundary

The current engine can complete an ordinary battle when both players pass on Gambits and Tactics. It also supports legal face-down Gambit/Tactic commitments and their private views. Until an audited handler exists for a revealed printed battle-card effect, execution halts explicitly with the card/effect identified; the engine never treats an unimplemented effect as blank.

The published v0.7.0 rulebook refers to the inherited “ordinary battle rules” rather than restating the base battle-total formula. The executable surface preserves the established shared procedure: normally roll one d6, apply the applicable advantage/disadvantage selection and rerolls/die changes, then apply numerical modifiers to obtain the battle total. v0.7.0’s separate unmodified Tiebreak Roll is handled independently.
