# Repository Architecture

This document defines the intended repository shape for Gauntlet and classifies the major source, deployment, historical, generated, and authority boundaries so cleanup can proceed without breaking current releases, public URLs, or game/rules authority.

## Goals

Repository structure should make four things obvious:

1. **Where current authority lives.**
2. **Which applications and production systems are active.**
3. **Which paths exist only for historical compatibility or frozen releases.**
4. **Which files are generated outputs rather than hand-maintained sources.**

Cleanup is not a license to rewrite game behavior, mutate frozen releases, or break public URLs. Structural changes must preserve current behavior and keep required CI green.

## Architectural rules

### 1. Authority before surfaces

Current gameplay/rules authority lives in:

- `packages/game-data/current-game.json`
- `rulebook/player-facing/current-rulebook.md`
- `governance/` for binding decision provenance and cross-surface traceability

Published release snapshots under `releases/` are immutable historical evidence.

Browser pages, printable documents, card media, TTS assets, and digital implementations are derived or implementation surfaces. If they disagree with governing current authority, fix the authority when appropriate and regenerate or update the surface; do not silently promote a derived artifact into authority.

Current authority must also be **semantically surface-ready**. Active renderers and applications may reshape data for layout or UI convenience, but they must not silently relabel effects, merge gameplay branches, rewrite rules text, or otherwise repair current authority at runtime. Version-specific compatibility transforms belong only at explicit historical boundaries.

### 2. Current, historical, and generated paths must be distinguishable

Every maintained top-level subsystem should be classifiable as one of:

- **Authority** — hand-maintained canonical game/rules/governance source.
- **Active application** — current player-facing or developer-facing runtime.
- **Production tooling** — generators, renderers, release/build tooling, or validation.
- **Historical compatibility** — retained because an old public URL or supported historical tool must continue to function.
- **Frozen release** — immutable versioned publication.
- **Generated/evidence** — outputs that should be reproducible from maintained sources or retained as QA/release evidence.
- **Shared presentation assets** — source assets intentionally consumed across multiple public/application surfaces.

A path that cannot be classified cleanly is a cleanup target.

### 3. Public URLs are compatibility contracts, not source locations

Current public paths such as `/deckbuilder/`, `/rulebook/`, `/card-reference/`, `/factions/`, `/rules/`, `/start/`, `/playtest/`, and `/game-data/` must not move merely to make the source tree prettier.

`config/publication-boundary.json` is the machine-readable public/deployment contract. It defines:

- repository directories published directly to Pages;
- repository roots that are source-only and therefore non-public by default;
- canonical source-to-public route mappings;
- current managed deep-link routes whose tracked `index.html` surfaces must be inventoried exactly; and
- versioned public routes whose lifecycle status comes from `config/release-lifecycle.json`.

GitHub Pages staging, local/public-route compatibility materialization, and publication validation consume this contract rather than maintaining independent route inventories. New repository roots are therefore **non-public by default** unless the publication contract is deliberately changed.

Source organization may change independently of deployed URL layout, but every source move must preserve the corresponding stable public path where one exists. The current reference mappings include:

- `apps/card-reference/` → `/card-reference/`
- `apps/deckbuilder/` → `/deckbuilder/`
- `apps/factions/` → `/factions/`
- `apps/rules/` → `/rules/`
- `apps/start/` → `/start/`
- `apps/playtest/` → `/playtest/`
- `packages/game-data/` → `/game-data/`
- `legacy/public-versions/v0.6.2/` → `/v0.6.2/`
- `legacy/public-versions/v0.6.3/` → `/v0.6.3/`
- `legacy/public-versions/v0.7.0/` → `/v0.7.0/`
- retired compatibility sources under `legacy/public-compatibility/` → their stable historical browser routes.

`config/` remains an intentionally published Pages root in the current deployment contract. Older cleanup proposals that treated all configuration as inherently private are historical design evidence, not authority for current deployment behavior.

### 4. Versioned public routes follow release lifecycle authority

`config/release-lifecycle.json` determines whether a versioned public route is current, historical, or withdrawn. A historical or withdrawn landing may point players toward current tools, but it must not present its own release as current.

