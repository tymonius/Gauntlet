# Repository Architecture

This document defines the intended repository shape for Gauntlet and classifies the major authority, application, source-package, tooling, historical, generated, and deployment boundaries.

## Goals

Repository structure should make four things obvious:

1. where current gameplay authority lives;
2. which applications and maintained source packages are active;
3. which paths exist only for historical compatibility or frozen releases; and
4. which files are generated outputs rather than hand-maintained source.

Cleanup is not a license to rewrite game behavior, mutate frozen releases, or break public URLs. Structural changes must preserve current behavior and required CI.

## Architectural rules

### 1. Gameplay authority comes before rules surfaces

Current gameplay authority lives at:

- `packages/game-data/current-game.json` for canonical gameplay mechanics and game objects;
- `governance/` for binding decision provenance and cross-surface traceability; and
- `config/` for maintained contracts that define how authority is projected, published, and validated.

`config/rules-surface-contract.json` governs the active rules projections. The maintained Player's Guide, Faction Guides, Comprehensive Rules, current rule-fact synchronization support, and publication/editorial support live under `packages/rules/`. They are reviewed or derived rules surfaces/support from gameplay authority; they are not a second independent gameplay authority.

The active `/rules/` architecture treats the Comprehensive Rules as the complete technical corpus, with the Player's Guide and Faction Guides as teaching layers. The older monolithic Browser Rulebook remains available as a transition/coverage reference; retirement coverage is proven separately, while route retirement remains an explicit later change.

Published release snapshots under `releases/` are immutable historical evidence.

Active renderers and applications may reshape authoritative data for layout or UI convenience, but they must not silently relabel effects, merge gameplay branches, rewrite mechanics, or repair authority at runtime. Version-specific compatibility transforms belong only at explicit historical boundaries.

### 2. Current, historical, and generated paths must be distinguishable

Every maintained subsystem should be classifiable as one of:

- **Authority** — canonical gameplay, governance, or repository-contract source.
- **Active application** — current player-facing or developer-facing runtime.
- **Maintained source package** — shared source consumed by multiple current surfaces.
- **Production tooling** — generators, renderers, release/build tooling, or validation.
- **Historical compatibility** — retained because an old public URL or supported historical tool must continue to function.
- **Frozen release** — immutable versioned publication.
- **Generated/evidence** — reproducible outputs or retained QA/release evidence.
- **Shared presentation assets** — source assets intentionally consumed across multiple surfaces.

A path that cannot be classified cleanly is a cleanup target.

### 3. Public URLs are compatibility contracts, not source locations

Current public paths such as `/about/`, `/card-reference/`, `/deckbuilder/`, `/factions/`, `/rules/`, `/rulebook/`, `/start/`, `/playtest/`, and `/game-data/` must not move merely to make the source tree prettier.

`config/publication-boundary.json` is the machine-readable public/deployment contract. It defines direct Pages roots, source-only repository roots, source-to-route mappings, explicitly materialized files, managed deep links, and versioned routes.

GitHub Pages staging and publication validation consume this contract rather than mirroring the repository. New source roots are non-public by default unless the contract deliberately includes them.

Source organization may therefore change independently of deployed URL layout. Current examples include:

- `apps/about/` → `/about/`
- `apps/accessibility/` → `/accessibility/`
- `apps/card-reference/` → `/card-reference/`
- `apps/changelog/` → `/changelog/`
- `apps/contact/` → `/contact/`
- `apps/deckbuilder/` → `/deckbuilder/`
- `apps/faq/` → `/faq/`
- `apps/factions/` → `/factions/`
- `apps/press/` → `/press/`
- `apps/privacy/` → `/privacy/`
- `apps/rulebook/` → `/rulebook/`
- `apps/rules/` → `/rules/`
- `apps/start/` → `/start/`
- `apps/playtest/` → `/playtest/`
- `packages/game-data/` → `/game-data/`
- maintained files under `packages/rules/` → stable `/rules/sources/...` paths where the publication contract explicitly materializes them
- `legacy/public-versions/v0.6.2/` → `/v0.6.2/`
- `legacy/public-versions/v0.6.3/` → `/v0.6.3/`
- `legacy/public-versions/v0.7.0/` → `/v0.7.0/`.

`config/` remains intentionally published where the publication contract requires it.

### 4. Versioned public routes follow release lifecycle authority

`config/release-lifecycle.json` determines whether a versioned public route is current, historical, or withdrawn. Historical browser source does not need to remain at repository root merely because its public URL is versioned.

