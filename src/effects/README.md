# Legacy v0.6 Effect Registry

This directory contains effect-handler infrastructure used by the earlier playable v0.6 state engine.

It is **not** the promoted current engine effect API. Current promoted gameplay implementation lives under `src/v070/`.

The aggregate legacy effect registry is intentionally exposed as `src/effects/v06.ts`. There is no generic `effects/index.ts` barrel; consumers must opt into the v0.6 implementation explicitly. The aggregate is a pure re-export surface: the complete legacy Battle handler list is composed statically in `battle.ts`, so importing `v06.ts` does not mutate handler registration.

The individual handlers remain useful migration evidence, but no handler should be reused by the promoted engine without revalidation against current rules authority.

Legacy runtime effect modules must not import the retired generic `../types` compatibility barrel. They also remain independent from the legacy state, card, and development runtime layers; shared read-only Asset eligibility policy lives in `asset-policy.ts` so state may consume effect policy without effects reaching back into state.
