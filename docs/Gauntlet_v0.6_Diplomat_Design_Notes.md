# Gauntlet v0.6 Diplomat Design Notes

**Status:** Active v0.6 design rationale and implementation notes.  
**Rules source of truth:** `Gauntlet_v0.6_Working_Rules.md`.  
**Card source of truth:** `Gauntlet_v0.6_Diplomat_Card_Pool.md`.

---

## Scope decision

The revised Diplomat framework is part of the initial **v0.6 faction release**. It is no longer deferred to v0.6.1.

The earlier framework—generic Loss of Face, direct Influence rewards on most accepted Terms, and an Influence-based Peace Treaty threshold—is obsolete. Diplomat faction cards, leaders, reference components, starter decks, canonical data, and digital implementation should be designed against the revised model from the beginning.

---

## Core model

Diplomats convert conflict into legitimacy through three linked systems:

1. **Proposals** create an accept-or-refuse decision before battle.
2. **Treaty Articles** are the public progress track toward Peace Treaty.
3. **Influence** is political capital risked to offer stronger Proposals and used by faction cards or leaders.

The key distinction is:

> Treaty Articles are victory progress. Influence is leverage.

Peace Treaty is achieved by ratifying five different Proposals as Treaty Articles. Influence is not part of the victory check.

---

## Influence staking and Terms outcomes

To offer a Proposal, the Diplomat must be able to stake Influence equal to its cost.

| Outcome | Treaty result | Influence result |
|---|---|---|
| Opponent accepts | Ratify the Proposal if it is not already ratified | Return the stake; gain only Influence specifically granted by an effect |
| Opponent refuses and the Diplomat wins | Impose and ratify the Proposal if it is not already ratified | Return the stake; if newly ratified, gain 1 Influence unless the Proposal says otherwise |
| Opponent refuses and the Diplomat loses | Do not ratify the Proposal | Lose the stake |
| Opponent refuses and the battle ends without a winner | Do not ratify the Proposal | Return the stake |

A Proposal is **imposed** when the opponent refuses it and the Diplomat wins the resulting battle.

An already-ratified Proposal may still be offered for its tactical effects, but it:

- cannot count toward Peace Treaty again;
- does not generate the default 1 Influence for imposition again;
- may still generate Influence if a card, leader, or Proposal explicitly says so.

This replaces generic **Loss of Face**. Political failure is proportional to the amount of Influence risked, but only an actual loss forfeits the stake. A no-winner result produces no Treaty progress and returns the stake.

---

## Opponent-choice principle

The opponent should have a serious reason to consider either response:

- **Accept:** concede one Treaty Article, but receive a controlled settlement, avoid battle risk, and deny the Diplomat the default Influence reward for imposition.
- **Refuse:** preserve a chance to stop ratification, but risk the ordinary battle result, a stronger refused effect, Article ratification, and additional Diplomat Influence.

A one-Influence difference is not sufficient by itself. The accepted and refused effects must create the real decision.

Accepted Terms should usually give the opponent one or more of:

- safe withdrawal;
- guaranteed position;
- card draw or recovery;
- Asset development;
- mutual information or controlled disarmament;
- avoidance of a dangerous battle;
- denial of extra Diplomat Influence.

Refused Terms should usually give the Diplomat one or more of:

- a card;
- information;
- improved battle selection;
- a battle bonus;
- recovery even after losing;
- a unilateral version of the negotiated benefit;
- additional Influence if the Proposal is imposed.

Accepted Terms should not routinely grant Influence. Acceptance already advances Peace Treaty.

---

## Proposal structure

The v0.6 Proposal order is:

1. De-escalation
2. Orderly Withdrawal
3. Capitulation
4. Open Channels
5. Mutual Disarmament
6. Prisoner Exchange
7. Rebuilding Pact
8. Ultimatum
9. Diplomatic Recognition

The first six are basic, zero-cost political tools. Rebuilding Pact and Ultimatum require a one-Influence stake. Diplomatic Recognition requires a two-Influence stake and a narrow occupation/counterattack state.

The full current text belongs in the Working Rules and faction reference materials rather than being duplicated here.

---

## Fifth-Article endgame

The opponent is not expected to voluntarily accept the fifth Treaty Article. The Diplomat can instead impose it by winning after refusal.

Peace Treaty is checked at the start of the Diplomat's next turn, after captures. Once five different Articles have been ratified, the opponent's remaining counterplay is primarily to achieve their own victory before that check. Treaty Articles are not removed by ordinary battle losses, lost Influence, or changing Territory control.

This creates an intended final showdown:

- at four Articles, acceptance becomes increasingly unlikely;
- the Diplomat must create a sufficiently dangerous offer or win the refused battle;
- the opponent receives a final race window before Peace Treaty resolves.

---

## Leader direction

### Ambassador

The Ambassador rewards negotiated settlement rather than military imposition.

**Cordiality:**

> Once per turn, after the opponent accepts Terms you offered, draw one card.

Acceptance advances Peace Treaty without generating default Influence, so Cordiality supplies soft value without replacing the core faction decision.

### Senator

The Senator represents institutional resilience and the ability to absorb political failure through sacrifice.

**Political Capital:**

> Once per turn, when you would lose staked Influence because you lost the battle after refused Terms, you may send one card from your hand to your Graveyard. If you do, recover 1 of that staked Influence instead of losing it.

This replaces the older ability that reduced generic Loss of Face. The wording now follows the win / loss / no-winner Terms structure.

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

- Is starting at 0 Influence correct, or does it delay access to paid Proposals too much?
- Is five different Treaty Articles the correct Peace Treaty threshold?
- Are nine Proposals manageable as a supplemental reference?
- Are the accepted effects and faction-card incentives attractive enough that refusal is not automatic?
- Are the refused effects dangerous enough without making Terms coercively one-sided?
- Do Rebuilding Pact, Ultimatum, and Diplomatic Recognition justify their stakes?
- Are repeated already-ratified Proposals tactically useful without enabling Influence farming?
- Are Ambassador and Senator comparably strong across the same twelve-card pool?
- Does Gunboat Diplomacy become an automatic inclusion?
- Is Embargo excessively punishing against a full Asset bank, especially for Financiers?
- Does Safe Conduct deny too many opposing win/loss triggers?
- Does Demilitarized Zone create productive standoffs rather than excessive delay?
- Do opponents rationally choose ratification rather than granting 2 Influence through Nonbinding Resolution?
- Do multiple copies of persistent Sanctions create excessive stacking?

---

## Versioning consequence

The first public v0.6 rules and faction materials should contain this framework and card package. **v0.6.1** is reserved for changes discovered after v0.6 testing: balance adjustments, wording corrections, leader tuning, Proposal recalibration, card-package substitutions, and other genuine patch work.
