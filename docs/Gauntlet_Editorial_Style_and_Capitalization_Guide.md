# Gauntlet Editorial Style and Capitalization Guide

**Status:** Active design and development guideline.  
**Purpose:** Keep formal rules terminology precise without making public-facing Gauntlet copy read like rules text.

This guide governs capitalization and terminology across the rulebook, cards, reference materials, website, social metadata, newsletters, onboarding, interfaces, and development documentation. Canonical rules and faction guides remain authoritative for the definitions of game terms.

---

## 1. Governing principle

> **Capitalize defined terms where precision matters. Write naturally where persuasion, onboarding, or accessibility matters.**

Gauntlet's Protected Words are a rules-writing tool, not a universal brand voice. Their purpose is to show players that a word refers to a specific game object, zone, procedure, or state. They should not force every public-facing sentence to sound technical or unnatural.

Before writing or revising copy, identify its audience:

- **Formal rules and technical reference:** prioritize exact terminology and consistent capitalization.
- **Public-facing editorial copy:** prioritize clarity, natural language, and immediate comprehension.
- **Interface labels and headings:** prioritize scanability; title-style capitalization is acceptable.

---

## 2. Formal rules and reference text

Capitalize a defined term when it refers specifically to the corresponding Gauntlet object, zone, procedure, or game state.

Examples include:

- Faction;
- Leader;
- Deck and Playable Deck;
- Draw Pile;
- Hand;
- Discard Pile;
- Graveyard;
- Asset and Asset Bank;
- Overlay;
- Territory;
- Position;
- Occupation and Occupier;
- Counterattack;
- Action Opportunity;
- Faction Ability and Faction Action;
- Gambit;
- Reserve;
- Tactic;
- Aftermath; and
- Last Stand.

The canonical glossary and governing rules determine the complete current set. Do not create a new Protected Word merely by capitalizing an ordinary noun. Not every defined term is capitalized: current lowercase terms include **battle, attacker, defender, retreat, withdrawal,** and **card value**, except when grammar, a heading, or a printed effect label requires capitalization.

Treat equivalent formal terms consistently. In particular, **Faction and Leader receive the same capitalization treatment in formal rules text**; one should not be capitalized while the other is left lowercase without a grammatical reason.

Use lowercase when the word is generic rather than the defined game object:

- **Formal object:** “Choose a Faction and Leader.”
- **Descriptive use:** “The Inquisition faction emphasizes suppression.”
- **Formal zone:** “Put that card in its Discard Pile.”
- **Ordinary verb:** “Discard the remaining cards.”
- **Formal state:** “The attacker enters Occupation.”
- **Descriptive use:** “The illustration depicts an army occupying a fort.”

Capitalization should clarify meaning, not decorate terminology.

---

## 3. Public-facing editorial copy

Use normal sentence capitalization in:

- website and landing-page prose;
- social and link-preview metadata;
- newsletters and release announcements;
- promotional descriptions;
- newcomer onboarding;
- community posts; and
- general player communications.

In these contexts, write **faction, leader, deck, hand, territory, battle, asset,** and similar words in lowercase unless they begin a sentence or are part of a proper name.

Proper names remain capitalized:

- Military;
- the General;
- Contraband;
- the Asset Bank Patch, when referring to that named development change; and
- Last Stand, when explicitly teaching or discussing the named mechanic.

Do not force a formal term into public copy merely to expose the reader to it. Prefer the most natural accurate phrase.

For example:

- Avoid: “Choose a faction and Leader, build your Deck, fight across six Territories, and force your opponent's Last Stand.”
- Prefer: “Choose a faction and leader, build your deck, and battle across a six-card battlefield to break through your opponent's line.”

Use **Last Stand** when the text is actually explaining the mechanic. In high-level marketing copy, phrases such as **final battle**, **break through the opposing line**, or **defeat the opponent at the end of the battlefield** will often communicate the idea more naturally.

Public copy may introduce formal terminology gradually, after the reader understands the underlying concept. It should not require prior knowledge of Protected Words to sound coherent.

---

## 4. Interfaces, labels, and headings

Interface labels, navigation items, buttons, headings, and compact status displays may use title-style capitalization because they function as labels rather than prose.

Acceptable examples:

- Choose Faction
- Select Leader
- Current Deck
- Asset Bank
- Build a Deck
- Territories

Nearby instructions and explanatory sentences should still use natural capitalization:

> Choose a faction and leader, then add cards to your deck.

Do not interpret label capitalization as a requirement to capitalize the same word throughout surrounding website copy.

---

## 5. Card text and mechanically constrained surfaces

Card text should follow formal rules capitalization because small wording differences may affect interpretation. Reminder text should use the same terminology as the rulebook.

Space constraints do not justify inconsistent capitalization or improvised synonyms. When formal wording is too awkward or long for a card, revise the shared template or rules language rather than silently weakening precision on one card.

Flavor text, illustration captions, and accessibility descriptions should use natural prose unless they explicitly explain a mechanic.

---

## 6. Development and implementation practice

When adding or reviewing text:

1. Identify whether the surface is rules, reference, editorial, interface, or flavor copy.
2. Apply the capitalization standard for that surface rather than copying capitalization from another context.
3. Preserve proper names and genuine named mechanics.
4. Rewrite awkward phrases instead of relying on capitalization to signal importance.
5. Keep social metadata consistent with the visible public-facing description.
6. Treat capitalization-only changes to canonical rules as editorial changes that still require source synchronization and regeneration of derived artifacts.

Do not perform blind project-wide search-and-replace operations. The same word may require capitalization in one sentence and lowercase in another depending on whether it refers to a formal game object.

When existing materials conflict with this guide, correct active public-facing and development surfaces as they are touched. Canonical release files should be changed through the normal release-source workflow rather than edited only in derived outputs.
