# Rules Arbiter Gate 3 blind tranche E audit — 2026-09-17

## Status

This document records the first valid paid-model execution of frozen Gate 3 blind tranche E against production behavior `v071-qa-20260916-15`, and preserves the diagnosis that should drive the next Rules Arbiter revision.

The initial workflow attempt did **not** constitute a valid standard/player-language certification run. The new tranche-E workflow had not yet been added to the production GitHub Actions OIDC allowlist, so the production endpoint returned `local-budget-fallback` during preflight and made no standard or player-language model calls. The five deterministic clarification probes did run and passed. That infrastructure defect was fixed by #1770 without changing Arbiter adjudication behavior or the frozen benchmark.

The same workflow run was then retried as attempt 2 after the authorization fix.

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/35290562983
- Valid execution: attempt 2
- Gate 3 tranche E source: `rules-arbiter-gate3-blind-e.v071.json`
- Player-language source: `rules-arbiter-gate3-blind-e-player-language.v071.json`
- Clarification source: `rules-arbiter-gate3-blind-e-clarifications.v071.json`
- Behavior revision tested: `v071-qa-20260916-15`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`
- Standard combined result: **47/61 passed; 14 failed**
- Standard semantic-v2 verdicts: **60 pass, 1 fail, 0 review**
- Player-language combined result: **14/18 passed; 4 failed**
- Player-language semantic-v2 verdicts: **17 pass, 1 fail, 0 review**
- Clarification result: **5/5 passed**
- Valid artifact: `10526624492`
- Artifact SHA-256: `c8e4fdf78bec3d3a93ed412de90fad262ea63d5a597716934c609a3d4467da53`
- Invalid attempt-1 artifact: `10525858737`

Tranche E is frozen blind evidence. Do not edit or retroactively regrade its datasets. Failed E cases may become regression tests after diagnosis. Any behavior change after r15 requires a genuinely fresh tranche F or later for certification.

## Audit conclusion

The 18 records marked failed across the standard and player-language datasets are not 18 independent Arbiter defects.

Manual adjudication against the frozen published v0.7.1 authority partitions them into:

- **13 genuine behavior-failure records**, representing **11 distinct defect families** after duplicate player-language manifestations are collapsed.
- **5 evaluator/source-contract false negatives** where the substantive ruling was correct and the failure came from an unnecessarily exclusive source assertion, a benchmark classification expectation that conflicts with the release-source conflict policy, or a semantic criterion that demanded information the player did not ask for.
- **5/5 clarification probes passed**, confirming that the r15 ambiguity remediation held on a fresh blind set.

Only one standard answer was substantively wrong: the Special Operation completion-cost case. The other genuine failures were classification, retrieval, or gap-handling defects despite substantively correct rulings.

## Genuine behavior failures

### Direct written authority still downgraded from explicit

Four fresh cases were answered correctly but classified as `inferred` despite a retrieved source directly stating the required result.

1. `blind-e-core-no-winner-no-victory-trigger` — “Battles ending without a winner” directly states that an effect conditioned on winning or losing does not apply when a battle ends without a winner.
2. `blind-e-military-command-cap-first-win` — “Command and Orders” directly states that winning while already at 2 Command still counts as the first Military victory of the turn.
3. `blind-e-military-withdraw-no-command` — “Command and Orders” directly states that withdrawal has no winner and generates no Command.
4. `blind-e-player-accepted-terms-no-aftermath` — “Accepted Terms” directly states that accepted Terms end during Onset with no Aftermath.

These extend the same systemic direct-authority classification boundary exposed by earlier blind tranches. The fix should recognize direct negative/result statements and terse player phrasing without promoting genuinely combined interactions.

### Generic reroll rule missed

5. `blind-e-core-reroll-replaces-result`

The answer reached the correct result — use the rerolled 2 instead of the original 6 — but retrieval selected the Tiebreak Roll section rather than the generic “Rerolls” authority. The Arbiter therefore downgraded itself to a provisional ruling and invented an unnecessary designer-review wrapper around a rule that is directly written.

The retrieval layer should surface the generic reroll rule for ordinary reroll wording, not only battle-specific reroll material.

### Special Operation completion cost answered incorrectly

6. `blind-e-intelligence-special-op-cost-minimum`

This is the clearest substantive failure in tranche E.

The question supplies six Territories in the Gauntlet and a value-5 ready Special Operation. Published v0.7.1 states:

> Territories currently in the Gauntlet − Special Operation card's value, minimum 1 Intel.

The correct payment is therefore **1 Intel**. The Arbiter instead answered **5 Intel**, treated card value as the cost, cited only faction/Leader overview material, and classified the ruling provisional.

This is a retrieval-priority failure: the specific “Readiness and completion” procedure must outrank generic Special Operation summary text when the question asks for the completion payment.

### Cross-authority interactions incorrectly labeled explicit

Three standard cases and two player-language cases correctly combined multiple authorities but exposed the ruling as `explicit` rather than `inferred`.

7. `blind-e-interaction-reembodiment-transmutation`
8. `blind-e-player-reembodiment-transmute`
9. `blind-e-interaction-anathema-necromancy`
10. `blind-e-player-anathema-necromancy`
11. `blind-e-interaction-phantom-passage-occupied-controlled-territory`

The first two defect families are duplicated formal/player-language manifestations:

- Reembodiment + Transmutation requires applying Reembodiment's trigger text to the separate Transmutation procedure.
- Anathema + Necromancy requires applying Anathema's replacement/prevention text to the separate Necromancy movement instruction.
- Phantom Passage + occupied Position requires the card's movement instruction plus the general rule that entering the opponent's Position initiates a battle.

The player-facing conclusions were correct. The defect is classification and, for Phantom Passage, retrieval: the Arbiter cited only the card while relying on an uncited general movement rule.

The r13 boundary intentionally preserves genuine combined-authority interactions as inferred. Production normalization currently promotes some inferred answers but does not reliably demote model-supplied `explicit` answers when the answer actually depends on multiple independent authorities.

### Ritual follow-up fell back to provisional despite direct authority

12. `blind-e-conversation-ritual-defender-win`

The follow-up asks whether a Ritual of Ascension completes when the opponent initiated the battle and the Mystic won as defender. The published completion rule directly requires the Mystic to **initiate** the final battle, while the interruption rule triggers on a loss.

The Arbiter gave the correct “does not complete” result but retrieved only Quick Battle Reference material and classified it provisional. Conversation context did not keep the governing Ritual authority in scope.

Follow-up retrieval should preserve the named mechanic from recent history and retrieve its specific completion/interruption authority.

### Rules-gap classification failed

13. `blind-e-gap-concession-procedure`

The answer correctly stated that v0.7.1 defines victory conditions but no formal concession procedure. It classified that result as `inferred`.

Under the Arbiter's classification contract, a gameplay procedure absent from the governing rules is a rules gap and should be surfaced as `provisional`, not as a written rules interpretation. The answer must continue to avoid inventing a concession mechanic.

## Evaluator/source-contract false negatives

These cases should **not** drive behavior changes.

### Sufficient authority rejected because the benchmark demanded another heading

1. `blind-e-core-last-stand-needs-new-movement`

The answer was explicit, correct, and cited the more specific “Forcing the Opponent to Make a Last Stand › Complete rules” section plus Movement. The benchmark nevertheless required the title pattern “Final Territory and Last Stand.” The selected source directly contains the required new-movement-sequence rule and is sufficient authority.

2. `blind-e-diplomats-attacker-first-terms`

The Arbiter cited “Diplomat mirrors,” which directly states that the attacker offers first and the defender may offer after the attacker passes. The benchmark additionally required “Offering Terms.” That second heading is unnecessary.

3. `blind-e-executive-hostile-takeover-occupier-cost`

Hostile Takeover itself expressly says to treat the Executive as occupier for cost. The Arbiter correctly answered that the position modifier is 0. Requiring the generic “Buying and buying out Deeds” heading as an additional citation was unnecessary for the property actually asked.

Future source assertions need an alternative/sufficient-authority contract rather than interpreting every listed source title as conjunctively required.

### Leveraged Buyout benchmark expected the wrong classification

4. `blind-e-card-leveraged-buyout-battle-collateral`

The substantive answer was correct: the printed card says battle collateral goes to the Graveyard when battle cards are cleared.

However, frozen v0.7.1 contains a real source conflict:

- printed Leveraged Buyout: battle collateral goes to the Graveyard **when battle cards are cleared**;
- Rulebook Collateral summary: Leveraged Buyout collateral used from battle goes to the Graveyard **after the purchase**.

The production classifier deliberately demotes this known specific-card-vs-summary conflict to `inferred` while applying the Golden Rule that specific text controls. Tranche E incorrectly expected `explicit`.

The benchmark failure is therefore not a new behavior defect.

### Player-language semantic criterion exceeded the question asked

5. `blind-e-player-guardians-two-rites`

Question: “two rites complete. what value arcane do guardians need?”

Answer: “They need an Arcane card with value at least 3.”

That fully answers the player's value question. The semantic criterion additionally required the answer to state that the card comes **from Hand**, which the player did not ask about. Treating that omission as a semantic failure repeats the benchmark-authoring problem identified in tranche D.

Future required semantic propositions must remain limited to information necessary to answer the actual question.

## What tranche E establishes

Fresh blind evidence supports several positive conclusions:

- deterministic ambiguity handling held at **5/5**;
- the overwhelming majority of substantive rulings were correct;
- semantic-v2 did not repeat semantic-v1's extra-material-claim overreach: **77 of 79 model-evaluated answers received semantic pass verdicts**, with no semantic reviews;
- the remaining weaknesses are concentrated in retrieval and classification boundaries rather than broad adjudication quality;
- the only clearly wrong gameplay result in the standard/player-language run was the Special Operation payment.

The combined benchmark score must still remain recorded as failed. Audit interpretation does not replace or retroactively rescore the frozen run.

## r16 follow-up scope

Behavior remediation should remain narrow and systemic:

1. Extend direct-authority classification for:
   - battle-no-winner victory/loss triggers;
   - Command-at-maximum first-win accounting;
   - withdrawal/no-Command;
   - accepted-Terms/no-Aftermath in terse player language.
2. Improve generic reroll retrieval so ordinary reroll questions select the “Rerolls” authority.
3. Prioritize Special Operation “Readiness and completion” over generic faction/Leader summaries when the question asks for completion cost or readiness procedure.
4. Add a systemic combined-authority demotion boundary so model-supplied `explicit` answers become `inferred` when the requested result materially depends on applying multiple independent authorities, while preserving explicit classification when one source directly states the complete answer.
5. Preserve cross-authority retrieval for Reembodiment + Transmutation, Anathema + Necromancy, and Phantom Passage + Position; ensure Phantom Passage also cites the governing movement rule.
6. Improve conversation-topic retrieval so a terse Ritual follow-up continues to retrieve Ritual of Ascension completion/interruption authority.
7. Classify a confirmed absence of a requested gameplay procedure as a provisional rules gap rather than an inferred written rule.
8. Promote the 13 genuine failure records into regression coverage, deduplicating repeated formal/player-language manifestations where appropriate.
9. Do not encode the five evaluator/source-contract false negatives as behavior changes.
10. Preserve tranche E unchanged.
11. After r16 is merged, deployed, and regression-clean, author and freeze a genuinely fresh tranche F for the next Gate 3 certification attempt.
