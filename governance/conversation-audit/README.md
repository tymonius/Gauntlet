# Conversation Audit

This directory is the evidence layer between Gauntlet design conversations and the formal decision registry.

- `corpus.json` records source-conversation metadata, dates, counts, and coverage boundaries.
- `attestation.json` records verified audit counts and effective status totals.
- `decision-index-*.md` contains normalized conversation decisions, their recorded status, summary, and evidence reference.
- `july-10-30-sources.json` records the retrieval method and authority boundary for the newer-conversation supplement.
- `status-overrides.json` records older threads whose effective status changed when a later explicit decision superseded them.
- `report.md` summarizes coverage and the handoff to canonical-source auditing.

`GNT-CONV-*` identifiers are audit-thread IDs, not canonical decision IDs. They preserve conversational provenance before a current decision is promoted into `governance/decision-registry.json` as a `GNT-DEC-*` record.

## Coverage boundary

The supplied raw export is user-turn complete from June 17 through July 9, 2026: nine conversations and 1,021 user turns.

July 10–30 received a separate comprehensive date-window audit across project conversation search, retained project context, and exact available snippets. That pass added 109 threads and expanded the post-export evidence set to 141 rows. Because no newer raw export was supplied, it is a comprehensive available-history decision audit rather than a provably complete turn-by-turn transcript inventory.

## Authority rule

Within a shared subject, the latest explicit approval, correction, or rejection controls. Older evidence remains visible, but `status-overrides.json` changes its effective status when a later thread supersedes it. Downstream audits must use the effective status rather than reading an older row's recorded status in isolation.

## Status meaning

A conversation thread effectively marked `current` means it is the latest known conversational intent within the available evidence. It does **not** mean the decision has been canonicalized, implemented, tested, or released. Those conclusions belong to the downstream decision-to-canonical-source and source-to-product audits.
