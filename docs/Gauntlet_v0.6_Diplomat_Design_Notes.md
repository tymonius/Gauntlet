# Gauntlet v0.6 Diplomat Design Notes

**Status:** Active v0.6 design rationale and implementation notes.  
**Rules source of truth:** `Gauntlet_v0.6_Working_Rules.md`.  
**Card source of truth:** `Gauntlet_v0.6_Diplomat_Card_Pool.md`.  
**Supplemental-component source of truth:** `Gauntlet_v0.6_Diplomat_Supplemental_Cards.md`.

---

## Scope decision

The revised Diplomat framework is part of the initial **v0.6 faction release**. It is no longer deferred to v0.6.1.

The earlier framework—generic Loss of Face, an Influence-based Peace Treaty threshold, and loosely distributed Influence rewards—is obsolete. Diplomat faction cards, leaders, Proposal cards, reference components, starter decks, canonical data, and digital implementation should use the staking, acceptance-growth, Leverage, and Treaty Article model from the beginning.

---

## Core model

Diplomats convert conflict into legitimacy through three linked systems:

1. **Proposals** create an accept-or-refuse decision before battle.
2. **Treaty Articles** are the public progress track toward Peace Treaty.
3. **Influence** is political capital gained through agreement, imposition, bargains, and pressure; staked to offer stronger Proposals; spent through Leverage; and risked when negotiations fail.

The key distinction is:

> Treaty Articles are victory progress. Influence is leverage.

Peace Treaty is achieved by ratifying five different Proposals as Treaty Articles. Influence is not part of the victory check.

Diplomats begin with **1 Influence** and may have up to **10 Influence**. Any Influence gained beyond 10 is lost. The starting point gives immediate access to the stake-1 Proposal tier or one point of Leverage without making the two strongest Proposals immediately available.

---

## Influence stakes and Terms outcomes

Each Proposal lists an **Influence Stake** of 0, 1, or 2.

To offer a Proposal, the Diplomat must have at least its listed stake available. Lower the Influence Tracker by that amount; it becomes staked until the Terms resolve and cannot be spent through Leverage or another effect. The Proposal's printed stake records the amount at risk, so no separate stake marker is needed.

| Outcome | Treaty result | Influence result |
|---|---|---|
| Opponent accepts | Ratify the Proposal if it is not already ratified | Return the stake; if newly ratified, gain Influence equal to the listed stake |
| Opponent refuses and the Diplomat wins | Impose and ratify the Proposal if it is not already ratified | Return the stake; if newly ratified, gain 1 Influence unless the Proposal says otherwise |
| Opponent refuses and the Diplomat loses | Do not ratify the Proposal | Lose the stake, subject to Political Capital |
| Opponent refuses and the battle ends without a winner | Do not ratify the Proposal | Return the stake |

A Proposal is **imposed** when the opponent refuses it and the Diplomat wins the resulting battle.

An already-ratified Proposal may still be offered for its tactical effects, but it:

- cannot count toward Peace Treaty again;
- does not generate Influence from normal accepted-Terms ratification again;
- does not generate the default 1 Influence for imposition again;
- may still generate Influence if a card, leader, or Proposal explicitly says so.

This replaces generic **Loss of Face**. Political failure is proportional to the amount of Influence risked, but only an actual loss forfeits the stake. A no-winner result produces no Treaty progress and returns the stake.

### Why accepted Terms generate Influence

Acceptance now does more than safely ratify an Article. When a paid Proposal is newly accepted, the Diplomat returns the stake and gains additional Influence equal to that stake.

This gives Proposal stakes three jobs:

1. define which negotiations the Diplomat is politically capable of offering;
2. define how much Influence is at risk if refusal leads to defeat;
3. define how much political capital successful peaceful ratification generates.

The reward applies only to newly ratified Proposals. Repeated acceptance of an existing Treaty Article cannot farm Influence.

---

## Leverage

**Leverage** is a shared Diplomat rule:

> Before dice are rolled in a battle following refused Terms, you may spend any amount of available Influence. Gain +1 to your battle total for each Influence spent.

Leverage turns Influence into an active tactical resource rather than merely a Proposal threshold or failure buffer.

Its restrictions are essential:

- it is available only in a battle following refused Terms;
- staked Influence is unavailable and cannot be spent twice;
- the amount is chosen before dice are rolled;
- spent Influence is lost whether the battle is won, lost, or ends without a winner;
- it has no fixed per-battle cap beyond the amount of available Influence, which can never exceed 10.

Allowing the Diplomat to spend all available Influence creates an intentional late-game possibility: several turns of political capital may be cashed out to impose a critical Article, especially the fifth. The 10-Influence maximum provides a hard ceiling, while the current Proposal stake usually lowers the amount available for Leverage. This should feel like a climactic commitment, not ordinary generic combat superiority.

---

## Opponent-choice principle

The opponent should have a serious reason to consider either response:

