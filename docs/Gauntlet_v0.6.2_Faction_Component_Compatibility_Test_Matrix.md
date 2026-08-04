# Gauntlet v0.6.2 Faction and Component Compatibility Test Matrix

**Status:** Normative Wave B inherited-source scenarios  
**Compatibility audit:** `Gauntlet_v0.6.2_Faction_Component_Compatibility_Audit.md`  
**Primary matrix:** `Gauntlet_v0.6.2_Faction_Component_Test_Matrix.md`

These 26 scenarios supplement the primary 85-scenario Wave B matrix. Together they form a 111-scenario source-level acceptance surface.

---

# Intelligence compatibility

## I07 — Mission Faction Actions
**Expect:** Start, complete, and abort Mission, and start or complete Special Operation, are Denouement Faction Actions.

## I08 — Mission Control
**Expect:** Mission Control directly starts a Mission without taking an Action and does not create an Action phase or additional Action.

## I09 — Fieldcraft terminology
**Expect:** Fieldcraft refers to Defensive Edge, not Defender's Advantage.

## I10 — Counterintelligence visibility
**Expect:** Counterintelligence protects Hands, Reserves, and face-down battle cards; it does not refer to hidden Territories.

## I11 — Fog of War placement
**Expect:** Fog of War may be placed on a Territory without a revealed-Territory qualifier.

## I12 — Reconnaissance timing
**Expect:** Reconnaissance is used during Onset, before Gambits are set.

## I13 — Sleeper Network Action use
**Expect:** Sleeper Network's Use may be taken as an Action during Opening or Denouement and creates no Action Opportunity.

---

# Mystics compatibility

## Y11 — Rite of Crossing timing
**Expect:** Rite of Crossing is begun as a Denouement Faction Action only after the qualifying battle that turn.

## Y12 — Nature's Altar and Rite of Crossing
**Expect:** Nature's Altar does not waive Rite of Crossing's qualifying-battle beginning restriction.

## Y13 — Arcane pool count
**Expect:** All 13 Mystics cards have the Arcane trait.

---

# Inquisition compatibility

## Q10 — Relentless Pursuit sequence
**Expect:** Relentless Pursuit ends the opponent's turn, advances one Position, may create a pending battle, and creates no Opening or Denouement before that battle.

## Q11 — Relentless Pursuit Terms
**Expect:** The resulting pending battle still permits Terms before Onset.

## Q12 — No Martyrs suppresses Martyrdom
**Expect:** In an Inquisition mirror, an applicable No Martyrs controlled by the winner prevents the losing opponent from playing or benefiting from Martyrdom.

---

# Neutral compatibility

## N11 — Neutral Counterintelligence
**Expect:** The Asset text no longer refers to face-down Territories.

## N12 — Forced March timing
**Expect:** Forced March is an Opening Action whose additional movement cannot create a pending battle.

## N13 — Advance Guard timing
**Expect:** Advance Guard is an Opening Action; if its additional movement creates a pending battle, its controller cannot set a Gambit there.

## N14 — Entrenchment phase restriction
**Expect:** Entrenchment prevents the affected opponent from playing a card for its Action effect during Denouement that turn.

## N15 — Palisade Wall timing
**Expect:** Palisade Wall is used during Onset while defending.

## N16 — Additional-Action cards
**Expect:** Reinforcements, Insurrection, and Liberation grant an additional Action without same-phase permission or an Action Opportunity.

## N17 — Strategic Withdrawal during Opening
**Expect:** During Opening, Strategic Withdrawal adds one Position to the ensuing Movement after returning a banked Asset.

## N18 — Strategic Withdrawal during Denouement
**Expect:** During Denouement after normal Movement, Strategic Withdrawal begins a new Movement sequence with up to one Position; it may create a pending battle.

## N19 — Assimilation contiguous control
**Expect:** Assimilation advances the Front Line by one Territory instead of creating isolated control at the contested Territory.

## N20 — Protracted Siege delayed Front Line
**Expect:** Protracted Siege prevents the next attempt to add its Territory to the opposing Front Line, even when that attempt occurs later than the opponent's next Capture step.

## N21 — Protracted Siege removal
**Expect:** It goes to its owner's Graveyard after preventing one Front Line advance or after the opposing token leaves first.

## N22 — Manifest Destiny continuity
**Expect:** Manifest Destiny's Battle mode inserts a controlled Territory only when it would immediately join the player's Front Line.

## N23 — Refuge Fall Back
**Expect:** Voluntary Fall Back onto Refuge draws one card; retreat and withdrawal do not trigger Refuge.

---

# Combined gate

The primary and compatibility matrices must contain 111 unique scenario IDs across the shared family prefixes. Later implementation may add scenarios but may not remove these without an explicit superseding design decision.
