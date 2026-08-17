# Gauntlet: Arena Documentation

This directory contains the active design and testing records for **Gauntlet: Arena**, the proposed four-player free-for-all mode for Gauntlet.

Arena is not part of the current canonical game. Until an Arena release is published, **Gauntlet v0.6.3** remains authoritative for standard two-player play.

## Current documents

- [Working Design Record](Gauntlet_Arena_Working_Design.md) — the Arena-specific prototype model, provisional rules, unresolved questions, test boundaries, and revision history. It was originally authored against the v0.6.2 two-player baseline.
- [v0.6.3 Baseline Migration](Gauntlet_Arena_v0.6.3_Baseline_Migration.md) — the current compatibility overlay that identifies how the inherited two-player baseline changed in v0.6.3 and which Arena subjects require explicit translation before the next prototype test.

The Working Design Record remains the source of Arena-specific prototype decisions. Where it merely inherits or names v0.6.2 as the standard-game baseline, the v0.6.3 Baseline Migration supersedes that inherited baseline. It does **not** silently rewrite an Arena-specific prototype rule.

Additional documents should be added only when they acquire a distinct continuing purpose. Likely later records include:

- a faction-adaptation matrix;
- a physical-prototype specification;
- structured playtest records; and
- an Arena rules and reference candidate.

## Status and authority

Arena documents use three development states:

- **Prototype rule** — part of the current Arena model and intended for the next test unless the compatibility overlay identifies a required reconciliation first.
- **Open question** — unresolved and requiring design work or testing.
- **Deferred** — deliberately excluded from the current prototype.

No Arena document overrides canonical v0.6.3 two-player play outside an expressly identified Arena test. For the next Arena prototype, inherit current v0.6.3 rules, terminology, card text, Territory text, faction rules, and Leader rules except where an Arena-specific prototype rule expressly replaces or supplements them.

The older v0.6.2 inheritance statements in the Working Design Record are provenance from the prototype's original baseline, not permission to use withdrawn or stale two-player rules in a new Arena test.

## Development workflow

1. Treat v0.6.3 as the current inherited two-player baseline.
2. Record each proposed Arena-specific rule in the Working Design Record.
3. Mark it as a Prototype rule, Open question, or Deferred.
4. Use the v0.6.3 Baseline Migration to identify inherited-rule changes that require explicit Arena reconciliation.
5. Test the smallest coherent rules package that can answer the current questions.
6. Record evidence and revise the status of affected rules.
7. Split a subject into its own document only when it becomes too large or operationally distinct for the Working Design Record.
8. Do not propagate Arena rules into canonical v0.6.3 sources or generated artifacts.
9. Archive superseded Arena records rather than leaving multiple active authorities.

## Project tracking

Development progress is tracked in [issue #523](https://github.com/tymonius/Gauntlet/issues/523). The issue tracks work; the documents in this directory record the design.

## Release-number policy

Whichever major track first reaches publication quality becomes v0.7:

1. **Gauntlet: Arena**; or
2. the **Complete Illustrated Edition**.

The other becomes v0.8. Routine two-player balance changes, clarifications, and card corrections remain v0.6.x work until one of those major tracks is ready.
