# Legacy v0.6 Card Definitions

This directory contains card-definition and playability helpers for the earlier playable v0.6 digital architecture.

The explicit aggregate API is `src/cards/v06.ts`. The generic `src/cards/index.ts` remains temporarily as a **deprecated compatibility shim** because the legacy state/dev regression surface has many existing `../cards` imports.

Current promoted gameplay implementation under `src/v070/` does not depend on this directory.

New code must not treat the generic barrel as current authority. The card-definition modules themselves now use the explicit `../types/v06` type boundary. When touching another legacy consumer, prefer migrating its aggregate imports to explicit v0.6 paths; current engine work should use current/versioned authority instead.
