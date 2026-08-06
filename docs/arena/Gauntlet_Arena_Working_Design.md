# Gauntlet: Arena — Working Design Record

**Status:** Exploratory multiplayer design; not canonical rules  
**Base rules:** [Gauntlet v0.6.2](../../releases/v0.6.2/README.md)  
**Format:** Four-player free-for-all  
**Target release:** Provisionally v0.7; v0.8 if the Complete Illustrated Edition publishes first  
**Rules authority:** v0.6.2 remains authoritative except during expressly identified Arena tests  
**Tracking issue:** [#523 — Design and prototype Gauntlet: Arena](https://github.com/tymonius/Gauntlet/issues/523)  
**Last updated:** August 6, 2026

---

## 1. Purpose

Gauntlet: Arena is a proposed four-player free-for-all mode built from the stable two-player structure of Gauntlet v0.6.2.

Arena should preserve the identity of Gauntlet:

- constructed Decks and faction asymmetry;
- hidden Gambit, Reserve, and Tactic commitments;
- movement through Territories;
- battle, occupation, Counterattack, and delayed Capture;
- visible territorial progress;
- alternate faction victories that remain interactive and disruptable; and
- the danger of overextending beyond support.

Arena adds a larger battlefield, multiple opponents, two independently positioned forces per player, directional retreat, encirclement, and player elimination.

Arena is not intended to replace standard two-player Gauntlet. It is a separate format using the same cards and core systems wherever practical.

## 2. Inheritance and document authority

Gauntlet: Arena inherits all shared rules, terminology, playable-card text, Territory text, faction rules, Leader rules, and component rules from v0.6.2 except where this document expressly replaces or supplements them.

This document is the single active source of truth for the early Arena prototype. It is not a published rulebook and does not override any canonical release source outside an expressly identified Arena test.

Development states used in this record:

- **Prototype rule** — part of the current model and intended for the next Arena test.
- **Open question** — unresolved and requiring design work or testing.
- **Deferred** — deliberately excluded from the current prototype.

No rule should be treated as adopted merely because it appears in this record. Arena rules become canonical only through a later approved release process.

---

## 3. Design goals

### 3.1 Preserve one player-level engine

Each player should still operate one Gauntlet Deck and one faction engine. Two Force tokens represent two battlefield positions, not two separate turns, Hands, Decks, or economies.

### 3.2 Make defense physical

A player should defend their own arm by positioning a force there, not through an abstract universal garrison bonus. Leaving home undefended should create a real opportunity for another player.

### 3.3 Reward maneuver without creating routine multi-party battles

Arena should permit flanking, rear attacks, relief attempts, pincers, encirclement, divided offensives, and opportunistic breakthroughs. Battles should nevertheless remain between two players unless an effect expressly says otherwise.

### 3.4 Preserve delayed Capture

Winning a battle and occupying a Territory should not normally equal immediate control. The existing occupation, Counterattack, and Capture rhythm should remain central.

### 3.5 Keep elimination legible and earned

A player should be eliminated by losing their Home Territory through the normal Capture structure or by losing both forces. Elimination should arise from visible battlefield failure rather than arbitrary victory points.

### 3.6 Avoid excessive multiplayer exception text

Arena should define a small set of general translation rules for movement, opponents, durations, Fronts, and battles. Individual cards should receive special wording only where the general rules cannot resolve them cleanly.

---

## 4. Current prototype summary

**Prototype rule**

The current model is:

- four players arranged around a cross-shaped battlefield;
- three player-supplied Territories in each arm;
- one central Arena Position;
- two Force tokens per player;
- two movement points per player during Movement;
- one shared Deck, Hand, Asset Bank, faction engine, Front, and Capture allowance per player;
- one force per ordinary Position;
- one-on-one battles only;
- directional retreat away from the attacker;
- immediate Breakout battles when retreat enters an enemy-occupied Position;
- permanent removal of a force that loses a Breakout;
- immediate player elimination when an opponent captures that player's Home Territory;
- player elimination when both of that player's forces have been removed; and
- victory for the last remaining player.

Negotiation and temporary cooperation are permitted as table talk. There are no formal alliances, shared-control rules, shared victories, or teammate permissions in the current model.

---

## 5. Battlefield

### 5.1 Layout

**Prototype rule**

Arena uses thirteen Territory Positions:

- three Territories in each of four player arms; and
- one central Arena connecting all four arms.

Each arm contains, from the center outward:

1. an **Inner Territory** adjacent to the central Arena;
2. a **Middle Territory**; and
3. a **Home Territory** at the outer end.

```text
                              North Home
                                  |
                         [Home][Middle][Inner]
                                  |
West Home — [Home][Middle][Inner]—[ARENA]—[Inner][Middle][Home] — East Home
                                  |
                         [Inner][Middle][Home]
                                  |
                              South Home
```

The off-board space beyond each Home Territory is that player's **Home Refuge**.

### 5.2 Territory contribution and ordering

**Open question**

The working assumption is that each player contributes three different legal Territories and orders their own arm secretly before all arms are revealed. This needs testing for setup time, information load, and first-player advantage.

Questions:

- Must one of the twelve contributed Territories be an Arena, or is the center always supplied separately?
- Are normal Arena Territories legal in the arms?
- Should Territory ordering be simultaneous and secret?
- Does the center use one fixed Arena, a randomly selected Arena, or a jointly selected Arena?

### 5.3 Central Arena status

**Open question**

The center must connect all four arms, but its control status remains unresolved.

Current candidate:

- the center is a neutral Arena Junction;
- its printed Arena battle rule applies;
- it cannot be captured or controlled;
- it has no Deed;
- it does not count toward Territory totals or limits; and
- it cannot initially receive Overlays.

This candidate reduces central snowballing and avoids making one player's Front depend on owning the only junction. It also creates exceptions to normal Territory behavior and must therefore be tested against simplicity and card compatibility.

### 5.4 Position capacity

**Prototype rule**

An ordinary board Position can contain only one Force token.

Both forces belonging to the Home player may occupy that player's off-board Home Refuge. Opposing forces cannot enter another player's Home Refuge.

**Open question**

Voluntary movement through a friendly occupied Position remains unresolved. The preferred candidate is that a force may pass through a friendly force only when it has enough movement to end in a different legal Position.

---

## 6. Players and forces

### 6.1 Player-level components

**Prototype rule**

Each player has one:

- Deck;
- Hand;
- Draw Pile;
- Discard Pile;
- Graveyard;
- Leader;
- Asset Bank;
- faction resource and faction progress package;
- Action allowance;
- Front and Territory-control state; and
- normal Capture opportunity per turn.

Both forces use and affect those shared components.

### 6.2 Force tokens

**Prototype rule**

Each player controls two Force tokens:

- **Advance Force**; and
- **Rear Guard**.

The names identify the tokens but do not currently impose different abilities, movement rules, battle modifiers, or permitted regions. Their strategic roles arise from position and player choice.

Each force separately has:

- a Position;
- an attack direction when it enters a battle;
- an occupation state;
- a retreat direction; and
- an in-play or removed state.

A reference to a participating force means the specific token involved in the current movement, battle, occupation, retreat, or effect.

### 6.3 Losing one force

**Prototype rule**

Removing one force does not eliminate its player. The player continues with the surviving force and still receives two movement points during normal Movement.

This preserves a possibility of recovery while making force loss permanently consequential.

---

## 7. Movement

### 7.1 Movement allowance

**Prototype rule**

During Movement, the active player receives **2 movement points**.

Spend each movement point to move one of that player's forces one adjacent Position by Advancing or Falling Back. The player may:

- spend both points on one force;
- spend one point on each force; or
- leave one or both points unspent.

Movement points are spent sequentially and need not be allocated in advance.

Examples:

```text
2 + 0: one force moves twice; the other Holds.
1 + 1: each force moves once.
0 + 2: the second force moves twice; the first Holds.
```

Holding costs no movement point.

### 7.2 Advance and Fall Back

**Prototype rule**

Relative to a player's own Home Refuge:

- **Advance** moves away from that player's Home Refuge toward the center and then outward through an opposing arm.
- **Fall Back** moves along the reverse route toward that player's Home Refuge.

At the central Arena, an Advancing force may enter any opposing Inner Territory. Once it enters an opposing arm, continuing to Advance moves outward toward that opponent's Home Territory.

To change from one opposing arm to another through ordinary movement, a force must Fall Back to the central Arena and then Advance into the new arm.

### 7.3 Battles during movement

**Prototype rule**

Entering a Position occupied by an opposing force creates a pending battle under the inherited battle procedure.

The moving force is the attacker. The stationary force is the defender.

When a force creates a pending battle, that force's current normal movement sequence ends. A remaining movement point may still be spent on the player's other force after the battle is completely resolved.

Current prototype permits each force to initiate no more than one battle during the same normal Movement, allowing a maximum of two player-initiated battles in one Movement.

**Open question**

Track whether permitting two initiated battles makes turns or rounds unacceptably long. A later prototype may cap the active player at one initiated battle per normal Movement.

### 7.4 Additional movement

**Prototype rule**

When an effect grants additional movement to a force participating in a battle or occupation, that movement applies to that force unless the effect expressly identifies another force.

When an effect grants the player additional movement without identifying a force, the player chooses one legal force when resolving the effect.

Additional movement remains distinct from the two normal movement points and follows inherited additional-movement timing unless Arena expressly changes it.

---

## 8. Battles

### 8.1 One-on-one battles

**Prototype rule**

Every battle has one attacking player and one defending player. Only the two participating forces occupy the contested Position for purposes of that battle.

A third or fourth player cannot contribute cards, resources, modifiers, Terms, or choices unless an effect expressly permits it.

### 8.2 Shared player resources

**Prototype rule**

A battle involving either force uses the controlling player's shared:

- Hand;
- Deck and other card zones;
- Assets;
- faction resources;
- once-per-turn permissions;
- Leader ability; and
- other player-level state.

Using cards or resources in one force's battle can therefore weaken the other force's later defense or attack during the same round.

### 8.3 Force-local outcomes

**Prototype rule**

Movement, occupation, retreat, withdrawal, and post-battle movement resulting from a battle apply to the participating force unless an effect expressly says otherwise.

Territory control, resources, cards, faction progress, and victory progress belong to the player rather than to an individual force.

### 8.4 Multiple battles in one turn

**Prototype rule**

The inherited limits and spent states remain spent across all battles during the same turn. A second battle does not refresh the player's Hand, Assets, Leader ability, faction resource, or once-per-turn effects.

**Open question**

A full audit is required for effects that currently assume at most one relevant battle per turn or one opposing player per turn.

---

## 9. Directional retreat

### 9.1 Entry edge

**Prototype rule**

Every attack has an **entry edge**: the connection crossed by the attacker to enter the contested Position.

The entry edge determines the direction of retreat.

### 9.2 Losing attacker

**Prototype rule**

A defeated attacker retreats back through the entry edge toward the Position from which it attacked, following inherited retreat distance and additional-retreat effects.

### 9.3 Losing defender

**Prototype rule**

A defeated defender retreats through the edge opposite the attacker's entry edge, directly away from the attacker.

This rule applies even when retreat carries the defender farther away from its own Home Refuge or deeper through an opposing arm.

Example:

```text
A attacks from behind → B → C is farther ahead

A defeats B.
B retreats away from A, toward C.
```

At the central Arena, the opposite edge is the arm directly across the center from the attacker's entry arm. A force attacked from the north is driven south, not east or west.

### 9.4 Continued retreat

**Prototype rule**

Additional retreat caused by the same battle continues in the direction established by that battle unless an effect expressly redirects the force.

### 9.5 Retreat into an empty Position

**Prototype rule**

The retreating force enters the empty Position normally.

### 9.6 Retreat into a friendly force

**Prototype rule**

A retreating force does not battle a friendly force. It passes through the friendly-occupied Position and continues in the same direction until it reaches:

- the first empty legal Position;
- an enemy-occupied Position, which begins a Breakout; or
- a board edge that removes it under the applicable rule.

This forced passage does not require movement points.

**Open question**

Test whether this creates unintuitive long displacement or makes tight friendly formations too dangerous. Alternatives include displacing the friendly force or removing the retreating force when no adjacent space is available.

### 9.7 Retreat beyond a Home Territory

**Prototype rule**

A player may retreat into their own Home Refuge.

A force cannot enter another player's Home Refuge. If a non-owner would be forced beyond that player's Home Territory, remove the force from the game.

This makes the outer end of an opposing arm a dangerous boundary rather than a safe space beyond the objective.

---

## 10. Breakout battles and encirclement

### 10.1 Beginning a Breakout

**Prototype rule**

When a retreating force would enter a Position occupied by an enemy force, it immediately begins a **Breakout battle** against that blocking force.

- The retreating force is the Breakout attacker.
- The blocking force is the Breakout defender.
- The force that won the preceding battle remains in the Position from which it drove the retreating force.
- The Breakout costs no movement point.
- Resolve it completely before the interrupted turn or retreat chain continues.

Example:

```text
A defeats B from behind.
B is forced forward into C.
B immediately attacks C in a Breakout battle.
```

### 10.2 Successful Breakout

**Prototype rule**

If the Breakout attacker wins:

1. the blocking force retreats normally away from the Breakout attacker;
2. the Breakout attacker takes the contested Position; and
3. the Breakout attacker remains in play.

The blocking force's retreat can itself cause another collision and Breakout.

### 10.3 Failed Breakout

**Prototype rule**

If the Breakout attacker loses, remove that force from the game.

It cannot retreat backward because the Position behind it is held by the force that defeated it in the preceding battle. The force has been defeated by enemies on both sides.

Example:

```text
A → B ← C

A defeats B from behind.
B is forced to attack C.
C defeats B.
B is removed.
```

A and C may belong to different opponents or may be the same opponent's two forces.

### 10.4 Withdrawal and unresolved Breakouts

**Prototype rule**

The Breakout attacker cannot voluntarily withdraw backward through the force that drove it into the Breakout. If it loses or an effect requires it to withdraw without placing it in another legal Position, remove it.

**Open question**

The following require an exact compatibility ruling before faction-complete playtesting:

- Accepted Terms that move one or both participants;
- effects that end a battle without a normal winner;
- effects that replace retreat with withdrawal or post-battle movement;
- effects that move the Breakout defender before the battle ends; and
- ties or copied effects that create an otherwise unresolved Position.

### 10.5 Retreat cascades

**Prototype rule**

Breakout displacement is recursive. Continue resolving retreat, collisions, Breakouts, and force removal until every affected force has reached a legal Position or been removed.

With eight starting forces, the total chain remains physically bounded, but the procedure must be tested for clarity and duration.

---

## 11. Fronts, occupation, and Capture

### 11.1 One player-level Front

**Prototype rule**

Each player has one branching Front shared by both forces.

A player's Front consists of the Territories they control that remain continuously connected to their Home Territory through Territories they control, subject to the final rule for the central Arena.

The two forces do not maintain separate Fronts.

### 11.2 Occupation

**Prototype rule**

Either force may occupy a Territory under inherited occupation rules. A player can therefore have occupation on two different branches at the same time.

Occupation belongs to the participating force for positional purposes, but any later control gained belongs to the player.

### 11.3 Normal Capture limit

**Prototype rule**

Normal Capture still adds no more than one Territory to a player's Front per turn, regardless of how many forces occupy eligible Territories.

If both forces support eligible Capture progress on different branches, the player chooses one branch during Capture.

This preserves the distinction between tactical reach and logistical consolidation.

### 11.4 Capture path

**Prototype rule**

To Capture through normal progression, trace a continuous path from the player's Home Territory toward an occupying force. The next uncontrolled or unsupported Territory on that path is the candidate added to the player's Front, provided all inherited Capture requirements are met.

**Open question**

Exact wording depends on the status of the central Arena and on whether cut-off control remains control, becomes dormant control, or is lost.

### 11.5 Cut-off holdings

**Open question**

Current candidate:

- a Territory whose connection to its controller's Home Territory is broken remains oriented toward and nominally controlled by that player;
- it is not part of that player's Front;
- it does not count toward Territory-scaled limits, thresholds, or Home defense;
- it does not grant Defensive Edge based solely on control; and
- it reactivates when a controlled connection is restored.

This candidate preserves visible territorial history while making supply-line cuts meaningful. It may create too many control states and must be tested against simpler alternatives:

- immediately lose control of disconnected Territories;
- return them to their previous owner;
- make them uncontrolled; or
- allow isolated control with fewer penalties.

### 11.6 Capture effects that advance the Front

**Open question**

Effects that immediately advance a Front, create a Territory, add a Territory to the Gauntlet, or bypass ordinary Capture need a dedicated audit. They must identify the affected branch and cannot silently create disconnected control.

Manifest Destiny is a priority case because it can add a new Territory Position and alter board geometry.

---

## 12. Home Territories, elimination, and victory

### 12.1 Home Territory

**Prototype rule**

Each player's outermost contributed Territory is their Home Territory.

The Home Territory is an ordinary Territory for battle, occupation, Counterattack, and Capture unless Arena expressly provides an exception.

### 12.2 Capturing a Home Territory

**Prototype rule**

When an opponent captures a player's Home Territory, that player is immediately eliminated.

Merely winning a battle there or occupying it does not eliminate the Home player. The attacker must complete a legal Capture, preserving a final Counterattack opportunity under the normal delayed-Capture structure.

Arena does not use the standard Last Stand as the normal territorial victory procedure.

### 12.3 Losing both forces

**Prototype rule**

A player is immediately eliminated when both of their forces have been removed from the game, even if they still control their Home Territory.

### 12.4 Winning Arena

**Prototype rule**

The last player who has not been eliminated wins the game.

### 12.5 Eliminated-player cleanup

**Open question**

The complete cleanup procedure must determine what happens to:

- the eliminated player's remaining force, if any;
- their Hand, Deck, Draw Pile, Discard Pile, and Graveyard;
- Assets and faction components;
- Conditions they created;
- Overlays they control;
- Deeds they own;
- Territory control and orientation;
- pending durations and delayed effects;
- Missions, Rites, Proposals, Treaty Articles, and other progress components; and
- turn order.

Current candidate:

- remove all remaining forces and personal card-zone components;
- remove player-bound progress and resources;
- end effects that require that player to make choices or remain in the game;
- leave surviving players' Territory control intact;
- make Territories controlled only by the eliminated player uncontrolled;
- make their Deeds unowned; and
- skip the eliminated player in turn order.

Persistent board objects created by the eliminated player require case-by-case rules until ownership and source-dependence are fully audited.

### 12.6 Abandoned arm

**Open question**

An eliminated player's arm remains part of the battlefield. It no longer represents an active Home capable of eliminating another player.

The arm may remain useful as a route, contested ground, or source of Territory control. Testing must determine whether this creates desirable strategic space or an overly safe expansion zone for the player who secured the elimination.

---

## 13. Multiplayer terminology and targeting

### 13.1 Opponent in a battle

**Prototype rule**

During a battle, **the opponent** means the other participating player.

A reference to **both players** during a battle means the attacker and defender in that battle, not all players in Arena.

### 13.2 Opponent outside a battle

**Prototype rule**

Outside a battle, when an effect instructs a player to choose or affect **an opponent**, choose one opposing player unless the effect expressly says every opponent or all opponents.

### 13.3 Target persistence

**Prototype rule**

When an effect creates a duration or delayed instruction involving one opponent, record or remember the chosen opponent. The effect does not automatically transfer to another opponent later.

### 13.4 Hidden information

**Prototype rule**

Permission to view, reveal, alter, or replace hidden information applies only to the identified opponent and card zone. Other players do not gain that information merely because they are present at the table.

### 13.5 Force references

**Prototype rule**

When an effect arising from a battle moves **you**, **your Position**, or **your current Territory**, it applies to the participating force.

Outside a battle, if an effect moves the player without identifying a force, the player chooses one legal force when resolving it.

### 13.6 Global effects

**Open question**

Cards using terms such as every player, each player, both players, every Territory, the Gauntlet, final Territory, or end of the Gauntlet require explicit multiplayer review. Do not infer that two-player global language automatically scales to four players.

---

## 14. Alliances and negotiation

### 14.1 Table talk

**Prototype rule**

Players may negotiate, threaten, promise, coordinate, and form temporary nonbinding arrangements through ordinary table talk.

### 14.2 No formal alliance object

**Prototype rule**

Arena currently has no rules-defined ally, team, alliance duration, shared Territory control, shared Front, shared victory, or allied targeting exemption.

A promise is not enforceable by the rules.

### 14.3 No unsupported transfers

**Prototype rule**

Players cannot reveal hidden cards, transfer cards or resources, contribute to another player's battle, share control, or permit movement through occupied Positions unless a card or Arena rule expressly allows it.

---

## 15. Faction adaptation status

All faction alternate victories and several faction procedures require multiplayer review. The table below records directions, not final rules.

| Faction | Standard structure | Arena issue | Current direction | Status |
|---|---|---|---|---|
| Military | Run the Gauntlet; no alternate victory | Standard Last Stand is removed | Win by being the last player remaining; adapt Orders only where branch or force identification is required | Prototype candidate |
| Diplomats | Peace Treaty through five different ratified Proposals | One cooperative opponent could enable the victory | Require meaningful ratification or Terms involvement across multiple opponents | Open question |
| Financiers | Controlling Interest through Deeds to every Territory | The board has twelve arm Territories plus a central Arena | Use a board-wide threshold with geographic breadth rather than every Position | Open question |
| Intelligence | Missions and Special Operation compare progress to the opponent | Missions and readiness need identified targets | Mark the relevant opponent when a Mission or Special Operation begins; require multi-opponent involvement | Open question |
| Mystics | Complete Rites and win the Ritual battle | More opponents create interruption and collusion concerns | Retain the basic structure with clear opponent and force targeting, then test disruption pressure | Open question |
| Inquisition | Purification when the opponent fails the normal draw | Multiple opponents can exhaust at different times | Identify a condemned or qualifying opponent and resolve competing claims | Open question |

### 15.1 Military

**Prototype candidate**

Military uses the normal Arena victory of eliminating all opponents. There is no separate Triumph or Last Stand requirement.

Orders and Leader abilities that move the player or advance the Front must identify the affected force or branch.

### 15.2 Diplomats

**Open question**

Peace Treaty should not be achievable solely through repeated cooperation with one opponent while ignoring the others.

Current candidate requires:

- five different ratified Proposals; and
- at least one qualifying ratification or Terms interaction involving each remaining opponent.

The exact endorsement marker, persistence after elimination, and interaction with refused or imposed Terms remain unresolved.

### 15.3 Financiers

**Open question**

Controlling Interest cannot simply require every Position. Candidate thresholds include:

- a strict majority of all deed-bearing arm Territories plus at least one Deed in every arm;
- eight of twelve arm Territories;
- control of two complete Home-to-Arena routes; or
- a value-based portfolio threshold tied to controlled and connected Territories.

The center likely has no Deed if it remains neutral.

### 15.4 Intelligence

**Open question**

Missions referring to the opponent should identify a target opponent when begun. Special Operation should identify its target when initiated.

A candidate readiness rule compares Operation Progress to the chosen target's effective controlled-Territory count and requires completed normal Missions involving multiple opponents before Special Operation can win.

### 15.5 Mystics

**Open question**

The Rite structure may translate with relatively little change, but the final Ritual battle needs a specified opponent and participating force.

Testing must watch both directions:

- three opponents create more opportunities to interrupt Rites; and
- one opponent could intentionally throw the final Ritual battle.

### 15.6 Inquisition

**Open question**

Purification could trigger when any identified opponent fails their normal own-turn draw because their Draw Pile and Discard Pile are empty.

A target, condemnation, or attribution rule may be necessary to prevent opportunistic wins caused almost entirely by another player's deck pressure.

---

## 16. Compatibility audit

The first complete audit should classify every playable card, Territory, Leader, and supplemental component under one or more of these categories:

1. **Battle-local effects** — likely translate through the participating forces.
2. **Opponent targeting** — requires selection among multiple opponents.
3. **Both-player or global language** — may need a multiplayer definition or replacement.
4. **Durations** — must identify whose turn, which opponent, and when the effect ends.
5. **Movement and Position** — must identify the affected force and legal branch.
6. **Retreat and withdrawal** — may interact with Breakouts, cascades, and board edges.
7. **Front advancement** — must identify the affected branch and preserve connection.
8. **Final Territory and Last Stand** — requires Home Territory translation or removal.
9. **Territory-count scaling** — may exceed the normal six-Territory range.
10. **Deeds and control** — must address twelve arm Territories, the center, and disconnected holdings.
11. **Added Territories and geometry** — may alter the cross or create new branches.
12. **Arena and Overlay eligibility** — must resolve the central Position.
13. **Once-per-turn effects during opposing turns** — may trigger up to three times between a player's turns.
14. **Hidden zones** — must preserve target-specific information.
15. **Elimination persistence** — must say whether effects survive their source player's elimination.

Priority cases include:

- Manifest Destiny and other effects that add or insert Territories;
- immediate Front-advancement effects;
- effects referring to the final Territory or end of the Gauntlet;
- retreat multiplication or replacement;
- effects that last through the opponent's turn;
- copied or source-dependent effects;
- Deed ownership and purchase rules;
- central Arena Overlays; and
- effects that can create, prevent, or interrupt a Breakout.

The audit should not begin as a rewrite of all card text. First identify which general Arena rules resolve entire categories and isolate only the remaining exceptions.

---

## 17. First-prototype boundaries

**Prototype rule**

The first physical Arena test should use:

- exactly four players;
- four different factions;
- no duplicate Leaders;
- standard v0.6.2 Deck construction;
- no Arena-exclusive playable cards;
- no formal alliances;
- no shared combat assistance;
- no three-way or four-way battles;
- no team victory;
- one central Arena selected before play; and
- provisional faction-victory rulings recorded before the session begins.

**Deferred**

The following are outside the first prototype:

- two-player or three-player Arena scaling;
- five or more players;
- two-versus-two team play;
- duplicate-faction procedures;
- duplicate-Leader procedures;
- allied movement or shared defense;
- player respawn;
- replacement forces;
- Arena-exclusive Deck construction;
- new multiplayer-only factions; and
- a full digital implementation.

The first test may temporarily disable faction alternate victories if necessary to isolate board geometry, movement, retreat, and elimination. Any such test must be labeled as a geometry test rather than a complete balance test.

---

## 18. Open design questions

### Battlefield and setup

- Is the central Arena neutral and uncapturable?
- Can the center receive Overlays, Conditions, Deeds, or added Territories?
- Can normal Arena Territories appear in player arms?
- How are Territory order and central Arena selection determined?
- Who takes the first turn, and how is turn order chosen?

### Movement and Position

- Can a force voluntarily pass through a friendly occupied Position?
- Can both forces initiate separate battles during one normal Movement?
- Does a battle permanently end that force's normal movement for the phase?
- How should a force change opposing arms through the center?
- Should a player with one force retain both movement points?

### Retreat and Breakouts

- Is passing through friendly forces during forced retreat sufficiently clear?
- What happens when an effect redirects retreat sideways at the center?
- Are Terms available during Breakouts?
- How do battle-ending effects resolve when the Breakout attacker has no legal retreat?
- How are simultaneous or chained retreat effects ordered?
- Does force removal occur often enough to matter without being too punishing?

### Front and Capture

- What precisely constitutes a connected branching Front?
- What happens to cut-off controlled Territories?
- Does the center count as a connector without being controlled?
- Does one normal Capture per turn make a twelve-Territory battlefield too slow?
- Can a player Capture in an arm where no force is currently present?
- How do Front-advancement effects select a branch?

### Elimination

- What is the complete cleanup procedure?
- Do persistent Overlays or Conditions survive their creator?
- What happens to Deeds and Territory ownership?
- Does an eliminated arm become too easy to exploit?
- Can a player be eliminated too early to remain engaged with the session?

### Factions and cards

- What are the exact alternate-victory thresholds?
- Should alternate victory eliminate all opponents, win immediately, or create a final response window?
- How are duplicate factions handled later?
- Which current cards require Arena-specific errata or replacement text?
- Should Territory-count formulas be capped at six unless expressly expanded?

---

## 19. First playtest questions

Record at minimum:

1. Does two-force movement create meaningful choices without making turns too long?
2. Does a Rear Guard feel useful without becoming mandatory?
3. How often do players spend both movement points on one force?
4. How often does one player initiate two battles in one Movement?
5. Does shared Hand and resource pressure naturally limit multi-battle turns?
6. Are rear attacks and directional retreats intuitive at the table?
7. Are Breakouts dramatic and legible rather than procedural clutter?
8. Can a player recover after losing one force?
9. Does leaving home undefended produce fair punishment and sufficient warning?
10. Does delayed Capture provide a meaningful final Counterattack opportunity?
11. Does one normal Capture per turn make offensives too slow?
12. Does the central Arena become permanently congested?
13. Do players use the whole cross or collapse into two parallel duels?
14. Do temporary alliances arise naturally without formal enforcement?
15. Does the table target exposed players, leaders, or weak players for understandable strategic reasons?
16. When does the first elimination occur?
17. How long does an eliminated player remain out of the game?
18. How long does a complete game take?
19. How long is the average player turn?
20. How long does each player wait between meaningful decisions?
21. Do alternate victories remain visible, interactive, and plausible?
22. Which rules require repeated explanation or physical reminders?

The first test should also record:

- faction and Leader selections;
- Territory order for every arm;
- central Arena used;
- turn order;
- total rounds;
- total battles;
- battles initiated by each force;
- Breakouts attempted and won;
- forces removed and cause of removal;
- Home Territories occupied and captured;
- eliminations and round of elimination;
- winning route; and
- total session time.

---

## 20. Documentation roadmap

Keep this record unified during early exploration. Split out new documents only when they have a distinct operational purpose.

Expected later records:

1. **Arena Compatibility Audit** — exact card, Territory, Leader, and component findings.
2. **Arena Faction Adaptation Matrix** — normative multiplayer faction procedures and victory rules.
3. **Arena Prototype Specification** — board layout, tokens, markers, and print requirements.
4. **Arena Playtest Matrix** — normative scenarios after the foundational rules stabilize.
5. **Arena Rules Candidate** — player-facing complete rules suitable for release review.
6. **Arena Reference Candidate** — compact tableside procedures.

When one of these becomes active, add it to [the Arena documentation index](README.md). Archive superseded snapshots instead of maintaining multiple active versions of the same rule.

---

## 21. Revision history

### August 6, 2026 — Initial working design

- Established Gauntlet: Arena as a proposed four-player free-for-all format.
- Recorded the provisional release-number policy: Arena is v0.7 unless the Complete Illustrated Edition publishes first.
- Established the thirteen-Position crossed battlefield as the current model.
- Added Advance Force and Rear Guard tokens for each player.
- Added two freely allocated movement points per normal Movement.
- Preserved one shared Deck, Hand, Asset Bank, faction engine, Front, and normal Capture allowance per player.
- Preserved one-on-one battles.
- Added directional retreat away from the attacker.
- Added immediate Breakout battles after retreat into an enemy force.
- Added permanent force removal after a failed Breakout.
- Replaced standard Last Stand victory with elimination by Home Territory Capture.
- Added elimination after loss of both forces.
- Established last-player-standing victory.
- Established nonbinding negotiation without formal alliances.
- Deferred exact central Arena, branching Front, cleanup, alternate-victory, and compatibility rules.
