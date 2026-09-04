# Gauntlet v0.6.3 — Strong Starter Decks: Second-Pass Competitive Audit

**Status:** Adopted competitive starter baseline for the v0.6.3 release candidate; pending matchup testing.  
**Machine-readable source:** `v0.6.3/data/starter-decks-candidate.js`

## Objective

Build the twelve recommended Decks to be strong, capable of winning, and capable of expressing powerful or creative Leader strategies. Teaching simplicity and card-pool coverage are **not** optimization targets.

Every slot was challenged against the full legal Neutral + faction pool. A card survives when it advances the Leader's plan, is live often enough to justify its copy count, beats same-cost alternatives on tempo/card economy/battle equity/inevitability, or creates a distinctive interaction the Deck otherwise lacks. Redundancy must buy meaningful consistency rather than diminishing returns.

Territories were re-audited under the same standard rather than inherited automatically from v0.6.2.

## Construction result

All twelve adopted lists are exactly **30 cards / 60 Deckbuilding Value**, with no Unique card above one copy. The exact compositions and recommended Territory orders live in the machine-readable source above and are validated against the integrated v0.6.3 canonical card/Territory data.

### Implementation correction

The initial written audit accidentally omitted **Fealty ×1** from the Executive list even though Fealty was present in the first-pass list and was never identified as a cut. That transcription produced an impossible 29-card / 59-value list. Fealty is retained, restoring the intended 30/60 construction. This is a transcription correction, not a new balance decision.

---

# Deck-by-deck conclusions

## Military — General — Forward Doctrine

**Plan:** Offensive tempo, repeated attacks, Command conversion, and immediate Front Line progress.  
**Territories:** Supply Depot → King's Road → Arena: No Quarter.

- **Shock and Awe is locked.** Its attacking ceiling and immediate Front Line/breakthrough conversion are core to General.
- **Battlefield Promotion earns a slot** because Invasion, Reinforcements, Reserve Force, and Shock and Awe create multi-Tactic battles worth recurring after wins.
- **Brothers in Arms earns a slot** because Advance Guard can deliberately create a no-Gambit attack that Brothers converts into an additional Tactic from Hand.
- **Resourcefulness beats another Field Command** in a Deck with a very high density of cost-1 effects.
- **Two Unbroken Ranks, not three:** General wants Command but also wants to spend Orders aggressively.
- Principal A/B questions: Bombardment vs Assimilation; second Battlefield Promotion vs Consolidation.

## Military — Commandant — Holdfast

**Plan:** Make controlled ground brutally difficult to take, convert defensive wins into retreat distance/counterattack pressure, and create prepared retreat traps.  
**Territories:** Garrison → Training Grounds → High Ground.

- **Landslide + Court Martial + Repel** is a real retreat-trap strategy, not flavor.
- **Resistance stays:** its Counterattack modes are too efficient to cut.
- **Foothold earns one slot** as a second counterattack axis.
- **Only one Hold the Line:** its ceiling is high but so are its cost and loss downside.
- **Fortifications beats Liberation** in the baseline because an extra defensive Tactic is broadly live; Liberation remains a close challenger.

## Diplomats — Ambassador — Open Channels

**Plan:** Make acceptance attractive, ratify five Proposals quickly, draw through Good Offices, and make refusal dangerous.  
**Territories:** Supply Depot → Command Tent → Arena: Spoils of War.

- **One Détente is correct:** only one may be banked and a duplicate has no battle mode.
- **Sanctions: Censure** is the best lightweight refusal punishment for the acceptance-focused shell.
- **Sabotage beats Rousing Speech** because it is reliable interaction rather than matchup-dependent Asset scaling.
- **Command Tent beats Refuge:** accepted Terms cause withdrawal, not voluntary Fall Back, so Refuge does not trigger from the defining Diplomat procedure.

## Diplomats — Senator — Procedure Endures

**Plan:** Risk substantial Stakes, preserve Influence through Political Capital/Safe Conduct, and make refusal create lasting institutional costs.  
**Territories:** Garrison → Field Hospital → Fortified Pass.

- The **full Sanctions spread** stays; Senator can better absorb the political risk required to establish it.
- **Two Safe Conduct** is justified because preventing a loss after refused Terms preserves position and political resources.
- **Decoys is functional protection**, not filler, in an Asset-heavy Sanctions shell.
- **Fortified Pass beats Smuggler's Run:** the latter cannot use stashed cards for Terms/Sanction procedures, while Fortified Pass directly weakens retaliation.

