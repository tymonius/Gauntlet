# Rules Arbiter r12 targeted live QA audit — 2026-09-14

## Run identity

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/34815720819
- Behavior revision: `v071-qa-20260914-12`
- Published rules version: `v0.7.1`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`
- Head SHA: `216f45299ef882038de4ac9fad7cf2d167b8ac93`
- Scope: targeted
- Cases: `core-withdrawal`, `military-command-orders`, `diplomats-terms`, `diplomats-peace-treaty`
- Artifact: `10335484210`
- Artifact ZIP SHA-256: `d896f9ff8cb94295bf610452e1f00cbd62fbe6a0f0b22667a0d90f98d15896d2`
- Raw evaluator score: **2/4**

All publication, r12 live-revision, and corpus preflight checks passed on the first attempt. All four calls returned HTTP 200 through the model path and all four rulings were classified `explicit`.

## Audit conclusion

The two r11 classification defects are fixed in production r12, and the two remaining red checks are evaluator false negatives. There were **zero behavior failures and zero materially wrong rulings** in this targeted run.

### Passed behavior fixes

1. `core-withdrawal` — returned `explicit`; selected the direct Withdrawal Rulebook authority and accurately stated the no-winner/no-result behavior, Onset withdrawal, later withdrawal, and battle-card clearing consequences.
2. `military-command-orders` — returned `explicit`; selected the direct `Command and Orders` Rulebook authority and accurately summarized Command gain/timing, Order cost/timing, withdrawal interaction, and High Command.

### Evaluator false negatives

3. `diplomats-terms` — returned a correct `explicit` answer and selected `7. Battles › Terms and Onset › Complete rules › Terms`. The selected excerpt directly says: `To offer Terms, choose one eligible Proposal...`. The correction expected the non-existent literal phrase `offer one eligible Proposal as Terms`.
4. `diplomats-peace-treaty` — returned a correct `explicit` answer and selected `Treaty Articles and Peace Treaty`. The selected excerpt directly states the start-of-turn timing and that `if six different Proposals are ratified, the Diplomat wins through the Peace Treaty.` The correction expected `if 6 different Proposals are ratified, you win`, which differs only in number/person wording and does not occur literally.

The maintained benchmark corrections now use stable governing substrings that occur directly in those selected authority excerpts:

- Terms: `choose one eligible Proposal`
- Peace Treaty: `six different Proposals are ratified`

This is evaluator-only maintenance. It does not change Worker behavior, published authority, gameplay rules, or any frozen blind benchmark.

## Next gate

After this evaluator-only correction merges, run one final full maintained live replay against unchanged r12. If that replay is clean, freeze and run a fresh blind tranche C for r12 certification. Do not rerun tranche B as blind evidence.
