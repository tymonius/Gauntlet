# Rules Arbiter Gate 3 blind tranche I audit — 2026-09-18

## Status

This document records the first valid paid-model execution of frozen Gate 3 blind tranche I against production behavior `v071-qa-20260918-19`.

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/35313122787
- Run attempt: 1
- Repository SHA: `096335c68eb03c92b430bb53ac52fba4c6956c69`
- Behavior revision: `v071-qa-20260918-19`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`
- Standard collection result: **54/61 passed**
- Standard semantic-v2 verdicts: **58 pass, 3 fail, 0 review**
- Combined standard result: **52/61 passed**
- Player-language collection result: **15/18 passed**
- Player-language semantic-v2 verdicts: **17 pass, 1 fail, 0 review**
- Combined player-language result: **15/18 passed**
- Clarification result: **5/5 passed**
- Artifact: `10533837714`
- Artifact SHA-256: `fcfccf067a119e16f3b1ed98cdafff9a3cf41463620515f9e42e1e196b4e8deb`

Tranche I is frozen blind evidence. Do not edit or retroactively regrade its datasets. Any production behavior change after r19 requires a fresh tranche J or later for certification.

## Audit conclusion

Twelve unique tranche-I records were marked failed by collection assertions, semantic grading, or both.

Manual adjudication against the frozen v0.7.1 authority partitions those records into:

- **5 genuine production/source-presentation defects across 4 systemic weaknesses**
- **7 benchmark/source-contract or classification false negatives**

The strongest I signals remain positive:

- all 5 fresh clarification probes passed;
- 58/61 standard answers passed semantic-v2;
- 17/18 player-language answers passed semantic-v2;
- the r19 continuity fixes held, including the Special Operation follow-up, the Command/Repel follow-up, and both out-of-scope probes.

The release gate still fails because I contains two materially wrong rulings plus one materially misleading yes/no ruling and one unsupported-source presentation weakness.

## Genuine defects

### 1. The Arbiter confused `+N Action` shorthand with a generic additional Action

Affected records:

- `blind-i-core-plus-action-current-phase-exception`
- `blind-i-player-plus-action-same-phase`

The questions explicitly use the printed shorthand `+1 Action` during Opening.

Published v0.7.1 defines:

> `+N Action` grants N additional Actions during the current phase. It increases the number of Actions permitted in that phase.

Production instead retrieved the generic **Additional Actions** rule for prose such as “take one additional Action this turn” and ruled that the second Action must wait for Denouement.

That is a material gameplay error. The two authority passages are compatible: generic additional-Action language does not normally permit two Actions in one phase, while the defined `+N Action` notation expressly does.

This requires retrieval/adjudication discipline that distinguishes the shorthand from generic additional-Action wording.

### 2. Reveal-Hand ruling used an insufficient governing citation

`blind-i-core-revealed-hand-remains-hand`

Production correctly ruled that revealing a Hand does not move its cards out of Hand. However, the only cited source was the **Hand** zone section, whose relevant sentence concerns physically setting a Hand aside during battle.

The directly governing published rule is **Revealing cards and zones**:

> To reveal a Hand or Reserve, its owner shows the entire zone to the opponent. The cards remain in that zone.

The gameplay ruling was correct, but the source presentation did not actually establish the specific reveal procedure. Because #1630 requires appropriate authority and strong restraint against unsupported confident rulings, this is a genuine retrieval/source-presentation defect rather than a gameplay-rule defect.

### 3. Ratified-Terms answer invented an unstated Détente state

`blind-i-diplomats-ratified-terms-no-new-reward`

Question:

> The opponent accepts a Proposal that was already ratified before I offered it. Do I gain the normal Influence reward for ratifying it again?

Production began:

> Yes.

It then correctly stated that the normal newly-ratified reward does not apply, but introduced **Détente** and said Détente separately grants +1 Influence.

The player never stated that Détente was banked. The direct answer to the asked question is **No**: an already-ratified Proposal grants no default ratification reward.

This is a material state-discipline error: the Arbiter imported an optional card state that was not present in the question and allowed that hypothetical exception to reverse the direct answer.

### 4. Negative-question polarity made a correct Purge explanation misleading

`blind-i-conversation-purge-after-final-judgment`

History established that Final Judgment had already produced its directly permitted Purge. The follow-up asked:

> And does that stop me from using my normal Purge Action later?

Production answered:

> Yes. Final Judgment does not use your once-per-turn Action permission for Purge, so you may still spend an Action on your normal Purge later that turn.

The explanation is mechanically correct, but **Yes** directly contradicts the negative-form question. The table-useful ruling is **No**: Final Judgment does not stop the later normal Action Purge.

This is a ruling-first/polarity defect. The first word of a short table ruling must agree with the proposition actually asked, especially for negative questions.

## Benchmark/source-contract or classification false negatives

These records should not drive production behavior changes.

### 1. Negated Tactic destination

`blind-i-core-negated-tactic-normal-destination`

Production correctly answered that the negated Tactic goes to its owner's Discard Pile. It cited **Clearing battle cards**, which directly states that Tactics go to the Discard Pile unless another rule changes the destination.

The benchmark required the narrower **Negation** passage. Given the question's explicit premise that no effect changes the destination, the selected clearing rule was sufficient to answer the requested destination.

### 2. Military Command cap — full-language case

`blind-i-military-command-cap-without-high-command`

Production correctly answered that Command remains at 2 and selected **Command and Orders**, whose excerpt begins:

> Military may have up to 2 Command.

The source-contract failure came from expecting the alternate literal wording `Command, maximum 2`. This is a string-contract false negative.

### 3. Onward movement ends when battle starts

`blind-i-military-onward-before-battle-only`

Production correctly answered that the movement sequence ends and unused movement is lost when the extra Position starts a battle.

It selected the complete movement rule:

> When movement initiates a battle, the current movement sequence ends and all unused movement in that sequence is lost.

The benchmark's literal alternative used different wording (“when movement begins a battle”). The selected source was directly sufficient.

### 4. Conviction maximum

`blind-i-inquisition-conviction-max-four`

Production correctly answered that Conviction cannot rise above 4 and cited both **Blasphemy** and **Conviction**, including:

> cannot exceed 4

and

> Conviction: Maximum 4.

The source contract failed only because of literal formatting differences.

### 5. Counterworks preventing Circle of Bones

`blind-i-interaction-counterworks-circle-bones-overlay`

Production correctly answered that Circle of Bones is discarded when Counterworks prevents it from becoming an Overlay.

The question itself stipulates that Circle of Bones is resolving to place its Overlay. Counterworks alone directly states that the card that would become the prevented Overlay is discarded. Requiring a second Circle of Bones citation and `inferred` classification was unnecessary for the proposition asked.

### 6. Military Command cap — terse case

`blind-i-player-command-cap`

Production correctly answered that Command remains capped at 2 and cited **Command and Orders** with the direct “may have up to 2 Command” rule. This is the same source-contract false negative as the full-language version.

### 7. Ritual defensive win classification

`blind-i-player-ritual-defensive-win`

Production correctly answered:

> No. You won the battle, but the Ritual only completes if the Mystic initiates that battle.

It cited the direct **Ritual of Ascension — Completion** authority, including:

> The Mystic must initiate the final battle.

The only failure was `inferred` versus the benchmark's expected `explicit`. The ruling and governing authority were correct.

## What tranche I establishes

Fresh blind evidence shows that r19 fixed the H defects it targeted:

- the generic Stake/Leverage continuity case passed;
- the Special Operation readiness-loss conversation follow-up passed;
- the Command-after-win conversation follow-up passed;
- creative and recommendation requests were correctly kept out of scope;
- all five new ambiguity probes correctly requested clarification.

The remaining systemic weaknesses are narrower:

1. the Arbiter can confuse notation-specific authority with superficially similar generic authority;
2. it can answer correctly while selecting a source that does not actually establish the precise procedure;
3. it can import an unstated optional card/effect into an otherwise fully specified rules question;
4. short yes/no answers can invert the polarity of a negative-form question even while the explanation is correct.

## r20 follow-up scope

Production remediation should remain narrow and systemic:

1. Prefer the **Rules Notation** `+N Action` authority when the player's question contains the literal shorthand `+1 Action`, `+2 Actions`, etc.; do not substitute the generic “additional Action this turn” rule.
2. For reveal-zone questions, prioritize **Revealing cards and zones** so the displayed source directly supports the ruling.
3. Do not introduce an optional named card, Asset, Leader ability, or faction effect that the player did not state is present or active merely because it could alter the general rule.
4. Add answer-generation discipline for yes/no questions, especially negative forms such as “does that stop/prevent…?”; the ruling-first polarity must match the explanation.
5. Promote the five genuine failed records into focused regression coverage.
6. Do not change production behavior to satisfy the seven false negatives above.
7. Preserve tranche I unchanged.
8. After r20 is merged, deployed, and regression-clean, certify with a genuinely fresh tranche J.
9. Even a later v0.7.1 blind pass does not complete #1630 until the proven Chief Justice behavior is ported to the final v0.7.2 authority/corpus and revalidated there.
