# Gauntlet Conversation-to-Decision Audit

**Audit date:** 2026-07-30  
**Verbatim corpus:** 9 exported Gauntlet conversations, 1,021 user turns, 2026-06-17 through 2026-07-09  
**Post-export supplement:** project-conversation search and retained project context through 2026-07-30

## Result

The supplied raw export has been completely indexed at the user-turn level. Every user turn was assigned a stable source location, timestamp, excerpt hash, audit classification, and zero or more normalized decision-thread links during generation.

The audit identifies **226 normalized decision threads**. It deliberately retains current, superseded, rejected, deferred, tentative, and deprecated decisions so discarded ideas cannot be mistaken for current design. Explicit short approvals were attached to the immediately preceding proposal instead of being treated as context-free assent.

The post-July-9 supplement is not a raw-turn-complete export. Decisions are included only where exact project snippets or conversation-search records were available. Therefore this audit is **complete for the supplied export**, but not a mathematically complete raw transcript inventory for July 10–30 until a newer export is added.

## Decision-thread status

- `current`: 173
- `superseded`: 42
- `tentative`: 6
- `deferred`: 3
- `rejected`: 1
- `deprecated`: 1

## Turn routing

- `decision-evidence`: 450
- `feedback-or-context`: 224
- `question-or-analysis`: 138
- `workflow-instruction`: 90
- `contextual-acknowledgement`: 69
- `tentative-or-open`: 26
- `rejection-or-constraint`: 24

## Audit rules

1. A short confirmation is interpreted only with its immediately preceding assistant proposal.
2. Tentative language is not promoted to a current decision merely because the assistant later summarized it confidently.
3. Rejections and superseded directions remain in the ledger.
4. Conversation-search summaries after July 9 are lower-fidelity than the verbatim export and are labeled separately.
5. A `current` conversation thread means “latest known conversational intent,” not “canonicalized” or “implemented.”
6. Implementation instructions are recorded when they establish durable architecture or product requirements; routine command execution remains workflow.

## Integrity result

The generation audit accounted for all 1,021 verbatim user turns exactly once in the turn inventory. It produced 489 verbatim decision-evidence links and found no decision-or-approval turn left unattached after the short-approval reconciliation pass. The hashes of the complete generated decision-thread ledger, turn index, and compressed evidence bundle are recorded in `attestation.json`.

## Next audit layer

Use the five `decision-index-*.md` files as the input set for the decision-to-canonical-source audit. For every `current` thread, do exactly one of the following:

- map it to an existing immutable `GNT-DEC-*` record and governing source;
- create the missing decision record; or
- quarantine it when conversation evidence conflicts or lacks sufficient specificity.

Do not change governance coverage to `project-wide` until the post-export raw-turn gap and every canonical and product surface are reconciled.