## Financiers — Banker — Sound Investment

**Plan:** Build Treasury value, exploit Line of Credit, accelerate Deed purchases, and use Corner the Market to threaten Controlling Interest.  
**Territories:** Supply Depot → Ruined Storehouse → Arena: Spoils of War.

- **Corner the Market is locked** as the most natural alternate-victory finisher.
- **One Compound Interest, not two:** Property Dues occupies the second high-value slot while remaining useful collateral/Treasury material.
- **Property Dues belongs more naturally here than in Executive** because Banker expects broad Deed ownership without necessarily occupying those Territories.
- **Underwriting survives** as insurance for Capital spent to win battles protecting the acquisition engine.

## Financiers — Executive — Hostile Expansion

**Plan:** Win on enemy ground, convert Occupation into Deed/control swings immediately, and use finance cards as battle-linked acquisition tools.  
**Territories:** Supply Depot → King's Road → Arena: No Quarter.

- **Corner the Market earns a slot** because Hostile Takeover naturally creates partial Deed ownership that Corner can convert into a sudden Controlling Interest finish.
- **Only one Foreclosure:** Hostile Takeover already provides Front Line conversion, so the second copy is redundant.
- **Reinforcements and Sabotage beat Property Dues** because Executive values winning the decisive attack more than slowly taxing movement.
- **Fealty remains** from the first-pass list; its omission from the first written audit was the 29/59 transcription error noted above.

## Intelligence — Ranger — Field Operations

**Plan:** Operate asymmetrically on hostile terrain, preserve Intel for Surveillance/Interference, and dismantle enemy commitments while completing field Missions.  
**Territories:** Watchtower → Difficult Terrain → Poisonous Gas.

- **Scouting Report drops from three to zero.** Intelligence already has abundant information; Ranger needs exploitation and Intel efficiency.
- **Pathfinders is core Ranger material:** it can neutralize Territory text without spending Intel and becomes a battle bonus where printed Territory text is active.
- **Disruption + Sabotage** turn information into consequences instead of merely revealing more cards.
- The hostile Territory package is intentional: Ranger can selectively operate around restrictions that constrain ordinary opponents.

## Intelligence — Spymaster — Mission Network

**Plan:** Keep a Mission active, chain completions through Mission Control, recover completed Mission cards, and use Sleeper Network for a high-ceiling action burst.  
**Territories:** Supply Depot → Ruined Storehouse → Field Hospital.

- **One Operational Reassessment is enough:** Mission Control already reduces Mission downtime.
- **Contraband is stronger recursion** for completed Missions and discarded battle effects.
- **Field Hospital beats Smuggler's Run:** a Mission used as a Gambit can be preserved into Discard, where Ruined Storehouse/Contraband can recover it. Smuggler's Run cannot start its stashed card as a Mission.
- **Sleeper Network stays** despite cost 5 because its action-compression ceiling is unique to this shell.

## Mystics — Alchemist — First Principles

**Plan:** Deliberately move cards from Hand to Graveyard, replace sacrifices with card flow, and use the Graveyard as a second tactical hand.  
**Territories:** Supply Depot → Old Battlefield → Field Hospital.

- **Black Covenant is core Alchemist material** because it adds a Tactic from Hand and sends both cards into the Graveyard.
- **Nature's Altar loses the 4-point competition** here; Ritual acceleration belongs more naturally to Spirit Walker.
- **Arcane Knowledge, Rend the Veil, Witchcraft, and Necromancy are all distinct rather than redundant** Graveyard tools.
- **Supply Depot belongs at the own end** to front-load the Deck's most broadly useful resource: cards.

## Mystics — Spirit Walker — Unbroken Circle

**Plan:** Begin and preserve Rites, protect Ritual progress through defensive wins and high-value Arcane sacrifice, then survive to the required winning battle.  
**Territories:** Garrison → Field Hospital → High Ground.

- **Circle of Bones beats Black Covenant** here because durable position control and repeatable rerolls better protect Ritual progress.
- **Nature's Altar is locked:** same-turn Rite completion is uniquely valuable to this Leader.
- **Three Grave Ward is justified** because Guardians of the Circle deliberately sacrifices valuable Arcane cards.
- **High Ground beats Refuge** because defensive Advantage directly protects progress; withdrawal is not voluntary Fall Back.
- **Armistice remains out** of the baseline because its upkeep taxes the small Hand and its battle lock eventually conflicts with the battle required for Ritual victory.

