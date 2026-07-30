# Exported Conversation Audit

This directory preserves the provenance baseline for the nine Gauntlet conversations selected from the July 2026 ChatGPT export.

The audit exists to prevent remembered chat conclusions, stale drafts, or plausible interpretations from silently replacing committed project decisions.

## Contents

- `source-manifest.json` — immutable fingerprints and turn counts for the selected source transcripts. The raw transcripts remain outside the repository because they contain full private conversation history.
- `evidence/index.json` — extraction method, counts, and per-conversation evidence files.
- `evidence/*.json.gz.b64` — base64-encoded gzip JSON containing 715 decision-bearing user turns, including the preceding assistant context needed to interpret short approvals such as “Agreed.”
- `decision-ledger.json` and `decision-ledger/*.json` — 73 reconciled subject-level outcomes classified as current, superseded, rejected, deferred, implemented, or watchlisted.

## Authority

The evidence corpus and reconciled ledger are **provenance**, not a substitute for canonical rules.

Order of authority:

1. current decision registry and explicit supersession records;
2. current canonical source and released rules;
3. current traceability status;
4. this reconciled conversation ledger;
5. raw conversation evidence;
6. older drafts, generated outputs, or assistant proposals.

A ledger entry marked `current-*` describes the audit result at the time of reconciliation. It becomes a governed implementation decision only through the normal transaction defined in `governance/README.md`: decision ID, canonical source, traceability, product surfaces, and tests.

## Method

All 1021 user turns from the nine selected transcripts were parsed. A deterministic first pass retained explicit approvals, rejections, constraints, deferrals, supersessions, and imperative change instructions. The resulting 715 evidence records were then reconciled by subject against the current repository.

The comparison conversation about *Old King's Crown* yielded no explicit user approval, rejection, or binding Gauntlet change, so it remains source context with zero decision-evidence records.

## Integrity

Run:

```bash
npm run governance:check
```

The conversation-audit validator checks:

- source and conversation uniqueness;
- evidence-file counts and classification totals;
- deterministic hashes of every retained user statement;
- unique evidence and ledger IDs;
- ledger references to existing evidence records;
- declared entry and outcome counts.

The raw transcript hashes in `source-manifest.json` can be compared against the original export files when they are available, but the private transcripts themselves are not committed.
