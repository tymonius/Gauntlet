# Gauntlet v0.6 Per-Card Review Workflow

This directory is the active working layer for card-by-card v0.6 migration.

## Purpose

Store each newly approved card review in a small standalone file instead of rewriting the entire consolidated review log after every decision. This keeps edits fast, auditable, and easy to revise.

## Source authority

- Cards **1–47** are currently consolidated through **Supplies** in `../Gauntlet_v0.6_Card_Review_Log.md` and `../Gauntlet_v0.6_Card_Metadata.md`.
- Beginning with card **48**, each approved review is authoritative in its own file in this directory until the next batch rollup.
- `STATUS.md` is the authoritative live checkpoint.
- The consolidated review log and metadata registry are rollups. Update them after every five approved cards, at the end of a review session, or before a release checkpoint.
- The root README should describe project-level status only. Do not update it after every card.
- The Project Index should be updated only when the source hierarchy, milestone, or batch checkpoint materially changes.

## File naming

Use a zero-padded sequence number and lowercase slug:

```text
048-tariffs.md
049-the-black-edict.md
```

The sequence follows the order in `../../releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`.

## Required review fields

Each approved card file must include:

1. Card name and sequence number.
2. Exact v0.5.7 source cost and text.
3. Approved or provisional v0.6 cost.
4. Allegiance.
5. Starter eligibility.
6. Complexity.
7. Watchlist concern.
8. Approved Action, Battle, and Reminder wording where applicable.
9. Neutral-pool impact and faction-system interaction.
10. Rationale and unresolved follow-up work.
11. Approval status.

Use `TEMPLATE.md` as the starting structure.

## Approval and logging

- Discussion in chat is provisional until the user approves a direction.
- After approval, create or update the card's standalone file and update `STATUS.md`.
- Do not rewrite the consolidated log, metadata registry, Project Index, and root README for every individual card.
- A card is not durably logged until its standalone file or applicable rollup commit succeeds.

## Batch rollup

At a rollup checkpoint:

1. merge the new standalone reviews into `../Gauntlet_v0.6_Card_Review_Log.md`;
2. update `../Gauntlet_v0.6_Card_Metadata.md`;
3. update `STATUS.md` with the new rollup boundary;
4. update the Project Index if the milestone materially changed;
5. leave the standalone files in place as concise review records and revision targets.
