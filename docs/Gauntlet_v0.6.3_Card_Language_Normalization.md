# Gauntlet v0.6.3 Card-Language Normalization

**Status:** Complete shared-convention review awaiting bespoke density pass  
**Release tracker:** [Issue #528](https://github.com/tymonius/Gauntlet/issues/528)  
**Card review:** [Issue #405](https://github.com/tymonius/Gauntlet/issues/405)  
**Deck terminology:** [Issue #539](https://github.com/tymonius/Gauntlet/issues/539)

## Purpose

Apply the approved shared wording conventions across the complete 128-card v0.6.2 card pool **before** deciding which cards need bespoke compression.

The output of this stage is a convention-normalized v0.6.3 development candidate and a density report. It is not yet the final v0.6.3 card pool and does not modify the immutable published v0.6.2 package.

## Terminology

For v0.6.3:

- **Deck** means the constructed set of ordinary cards selected under Deck-construction rules.
- **Draw Pile** means the shuffled in-play pile formed from the Deck during setup.
- The former broader use of `deck` for a player's Deck plus Leader, Territories, faction supplements, and other components is retired. Those objects may be described collectively as **components** or **game materials** when necessary; no single formal umbrella term is required.

## Review method

The normalization stage has two layers.

### 1. Conservative automatic pass

The first pass applies only shared conventions whose semantic effect can be established from the wording itself, including:

- `Playable Deck` → `Deck`;
- `During the Aftermath of the battle` / `During the Aftermath of a battle` → `In the Aftermath`;
- long self-banking boilerplate → `Bank this card`;
- `whose effect has not yet been applied` → `that has not taken effect`;
- `one additional Tactic` → `an additional Tactic`;
- standard additional-Tactic and replacement phrasing;
- the approved direct copied-effect template where the complete matching construction is present; and
- `can be applied now` → `can apply now`.

The normalizer also changes the candidate Deck-construction key from `minimum_playable_cards` to `minimum_cards`.

### 2. Complete card-level convention review

Every residual convention opportunity is then reviewed card by card. Exact reviewed overrides are stored by allegiance under `docs/v063-card-language-overrides/`.

The review covers:

- `If you do` cost/effect structures;
- direct zone movement instead of destination terminology;
- remaining copied-effect boilerplate;
- additional-Tactic eligibility clauses;
- replacement clauses;
- Asset Bank setup boilerplate;
- self-reference by printed card title;
- `Use` labels, which become `Activate` for optional banked abilities or `Asset` where the banked effect is automatic; and
- the other repeated-language conventions approved in #405.

A convention is not applied when it would erase a real rule distinction. Those cases are recorded in `docs/v063-card-language-overrides/review.json` with the reason the residual wording is retained.

## Intentional residuals

Ten cards retain a flagged convention pattern for a specific rules reason:

- Compound Interest — title matching across copies;
- Détente — title matching across copies;
- Extraordinary Rendition — one-banked-copy title restriction;
- Hold the Line — delayed consequence requires the `If you do` gate;
- Landslide — one-per-Territory title matching;
- Margin Loan — later collateral resolution depends on whether the Battle cost was paid;
- Martyrdom — optional play from Hand gates later Aftermath consequences;
- Necromancy — explicit title exclusion across copies;
- Resourcefulness — one-banked-copy title restriction; and
- Tariffs — copy restrictions.

The finalizer fails if any other reviewed convention residual appears.

## Density sequence

The v0.6.3 review proceeds in this order:

1. apply the safe automatic conventions across all 128 cards;
2. apply and validate the complete card-level convention review;
3. measure the resulting convention-normalized pool;
4. rank cards by remaining word count, character count, and rendered burden;
5. perform bespoke compression on cards that remain too dense or awkward;
6. record explicit mechanics changes separately from wording-only edits; and
7. propagate the final approved text through canonical data, card rendering, references, Deckbuilder, Rules Arbiter, digital implementation, print/export surfaces, tests, and governance records.

This order prevents obsolete boilerplate from distorting the density ranking.

## Approved mechanics-sensitive revisions already in scope

### Margin Loan

The reviewed override carries forward the approved compact wording recorded in #405, including the same-phase additional-Action permission established in [PR #511](https://github.com/tymonius/Gauntlet/pull/511).

### Protracted Siege

The reviewed override carries forward the approved #405 revision in which:

- the banked Asset directly prevents a capture from the Asset Bank;
- only the Battle mode creates the delayed Overlay;
- the banked effect uses `Asset`, not `Use`; and
- shared capture rules replace repeated Front Line explanation.

This is a **mechanics change**, not merely a wording reduction, and must receive separate implementation tests and release-note treatment.

## Generated outputs

The workflow runs both:

```text
node scripts/build-v063-card-normalization.mjs
node scripts/finalize-v063-card-conventions.mjs
```

The first command produces the conservative candidate and diagnostic report. The second applies the reviewed allegiance overrides and produces the authoritative outputs for the next review stage:

- `artifacts/v0.6.3/Gauntlet_v0.6.3_Convention_Normalized_Candidate.json`
- `artifacts/v0.6.3/Gauntlet_v0.6.3_Convention_Normalized_Density.md`

The final report includes:

- aggregate v0.6.2 → convention-normalized word and character counts;
- the 30 densest cards after complete convention normalization;
- the accepted intentional residuals and reasons; and
- a complete 128-card review table.

## Acceptance for this stage

This stage is complete when:

- all 128 cards have an explicit review result;
- pool counts remain 50 Neutral plus 13 per faction;
- the v0.6.2 release files remain unchanged;
- no unapproved convention residual remains;
- all intentionally retained residuals have an explicit rules reason;
- the final convention-normalized density report becomes the basis for bespoke compression; and
- `Deck` / `Draw Pile` terminology is used in the v0.6.3 candidate output.
