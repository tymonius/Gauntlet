# Rules Arbiter Gate 3 blind tranche B audit — 2026-09-14

## Status

This document records the first authenticated paid-model run of frozen Gate 3 blind tranche B against the unchanged r10 production Rules Arbiter and preserves the diagnosis that should drive follow-up work.

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/34806675549
- Gate 3 tranche B source: `rules-arbiter-gate3-blind-b.v071.json`
- Player-language source: `rules-arbiter-gate3-blind-b-player-language.v071.json`
- Intended clarification source: `rules-arbiter-gate3-blind-b-clarifications.v071.json`
- Behavior revision tested: `v071-qa-20260913-10`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`
- Standard raw score: 25/43 (58.1%)
- Player-language raw score: 12/20 (60.0%)
- Clarification phase: invalid as tranche-B evidence; the runner accidentally loaded tranche A and compared it against r9 expectations

The standard and player-language portions of tranche B are now frozen blind evidence. Do not edit those benchmark datasets or rerun them as evidence of a later blind pass. Failed B cases may be promoted into regression tests. Any later behavior revision requires a newly authored blind tranche C or later.

The three intended B clarification cases were not executed in this run and therefore remain unseen by the production Arbiter. They may still be run once against unchanged r10 after the workflow is corrected to select the B clarification benchmark without rerunning the exposed standard/player-language cases.

## Audit conclusion

The 26 failed standard/player-language cases are not 26 independent Arbiter defects. The post-run audit separates them into:

- **13 genuine behavior failures**: 8 classification-boundary failures, 2 over-eager deterministic clarifications, 1 explicit-card/provisional error, and 2 player-language semantic misreads.
- **13 evaluator false negatives**: the substantive ruling is supported and correctly useful at the table, but brittle literal answer-pattern checks reject semantically equivalent wording.
- **3 clarification-runner infrastructure failures**: the clarification phase executed tranche A rather than tranche B. These are not Arbiter-result failures and provide no tranche-B clarification evidence.

This partition is an audit judgment based on the recorded outputs and frozen published v0.7.1 authority. It is not a replacement score for the frozen benchmark.

## Genuine behavior failures

### Classification boundary: direct authority incorrectly labeled inferred

Eight cases gave substantively correct answers but returned `inferred` where the cited clean authority directly states the result and the r10 classification contract requires `explicit`:

1. `blind-b-core-onset-withdraw-no-aftermath` — Withdrawal/Onset directly states no winner and no Aftermath.
2. `blind-b-core-late-withdraw-clears-cards` — Withdrawal directly states that after Gambits a later withdrawal clears committed battle cards normally.
3. `blind-b-commandant-fortify-occupation` — Fortify directly says to advance the Front Line by one Territory if able after the printed trigger.
4. `blind-b-spirit-walker-guardians-cost-three-rites` — direct arithmetic substitution into `1 + completed Rites` should remain explicit under the r10 classification guide.
5. `blind-b-card-stand-ground-normal-retreat` — the direct Stand Ground restriction plus the explicit retreat rule answers the queried normal-retreat exception without a discretionary bridge.
6. `blind-b-conversation-topic-switch-fortify` — the named Fortify ability directly answers the new topic.
7. `blind-b-player-onset-withdraw` — same direct Onset/Withdrawal rule in ordinary player language.
8. `blind-b-player-stand-ground-retreat` — same direct Stand Ground/normal-retreat distinction in ordinary player language.

These are behavior defects because the public Arbiter exposes the ruling classification to players; they are not merely benchmark wording misses.

### Deterministic clarification overfires despite named authority

9. `blind-b-ranger-fieldcraft-card-effect` — the question explicitly names Fieldcraft and asks whether it can ignore a card effect rather than a printed Territory effect. The deterministic ambiguity guard returned “Which card do you mean?” without consulting Fieldcraft.
10. `blind-b-card-subversion-negate-asset` — the question explicitly names Subversion and asks what Subversion does to an opposing Asset effect. The deterministic guard returned “Which effect do you mean?” even though the governing card is unambiguous.

Both failures occurred on the `deterministic-clarification` path before the model and returned no rules sources.

### Explicit Spies text incorrectly converted into a provisional procedure

11. `blind-b-card-spies-revise-tactics` — the Spies card directly states: reveal opposing face-down Tactics, then you may revise your own Tactics or withdraw. The Arbiter nevertheless issued a provisional ruling, introduced unsupported replacement-procedure details, and said to “withdraw Spies itself,” which is not what the card says. This is both a classification and answer-quality defect.

### Player-language semantic misreads

12. `blind-b-player-command-first-win` — `won my first fight this turn, military gets a command now right` was incorrectly answered “No” by importing the unrelated Withdrawal sentence from the retrieved Military rule. The question states a win; normal Command should be gained.
13. `blind-b-player-fortify-line` — `commandant won while sitting on their land, can fortify push my line` was incorrectly treated as a win on the Commandant's own Territory. In ordinary player language, “their land” refers to the opponent's Territory, which satisfies Fortify's occupation trigger.

These are substantive answer errors, not classification-only failures.

## Evaluator false negatives

Thirteen failed cases produced substantively correct rulings and classifications but failed only because the benchmark required a literal token or contiguous phrase not present in an equivalent answer:

- `blind-b-core-tiebreak-clean-roll` — answer states all modifiers do not apply but does not literally contain `Do not apply`.
- `blind-b-core-capture-one-step` — answer says `no more than one Territory` rather than `at most one`.
- `blind-b-spymaster-mission-control-same-turn` — answer says `cannot complete during the turn it is started` rather than exact `cannot complete that turn`.
- `blind-b-alchemist-materia-prima-first-only` — answer states first qualifying time and one draw total without the exact case-sensitive phrases.
- `blind-b-grand-inquisitor-final-judgment-discount` — answer says `can never cost less than 1 Conviction` rather than `minimum of 1`.
- `blind-b-card-sequestration-action` — answer says `discards all their other Assets` rather than `discards the rest`.
- `blind-b-card-sleeper-network-removed` — answer says `discard all the rest` rather than exact `discard the rest`.
- `blind-b-conversation-sleeper-network-followup` — same literal mismatch.
- `blind-b-interaction-onset-withdraw-pursuit` — answer directly states no battle result / not fought, won, or lost, but omits exact `no winner`.
- `blind-b-player-edge-tie` — answer says `you win tied battle totals`; evaluator requires literal `wins`.
- `blind-b-player-capture-two` — answer says `no more than one Territory` rather than `at most one`.
- `blind-b-player-two-rites-transmutation` — answer says `second selected Rite` rather than literal `two`.
- `blind-b-player-sleeper-removed` — answer says `discard all the rest` rather than exact `discard the rest`.

Do not change the frozen B datasets to repair these. Future evaluator design should prefer semantic or normalized checks where exact wording is not itself mechanically important.

## Clarification runner defect

The workflow intended to execute `rules-arbiter-gate3-blind-b-clarifications.v071.json`, but `scripts/run-v071-gate3-clarification-qa.mjs` defaults to `rules-arbiter-gate3-blind-a-clarifications.v071.json` unless `GAUNTLET_RULES_CLARIFICATION_BENCHMARK` is provided. The B workflow set only the output path, not the benchmark path.

Consequently the run executed three tranche-A clarification cases and rejected them because those cases were frozen to behavior r9 while production correctly reported r10. The resulting 0/3 is infrastructure noise and must not be interpreted as clarification behavior evidence.

The correct repair is to keep the same trusted Gate 3 workflow path, explicitly select the B clarification benchmark, and allow a clarification-only dispatch. That permits the three still-blind B clarification cases to be executed once against unchanged r10 without making second paid calls for the already-exposed standard or player-language B cases.

## r11 follow-up scope after clarification evidence is captured

Behavior work should remain narrow and systemic:

1. Prevent deterministic generic-card/effect clarification from overriding an explicitly named governing card, Leader ability, or Faction feature.
2. Keep direct rules and direct card exceptions `explicit`, including direct arithmetic substitution, directly enumerated withdrawal behavior, and direct named-ability timing/effects.
3. Harden Spies so the directly printed revise-or-withdraw instruction remains explicit and no unsupported replacement procedure is invented.
4. Harden ordinary player-language interpretation so a stated battle win is not converted into Withdrawal merely because Withdrawal appears in a retrieved source, and contextual possessives such as `their land` preserve the opponent referent.
5. Promote only genuine behavior failures into regressions; do not teach the model benchmark-specific literal phrases.
6. Preserve tranche B unchanged.
7. After r11 is regression-clean, author a genuinely fresh tranche C for the next Gate 3 blind certification attempt.
