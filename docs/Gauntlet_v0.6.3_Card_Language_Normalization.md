# Gauntlet v0.6.3 Card-Language Normalization

**Status:** Shared normalization complete through compact shorthand; bespoke density pass follows  
**Release tracker:** [Issue #528](https://github.com/tymonius/Gauntlet/issues/528)  
**Card review:** [Issue #405](https://github.com/tymonius/Gauntlet/issues/405)  
**Deck terminology:** [Issue #539](https://github.com/tymonius/Gauntlet/issues/539)

## Purpose

Normalize the complete 128-card published v0.6.2 pool before bespoke card compression so the density ranking reflects actual card-specific burden rather than repeated rules prose.

The generated v0.6.3 candidates are development artifacts only. The immutable published v0.6.2 package is read as the baseline and is never modified.

## Terminology

For v0.6.3:

- **Deck** means the constructed set of ordinary cards selected under Deck-construction rules.
- **Draw Pile** means the shuffled in-play pile formed from the Deck during setup.
- The former broader use of `deck` for a player's Deck plus Leader, Territories, faction supplements, and other components is retired without a replacement formal umbrella term.

## Five-stage normalization build

### 1. Conservative automatic conventions

`scripts/build-v063-card-normalization.mjs` applies only semantics-safe global transforms, including Deck terminology, Aftermath phrasing, self-banking boilerplate, copied-effect phrasing, replacement phrasing, and other approved templates.

### 2. Complete card-level convention review

`scripts/finalize-v063-card-conventions.mjs` applies reviewed card-specific overrides from `docs/v063-card-language-overrides/`.

Every card receives an explicit review result. Ten intentionally retained convention residuals are recorded in `review.json` with their rules reasons. The finalizer fails if an unapproved residual appears.

This stage reduces the published pool from **8,108 to 7,840 words** and **47,085 to 45,283 characters**.

### 3. General-rule centralization

`scripts/apply-v063-general-card-rules.mjs` removes procedures now governed once in the shared rules:

- inherent Bank Actions;
- directly permitted card procedures not spending another Action;
- effect-granted movement and new movement sequences;
- additional-Tactic eligibility, face state, timing, destination, and default Reserve source;
- Sanction association/default expiration; and
- reveal-stage interference priority.

### 4. Reserve/Tactic numeric shorthand

`scripts/apply-v063-numeric-shorthand.mjs` introduces the first signed modifiers:

- `+N Reserve` / `−N Reserve`;
- `+N Tactic`;
- Reserve as the default Tactic source, with another source printed only when it overrides or narrows the default.

### 5. Compact shorthand and final shared-rule cleanup

`scripts/apply-v063-compact-shorthand.mjs` applies the adopted broader shorthand only where timing, subject, source, optionality, and eligible set remain exact:

- `+N Card(s)`;
- `+N Action`;
- positive fixed resource gains such as `+2 Capital`;
- `+N Battle Total`;
- `Retreat +N`;
- `Advantage`, `Double Advantage`, and `Disadvantage`;
- set-value notation such as `Command = 2`;
- `Advance Front Line N`;
- concise condition prefixes such as `Attacker —`, `Defender —`, `Counterattack —`, `Win —`, and `Lose —`; and
- the shared rule that a reroll uses the new result unless expressly stated otherwise.

This stage also repairs and validates the malformed intermediate **Sanctions: Blockade** phrases produced by the earlier Sanctions reducer, preventing them from reaching the final candidate.

The complete shorthand semantics are governed by `docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md`.

## Intentional residuals and limits

Shorthand is not applied blindly.

Examples of information that remains explicit when necessary include:

- optional compound procedures where a bare numeric modifier would obscure optionality;
- nondefault Tactic sources;
- costs, payments, resource losses, and reductions;
- unusual card destinations;
- bespoke movement ordering and battle restrictions;
- title-matching rules across copies;
- delayed consequences whose later resolution depends on an earlier choice; and
- card-specific `if able`, timing, source, target, or replacement conditions.

For example, **Rousing Speech** retains `you may draw one card, then discard one card` because the optional compound procedure is clearer than forcing `+1 Card` into that sentence. **Shock and Awe** retains the explicit Breakthrough retreat sequence because its ordering and legality condition are card-specific.

## Density sequence

The v0.6.3 card review therefore proceeds in this order:

1. safe automatic conventions;
2. complete card-level convention review;
3. general-rule centralization;
4. Reserve/Tactic shorthand;
5. broader compact shorthand and reroll cleanup;
6. recalculate the complete 128-card density ranking;
7. perform bespoke compression beginning with the remaining densest cards;
8. review the rest of the pool for smaller card-specific improvements;
9. distinguish actual mechanics changes from wording/shared-rule changes;
10. propagate final approved text through canonical data, references, Deckbuilder, rendered cards, browser surfaces, Rules Arbiter, digital implementation, print/export surfaces, starter materials, tests, and governance; and
11. render every changed card at production size and audit fit.

## Approved mechanics-sensitive revisions already in scope

### Margin Loan

Carry forward the approved compact rewrite recorded in #405, including the same-phase additional-Action permission established in [PR #511](https://github.com/tymonius/Gauntlet/pull/511).

### Protracted Siege

Carry forward the approved #405 mechanics revision in which:

- the banked Asset directly prevents a capture from the Asset Bank;
- only the Battle mode creates the delayed Overlay;
- the banked effect uses `Asset`, not `Use`; and
- shared capture rules replace repeated Front Line explanation.

This remains an explicit mechanics change and must receive separate implementation tests and release-note treatment.

## Generated outputs

The workflow runs:

```text
node scripts/build-v063-card-normalization.mjs
node scripts/finalize-v063-card-conventions.mjs
node scripts/apply-v063-general-card-rules.mjs
node scripts/apply-v063-numeric-shorthand.mjs
node scripts/apply-v063-compact-shorthand.mjs
```

The authoritative pre-bespoke outputs are:

- `artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Normalized_Candidate.json`
- `artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Density.md`

Earlier-stage candidates and reports remain in the artifact for auditability.

## Acceptance before bespoke editing

This normalization phase is ready for bespoke editing when:

- all 128 cards have an explicit convention review result;
- pool counts remain 50 Neutral plus 13 per faction;
- the v0.6.2 release files remain unchanged;
- no unapproved convention residual remains;
- no malformed Sanctions text reaches the final candidate;
- all adopted shorthand has been applied only where semantically exact;
- `Deck` / `Draw Pile` terminology is used in the final v0.6.3 candidate;
- all normalization, Test, and Governance Integrity workflows pass; and
- the compact-shorthand density report becomes the basis for bespoke card compression.
