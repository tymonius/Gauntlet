# Gauntlet Design Principles & Guardrails

**Status:** Living design reference  
**Purpose:** Preserve the design decisions, constraints, and guiding principles that should shape future Gauntlet rules, cards, factions, and playtest versions.

This is not a rules document. It is a design reference. Its job is to help evaluate whether a proposed change supports the kind of game Gauntlet is trying to become.

---

## 1. Core Identity

Gauntlet is a tactical card-and-territory game about advancing across a contested battlefield, capturing ground, managing limited cards, and defeating the opponent in their Heartland.

The core experience should emphasize:

- Tactical movement.
- Territorial pressure.
- Hidden card commitment.
- Battle tension.
- Occupation, counterattack, and capture.
- Asset management.
- Progress that is reversible, but not endlessly resettable.
- Distinct strategic styles without overwhelming the rules engine.

The game should feel tense, interactive, and positional. A player should usually feel that where they are on the Gauntlet matters.

---

## 2. Core vs. Faction Design

### Core principle

**The core game should teach Gauntlet. Factions should express different methods of winning Gauntlet.**

The core rules and neutral card pool should establish the basic game:

- Movement.
- Battles.
- Occupation.
- Capture.
- Counterattacks.
- Heartland victory.
- Asset banking.
- Basic card timing.
- Simple tactical choices.

Faction systems should not be required for the core game to function.

### Faction principle

Faction cards and mechanics should express a faction's method, worldview, or strategic posture.

A card belongs with a faction if it represents how that faction tries to win, not merely because the card is useful to that faction.

Examples:

- Military wins through conquest, battlefield momentum, and operational force.
- Diplomats win through Terms, Influence, concessions, legitimacy, and pressure.
- Inquisition wins through Conviction, condemnation, suppression, and purging enemy power.
- Magic/Arcane wins through ritual, transformation, Witchcraft, Graveyard interaction, and rule-bending.
- Financiers win through Treasury, investment, ownership, Capital, and delayed payoff.
- Intelligence wins through hidden information, infiltration, sabotage, and Special Operation.

---

## 3. Complexity Guardrails

Complexity is acceptable when it is legible, thematic, and worth the rules burden.

Complexity is dangerous when it is scattered, hidden, or unrelated to a clear strategic identity.

Prefer effects that:

- Resolve immediately.
- Use existing zones and game objects.
- Have clear timing.
- Create visible choices.
- Are easy to remember.
- Are tied to faction identity or core game pressure.

Avoid effects that:

- Require hidden tracking.
- Require new markers or tokens.
- Create multi-turn memory burdens.
- Add exceptions to already-exceptional timing.
- Require players to remember why a card or Asset is inactive.
- Rewrite normal card destinations without strong justification.
- Ask players to track events that happened several turns ago.
- Shut off the opponent's ability to play rather than improving the acting player's position.

---

## 4. Component and Tracking Guardrails

A major design constraint:

**Do not add new pieces, tokens, or markers unless absolutely necessary.**

When possible, use existing game objects:

- Player pieces.
- Cards in hand.
- Cards in discard.
- Cards in Graveyard.
- Banked Assets.
- Controlled Territories.
- Occupied Territories.
- Cards tucked under or placed beside a faction sheet.
- A number tracked on a faction sheet.

If a mechanic requires a new marker, first ask whether it can instead be represented by:

- Current Territory control.
- Current occupation.
- Cards in a visible zone.
- A faction-sheet count.
- Immediate resolution rather than ongoing state.

Avoid board-state markers such as Accord markers unless the mechanic absolutely cannot work without them.

---

## 5. Card and Deckbuilding Principles

### Printed card information

Regular cards should show information needed during play:

- Name.
- Cost.
- Type.
- Timing.
- Effect text.
- Relevant mechanical tags, if they matter during play.

Regular cards should not need to carry deckbuilding metadata unless that metadata has in-game relevance.

### Faction symbols

Faction symbols are locked for reference and identity purposes, but are not currently intended to appear on regular cards.

