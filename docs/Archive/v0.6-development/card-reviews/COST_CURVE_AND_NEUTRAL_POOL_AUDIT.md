# Gauntlet v0.6 Cost Curve and Neutral Pool Audit

**Status:** Complete  
**Scope:** Final v0.6 Neutral-pool size, cost curve, approved cost reductions, and the twelve new Neutral cards.

The authoritative working exact text for all 50 Neutral cards is now `../Gauntlet_v0.6_Neutral_Card_Pool.md`. This audit records the reasoning and migration result rather than duplicating every card's full text.

## Cost-direction constraint

This audit did not increase the cost of any existing reviewed card.

- Existing costs could remain unchanged or be reduced.
- Complexity alone never justified a higher cost.
- Efficient cards were treated as benchmarks or watchlist items rather than repriced upward.
- The low-cost shortage was solved through justified reductions and genuinely low-cost new designs.

## Final Neutral pool

| Cost | Cards | Deckbuilding value |
|---:|---:|---:|
| 1 | 11 | 11 |
| 2 | 19 | 38 |
| 3 | 11 | 33 |
| 4 | 8 | 32 |
| 5 | 1 | 5 |
| **Total** | **50** | **119** |

The final average cost is **2.38**. A constructed deck still generally needs an average cost of 2.0 or less under the 30-card / 60-point limit, so players must select among premium alternatives rather than include them all.

## Entire approved playable-card design pool

The project now contains 66 approved playable-card designs: the 54 reviewed v0.5.7 source cards plus 12 new Neutral cards.

| Cost | Cards |
|---:|---:|
| 1 | 11 |
| 2 | 22 |
| 3 | 16 |
| 4 | 12 |
| 5 | 5 |
| **Total** | **66** |

This count concerns approved designs, not a canonical v0.6 release dataset. Faction packages and several exact-text blockers remain unresolved.

## Cost-tier rubric

- **Cost 1:** glue, filtering, narrow protection, conditional +1 effects, and situational movement, Territory, Asset, or recovery tools.
- **Cost 2:** the functional center of the pool; broadly useful cards without repeated premium value or major action-economy swings unless substantially conditioned.
- **Cost 3:** strong strategic cards, build-arounds, meaningful card or action advantage, repeatable infrastructure, or two strong modes.
- **Cost 4:** premium effects that materially change a battle, board position, engine, or strategic plan.
- **Cost 5:** rare capstones and build-arounds capable of decisively changing the game.

## Approved existing-card reductions

| Card | Previous | Final |
|---|---:|---:|
| Counterintelligence | 2 | **1** |
| Fealty | 2 | **1** |
| Redemption | 2 | **1** |
| Decoys | 3 | **2** |
| Illegal Occupation | 3 | **2** |
| Scorched Earth | 3 | **2** |
| Sedition | 3 | **2** |
| Strategic Withdrawal | 3 | **2** |
| Insurrection | 4 | **3** |
| Liberation | 4 | **3** |
| Protracted Siege | 4 | **3** |

## Approved existing cards retained at their reviewed costs

### Cost 1

- New Recruits
- Rallying Cry
- Scouting Report
- Supplies

### Cost 2

- Disruption
- Entrenchment
- Palisade Wall
- Reinforcements
- Rousing Speech
- Sabotage
- Stand Ground
- Valor

### Cost 3

- Attrition
- Conscription
- Contraband
- Court Martial
- Fortifications
- Resistance

### Cost 4

- Arcane Knowledge
- Armistice
- Assimilation
- Capital Punishment
- Invasion
- Revolution
- Sequestration
- Siege Weaponry

### Cost 5

- Manifest Destiny, fully redesigned and assigned Neutral as the unique capstone

## Twelve approved additions

### Cost 1

- Contingency Plan — Asset-capacity resilience and comeback modifier
- Forced March — limited extra movement and attacking modifier
- Pathfinders — terrain navigation and Territory interaction
- Reserves — hand and battle-draw smoothing

### Cost 2

