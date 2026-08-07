# Gauntlet: Arena — Working Design Record

**Status:** Exploratory multiplayer design; not canonical rules  
**Base rules:** [Gauntlet v0.6.2](../../releases/v0.6.2/README.md)  
**Format:** Four-player free-for-all  
**Target release:** Provisionally v0.7; v0.8 if the Complete Illustrated Edition publishes first  
**Tracking issue:** [#523 — Design and prototype Gauntlet: Arena](https://github.com/tymonius/Gauntlet/issues/523)  
**Last updated:** August 6, 2026

Gauntlet: Arena inherits v0.6.2 except where this record expressly replaces or supplements it. This document governs only identified Arena prototypes and does not alter canonical two-player play.

## Decision states

- **Prototype rule** — part of the current model and intended for the next test.
- **Open question** — unresolved and requiring design work or testing.
- **Deferred** — outside the current prototype.

---

## 1. Design goals

Arena should:

- preserve one Deck, Hand, faction engine, Action economy, Front, and Capture step per player;
- make defense depend on physical force placement;
- create flanking, rear attacks, encirclement, and divided offensives;
- preserve one-on-one battles and delayed Capture;
- punish exposed outermost Territories without using abstract victory points; and
- use broad multiplayer translation rules before card-specific exceptions.

---

## 2. Prototype summary

**Prototype rule**

- Four players play on a cross-shaped battlefield.
- Each player contributes three Territories to one arm.
- The four arms meet at one shared neutral Arena tile.
- Each player controls an **Advance Force** and a **Rear Guard**.
- Both forces begin on that player's outermost Territory.
- Each player receives 2 movement points during Movement and divides them between the two forces as desired.
- Both forces share all player-level cards, resources, limits, faction progress, Territory control, and Capture.
- Battles remain one-on-one.
- A defeated defender retreats directly away from the attacker.
- Retreat into an enemy force begins an immediate Breakout battle.
- A force that loses its Breakout is removed from the game.
- Capturing an opponent's outermost Territory eliminates that player.
- Losing both forces also eliminates a player.
- The last remaining player wins.
- Negotiation is allowed, but alliances are nonbinding and there is only one winner.

---

## 3. Battlefield and setup

### 3.1 Layout

**Prototype rule**

Arena uses thirteen board Positions:

- three Territories in each of four arms; and
- one central Arena tile.

Each arm contains, from the center outward:

1. **inner Territory**;
2. **middle Territory**;
3. **outermost Territory**.

```text
                           [Outermost][Middle][Inner]
                                      |
[Outermost][Middle][Inner] — [SELECTED ARENA] — [Inner][Middle][Outermost]
                                      |
                           [Inner][Middle][Outermost]
```

There is no off-board starting Position. The battlefield ends at each outermost Territory.

### 3.2 Territory construction

**Prototype rule**

Each player contributes three different legal Territories and orders them to form their arm.

**Open questions**

- Are Territory orders chosen simultaneously and secretly?
- Can standard Arena Territory cards appear within an arm?
- How is first player determined?

### 3.3 Arena selection

**Prototype rule**

Before play begins, the players choose one Arena tile from the shared Arena set and place it in the center.

Each Arena tile corresponds to an existing Arena Territory card and uses that card's name, presentation, and printed Arena rule. It is not one of the twelve Territories contributed to the arms.

**Open question**

A fallback procedure is needed when the players do not agree on a tile. Random selection is the current candidate.

### 3.4 Neutral Arena

**Prototype rule**

No player controls or captures the Arena.

The Arena:

- is never oriented toward a player;
- is never part of a player's Front;
- has no Deed;
- cannot receive an Overlay;
- cannot receive a Condition;
- cannot receive or hold another card, marker, token, attachment, ownership component, or persistent effect unless an Arena rule expressly creates an exception;
- does not count as a controlled Territory;
- does not count toward Territory-based limits, costs, thresholds, or victory conditions; and
- does not grant control-based Defensive Edge.

Its printed Arena rule applies normally.

The Arena remains a Position for movement, battles, occupation by a force, retreat direction, adjacency, and route tracing. Occupying it never establishes control.

### 3.5 Arena as connector

**Prototype rule**

The Arena connects all four inner Territories.

For Front and Capture purposes, it may connect a player's controlled inner Territory in their own arm to a controlled inner Territory in another arm without itself becoming controlled or joining that Front.

The Arena never requires Capture. Territorial progress into another arm begins with that arm's inner Territory.

### 3.6 Starting forces and Position capacity

**Prototype rule**

Each player places both forces on their own outermost Territory during setup.

Ordinarily, no Position contains more than one force. Setup creates a temporary exception for the two starting forces.

**Open questions**

- What happens if both forces remain together when that Territory is attacked?
- May both friendly forces continue sharing their own outermost Territory?
- May a force pass through a friendly occupied Position if it ends elsewhere?

---

## 4. Players and forces

### 4.1 Shared player state

**Prototype rule**

Each player has one Deck, Hand, Draw Pile, Discard Pile, Graveyard, Leader, Asset Bank, faction resource package, faction progress package, Action allowance, Front, Territory-control state, and normal Capture opportunity.

Both forces use and affect those shared components.

### 4.2 Force-local state

**Prototype rule**

Each force separately has a Position, attack direction, occupation state, retreat direction, and in-play or removed state.

Movement, occupation, withdrawal, retreat, and post-battle movement normally apply to the participating force. Cards, resources, control, faction progress, and victory progress belong to the player.

### 4.3 Losing one force

**Prototype rule**

Removing one force does not eliminate its player. The surviving force still receives access to both normal movement points.

---

## 5. Movement

### 5.1 Movement points

**Prototype rule**

During Movement, the active player receives **2 movement points**.

Each point moves one force one adjacent Position by Advancing or Falling Back. The player may spend:

- both points on one force;
- one point on each force; or
- fewer than two points.

Movement points are spent sequentially.

### 5.2 Direction

**Prototype rule**

Relative to a player's own outermost Territory:

- **Advance** moves inward toward the Arena, then outward through an opposing arm.
- **Fall Back** moves along the reverse route toward that player's own outermost Territory.

At the Arena, an Advancing force may enter any opposing inner Territory.

A force changes opposing arms by Falling Back to the Arena and then Advancing into a different arm.

A force on its own outermost Territory cannot Fall Back farther through normal movement.

### 5.3 Battles during Movement

**Prototype rule**

Entering an enemy-occupied Position begins a pending battle. The moving force is the attacker.

A battle ends that force's current normal movement sequence. An unspent point may still be used by the player's other force after the battle resolves.

The current prototype permits each force to initiate at most one battle during the same normal Movement.

**Open question**

Track whether allowing two initiated battles per turn makes rounds too long.

### 5.4 Additional movement

**Prototype rule**

Additional movement tied to a battle or occupation applies to the participating force. When an effect grants movement without identifying a force, the player chooses one legal force.

---

## 6. Battles

### 6.1 One-on-one only

**Prototype rule**

Every battle has one attacking player and one defending player. A third or fourth player cannot contribute cards, resources, modifiers, Terms, or choices unless an effect expressly permits it.

### 6.2 Shared resources

**Prototype rule**

All battles use the player's shared Hand, Assets, faction resources, Leader ability, and once-per-turn permissions. Spending in one force's battle can weaken the other force's later battle.

### 6.3 Multiple battles

**Prototype rule**

Spent cards, resources, and once-per-turn permissions do not refresh between battles in the same turn.

---

## 7. Directional retreat

### 7.1 Entry edge

**Prototype rule**

Every attack has an **entry edge**: the connection crossed by the attacker to enter the contested Position.

### 7.2 Losing attacker

**Prototype rule**

A defeated attacker retreats back through the entry edge.

### 7.3 Losing defender

**Prototype rule**

A defeated defender retreats through the opposite edge, directly away from the attacker, even when this drives it farther through an opposing arm.

At the Arena, a force attacked from one arm is driven into the arm directly opposite it.

### 7.4 Continued retreat

**Prototype rule**

Additional retreat from the same battle continues in the direction established by that battle unless an effect expressly redirects it.

### 7.5 Friendly collision

**Prototype candidate**

A retreating force passes through a friendly force and continues in the same direction until it reaches an empty Position, an enemy force, or the end of an arm.

**Open question**

Test whether this produces excessive displacement or makes friendly formations too dangerous.

### 7.6 Board edge

**Open question**

There is no off-board Position beyond an outermost Territory.

Current candidate:

> If a force would be forced beyond any outermost Territory, remove it from the game.

---

## 8. Breakout battles

### 8.1 Beginning a Breakout

**Prototype rule**

When a retreating force would enter a Position occupied by an enemy force, it immediately begins a **Breakout battle** against that blocking force.

- The retreating force is the attacker.
- The blocking force is the defender.
- The Breakout costs no movement point.
- Resolve it before the interrupted turn or retreat chain continues.

### 8.2 Successful Breakout

**Prototype rule**

If the Breakout attacker wins, the blocking force retreats normally and the attacker takes the Position.

### 8.3 Failed Breakout

**Prototype rule**

If the Breakout attacker loses, remove it from the game. It cannot retreat backward through the force that defeated it in the preceding battle.

The forces trapping it may belong to the same opponent or to different opponents.

### 8.4 Withdrawal and unusual endings

**Prototype rule**

A Breakout attacker cannot voluntarily withdraw backward. If an effect would end the battle by sending it backward without another legal Position, remove it.

**Open questions**

Exact rulings are still required for Terms, battle-ending effects, retreat replacement, defender movement, ties, and copied effects.

### 8.5 Cascades

**Prototype rule**

Continue resolving retreat, collisions, Breakouts, and removals until every affected force reaches a legal Position or is removed.

---

## 9. Fronts, occupation, and Capture

### 9.1 One branching Front

**Prototype rule**

Each player has one Front shared by both forces.

It consists of controlled Territories continuously connected to that player's own outermost Territory. The Arena may connect controlled inner Territories across arms without itself joining the Front.

### 9.2 Occupation

**Prototype rule**

Either force may occupy a Territory. A player can maintain occupations on different branches at the same time.

A force may occupy the Arena, but cannot Capture or control it.

### 9.3 Capture limit

**Prototype rule**

Normal Capture adds no more than one Territory to a player's Front per turn, regardless of how many forces support eligible progress.

When both forces support different branches, the player chooses one.

### 9.4 Capture route

**Prototype rule**

Trace a continuous route from the player's own outermost Territory toward an occupying force. The Arena may be crossed as a neutral connector and is skipped when identifying the next Territory eligible for Capture.

### 9.5 Cut-off control

**Open question**

Current candidate:

- disconnected Territories remain oriented toward and nominally controlled by their controller;
- they are not part of the Front;
- they do not count toward Territory-scaled limits, thresholds, or defense of the controller's outermost Territory;
- they do not grant control-based Defensive Edge; and
- they reactivate when reconnected.

Simpler alternatives remain under consideration.

### 9.6 Front-advancement effects

**Open question**

Effects that immediately advance a Front, add a Territory, insert a Position, or bypass Capture must identify a branch and preserve connection. Manifest Destiny is a priority case.

---

## 10. Elimination and victory

### 10.1 Capturing an outermost Territory

**Prototype rule**

When an opponent captures a player's outermost Territory, that player is immediately eliminated.

Winning a battle there or occupying it is not enough. The attacker must complete legal Capture, preserving a final Counterattack opportunity.

Arena does not use standard Last Stand as its normal territorial victory procedure.

### 10.2 Losing both forces

**Prototype rule**

A player is immediately eliminated when both forces have been removed, even if that player still controls their outermost Territory.

### 10.3 Winning

**Prototype rule**

The last player who has not been eliminated wins.

### 10.4 Eliminated-player cleanup

**Open question**

The cleanup procedure must resolve:

- any surviving force;
- card zones and faction components;
- resources and progress;
- Territories and Deeds;
- persistent effects elsewhere on the board; and
- turn order.

Current candidate:

- remove the player's remaining force and personal components;
- remove player-bound progress and resources;
- end effects requiring that player;
- leave surviving players' control intact;
- make Territories controlled only by the eliminated player uncontrolled;
- make their Deeds unowned; and
- skip their turns.

### 10.5 Eliminated arms

**Open question**

An eliminated player's arm remains on the battlefield. Its outermost Territory no longer functions as an elimination objective. Testing must determine whether these arms create useful routes or overly safe expansion.

---

## 11. Multiplayer terminology

**Prototype rule**

- During a battle, **the opponent** means the other participant.
- During a battle, **both players** means only the attacker and defender.
- Outside a battle, **an opponent** means one chosen opposing player.
- A duration involving one opponent remains attached to that opponent.
- Hidden-information permissions apply only to the identified player and zone.
- A battle effect that moves **you** moves the participating force.
- Outside battle, an effect moving the player without identifying a force lets that player choose one legal force.

**Open question**

Cards using every player, each player, both players, every Territory, the Gauntlet, final Territory, or end of the Gauntlet require explicit audit.

---

## 12. Alliances

**Prototype rule**

Players may negotiate, threaten, promise, and coordinate through table talk.

There is no formal ally, team, alliance duration, shared control, shared Front, shared victory, or targeting exemption.

Players cannot reveal hidden cards, transfer cards or resources, contribute to another player's battle, or share control unless an effect expressly permits it.

---

## 13. Faction adaptation status

| Faction | Arena direction | Status |
|---|---|---|
| Military | Use normal last-player-standing victory; identify force and branch for movement Orders | Prototype candidate |
| Diplomats | Peace Treaty must involve multiple opponents rather than one cooperative partner | Open |
| Financiers | Arena has no Deed; Controlling Interest needs a board-wide threshold and geographic breadth | Open |
| Intelligence | Missions and Special Operation must identify target opponents | Open |
| Mystics | Retain Rites with clear opponent and force targeting; test interruption and collusion | Open |
| Inquisition | Purification needs a target or attribution rule among multiple opponents | Open |

---

## 14. Compatibility audit priorities

Audit every card, Territory, Leader, and supplemental component for:

1. battle-local effects;
2. opponent targeting;
3. both-player and global language;
4. durations;
5. force and Position selection;
6. retreat, withdrawal, Breakouts, and board edges;
7. Front advancement and branch selection;
8. final-Territory and Last Stand references;
9. Territory-count scaling;
10. Deeds and control;
11. added Territories and geometry;
12. attempts to modify or attach to the Arena;
13. once-per-turn effects during opposing turns;
14. hidden information; and
15. persistence after elimination.

Priority cases include Manifest Destiny, immediate Front advancement, extra retreat, long durations, copied effects, Deeds, and effects that could modify the Arena or interrupt a Breakout.

---

## 15. First-prototype boundaries

**Prototype rule**

Use:

- exactly four players;
- four different factions;
- no duplicate Leaders;
- standard v0.6.2 Deck construction;
- no Arena-exclusive playable cards;
- no formal alliances;
- no combat assistance;
- no three-way battles;
- no team victory;
- one selected Arena tile;
- both forces beginning on each player's outermost Territory; and
- provisional faction-victory rulings recorded before play.

**Deferred**

- two- or three-player scaling;
- five or more players;
- team play;
- duplicate-faction and duplicate-Leader rules;
- shared defense;
- respawn or replacement forces;
- Arena-exclusive Deck construction;
- multiplayer-only factions; and
- full digital implementation.

---

## 16. First playtest questions

Record:

1. whether two-force movement creates meaningful choices;
2. whether a rear defender feels useful without becoming mandatory;
3. how players divide movement points;
4. how often turns contain two battles;
5. whether shared resources naturally limit repeated battles;
6. whether rear attacks and directional retreat feel intuitive;
7. whether Breakouts are dramatic rather than cumbersome;
8. whether a player can recover after losing one force;
9. whether exposing an outermost Territory creates fair punishment and warning;
10. whether delayed Capture creates meaningful Counterattack;
11. whether one Capture per turn is too slow;
12. whether the Arena becomes congested;
13. whether the cross produces four-way play rather than two parallel duels;
14. whether informal alliances arise naturally;
15. when the first elimination occurs;
16. total game and turn length;
17. eliminated-player downtime;
18. alternate-victory viability; and
19. rules requiring repeated explanation.

Also record faction and Leader choices, Territory order, Arena tile, turn order, rounds, battles, Breakouts, force removals, outermost-Territory occupations and Captures, eliminations, winning route, and total time.

---

## 17. Documentation roadmap

Keep this record unified until a new document has a distinct operational purpose.

Expected later records:

1. Arena Compatibility Audit;
2. Arena Faction Adaptation Matrix;
3. Arena Prototype Specification;
4. Arena Playtest Matrix;
5. Arena Rules Candidate; and
6. Arena Reference Candidate.

Add each to [the Arena documentation index](README.md) when activated. Archive superseded records rather than maintaining competing active authorities.

---

## 18. Revision history

### August 6, 2026 — Arena selection and outermost start

- Established player selection of a shared Arena tile corresponding to an existing Arena Territory card.
- Established that no player controls or captures the Arena.
- Established that the Arena has no Deed and cannot receive cards, markers, attachments, ownership, or persistent effects.
- Established the Arena as a neutral connector outside every Front.
- Standardized the arm positions as inner, middle, and outermost Territories.
- Removed the off-board starting Position.
- Established that both forces begin on their player's outermost Territory.
- Established elimination when an opponent captures that outermost Territory.
- Reopened board-edge retreat because there is no off-board Position.

### August 6, 2026 — Initial working design

- Established the four-player cross battlefield.
- Added two forces and two freely allocated movement points per player.
- Preserved one shared player-level engine.
- Preserved one-on-one battles.
- Added directional retreat, Breakouts, and permanent force loss.
- Added elimination after losing both forces.
- Established last-player-standing victory.
- Established nonbinding negotiation without formal alliances.