- **Accept:** concede one Treaty Article, receive a controlled settlement, avoid battle and Leverage risk, and allow a newly accepted paid Proposal to increase the Diplomat's Influence.
- **Refuse:** preserve a chance to stop ratification, but risk the ordinary battle result, a stronger refused effect, Article imposition, the default imposition reward, Sanctions, and any Influence the Diplomat commits through Leverage.

The Influence difference is meaningful, but the Proposal's accepted and refused effects must still create the real decision. Terms should not reduce to a mathematical choice between two resource payouts.

Accepted Terms should usually give the opponent one or more of:

- safe withdrawal;
- guaranteed position;
- card draw or recovery;
- Asset development;
- mutual information or controlled disarmament;
- avoidance of a dangerous battle;
- avoidance of Leverage and post-refusal Sanctions.

Refused Terms should usually give the Diplomat one or more of:

- a card;
- information;
- improved battle selection;
- a battle bonus;
- recovery even after losing;
- a unilateral version of the negotiated benefit;
- additional Influence if the Proposal is imposed;
- access to Leverage and refusal-triggered faction cards.

---

## Proposal structure

The v0.6 Proposal order and Influence stakes are:

| Order | Proposal | Influence Stake | Tier |
|---:|---|---:|---|
| 1 | De-escalation | 0 | Basic battlefield settlement |
| 2 | Orderly Withdrawal | 0 | Basic battlefield settlement |
| 3 | Capitulation | 0 | Basic battlefield settlement |
| 4 | Open Channels | 1 | Structured agreement |
| 5 | Mutual Disarmament | 1 | Structured agreement |
| 6 | Prisoner Exchange | 1 | Structured agreement |
| 7 | Rebuilding Pact | 1 | Structured agreement |
| 8 | Ultimatum | 2 | Coercive demand |
| 9 | Diplomatic Recognition | 2 | Coercive demand |

The three zero-stake Proposals preserve an always-available Terms floor. They involve direct withdrawal, de-escalation, or capitulation rather than broader institutional exchange.

The four one-stake Proposals require reciprocal information, disarmament, recovery, or material development. They are the main engine for accepted-Terms Influence growth.

The two two-stake Proposals demand major unilateral positional concessions. Their higher stake increases both the failure risk and the peaceful-ratification reward.

The full current text belongs in the Working Rules and the Proposal / Treaty Article supplemental cards rather than being duplicated here.

---

## Fifth-Article endgame

The opponent is not expected to voluntarily accept the fifth Treaty Article. The Diplomat can instead impose it by winning after refusal.

Peace Treaty is checked at the start of the Diplomat's next turn, after captures. Once five different Articles have been ratified, the opponent's remaining counterplay is primarily to achieve their own victory before that check. Treaty Articles are not removed by ordinary battle losses, lost Influence, or changing Territory control.

This creates an intended final showdown:

- at four Articles, acceptance becomes increasingly unlikely;
- the Diplomat must create a sufficiently dangerous offer or win the refused battle;
- accumulated Influence may be spent through Leverage to force the issue;
- doing so weakens the Diplomat's ability to offer paid Terms afterward if the attempt fails;
- the opponent receives a final race window before Peace Treaty resolves.

---

## Leader direction

Both leaders use the same nine Proposals, accepted-Terms rewards, Leverage rule, and twelve-card faction pool.

### Ambassador

The Ambassador rewards negotiated settlement rather than military imposition.

**Cordiality:**

> Once per turn, after the opponent accepts Terms you offered, draw one card.

Accepted paid Terms may now also generate Influence equal to their stake. Cordiality adds soft card value rather than changing that shared economy or accelerating Treaty Articles beyond normal ratification.

### Senator

The Senator represents institutional resilience and the ability to absorb political failure through sacrifice.

**Political Capital:**

> Once per turn, when you would lose staked Influence because you lost the battle after refused Terms, you may send up to that many cards from your hand to your Graveyard. Recover 1 of that staked Influence for each card sent this way; lose the rest.

The Senator may therefore:

- send one card to preserve a one-Influence stake;
- send one card to preserve half of a two-Influence stake;
- send two cards to preserve the entire two-Influence stake;
- decline to preserve any Influence.

With a hand limit of three, full recovery of Diplomatic Recognition's stake is intentionally severe. Political Capital does not recover Influence already spent through Leverage and does not change the battle result or ratify the failed Proposal.

---

## Supplemental components

The approved Diplomat supplemental set is:

- one selected Leader Card: Ambassador or Senator;
- nine double-sided Proposal / Treaty Article cards;
- one double-sided Diplomat Reference card;
- one shared 0–10 sliding Influence Tracker placed beneath the selected Leader Card.

Proposal cards begin Proposal side up and flip when newly ratified. Both sides repeat the full Proposal rules because an already-ratified Article may still be offered.

Available Influence is shown by sliding the selected Leader Card over the Influence Tracker. To stake Influence, lower the tracker by the Proposal's printed stake; that printed value records the amount currently at risk. This keeps available Influence distinct from staked Influence without adding a token or marker.

The authoritative exact component specification is `Gauntlet_v0.6_Diplomat_Supplemental_Cards.md`.

---

## Approved faction-card package

The twelve-card package is approved for exact-text implementation and initial testing:

