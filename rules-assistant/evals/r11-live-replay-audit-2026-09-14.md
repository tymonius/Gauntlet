# Rules Arbiter r11 maintained live replay audit — 2026-09-14

## Run identity

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/34813632336
- Behavior revision: `v071-qa-20260914-11`
- Published rules version: `v0.7.1`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`
- Head SHA: `24e1de521b9b81692ec76c59e80ccb55a50f5a4f`
- Raw score: **98/102**
- Artifact: `10335972218`
- Artifact ZIP SHA-256: `02871f48bb9d80c12d8bef24cf31cf68e976a1ead145f3009e4db5b0b3a8920d`

All publication, live-revision, and corpus preflight checks passed. One case retried after a transient HTTP 503 and then passed.

## Audit conclusion

The four raw failures split into **2 genuine classification-only behavior defects** and **2 evaluator false negatives**. No case in this 102-case replay produced a materially wrong rules ruling.

### Genuine classification-only defects

1. `core-withdrawal` — the answer accurately restated the directly selected Withdrawal authority but returned `inferred` instead of `explicit`.
2. `military-command-orders` — the answer accurately summarized directly stated Command/Orders authorities but returned `inferred` instead of `explicit`.

These remain real behavior defects because classification is player-visible. They indicate that prompt guidance alone does not make broad direct-rule summaries classification-stable. r12 therefore adds a conservative direct-overview postclassification rule: an `inferred` model classification is promoted only when the question is a simple overview form and one selected source title directly covers every significant topic token. Interaction/conflict/comparison questions remain ineligible.

### Evaluator false negatives

3. `diplomats-terms` — explicit answer and direct Terms source were correct; the benchmark required the section-title phrase `Offering Terms` even though another direct Terms source carried the governing text.
4. `diplomats-peace-treaty` — explicit answer and canonical Peace Treaty source were correct; the benchmark required the Rulebook title `Treaty Articles and Peace Treaty` rather than the direct canonical faction source.

The maintained benchmark corrections now verify governing rule text rather than those brittle title strings. Frozen blind datasets are unchanged.

## Next gate

After r12 deploys, replay the affected maintained cases first, then require the full maintained live replay to pass before freezing/running fresh blind tranche C.
