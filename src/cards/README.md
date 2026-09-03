# Legacy v0.6 Card Definitions

This directory contains card-definition and playability helpers for the earlier playable v0.6 digital architecture.

The explicit legacy aggregate API is `src/cards/v06.ts`. The former generic `src/cards/index.ts` compatibility barrel has been retired; legacy consumers must choose the explicit v0.6 aggregate or, where practical, import the specific card module they actually need.

Current promoted gameplay implementation under `src/v070/` does not depend on this directory.

The card-definition modules use the explicit `../types/v06` type boundary. Military card definitions are also isolated from stateful effect procedures, which live under `src/state/military-card-effects.ts`; this removes the former card→state initialization cycle. Boundary tests recursively reject source or test imports that resolve to the retired generic card barrel. Current engine work should continue using current/versioned authority rather than restoring an unversioned compatibility surface.