## Inquisition — Grand Inquisitor — Final Judgment

**Plan:** Win battles, turn wins into discounted Final Judgment Purges, and accelerate opposing-card depletion toward Purification.  
**Territories:** Supply Depot → Toll Bridge → Arena: No Quarter.

- **Attrition is included for its Gambit/Tactic mode, not its Asset mode:** Inquisition already condemns opposing Tactics, but Attrition can send the opponent's entire initial Reserve to the Graveyard after a win.
- **Three Divine Mercy remains correct** because it converts Graveyard material into Conviction while providing a clean +2 Battle Total in combat.
- **Heresy stays** because Grand Inquisitor can both generate the opposing Graveyard and pay the four Conviction needed to exploit it.
- **Toll Bridge beats Old Battlefield:** it creates opposing discard material rather than filling the Inquisitor's own Graveyard.

## Inquisition — Witch Hunter — Relentless Pursuit

**Plan:** Make attacks fail, convert the failed attack into Relentless Pursuit, and turn the opponent's lost turn into immediate positional pressure.  
**Territories:** Garrison → Exposed Flank → High Ground.

- **Court Martial beats Guilt by Association** because Witch Hunter needs the attack to fail now; Disadvantage plus additional retreat feeds Relentless Pursuit directly.
- **Scorched Earth supplies a productive losing line:** even a broken defensive Territory can become Ruins.
- **Resistance stays** because Exposed Flank and occupation states create genuine counterattack opportunities.
- **Three Confession is justified** because both modes directly increase the probability that the triggering attack fails.

---

# Pool-level result

These twelve Decks collectively use **109 of 128 playable titles (85.2%)**. Coverage was not optimized; the increase arose because more cards survived direct slot competition.

The **19 still-unused titles** are:

| Card | Audit disposition |
|---|---|
| Armistice | Deliberate omission; powerful stall tool with expensive upkeep and self-blocking battle restriction. Spirit Walker stall variant worth testing. |
| Bombardment | Competitive General A/B candidate; currently loses to more immediate attack/capture conversion. |
| Capital Punishment | Powerful metagame answer; A/B candidate for Grand Inquisitor and Executive. |
| Conscription | Good Asset/action compression, but no baseline shell needs it more than its current 3-point engines. |
| Contingency Plan | Too conditional; current Decks prefer proactive 1-point effects. |
| Counterworks | Strong Overlay hate, but too matchup-dependent for a baseline slot. |
| Insurrection | High-ceiling hand reset/counterattack card; plausible Commandant A/B candidate. |
| Liberation | Very plausible Commandant alternative; narrowly loses to Fortifications/Resistance/Foothold. |
| Manifest Destiny | Transformational structural card requiring dedicated testing; not safe to judge from baseline slot competition alone. |
| Monetary Crisis | Symmetrical Hand destruction fights the Financiers' own assembled resources. |
| Requisition | Sacrifices Assets in Decks that generally value keeping those Assets in play. |
| Revolution | Powerful but high-variance; deserves dedicated matchup testing. |
| Rousing Speech | Replaced in both Diplomat shells by more reliable interaction. |
| Salvage | Useful recursion, but recursion-heavy Decks already have stronger faction/Territory engines. |
| Sedition | Legitimate Senator metagame option; Sabotage wins because its battle mode is much stronger. |
| Sequestration | Symmetrical Asset wipe harms most shells that could otherwise exploit it. |
| Strategic Withdrawal | Flexible, but General's Brothers in Arms package is more synergistic. |
| Valor | Strong floor card, but proactive battle engines win current slot competition. |
| War Crimes | Deliberate Military omission; its post-victory restriction conflicts directly with Military movement, capture, and Order conversion after winning. |

## Next testing stage

Stop broad theory-driven changes and use matchup evidence. Track opening-hand dead-card rate, cards stranded in Hand at game end, realized value per copy, alternate-victory frequency, and whether any win condition arrives before opponents have meaningful counterplay.

Priority A/B cards: **Bombardment, Liberation, Manifest Destiny, Capital Punishment, Armistice, Revolution, Sedition, Salvage, and Valor.**

Priority deck questions: General Battlefield Promotion/Consolidation ratio; Commandant Fortifications/Foothold/Liberation mix; Executive Corner the Market; Ranger information/interference density; Spirit Walker Circle/Altar balance; Grand Inquisitor Attrition vs second Excommunication; Witch Hunter Scorched Earth vs third Entrenchment.
