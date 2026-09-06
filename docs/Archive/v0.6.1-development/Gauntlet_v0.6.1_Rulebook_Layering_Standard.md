# Gauntlet v0.6.1 Rulebook Layering Standard

**Status:** Approved v0.6.1 rulebook authoring requirement  
**Purpose:** Let a new player understand ordinary play quickly while preserving a complete technical reference for edge cases and card interactions.

---

## Core principle

Every major rule section begins with a short, plain-language explanation of how that part of the game normally works. The complete technical rules follow afterward.

A new player should be able to read the opening explanations in sequence and understand the normal flow of the game without first absorbing every exception, timing distinction, or unusual interaction. A player resolving a precise question should be able to continue into the complete rules beneath the same heading without searching another document.

---

## Required section structure

### How it works

Begin each numbered rulebook section—and each major faction-mechanic section—with **How it works**.

This opening explanation should:

- describe the ordinary case in clear, conversational language;
- explain what the player does and why it matters;
- introduce only the terms needed to understand the section;
- state the section's most important practical consequence;
- use short sentences and active voice;
- omit uncommon edge cases, precedence rules, and implementation language; and
- normally fit within one to three short paragraphs.

It should not merely repeat the technical rules in smaller type. It should teach the concept.

### Complete rules

Follow with **Complete rules**.

This portion should:

- define exact timing and eligibility;
- address exceptions, replacements, simultaneous effects, information state, and destination changes;
- use the game's canonical terminology consistently;
- include procedures in numbered order where sequence matters;
- include cross-references only where they prevent duplication or contradiction; and
- serve as the authoritative reference for unusual interactions.

### Examples and reminders

Add examples or reminders only where they materially improve understanding. Examples illustrate the rules but do not create or replace rules.

---

## Relationship between the two layers

The two layers must never contradict one another.

- **How it works** states the normal rule accurately but is intentionally not exhaustive.
- **Complete rules** supplies the qualifications, exceptions, and interaction details.
- When an edge case is not addressed by the opening explanation, consult the Complete rules beneath it.
- When a detail is common enough to change an ordinary player's decision, it belongs in How it works rather than being hidden as an edge case.

The rulebook should not describe the opening layer as “nonbinding,” “unofficial,” or merely a summary. It is part of the rulebook. The Complete rules are simply the more exact layer used when additional precision is required.

---

## Scope

Apply this structure to:

- setup;
- turn structure;
- movement;
- battles;
- the Aftermath of the battle;
- Territory occupation, control, and capture;
- running the Gauntlet and the Last Stand;
- game zones;
- Actions, Assets, and Overlays;
- each faction's core system and additional victory condition; and
- any other section whose rules a player must understand during ordinary play.

Tiny glossary entries, card inventories, component lists, and purely tabular references do not require a separate opening explanation when doing so would add repetition without teaching value.

---

## Presentation

In PDF, DOCX, and browser versions:

- visually distinguish **How it works** from **Complete rules** without making either look optional;
- keep both layers under the same section heading and anchor;
- place the opening explanation first on the page whenever practical;
- make technical subsections easy to scan by timing, procedure, or named interaction; and
- preserve identical terminology across both layers, player aids, cards, and the Rules Arbiter.

The browser rulebook may allow the Complete rules to collapse visually, but they must remain immediately available and fully searchable.

---

## Example: Gambits and Tactics

### How it works

At the start of a battle, each player may set one card from their Hand as a **Gambit**. Gambits are costly because they go to the Graveyard after the battle.

Each player then sets their Hand aside and draws three temporary cards to form a **Reserve**. After Gambits are revealed, each player may choose one card from their Reserve as a **Tactic**. Tactics and the cards left in Reserve normally go to the Discard Pile after the battle.

### Complete rules

The Complete rules would then provide the attacker/defender choice order, face-down state, pass procedure, modified limits, reveal timing, replacement rules, multiple Tactics, additional Tactics, normal destinations, and interaction with Surveillance, Interference, and other effects.

---

## Validation standard

During first-game testing, ask whether players could:

1. explain the normal turn and battle sequence after reading only the How it works passages;
2. locate the precise rule when an unusual interaction occurred;
3. distinguish the teaching explanation from the edge-case detail without perceiving a contradiction; and
4. resume play quickly after consulting the Complete rules.

The v0.6.1 rulebook is not ready for publication until both the teaching layer and technical layer have been reviewed for consistency.
