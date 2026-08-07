# Gauntlet v0.6.3 Card-Language Normalization

**Status:** Active first-pass implementation for the v0.6.3 card-text review  
**Release tracker:** [Issue #528](https://github.com/tymonius/Gauntlet/issues/528)  
**Card review:** [Issue #405](https://github.com/tymonius/Gauntlet/issues/405)  
**Deck terminology:** [Issue #539](https://github.com/tymonius/Gauntlet/issues/539)

## Purpose

Apply the already-approved shared wording conventions across the complete 128-card v0.6.2 card pool **before** deciding which cards need bespoke compression.

The output of this pass is a v0.6.3 development candidate and a density report. It is not yet the final v0.6.3 card pool and does not modify the immutable published v0.6.2 package.

## Terminology

For v0.6.3:

- **Deck** means the constructed set of ordinary cards selected under Deck-construction rules.
- **Draw Pile** means the shuffled in-play pile formed from the Deck during setup.
- The former broader use of `deck` for a player's Deck plus Leader, Territories, faction supplements, and other components is retired. Those objects may be described collectively as **components** or **game materials** when necessary; no single formal umbrella term is required.

## First-pass method

The first pass is intentionally conservative. It applies only shared conventions whose semantic effect can be established from the wording itself, including:

- `Playable Deck` → `Deck`;
- `During the Aftermath of the battle` / `During the Aftermath of a battle` → `In the Aftermath`;
- long self-banking boilerplate → `Bank this card`;
- `whose effect has not yet been applied` → `that has not taken effect`;
- `one additional Tactic` → `an additional Tactic`;
- removal of a redundant `from your Reserve` in the standard additional-Tactic template;
- concise face-up replacement wording;
- the approved direct copied-effect template where the complete matching construction is present; and
- `can be applied now` → `can apply now`.

The normalizer also changes the candidate Deck-construction key from `minimum_playable_cards` to `minimum_cards`.

## What is deliberately not automated

Several approved conventions still require card-level judgment and are therefore **flagged rather than rewritten blindly**:

- `If you do` cost/effect structures;
- `destination` / `normal destination` language where the actual zone must be determined from the card's role and timing;
- remaining `as though you played it` constructions that do not match the safe copied-effect template;
- long additional-Tactic eligibility clauses;
- replacement clauses that restate role/timing rules in unusual forms;
- residual Asset Bank setup boilerplate;
- self-reference by printed card title; and
- `Use` labels that may need to become either `Asset` or `Activate` depending on whether the banked effect is automatic or optional.

These flags are review prompts, not validation failures.

## Density sequence

The v0.6.3 review proceeds in this order:

1. apply the safe shared conventions across all 128 cards;
2. measure the resulting convention-normalized pool;
3. rank cards by remaining word count, character count, and rendered burden;
4. resolve residual convention flags card by card;
5. perform bespoke compression on cards that remain too dense or awkward;
6. record explicit mechanics changes separately from wording-only edits; and
7. propagate the final approved text through canonical data, card rendering, references, Deckbuilder, Rules Arbiter, digital implementation, print/export surfaces, tests, and governance records.

This order prevents old boilerplate from distorting the density ranking.

## Approved mechanics-sensitive revisions already in scope

### Margin Loan

Carry forward the approved compact wording recorded in #405, including the same-phase additional-Action permission established in [PR #511](https://github.com/tymonius/Gauntlet/pull/511). Revalidate the exact final text after the shared convention pass.

### Protracted Siege

Carry forward the approved #405 revision in which:

- the banked Asset directly prevents a capture from the Asset Bank;
- only the Battle mode creates the delayed Overlay;
- the banked effect uses `Asset`, not `Use`; and
- shared capture rules replace repeated Front Line explanation.

This is a **mechanics change**, not merely a wording reduction, and must receive separate implementation tests and release-note treatment.

## Generated outputs

Running:

```text
node scripts/build-v063-card-normalization.mjs
```

produces:

- `artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Language_Candidate.json`
- `artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Language_Density.md`

The density report includes:

- aggregate before/after word and character counts;
- the number of cards affected by each convention;
- the 30 densest cards after normalization;
- all residual convention-review flags; and
- a complete 128-card before/after measurement table.

## Acceptance for this stage

This first stage is complete when:

- all 128 cards are processed from the published v0.6.2 canonical source;
- pool counts remain 50 Neutral plus 13 per faction;
- the v0.6.2 release files remain unchanged;
- only semantics-safe shared transforms are automated;
- ambiguous convention opportunities are surfaced as flags instead of guessed at;
- the generated density report becomes the basis for the next card-by-card review; and
- `Deck` / `Draw Pile` terminology is used in the v0.6.3 candidate output.
