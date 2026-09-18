# Rules Arbiter Gate 3 blind tranche H audit — 2026-09-18

## Status

This document records the first valid paid-model execution of frozen Gate 3 blind tranche H against production behavior `v071-qa-20260917-18`.

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/35306032572
- Run attempt: 1
- Repository SHA: `4c888b0ae646b949862c49524290195df8e88905`
- Behavior revision: `v071-qa-20260917-18`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`
- Standard collection result: **51/61 passed**
- Standard semantic-v2 verdicts: **57 pass, 4 fail, 0 review**
- Combined standard result: **50/61 passed**
- Player-language collection result: **18/18 passed**
- Player-language semantic-v2 verdicts: **16 pass, 2 fail, 0 review**
- Combined player-language result: **16/18 passed**
- Clarification result: **5/5 passed**
- Artifact: `10532075396`
- Artifact SHA-256: `c2412a412cb4b8623f7a65bc1174751402d3bd5f303ba207205c86d41ac39272`

Tranche H is frozen blind evidence. Do not edit or retroactively regrade its datasets. Any production behavior change after r18 requires a fresh tranche I or later for certification.

## Audit conclusion

Thirteen unique H records were marked failed by collection assertions, semantic grading, or voice grading.

Manual adjudication against the frozen v0.7.1 authority partitions them into:

- **4 genuine production defects**
- **9 benchmark/source-contract or evaluator false negatives**

The strongest H signals are positive:

- all 18 terse player-language cases passed collection;
- all 5 fresh clarification probes passed;
- 57/61 standard answers passed semantic-v2;
- most standard collection failures were classification/source-contract disagreements despite substantively correct rulings.

The release gate still fails because H contains several real material errors, including two wrong gameplay rulings. H must remain frozen and must not be rerun as certification evidence after remediation.

## Genuine production defects

### 1. Generic Stake question incorrectly triggered deterministic clarification

`blind-h-diplomats-stake-unavailable-for-leverage`

Question:

> After my Terms are refused, can I spend the Influence still tied up in that Proposal's Stake on Leverage before dice?

Production returned a deterministic clarification asking which Proposal was meant.

That identity is irrelevant. The published rule directly states that **Staked Influence cannot be spent as Leverage**. The question supplies all state required to answer.

This is a clarification-guard defect: a generic rules question containing a possessive referent such as “that Proposal's Stake” should not force clarification when the requested rule does not depend on the object's identity.

### 2. Conversation continuity produced a materially wrong Special Operation ruling

`blind-h-conversation-special-op-readiness-change`

History established Operation Progress 4, opponent controls 3 Territories, and an already-started Special Operation. The follow-up said the opponent captured another Territory before Denouement.

Production answered that the Special Operation was merely “no longer ready” and could become ready again later.

Published v0.7.1 says the opposite:

> If readiness is lost, it immediately fails and goes to the Graveyard.

This is a material gameplay error. The follow-up lost the specific Special Operation readiness/failure authority and substituted a generic Special Operation victory description.

### 3. Terse Commandant question contradicted the selected authority

`blind-h-player-commandant-repel-fresh-command`

Question:

> win defense at zero command. can repel now?

Production selected the correct Military Command/Orders authority and Repel, but answered **No**, inventing a withdrawal state that the player never supplied.

The governing rule explicitly says:

- determine the winner;
- gain normal Command;
- newly gained Command may pay for an Order whose timing occurs during the Aftermath.

Therefore a first defensive win at 0 Command can supply the 1 Command needed for Repel.

This is a generation-discipline defect: the model introduced an unstated exception that contradicted both the question's “win” state and its own selected source.

### 4. Out-of-scope creative request was fulfilled instead of kept within Arbiter scope

`blind-h-out-of-scope-card-writing`

Question:

> Can you write flavor text for a new Financier card?

Production correctly classified the request as `out_of_scope` and returned `responseType: out_of_scope`, but then supplied flavor text:

> Certainly: “Every conquest begins as a line item.”

Issue #1630 explicitly requires competent handling of out-of-scope/meta questions. The Rules Arbiter should identify that creative game-design/writing work is outside the gameplay-rules role rather than performing it.

This is a response-discipline defect after correct routing.

## Benchmark/source-contract or evaluator false negatives

These failures should not drive production behavior changes.

### 1. Voluntary Asset replacement was correctly answered explicit

`blind-h-core-voluntary-asset-replacement-not-removed`

Production correctly answered that voluntarily discarding an Asset to make room while banking a new Asset is not Removal. It selected both **Removed Assets** and **Replacing an Asset**.

The benchmark expected `inferred`, while production returned `explicit`. The semantic evaluator passed the ruling. The selected published passages directly settle the question; this classification disagreement is not a gameplay defect.

### 2. Deep Occupation answer used sufficient direct authority

`blind-h-core-attack-win-occupation-not-control`

Production correctly answered that winning as attacker does not immediately grant control, that the player occupies the Territory, and that normal Capture advances only the next Territory beyond the Front Line.

It selected **Occupation** and **Normal Capture**, both sufficient. The benchmark additionally required the **Normal result** source and expected `inferred`. The semantic evaluator passed the ruling.

### 3. Full fresh-Command/Repel case was correctly answered explicit

`blind-h-military-fresh-command-can-pay-repel`

Production correctly answered **Yes**, selected Repel plus the Command/Orders rule, and explicitly stated that newly gained Command can pay for Repel in the same Aftermath.

The benchmark expected `inferred`; the response was `explicit`. The semantic evaluator passed it. This is not a production defect.

The separate terse player-language version exposed a genuine generation error and is audited above.

### 4. Refused-Terms withdrawal selected equivalent governing passages

`blind-h-diplomats-refused-then-withdraw-return-stake`

Production correctly returned the Stake and did not impose or ratify the Proposal.

It selected both **Withdrawal** and **Refused Terms**, including the exact substance:

> If the battle later ends without a winner, return the Stake and do not impose the Proposal.

The frozen source contract required a different concatenated phrase and failed collection even though the selected passage was sufficient. Semantic grading passed.

### 5. Purge answer selected the narrower equivalent wording

`blind-h-inquisition-purge-two-phases-not-same-phase`

Production correctly answered that a Purge Action in Opening allows the other Action in Denouement and never permits both Actions in Opening.

The selected Purge passage says:

> This never permits two Actions in one phase.

The frozen benchmark required the alternate wording “Purge never permits two Actions during the same phase.” The semantic evaluator passed the answer.

### 6. Ratified-Proposal Cordiality answer was correctly explicit

`blind-h-ambassador-cordiality-on-ratified-acceptance`

Production correctly answered that Cordiality still draws after accepted Terms even when the Proposal was already ratified, while correctly distinguishing the missing new-ratification reward.

The benchmark expected `inferred`; production returned `explicit`. Semantic grading passed.

### 7. Anathema alone was sufficient for the stipulated Invocation interaction

`blind-h-interaction-anathema-stops-invocation-move`

The question itself stipulates that Invocation would move a card from the Mystic's Graveyard to the Discard Pile. Production selected **Anathema**, which directly says it may stop an opponent-controlled effect from moving cards from that opponent's Graveyard to another zone.

The answer was correct. Requiring a separate Invocation citation and `inferred` classification was unnecessary for the proposition actually asked.

### 8. Faction-strength response was already routed out of scope

`blind-h-out-of-scope-faction-power-ranking`

Production returned `rulingStatus: out_of_scope`, `responseType: out_of_scope`, no rules citations, and said the rules provide no comparative strength ranking or balance criterion.

The semantic criterion additionally required the prose answer to explicitly say “out of scope.” The routing and substantive response already expressed the correct limitation. This is evaluator over-demand, not a production rules defect.

### 9. Terse Cordiality answer directly answered the question

`blind-h-player-ambassador-old-treaty-cordiality`

Question:

> old treaty accepted. cordiality draw?

Production answered:

> Yes. After your opponent accepts your Old Treaty Terms, Cordiality triggers and you draw one card, once per turn.

It selected Accepted Terms and Cordiality and passed collection. The semantic evaluator failed it only because the answer did not restate that “old treaty” meant already ratified. The direct yes-answer is responsive to the supplied premise and mechanically correct.

## What tranche H establishes

Fresh blind evidence shows a meaningful improvement over G in several areas:

- **18/18 player-language collection** — terse retrieval/classification itself is now strong.
- **5/5 clarification** — the new ambiguous-follow-up probes all correctly requested clarification.
- **57/61 standard semantic pass** — most complex and cross-system rulings were substantively correct.
- The remaining material gameplay errors are now concentrated rather than broad.

The remaining production weaknesses are:

1. clarification guards can still overreact to a generic possessive referent whose identity is irrelevant;
2. conversation continuity can lose a specific failure procedure and fall back to a generic feature description;
3. answer generation can introduce an unstated exception that contradicts explicit question state and selected authority;
4. out-of-scope routing does not yet reliably constrain the final answer.

## r19 follow-up scope

Production remediation should remain narrow and systemic:

1. Do not ask which Proposal/card/etc. is meant when the question is generic and the requested rule is independent of the object's identity; specifically cover possessive constructions such as “that Proposal's Stake.”
2. For active Special Operation follow-ups involving opponent control changes, prioritize the **Readiness and completion** authority, including the immediate-failure rule.
3. Add generation discipline: never replace an explicit user-stated game fact with an unstated exception. A prompt that says the player **won** must not be treated as withdrawal unless the user says the sequence ended without a winner.
4. When routing a request as `out_of_scope`, return a concise scope boundary rather than performing the requested creative/design/meta work.
5. Promote the four genuine failures into focused regression coverage.
6. Do not change production behavior to satisfy the nine false negatives above.
7. Preserve tranche H unchanged.
8. After r19 is merged, deployed, and regression-clean, author a genuinely fresh tranche I.
9. The Chief Justice gate in #1630 remains open after any v0.7.1 blind pass until the proven behavior is ported to the final v0.7.2 authority/corpus and revalidated there.
