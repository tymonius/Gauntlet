# Rules Arbiter Gate 3 blind tranche A audit — 2026-09-13

## Status

This document records the first authenticated paid-model run of frozen Gate 3 blind tranche A and preserves the diagnosis that should drive follow-up work.

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/34766231263
- Gate 3 tranche A source: `rules-arbiter-gate3-blind-a.v071.json`
- Player-language source: `rules-arbiter-gate3-blind-a-player-language.v071.json`
- Clarification source: `rules-arbiter-gate3-blind-a-clarifications.v071.json`
- Behavior revision tested: `v071-qa-20260913-9`
- Standard: 27/43 (62.8%)
- Player-language: 14/20 (70.0%)
- Clarification: 2/3

Tranche A is frozen blind evidence. Do not edit it or reuse it as evidence of a later blind pass after behavior changes. Failed A cases may be promoted into regression tests. A future behavior revision requires a newly authored blind tranche B or later for blind validation.

## Audit conclusion

The 23 failed checks are not 23 independent Arbiter defects. The post-run audit separates them into:

- **8 genuine behavior defects**: retrieval/continuity, deterministic clarification, or classification boundary problems.
- **14 evaluator false negatives**: the substantive ruling is supported, but the evaluator requires brittle literal wording/source-pattern matches.
- **1 authority/spec mismatch**: the expected answer requires a rule that published v0.7.1 authority does not actually state.

This partition is an audit judgment based on the recorded outputs and current v0.7.1 authority. It is not a replacement score for the frozen benchmark.

## Genuine behavior defects

### Retrieval and continuity

1. **Forced March follow-up loses the named-card authority.** The history identifies Forced March, but the follow-up retrieves generic movement authority and incorrectly permits the extra movement to initiate a battle. Forced March directly says its additional movement cannot initiate a battle.
2. **Colloquial battle-card quantity question misses the direct rule.** `how many battle card do i get to use` retrieves battle sequence summaries that omit quantity and becomes provisional even though the Rulebook directly states one Gambit from Hand and one Tactic from the three-card Reserve.
3. **Colloquial Tactic destination question misses destination authority.** `what about the tactic, discard or graveyard?` retrieves no governing source and asks for an unidentified Tactic even though the question is about the normal Tactic destination.
4. **Colloquial accepted-Terms question is not mapped to Terms.** `if they say yes to my deal do we still fight` is treated as an unidentified “Deal” instead of retrieving Accepted Terms, which directly states that no battle is fought.

### Deterministic clarification

5. **Generic `that card` is not recognized as an unresolved referent.** With both Forced March and Give Chase in the immediate exchange, `Can that card's movement be the move that starts a battle?` reaches the model instead of deterministic clarification.

### Classification boundaries

6. **Accepted Terms + Military Command is over-classified as explicit.** Accepted Terms establishes that the sequence ends during Onset without a battle win; Military Command triggers on winning a battle. The no-Command result is a combined-authority consequence and should be `inferred`.
7. **Guardians of the Circle arithmetic is over-classified as inferred.** The direct ability states value >= 1 + completed Rites. Substituting two completed Rites into that stated formula gives 3 without introducing an independent rule premise; the result should remain `explicit`.
8. **Nature's Altar direct permission is over-classified as inferred.** The card itself says a Rite begun this way may complete this turn if its condition/timing and Territory-control condition are met. The queried exception is therefore directly stated and should remain `explicit`.

## Evaluator false negatives

The following failed checks produced rulings that were substantively supported but failed because the evaluator required a particular literal token, contiguous phrase, or source-pattern match rather than semantic equivalence:

- Graveyard entry trigger — evaluator required `still`.
- Unselected Rite — answer correctly said the Rite was not selected / not in the package and could not be begun.
- Effect-generated failed Purification draw — answer correctly distinguished an effect-generated draw from the Purge trigger.
- Commandant Repel retreat — answer correctly applied one additional Position after the normal retreat; evaluator required literal `After`.
- Senator Political Capital — answer correctly recovered two of three staked Influence and lost one.
- Alchemist Materia Prima battle draw — answer correctly placed the draw after the battle's Aftermath.
- Grand Inquisitor Final Judgment after Purge — answer correctly distinguished a separate No Action Purge from the Action-Purge permission.
- Hellfire — answer correctly limited each Conviction to one chosen option; evaluator required literal `one benefit`.
- Landslide — answer correctly sent the owned card to the player's Discard Pile; evaluator required literal `card owner`.
- Paths of Shadow — answer correctly replaced the normal retreat; evaluator required a particular phrase.
- Conversation topic switch to Purification — substantive negative ruling was correct; source/name matching was brittle.
- Player-language unpicked Rite — substantive negative ruling was correct; source phrase matching was brittle.
- Player-language Repel distance — answer correctly said +1 Position; evaluator required `one additional`.
- Player-language Action count — answer correctly said the player normally has 1 Action total; evaluator required `one Action`.

These cases should inform evaluator hardening, not Arbiter rule changes.

## Authority/spec mismatch: Counterworks

Gate 3 expected Counterworks to state an explicit destination for the prevented Overlay card. Published v0.7.1 authority does not support that expectation.

- Counterworks says: `The card that would become that Overlay is discarded.`
- The v0.7.1 Rulebook separately defines and names the **Discard Pile**, but does not define bare `discard` / `discarded` as an automatic destination rule equivalent to `put it in its owner's Discard Pile`.

Therefore the Arbiter must not be taught that unstated rule merely to satisfy tranche A. The game authority or benchmark expectation needs correction/clarification separately.

## r10 follow-up scope

Behavior work should remain narrow and systemic:

1. Preserve recent named-card authority for context-dependent follow-ups.
2. Recognize generic `that card` / possessive `that card's` and deterministically clarify when multiple recent card subjects are viable.
3. Broaden normal battle-card quantity/destination retrieval for ordinary player language.
4. Map clear `accept/say yes/agree` + `deal/offer/terms` + `fight/battle` phrasing to Accepted Terms.
5. Tighten classification guidance so direct arithmetic substitution and directly stated card exceptions remain explicit, while cross-authority trigger consequences remain inferred.
6. Add focused regression tests for the genuine defects only.
7. Do not modify frozen Gate 3 tranche A.
8. Validate the next behavior revision against regressions first, then author a new blind tranche for Gate 3 evidence.
