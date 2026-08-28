# Gauntlet Rules Language and Editorial Standard

**Status:** Active internal governing standard  
**Applies to:** Rulebooks, faction guides, cards, reference sheets, browser tools, and Rules Arbiter source text  
**Player-facing:** No

This document preserves the terminology and writing guidance formerly published as Chapter 15 of the v0.6.1 rulebook. It governs authors and implementers; it is not itself a rule players must learn or follow.

## Standard verbs

Use these verbs consistently:

- **set** a Gambit;
- **choose** a Tactic;
- **play** a card for a printed effect;
- **activate** an Asset;
- **use** an Order, Surveillance, Interference, Leverage, Subsidize, or another named faction ability; and
- **resolve** an effect.

Avoid generic phrases such as “use a Gambit,” “use a Tactic,” or “use an Asset.”

## Capitalization and formal terms

Capitalize the names of game zones and formal procedures when referring to them as game terms: Hand, Reserve, Draw Pile, Discard Pile, Graveyard, Asset Bank, Gambit, Tactic, Aftermath, Territory, Action, and Action Opportunity.

Use **the Aftermath of the battle**, not “the battle's Aftermath.”

## Authority and placement

- This standard controls terminology and drafting consistency, not gameplay.
- Player-facing rules must state the actual procedure or effect rather than instruct players how writers should phrase it.
- When a rule requires a defined term, include that term in the governing rulebook or faction guide; do not rely on this internal document to supply player-facing meaning.
- Automated terminology checks may use this document as a source of approved and forbidden phrases.

## Authority-derived facts and stale-information control

Rules prose is not the primary home for facts that already exist in structured authority. Counts, thresholds, caps, pool sizes, selected-component counts, and similar values must be treated as **derived facts**.

### Drafting rule

Before writing a literal value, ask whether the value already exists or can be derived from `game-data/current-game.json`.

- If the exact value is not necessary for a player to understand or execute the rule, omit it.
- If the exact value is necessary, derive it from structured authority rather than maintaining an independent prose copy.
- In the maintained current Rulebook, a repeated volatile value must use a `RULE-FACT` marker so CI can trace and synchronize it.
- Do not introduce a second untracked summary field merely to make prose generation easier.
- Stable conceptual prose may remain ordinary prose; structured values should not be duplicated merely for convenience.

The marker identifies the immediately preceding displayed token:

```md
Ratify six<!-- RULE-FACT:diplomats.peace_treaty_threshold:word --> different Proposals.
| Faction pool | 15<!-- RULE-FACT:cards.military.count:number --> Military card titles. |
```

The comment is invisible to players while keeping the source readable. Registered facts are defined in `rulebook/player-facing/rule-facts.js`.

Use:

- `npm run rules:facts:check` to verify the maintained Rulebook against current structured authority; and
- `npm run rules:facts:sync` to rewrite tracked literals from authority after an approved rules/data change.

CI runs the check on every pull request, including changes that would otherwise be documentation-only.

### Changing a rule or data fact

For an approved change, update in this order:

1. change the governing structured authority;
2. run the Rulebook fact synchronizer;
3. update semantic prose only where the meaning or procedure changed;
4. update other executable/player-facing surfaces that cannot derive the fact directly;
5. run consistency tests; and
6. rematerialize any maintained published release whose player-facing package is being corrected.

A change is not complete merely because the first visible occurrence has been fixed.

### Replacing stale information

Do not repair stale rules by globally searching for an old number or phrase and replacing it from memory. That practice can miss paraphrases, alter historical material, or replace a value that is still correct in another version.

Instead:

- identify the governing structured fact or semantic rule;
- derive the expected value from that authority;
- restrict repair to active/current surfaces or an explicitly maintained release;
- leave historical releases and archived discussion unchanged unless an explicit erratum policy says otherwise;
- use a registered fact synchronizer for data-derived values;
- use a narrowly scoped semantic migration for terminology or rule meaning; and
- add or expand a regression contract whenever a stale value reached a player-facing surface.

Maintained release materialization must derive canonical summaries from underlying records rather than copy previously summarized metadata.

### Names, versions, and process documentation

Active process and design documents should not hard-code a release number when they mean “the current release” or “current development.” Refer instead to `config/release-lifecycle.json`, `game-data/current-game.json`, or the maintained current Rulebook as appropriate.

Hard-coded versions are appropriate in release notes, migration records, archives, and other intentionally historical documents.

### When a new fact must be registered

Add a value to the fact registry before merging when it:

- is already represented structurally;
- is likely to change during development;
- appears in more than one active surface;
- affects legality, victory, setup, component selection, or deck construction; or
- would be costly to rediscover manually if it changed.

The goal is not to template every sentence. The goal is to make volatile facts single-source, traceable, and mechanically checkable.

