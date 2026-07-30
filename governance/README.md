# Gauntlet Decision Governance

This directory is the authoritative provenance layer between design discussion, canonical game data, implementation, and released player-facing material.

It exists because a passing test suite can still validate the wrong design when both the implementation and its tests were derived from an obsolete record.

## Files

- `conversation-audit/` — normalized conversation decisions, source hashes, coverage limits, and exact transcript-line evidence.
- `decision-registry.json` — immutable decision records with stable IDs, evidence, status, subjects, and explicit supersession.
- `traceability.json` — the implementation matrix for each governed subject.
- `schemas/` — JSON Schemas for editors and external tooling.
- `.github/scripts/validate-governance.py` — the canonical and implementation integrity gate.
- `.github/scripts/validate-conversation-audit.py` — the conversation-evidence integrity gate.

## Provenance layers

Governance proceeds in this order:

1. **Conversation → decision thread:** `GNT-CONV-*` records preserve the latest known intent, superseded directions, rejections, tentative ideas, and exact evidence.
2. **Decision thread → formal decision:** a binding current thread is mapped or promoted to an immutable `GNT-DEC-*` record.
3. **Formal decision → canonical source:** the governing rule, card record, guide, or specification is updated.
4. **Canonical source → product surfaces:** engine, tests, Deckbuilder, references, print/art, and release files are reconciled in `traceability.json`.

A `GNT-CONV-*` thread is evidence, not a canonical decision. Its `current` status means only “latest known conversational intent within the available corpus.” It does not establish that the subject is canonicalized, implemented, tested, or released.

The initial conversation audit is raw-turn complete for the supplied nine-conversation export from June 17 through July 9, 2026. July 10–30 decisions are supplemented from exact project snippets and retained project context, but that period is not raw-turn complete until a newer export is added.

## Decision IDs

Use this format:

```text
GNT-DEC-YYYY-MMDD-NNN
```

IDs are never reused. A correction creates a new decision and lists the older decision in `supersedes_decision_ids`. A rename or replacement may also list retired game objects in `supersedes_subjects`.

Do not rewrite an old decision to make history look cleaner. Change its status to `superseded` only in the same pull request that records the replacement decision.

## Lifecycle

These words are not interchangeable:

| Status | Meaning |
|---|---|
| `proposed` | Under discussion; not binding. |
| `approved` | The design decision is binding but has not yet been written into the canonical game source. |
| `canonicalized` | The governing source has been updated. Product implementations may still be incomplete. |
| `implemented` | Required engine behavior and tests match the canonical record. Unknown release surfaces remain explicitly unknown. |
| `released` | Every required player-facing surface for the release is complete. |
| `quarantined` | Canonical intent exists, but an implementation is unavailable because correctness cannot yet be guaranteed. |
| `superseded` | Replaced by a newer decision ID. |
| `deprecated` | Retained only for compatibility or history. |

A card or rule is not “implemented” merely because a module exists. It must have complete canonical, rules-reference, engine, and test surfaces in `traceability.json`.

## Required workflow for an approved design change

The approval and its repository record are one transaction:

1. Add a decision to `decision-registry.json`.
2. Update the canonical source named by that decision.
3. Add or update the subject in `traceability.json`.
4. Update every affected product surface, or mark each one explicitly as `unknown`, `in_progress`, `not_implemented`, `not_applicable`, or `quarantined`.
5. Add tests derived from the exact canonical record.
6. Run:

   ```bash
   npm run governance:check
   npm run typecheck
   npm test
   ```

7. Include the decision ID and exact governing record in the pull request.

Do not say a decision was “recorded,” “canonicalized,” or “implemented” until the corresponding repository state is committed.

## Conflict rule

When chat history, a working document, canonical data, generated reference, or implementation disagree:

1. do not choose the most plausible interpretation;
2. mark the implementation surface `quarantined` or `in_progress`;
3. record the conflict in an issue;
4. create a superseding decision when the current rule is resolved.

Unknown means unavailable, not guessed.

## Traceability surfaces

Every governed subject records these surfaces:

- `canonical`
- `rules_reference`
- `engine`
- `deckbuilder`
- `print_art`
- `tests`

`unknown` is an honest temporary status. It is not equivalent to complete.

The integrity gate is currently strict for every subject declared in `traceability.json`. It is not yet a claim that every historical Gauntlet discussion has been reconciled through every downstream layer. The conversation audit establishes the input set; project-wide backfill must still map current threads into formal decisions and reconcile canonical and product surfaces before coverage changes from `declared-subjects` to `project-wide`.

## Current-source guards

A decision may declare obsolete terms or IDs that must not reappear in active sources. Historical releases are outside the guard roots unless deliberately included. Any compatibility exception must name its exact allowed path.

Bombardment is the first guarded rename: current v0.6 sources may not restore the obsolete Neutral Siege Weaponry identity, while one explicit legacy Overlay identifier remains permitted for old saved games.

## Pull-request gate

Rules, card, terminology, and release changes must complete `.github/pull_request_template.md` and pass the **Governance Integrity** workflow.

A non-rules change may use `Decision ID: N/A`, but must explain why it has no game-design or canonical-data effect.
