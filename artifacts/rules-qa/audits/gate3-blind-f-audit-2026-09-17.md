# Rules Arbiter Gate 3 blind tranche F audit — 2026-09-17

## Status

This document records the first valid paid-model execution of frozen Gate 3 blind tranche F against production behavior `v071-qa-20260917-16`.

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/35298543702
- Run attempt: 1
- Repository SHA: `c2d65e6f9ac05538e87b8b19b1a03466dff20029`
- Behavior revision: `v071-qa-20260917-16`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`
- Standard collection result: **44/61 passed**
- Standard semantic-v2 verdicts: **56 pass, 5 fail, 0 review**
- Combined standard result: **42/61 passed**
- Player-language collection result: **18/18 passed**
- Player-language semantic-v2 verdicts: **18 pass, 0 fail, 0 review**
- Clarification result: **5/5 passed**
- Artifact: `10529250815`
- Artifact SHA-256: `a41eb00fa8a3f7013d6a34f536d683eb31a4bfaee2d9dcc9c8539d9419853ae6`

Tranche F is frozen blind evidence. Do not edit or retroactively regrade its datasets. Any behavior change after r16 requires a fresh tranche G or later for certification.

## Audit conclusion

Nineteen standard records were marked failed by either collection assertions or semantic grading.

Manual adjudication against the frozen v0.7.1 authority partitions them into:

- **8 genuine behavior-failure records**, concentrated in retrieval and ruling-status normalization.
- **11 benchmark/source-contract false negatives**, where the player-facing ruling was correct and the failure came from an over-demanding semantic proposition, redundant source-title requirement, or a classification expectation inconsistent with the combined-authority policy.

The fresh player-language set passed **18/18**, and clarification handling passed **5/5**. This is materially stronger than tranche E on terse language and ambiguity handling. The remaining blocking defects are narrow rather than broad.

## Genuine behavior failures

### 1. Military first victory on the opponent's turn is still downgraded

`blind-f-military-command-opponent-turn`

The answer was substantively correct and cited the exact Military Command rules, but production returned `inferred`.

Published authority directly states that the first battle Military wins each turn grants Command and that this trigger may occur during either player's turn. This should be `explicit`.

### 2. Late Military Tactic handling contradicted the specific rule

`blind-f-military-late-tactic-does-not-reopen`

This is a genuine gameplay-answer defect.

The answer correctly said that a face-up Tactic added after normal reveal does not reopen normal Tactic choice or Surveillance, but then incorrectly allowed Direct Interference at that same timing.

The Military-specific **Additional Tactics** rule directly says that such a late Tactic:

> does not reopen normal Tactic choice, Surveillance, Interference, or reveal windows.

The retrieval layer selected Intelligence Direct Interference and generic replacement material while missing the more specific Military rule. The specific Military rule must control.

### 3. Refused Terms ending without a winner is still downgraded

`blind-f-diplomats-refused-then-no-winner`

The answer was substantively correct and cited both shared and Diplomat Refused Terms authority: return the Stake and do not impose/ratify the Proposal.

That result is directly written and should be `explicit`, not `inferred`.

### 4. Deed ownership/control independence was not retrieved

`blind-f-financiers-deed-control-independent`

The answer reached the correct result but issued a provisional ruling and cited only Normal Capture.

The published **Deeds** rule directly states that Deed ownership is independent of token position and Territory control and that changing Territory control does not transfer its Deed.

A capture/control question that also names a Deed must retrieve that authority and answer `explicit`.

### 5. Relentless Pursuit's attacking-opponent condition was downgraded

`blind-f-witch-hunter-pursuit-attacking-win-no`

The answer was correct and cited Relentless Pursuit plus Witch Hunter, but production returned `inferred`.

The ability itself directly triggers only after defeating an attacking opponent. If Witch Hunter initiated the battle and won as attacker, that condition is not met. This should be `explicit`.

### 6. Treason triggered an unnecessary clarification

`blind-f-card-treason-negate-then-apply`

The question names Treason and asks whether its selected opposing effect is merely canceled or also applied.

Printed Treason directly says:

> Negate it, then apply that effect.

Production instead asked which effect was meant and returned no ruling. Named-card retrieval/clarification gating must recognize that the card's generic instruction answers this without needing the selected opposing card's identity.

### 7. Rally follow-up lost named-ability authority

`blind-f-conversation-rally-role-flip`

The follow-up was answered correctly, but retrieval selected only Quick Battle Reference and returned `inferred`.

The immediately preceding exchange explicitly established Rally. A terse role-flip follow-up should carry Rally authority forward and answer `explicit`.

### 8. Ritual follow-up lost Ritual authority

`blind-f-conversation-ritual-withdrawal-after-initiation`

The ruling was correct and `explicit`, but retrieval selected only generic withdrawal/no-winner authority. It failed the source contract because the governing Ritual completion/interruption authority was absent.

The r16 continuity path recognizes the full phrase “Ritual of Ascension” but not ordinary follow-ups where recent history says simply “Ritual.” The topic carry-forward should handle that natural shorthand.

## Benchmark/source-contract false negatives

These cases should not drive production behavior changes.

### Semantic propositions asked for more than the player asked

1. `blind-f-core-first-player-after-setup`

Question: can the first-player roll occur before choosing the opening discard?

Answer: “No. Choose the opening discard before rolling for first player; you make that choice without knowing who takes the first turn.”

That fully answers the question from direct authority. The benchmark additionally demanded that the answer volunteer that Territory arrangement also precedes the roll. That detail is true but unnecessary.

2. `blind-f-diplomats-latitude-stake-once`

Question: is the shared Stake paid twice?

Answer: it is staked once.

The semantic criterion additionally required an explanation that only the selected Proposal takes effect/may become ratified. That is outside the question asked.

3. `blind-f-inquisition-conviction-many-cards-one-gain`

Question: how much normal Conviction do three qualifying cards in one Aftermath generate?

Answer: 1 normal Conviction.

The semantic criterion additionally demanded that the answer say winning is not required. That is unrelated to the quantity question.

### Redundant source-title requirements

4. `blind-f-military-shock-awe-rout-conflict`

The answer correctly cited printed Shock and Awe plus Rout. Requiring the additional “Conflicting victory benefits” heading was redundant; the printed card itself expressly prohibits using an Order as a result of that victory.

5. `blind-f-commandant-fortify-occupation-required`

The answer cited Fortify itself plus Occupation. Requiring the parent “Commandant” heading added no governing authority.

6. `blind-f-senator-political-capital-limited-by-hand`

Political Capital itself directly answered the question. The additional “Senator” title requirement was redundant.

7. `blind-f-banker-line-credit-seven-cost`

Line of Credit plus Collateral directly answered the calculation. Requiring “Banker” was redundant.

8. `blind-f-executive-hostile-takeover-defender-no`

Hostile Takeover itself directly gives the attacker-only condition. Requiring “Executive” was redundant.

9. `blind-f-spymaster-new-mission-cannot-finish`

Mission Control itself directly says the newly started Mission cannot complete that turn. Requiring “Spymaster” was redundant.

10. `blind-f-grand-inquisitor-final-judgment-minimum-one`

Final Judgment itself directly states the cost floor. Requiring “Grand Inquisitor” was redundant.

### Classification expectation conflicted with the combined-authority policy

11. `blind-f-spirit-walker-position-loss-not-preventable`

The answer correctly combined Guardians of the Circle with Rite of Crossing. Determining that Rite of Crossing's occupation condition is the kind of continuing position requirement Guardians cannot preserve depends on both independent authorities.

Under the r16 combined-authority boundary, `inferred` is the appropriate classification. The tranche expected `explicit`, so the failure is in the frozen benchmark expectation, not production behavior.

## What tranche F establishes

Fresh blind evidence supports several important conclusions:

- terse player language is currently strong: **18/18 collection and semantic pass**;
- ambiguous-referent handling remains strong: **5/5**;
- semantic-v2 judged **56/61 standard answers semantically correct**;
- three of the five semantic failures were benchmark overreach rather than bad answers;
- only **two** standard answers were substantively inadequate:
  - the late-Military-Tactic Direct Interference ruling;
  - Treason's unnecessary clarification;
- most remaining valid failures are metadata/retrieval quality defects rather than wrong gameplay conclusions.

The frozen combined benchmark still remains failed. Audit interpretation does not retroactively rescore tranche F.

## r17 follow-up scope

Behavior remediation should remain narrow and systemic:

1. Promote direct Military Command “either player's turn” victories to `explicit`.
2. Retrieve Military **Additional Tactics** whenever a Military effect adds a Tactic after normal reveal, and prevent generic Direct Interference from overriding that specific closed-window rule.
3. Promote directly written refused-Terms/no-winner Stake and ratification outcomes to `explicit`.
4. Retrieve **Deeds** for questions combining Territory capture/control changes with Deed ownership or transfer.
5. Promote direct Relentless Pursuit attacker/defender trigger rulings to `explicit`.
6. Prioritize a named card's own authority for Treason questions and do not request clarification when the card's generic instruction itself resolves the question.
7. Carry Rally authority through terse role-changing follow-ups.
8. Carry Ritual of Ascension completion/interruption authority through ordinary “Ritual” shorthand in recent conversation.
9. Promote the eight genuine tranche-F failures into regression coverage.
10. Do not encode the eleven benchmark/source-contract false negatives as behavior changes.
11. Preserve tranche F unchanged.
12. After r17 is merged, deployed, and regression-clean, author a genuinely fresh tranche G.
