# Shared Rendering Model

`packages/rendering/` owns environment-neutral physical-card rendering model authority shared by browser tooling, validation, and TTS/media generation.

Current package authority:

- `production-surface.mjs` — canonical portrait/landscape production geometry and raster scale;
- `face-authority.mjs` — canonical physical-face catalog, template identity, pairing, and back-policy model.

Environment-specific rendering remains under `card-design/`. In particular, FaceSpec resolution, template renderers, artwork/browser dependencies, and authoring surfaces have not moved into this package.

The tracked `card-design/face-authority.mjs` and `card-design/production-surface.mjs` files are repository-root compatibility adapters for local browser/TTS consumers. GitHub Pages stages the authoritative package files directly at the established `/card-design/face-authority.mjs` and `/card-design/production-surface.mjs` public URLs through `config/publication-boundary.json`.
