# Rules Arbiter Gate 3 blind tranche D audit — 2026-09-16

## Status

This document records the first valid paid-model execution of frozen Gate 3 blind tranche D against production behavior `v071-qa-20260915-14` and preserves the diagnosis that should drive the next Rules Arbiter revision.

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/35032602994 (attempt 2)
- Gate 3 tranche D source: `rules-arbiter-gate3-blind-d.v071.json`
- Player-language source: `rules-arbiter-gate3-blind-d-player-language.v071.json`
- Clarification source: `rules-arbiter-gate3-blind-d-clarifications.v071.json`
- Behavior revision tested: `v071-qa-20260915-14`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`
- Standard combined result: 35/61 passed; 26 failed
- Standard deterministic/non-semantic checks: 50/61 passed
- Standard semantic-v1 verdicts: 38 pass, 16 review, 7 fail
- Player-language combined result: 4/16 passed; 12 failed
- Player-language deterministic/non-semantic checks: 11/16 passed
- Player-language semantic-v1 verdicts: 6 pass, 9 review, 1 fail
- Clarification result: 0/4 passed
- Artifact: `10438224390`
- Artifact ZIP SHA-256: `223b6f987747e172e057f53acfb29fa645abf87ab57b66f66b2f9d0173cd8ea0`

Tranche D is now frozen blind evidence. Do not edit or retroactively regrade the D datasets. Failed D cases may become regression tests after diagnosis. Any behavior change after r14 requires a genuinely fresh blind tranche E or later.

## Audit conclusion

The 42 cases marked failed across the three D datasets are not 42 independent Arbiter defects. Manual adjudication against the frozen published v0.7.1 authority partitions them into:

- **13 genuine behavior failures**: 6 direct-authority classification errors, 1 over-eager deterministic clarification, 4 missed ambiguity clarifications, and 2 player-language retrieval/scope failures.
- **29 evaluator/source-contract-only false negatives**: the substantive ruling is useful and supported, but the frozen benchmark rejects it because of over-broad semantic criteria, over-eager `extra_material_claims`, or a needlessly exclusive expected source-title pattern.

This is an audit judgment over the immutable recorded outputs. It is not a replacement score for tranche D.

A separate protocol defect is now established by the run: semantic-v1 treats every reported `extra_material_claim` as a failing `review`, but the semantic evaluator receives only the question, history, answer, and benchmark propositions — not the cited rules sources. It therefore cannot determine whether an additional gameplay statement is unsupported or is simply correct, directly supported context. D contains many examples of the latter.

## Genuine behavior failures

### Direct authority incorrectly classified as inferred

Six cases gave substantively correct answers but exposed the wrong public ruling classification:

1. `blind-d-core-onset-withdraw-no-aftermath` — the cited no-winner/Onset authority directly states that an Onset-ending sequence has no battle result and no Aftermath.
2. `blind-d-diplomats-refused-then-withdraw` — Refused Terms directly states that a no-winner result returns the Stake and does not impose the Proposal.
3. `blind-d-diplomats-recognition-refused-reward` — Diplomatic Recognition directly states that imposing it grants no Influence.
4. `blind-d-player-tie-no-edge` — direct Defensive Edge/tie authority answers the ordinary-language question; the answer should not be downgraded merely because the player phrased the premise tersely.
5. `blind-d-player-late-withdraw-cards` — the cited clearing/no-winner rules directly state the relevant destinations.
6. `blind-d-player-refused-terms-withdraw` — Refused Terms directly states that the Stake is returned when the resulting battle ends without a winner.

These should be repaired systemically at the direct-authority classification boundary rather than by teaching the model six benchmark sentences.

### Deterministic clarification overfires despite a locally identified referent

7. `blind-d-inquisition-condemnation-conviction` — the question says that the opponent's Tactic entered the Graveyard because Condemnation changed its destination, then asks whether “that card” can satisfy the Conviction trigger. The deterministic guard returned “Which card do you mean?” even though the same question locally identifies the referent. This blocked retrieval and adjudication entirely.

The clarification guard must distinguish a genuinely unidentified deictic from a pronoun or noun phrase whose antecedent is already established in the current question.

### Ambiguous follow-ups fail to request clarification

All four frozen clarification probes should have stopped before model adjudication because the immediate exchange presents two plausible referents:

8. `blind-d-clarify-rally-entrench` — “that one” after comparing Rally and Entrench.
9. `blind-d-clarify-two-rites` — “that Rite” after comparing Rite of Crossing and Rite of Consecration.
10. `blind-d-clarify-two-financier-cards` — “that Asset” after comparing Margin Loan and Tariffs.
11. `blind-d-clarify-proposals` — “that one” after comparing Open Channels and Diplomatic Recognition.

The current deterministic detector is too narrow: it recognizes forms such as `this/that card`, `ability`, `effect`, and `feature`, but not generic `that one` or typed game-object nouns such as Rite, Asset, Proposal, Order, Mission, and similar objects. The repair should use current-question specificity plus the immediately preceding named-authority set, not a list of these four benchmark wordings.

### Player-language retrieval/scope failures

12. `blind-d-player-transmute-card-effect` — `i transmuted a card. do i get the text on the card too` failed to retrieve the direct Transmutation authority and produced a source-free provisional ruling. The written rule directly answers the question.
13. `blind-d-player-condemnation-even-lose` — `i lost. their tactic still gets condemned?` was classified `out_of_scope` and answered with a clarification request rather than applying Condemnation's direct Aftermath instruction.

These expose a broader lexical/retrieval weakness around ordinary inflected forms of named mechanics (`transmuted` → Transmutation, `condemned` → Condemnation). The fix should normalize or alias canonical mechanic names rather than hard-code only these two strings.

## Evaluator/source-contract-only false negatives

### Semantic-v1 `extra_material_claims` overreach

The following cases were substantively correct, but semantic-v1 converted correct supporting context into a failing `review` because that context was not itself enumerated as a required proposition:

- `blind-d-core-defensive-edge-uncontrolled`
- `blind-d-core-added-tactic-after-reveal`
- `blind-d-financiers-tariffs-replacement`
- `blind-d-intelligence-mission-satisfied-not-auto`
- `blind-d-mystics-ritual-withdrawal`
- `blind-d-inquisition-blasphemy-copied-arcane`
- `blind-d-grand-inquisitor-final-judgment-action-profile`
- `blind-d-conversation-rally-role-change`
- `blind-d-core-advantage-stacking`
- `blind-d-ranger-fieldcraft-defensive-edge`
- `blind-d-spirit-walker-guardians-position-requirement`
- `blind-d-player-command-their-turn`
- `blind-d-player-capital-over-limit`
- `blind-d-player-deed-control`
- `blind-d-player-faceup-interference`
- `blind-d-player-final-judgment-action`
- `blind-d-player-final-capture`
- `blind-d-player-two-advantage`

Several additional genuine-behavior cases also received spurious semantic-review reasons even though they fail for an independent classification/retrieval defect: `blind-d-core-onset-withdraw-no-aftermath`, `blind-d-diplomats-refused-then-withdraw`, `blind-d-diplomats-recognition-refused-reward`, `blind-d-player-late-withdraw-cards`, and `blind-d-player-transmute-card-effect`.

Examples of claims incorrectly treated as suspicious extras include the Command maximum while answering a Command trigger, the end-of-turn Capital-limit timing while answering whether excess Capital is lost immediately, and the fact that Fieldcraft can ignore the printed Territory effect while explaining why it still does not alter Defensive Edge. Those statements are mechanically relevant context and are directly supported by the authority used by the Arbiter.

`extra_material_claims` may remain useful telemetry, but it cannot be a failing verdict signal unless the evaluator is also given enough authority to determine that the extra claim is actually unsupported or contradictory.

### Required semantic criteria exceed the question asked

Six evaluator-only failures required the answer to restate additional mechanics that were not necessary to resolve the player's question:

- `blind-d-core-tiebreak-ignores-advantage` — required the rule for rerolling a tied Tiebreak Roll even though the question asks only whether advantage changes the Tiebreak dice.
- `blind-d-core-late-withdraw-clears-cards` — required no-winner/no-loss trigger consequences even though the question asks where committed cards go.
- `blind-d-military-command-on-opponent-turn` — required the Command maximum even though the question asks whether the first-win trigger works during the opponent's turn.
- `blind-d-conversation-final-judgment-normal-purge` — required the later normal Purge's Conviction cost even though the follow-up asks whether the Action-based Purge remains available.
- `blind-d-core-replacement-no-reveal-reopen` — required restating the replacement card's same-role eligibility even though the question already supplies that the replacement is an eligible Gambit and asks only whether a new reveal/response window opens.
- `blind-d-spymaster-mission-control-same-turn-completion` — required restating that Mission Control starts an eligible normal Mission from Hand even though the question supplies that premise and asks only about same-turn completion.

Future blind authoring should make required semantic propositions necessary to answer the actual question, not a checklist for reciting every nearby rule.

### Source-title assertions are too exclusive

Seven evaluator-only cases selected clean authority that supported the ruling but failed because the benchmark demanded another specific source title:

- `blind-d-core-late-withdraw-clears-cards`
- `blind-d-military-rout-new-battle`
- `blind-d-diplomats-mirror-refused-lockout`
- `blind-d-diplomats-rebuilding-pact-bank`
- `blind-d-mystics-invocation-copied-effect`
- `blind-d-core-specific-bank-permission`
- `blind-d-core-replacement-no-reveal-reopen`

Examples include Rebuilding Pact's printed Accepted effect directly granting the banking procedure without needing the generic “Directly permitted card procedures” rule, and the Interference-after-Surveillance authority directly stating that the replacement does not reopen the earlier window without requiring a second title merely because the same concept is also covered under “Replacing a Gambit or Tactic.”

Source checks should require sufficient governing authority, not one preferred heading when an equivalent clean authority directly supports the answer.

## r15 follow-up scope

Behavior remediation should remain narrow and systemic:

1. Make deterministic referent clarification sensitive to both current-question antecedents and multiple named candidates in the immediate exchange. Cover generic deictics (`that one`) and typed game-object referents, not just `card/ability/effect/feature`.
2. Add canonical lexical normalization/aliases for ordinary inflections of named rules and mechanics so player language such as `transmuted` and `condemned` retrieves the intended authority.
3. Strengthen the direct-authority classification boundary for directly enumerated no-winner, Terms, tie/Defensive Edge, and destination procedures in both formal and terse player phrasing.
4. Promote the 13 genuine D failures into deterministic regression coverage. Do not encode the 29 evaluator-only cases as behavior changes that force shorter or less useful answers.
5. Revise semantic QA so unsupported extra claims can still be detected without automatically failing correct supported context. At minimum, `extra_material_claims` should be non-failing telemetry while the semantic evaluator lacks the cited authority passages.
6. Tighten future benchmark authoring: required propositions must answer the question actually asked, and source assertions must allow any sufficient clean governing authority rather than a single preferred title.
7. Preserve tranche D unchanged.
8. After r15 and the evaluator protocol are regression-clean, author and freeze a genuinely fresh tranche E for the next Gate 3 blind certification attempt.
