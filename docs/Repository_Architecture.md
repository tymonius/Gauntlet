# Repository Architecture

This document defines the intended repository shape for Gauntlet and classifies the existing top-level surfaces so cleanup work can proceed without breaking current releases, public URLs, or rules authority.

## Goals

Repository cleanup should make four things obvious:

1. **Where current authority lives.**
2. **Which applications and production systems are active.**
3. **Which paths exist only for historical compatibility or frozen releases.**
4. **Which files are generated outputs rather than hand-maintained sources.**

Cleanup is not a license to rewrite game behavior, mutate frozen releases, or break public URLs. Structural changes must preserve current behavior and keep required CI green.

## Architectural rules

### 1. Authority before surfaces

Current gameplay authority lives in:

- `game-data/current-game.json`
- `rulebook/player-facing/current-rulebook.md`
- `governance/` for binding decision provenance and cross-surface traceability

Published release snapshots under `releases/` are immutable historical evidence.

Browser pages, printable documents, card media, TTS assets, and digital implementations are derived or implementation surfaces. If they disagree with governing current authority, fix the authority when appropriate and regenerate or update the surface; do not silently promote a derived artifact into authority.

### 2. Current, historical, and generated paths must be distinguishable

Every maintained top-level subsystem should be classifiable as one of:

- **Authority** — hand-maintained canonical game/rules/governance source.
- **Active application** — current player-facing or developer-facing runtime.
- **Production tooling** — generators, renderers, release/build tooling, or validation.
- **Historical compatibility** — retained because an old public URL or supported historical tool must continue to function.
- **Frozen release** — immutable versioned publication.
- **Generated/evidence** — outputs that should be reproducible from maintained sources or retained as QA/release evidence.

A path that cannot be classified cleanly is a cleanup target.

### 3. Public URLs are compatibility contracts

Current public paths such as `/deckbuilder/`, `/rulebook/`, `/card-reference/`, `/factions/`, `/start/`, and `/playtest/` must not move merely to make the source tree prettier.

The long-term architecture may separate source applications from deployed Pages output, but that migration must first make deployment explicit and preserve stable URLs.

### 4. Frozen releases stay frozen

Do not reorganize files inside published release packages for repository aesthetics.

Historical redirect/compatibility shells may remain at root when they are serving a public versioned URL. Their presence should be documented rather than mistaken for current source.

### 5. Parameterize repeated release logic

Version-specific scripts and workflows are acceptable when a release genuinely needs unique behavior. Repeated logic that differs only by version should converge toward parameterized tooling such as:

```text
release:build <version>
release:validate <version>
print:build <version>
```

The cleanup should reduce duplicated implementations without erasing the evidence needed to reproduce historical releases.

### 6. Generated binaries should not become accidental source authority

Large image, PDF, TTS, and other binary outputs should have an explicit lifecycle:

- canonical source asset,
- generated current artifact,
- frozen release artifact, or
- disposable build output.

The repository currently contains a large binary footprint, especially under `images/`, `releases/`, and `tts/`. Binary storage strategy is a separate cleanup tranche; do not rewrite Git history or introduce Git LFS casually because doing so would disrupt existing clones and release hashes.

## Current path classification

### Authority

| Path | Role |
|---|---|
| `game-data/` | Complete current gameplay authority and adapters |
| `rulebook/player-facing/` | Complete current Rulebook authority |
| `governance/` | Decision registry, schemas, traceability, audit records |
| `config/` | Maintained configuration used by production/tooling where explicitly referenced |

### Active applications and player-facing surfaces

| Path | Role |
|---|---|
| `deckbuilder/` | Current Deckbuilder |
| `card-reference/` | Current card/Territory reference |
| `factions/` | Current faction discovery/reference surface |
| `start/` | Current onboarding/start surface |
| `rulebook/` | Current browser Rulebook plus maintained source |
| `rules-assistant/` | Rules Arbiter implementation |
| `playtest/` | Current playtest browser surfaces |
| `workers/` | Deployed support services |
| `src/` | Active rules-aware digital engine; older modules within it may still be transitional/historical and must be classified during engine cleanup |

### Production tooling

