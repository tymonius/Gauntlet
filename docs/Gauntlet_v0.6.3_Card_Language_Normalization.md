# Gauntlet v0.6.3 Card-Language Normalization

**Status:** Shared normalization complete through the exhaustive pool-wide refinement/integrity pass; bespoke density review continues  
**Release tracker:** [Issue #528](https://github.com/tymonius/Gauntlet/issues/528)  
**Card review:** [Issue #405](https://github.com/tymonius/Gauntlet/issues/405)  
**Deck terminology:** [Issue #539](https://github.com/tymonius/Gauntlet/issues/539)

## Purpose

Normalize the complete 128-card published v0.6.2 pool before and during bespoke compression so accepted terminology, shared procedures, and finalized card text are actually propagated to every generated v0.6.3 card rather than living only in discussion history.

The generated v0.6.3 candidates are development artifacts only. The immutable published v0.6.2 package is read as the baseline and is never modified.

## Terminology

For v0.6.3:

- **Deck** means the constructed set of ordinary cards selected under Deck-construction rules.
- **Draw Pile** means the shuffled in-play pile formed from the Deck during setup.
- **Advantage** and **Disadvantage** are capitalized defined game terms. Card-facing instructions use `gain Advantage`, `gain double Advantage`, and `gain Disadvantage`; `double` remains a normal modifier rather than a separate keyword.
- **Remove / Removed** is a defined Asset event: an Asset is Removed when a rule or effect forces it to leave play. The underlying instruction determines its destination. Asset loss caused by a decreased Asset limit counts as Removal; voluntary Asset use/discard and normal self-expiration do not.
- Natural destination verbs remain preferred when they are clearer than explicitly saying `Remove`. A card may therefore `discard 1 Asset` while the shared rules classify that forced loss as Removal.
- **Asset** is the sole banked-card effect heading. The former `Activate` heading is retired; optional, triggered, continuous, and Action-timed banked abilities all appear under Asset.
- When Asset ownership is already clear, use `your Assets`, `opposing Assets`, or `their Assets` rather than `Asset(s) you control` / `Asset(s) they control` boilerplate.
- A card effect usable when the card is committed as either a Gambit or a Tactic has the canonical label **`Gambit/Tactic`**. On the card face, render that label as `Gambit/` on the first line and `Tactic` on the second so the heading column remains narrow.
- **`Gambit/Tactic` is not a prose effect category.** In sentences, say `Gambit effect`, `Tactic effect`, or `Gambit or Tactic effect` according to the actual scope.
- In standard 1v1 v0.6.3, card text does not repeat `in a battle involving you`; every battle necessarily involves both players.
- **Bind** is the attachment verb for one card being held by another. Shared rules govern default bound-card cleanup and adjustment when a bound-card limit decreases.
- Applying or repeating another effect uses one shared procedure for timing legality, control, choices, costs, source-card state, trigger identity, and recursion.
- Ending a battle **without a winner** uses one shared procedure for result status, unresolved effects, cleanup, and remaining positional consequences.
- On a physical Overlay card, prefer `place this Overlay` rather than `place this card as an Overlay`.
- Compact instruction tokens such as `+1 Action`, `−1 Reserve`, `+1 Tactic`, `+2 Cards`, `Retreat +1`, `Advance Front Line 1`, and `Command = 2` are rendered **bold as complete instruction tokens** on card faces. The emphasis is presentation, not part of canonical text.
- The former broader use of `deck` for a player's Deck plus Leader, Territories, faction supplements, and other components is retired without a replacement formal umbrella term.

## Eight-stage normalization build

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
- natural `gain Advantage`, `gain double Advantage`, and `gain Disadvantage` wording with instance-based stacking;
- set-value notation such as `Command = 2`;
- `Advance Front Line N`;
- concise condition prefixes such as `Attacker —`, `Defender —`, `Counterattack —`, `Win —`, and `Lose —`; and
- the shared rule that a reroll uses the new result unless expressly stated otherwise.

On rendered card faces, each complete compact instruction token is bolded. Source qualifiers and surrounding prose remain normal weight unless independently emphasized.

This stage also repairs and validates malformed intermediate Sanctions phrases so they cannot reach the final candidate.

### 6. Asset ownership and Removal language

`scripts/apply-v063-asset-language.mjs` applies the shared Asset-language pass.

It:

- introduces card-facing **Removed** triggers only where another effect cares that involuntary Asset loss occurred;
- keeps natural verbs such as `discard` and `put ... in the Graveyard` when those instructions are clearer than the keyword;
- classifies forced Asset loss from a reduced Asset limit as Removal;
- excludes voluntary Asset use/discard and normal self-expiration from Removal;
- removes redundant `Asset(s) you control` / `Asset(s) they control` wording where ownership is already established; and
- validates that obsolete forced-leave-play language and redundant Asset-control boilerplate do not survive in the final candidate.

### 7. Gambit/Tactic effect headings

`scripts/apply-v063-gambit-tactic-headings.mjs` performs the role-label migration.

It:

- replaces all **106** remaining `Battle` effect headings with the canonical `Gambit/Tactic` label;
- revises prose references to `Battle effect` card by card rather than replacing them blindly;
- uses `Tactic effect` where only Tactic eligibility or timing matters;
- uses `Gambit or Tactic effect` where either role genuinely applies;
- removes the legacy `battle` field from the generated candidate and supplies `gambit_tactic` instead; and
- fails if a `Battle` effect heading, `Battle effect` prose reference, or prose phrase `Gambit/Tactic effect` survives.

The slash label is deliberately limited to canonical data and compact card-face typography. Rules prose continues to use ordinary grammatical role names.

### 8. Exhaustive pool-wide refinement and finalized-text integrity

`scripts/apply-v063-poolwide-card-refinements.mjs` is the final normalization gate before bespoke review continues.

Unlike the earlier incremental passes, this stage is deliberately exhaustive. It rechecks the complete generated 128-card pool against every accepted convention that can be mechanically validated and fails when a known obsolete pattern survives.

It currently:

- converts all **34** surviving `Activate` headings to `Asset`, merging the two cards that previously had both headings;
- removes all **9** redundant `in a battle involving you` phrases;
- normalizes all **14** legacy physical-Overlay placement phrases to `place this Overlay` wording;
- finishes the adopted `Attacker —` / `Counterattack —` condition-prefix typography;
- centralizes copied/repeated-effect procedure and removes redundant card-specific copied-effect notes;
- centralizes battles ending without a winner and removes redundant cleanup/result notes;
- removes Rules Notes already supplied by shared replacement, movement, banking, numeric-modifier, and destination rules;
- removes stale terminology and a stray publication footer found during the full-pool audit;
- mirrors the **13 currently finalized bespoke cards** from the single canonical #405 finalized-text tracker as the last text-changing operation; and
- verifies those 13 entries exactly so no earlier normalization stage can overwrite accepted bespoke wording.

The editorial authority for finalized bespoke card text remains the single tracker comment:

- [#405 comment 5221286097](https://github.com/tymonius/Gauntlet/issues/405#issuecomment-5221286097)

The build-stage mirror exists only to propagate those accepted texts into generated artifacts and to detect drift.

## Intentional residuals and limits

Shorthand and defined terminology are not applied blindly.

Examples of information that remains explicit when necessary include:

- optional compound procedures where a bare numeric modifier would obscure optionality;
- nondefault Tactic sources;
- costs, payments, resource losses, and reductions;
- unusual card destinations;
- bespoke movement ordering and battle restrictions;
- title-matching rules across copies;
- delayed consequences whose later resolution depends on an earlier choice; and
- card-specific `if able`, timing, source, target, or replacement conditions.

For example, **Rousing Speech** retains `you may draw one card, then discard one card` because the optional compound procedure is clearer than forcing `+1 Card` into that sentence. **Shock and Awe** retains its explicit Breakthrough ordering because that sequence is card-specific. **Sedition** and **Sequestration** retain natural `discard` wording rather than forcing `Remove` onto the card face; the shared rule classifies those forced losses as Removal.

## Density sequence

The v0.6.3 card review therefore proceeds in this order:

1. safe automatic conventions;
2. complete card-level convention review;
3. general-rule centralization;
4. Reserve/Tactic shorthand;
5. broader compact shorthand and reroll cleanup;
6. Asset ownership/Removal language;
7. Gambit/Tactic effect-heading migration;
8. exhaustive complete-pool convention/integrity pass plus finalized-text propagation;
9. recalculate the complete 128-card density ranking;
10. continue bespoke compression with the remaining genuinely dense cards;
11. review the rest of the pool for smaller card-specific improvements;
12. distinguish actual mechanics changes from wording/shared-rule changes;
13. propagate final approved text through canonical data, references, Deckbuilder, rendered cards, browser surfaces, Rules Arbiter, digital implementation, print/export surfaces, starter materials, tests, and governance; and
14. render every changed card at production size and audit fit.

## Approved mechanics-sensitive revisions already in scope

The final-stage mirror carries forward every card currently marked finalized in #405, including mechanics-sensitive revisions such as **Protracted Siege**, **Reserve Force**, **Manifest Destiny**, **Shock and Awe**, and **Margin Loan**. These remain subject to their previously identified implementation-test and release-note requirements; the pool-wide language pass does not reclassify them as wording-only changes.

## Generated outputs

The workflow runs:

```text
node scripts/build-v063-card-normalization.mjs
node scripts/finalize-v063-card-conventions.mjs
node scripts/apply-v063-general-card-rules.mjs
node scripts/apply-v063-numeric-shorthand.mjs
node scripts/apply-v063-compact-shorthand.mjs
node scripts/apply-v063-natural-advantage-wording.mjs
node scripts/apply-v063-advantage-capitalization.mjs
node scripts/apply-v063-asset-language.mjs
node scripts/validate-v063-advantage-stacking.mjs
node scripts/apply-v063-gambit-tactic-headings.mjs
node scripts/apply-v063-poolwide-card-refinements.mjs
```

The authoritative current card-text candidate is:

- `artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json`

The final density/audit report is:

- `artifacts/v0.6.3/Gauntlet_v0.6.3_Poolwide_Refinement_Density.md`

Earlier-stage candidates and reports remain in the workflow artifact for auditability, but they are not authoritative for subsequent bespoke review.

## Acceptance before continuing bespoke editing

This normalization phase is ready for continued bespoke editing only when:

- all 128 cards have an explicit convention review result;
- pool counts remain 50 Neutral plus 13 per faction;
- the v0.6.2 release files remain unchanged;
- no unapproved convention residual remains;
- no malformed Sanctions text reaches the final candidate;
- all adopted shorthand has been applied only where semantically exact;
- Advantage and Disadvantage remain stackable instance-based mechanics and are capitalized on card faces;
- **Removed** is used only as the defined involuntary Asset-loss event, while natural destination verbs remain available where clearer;
- `Asset` is the only banked-card effect heading and no `Activate` heading or legacy `activate` field remains;
- redundant `Asset(s) you control` / `Asset(s) they control` language is absent where ownership is already clear;
- no `Battle` effect heading or `Battle effect` prose terminology remains;
- `Gambit/Tactic` appears only as a canonical/printed heading, never as a prose effect category;
- no redundant `in a battle involving you` wording remains in the standard 1v1 card pool;
- physical Overlay cards use the settled placement wording;
- copied/repeated-effect and no-winner cleanup reminders are not restated card by card when the shared rule supplies them;
- every currently finalized #405 card exactly matches the canonical finalized-text tracker;
- compact instruction tokens render bold on card faces without changing canonical text;
- `Deck` / `Draw Pile` terminology is used in the final v0.6.3 candidate; and
- normalization, Test, and Governance Integrity workflows pass.
