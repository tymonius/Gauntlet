# Gauntlet v0.6.1 Diplomat Overhaul Notes

**Status:** Post-v0.6 follow-up scope  
**Purpose:** Capture the Diplomat overhaul ideas that should not block the v0.6 faction-framework release, but should be revisited in v0.6.1.

---

## Scope Decision

v0.6 should keep the current Diplomat framework stable enough for the six-faction release.

The deeper Terms, Influence, and Proposal-balance work should move to **v0.6.1**, which is planned as the **Diplomat faction overhaul**.

Hold the following items for v0.6.1:

1. **Terms / Influence staking model**
   - Proposal costs may become staked Influence.
   - Accepted Terms may refund the stake without default Influence gain.
   - Imposed Terms may refund the stake and grant additional Influence.
   - Failed Terms may lose the staked Influence.

2. **Loss of Face replacement or redesign**
   - Current Loss of Face may be replaced by the staking/imposition model.
   - The overhaul should clarify whether Influence loss is flat, stake-based, Proposal-specific, or leader/card-mediated.

3. **Full Proposal recalibration**
   - Accepted Terms should give the opponent enough value, safety, or control that acceptance is a serious choice.
   - Refused Terms should create meaningful risk if the Diplomat wins and imposes the Proposal.
   - Accepted Terms should not automatically generate too much Influence, because ratifying a Treaty Article is already progress toward Peace Treaty.

---

## Current v0.6 Focus

For v0.6, keep Diplomat changes limited to clarifying existing functionality and avoiding unnecessary churn.

Safe v0.6-level work may include:

- Clarifying what **withdraw** means when the withdrawing player is attacking or defending.
- Swapping the names of **Orderly Withdrawal** and **De-escalation** if the names better fit the current effects.
- Recording possible future Diplomat cards, such as **Demilitarized Zone**, for the faction-card pass.
- Recording possible **Sanctions** cards, such as **Blockade**, for the faction-card pass.

Do not fully rewrite the Terms economy or rebalance all Proposals for v0.6.

---

## Design Direction for v0.6.1

The goal of the overhaul is not merely to make Diplomats stronger. The goal is to make every Terms offer a real fork for the opponent:

> Accept the settlement and limit the Diplomat's momentum, or refuse and risk a worse imposed outcome.

The opponent should strongly consider accepting Terms because acceptance may provide:

- safe withdrawal,
- board position,
- card draw or recovery,
- avoidance of a bad battle,
- avoidance of a harsher imposed outcome,
- denial of extra Diplomat Influence,
- or control over how the conflict de-escalates.

The Diplomat should want Terms accepted because acceptance ratifies Treaty Articles and turns conflict into Peace Treaty progress.

The Diplomat should want Terms refused only when they believe they can win the resulting battle and impose the Proposal.

---

## Sanctions Direction

Diplomats may have a **Sanctions** subtheme.

Sanctions represent coercive diplomatic pressure that follows rejected Terms. They should not just be generic hand destruction or resource denial; they should be tied to the negotiation loop.

Possible Sanctions pattern:

- The Diplomat offers Terms.
- If the opponent refuses, the Diplomat may impose or escalate Sanctions.
- Sanctions create an ongoing penalty, restriction, or pressure point represented by an Asset, Territory Overlay, or explicit card-specific tracking.
- If the opponent later accepts Terms, lifting one or more Sanctions may be part of the settlement.

**Blockade** is the first candidate for this treatment.

Blockade direction:

- Reframe as a Diplomat faction card rather than advanced neutral.
- It may be played when Terms are rejected.
- Its persistent form must use the v0.6 Asset/Overlay object model rather than reviving Conditions.
- Accepted Terms or another explicit consequence may remove it.
- Its hand-pressure and battle-draw suppression should feel like sanctioned pressure rather than Inquisition-style punishment or Financier-style market control.

Future question: determine whether **Financiers** can also impose Sanctions. If they can, Financier Sanctions should probably come from economic leverage, Deeds, Capital, or Treasury pressure rather than diplomatic legitimacy or rejected Terms.

---

## Open v0.6.1 Questions

- Should Proposal costs always be paid as staked Influence?
- Should accepted Terms refund cost only, or can some Proposals grant Influence on acceptance?
- Should imposed Terms normally grant +1 Influence, or should Influence gain be Proposal-specific?
- Should already-ratified Proposals be able to generate Influence again?
- Should there be a cap on Influence?
- Should Demilitarized Zone be a Proposal, a faction card, or both?
- Should Diplomats have more Overlay-based faction cards?
- How many Sanctions cards should Diplomats have?
- Can Financiers also impose Sanctions, and if so, what distinguishes economic Sanctions from diplomatic Sanctions?
- Are nine Proposals too many once each Proposal has a stronger accept/refuse fork?

---

## Current Decision

Park the full Diplomat economy and Proposal overhaul for **v0.6.1**. Do not make it a blocker for v0.6.
