# Rules Arbiter r12 full maintained live replay audit — 2026-09-14

## Run identity

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/34818065832
- Behavior revision: `v071-qa-20260914-12`
- Published rules version: `v0.7.1`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`
- Head SHA: `dae9e8a07230a14f92d4187d104e3bc0eb92dac9`
- Scope: full maintained replay
- Result: **98/102**
- Artifact: `10337262521`

All publication, live-revision, dependency, and corpus-cache preflight checks passed. The paid QA execution completed and uploaded its report; final enforcement failed only because four maintained classification expectations were missed.

The run head is a descendant of the evaluator-only r12 correction merge and did not change `rules-assistant/worker-v071.js`, so this is valid unchanged-r12 behavior evidence.

## Audit conclusion

All four failed cases produced mechanically correct rules answers and selected the expected governing authority. All four failures are genuine player-visible classification defects rather than evaluator or infrastructure noise.

1. `core-turn-order` — expected `explicit`, returned `inferred`. The answer directly compiled the selected turn-order authorities without deriving a new rule.
2. `military-victory-benefits` — expected `explicit`, returned `inferred`. The selected Rulebook section is itself titled `Conflicting victory benefits` and directly states the controlling treatment.
3. `financiers-capacity-opening` — expected `explicit`, returned `inferred`. Financial Capacity grants Actions in Opening and Denouement, while the direct Deed authority expressly places Deed buying in Denouement. Under the maintained classification policy, a direct phase restriction answers this legality question explicitly; the extra-Action rule does not turn the timing restriction into an inference.
4. `card-leveraged-buyout` — expected `inferred`, returned `explicit`. Printed Leveraged Buyout sends battle collateral to the Graveyard when battle cards are cleared, while the Rulebook Collateral summary says Leveraged Buyout battle collateral goes there after the purchase. The Golden Rules resolve that same-card timing conflict in favor of the specific printed component. Because the resolution combines conflicting authorities with the precedence rule, the result is inferred.

No maintained case in this replay produced a materially wrong gameplay ruling.

## r13 follow-up scope

The repair should remain classification-only and systemic:

- recognize additional direct-overview phrasings only when one selected source title covers the complete subject;
- recognize direct phase-legality questions only when the queried action has an express phase/timing authority;
- force genuine printed-card versus Rulebook battle-collateral timing conflicts to `inferred` when Golden Rules are present;
- preserve inferred classification for actual cross-authority interactions and for legality questions lacking direct timing authority;
- do not edit frozen blind benchmarks or gameplay authority.

After r13 deploys, replay the four affected maintained cases first. If targeted behavior is clean, require another full maintained replay before freezing and running fresh blind tranche C. Tranche B remains immutable and cannot certify r13.
