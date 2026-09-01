# Legacy v0.6 Engine Types

This directory contains the shared type model used by the earlier playable v0.6 digital architecture.

The explicit aggregate API is `src/types/v06.ts`. The generic `src/types/index.ts` remains temporarily as a **deprecated compatibility shim** because the legacy implementation has a large number of existing `../types` imports.

The promoted `src/v070/` engine defines and imports its own current/versioned structures and does not depend on this legacy type barrel.

When touching an older consumer, prefer migrating its import to `../types/v06`. Current engine work must not use this compatibility shim as a current authority surface.
