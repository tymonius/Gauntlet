# Conversation Audit

This directory is the evidence layer between raw Gauntlet design conversations and the formal decision registry.

- `corpus.json` records source-conversation metadata, hashes, dates, and coverage boundaries.
- `attestation.json` records the verified generation counts and hashes of the full audit artifacts.
- `decision-index-*.md` contains all normalized conversation decisions, their status, summary, and exact source-line references.
- `report.md` summarizes coverage and the handoff to canonical-source auditing.

`GNT-CONV-*` identifiers are audit-thread IDs, not canonical decision IDs. They preserve conversational provenance before a current decision is promoted into `governance/decision-registry.json` as a `GNT-DEC-*` record.

## Coverage boundary

The supplied raw export is user-turn complete from June 17 through July 9, 2026: nine conversations and 1,021 user turns. Later July decisions are included only where exact project-conversation snippets or retained project context were available. The audit must not be described as raw-turn complete after July 9 until a newer export is added.

## Status meaning

A conversation thread marked `current` means it is the latest known conversational intent within the available evidence. It does **not** mean the decision has been canonicalized, implemented, tested, or released. Those conclusions belong to the downstream decision-to-canonical-source and source-to-product audits.
