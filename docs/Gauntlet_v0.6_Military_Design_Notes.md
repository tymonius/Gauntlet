# Gauntlet v0.6 Military Design Notes

**Status:** Active design rationale and package audit for the completed twelve-card v0.6 Military faction pool.  
**Purpose:** Define the decisions, strategic threads, leader interpretations, intended weaknesses, and testing priorities that govern the Military package.

Use this document with:

- `Gauntlet_v0.6_Working_Rules.md` for Command, Orders, General, Commandant, battle, Asset, Overlay, and Territory rules;
- `Gauntlet_v0.6_Faction_Card_Design_Guide.md` for faction-package standards;
- `Gauntlet_v0.6_Military_Card_Pool.md` for authoritative current card names, costs, complexity, uniqueness, and exact text;
- `Gauntlet_v0.6_Neutral_Card_Pool.md` for shared tools and interaction checks.

Historical drafts, inherited-candidate audits, review notes, approval sidecars, and release-selection records remain provenance only. They do not override the active Military Card Pool.

---

## 1. Core identity

Military is about:

> **Turning battlefield success into strategic advantage while deciding how far to press before success becomes overextension.**

Military is not simply the faction with larger battle modifiers or more attacking cards. Its identity comes from converting victories into movement, retreat pressure, occupation, capture, positional leverage, preserved forces, and further operations.

Its central question is:

> **What is the most valuable thing I can do with this victory, and how much more should I commit to get it?**

This unifies both leaders:

- The **General** asks whether a successful operation can continue before momentum is lost.
- The **Commandant** asks whether a defended or occupied position can become lasting control or a counteroffensive.

The faction's defining internal tension is **momentum versus consolidation**.

---

## 2. Strategic threads

The final package uses overlapping threads rather than isolated leader packages or mechanical cycles.

### 2.1 Command discipline

Command remains a scarce tactical resource with a maximum of 2. Military cards may alter when Command is gained or how Orders are sequenced, but they should not create effortless passive generation.

The completed package expresses this through:

- **Unbroken Ranks:** risk fighting without Orders to gain additional Command after victory;
- **Encampment:** exchange a Territory effect and positional commitment for repeatable Command access;
- **Field Command:** pay for one 1-Command Order to unlock the leader's other 1-Command Order at its next legal timing;
- **Shock and Awe:** choose immediate positional breakthrough or consolidation with Command restored to 2.

The rejected Standing Orders slot is important package context: a flexible Order discount was functional but less distinctive and more likely to become routine infrastructure than the selected cards.

### 2.2 Combined arms and commitment

Military strength should come from coordinating different resources and timing windows rather than stacking generic numerical bonuses.

The package uses:

- a Battle card committed from hand;
- a card played from battle draw;
- a prepared Asset;
- an Order;
- movement and battle initiative;
- Command preserved or spent;
- the location and control state of the contested Territory.

Key cards:

- **Brothers in Arms** pairs exactly one hand commitment with one battle-drawn card;
- **Reserve Force** creates visible preparation or a provisional commitment that can be replaced after reveal;
- **Hold the Line** concentrates defensive battle draw at visible territorial risk;
- **Shock and Awe** permits exceptional post-reveal commitment during a major offensive;
- **Battlefield Promotion** converts a successful battle-drawn card into a reliable future hand card.

### 2.3 Maneuver and choosing the engagement

Military cares about who initiated the battle, where each player will stand afterward, whether retreat opens space, and whether another engagement is worth the exposure.

Key cards:

- **Give Chase** continues an initiated offensive with diminishing battle support;
- **Rearguard** protects a defeated force from one immediate pursuit effect;
- **Countercharge** turns a defensive victory into an unrestricted reversal of initiative;
- **War Crimes** exchanges ordinary post-victory movement, capture, and Orders for lasting harm;
- **Shock and Awe** distinguishes immediate breakthrough from immediate consolidation.

