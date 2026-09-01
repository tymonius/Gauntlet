# Gauntlet Digital Engine Work

This directory contains the preserved legacy prototype plus the incremental migration toward the current published Gauntlet rules.

## Current authority boundary

The **current published digital-rules target is v0.7.1**. The v0.7.1 release manifest declares `public_defaults.digital_rules: v0.7.1`, and current tabletop/gameplay authority lives outside this engine under the maintained current authority surfaces.

The **implemented promoted engine baseline is still v0.7.0**. Engine-facing released content currently loads from:

- `releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json`
- `releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json`

That difference is an explicit implementation lag, not an alternate authority claim. `content/current.ts` is the promoted engine API boundary, but until v0.7.1 migration is completed it must not be interpreted as proof of full parity with the current published digital-rules target.

## Migration layers

- `content/v070.ts` — published v0.7.0 content index and release-contract validation.
- `v070/rules.ts` — released v0.7.0 shared turn, movement, Onset, withdrawal, battle-outcome, and Last Stand surface.\n- `v070/starter-decks.ts` — released starter-package adapter with canonical card/Territory validation.\n- `v070/engine.ts` — authoritative deterministic setup/game state with physical card-instance identity, opening selection, Territory arrangement, first-player resolution, turn state, and active battle state.\n- `v070/turn-engine.ts` — Capture, Draw, Opening/Movement/Denouement/Cleanup lifecycle, deterministic reshuffles, Front Line capture, and battle initiation.\n- `v070/battle-engine.ts` / `battle-types.ts` — executable Onset→Gambit→Reserve→Tactic→Outcome→Aftermath envelope, battle dice, Defensive Edge/Tiebreak, hidden commitments, and explicit unsupported-effect halts.\n- `v070/views.ts` — player-scoped hidden-information views.
- `v064/` — transitional Onset implementation retained as historical migration evidence after its relevant shared procedures were audited into `v070/rules.ts`.
- `v063/` — substantial validated procedure library from the v0.6.3 migration: setup, Front Line/Capture, copied/repeated effects, Arcane Knowledge, Manifest Destiny, dynamic Territories/Deeds, and all printed Territory/Arena procedures. These remain explicitly versioned until individually revalidated against v0.7.0.
- `content/v063.ts` — immutable v0.6.3 release adapter retained for historical/versioned regression tests.
- `state/`, `effects/`, `cards/`, `types/`, and `dev/` — pre-faction/earlier playable architecture. Useful scaffolding, but not presumed v0.7.0-compatible. Aggregate legacy APIs are explicitly versioned as `state/v06.ts`, `effects/v06.ts`, `cards/v06.ts`, and `types/v06.ts`. Generic state/effects barrels are removed; `cards/index.ts` and `types/index.ts` remain only as deprecated compatibility shims while their broader legacy consumer sets are migrated.\n- `cli/` and `gui/` — explicitly versioned v0.6 legacy interactive runners only; older generic v0.5.6 runners are preserved under `legacy/digital-engine-dev-runners/` as non-executable provenance.

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
npm run dev:legacy:cli
npm run dev:legacy:gui
```

The broad test/typecheck commands exercise legacy/versioned code as well as promoted migration work. The interactive `dev:legacy:*` runners execute the earlier playable architecture only. Passing any of these demonstrates repository consistency, not v0.7.1 parity.

## Reuse policy

Reuse architecture and procedures deliberately. A historical handler is evidence, not authority. New or retained gameplay behavior must be checked against the published v0.7.0 Rulebook and canonical data before it is exposed through the current engine surface.

The promoted `src/v070/` implementation must remain structurally isolated from the legacy `state/`, `dev/`, `cards/`, `effects/`, and `reconstruction/` trees. Shared code may move into an explicitly current/version-neutral module only after its authority and compatibility are established.

The legacy development helpers under `src/dev/` and the legacy CLI/GUI runners use the explicit v0.6 aggregate boundaries for state, effects, card definitions, and types. Compatibility shims exist only to support older untouched consumers, not as preferred import targets.


## Battle execution boundary

The current engine can complete an ordinary battle when both players pass on Gambits and Tactics. It also supports legal face-down Gambit/Tactic commitments and their private views. Until an audited handler exists for a revealed printed battle-card effect, execution halts explicitly with the card/effect identified; the engine never treats an unimplemented effect as blank.

The published v0.7.0 rulebook refers to the inherited “ordinary battle rules” rather than restating the base battle-total formula. The executable surface preserves the established shared procedure: normally roll one d6, apply the applicable advantage/disadvantage selection and rerolls/die changes, then apply numerical modifiers to obtain the battle total. v0.7.0’s separate unmodified Tiebreak Roll is handled independently.