Historical browser source does not need to remain at repository root merely because its public URL is versioned. Pages stages historical source from `legacy/` while preserving stable version URLs. The lifecycle-selected current versioned entrypoint remains a first-class public surface until its lifecycle transitions.

### 5. Frozen releases stay frozen

Do not reorganize files inside published release packages for repository aesthetics. Historical compatibility fixes belong in browser/publication source boundaries; published release payloads remain immutable unless an explicit archival correction is approved.

### 6. Parameterize repeated release logic

Version-specific scripts and workflows are acceptable when a release genuinely needs unique behavior. Repeated logic that differs only by version should converge toward parameterized tooling such as:

```text
release:build <version>
release:validate <version>
print:build <version>
```

Cleanup should reduce duplicated implementations without erasing the evidence needed to reproduce historical releases.

### 7. Generated binaries should not become accidental source authority

Large image, PDF, TTS, and other binary outputs should have an explicit lifecycle:

- canonical source asset,
- generated current artifact,
- frozen release artifact, or
- disposable build output.

The repository contains a large binary footprint, especially under `images/`, `releases/`, and `tts/`. Binary-storage strategy is a separate cleanup tranche; do not rewrite Git history or introduce Git LFS casually because doing so would disrupt existing clones and release hashes.

## Machine-readable contracts

| Contract | Responsibility |
|---|---|
| `config/repository-architecture.json` | Top-level repository ownership, lifecycle role, target architectural group, and transition status |
| `config/publication-boundary.json` | Public/deployment graph: direct Pages roots, source-only roots, source→route mappings, managed deep links, versioned routes |
| `config/release-lifecycle.json` | Current/historical/withdrawn release lifecycle and current-release selection |

These contracts answer different questions and must not silently substitute for one another.

## Current path classification

### Authority

| Path | Role |
|---|---|
| `packages/game-data/` | Complete current gameplay authority and adapters; staged publicly at `/game-data/` |
| `rulebook/player-facing/` | Complete current Rulebook authority |
| `governance/` | Decision registry, schemas, traceability, audit records |
| `config/` | Maintained cross-system configuration and contracts; some files are intentionally deployed where the publication contract requires them |

### Active applications and player-facing surfaces

| Path | Role |
|---|---|
| `apps/` | Canonical source container for maintained applications separated from deployed URL layout; currently includes Card Reference, Deckbuilder, Factions, Rules, Start, and Playtest |
| `rulebook/` | Current rules authority plus browser/publication support; still transitional and requires a dedicated boundary audit |
| `rules-assistant/` | Rules Arbiter implementation, retrieval, tests, and deployable endpoint; still transitional |
| `rules-arbiter/` | Current static Rules Arbiter browser shell |
| `workers/` | Deployed support services |
| `src/` | Active rules-aware digital engine; quarantined historical engine implementations live under `legacy/` |
| `changelog/` | Current player-facing changelog |
| `about/` | Public project/about information surface |
| `accessibility/` | Public accessibility practices and known-limitations surface |
| `contact/` | Public contact form and submission confirmation surface |
| `faq/` | Public project FAQ surface |
| `press/` | Public press/media information and reference-asset surface |
| `privacy/` | Public privacy/data-handling notice |

### Shared packages

| Path | Role |
|---|---|
| `packages/` | Canonical source container for maintained shared packages and authorities; currently contains `packages/game-data/` |

### Production tooling

| Path | Role |
|---|---|
| `card-design/` | Card/component rendering and authoring; transitional toward a shared-rendering/package + production-tool split |
| `tts/` | TTS generation, packaging, renderer support, QA, and versioned release evidence |
| `scripts/` | Cross-project generation, validation, release, migration, and maintenance tooling |
| `.github/` | Repository automation, PR policy, CI, deployment, and workflow support |
| `tests/` | Cross-surface and release contract/regression harness; root placement is deliberate |
| `media/` | Reproducible media/composition configuration and export tooling; source/derived lifecycle still needs audit |

### Historical compatibility

| Path | Role |
|---|---|
| `legacy/` | Explicitly non-authoritative historical implementation/publication/source provenance |
| `legacy/public-compatibility/` | Canonical source for retired browser compatibility surfaces staged to stable public URLs |
| `legacy/public-versions/` | Canonical source for historical versioned browser surfaces staged to stable public URLs |
| `v0.7.1/` | Lifecycle-selected current versioned public entrypoint; transitions to historical when lifecycle authority changes |