### 5. Frozen releases stay frozen

Do not reorganize files inside published release packages for repository aesthetics. Historical compatibility fixes belong in browser/publication source boundaries; published release payloads remain immutable unless an explicit archival correction is approved.

### 6. Repeated release logic should converge

Version-specific scripts and workflows are acceptable when a release genuinely needs unique behavior. Repeated logic that differs only by version should converge toward parameterized tooling such as `release:build <version>`, `release:validate <version>`, and `print:build <version>`.

### 7. Generated binaries are not accidental authority

Large image, PDF, TTS, and other binary outputs should have an explicit lifecycle: canonical source asset, generated current artifact, frozen release artifact, or disposable build output. Binary-storage strategy is a separate cleanup tranche; do not rewrite Git history or introduce Git LFS casually.

## Machine-readable contracts

| Contract | Responsibility |
|---|---|
| `config/repository-architecture.json` | Top-level repository ownership, lifecycle role, target architectural group, and transition status |
| `config/publication-boundary.json` | Public/deployment graph: direct Pages roots, source-only roots, source→route mappings, materialized files, managed routes, versioned routes |
| `config/rules-surface-contract.json` | Relationship between canonical gameplay authority and active technical/teaching rules surfaces |
| `config/release-lifecycle.json` | Current/historical/withdrawn release lifecycle and current-release selection |

These contracts answer different questions and must not silently substitute for one another.

## Current path classification

### Authority and maintained source packages

| Path | Role |
|---|---|
| `packages/game-data/` | Complete current gameplay authority and adapters; staged publicly at `/game-data/` |
| `packages/rules/` | Maintained active rules source/support package: Player's Guide, Faction Guides, Comprehensive Rules, editorial policy, visual-pedagogy planning, rule-dependency fingerprint support, and current rule-fact derivation/synchronization; only explicitly materialized rules sources are staged to stable `/rules/sources/...` paths |
| `governance/` | Decision registry, schemas, traceability, and audit records |
| `config/` | Maintained cross-system configuration and contracts |

### Active applications and player-facing surfaces

| Path | Role |
|---|---|
| `apps/` | Canonical source container for maintained applications separated from deployed URL layout |
| `rules-assistant/` | Rules Arbiter implementation, retrieval, tests, and deployable endpoint; still transitional |
| `rules-arbiter/` | Current static Rules Arbiter browser shell; still transitional |
| `workers/` | Deployed support services |
| `src/` | Active rules-aware digital engine; historical implementations live under `legacy/` |

### Transitional legacy Rulebook boundary

| Path | Role |
|---|---|
| `rulebook/` | Legacy monolithic Rulebook source, version-specific compatibility support, and Rulebook QR assets. The current `/rulebook/` route is the modular v0.7.2 publication; maintained rules source/support lives under `packages/rules/`. This root remains transitional historical support rather than current rules authority. |

### Shared packages

| Path | Role |
|---|---|
| `packages/` | Canonical source container for maintained shared packages and authorities; currently contains `packages/game-data/` and `packages/rules/` |

### Production tooling

| Path | Role |
|---|---|
| `card-design/` | Card/component rendering and authoring; transitional toward shared rendering plus production-tool boundaries |
| `tts/` | TTS generation, packaging, renderer support, QA, and versioned release evidence |
| `scripts/` | Cross-project generation, validation, release, migration, and maintenance tooling |
| `.github/` | Repository automation, PR policy, CI, deployment, and workflow support |
| `tests/` | Repository-wide contract/regression harness; root placement is deliberate |
| `media/` | Reproducible media/composition configuration and export tooling; lifecycle still needs audit |

### Historical compatibility

| Path | Role |
|---|---|
| `legacy/` | Explicitly non-authoritative historical implementation/publication/source provenance. `legacy/rulebook-browser/` remains a transitional deployment shell for `/rulebook/`, but current rules content is supplied by the frozen v0.7.2 release package. |
| `legacy/public-compatibility/` | Canonical source for retired browser compatibility surfaces staged to stable public URLs |
| `legacy/public-versions/` | Canonical source for historical versioned browser surfaces staged to stable public URLs |
| `v0.7.1/` | Historical v0.7.1 versioned public entrypoint retained for release compatibility |
| `v0.7.2/` | Lifecycle-selected current versioned public entrypoint; lifecycle status is determined by `config/release-lifecycle.json` rather than repository placement |

### Frozen releases and evidence

