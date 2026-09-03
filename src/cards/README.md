# Legacy v0.6 Card Definitions

This directory contains card-definition and playability helpers for the earlier playable v0.6 digital architecture.

The explicit aggregate API is `src/cards/v06.ts`. The generic `src/cards/index.ts` remains temporarily as a **deprecated compatibility shim** only for legacy test/compatibility consumers; runtime source no longer imports it. Runtime consumers import the specific legacy card module they actually need.

Current promoted gameplay implementation under `src/v070/` does not depend on this directory.

New code must not treat the generic barrel as current authority. The card-definition modules themselves now use the explicit `../types/v06` type boundary. Military card definitions are also isolated from stateful effect procedures, which live under `src/state/military-card-effects.ts`; this removes the former card→state initialization cycle. When touching another legacy consumer, prefer migrating its aggregate imports to explicit v0.6 paths; current engine work should use current/versioned authority instead.
