# Gauntlet Design Principles and Guardrails

**Status:** Active design reference.  
**Purpose:** Evaluate proposed rules, cards, factions, components, and digital features without duplicating the Working Rules or Open Questions.

This document describes what Gauntlet is trying to become. Current rules live in `Gauntlet_v0.6_Working_Rules.md`; unresolved decisions live in `Gauntlet_v0.6_Open_Questions.md`.

---

## 1. Core identity

Gauntlet is a tactical card-and-territory game about **running the Gauntlet**:

- advancing across contested ground;
- managing a small hand and limited card plays;
- making hidden battle commitments;
- occupying enemy Territories;
- surviving counterattacks;
- converting pressure into capture;
- creating a decisive breakthrough.

The game should feel tense, interactive, and positional. Where the players stand on the Gauntlet should matter.

Progress may be reversible, but it should not be endlessly resettable. A successful push should alter the strategic situation even when the opponent retains meaningful counterplay.

Heartlands are important rules endpoints and final defensive positions, but the player-facing identity should remain the Gauntlet itself.

---

## 2. Core and faction design

### Core principle

> The core game should teach Gauntlet. Factions should express different methods of winning Gauntlet.

The neutral pool and universal rules should establish:

- movement;
- battles;
- occupation and capture;
- counterattacks;
- Heartland victory;
- Asset banking;
- card timing and destinations;
- basic card flow, defense, and counterplay.

Faction systems should not be required for the core game to function.

### Faction principle

A card belongs to a faction when it expresses **how that faction pursues power or victory**, not merely because the faction can use it effectively.

- **Military:** conquest, battlefield momentum, Orders, and direct pressure.
- **Diplomats:** Terms, concessions, legitimacy, Influence, and Peace Treaty.
- **Inquisition:** Conviction, condemnation, suppression, Purge, and Purification.
- **Mystics:** Rites, sacrifice, transformation, Graveyard interaction, and Ritual.
- **Financiers:** Treasury, Capital, Deeds, leverage, income, and ownership.
- **Intelligence:** Missions, Intel, Surveillance, Interference, and Special Operation.

Before moving a neutral card into a faction, ask:

1. What shared tool leaves the neutral pool?
2. Do other factions need that tool for interaction, emergency defense, pacing, or comeback potential?
3. Does the destination faction already perform the same job through its core mechanic?
4. Would the card duplicate, bypass, or create strange interactions with that mechanic?

### Parallel progress

Both players should usually be able to make meaningful progress toward at least one victory condition at the same time.

Faction victories should reduce pure tug-of-war without becoming disconnected solitaire systems. Opposing progress may increase pressure, cost, or risk, but it should not automatically erase everything the faction has accomplished.

Military is the deliberate exception: it is the baseline conquest faction and uses the universal breakthrough victory rather than a separate alternate win.

---

## 3. Complexity

Complexity is acceptable when it is:

- visible;
- thematic;
- concentrated in a coherent system;
- worth the decisions it creates;
- teachable through existing game objects.

Prefer effects that:

- resolve immediately;
- use existing zones and components;
- have a clear timing window;
- create visible choices and counterplay;
- are easy to remember from the board state;
- advance the core game or a clear faction identity.

Avoid effects that:

- require hidden tracking;
- create multi-turn memory burdens without a visible object;
- add exceptions to already exceptional timing;
- require players to remember why a card is inactive;
- rewrite normal card destinations without strong justification;
- shut off the opponent's ability to play rather than improving the acting player's position.

Not every faction or card must be equally beginner-friendly. Advanced complexity is acceptable when it remains organized and legible.

---

## 4. Components and tracking

> Do not add new pieces, tokens, or markers unless the mechanic clearly justifies them.

Prefer existing objects:

- player pieces;
- cards in hand, deck, discard, or Graveyard;
- banked Assets;
- controlled or occupied Territories;
- Overlays placed on Territories;
- cards tucked near a faction sheet;
- a number tracked on a leader or faction reference.

Before adding a marker, ask whether the state can instead be represented by:

- current Territory control or occupation;
- a card in a visible zone;
- an Asset or Overlay;
- a faction-sheet track;
- immediate resolution.

### Persistent effects

- Use an **Asset** for a player-owned persistent effect that should compete for Asset-bank capacity.
- Use an **Overlay** for an effect attached visibly to a specific Territory.
- Resolve and discard immediately when persistence is unnecessary.
- Use explicit card-specific self-tracking only when an Asset, Overlay, or immediate effect cannot represent the timing cleanly.
- Do not create or revive a general Condition category.

Do not convert effects merely to eliminate terminology. Preserve pacing, counterplay, and clarity while using the approved v0.6 object model.

---

## 5. Cards and deck construction

### Printed information

Playable cards should show what is needed during play:

- name;
- cost;
- card type or timing;
- Action and/or Battle effect;
- reminder text where necessary;
- mechanically relevant traits such as **Arcane**.

Deckbuilding-only metadata should live in canonical data, faction references, deckbuilding rules, official lists, and digital tools rather than cluttering ordinary cards.

### Separate metadata axes

Development metadata is recorded separately:

- **Allegiance:** Neutral or faction-specific.
- **Starter eligibility:** whether the card belongs in introductory decks.
- **Complexity:** Basic or Advanced.
- **Watchlist:** a specific balance, pacing, wording, or interaction concern.

These are not printed gameplay classes. In particular, **Advanced** does not mean faction-specific or illegal in normal deck construction.