| Faction | Symbol |
|---|---|
| Military | Crossed swords |
| Diplomats | Laurel |
| Inquisition | Wide-brimmed buckle hat |
| Magic/Arcane | Pentagram |
| Financiers | Coin |
| Intelligence | Eye |

Faction symbols may be used on:

- Faction sheets.
- Leader cards.
- Reference materials.
- Deck dividers.
- Future faction-specific components.

### Card legality

Card legality should be defined through:

- Faction sheets.
- Deckbuilding rules.
- Official deck lists.
- Canonical data.
- Playtest guides.

Cards tell players how they work. Faction materials tell players who can use them.

### Advanced cards

“Advanced” is a behind-the-scenes playtest/deckbuilding classification, not a printed card identity.

Advanced neutral cards may remain available in the master pool but should be excluded from default or beginner playtest decks.

**Manifest Destiny** is currently classified as Advanced Neutral: it changes the board/strategic geometry, but is not inherently faction-specific.

### Shared faction cards

Cards may be usable by multiple factions when that makes thematic and mechanical sense.

A card may have:

- A primary faction home.
- One or more additional faction uses.
- Neutral or advanced-neutral status.
- Future compatibility with factions added later.

---

## 6. Victory Design Principles

Heartland victory remains the universal baseline.

Faction-specific victories, where used, should be:

- Public.
- Visible.
- Interactive.
- Disruptable.
- Tied to the board or existing game state.
- Not sudden hidden wins.
- Not dependent on the opponent voluntarily enabling the faction.

Not every faction needs an alternate victory condition. Military, as the baseline conquest faction, should go all-in on the normal Conquest/Heartland victory rather than using a separate alternate win condition.

---

## 7. Military Principles

**Working name:** Military. Final faction name is tabled; possible alternatives remain under consideration.  
**Symbol:** Crossed swords.  
**Role:** Baseline conquest faction.  
**Victory:** Normal Conquest/Heartland victory only.  
**Mechanic:** Command and Orders.

### Military identity

Military should represent direct battlefield competence:

- Advancing.
- Winning battles.
- Maintaining momentum.
- Holding captured ground.
- Turning combat success into board progress.

Military should not simply be “normal Gauntlet, but better.” Its identity should come from Command decisions and leader-specific Orders.

### Command

- Military may have up to 2 Command.
- The first time each turn the Military wins a battle, it gains 1 Command, up to a maximum of 2.
- Command is spent to issue Orders.
- Each Military leader has three Orders:
  - Two Orders costing 1 Command.
  - One Order costing 2 Command.

### General Orders

| Order | Cost | Draft effect |
|---|---:|---|
| Onward | 1 Command | Move one additional space this turn. This movement may initiate a battle. |
| Rally | 1 Command | Before dice are rolled in a battle you initiated, add +1 to your battle total. |
| Rout | 2 Command | After you win a battle you initiated, move one space toward the opponent’s Heartland. This movement may initiate another battle. |

### Commandant Orders

| Order | Cost | Draft effect |
|---|---:|---|
| Entrench | 1 Command | Before dice are rolled in a battle you did not initiate, add +1 to your battle total. |
| Repel | 1 Command | After you win a battle you did not initiate, the defeated opponent retreats one additional space, if able. |
| Fortify | 2 Command | After you win a battle while occupying an enemy Territory, capture that Territory immediately. |

---

## 8. Diplomats Principles

**Symbol:** Laurel.  
**Mechanic:** Terms and Influence.  
**Status:** Terms engine is promising but still under active design. Diplomatic victory condition needs significant work.

### Diplomatic identity

Diplomats should make conflict politically costly.

They should not win by avoiding the game. They should still contest the board, pressure Territories, and create difficult decisions.

A good Diplomat turn should often feel like:

> Accept Terms and give the Diplomat controlled progress, or refuse Terms and fight under diplomatic disadvantage.

### Terms terminology

Use **Terms** wherever natural:

- Offer Terms.
- Accept Terms.
- Refuse Terms.

Use **Proposal** only when referring to a specific selectable option from the Proposal list, or where the plural “Terms” would be awkward.

### Core Terms structure

