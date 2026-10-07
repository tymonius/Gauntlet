# Rules Arbiter Gate 3 blind tranche Q audit — 2026-09-18

## Status

This document records the first valid paid-model execution of frozen Gate 3 blind tranche Q against production behavior `v071-qa-20260918-27`.

- Workflow run: https://github.com/tymonius/Gauntlet/actions/runs/35351544188
- Repository SHA: `afecd85de6d48bdf2432b825e3c063591e692336`
- Behavior revision: `v071-qa-20260918-27`
- Authority set: `5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339`
- Standard collection: **47/47 passed**
- Standard semantic verdicts: **45 pass, 2 fail, 0 review**
- Player-language collection: **13/14 passed**
- Player-language semantic verdicts: **13 pass, 1 fail, 0 review**
- Clarifications: **5/5 passed**
- Artifact: `10550616191`

Tranche Q is frozen blind evidence and must not be edited or rerun as later certification evidence.

## Precommitted acceptance criterion

Before Q ran, issue #1630 recorded that Q would be the last planned v0.7.1 tranche unless it exposed a genuine repeatable/systemic failure mode, a materially wrong rules pattern, or a new unsupported-confidence pattern.

Q does **not** close the v0.7.1 development-corpus loop because it exposed two genuine defects that meet that standard:

1. a materially wrong direct ruling about replacement language using **instead**;
2. recurrence of the already-known ruling-first polarity failure mode, where the answer begins with the opposite yes/no result from the explanation and authority.

A fresh tranche R is therefore justified under the criterion recorded before Q ran. This is not a request to continue until a numerically perfect run occurs.

## Genuine defects

### 1. Demilitarized Zone capture replacement was ruled backwards

`blind-q-demilitarized-zone-capture`

Question:

> A Territory with Demilitarized Zone would be captured. What happens to the Overlay and the capture?

The selected card authority directly says:

> When this Territory would be captured, discard this Overlay instead.

Production answered:

> Discard Demilitarized Zone instead; the Territory is still captured normally.

That reverses the ordinary meaning of the direct replacement instruction: discarding the Overlay occurs **instead of** the capture. The response was high-confidence and cited the authority that contradicted its own ruling.

This is a material gameplay error. r28 should add systemic generation discipline for direct `would ... instead` replacement language rather than a card-name exception.

### 2. Strategic Withdrawal repeated the ruling-first polarity defect

`blind-q-player-strategic-withdrawal`

Question:

> strategic withdrawal in denouement after movement ended starts a new 1-position movement sequence?

The selected card authority directly says that playing Strategic Withdrawal during Denouement after normal Movement has ended begins a new Movement sequence with up to one Position of movement.

Production answered:

> No. Strategic Withdrawal’s Action explicitly says that ... you begin a new Movement sequence with up to one Position of movement.

The explanation is correct but the leading ruling is the exact opposite. This is the same systemic answer-polarity family previously exposed in tranche I, so its recurrence is release-significant under the precommitted Q criterion.

The existing terse-confirmation guard only covered very short declarative questions and did not cover this 13-word player-language confirmation. r28 should generalize that guard without turning ordinary wh-questions into yes/no prompts.

### 3. Actuarial Alchemy omitted the activation condition

`blind-q-actuarial-alchemy-tiebreak`

Production correctly answered that a Tiebreak Roll margin can be used, but omitted the card's condition:

> you may put this card in your Graveyard. If you do, gain Capital ...

The answer therefore made the benefit sound less conditional than the printed effect. This is a real but lower-severity table-presentation omission. It would not by itself justify tranche R under the precommitted criterion, but r28 should fix it systemically by preserving optional activation costs when stating their benefits.

## Non-blocking collection disagreement

### Terse Demilitarized Zone reaction classification

`blind-q-player-demilitarized-zone`

Production gave the correct ruling and the semantic evaluator passed it. Collection failed only because production returned `inferred` rather than the benchmark's `explicit`, after including both the general Accepted Terms sequence and the direct Demilitarized Zone text.

Under the precommitted Q criterion, this classification disagreement does not itself block certification and should not drive behavior changes.

## r28 scope

1. Preserve direct replacement semantics: when authority says `when X would happen, do Y instead`, do not also apply X absent separate authority.
2. Generalize declarative yes/no confirmation polarity discipline so the first ruling word cannot contradict the explanation.
3. Preserve optional activation/cost conditions when stating a card's resulting benefit.
4. Add focused regression coverage for the three genuine Q defects.
5. Do not change behavior merely to satisfy the Demilitarized Zone `explicit` versus `inferred` collection disagreement.
6. Preserve tranche Q unchanged.
7. After r28 is merged, deployed, regression-clean, and live-verified, author one fresh tranche R. R is justified because Q met the precommitted systemic/material-failure escape clause, not because Q was numerically imperfect.
