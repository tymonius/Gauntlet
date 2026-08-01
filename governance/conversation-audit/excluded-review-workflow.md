# Excluded-conversation review workflow

The fresh July 31 export contains 287 unique conversations. The recall-oriented extractor selected 67 and excluded 220, but a confirmed false negative proves that classifier exclusion cannot establish irrelevance.

This workflow produces complete exact-turn evidence for every excluded conversation before the conversation audit can be certified.

## Privacy boundary

**No ChatGPT conversation history may be stored in the Gauntlet repository.**

The export ZIP, conversation shards, selected transcripts, generated inventories, manifests, JSONL review chunks, and any other files containing conversation text or account-wide conversation metadata must remain outside the repository and must not be attached to GitHub issues or pull requests.

The extractor enforces this boundary by refusing to read private inputs from, or write private outputs into, the repository tree. `.gitignore` also blocks the known private input and output filenames as defense in depth.

The repository may retain only generic audit tooling and non-content aggregate conclusions needed to govern the project. It must not retain transcript text, conversation titles, message text, account-wide inventories, or raw conversation identifiers.

## Generate the private review corpus

Run from the repository root with the original ChatGPT export ZIP and the directory containing the three `selected_transcripts_part_*.md` files. All paths containing private data must be outside the repository:

```powershell
py .github/scripts/build-excluded-conversation-review.py `
  "C:\Users\tymon\Private\chatgpt export.zip" `
  --selected-transcripts "C:\Users\tymon\Private\gauntlet_audit_export" `
  --output "C:\Users\tymon\Private\gauntlet_audit_export\excluded-review"
```

The source may also be an extracted export directory or one `conversations-###.json` shard; sibling shards are discovered automatically.

## Private outputs

The tool writes outside the repository:

- `excluded_conversation_review_manifest.json` — source shards, counts, coverage assertions, chunk hashes, and review-policy assertions;
- `excluded_conversations_review_inventory.csv` — one sortable row per excluded conversation;
- `excluded_conversation_review_part_###.jsonl` — exact user turns plus immediate assistant context.

Each JSONL conversation record includes:

- stable conversation and message IDs;
- title and timestamps;
- every user-message node in the export mapping;
- whether each turn is on the conversation’s current path;
- the nearest preceding assistant message;
- the first following assistant message on each relevant branch;
- SHA-256 hashes for every preserved text field and complete conversation record;
- a signal score used only to prioritize private review.

The signal score must never exclude, include, certify, or canonicalize a conversation. Every excluded conversation is emitted regardless of score.

## Required validation

For the July 31 export, the private generated manifest must report:

- `total_unique_conversations: 287`;
- `selected_conversations: 67`;
- `excluded_conversations: 220`;
- `all_exported_conversation_ids_accounted_for: true`;
- `selected_and_excluded_disjoint: true`.

Any disagreement means the review corpus was built from the wrong export or transcript selection and must not be used.

## Review and promotion rules

1. Review every excluded conversation privately, beginning with the highest signal scores but continuing through all zero-score rows.
2. Add every Gauntlet false negative to the private working corpus.
3. Record private dispositions for all excluded conversations; do not publish the account-wide inventory.
4. Remove known unrelated false-positive conversations from the private candidate corpus.
5. Only after selection review is complete may the July 10–30 decision ledger be rebuilt from raw turns.
6. Search-derived `project-conversation-search:*` evidence may be replaced only by privately verified raw message evidence or removed.
7. Certification remains incomplete until status recomputation, supersession review, post-export tail reconciliation, and independent assistant-synthesis review are also complete.
8. GitHub receives only final project decisions and aggregate audit status, never the underlying private conversation history.
