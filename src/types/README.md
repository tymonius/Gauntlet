# Legacy v0.6 Engine Types

This directory contains the shared type model used by the earlier playable v0.6 digital architecture.

The explicit aggregate API is `src/types/v06.ts`. The former generic `src/types/index.ts` compatibility barrel has been retired; legacy consumers must opt into `src/types/v06.ts` explicitly instead of relying on an unversioned type authority.

The promoted `src/v070/` engine defines and imports its own current/versioned structures and does not depend on the legacy v0.6 type aggregate.

The digital-engine boundary tests recursively reject source or test imports that resolve to the retired generic type barrel. Current engine work must continue using promoted/versioned structures rather than restoring an unversioned compatibility surface.
