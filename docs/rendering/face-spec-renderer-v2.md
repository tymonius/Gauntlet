# FaceSpec Renderer v2

Status: Phase 1 implementation

## Goal

Every physical Gauntlet face is resolved once into a complete `FaceSpec`. Review pages, Card Reference, Deckbuilder printing, TTS generation, and inspection consume the same render surface. Consumers may place or scale a rendered face; they may not reconstruct it or supply hidden visual overrides.

## Invariants

1. **One request → one FaceSpec → one mounted face.**
   The production renderer does not build a catalog, wait for a hidden specimen, clone it, or reparent it.

2. **Appearance authority is data, not selector accidents.**
   Per-card artwork composition belongs in current visual authority. Production CSS contains template geometry and design tokens only.

3. **Production does not invent composition.**
   Migrated artwork-bearing faces require explicit `focusX`, `focusY`, `fit`, `zoom`, and `smart: false`. Smart crop remains an authoring aid, not a production decision.

4. **Generated assets are deterministic derivatives.**
   The card-back pattern is generated from canonical faction-symbol geometry. Source paint and CSS classes are stripped before symbols enter the shared pattern.

5. **Legacy routes are aliases, not alternate implementations.**
   Once a family migrates, old routes redirect to `face-render.html`.

6. **Downstream systems do not own face internals.**
   Deckbuilder, Card Reference, and TTS may select a FaceSpec and package its output. They do not maintain card markup, crop rules, or faction-specific visual exceptions.

## Phase 1

Migrated:
- Leader fronts
- Standard faction card backs

The Phase 1 renderer consists of:
- `card-design/face-spec.mjs` — authority resolver
- `card-design/face-render.html` / `face-render.mjs` — single-face runtime
- `card-design/face-families/leader.mjs`
- `card-design/face-families/card-back.mjs`
- `card-design/card-design.js#GauntletCardDesign.prepareCard` — deterministic single-card preparation

Remaining families continue through their existing canonical Card Design surfaces until migrated.

## Migration order

1. Leaders + card backs
2. Proposal/Treaty and Rite/Ritual pairs
3. Reference, Tracker, Capital Ledger, Deed
4. Playable cards
5. Territories
6. Delete the historical component/catalog render machinery after the last consumer moves

Each migration must:
- add a FaceSpec resolver
- add a direct family renderer
- move every internal consumer
- convert the previous route to a redirect
- add render/geometry/artwork-authority regression coverage
- remove any family-specific appearance authority from CSS or downstream code
