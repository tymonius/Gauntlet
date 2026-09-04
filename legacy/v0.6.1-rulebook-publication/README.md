# v0.6.1 Rulebook Publication System

This subtree consolidates the Rulebook design-proof and production-rendering implementation originally developed for the v0.6.1 playtest revision. That implementation remains the historical basis for several later version-specific publication adapters.

It is not Rulebook authority. Current Rulebook authority lives under `rulebook/player-facing/`. The source is consolidated here as version-pinned publication provenance; maintained scripts may continue to adapt it through compatibility paths until those callers are migrated during later file-level cleanup.

## Structure

- `rulebook-design/` — approved v0.6.1 visual proof system.
- `rulebook-production/` — v0.6.1 production renderer and fidelity gate built from that approved proof system.
- `images` — symbolic link to the repository image tree so the preserved renderer can resolve its historical relative asset paths without rewriting source files.
- `releases` — symbolic link to the repository release tree so the renderer can read the frozen v0.6.1 Rulebook source at its historical relative path.

The repository-root names `rulebook-design` and `rulebook-production` are compatibility symbolic links into this subtree. They preserve existing downstream publication adapters while removing the two implementations as independent top-level source categories. Those aliases may be retired after later file-level cleanup migrates their remaining callers.

The manual GitHub Actions fidelity workflow executes this preserved subsystem directly and serves this directory as its HTTP root, preserving the original internal `/rulebook-design/` and `/rulebook-production/` browser paths.

Do not add gameplay or Rulebook authority here. Changes should be limited to historical reproducibility, publication compatibility, and eventual migration of maintained callers toward clearer current tooling boundaries.