| Path | Role |
|---|---|
| `card-design/` | Card/component rendering and authoring |
| `tts/` | TTS generation, packaging, renderer support, QA |
| `scripts/` | Cross-project generation, validation, release, migration, and maintenance tooling |
| `rulebook-production/` | Rulebook production support |
| `rulebook-design/` | Rulebook visual/design support |
| `.github/workflows/` | CI, deployment, publication, and generation automation |
| `tests/` | Cross-surface and release contract tests |

### Historical compatibility

| Path | Role |
|---|---|
| `deckbuilder-v0.5/` | Historical pre-faction Deckbuilder compatibility |
| `deckbuilder-v0.6/` | Historical faction-era compatibility surface |
| `v0.6.2/` | Historical public/versioned surface |
| `v0.6.3/` | Historical public/versioned surface |
| `v0.7.0/` | Versioned public entry/compatibility surface |

These paths should not receive new product behavior except explicit compatibility fixes.

### Frozen releases and evidence

| Path | Role |
|---|---|
| `releases/` | Immutable published release packages |
| `artifacts/` | Reconstruction/build/QA evidence; each subtree should be audited for retention need |
| `tts/v*/` | Versioned TTS release artifacts/evidence; do not treat as authoring source |

### Assets and shared presentation

| Path | Role |
|---|---|
| `images/` | Source and derived visual assets currently mixed; requires a dedicated asset-lifecycle audit |
| `assets/` | Shared site/component assets |
| root CSS/JS files | Shared public-site presentation currently served from stable root paths; eventual consolidation must preserve deployed URLs |

### Legacy / ambiguous data

| Path | Current interpretation |
|---|---|
| `legacy/digital-prototype-data/` | Historical starter/adapter data; current gameplay authority is `game-data/` |
| version-pinned scripts/workflows | Historical and current production logic are mixed; candidates for parameterization |
| root-level presentation files | Current deployment dependencies mixed with source organization concerns |

## Target architecture

The long-term conceptual architecture is:

```text
apps/
  deckbuilder/
  card-reference/
  rulebook/
  factions/
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

This is a **conceptual dependency target, not an instruction to move every existing directory immediately**. The current GitHub Pages deployment depends on stable root paths. Source/deploy separation must be introduced before current public applications can safely move under `apps/`.

## Cleanup sequence

### Phase 1 — Classification and guardrails

- Document current path ownership and status.
- Mark legacy/historical surfaces explicitly.
- Add lightweight checks that prevent new current code from depending on retired authorities.
- Identify large generated/binary areas and their retention requirements.

### Phase 2 — Tooling consolidation

- Inventory version-pinned release/build scripts and workflows.
- Extract shared release/print/TTS functions.
- Parameterize repeated version-only behavior.
- Retire obsolete workflows after proving replacement coverage.

### Phase 3 — Source/deployment separation

- Define explicit build output for GitHub Pages.
- Preserve current public URLs.
- Move application source into clearer package boundaries only after deployment no longer depends on source-tree location.

### Phase 4 — Digital-engine boundary

- Make the active digital engine an obvious first-class application/package.
- Quarantine transitional v0.6.x implementation evidence from current v0.7.x behavior.
- Remove or archive genuinely dead digital prototype code once parity tests prove it is no longer needed.

### Phase 5 — Asset lifecycle

- Separate source artwork from generated card/TTS/site outputs.
- Decide which generated binaries belong in Git, release artifacts, external hosting, or another storage mechanism.
- Consider Git LFS only as a deliberate migration, not as a cosmetic cleanup.

### Phase 6 — Root cleanup

- Remove obsolete root helpers.
- Consolidate shared site presentation assets where deployment permits.
- Leave only repository entrypoints, project configuration, and intentionally stable public assets at root.

## Cleanup success criteria

A cleanup tranche is successful only when:

- required CI remains green;
- current public URLs continue to work;
- frozen release hashes/content are unchanged unless an archival correction was explicitly approved;
- no game behavior changes without a governing decision;
- current authority becomes easier, not harder, to identify;
- the number of duplicated implementations decreases;
- an unfamiliar contributor can determine where a new change belongs from this document and `CONTRIBUTING.md`.

The objective is not the fewest directories or files. The objective is **clear ownership, explicit lifecycle, reproducibility, and low-risk change**.
