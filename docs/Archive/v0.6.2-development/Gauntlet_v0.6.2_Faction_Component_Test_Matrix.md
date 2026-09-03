# Gauntlet v0.6.2 Faction and Component Test Matrix

**Status:** Normative Wave B scenario specification  
**Governing candidate:** `Gauntlet_v0.6.2_Faction_and_Component_Candidate.md`  
**Shared matrix:** `Gauntlet_v0.6.2_Shared_Rules_Test_Matrix.md`  
**Tracker:** [Issue #494](https://github.com/tymonius/Gauntlet/issues/494)

These scenarios define the minimum behavior that later canonical data, generated cards, faction guides, the Deckbuilder, Rules Arbiter packets, and digital implementation must preserve. Published v0.6.1 fixtures remain unchanged until the v0.6.2 release migration.

---

# A. Pool and source structure

## A01 — Neutral replacement
**Expect:** Neutral contains Landslide and no Neutral Invasion; total Neutral titles remain 50.

## A02 — Military expansion
**Expect:** Military contains Invasion and reaches 13 titles without removing another Military card.

## A03 — Diplomat expansion
**Expect:** Diplomats contain Détente and reach 13 titles.

## A04 — Financier expansion
**Expect:** Financiers contain Compound Interest and reach 13 titles.

## A05 — Intelligence expansion
**Expect:** Intelligence contains Extraordinary Rendition and reaches 13 titles.

## A06 — Mystics expansion
**Expect:** Mystics contain Nature's Altar and reach 13 titles.

## A07 — Inquisition expansion
**Expect:** Inquisition contains Martyrdom and reaches 13 titles.

## A08 — Published source preservation
**Expect:** No file under `releases/v0.6.1/` is modified by Wave B.

---

# M. Military

## M01 — Invasion Opening timing
**Given:** Invasion is played for its Action effect.  
**Expect:** It is legal during Opening and affects the ensuing Movement.

## M02 — Invasion one Position at a time
**Expect:** Each additional Position is entered separately and Territory effects resolve normally.

## M03 — Invasion advance only
**Expect:** Its additional movement cannot be used to Fall Back.

## M04 — Invasion creates pending battle
**Expect:** Entering the opponent's Position may create a pending battle.

## M05 — Invasion movement loss
**Expect:** Creating a pending battle ends the sequence and loses all unused Invasion movement.

## M06 — Accepted Terms do not restore movement
**Expect:** Preventing the battle through accepted Terms does not restore unused Invasion movement.

## M07 — Invasion plus Onward
**Expect:** Both may contribute to the same pre-battle Movement sequence; neither survives creation of a pending battle.

## M08 — Invasion Battle Reserve
**Expect:** An attacking Invasion adds one card to the initial Reserve.

## M09 — Invasion Battle Tactic
**Expect:** An attacking Invasion permits one additional Tactic in that battle.

## M10 — Later movement sequences
**Expect:** Give Chase, Rout, Countercharge, and Shock and Awe use their own later timing; unused Invasion movement does not carry into them.

## M11 — Fortify contiguous control
**Expect:** Fortify advances the Front Line by one Territory and never creates isolated control.

## M12 — Shock and Awe Consolidate
**Expect:** Consolidate advances the Front Line by one Territory, if able, then sets Command to 2.

---

# D. Diplomats

## D01 — Terms before Onset
**Expect:** Terms occur during a pending battle and accepted Terms prevent Onset.

## D02 — Newly accepted Proposal reward
**Expect:** Return the Stake, ratify the Proposal, and gain exactly 1 Influence.

## D03 — Newly imposed Proposal reward
**Expect:** Return the Stake, ratify the Proposal after the Diplomat wins, and gain exactly 2 Influence.

## D04 — Failed Terms
**Expect:** A losing Diplomat loses the Stake and does not ratify the Proposal.

## D05 — No-winner Terms result
**Expect:** Return the Stake and do not ratify when the resulting battle ends without a winner.

## D06 — Already-ratified Proposal
**Expect:** It grants no default ratification reward whether accepted or imposed.

## D07 — Leverage +1
**Expect:** +1 costs 1 Influence total.

## D08 — Leverage +2
**Expect:** +2 costs 3 Influence total.

## D09 — Leverage +3
**Expect:** +3 costs 6 Influence total.

## D10 — Leverage +4
**Expect:** +4 costs 10 Influence total.

## D11 — Staked Influence unavailable
**Expect:** Influence currently staked cannot pay for Leverage.

## D12 — Proposal perspective
**Expect:** Every Proposal Accepted and Refused result identifies the Diplomat, accepting player, refusing player, attacker, or defender as needed; it does not rely on ambiguous reader-perspective `you`.

## D13 — Ordinary accepted position
**Expect:** Where no Proposal specifies otherwise, the attacker withdraws and the defender remains.

## D14 — Diplomat defender withdraws
**Expect:** When an Accepted effect withdraws only the defending Diplomat, the opponent remains and becomes occupier when applicable.

## D15 — Mutual Disarmament
**Expect:** Both players withdraw after the Accepted effect.

## D16 — Diplomatic Recognition
**Expect:** It advances the Diplomat's Front Line by one Territory and cannot create isolated control.

## D17 — Détente existing Article
**Expect:** Détente triggers only when the Proposal was already ratified when offered.

## D18 — Détente newly ratified
**Expect:** Détente does not trigger from a Proposal first ratified by the current accepted Terms.

## D19 — Good Faith
**Expect:** Its set-aside card goes to the Diplomat's Graveyard and the Diplomat gains 1 Influence on acceptance.

## D20 — Gunboat destinations
**Expect:** Accepted Gunboat Diplomacy goes to Discard; refusal-set Gunboat is a Gambit and goes to Graveyard; a normally chosen Tactic goes to Discard.

---

# F. Financiers

## F01 — Starting Capital
**Expect:** The v0.6.2 test setup begins the Financier at 2 Capital.

## F02 — Line of Credit preserved
**Expect:** Collateral cannot contribute more than half the Deed purchase cost, rounded down.

## F03 — Financial Capacity timing
**Expect:** Eligibility is determined after Capture effects and before Draw.

## F04 — Financial Capacity threshold
**Expect:** It applies only when Treasury value is greater than Territories controlled.

## F05 — Financial Capacity phase permission
**Expect:** The Financier may take one Action in Opening and one in Denouement; at least one must be a Financier Faction Action.

## F06 — No same-phase stacking
**Expect:** Financial Capacity does not permit two Actions in Opening or two in Denouement.

## F07 — Compound Interest optional reveal
**Expect:** The player may decline to reveal the top card.

## F08 — Compound Interest destination choice
**Expect:** Once revealed, the card must enter Treasury face up or the player's Discard Pile; it cannot remain on top.

## F09 — Compound Interest Treasury condition
**Expect:** It is usable only when Treasury already contains at least one card.

## F10 — Foreclosure and Hostile Takeover
**Expect:** Both advance contiguous Front Line control and never create isolated control at a deeper token Position.

---

# I. Intelligence

## I01 — Rendition reveal and bind
**Expect:** Banking Extraordinary Rendition reveals the opponent's Hand and binds one chosen card face up beneath it.

## I02 — One banked copy
**Expect:** A player may have only one banked Extraordinary Rendition.

## I03 — Bound-card immobility
**Expect:** The bound card cannot be played, moved, or affected except by Extraordinary Rendition.

## I04 — First Asset discarded
**Expect:** When its controller discards one or more Assets, Extraordinary Rendition is discarded before another Asset if able.

## I05 — Replacement counts
**Expect:** Discarding an Asset to make room for a new Asset invokes the first-discard requirement.

## I06 — Rendition leaves play
**Expect:** The bound card goes to its owner's Discard Pile, not Hand or Graveyard.

---

# Y. Mystics

## Y01 — Begin a Rite normal phase
**Expect:** Begin a Rite is normally a Denouement Faction Action.

## Y02 — Begin Ritual normal phase
**Expect:** Begin the Ritual of Ascendance is a Denouement Faction Action.

## Y03 — Guardian first Rite
**Expect:** Protecting the first Rite requires an Arcane card of value at least 1.

## Y04 — Guardian second Rite
**Expect:** Protecting the second Rite requires Arcane value at least 2.

## Y05 — Guardian third Rite
**Expect:** Protecting the third Rite requires Arcane value at least 3.

## Y06 — Guardian Ritual
**Expect:** Protecting the Ritual of Ascendance requires Arcane value at least 4.

## Y07 — Black Covenant
**Expect:** It gains advantage, may add one eligible card from Hand as a face-up additional Tactic, and sends both cards to Graveyard in Aftermath.

## Y08 — Nature's Altar beginning
**Expect:** The Mystic must be on the Altar's Territory during Opening to take Begin a Rite through the Overlay.

## Y09 — Nature's Altar completion
**Expect:** A Rite begun through the Altar may complete that turn only if the Mystic controls the Altar's Territory at completion timing.

## Y10 — Nature's Altar requirements
**Expect:** The Altar changes neither the Rite's cost, specialized beginning requirement, nor completion condition.

---

# Q. Inquisition

## Q01 — Purge in Opening
**Expect:** Purge may be the Faction Action taken during Opening.

## Q02 — Purge in Denouement
**Expect:** Purge may be the Faction Action taken during Denouement.

## Q03 — Purge two-phase permission
**Expect:** A turn using the Purge Faction Action may contain one Action in each phase, provided one is Purge.

## Q04 — Purge no same-phase stacking
**Expect:** Purge never permits two Actions in the same phase.

## Q05 — Purge once per turn
**Expect:** The Purge Faction Action is taken no more than once per turn.

## Q06 — Final Judgment independence
**Expect:** Final Judgment's directly permitted Purge uses no Action, does not consume the Purge Faction Action, and does not activate the two-phase permission.

## Q07 — Martyrdom timing
**Expect:** Martyrdom is playable from Hand after a battle loss during Aftermath before battle cards are cleared.

## Q08 — Martyrdom destinations
**Expect:** Opposing cards remaining in Reserve go to Graveyard; opposing Gambits and Tactics continue to use their applicable normal or Condemnation destinations.

## Q09 — Martyrdom result preserved
**Expect:** The Inquisition still loses, retreats, and suffers Occupation and all other normal consequences; Conviction is then set to 4 and Martyrdom goes to Graveyard.

---

# N. Neutral and Territories

## N01 — Landslide placement
**Expect:** Landslide may be placed on any Territory without another Landslide.

## N02 — One per Territory
**Expect:** A second Landslide cannot occupy the same Territory.

## N03 — Landslide loss mode
**Expect:** Its Battle mode is available only after its controller loses and retreats from the contested Territory.

## N04 — Landslide retreat trigger
**Expect:** Retreating onto the Territory causes one additional retreat Position if able, then Landslide goes to its owner's Discard Pile.

## N05 — No Fall Back trigger
**Expect:** Ordinary Fall Back does not trigger Landslide.

## N06 — No withdrawal trigger
**Expect:** Withdrawal does not trigger Landslide.

## N07 — Landslide chain
**Expect:** Entering a second Landslide Territory through the first additional retreat resolves the second Landslide separately.

## N08 — Quicksand wording
**Expect:** Quicksand restricts voluntary Fall Back and total voluntary movement; it does not misuse `withdraw` for ordinary Movement.

## N09 — Action-phase Territories
**Expect:** Difficult Terrain, Command Tent, and Smuggler's Pass use Opening and Denouement rather than Action Opportunities.

## N10 — Arena tie sequence
**Expect:** Each Arena removes Defensive Edge and sends unresolved tied totals to a Tiebreak Roll; none rerolls the original modified battle dice.

---

# Cross-surface gate

Wave B is source-complete only when the governing candidate, this matrix, the implementation ledger, and all later exact component surfaces agree. A later generated-data or digital PR must implement these cases rather than merely copy the wording.