### Card economy and destinations

Hand commitment should remain costly and intentional. Battle draw should remain a renewable tactical resource unless an effect explicitly changes destination.

- Hand commitments normally go to the Graveyard.
- Played battle-drawn cards normally go to discard.
- Unplayed battle-drawn cards normally go to discard.

Cards that change these destinations should do so deliberately and visibly.

### Deckbuilding incentives

The point-value system should create real tradeoffs rather than one solved curve. A deck below the value cap is legal, but the game should not accidentally reward leaving value unused unless a strategy genuinely benefits from a larger or lower-cost deck.

---

## 6. Movement, territory, and pacing

The v0.5 rebuild removed movement rolls because progress should arise from player choice and battle outcomes rather than repeated permission checks.

Occupation before capture is central:

1. enter enemy ground;
2. win and occupy;
3. give the defender a counterattack window;
4. capture at the start of the occupier's next turn if the position survives.

This structure should remain the normal baseline. Immediate capture belongs on specific costly cards, leader abilities, or exceptional effects.

### Asset-bank scaling

Asset capacity equals Territories controlled because territorial success should increase infrastructure capacity. This also creates snowball risk: losing a Territory may reduce both board position and the losing player's engine.

Do not silently add a minimum Asset capacity. The minimum-two variant is a reserved comparison test, not a current rule.

Pacing changes should be evaluated using `Gauntlet_Playtest_Targets_and_Metrics.md`, not solely by intuition or average game length.

---

## 7. Victory design

Heartland breakthrough remains the universal baseline.

Faction-specific victories should be:

- public;
- visible;
- interactive;
- disruptable;
- connected to movement, battle, occupation, capture, cards, resources, or other existing game state;
- understandable before the final turn;
- possible without the opponent voluntarily enabling them;
- more than a win-more confirmation of superior board position.

The core test is:

> Can this faction make progress while the opponent is making progress toward their own victory?

If not, the victory condition is likely recreating the old tug-of-war problem.

---

## 8. Faction guardrails

### Military

- Must feel like direct battlefield competence, not simply normal Gauntlet with larger numbers.
- Command and Orders should create tactical choices about momentum, defense, and capture timing.
- Watch chain battles and excessive shortcuts around the counterattack window.

### Diplomats

- Terms should create genuine accept/refuse choices.
- Accepted Terms may avoid battle; refused Terms should generally improve the Diplomat's own options rather than prohibit the opponent's normal play.
- Peace Treaty must remain viable under military pressure and must not depend entirely on voluntary acceptance.
- Avoid lingering Accord markers and hidden negotiation tracking.

### Inquisition

- Should feel severe, procedural, and oppressive without using literal real-world religious iconography.
- Must have a functional plan against every faction, not only Mystics.
- Purification should create pressure through card attrition without making ordinary participation feel self-destructive or hopeless.
- Reserve scales imagery for a possible future Legal faction.

### Mystics

- Weirdness should be organized through consistent Rite, sacrifice, trait, and Graveyard templates.
- Ritual progress must remain public, interruptible, and connected to battles or board state.
- Mystics may be advanced, but should not become a solitaire puzzle.
- Cultural and ritual imagery should be invented or adapted carefully rather than directly appropriating living sacred traditions.

### Financiers

- Economic systems must remain connected to Territory position and conflict.
- Treasury, Capital, Deeds, and buyouts should create visible leverage rather than bookkeeping for its own sake.
- Ownership progress should be contestable and understandable, including in mirror matches.

### Intelligence

- Hidden information should produce planning and tactical disruption, not constant checking or oppressive hand control.
- Missions should reward recognizable Gauntlet situations and usually be achievable within one or two turns if pursued.
- Interference should disrupt the current plan rather than destroy cards by default.
- Special Operation must remain publicly pressured by board state and contestable after it begins.

---

## 9. Future modules and factions

Post-v0.6 concepts belong in `Gauntlet_v0.7_Parking_Lot.md`.

A future faction may specialize in a shared component without owning it exclusively. For example, Engineers may specialize deeply in Overlays, while v0.6 cards may still use Overlays whenever a Territory-local effect is clearer that way.

Do not add hooks for Day/Night, multiplayer, Engineers, or other future modules to v0.6 cards unless the current game independently needs them.

---

## 10. Digital implementation

The deckbuilder, canonical data, rules engine, CLI, and GUI are related but distinct layers.

- Canonical data defines versioned card and rules content.
- The engine defines legal state transitions.
- Interfaces request legal actions from the engine rather than reproducing rules independently.
- Hidden information must be exposed through player-specific views.
- Unsupported effects must be explicit rather than silently treated as resolved.
- Saved decks and logs must retain their rules version.
- Major-version migration must be deliberate, not automatic.

Digital implementation is valuable when it exposes ambiguity in the physical rules. It does not become authoritative merely because code exists.

---

## 11. Development discipline

Prefer:

- ugly but testable prototypes;
- explicit assumptions;
- matched comparisons;
- human playtests after simulation;
- clear freeze, kill, and revisit criteria;
- updating active source documents when a decision is approved.

Avoid:

- polishing an untested system;
- adding layers before the core execution works;
- reviving historical ideas merely because they are documented;
- allowing multiple active documents to contradict one another;
- treating archived discussion as current authority.

A superseded idea should be reopened only when a current test demonstrates a specific problem, the old idea addresses it, and the proposal is evaluated as a controlled experiment against simpler alternatives.
