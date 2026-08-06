# Gauntlet: Arena Documentation

This directory contains the active design and testing records for **Gauntlet: Arena**, the proposed four-player free-for-all mode for Gauntlet.

Arena is not part of the current canonical game. Until an Arena release is published, the current v0.6.2 package remains authoritative for standard two-player play.

## Current documents

- [Working Design Record](Gauntlet_Arena_Working_Design.md) — the current prototype model, provisional rules, unresolved questions, test boundaries, and revision history.

Additional documents should be added only when they acquire a distinct continuing purpose. Likely later records include:

- a rules-compatibility audit;
- a faction-adaptation matrix;
- a physical-prototype specification;
- structured playtest records; and
- an Arena rules and reference candidate.

Do not split those records out prematurely. The Working Design Record should remain the single source of truth during early exploration.

## Status and authority

Arena documents use three development states:

- **Prototype rule** — part of the current model and intended for the next Arena test.
- **Open question** — unresolved and requiring design work or testing.
- **Deferred** — deliberately excluded from the current prototype.

No Arena document overrides the canonical v0.6.2 rules outside an expressly identified Arena test. Arena inherits v0.6.2 rules, terminology, card text, Territory text, faction rules, and Leader rules except where an Arena document expressly replaces or supplements them.

## Development workflow

1. Record each proposed Arena rule in the Working Design Record.
2. Mark it as a Prototype rule, Open question, or Deferred.
3. Test the smallest coherent rules package that can answer the current questions.
4. Record evidence and revise the status of affected rules.
5. Split a subject into its own document only when it becomes too large or operationally distinct for the Working Design Record.
6. Do not propagate Arena rules into canonical v0.6.2 sources or generated artifacts.
7. Archive superseded Arena records rather than leaving multiple active authorities.

## Project tracking

Development progress is tracked in [issue #523](https://github.com/tymonius/Gauntlet/issues/523). The issue tracks work; the documents in this directory record the design.

## Release-number policy

Whichever major track first reaches publication quality becomes v0.7:

1. **Gauntlet: Arena**; or
2. the **Complete Illustrated Edition**.

The other becomes v0.8. Routine two-player balance changes, clarifications, and card corrections remain v0.6.x work until one of those major tracks is ready.
