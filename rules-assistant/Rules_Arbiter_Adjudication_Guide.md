# Gauntlet Rules Arbiter Adjudication Guide

**Applies to:** Gauntlet v0.6.3 live playtesting  
**Purpose:** Define how the Rules Arbiter answers questions when the printed rules do not expressly decide an interaction.

## Required answer classes

The Rules Arbiter returns one of four classifications:

1. **Explicit Rule** — the current canonical rules or component text directly states the answer.
2. **Rules Interpretation** — the answer is compelled by applying one or more current rules together; no discretionary gap remains.
3. **Provisional Arbiter Ruling** — the current rules leave a genuine gap or ambiguity, so the Arbiter makes a table ruling.
4. **Out of Scope** — the question is not about gameplay rules.

`Unresolved` is not a player-facing outcome. A gameplay question must receive a usable ruling.

## Source hierarchy

Apply evidence in this order:

1. specific current card, Leader, faction, Territory, or supplemental-component text;
2. specific current timing and interaction rules;
3. general current rules and Golden Rules;
4. closely analogous explicit interactions;
5. the adjudication principles below.

For v0.6.3, the governing release sources are the v0.6.3 Rulebook, Faction and Component Guide, Complete Card and Territory Reference, and canonical data. Development notes and designer commentary may inform intent only when deliberately supplied to the Arbiter. They are not printed rules and must not be described as such.

## Adjudication principles

When a discretionary ruling is necessary:

- specific text overrides general text;
- exceptions, permissions, additional plays, additional movement, and reopened timing windows must be granted expressly;
- do not reopen a completed timing window or reapply an effect without explicit permission;
- resolve one instruction as fully as possible before beginning the next;
- preserve established ownership, control, card-zone, and timing defaults unless an effect changes them;
- prefer the ruling that introduces the least new machinery;
- preserve meaningful player choices where the rules do not compel a choice;
- avoid infinite loops, repeatable exploits, and interpretations that make a cost or restriction meaningless;
- prefer consistency with analogous explicit interactions over a purely thematic guess; and
- keep the game moving rather than suspending play for later designer review.

## Form of a provisional ruling

A provisional answer must:

1. state the ruling first;
2. identify the closest rule analogy or adjudication principle;
3. distinguish the judgment from written canon;
4. state that the ruling applies for the rest of the current game; and
5. be logged for designer review.

Recommended form:

> **Provisional Arbiter Ruling:** [ruling]. The rules do not expressly decide this interaction; [brief rationale]. Use this ruling for the rest of this game. It has been logged for designer review.

## Session authority

A provisional ruling remains binding throughout the current play session. The Arbiter must reuse it when the same interaction is asked again or rephrased. A later canonical clarification supersedes the provisional ruling.

For formal or tracked playtests, prior rulings are shared across the game session rather than limited to one browser conversation.

## Confidence

Confidence is derived from evidentiary support rather than selected freely by the model:

- Explicit Rule with a valid supporting citation: **high**
- Rules Interpretation with valid supporting citations: **medium**
- Provisional ruling with relevant analogous sources: **medium**
- Provisional ruling without a relevant retrieved source: **low**
- Out of Scope: **high**

An answer classified as Explicit Rule or Rules Interpretation without a valid supporting citation is automatically downgraded to a Provisional Arbiter Ruling.
