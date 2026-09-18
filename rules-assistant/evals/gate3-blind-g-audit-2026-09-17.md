# Rules Arbiter Gate 3 blind tranche G audit — 2026-09-17

## Status

This document records the first valid paid-model execution of frozen Gate 3 blind tranche G against production behavior `v071-qa-20260917-17`.

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/35301200713
- Run attempt: 1
- Repository SHA: `e5f00a19fb6921789a566a47531f96296a925af2`
- Behavior revision: `v071-qa-20260917-17`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`
- Standard collection result: **51/61 passed**
- Standard semantic-v2 verdicts: **57 pass, 4 fail, 0 review**
- Combined standard result: **50/61 passed**
- Player-language collection result: **14/18 passed**
- Player-language semantic-v2 verdicts: **14 pass, 4 fail, 0 review**
- Combined player-language result: **12/18 passed**
- Clarification result: **4/5 passed**
- Artifact: `10529982724`
- Artifact SHA-256: `b0bacb80766b5df36037df1c9b12d4a8746313fc5bdbe9ebba063a4320096886`

Tranche G is frozen blind evidence. Do not edit or retroactively regrade its datasets. Any production behavior change after r17 requires a fresh tranche H or later for certification.

## Audit conclusion

Eighteen unique records were marked failed by collection assertions, semantic grading, or clarification grading.

Manual adjudication against the frozen v0.7.1 authority partitions them into:

- **9 genuine production defects**, of which 6 affect the player-facing answer/response and 3 are retrieval/classification quality defects with a substantively correct ruling.
- **9 benchmark/source-contract defects**, including one objectively incorrect expected proposition and one materially ambiguous terse question.

The benchmark itself therefore still fails and remains release-blocking, but the raw red count materially overstates production error.

## Genuine production defects

### 1. Local anaphora over-triggered clarification for a generic Asset rule

`blind-g-core-asset-limit-forced-discard-is-removed`

The question first identifies one banked Asset being discarded because the Asset limit fell, then asks whether “that Asset” is Removed. The deterministic referent guard treated the earlier phrase “Asset limit” as a competing Asset referent and asked which Asset was meant.

The antecedent is locally clear. Published v0.7.1 directly states that an Asset forced to leave because the Asset limit fell is Removed even when its controller chooses which Asset leaves.

This is a clarification-resolution defect, not a rules gap.

### 2. Local anaphora over-triggered clarification for “that card”

`blind-g-core-return-to-source-zone`

The question identifies “another card” returned to source and immediately follows with “If that card entered battle from Hand…”. The deterministic referent guard counted both “battle card” and “another card” and asked which card was meant.

The nearest local antecedent is clear. The shared battle rule directly says a card returned to its source returns to the zone from which it entered battle, so the answer is Hand.

This is the same systemic local-anaphora defect as case 1.

### 3. Intelligence Mission abort procedure was answered incorrectly

`blind-g-intelligence-abort-is-not-failure`

This is the clearest substantive gameplay error in tranche G.

The question says the player pays Intel to abort the Active Mission. Published v0.7.1 directly defines the abort procedure: during Denouement, take an Action, reveal the Active Mission, spend Intel equal to its value, and put it in the Discard Pile; aborting is not failure.

Production retrieved only the generic Intel resource descriptor and issued a provisional ruling that paying Intel did not abort the Mission. That directly contradicts the governing procedure.

Mission-abort wording must prioritize the specific “Aborting and failing” authority over generic Intel material.

### 4. Rout follow-up battle remained provisional despite direct Military authority

`blind-g-general-rout-new-battle-new-opportunities`

The player-facing result was correct: a battle created by Rout is a new battle with fresh battle setup and once-per-battle opportunities.

Production nevertheless classified it provisional and relied on an analogy to Last Stand movement. The Military-specific rule directly states that a follow-up battle is a new battle with new Gambits, Reserves, Tactics, and once-per-battle opportunities.

Rout/follow-up-battle questions should retrieve that direct authority and answer explicit.

### 5. Rite of Shattering follow-up remained inferred despite direct authority

`blind-g-conversation-shattering-no-dice-first-battle`

The ruling was correct: a battle ending before dice does not consume Rite of Shattering's “first battle that reaches dice” condition.

The named Rite authority was selected, but the response was normalized to inferred. This is a direct application of a single explicit condition and should remain explicit even in a terse follow-up.

### 6. Terse setup language missed Starting Territory authority

`blind-g-player-starting-territory-trigger`

Question: “setup token placement triggers enter effects?”

Production asked for more detail and issued a provisional response. The published setup rule directly says token placement during setup is not movement, does not count as entering the Territory, and does not trigger enter effects.

This is a terse-language retrieval/clarification failure.

### 7. Terse Peace Treaty question missed the faction victory timing

`blind-g-player-peace-six-now`

Question: “six treaties during their turn. instant win?”

Production correctly said there was no instant win, but treated Peace Treaty as if an alternate Treaty victory would need express faction text—when that express faction text exists. It cited only shared victory material and issued a provisional ruling.

The direct Diplomat rule checks Peace Treaty at the start of the Diplomat's turn, after Capture and before Draw, when six different Proposals are ratified.

This is a retrieval failure with misleading rationale.

### 8. Terse Rite of Echoes loss remained inferred

`blind-g-player-rite-echoes-loss`

The answer was exactly correct: losing before completion sends both bound cards to the Graveyard and resets Rite of Echoes.

The Rite of Echoes source was selected, yet the response was classified inferred. The Rite states that result directly; this should be explicit.

### 9. Ambiguous two-Mission follow-up escaped deterministic clarification

`blind-g-clarify-two-missions-new`

History presented Fog of War and Treason as two Mission-capable cards. The follow-up asked, “Can that one start as a Special Operation?”

This should have deterministically asked which card was meant. Instead, the request reached the model and returned `out_of_scope`.

The generic “that one” resolver is incorrectly treating another named concept in the current sentence—Special Operation—as if it resolved the antecedent. The referent guard should distinguish the pronoun antecedent from a separate mechanic named later in the question.

## Benchmark/source-contract defects

These failures should not drive production behavior changes.

### 1. Negated Gambit destination used a sufficient alternate authority

`blind-g-core-negated-gambit-still-graveyard`

The answer was correct and explicit: the Gambit goes to its owner's Graveyard when battle cards clear unless another destination applies.

The selected “Clearing battle cards” authority directly establishes that destination. The frozen benchmark demanded the separate “Negation” heading. Requiring that exact heading was unnecessarily exclusive.

### 2. “+1 Action” no-carry question used a sufficient general Action authority

`blind-g-core-plus-action-current-phase-only`

The question asked whether an extra Action could be saved for next turn. The answer correctly said no and cited the shared Additional Actions/Cleanup structure.

The benchmark required the shorthand “+N Action” passage specifically. That passage is relevant, but the selected authority was sufficient for the asked no-carry proposition.

### 3. Active Mission benchmark demanded an unasked Special Operation detail

`blind-g-intelligence-only-one-active-mission`

Question: may a player with one Active Mission start a second normal Mission?

Answer: no, only one Active Mission may exist.

The semantic criterion additionally required the answer to volunteer that an Active Mission and Special Operation cannot coexist. That is true but not necessary to answer the question.

### 4. Counterintelligence selected printed-card authority instead of the duplicate rulebook wording

`blind-g-intelligence-counterintel-rules-reveal-unaffected`

The printed Counterintelligence source directly says it does not prevent reveals required by the rules. The answer was correct.

The benchmark required the alternate rulebook wording “Rules-mandated reveals are unaffected.” This is a source-contract false negative.

### 5. Arcane allegiance selected the card-anatomy authority instead of the faction heading

`blind-g-mystics-arcane-trait-not-allegiance`

The selected Arcane-symbol authority directly states that symbol shape identifies the Arcane trait and color reflects allegiance, including Neutral color on Neutral cards. The answer correctly concluded that a Neutral Arcane card remains Neutral.

Requiring the separate phrase “Arcane is a trait, not faction allegiance” was unnecessarily exclusive.

### 6. Grave Ward interaction had sufficient two-source authority

`blind-g-interaction-grave-ward-entry-still-happens`

The answer correctly combined Transmutation—which puts the card in the Graveyard—with Grave Ward—which triggers when a card enters that Graveyard and then moves it onward.

The benchmark additionally required the generic “Entering the Graveyard” passage. That third passage was not necessary to answer the interaction.

### 7. The terse “+1 Action” expected proposition was wrong

`blind-g-player-extra-action-same-phase`

Question: “+1 action means two denouement actions?”

Production answered **yes**.

That answer is correct under the published card-shorthand rule:

- `+N Action` grants N additional Actions during the **current phase**; and
- it increases the number of Actions permitted in that phase.

The frozen benchmark expected the opposite by incorrectly applying the generic “one additional Action that turn” rule to the special `+N Action` shorthand.

This is an authoring error in tranche G. Preserve it as frozen evidence; do not change production to satisfy it.

### 8. “bad loss trigger” was materially ambiguous

`blind-g-player-no-martyrs-harmful`

The intended benchmark meaning was “an effect harmful to the losing player.” The terse wording “their bad loss trigger” does not reliably encode that meaning.

Production answered that No Martyrs blocks a loss-triggered effect only if it benefits the losing opponent, which is consistent with the actual rule. The full standard case using explicit “harmful effect” wording passed.

The terse benchmark should not be treated as evidence of a production defect.

### 9. Pursuit + Terms used sufficient generic Terms authority

`blind-g-player-witch-pursuit-terms`

The answer was correct: a battle started by Pursuit still reaches Onset, where accepted Terms may end the sequence.

The selected Accepted Terms authority directly establishes what accepted Terms do during Onset. The frozen benchmark demanded the Witch Hunter-specific restatement. That extra source was useful but not necessary to answer the question as posed.

## What tranche G establishes

Fresh blind evidence supports the following:

- standard semantic adjudication was strong: **57/61 semantic pass**;
- of the four standard semantic failures, one was benchmark overreach and three exposed real answer failures;
- several collection failures were caused by overly exclusive source assertions rather than bad rulings;
- the most important new production weakness is still retrieval/clarification selection, not broad rules reasoning;
- r17 fixed the exact F defects it targeted, but G exposed adjacent cases in local anaphora, terse faction-victory retrieval, and Mission procedure retrieval;
- deterministic clarification remains good but not yet fully robust: **4/5** fresh ambiguous cases passed.

## r18 follow-up scope

Production remediation should remain narrow and systemic:

1. Resolve a local “that Asset/card/etc.” against the nearest clear same-question antecedent when a singular antecedent was just introduced; do not let noun phrases such as “Asset limit” create a fake competing referent.
2. For generic “that one,” do not treat a separately named mechanic appearing after the pronoun as the antecedent; preserve deterministic clarification when recent history contains multiple plausible objects.
3. Prioritize Intelligence “Aborting and failing” for Mission-abort wording.
4. Prioritize setup “Starting Territory” for terse setup/token/enter-trigger questions.
5. Prioritize Diplomat Peace Treaty authority for terse six-Treaty/six-ratified-Proposal victory questions.
6. Prioritize Military “Initiating battles” for Rout/follow-up-battle questions.
7. Preserve explicit classification for direct single-authority Rite of Shattering and Rite of Echoes conditions, including terse follow-ups when their governing Rite source is selected.
8. Promote these nine genuine failures into focused regression coverage.
9. Do not change production behavior for the nine benchmark/source-contract defects above.
10. Preserve tranche G unchanged.
11. Before tranche H, improve the benchmark source contract so a direct case can express multiple **acceptable** governing passages instead of requiring one exact passage when the authority is duplicated or equivalently sufficient.
12. After r18 and QA-contract cleanup are merged, deployed, and regression-clean, author a genuinely fresh tranche H.
