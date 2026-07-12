# Gauntlet v0.6 Diplomat Design Notes

**Status:** Active v0.6 design rationale and implementation notes.  
**Rules source of truth:** `Gauntlet_v0.6_Working_Rules.md`.

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
| Opponent refuses and the Diplomat does not win | Do not ratify the Proposal | Lose the stake |

A Proposal is **imposed** when the opponent refuses it and the Diplomat wins the resulting battle.

An already-ratified Proposal may still be offered for its tactical effects, but it:

- cannot count toward Peace Treaty again;
- does not generate the default 1 Influence for imposition again;
- may still generate Influence if a card, leader, or Proposal explicitly says so.

This replaces generic **Loss of Face**. Political failure is now proportional to the amount of Influence risked.

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

## Leader direction

### Ambassador

The Ambassador rewards negotiated settlement rather than military imposition.

Current direction:

> Once per turn, after the opponent accepts Terms you offered, draw one card.

This remains compatible with the revised framework because acceptance advances Peace Treaty without generating default Influence.

### Senator

The Senator represents institutional resilience and the ability to absorb political failure through sacrifice.

Current direction:

> Once per turn, after Terms you offered are refused and you do not win the resulting battle, you may send one card from your hand to your Graveyard. If you do, recover 1 of the Influence staked on that Proposal.

This replaces the older ability that reduced generic Loss of Face.

---

## Sanctions direction

Diplomats may have a **Sanctions** card subtheme.

Sanctions represent coercive pressure following rejected Terms. They should connect directly to the negotiation loop rather than functioning as generic hand destruction or resource denial.

Possible pattern:

- the Diplomat offers Terms;
- the opponent refuses;
- the Diplomat imposes or escalates a Sanction;
- the Sanction creates an ongoing penalty, restriction, or pressure point represented by an Asset, Territory Overlay, or explicit card-specific tracking;
- later accepted Terms may lift the Sanction as part of settlement.

**Blockade** is the leading candidate for this treatment. It may become a Diplomat faction card played after Terms are refused.

Its persistent form must use the v0.6 Asset/Overlay object model rather than reviving Conditions. Accepted Terms or another explicit consequence may remove it.

If Financiers also receive Sanctions, their version should arise from Deeds, Capital, Treasury, credit, or market pressure rather than diplomatic legitimacy.

---

## Demilitarized Zone direction

**Demilitarized Zone** remains a strong candidate for a temporary, symmetric Territory Overlay connected to Terms.

It should:

- make a negotiated pause physically visible on the Gauntlet;
- prevent immediate conflict in one Territory for a limited time;
- avoid permanently locking the lane or recreating v0.4 stalemates;
- clearly state whether it is a Proposal, faction card, or both.

---

## Active test questions

- Is starting at 0 Influence correct, or does it delay access to paid Proposals too much?
- Is five different Treaty Articles the correct Peace Treaty threshold?
- Are nine Proposals manageable as a supplemental reference?
- Are the accepted effects attractive enough that refusal is not automatic?
- Are the refused effects dangerous enough without making Terms coercively one-sided?
- Do Rebuilding Pact, Ultimatum, and Diplomatic Recognition justify their stakes?
- Should any accepted Proposal explicitly generate Influence?
- Are repeated already-ratified Proposals tactically useful without enabling Influence farming?
- Are Ambassador and Senator comparably strong?
- How many Sanctions cards should the faction receive?
- Should Demilitarized Zone be a Proposal, a faction card, or both?

---

## Versioning consequence

The first public v0.6 rules and faction materials should contain this framework. **v0.6.1** is reserved for changes discovered after v0.6 testing: balance adjustments, wording corrections, leader tuning, Proposal recalibration, and other genuine patch work.