Before any battle involving the Diplomat, whether attacking or defending, the Diplomat may offer Terms by choosing one Proposal.

The opponent may accept Terms or refuse Terms.

If they accept Terms:

- Resolve the Proposal’s accepted effect.
- No battle occurs.

If they refuse Terms:

- Resolve the Proposal’s refused effect.
- The battle occurs normally.
- If the Diplomat wins the resulting battle, the Diplomat gains 1 Influence.

### Terms guardrails

Terms should:

- Be defined, not freeform.
- Be leader-agnostic by default.
- Be offerable before any battle involving the Diplomat.
- Include accepted and refused effects.
- Create real incentives for both players.
- Include meaningful concessions by the Diplomat where appropriate.
- Avoid Accord markers or other new markers.
- Avoid lingering memory burdens.
- Avoid refusal effects that restrict what the opponent can or cannot do.

Refusal effects should primarily improve the Diplomat’s side, not lock down the opponent’s side.

Good refusal effects include:

- Diplomat draws a card.
- Diplomat gains Influence.
- Diplomat recovers a card.
- Diplomat gets +1 in the battle.
- Diplomat draws an additional battle card before choosing.
- Diplomat improves their own card selection or position.

Bad refusal effects include:

- Opponent cannot commit cards.
- Opponent’s Assets become inactive.
- Opponent is prohibited from taking normal actions.
- Opponent suffers a lingering restriction.

### Influence

Influence is tracked on the faction sheet.

Influence may be:

- Gained when accepted Terms grant Influence.
- Gained when Terms are refused and the Diplomat wins the resulting battle.
- Gained through Diplomat cards or leader abilities.
- Spent to offer stronger Proposals or use faction abilities.

Influence should not depend entirely on the opponent accepting Terms.

### Current Proposal design direction

The Proposal list is under revision. Current candidates include:

- Orderly Withdrawal.
- Prisoner Exchange.
- Open Channels.
- Safe Conduct.
- Mediation.
- Sanctions or another Asset/economic pressure Proposal.
- Ultimatum.
- Recognition.

Important pending revision:

- The old “Mutual Disarmament” version needs work.
- “Battle card” terminology should be avoided unless explicitly defined.
- Accepted effects that avoid battle cannot refer to battle-drawn cards because battle draw has not happened yet.
- Refusal effects should be on the Diplomat’s side.

### Diplomatic victory

The Diplomatic victory condition is unresolved.

Known constraints:

- No Accord markers.
- Should use existing game state where possible.
- Should not be shut off by the opponent always refusing Terms.
- Should not be merely “worse conquest.”
- Should require both political progress and meaningful board presence.

---

## 9. Inquisition Principles

**Symbol:** Wide-brimmed buckle hat.  
**Mechanic:** Conviction.  
**Victory direction:** Purification.

### Inquisition identity

The Inquisition wins by condemning, suppressing, and purging the opponent’s sources of power.

It should feel severe, procedural, and oppressive without relying on real-world religious symbols.

Avoid real-world religious iconography for Inquisition.

Do not use scales for Inquisition; scales may be reserved for a possible future Legal faction.

### Conviction

The user likes Conviction/Purification as the core direction.

Both Inquisition leaders should be able to spend Conviction to send a card to the Graveyard.

### Witch Hunter direction

Explore an ability where the Witch Hunter may spend Conviction when the opponent loses an attack to:

- End the opponent’s turn immediately.
- Advance toward the opponent.
- Begin another battle right away.
- Allow no actions by either player in between.

This needs careful timing review.

### Design risks

Inquisition should not become only an anti-Magic faction.

It needs a functional game plan against all factions.

---

## 10. Magic / Arcane Principles

**Working name:** Magic is probably too generic. Better names are needed.  
**Possible names:** Arcane, Dark Arts, or something stronger.  
**Symbol:** Pentagram.  
**Victory direction:** Something with “Ritual” in the name.

### Identity

This faction should represent ritual, transformation, Witchcraft, Graveyard interaction, and rule-bending.

It may be a better fit for advanced players, and that is acceptable. Not all factions need to be equally beginner-friendly.

