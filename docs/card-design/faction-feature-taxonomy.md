# Gauntlet component terminology — Faction Features and Leader Abilities

This document defines the production-card information hierarchy for faction and Leader mechanics. It is a component-language standard, not a change to gameplay behavior.

## Faction Feature

**Faction Feature** is the umbrella term for a named faction-specific rule, option, procedure, passive effect, or special mechanic shared by the faction.

The term does not imply that the feature uses an Action. Every feature states the properties that matter in play, such as:

- Action use: `1 Action`, `No Action`, or `Automatic`;
- legal phase or timing;
- resource cost;
- frequency or other limits.

Flavor/mechanical terms such as **Terms**, **Order**, **Purge**, **Mission**, **Rite**, and **Surveillance** remain useful names or subtypes. They are not competing top-level rules categories.

Faction Reference cards are the primary table surface for listing and explaining Faction Features.

## Leader Ability

A mechanic supplied specifically by the chosen Leader is classified as a **LEADER ABILITY** on that Leader card.

`Leader Ability` does not imply whether the ability uses an Action. Timing, Action use, resource cost, and frequency are stated directly with the ability.

Military uses the named ability **ORDERS**, followed by the Leader's individual Orders and their Command costs/timings.

## Leader card hierarchy

Leader cards retain the faction's headline information instead of becoming ability-only cards.

Keep sections in this order:

1. faction victory;
2. Leader ability;
3. resource, when applicable;
4. progression, when applicable.

Do not print an empty Resource or Progression section merely to preserve symmetry.

### Left column

The **named game concept is the primary heading**. Its generic rules classification is subordinate beneath it.

Examples:

- `RUN THE GAUNTLET` / *Faction Victory*
- `ORDERS` / *Leader Ability*
- `COMMAND` / *Resource*
- `OPERATION PROGRESS` / *Progression*

The slash above is layout shorthand for a line break, not a printed character.

The left label track is **content-aware and deliberately compact**. Long concept names wrap naturally instead of reserving a wide fixed column that steals space from rules text. Rows on the same card remain aligned to one shared label track.

Use whitespace, not horizontal divider rules, to separate Leader-card sections and grouped abilities. The named headings, classifications, typography, and spacing provide the hierarchy; extra rules add visual clutter.

### Right column

Do not repeat the left-column name for an ordinary single Leader Ability, victory condition, Resource, or Progression entry.

Use this hierarchy instead:

- optional resource cost in **bold Caslon**;
- timing / Action / frequency descriptor in *italic Caslon*;
- plain rules text on the following line.

For example, **CORDIALITY** appears only in the left column. Its right column begins with *No Action · Once per turn · After accepted Terms*, followed by the rules text on the next line.

A bold/accent right-column subheading is reserved for a distinct resource-costed subfeature beneath a broader named mechanic. Military Orders are the canonical example:

`Onward — 1 Command — No Action · During Movement`

- `Onward` is the accent Inter subheading;
- `1 Command` is bold black Caslon;
- `No Action · During Movement` is italic black Caslon;
- the Order's rules text follows on the next line.

Single Leader Abilities that themselves cost a faction Resource, such as **Fieldcraft** or **Relentless Pursuit**, do not repeat their names in the right column; only the Resource cost is bold before the italic descriptor.

## Resource and progression distinction

A spendable quantity such as **Command**, **Influence**, **Capital**, **Intel**, or **Conviction** is a Resource.

**Operation Progress is not a Resource.** It is printed under **PROGRESSION** and described as:

`OPERATION PROGRESS` / *Progression*

*Begin at 0*

`Increment by 1 each time you complete a normal Mission.`

Mystics likewise use **PROGRESSION** for Rite advancement rather than printing a fictitious Resource heading.

## Reference-card hierarchy

Faction References provide the fuller operating instructions for shared faction systems.

Where useful, include a compact **FACTION FEATURES** inventory that identifies each shared feature and its Action/timing profile before the detailed procedure or lookup text.

Leader-specific rules remain on the Leader card. A shared Reference may mention a Leader-specific feature only when necessary to make a faction-wide procedure or lookup complete.
