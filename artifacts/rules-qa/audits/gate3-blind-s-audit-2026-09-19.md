# Gate 3 blind tranche S audit — 2026-09-19

Run: https://github.com/tymonius/Gauntlet/actions/runs/35456347349

Frozen candidate:
- Rules version: v0.7.1
- Behavior revision: `v071-qa-20260919-30`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`

Tranche S is preserved as immutable blind evidence. This audit does not edit or retroactively regrade the benchmark files.

## Raw workflow signal

- Standard collection: 25/33
- Standard semantic evaluator: **31 pass / 2 fail / 0 review**
- Player-language collection: 7/10
- Player-language semantic evaluator: **10 pass / 0 fail / 0 review**
- Clarifications: **5/5**

The workflow failed at its final enforcement step because the semantic stages use `continue-on-error`; their GitHub step conclusions are displayed as success while their underlying outcomes remain failure when the report contains failed cases.

## Non-semantic red cases

The following were semantically correct and failed only citation/source-pattern matching:
- `blind-s-action-total`
- `blind-s-extra-action-phase-limit`
- `blind-s-clearing-three-zones`
- `blind-s-spymaster-mission-control-action`
- `blind-s-special-operation-cost`
- `blind-s-player-action-total`
- `blind-s-player-deep-control`
- `blind-s-player-pursuit-attacker`

`blind-s-ambassador-cordiality-limit` was semantically correct and failed only because the answer was classified `inferred` rather than the benchmark's expected `explicit`.

These are not wrong gameplay rulings.

## Semantic failure audit

### 1. blind-s-leverage-staked-influence — genuine product defect

Question:

> After my Terms are refused, can I spend the Influence I staked on that Proposal as Leverage before dice?

Production response:

> Which proposal do you mean? Give me its name or exact text, plus the current phase or step, whose turn it is, and any relevant game state that is not already clear from the conversation.

Assessment:
- The Proposal's identity is immaterial because the published Leverage rule universally states that staked Influence cannot be spent as Leverage.
- The deterministic referent guard incorrectly treated `that Proposal` as requiring identity resolution.
- This is an over-clarification / natural-language continuity defect, not a hallucinated ruling.
- It is systemic enough to harden because the same brittle deictic shape can unnecessarily block other self-contained questions.

### 2. blind-s-unsupported-cocked-die — correct substantive answer, real restraint/classification defect, benchmark overreach

Question:

> A die lands cocked against a card during a battle roll. Does published v0.7.1 define an official cocked-die reroll procedure?

Production response:

> No. Published v0.7.1 defines rerolls only when a rule or effect causes one; it does not define a cocked-die reroll procedure.

Assessment:
- The substantive answer to the asked question is correct: published v0.7.1 does not define a cocked-die procedure.
- The semantic criterion overreached by also requiring an unasked table-resolution procedure. That omission is not itself a wrong answer to the question asked.
- However, the response was classified `explicit` with high confidence from generic reroll authority. Absence of a cocked-die procedure is a rules-gap/source-coverage conclusion, not direct positive authority.
- The status should be `provisional`, and the existing rules-gap reminder should apply so the Arbiter does not present absence-based conclusions as directly written rules.
- This is a genuine restraint/classification weakness even though the gameplay content was not false.

## #1630 qualitative assessment

Strong evidence:
- No recurring pattern of plausible-sounding materially wrong gameplay rulings appeared in S.
- All 12 Leader cases were semantically correct.
- All 10 terse player-language cases were semantically correct.
- All 5 deliberately ambiguous follow-ups correctly requested clarification.
- Core timing, Action limits, withdrawal, control, victory, faction resources, and interaction cases were semantically correct.
- Answers were generally ruling-first, concise, and table-useful.
- The previously recurring Tiebreak polarity and Retribution attribution failures did not recur.

Remaining release-gate weakness:
- Deterministic clarification can still overfire on self-contained deictic wording.
- Source-coverage gaps can still be labeled explicit/high-confidence when the retrieved source only covers a nearby generic rule.

Decision:
- Do **not** treat the raw workflow failure as evidence of broad Arbiter regression.
- Do **not** declare the Chief Justice quality gate closed yet.
- Harden these two restraint paths systemically in r31.
- After r31 deploys and historical regressions pass, run one fresh confirmation tranche under #1630. Do not edit or rerun S as blind evidence.
