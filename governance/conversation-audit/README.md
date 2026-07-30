# Conversation Audit

This directory is the evidence layer between Gauntlet design conversations and the formal decision registry.

- `corpus.json` records source-conversation metadata, dates, counts, and coverage boundaries.
- `attestation.json` records verified counts, certification state, live-tail state, and effective status totals.
- `decision-index-*.md` contains normalized conversation threads, their recorded status, summary, and evidence reference.
- `july-10-30-sources.json` records the retrieval method and evidence boundary for the newer-conversation supplement.
- `live-tail.jsonl` is the append-only exact-user-turn ledger for Gauntlet work after live-tail activation.
- `live-tail-policy.md` defines capture, reconciliation, continuity, and authority rules for that ledger.
- `status-overrides.json` records older threads whose effective status changed when a later explicit decision superseded them.
- `report.md` summarizes coverage and the gate for canonical-source auditing.

`GNT-CONV-*` identifiers are audit-thread IDs, not canonical decision IDs. They preserve conversational provenance before a verified current decision is promoted into `governance/decision-registry.json` as a `GNT-DEC-*` record.

## Certification status

**The conversation audit is incomplete and is not certified for downstream canonicalization.**

The supplied raw export is user-turn complete from June 17 through July 9, 2026: nine conversations and 1,021 user turns.

The July 10–30 material was reconstructed from project-conversation search, retained project context, and available snippets. It produced 109 candidate threads and 141 post-export evidence rows, but those rows do not have a complete raw-turn corpus or verbatim line references. The unsupported fixed-three Asset Bank synthesis demonstrated that this evidence class cannot be treated as a completed conversation audit.

Until a fresh raw export covering July 10–30 is processed:

- all `project-conversation-search:*` rows are **provisional audit leads**, not certified decisions;
- they must not create or supersede a `GNT-DEC-*` record by themselves;
- they must not drive canonical-source or implementation changes without separate exact user-turn evidence;
- downstream decision-to-source and source-to-product completion claims are blocked.

## Rolling baseline and live tail

A delayed export is used as a historical baseline, not as the current endpoint. Exact Gauntlet user turns after live-tail activation are appended to `live-tail.jsonl` while work continues.

When the next export arrives, its raw turns are reconciled against the live tail. Overlap is deduplicated, unmatched rows are investigated, and any gap between the export's maximum timestamp and live-tail coverage blocks certification. The audit can therefore remain current even when export delivery is delayed, provided every intervening Gauntlet turn is captured.

Until the export arrives, Gauntlet design work should remain in this project conversation wherever practical. Any turn created elsewhere must also be appended to the live tail before it is relied on as evidence.

## Completion gate

The conversation audit becomes complete only when:

1. a raw export covers every Gauntlet conversation through its verified raw cutoff;
2. every user turn is inventoried exactly once;
3. every candidate decision has verbatim user-turn evidence and stable source-line references;
4. short approvals are linked to the exact preceding proposal;
5. rejected, superseded, tentative, and work-in-progress directions are retained and correctly classified;
6. every cross-period conflict is resolved through explicit supersession supported by raw evidence;
7. every live-tail row is reconciled or independently reviewed from exact transcript evidence;
8. continuous coverage from the prior raw cutoff through the certification cutoff is demonstrated with no unexplained gap;
9. an independent recheck finds no unsupported assistant synthesis in the effective-current set.

## Authority rule

Within a shared subject, the latest **verbatim-supported explicit user approval, correction, or rejection** controls. Older evidence remains visible, but an effective-status override is valid only when both the older thread and its replacement have exact raw evidence. Search-derived provisional leads cannot supersede raw-export records.

## Status meaning

A raw-evidence conversation thread marked `current` means it is the latest verified conversational intent within the audited corpus. It does **not** mean the decision has been canonicalized, implemented, tested, or released. Search-derived July rows remain provisional regardless of their printed status until raw evidence replaces their search references.
