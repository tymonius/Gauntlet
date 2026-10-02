# Card Design Production Tooling

`card-design/` is the maintained browser-facing rendering and authoring boundary for physical Gauntlet components. It is **not** the canonical home of environment-neutral rendering model authority.

## Public route boundary

The repository directory is no longer directly published wholesale by GitHub Pages. `config/publication-boundary.json` materializes the maintained source directory onto the stable `/card-design/` public route during off-tree Pages staging. This deliberately separates repository placement from deployed URLs so later browser-runtime and authoring/tooling moves can preserve the public contract instead of inheriting the current source path.

In-place compatibility materialization skips the `card-design` route because its source and destination are already the same repository directory. Off-tree staging still copies the route, then applies explicit `materializedFiles` overrides afterward.

## Shared authority

Environment-neutral physical-face authority lives under [`packages/rendering/`](../packages/rendering/):

- `packages/rendering/face-authority.mjs` owns the canonical physical-face catalog, template identity, pairing, and back-policy model.
- `packages/rendering/production-surface.mjs` owns canonical portrait/landscape production geometry and raster scale.

The tracked `card-design/face-authority.mjs` and `card-design/production-surface.mjs` files are compatibility adapters. GitHub Pages materializes the package implementations at the established `/card-design/...` public module URLs through `config/publication-boundary.json`.

## Browser rendering runtime

The remaining canonical face pipeline is intentionally browser-side production tooling:

- `render-context.mjs` loads the browser current-game bridge and render context.
- `face-spec.mjs` resolves render content, stylesheet/public asset dependencies, artwork sources, and readiness from the shared face model plus current game/visual authority.
- `face-template-registry.mjs` and `face-templates/*.mjs` implement DOM renderers. The templates construct `HTMLElement` output and therefore are not environment-neutral package code.
- `face-preparation.mjs` loads fonts/images and performs DOM/layout fitting with browser APIs such as `document`, `Image`, `getComputedStyle`, and element geometry.
- `face-render.mjs` orchestrates the browser renderer, stylesheet/script loading, artwork preparation, fitting, and embedded inspection behavior.

These modules should not be moved into `packages/rendering/` merely to reduce the size of this root. A future physical relocation belongs under a browser/production-tooling boundary and must preserve the deployed `/card-design/` contract and all renderer consumers.

## Authoring and review tooling

Artwork compositor/authoring source now lives under [`tools/card-design/artwork-authoring/`](../tools/card-design/artwork-authoring/). `config/publication-boundary.json` materializes those files back onto their established `/card-design/artwork-*` URLs, so browser consumers and the public compositor do not depend on repository placement.

Unified catalog/review/inspection source lives under [`tools/card-design/review/`](../tools/card-design/review/) and is materialized back onto its established `/card-design/` URLs. This includes the catalog entry page, Proposal and card-back catalog builders, and the Capital Ledger preview shell with its print-only review stylesheet. Rite/Ritual and supplemental-component modules remain in `card-design/` because current component authority still names them as production render surfaces. The stable `/card-design/` directory URL resolves through the publication contract to the review-owned `index.html`, while sibling runtime assets continue to resolve from `card-design/`.

Compatibility-only print/review/render entrypoints now live under [`legacy/public-compatibility/card-design/`](../legacy/public-compatibility/card-design/) and are materialized back onto their established `/card-design/` URLs. Canonical family styles and browser-runtime dependencies remain in `card-design/`; superseded standalone JS renderers are no longer kept there merely for historical tests. The v0.6.3 playable renderer now lives under `legacy/card-design-v0.6.3/` while its historical `/card-design/playable-card-renderer.js` URL is materialized for compatibility.

## Source and lifecycle boundaries

- Maintained card-design standards belong under `docs/card-design/`.
- Historical design studies and superseded review material belong under `legacy/`. The archived set now includes the v0.6.1 faction comparison, the v0.6.4 Territory mockup, and the typography studies; their established `/card-design/...` URLs remain materialized.
- Compatibility-only card-design render/review entrypoints belong under `legacy/public-compatibility/card-design/` while their established `/card-design/` public URLs remain materialized.
- The maintained reference-copy subtree selected by current component authority remains under `card-design/reference-copy/` because it is an active presentation source consumed by the renderer/TTS component contract.
- Canonical gameplay authority remains `packages/game-data/current-game.json`; rendering code must not reconstruct gameplay mechanics from presentation files.
