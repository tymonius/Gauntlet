# Legacy v0.6 Effect Registry

This directory contains effect-handler infrastructure used by the earlier playable v0.6 state engine.

It is **not** the promoted current engine effect API. Current promoted gameplay implementation lives under `src/v070/`.

The aggregate legacy effect registry is intentionally exposed as `src/effects/v06.ts`. There is no generic `effects/index.ts` barrel; consumers must opt into the v0.6 implementation explicitly.

The individual handlers remain useful migration evidence, but no handler should be reused by the promoted engine without revalidation against current rules authority.