The stable public routes `/deckbuilder-v0.5/`, `/deckbuilder-v0.6/`, `/faction-sheets/`, `/v0.6.2/`, `/v0.6.3/`, and `/v0.7.0/` do not require root-level repository source aliases.

### Frozen releases and evidence

| Path | Role |
|---|---|
| `releases/` | Immutable published release packages |
| `artifacts/` | Reconstruction/build/QA evidence pending retention audit |
| `tts/v*/` | Versioned TTS release artifacts/evidence; not current authoring authority |

### Documentation and project records

| Path | Role |
|---|---|
| `docs/` | Maintained project documentation plus explicitly archived historical development records; not gameplay authority unless a governing source says otherwise |

### Assets and shared presentation

| Path | Role |
|---|---|
| `images/` | Source and derived visual assets currently mixed; requires a dedicated asset-lifecycle audit |
| `assets/` | Shared site/component assets |
| root CSS/JS files | Shared public-site presentation served from stable root paths; eventual consolidation must preserve deployed URLs |

### Explicit historical engine/data boundaries

| Path | Current interpretation |
|---|---|
| `legacy/digital-prototype-data/` | Historical starter/adapter data; current gameplay authority is `packages/game-data/` |
| `legacy/digital-engine-reconstruction/` | Preserved clean v0.6.2/v0.6.3 engine reconstruction snapshots; historical provenance only | <!-- DOC-HISTORICAL -->
| `legacy/digital-engine-migration/` | Superseded versioned engine migrations archived after relevant behavior was promoted or retired | <!-- DOC-HISTORICAL -->
| `legacy/digital-engine-v06/` | Earlier playable v0.6-era engine and historical dev runners; not current digital-rules authority | <!-- DOC-HISTORICAL -->
| `legacy/v0.6.1-rulebook-publication/` | Preserved v0.6.1 Rulebook proof/production system; historical publication provenance | <!-- DOC-HISTORICAL -->
| `legacy/v0.6.4-candidate/` | Historical v0.6.4 candidate inputs/review records; not current gameplay authority | <!-- DOC-HISTORICAL -->

## Target architecture

The long-term conceptual dependency shape is:

```text
apps/
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

This is a **conceptual dependency target, not an instruction to move every existing directory immediately**. Pages stages an explicit deployed tree, so application, package, and tooling source may move toward these boundaries while stable public URLs remain unchanged.

## Cleanup sequence

### Phase 1 — Classification and guardrails

- Document current path ownership and lifecycle.
- Mark legacy/historical surfaces explicitly.
- Prevent new current code from depending on retired authorities.
- Keep repository-root ownership and public/deployment contracts machine-readable.

### Phase 2 — Source/deployment separation

- Keep GitHub Pages staging explicit and contract-driven rather than mirroring the repository.
- Preserve stable public URLs while source directories are consolidated.
- Validate managed deep links and local staged dependencies.
- Keep versioned public route semantics aligned with release lifecycle authority.

### Phase 3 — Subsystem boundary cleanup

- Separate Rulebook authority from browser/production support.
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
- Consider Git LFS only as a deliberate migration, not cosmetic cleanup.

### Phase 6 — Root and file-level cleanup

- Remove obsolete root helpers and dead files after architectural placement is settled.
- Consolidate shared presentation assets where deployment permits.
- Clean naming, factoring, stale comments, duplicated utilities, and local organization only after top-down boundaries stabilize.

## Cleanup success criteria

A cleanup tranche is successful only when:

- required CI remains green;
- current public URLs continue to work;
- frozen release hashes/content are unchanged unless an archival correction was explicitly approved;
- no gameplay behavior changes without a governing decision;
- current authority becomes easier, not harder, to identify;
- duplicated route/source/tool inventories decrease rather than multiply;
- new repository roots remain non-public unless deliberately added to the publication contract; and
- an unfamiliar contributor can determine where a new change belongs from this document and the machine-readable contracts.

The objective is not the fewest directories or files. The objective is **clear ownership, explicit lifecycle, reproducibility, and low-risk change**.
