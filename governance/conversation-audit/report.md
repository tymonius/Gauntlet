# Gauntlet Conversation-to-Decision Audit

**Audit date:** 2026-07-30  
**Certification status:** **INCOMPLETE — NOT AUTHORIZED FOR DOWNSTREAM CANONICALIZATION**  
**Raw corpus:** 9 exported Gauntlet conversations, 1,021 user turns, 2026-06-17 through 2026-07-09  
**July 10–30 material:** provisional search/context lead inventory pending a fresh raw export

## Corrected result

The raw export remains completely indexed at the user-turn level through July 9. Every raw user turn has a stable source location, timestamp, excerpt hash, audit classification, and zero or more decision-thread links.

The July 10–30 pass added 109 candidate threads and 141 search/context evidence rows, but it did **not** have a complete raw-turn corpus or verbatim line references. The discovery of an unsupported fixed-three Asset Bank claim proves that this supplement cannot be treated as a completed conversation audit.

Therefore:

- the conversation audit is reopened;
- every `project-conversation-search:*` row is provisional regardless of its printed status;
- the July candidate ledger cannot create or supersede formal decisions by itself;
- the three search-derived effective-status overrides must be revalidated from raw evidence before downstream use;
- decision-to-canonical-source and source-to-product completion claims are blocked until the raw July audit is complete.

## Known correction

The Asset Bank limit remains tied to controlled Territories. The former fixed-three statement was an unsupported assistant-generated synthesis and was removed. This error is the reason the July evidence class has been quarantined rather than merely caveated.

## Structural ledger totals

These counts describe the committed ledger structure; they do **not** certify the July rows as decisions:

- normalized thread rows: 335
- raw-export-supported threads: 226
- July candidate threads: 109
- raw-export user turns: 1,021
- raw-export decision-evidence links: 489
- provisional July search/context rows: 141
- recorded effective-status overrides requiring raw revalidation: 3

The currently printed effective-status totals are retained for traceability but are not an authoritative current-decision set until the July candidate rows are reaudited from raw transcripts.

## Evidence rules

1. A short confirmation is interpreted only with its immediately preceding assistant proposal.
2. Tentative language is not promoted merely because a later assistant summary sounds confident.
3. Rejections and superseded directions remain in the ledger.
4. Within one subject, only the latest explicit user approval, correction, or rejection with verbatim evidence controls.
5. Implementation existence, a passing test, retained memory, or assistant inference does not create a design decision.
6. A search/context row is an audit lead, not proof of a decision.
7. A search/context row cannot supersede a raw-export row.
8. Raw-turn completeness is claimed only through July 9 until a newer export is processed.

## Required completion work

The conversation audit is complete only after all of the following are done:

1. obtain and process a fresh raw ChatGPT export covering every Gauntlet conversation through July 30;
2. identify every Gauntlet-related conversation by title and content, not only the previously prioritized titles;
3. inventory every user turn exactly once;
4. regenerate the July 10–30 decision threads from verbatim turns;
5. replace every `project-conversation-search:*` reference with stable raw source-line evidence or remove the unsupported row;
6. re-evaluate every approval, rejection, tentative direction, and supersession in chronological context;
7. independently inspect every effective-current thread for assistant-added synthesis;
8. compare the regenerated result against the current 109-row lead inventory and explain every addition, deletion, merge, split, or status change;
9. rerun the validator and certify the corpus only when no provisional evidence remains.

## Integrity result

The validator checks structural integrity, counts, IDs, source formats, and the certification state. A passing structural check does **not** mean the conversation audit is complete. While `certification_status` is `incomplete`, it must report that downstream canonicalization remains blocked.

## Downstream gate

Do **not** begin or claim completion of the decision-to-canonical-source audit from the 271 printed-current count. The only safe downstream inputs are:

- raw-export-supported threads through July 9; and
- later decisions independently backed by exact user-turn evidence outside the provisional search ledger.

Full downstream work resumes only after the fresh July raw export is audited and the attestation is changed to `complete` through a reviewed pull request.