- Advance Guard — risk-reward offensive movement
- Consolidation — occupation-and-capture payoff
- Foothold — support for surviving the counterattack window
- Requisition — conversion of expendable Assets into immediate value
- Salvage — discard and battle-draw recovery through exchange
- Tactical Planning — hand and battle-draw selection

### Cost 3

- Counterworks — narrow Overlay prevention and temporary suppression
- Resourcefulness — cost-1-card build-around

## Final cost-3 additions

### Resourcefulness

**Cost:** 3  
**Allegiance:** Neutral  
**Complexity:** Advanced

> **Action:** Bank Resourcefulness as an Asset. You may have only one banked Resourcefulness. The first time during each of your turns that you play a cost-1 card, draw one card.
>
> **Battle:** If another active Battle card you played during this battle has cost 1, gain advantage.

Resourcefulness gives low-cost-heavy decks a positive strategic identity rather than treating cost-1 cards only as budget offsets. Its repeated card advantage belongs on the playtest watchlist.

### Counterworks

**Cost:** 3  
**Allegiance:** Neutral  
**Complexity:** Advanced

> **Action:** Bank Counterworks as an Asset. When an opposing effect would place an Overlay on a Territory, you may discard Counterworks. If you do, that Overlay is not placed. If a card would have become that Overlay, place the card that would have become that Overlay in its owner's discard pile.
>
> **Battle:** Choose one: one Overlay on the contested Territory is inactive during this battle; or the next opposing Overlay that would be placed on the contested Territory during this battle or battle cleanup is not placed. If a card would have become that Overlay, place the card that would have become that Overlay in its owner's discard pile.

Counterworks gives every faction necessary Overlay counterplay without granting broad Overlay management.

## Neutral / Engineer Overlay boundary

Neutral may:

- place specific Overlays;
- prevent one opposing Overlay from being placed;
- temporarily suppress an Overlay in a defined battle or timing window.

The future Engineer faction retains:

- Repair;
- permanent dismantling of established Overlays;
- moving, replacing, upgrading, or recurring Overlays;
- connected infrastructure;
- victory progress derived from Overlay networks.

## Complete Neutral pool by cost

### Cost 1 — 11

Contingency Plan; Counterintelligence; Fealty; Forced March; New Recruits; Pathfinders; Rallying Cry; Redemption; Reserves; Scouting Report; Supplies.

### Cost 2 — 19

Advance Guard; Consolidation; Decoys; Disruption; Entrenchment; Foothold; Illegal Occupation; Palisade Wall; Reinforcements; Requisition; Rousing Speech; Sabotage; Salvage; Scorched Earth; Sedition; Stand Ground; Strategic Withdrawal; Tactical Planning; Valor.

### Cost 3 — 11

Attrition; Conscription; Contraband; Counterworks; Court Martial; Fortifications; Insurrection; Liberation; Protracted Siege; Resistance; Resourcefulness.

### Cost 4 — 8

Arcane Knowledge; Armistice; Assimilation; Capital Punishment; Invasion; Revolution; Sequestration; Siege Weaponry.

### Cost 5 — 1

Manifest Destiny.

## Migration result

The following sources should now defer to `../Gauntlet_v0.6_Neutral_Card_Pool.md` for Neutral costs and exact text:

- the migration-era consolidated Card Review Log;
- the v0.6 Card Metadata registry when a wording conflict exists;
- the historical v0.5.7 canonical dataset;
- temporary cost and addition worksheets.

No canonical v0.6 data was created during this audit. That must wait until faction packages and remaining exact-text blockers are resolved.

## Remaining work outside this audit

- decide whether Siege Weaponry is renamed Bombardment;
- finalize Blockade / Sanctions;
- finalize Capital Gains around Financier infrastructure;
- finalize Witchcraft's eligible-effect wording;
- define impossible-target and source-dependent copied-effect handling;
- complete Intelligence Missions;
- complete and audit faction packages, cost curves, and capstones;
- create canonical v0.6 data only after those decisions are stable.