However, factions should still feel equally developed and equally intentional.

### Ritual victory

The Ritual concept has good flavor but may be complex.

Open question:

- Is the Ritual structure too complicated, or is the complexity justified by the faction identity?

The victory name should include “Ritual.”

Possible directions:

- Grand Ritual.
- Final Ritual.
- Completed Ritual.
- Ritual of Ascendance.
- The Great Ritual.
- Rite of Completion.

### Design risks

This faction is currently under-supported by the existing card pool.

It needs consistent templates so that its weirdness feels organized rather than arbitrary.

---

## 11. Financiers Principles

**Symbol:** Coin.  
**Mechanic direction:** Treasury, Capital, Deeds, investment, ownership.

### Identity

Financiers should convert cards and position into long-term economic control.

They should not play a disconnected economy minigame. Their economic engine should still require board presence and territorial pressure.

### Treasury

Treasury needs clearer rules.

Questions to clarify:

- What cards can be placed in Treasury?
- When can cards be placed there?
- Are Treasury cards face-up or face-down?
- Do Treasury cards count by printed deckbuilding cost?
- How is Capital spent?
- What happens to spent Treasury cards?
- Can the opponent interact with Treasury?
- Is Treasury limited by Asset bank, hand size, or a separate cap?
- How do Deeds work without adding extra markers?

### Design risks

Financiers are currently under-supported by existing cards.

The faction needs more cards that interact with Treasury, Capital, Deeds, interest, debt, and purchase timing.

---

## 12. Intelligence Principles

**Symbol:** Eye.  
**Victory name:** Special Operation.

### Identity

Intelligence wins through hidden information, infiltration, sabotage, misdirection, and indirect control.

It should feel clever, elusive, and difficult to pin down, but not annoying or oppressive.

### Special Operation

The Intelligence victory should be called **Special Operation**.

The exact win condition remains under development.

### Design risks

Intelligence is already strongly supported by the existing card pool.

The main risk is creating a faction that causes too much checking, interruption, or hand manipulation.

Hidden information should create meaningful choices, not constant procedural friction.

---

## 13. Naming and Terminology Principles

Good Gauntlet terminology should be:

- Natural to say aloud.
- Clear in rules text.
- Distinct from existing card types and phases.
- Thematic without being too ornate.
- Reusable across cards and rules.

Avoid singular terms that sound awkward, such as “one Term.”

For Diplomats:

- Use “Terms” broadly.
- Use “Proposal” for a specific item from the Proposal list.

For Military:

- Use “Command” for the resource.
- Use “Orders” for leader-specific spend options.

---

## 14. Current Open Questions

### Global

- How much complexity should remain in v0.5.7 default core decks?
- Which advanced cards stay in the master pool but out of starter play?
- How should faction legality be represented in canonical data and deck lists?

### Military

- Is “Military” the final faction name, or should it become Vanguard, Legion, War Council, etc.?
- Are the current Orders balanced?
- Does Fortify capturing immediately create healthy pacing?

### Diplomats

- What is the final Proposal list?
- What is the Diplomatic victory condition?
- How much Influence should the Diplomat be able to store?
- Which Proposals should cost Influence?
- How does the Terms engine avoid slowing the game?

### Inquisition

- What exactly can Conviction be spent on?
- How does Purification work without excessive tracking?
- How does Witch Hunter timing work?

### Magic / Arcane

- What is the faction’s final name?
- What is the Ritual victory condition?
- How are Witchcraft, Graveyard use, and ritual progress templated?

### Financiers

- How exactly does Treasury work?
- How do Deeds work without new markers?
- How can the opponent disrupt economic progress?

### Intelligence

- What is the Special Operation win condition?
- How is infiltration tracked without new markers?
- How much hidden-information manipulation is too much?

---

## 15. Working Summary

Gauntlet should not solve complexity by deleting everything interesting.

Instead:

> Keep the core game clean, and give complex effects a clear home where their complexity becomes thematic and legible.

The core game should prove that the territory duel works.

Factions should prove that Gauntlet can support different methods of winning without collapsing into stalemate or rules overload.