### 2.4 Momentum versus consolidation

The package repeatedly asks the player to choose among:

- another advance;
- another battle;
- immediate capture;
- deeper retreat pressure;
- Command readiness;
- preserving cards or position;
- stopping before becoming overextended.

Shock and Awe is the clearest expression: **Breakthrough** creates a two-space positional swing but captures neither Territory immediately, while **Consolidate** secures the contested Territory and restores Command but ends further exploitation from that victory.

War Crimes presents a darker version of the same tension: abandon normal strategic exploitation to inflict permanent card loss and a deeper retreat.

### 2.5 Prepared operations and force preservation

Military can prepare visible operations through Assets and Overlays, but preparation must consume opportunity, Asset capacity, cards, position, or flexibility.

- **Encampment** creates a persistent rally point tied to controlled ground.
- **Reserve Force** commits a hidden hand card beneath a visible Asset.
- **Hold the Line**, **Countercharge**, **War Crimes**, and **Shock and Awe** warn the opponent when banked as Assets.
- **Rearguard** preserves position after defeat without reversing the battle result.
- **Battlefield Promotion** preserves one successful battle-drawn card only after victory.

---

## 3. Final package

| Card | Cost | Principal decision |
|---|---:|---|
| Unbroken Ranks | 1 | Spend Command to improve the battle or risk winning unsupported for a larger payoff |
| Battlefield Promotion | 2 | Convert one successful battle-drawn card into reliable future commitment |
| Encampment | 2 | Replace a Territory effect with positional Command infrastructure |
| Rearguard | 2 | Preserve the defeated force without undoing the loss |
| Brothers in Arms | 2 | Delay commitment to coordinate one hand card with one battle-drawn card |
| Field Command | 3 | Sequence the leader's two different 1-Command Orders |
| Reserve Force | 3 | Prepare or revise commitment after seeing the revealed battle |
| Give Chase | 3 | Continue pursuit while accepting weaker support in extended operations |
| Hold the Line | 4 | Concentrate defense while risking immediate capture if it fails |
| Countercharge | 4 | Convert a defensive victory into an immediate new attack |
| War Crimes | 4 | Sacrifice normal victory exploitation to inflict lasting harm |
| Shock and Awe | 5 | Commit to a major offensive and choose breakthrough or consolidation |

### Cost profile

- **Curve:** 1 / 4 / 3 / 3 / 1
- **Total unique-card value:** 35
- **Average cost:** 2.92
- **Statement card:** Shock and Awe, cost 5, Unique

The curve deviates modestly from the 1 / 3 / 4 / 3 / 1 planning baseline. The fourth cost-2 card is justified by Brothers in Arms' distinctive commitment timing and the decision to remove Standing Orders rather than preserve a flatter Order-efficiency card.

---

## 4. Leader integration

### General

The General naturally values:

- Give Chase and Shock and Awe for immediate pressure;
- Brothers in Arms, Reserve Force, and Battlefield Promotion for assembling and sustaining offensive commitments;
- Field Command for Onward plus Rally sequencing;
- Encampment and Consolidate when the correct choice is to stop and prepare rather than continue.

The General should remain tempted to push one battle farther than is safe.

### Commandant

The Commandant naturally values:

- Hold the Line, Encampment, and Rearguard for defended or controlled ground;
- Countercharge for converting defense into initiative;
- Field Command for Entrench plus Repel sequencing;
- War Crimes and Shock and Awe's Consolidate option for converting victory into durable advantage.

The Commandant should not become a passive bunker strategy. Its strongest cards still lead back into contested movement, battle, occupation, and counterattack.

### Shared interpretation

No card is reserved for one leader. The same card should change in value or sequencing rather than become unusable:

- General may use Encampment to pause and reload; Commandant may use it as a defended rally point.
- General may use Countercharge to recover lost initiative; Commandant may build around the threat of an out-of-turn attack.
- General may choose Consolidate when overextended; Commandant may choose Breakthrough when a defensive victory opens the board.