| Path | Role |
|---|---|
| `releases/` | Immutable published release packages |
| `artifacts/` | Reconstruction/build/QA evidence pending retention audit |
| `tts/v*/` | Versioned TTS release artifacts/evidence, not current authoring authority |

### Documentation and assets

| Path | Role |
|---|---|
| `docs/` | Maintained project documentation plus explicitly archived historical development records |
| `images/` | Source and derived visual assets currently mixed; requires a dedicated asset-lifecycle audit |
| `assets/` | Shared site/component assets |
| root CSS/JS files | Shared public-site presentation served from stable root paths; eventual consolidation must preserve deployed URLs |

### Explicit historical engine/data boundaries

| Path | Current interpretation |
|---|---|
| `legacy/digital-prototype-data/` | Historical starter/adapter data; current gameplay authority is `packages/game-data/` |
| `legacy/digital-engine-reconstruction/` | Preserved v0.6.2/v0.6.3 engine reconstruction snapshots; historical provenance only |
| `legacy/digital-engine-migration/` | Superseded versioned engine migrations archived after relevant behavior was promoted or retired |
| `legacy/digital-engine-v06/` | Earlier playable v0.6-era engine and historical dev runners; not current digital-rules authority |
| `legacy/v0.6.1-rulebook-publication/` | Preserved v0.6.1 Rulebook proof/production system; historical publication provenance |
| `legacy/v0.6.4-candidate/` | Historical v0.6.4 candidate inputs/review records; not current gameplay authority <!-- DOC-HISTORICAL --> |

## Target architecture

```text
apps/
  about/
  accessibility/
  changelog/
  contact/
  faq/
  press/
  privacy/
  deckbuilder/
  card-reference/
  rulebook/
  factions/
  rules/
  start/
  playtest/
  digital/

packages/
  game-data/
  rules/
  rendering/
  shared-ui/

tools/
  release/
  print/
  tts/
  governance/

assets/
docs/
releases/
legacy/
```

This is a conceptual dependency target, not an instruction to move every existing directory immediately. Pages stages an explicit deployed tree, so source may move toward these boundaries while stable public URLs remain unchanged.

## Cleanup sequence

### Phase 1 — Classification and guardrails

- Document current path ownership and lifecycle.
- Mark legacy/historical surfaces explicitly.
- Prevent new current code from depending on retired authorities.
- Keep root ownership and deployment contracts machine-readable.

### Phase 2 — Source/deployment separation

- Keep Pages staging explicit and contract-driven rather than mirroring the repository.
- Preserve stable public URLs while source directories are consolidated.
- Validate managed deep links and staged dependencies.

### Phase 3 — Subsystem boundary cleanup

- Keep active rules source/support under `packages/rules/`; finish separating the residual historical Rulebook support/assets under `rulebook/` according to lifecycle.
- Finish retiring obsolete renderer-family compatibility/parity scaffolding.
- Make the active digital engine an obvious first-class application/package while keeping historical implementations quarantined.
- Consolidate true production tooling toward `tools/` only after caller/lifecycle classification is clear.

### Phase 4 — Release/tooling consolidation

- Inventory version-pinned release/build scripts and workflows.
- Move historical version-specific tooling into explicit legacy boundaries where appropriate.
- Parameterize repeated current release/print/TTS behavior.
- Retire obsolete automation only after replacement coverage is proven.

### Phase 5 — Asset and generated-output lifecycle

- Separate source artwork from generated card/TTS/site outputs.
- Decide which generated binaries belong in Git, release artifacts, external hosting, or disposable build output.

### Phase 6 — Root and file-level cleanup

- Remove obsolete root helpers and dead files after architectural placement is settled.
- Consolidate shared presentation assets where deployment permits.
- Clean naming, factoring, stale comments, duplicated utilities, and local organization only after top-down boundaries stabilize.

## Cleanup success criteria

A cleanup tranche is successful only when:

- required CI remains green;
- current public URLs continue to work;
- frozen release hashes/content are unchanged unless an archival correction is explicitly approved;
- no gameplay behavior changes without a governing decision;
- current authority becomes easier, not harder, to identify;
- duplicated route/source/tool inventories decrease rather than multiply;
- new repository roots remain non-public unless deliberately added to the publication contract; and
- an unfamiliar contributor can determine where a new change belongs from this document and the machine-readable contracts.

The objective is not the fewest directories or files. The objective is clear ownership, explicit lifecycle, reproducibility, and low-risk change.
