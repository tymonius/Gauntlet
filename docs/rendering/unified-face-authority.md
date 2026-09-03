# Unified Face Authority

Status: Stage 4 in progress; no production consumer cutover

## Why this exists

The previous renderer refactor still allowed card families to become routing decisions. That recreates the same split-authority problem under new names. A Leader, playable card, Deed, Rite, Territory, reference card, and card back may use different templates, but they are all physical faces and must enter the production system through the same abstraction.

This rebuild starts below every renderer and consumer.

## Core model

There is exactly one canonical catalog of physical faces.

A face record contains identity and resolved production metadata:

- canonical face ID
- template
- physical orientation and surface
- side
- faction/theme
- label
- back policy / paired face
- canonical source reference

The caller never selects a renderer family.

The eventual production API is:

`face-render.html?id=<canonical-face-id>`

The renderer looks up the face record, resolves the complete immutable FaceSpec, and dispatches internally by `FaceSpec.template`.

Namespaces in IDs such as `leader:military-general` or `component:financiers-deed:front` are identity only. No downstream consumer is allowed to parse them to choose behavior.

## Current foundation

`card-design/face-authority.mjs` currently enumerates the complete current physical-face set:

- 142 playable faces
- 25 Territory faces
- 12 Leader faces
- 57 card-like component faces
- 6 standard card-back faces
- 242 total canonical faces

It derives two-sided and special-back pairs from the existing component contract rather than from renderer-specific side rules.

It also owns the single template-to-orientation registry.

## Non-negotiable rules

1. **No partial production cutover.**
   The existing renderers remain untouched while the new authority and renderer are built and verified in parallel.

2. **No family-specific public routes.**
   The final production surface accepts only a canonical face ID.

3. **No caller-selected kind, side, template, or renderer.**
   Those are FaceSpec data resolved inside Card Design.

4. **No hidden appearance authority in CSS selectors or downstream consumers.**
   Card-specific composition belongs in canonical visual data.

5. **No production smart-crop decisions.**
   Approved composition is explicit data. Authoring tools may propose values; production applies them.

6. **No renderer aliases until cutover.**
   Compatibility redirects are an edge migration concern and will be added only when the corresponding old route is retired.

7. **No deleting old infrastructure until complete parity is demonstrated.**
   The new system must render the full canonical face catalog and pass visual/geometry regression checks first.

## Build sequence

### Stage 1 — authority
- complete face catalog
- canonical IDs
- physical pairing/back policy
- template geometry
- source references
- schema validation

### Stage 2 — complete FaceSpec
- resolve content payload
- artwork source and policy-resolved composition
- complete styling/template dependencies
- version and authority provenance
- immutable resolved output for every one of the 242 faces

Stage 2 is implemented in parallel in `card-design/face-spec.mjs`. It resolves all 242 IDs through the Stage 1 catalog and attaches canonical content source data, template stylesheet dependencies, artwork-source policy, artwork-composition provenance, pairing/back policy, and authority/version provenance.

A FaceSpec also carries an explicit readiness audit. Missing authority is reported as an issue instead of silently falling back. Artwork composition is complete when it resolves through the canonical `visualPolicy.artDirectionDefault` plus any `artDirection` override; smart focal analysis is part of that declared policy, not a hidden fallback. Tracker and reference presentation now resolve directly through the clean FaceSpec path.

### Stage 3 — clean renderer
- one `face-render.html?id=...`
- one renderer runtime
- template registry internal to Card Design
- direct rendering; no hidden catalogs, cloning, reparenting, or replayed page lifecycle

Stage 3 now has a parallel, non-production `face-render.html` surface. It accepts only `id`, resolves the FaceSpec, loads the template declared by that spec through one internal registry, constructs exactly one face, applies canonical resources, and runs deterministic preparation. The runtime contains no Leader/Deed/Territory/etc. route dispatch.

The template boundary may declare preparation behavior such as parchment treatment and fitting strategy; that declaration is internal FaceSpec/template data, not a caller decision. Missing authority remains fail-closed. Tracker and Reference faces render directly from canonical presentation data. Artwork-bearing faces consume the same canonical smart/default crop policy and per-face overrides as the production renderer, so Stage 4 can compare those faces instead of excluding them from parity.

No existing Card Design, Card Reference, Deckbuilder, print, TTS, or inspection consumer points at this surface yet.

### Stage 4 — parity
- render all 242 faces
- compare geometry and approved visual specimens
- validate fonts, artwork, crop, overflow, and paired-face behavior
- print-page/browser tests for portrait and landscape faces

Stage 4 now has a dedicated browser parity gate. `scripts/validate-unified-face-parity.mjs` resolves the entire 242-face catalog, separates production-ready faces from authority-blocked faces, and compares every ready clean face against the current live renderer in the same Chromium context. The gate checks exact physical geometry, visible copy, loaded image sources, applied crop state, overflow, and an element screenshot pixel diff. CI uploads both clean and legacy screenshots plus the machine-readable blocker/parity report.

The same validator is designed to expand automatically: as canonical authority blockers are removed, those faces move from the blocked inventory into clean-versus-legacy comparison without changing the parity harness. A face cannot silently bypass the gate.

Current blocked faces remain blocked intentionally. Stage 4 must promote their remaining crop/reference/tracker presentation behavior into canonical authority before the clean renderer can reach full-catalog parity.

### Stage 5 — atomic consumer cutover
Move Card Design review, Card Reference, Deckbuilder, printing, TTS, and inspection to the single face route together.

### Stage 6 — deletion
Delete historical component/card/Territory render surfaces and only then add compatibility redirects for any externally useful legacy URLs.

## Definition of clean

The rebuild is not complete merely because all consumers point into the same directory or ultimately share some functions.

It is complete when a consumer can know only the canonical face ID and still obtain the one correct physical face, with no other card-type knowledge or appearance policy required.