| Cost | Card | Primary role |
|---:|---|---|
| 1 | Clemency | Opponent-controlled recovery bargain |
| 2 | Trade Concessions | Material incentive to accept; concession-for-strength Battle effect |
| 2 | Safe Conduct | Visible one-use insurance for paid Proposals |
| 2 | Neutral Observers | Commitment-order and information advantage |
| 3 | Good Faith | Credible surrender of a specific card |
| 3 | Demilitarized Zone | Symmetric territorial disengagement and remilitarization cost |
| 3 | Diplomatic Latitude | Opponent chooses accepted settlement; Diplomat chooses refused consequence |
| 3 | Nonbinding Resolution | Choice between Treaty progress and Influence |
| 3 | Censure | Action-efficiency sanction |
| 4 | Gunboat Diplomacy | Visible military threat supporting refusal pressure and fifth-Article battles |
| 4 | Embargo | Asset-capacity sanction |
| 5 | Blockade | Territory-local movement sanction and package statement card |

The curve is **1 / 3 / 5 / 2 / 1**, with total deckbuilding value **35** and average value **2.92**.

The cards form overlapping strategic threads rather than named packages:

- negotiated value and credible concessions;
- coercive diplomacy and visible threats;
- sanctions and negotiated relief;
- information and procedural advantage;
- territorial settlement and restraint;
- political resilience under failed Terms.

---

## Sanctions direction

The Diplomat package contains three formal Sanctions, each pressuring a different object:

- **Censure** pressures Action-card efficiency;
- **Embargo** reduces Asset-bank capacity;
- **Blockade** taxes movement through one Territory.

All three:

- arise directly from refused Terms;
- remain visible through Assets or Overlays;
- preserve the opponent's ability to act, move, and fight;
- can be lifted by later accepted Terms, including acceptance of an already-ratified Proposal;
- function independently and do not require a dedicated Sanctions package.

Blockade is removed if the sanctioned opponent loses control of its Territory. Embargo and Censure remain player-directed sanctions until accepted Terms remove them.

If Financiers also receive Sanctions, their version should arise from Deeds, Capital, Treasury, credit, or market pressure rather than diplomatic legitimacy.

---

## Demilitarized Zone direction

**Demilitarized Zone** is an approved temporary, symmetric Territory Overlay connected to accepted Terms.

It:

- makes a negotiated pause physically visible on the Gauntlet;
- forces any players remaining after the accepted Proposal to withdraw;
- prevents re-entry during the placement turn;
- charges a card to enter while the Territory is unoccupied;
- prevents capture or control changes while active;
- charges continued occupation or forces withdrawal at the start of the occupier's turn;
- ends after the first battle fought there.

The entry rule is state-based rather than tracked: entering an **unoccupied** DMZ costs a card. No marker, rotation, or memory of a prior entrant is required.

---

## Archived concept

**Recognition of Claims** was cut from the twelve-card package.

Its core offer—accept Terms and receive immediate control of the contested Territory—was memorable, but it:

- overlapped with the package's other acceptance incentives;
- was thematically close to Diplomatic Recognition;
- created sequencing questions with accepted Proposal movement and capture effects;
- relied on a comparatively generic conditional +2 Battle floor.

It may be reconsidered only if testing reveals that the package lacks meaningful territorial concessions.

---

## Active test questions

- Is beginning with 1 Influence correct?
- Is the five-Article Peace Treaty threshold correct?
- Are nine double-sided Proposal / Treaty Article cards manageable and readable?
- Are accepted effects attractive enough that refusal is not automatic even though paid acceptance also grows Influence?
- Does accepted Influence equal to the listed stake create healthy progression or excessive snowballing?
- Are the 0 / 1 / 2 Proposal tiers correctly assigned?
- Does allowing all available Influence to be spent through Leverage produce memorable commitments rather than deterministic non-decisions?
- What are the average, upper-quartile, and maximum Influence totals held and spent in one battle?
- Is the 10-Influence maximum reached often enough to waste meaningful gains or cap healthy progression?
- Does the sliding tracker remain stable and make available versus staked Influence easy to understand?
- Are repeated already-ratified Proposals tactically useful without enabling card-specific Influence farming?
- Are Ambassador and Senator comparably strong across the same twelve-card pool?
- Is Political Capital's one-card-per-Influence exchange appropriately costly?
- Does Gunboat Diplomacy become an automatic inclusion when combined with Leverage?
- Is Embargo excessively punishing against a full Asset bank, especially for Financiers?
- Does Safe Conduct deny too many opposing win/loss triggers while returning the stake?
- Does Demilitarized Zone create productive standoffs rather than excessive delay?
- Do opponents rationally choose ratification rather than granting 2 Influence through Nonbinding Resolution?
- Do multiple copies of persistent Sanctions create excessive stacking?

---

## Versioning consequence

The first public v0.6 rules and faction materials should contain this framework, card package, and supplemental component set. **v0.6.1** is reserved for changes discovered after v0.6 testing: balance adjustments, wording corrections, leader tuning, Proposal recalibration, card-package substitutions, and other genuine patch work.