---

## 5. Intended weaknesses

### 5.1 Military must win through the Gauntlet

Military has no alternate victory and no disconnected progress engine. Its advantages must ultimately produce movement, occupation, capture, and breakthrough.

### 5.2 Command depends on battlefield success

Military gains normal Command through winning battles. Encampment requires controlled position, and Unbroken Ranks requires a victory without Orders. The package does not erase Command drought through unconditional generation.

### 5.3 Limited indirect control

Military does not natively excel at:

- hand surveillance;
- random discard;
- broad cancellation;
- economic denial;
- negotiation;
- generic recursion;
- ordinary Action prevention;
- long-term Territory suppression unrelated to military position.

War Crimes is deliberately narrow, expensive, post-victory, and costly to normal exploitation; it is not a general discard engine.

### 5.4 Overextension remains dangerous

The strongest plays expose Military to depleted cards, spent Assets, poor defensive position, a counterattack, or a second battle with reduced support.

- Give Chase limits commitment and progressively reduces battle draw.
- Hold the Line grants immediate capture to the opponent if the defense fails.
- Shock and Awe causes a deeper retreat on failure.
- Countercharge may initiate an out-of-turn battle before the Military player can recover.

### 5.5 Capture shortcuts remain exceptional

Only premium, narrow effects accelerate capture:

- Hold the Line grants immediate capture to the opponent as a failure penalty;
- War Crimes explicitly gives up immediate capture;
- Shock and Awe requires choosing Consolidate instead of Breakthrough;
- the Commandant's Fortify remains the normal faction Order for immediate capture.

### 5.6 Military does not automatically win battle math

The package emphasizes timing, commitment, position, preparation, and outcome conversion. It contains no routine faction cycle of advantage, disadvantage, rerolls, or +1 modifiers.

### 5.7 Generic card economy remains limited

Battlefield Promotion preserves one battle-drawn card only after victory. No Military card provides unconditional draw, broad recursion, or a replenishing hand engine.

---

## 6. Neutral-pool boundaries

The package was checked against major Neutral overlaps:

- **Reinforcements**, **Scouting Report**, and **Tactical Planning** already provide shared battle-draw support;
- **Strategic Withdrawal** preserves a card while retreating after loss;
- **Fortifications** supports defense and withdrawal;
- **Invasion** supports offensive movement and battle draw;
- **Assimilation** supplies a shared immediate-capture effect;
- **Court Martial** adds retreat pressure;
- **Attrition** converts opposing played cards to the Graveyard;
- **Stand Ground** blocks defined card-effect movement.

Military cards remain distinct by tying those spaces to Command, initiative, positional commitment, prepared operations, victory conversion, or visible overextension risk.

---

## 7. Package playtest priorities

1. Test whether maximum Command 2 remains correct with Unbroken Ranks, Encampment, Field Command, and Shock and Awe.
2. Compare General and Commandant across the same card pool rather than through separate leader packages.
3. Test Rout, Give Chase, Countercharge, Invasion, and Shock and Awe for excessive chain movement or battle timing problems.
4. Verify that Battlefield Promotion at cost 2 is conditional preservation rather than routine card advantage.
5. Test Brothers in Arms and Reserve Force for excessive post-reveal reliability.
6. Test Hold the Line's reward against its immediate-capture failure penalty.
7. Test Rearguard against Give Chase, Rout, Countercharge, Invasion, and other movement effects.
8. Measure the long-game denial created by War Crimes.
9. Compare Shock and Awe's Breakthrough and Consolidate choices under both leaders and across different board positions.
10. Verify cleanup destinations when several replacement effects apply.
11. Revisit Standing Orders only if the completed package demonstrates a genuine Command-access gap.

The package is selected and documented, but balance values and wording may still change through playtesting before canonical v0.6 data is frozen.
