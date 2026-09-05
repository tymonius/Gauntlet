# Gauntlet Digital Engine Work

This directory contains the active digital-engine migration plus explicitly versioned transitional layers. Historical reconstruction snapshots, retired migration implementations, and the earlier playable v0.6 architecture live under `legacy/`.

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
- `v063/` — substantial validated procedure library from the v0.6.3 migration: setup, Front Line/Capture, copied/repeated effects, Arcane Knowledge, Manifest Destiny, dynamic Territories/Deeds, and all printed Territory/Arena procedures. These remain explicitly versioned until individually revalidated against v0.7.0.
- `content/v063.ts` — immutable v0.6.3 release adapter retained for historical/versioned regression tests.
- `legacy/digital-engine-reconstruction/` — preserved clean v0.6.2/v0.6.3 reconstruction snapshots formerly under `src/reconstruction/`; retained as historical provenance outside the active `src/**/*.ts` typecheck boundary.
- `legacy/digital-engine-migration/v0.6.2/` — superseded v0.6.2 rules/card/faction migration code and tests; v0.6.3 owns its required types independently.
- `legacy/digital-engine-migration/v0.6.4/` — retired v0.6.4 Onset/movement transition implementation formerly under `src/v064/`; relevant shared procedures were audited into `v070/rules.ts` before archival.
- `legacy/digital-engine-v06/` — earlier playable v0.6-era architecture formerly split across `src/state/`, `effects/`, `cards/`, `types/`, and `dev/`, together with its explicitly legacy CLI/GUI runners. It remains an opt-in historical harness and migration source, not a current engine dependency.
- `cli/` — promoted v0.7.0 reducer REPL. It uses certified starter Decks and the authoritative setup/turn/battle reducers directly; it does not mask unsupported battle effects.
- `gui/` — promoted v0.7.0 reducer GUI. It uses certified starter Decks, player-scoped views, and the shared recorded-action dispatcher; older generic v0.5.6 runners are preserved under `legacy/digital-engine-dev-runners/` as non-executable provenance.

The promoted `content/current.ts` boundary currently identifies the v0.7.0 implementation baseline and exposes only that promoted shared-rules/starter/setup/private-view surface. Historical procedure libraries are not re-exported through `current.ts`; migration work must import explicit versioned modules until a procedure is revalidated and promoted deliberately.

There is intentionally no generic `content/index.ts` barrel. Active code must import `content/current.ts` when it means the promoted engine surface, or an explicit versioned adapter such as `content/v06.ts`, `content/v063.ts`, or `content/v070.ts` when it means a historical or released rules generation.

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
npm run dev:legacy:cli
npm run dev:legacy:gui
```

The broad test/typecheck commands exercise maintained source and explicitly versioned migration work that remains under `src/`. Everything under `legacy/` is intentionally outside the default TypeScript/Vitest authority boundary. `dev:v070:cli` and `dev:v070:gui` expose the promoted v0.7.0 reducer over certified starter Decks; both preserve explicit unsupported-effect halts, and the GUI defaults to player-scoped hidden-information views. They are developer surfaces, not claims of v0.7.1 parity or complete battle-card support. The `dev:legacy:*` commands are explicit opt-in runners for `legacy/digital-engine-v06/` only.

## Reuse policy

Reuse architecture and procedures deliberately. A historical handler is evidence, not authority. New or retained gameplay behavior must be checked against the published v0.7.0 Rulebook and canonical data before it is exposed through the current engine surface.

The promoted `src/v070/` implementation must remain structurally isolated from `legacy/digital-engine-v06/`, `legacy/digital-engine-reconstruction/`, and `legacy/digital-engine-migration/`. Shared code may move into an explicitly current/version-neutral module only after its authority and compatibility are established.

The archived v0.6 package keeps its former card/state/effect/dev sibling layout so historical relative imports and the opt-in development runners remain usable. Its generic card/state/effect/type barrels were already retired before archival; current code must not restore those compatibility surfaces or import the archive directly.

## Battle execution boundary

The current engine can complete an ordinary battle when both players pass on Gambits and Tactics. It also supports legal face-down Gambit/Tactic commitments and their private views. Until an audited handler exists for a revealed printed battle-card effect, execution halts explicitly with the card/effect identified; the engine never treats an unimplemented effect as blank.

The published v0.7.0 rulebook refers to the inherited “ordinary battle rules” rather than restating the base battle-total formula. The executable surface preserves the established shared procedure: normally roll one d6, apply the applicable advantage/disadvantage selection and rerolls/die changes, then apply numerical modifiers to obtain the battle total. v0.7.0’s separate unmodified Tiebreak Roll is handled independently.
