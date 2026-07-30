# Gauntlet Conversation-to-Decision Audit

**Audit date:** 2026-07-30  
**Raw corpus:** 9 exported Gauntlet conversations, 1,021 user turns, 2026-06-17 through 2026-07-09  
**Newer-conversation supplement:** comprehensive available-history retrieval, 2026-07-10 through 2026-07-30

## Result

The raw export remains completely indexed at the user-turn level. Every raw user turn has a stable source location, timestamp, excerpt hash, audit classification, and zero or more decision-thread links.

The newer-conversation audit was rebuilt as a dedicated date-window pass rather than a small appendix. It adds **109 decision threads** to the 226-thread raw-export audit, producing **335 total threads**. The supplement covers rules, cards, factions, lore, visual direction, website, Deckbuilder, digital implementation, playtesting, terminology, release work, and governance.

Later explicit decisions control conflicts. Four older rows retain their original evidence but receive effective `superseded` status in `status-overrides.json`:

- unrevealed Territory behavior, superseded by face-up setup;
- optional faction emblems, superseded by required small card emblems;
- immediate Mystic victory on the third Rite, superseded by Ritual of Ascendance;
- Territory-scaled Asset capacity, superseded by the fixed v0.6 limit of three.

## Effective decision-thread status

- `current`: 270
- `superseded`: 49
- `tentative`: 7
- `deferred`: 3
- `rejected`: 5
- `deprecated`: 1

These are effective counts after applying `status-overrides.json`, not merely the literal statuses printed in older index rows.

## Evidence totals

- raw-export user turns: 1,021
- raw-export decision-evidence links: 489
- July 10–30 project-conversation rows: 141
- total normalized decision threads: 335
- explicit effective-status overrides: 4

## Audit rules

1. A short confirmation is interpreted only with its immediately preceding assistant proposal.
2. Tentative language is not promoted merely because a later assistant summary sounds confident.
3. Rejections and superseded directions remain in the ledger.
4. Within one subject, the latest explicit user approval, correction, or rejection controls.
5. Implementation existence, a passing test, or assistant inference does not create a design decision.
6. A `current` conversation thread means latest known intent, not canonicalized or implemented.
7. Raw-turn completeness is claimed only through July 9. July 10–30 is comprehensive across the available project-history retrieval, but a newer raw export would still be required to prove every turn was present.

## Integrity result

The validator now checks all fourteen decision-index files, 335 unique IDs, the July source boundary, post-export evidence formatting, supplement counts, and effective status overrides. It rejects missing override targets, invalid status changes, duplicate IDs, malformed evidence, count drift, and gaps in decision-index numbering.

## Next audit layer

Use the fourteen `decision-index-*.md` files together with `status-overrides.json` as the input set for the decision-to-canonical-source audit. For every effectively current thread, do exactly one of the following:

- map it to an existing immutable `GNT-DEC-*` record and governing source;
- create the missing decision record;
- consolidate it into a broader governing decision without losing provenance; or
- quarantine it when the conversation evidence conflicts or lacks sufficient specificity.

Do not change governance coverage to `project-wide` until every effectively current thread and every canonical and product surface are reconciled.
