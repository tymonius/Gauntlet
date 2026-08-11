# Gauntlet v0.6.3 Card-Language Normalization

**Status:** Shared normalization complete through the exhaustive pool-wide refinement/integrity pass; bespoke density review continues  
**Release tracker:** [Issue #528](https://github.com/tymonius/Gauntlet/issues/528)  
**Card review:** [Issue #405](https://github.com/tymonius/Gauntlet/issues/405)  
**Deck terminology:** [Issue #539](https://github.com/tymonius/Gauntlet/issues/539)

## Purpose

Normalize the complete 128-card published v0.6.2 pool before and during bespoke compression so accepted terminology, shared procedures, and finalized card text are actually propagated to every generated v0.6.3 card rather than living only in discussion history.

The generated v0.6.3 candidates are development artifacts only. The immutable published v0.6.2 package is read as the baseline and is never modified.

The critical process rule is now explicit: **an accepted pool-wide convention is not considered propagated merely because it is documented. It must be represented by a complete-pool migration or validation rule, and finalized bespoke text must match the canonical #405 tracker.**

## Terminology

For v0.6.3:

- **Deck** means the constructed set of ordinary cards selected under Deck-construction rules.
- **Draw Pile** means the shuffled in-play pile formed from the Deck during setup.
- **Advantage** and **Disadvantage** are capitalized defined game terms everywhere on card faces. Card-facing instructions use forms such as `gain Advantage`, `gain double Advantage`, and `gain Disadvantage`; `double` remains a normal modifier rather than a separate keyword.
- **Remove / Removed** is a defined Asset event: an Asset is Removed when a rule or effect forces it to leave play. The underlying instruction determines its destination. Asset loss caused by a decreased Asset limit counts as Removal; voluntary Asset use/discard and normal self-expiration do not.
- Natural destination verbs remain preferred when they are clearer than explicitly saying `Remove`. A card may therefore `discard 1 Asset` while the shared rules classify that forced loss as Removal.
- **Asset** is the sole banked-card effect heading. The former `Activate` heading is retired; optional, triggered, continuous, and Action-timed banked abilities all appear under Asset.
- Because **Asset** already identifies a banked card, prefer `Asset`, `your Assets`, `opposing Assets`, or `their Assets` over `banked Asset(s)` or `Asset(s) you/they control` unless an accepted card-specific reason requires the longer wording.
- A card effect usable when the card is committed as either a Gambit or a Tactic has the canonical label **`Gambit/Tactic`**. On the card face, render that label as `Gambit/` on the first line and `Tactic` on the second so the heading column remains narrow.
- In general prose, say `Gambit effect`, `Tactic effect`, or `Gambit or Tactic effect` according to the actual scope. A card directly referring to its own printed dual-role heading may say `its Gambit/Tactic effect`.
- In standard 1v1 v0.6.3, card text does not repeat `in a battle involving you`; every battle necessarily involves both players.
- **Bind** is the attachment verb for one card being held by another. Shared rules govern default bound-card cleanup and adjustment when a bound-card limit decreases.
- Applying or repeating another effect uses one shared procedure for timing legality, control, choices, costs, source-card state, trigger identity, and recursion.
- Ending a battle **without a winner** uses one shared procedure for result status, unresolved effects, cleanup, and remaining positional consequences.
- On a physical Overlay card, prefer `place this Overlay` rather than `place this card as an Overlay`.
- Use natural `In the Aftermath` wording unless a genuinely distinct timing such as `At the end of the Aftermath` or `before battle cards are cleared` matters.
- `Win —` / `Lose —` shorthand is reserved for genuinely paired or branching outcomes. A lone win/loss condition is written naturally as `if you win` / `if you lose`.
- **Position** is the defined movement term and is capitalized in player-facing card text. Do not repeat the general rule that movement occurs one Position at a time.
- Compact instruction tokens such as `+1 Action`, `−1 Reserve`, `+1 Tactic`, `+2 Cards`, `+1 Tactic from Hand`, `+1 Tactic from those cards`, `+1 Tactic using that card`, `Retreat +1`, `Advance Front Line 1`, and `Command = 2` are rendered **bold as complete instruction tokens** on card faces. The emphasis is presentation, not part of canonical text.
- The former broader use of `deck` for a player's Deck plus Leader, Territories, faction supplements, and other components is retired without a replacement formal umbrella term.

## Eight semantic normalization stages

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

On rendered card faces, each complete compact instruction token is bolded, including an applicable source qualifier. Surrounding prose remains normal weight unless independently emphasized.

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
- fails if a `Battle` effect heading or `Battle effect` prose reference survives this stage.

The slash label is canonical for the printed heading. General rules prose uses ordinary grammatical role names; later finalized card text may use `its Gambit/Tactic effect` when directly referring to that same card's printed heading.

### 8. Exhaustive pool-wide refinement and finalized-text propagation

`scripts/apply-v063-poolwide-card-refinements.mjs` rechecks the complete generated 128-card pool against accepted conventions and applies the earlier finalized bespoke text as the last major text layer before the final forward-convention stage.

It currently:

- converts all **34** surviving `Activate` headings to `Asset`, merging the two cards that previously had both headings;
- removes all initially identified redundant `in a battle involving you` phrases;
- normalizes legacy physical-Overlay placement phrases to `place this Overlay` wording;
- finishes adopted `Attacker —` / `Counterattack —` condition-prefix typography;
- centralizes copied/repeated-effect procedure and removes redundant card-specific copied-effect notes;
- centralizes battles ending without a winner and removes redundant cleanup/result notes;
- removes Rules Notes already supplied by shared replacement, movement, banking, numeric-modifier, and destination rules;
- removes stale terminology and a stray publication footer found during the complete-pool audit; and
- mirrors the **13 earlier finalized bespoke cards** that were present when this stage was introduced.

The editorial authority for finalized bespoke card text remains the single tracker comment:

- [#405 comment 5221286097](https://github.com/tymonius/Gauntlet/issues/405#issuecomment-5221286097)

## Post-stage artifact audit and integrity gates

The eight semantic stages are followed by additional safeguards because inspecting the **generated artifact** revealed variants that earlier source-level searches did not catch.

### Generated-artifact cleanup

`scripts/apply-v063-final-artifact-audit.mjs` removes residual shared-rule boilerplate and terminology found only after generating the complete candidate. It currently covers, among other things:

- copied-effect source-zone reminders already guaranteed by the shared copied/repeated-effect rule;
- redundant `banked Asset(s)` wording found at this stage;
- residual Advantage/Disadvantage capitalization in sentence-initial and non-`gain` constructions; and
- complete-pool validation that every standalone `Advantage` / `Disadvantage` token is capitalized correctly.

### Final wording integrity

`scripts/finalize-v063-poolwide-integrity.mjs` catches variant forms of accepted conventions and applies small full-pool repairs discovered by generated-artifact inspection, including:

- alternate `involving you` wording;
- residual `Aftermath of a battle` constructions while preserving genuinely distinct end-of-Aftermath timing;
- unpaired `Win —` / `Lose —` shorthand;
- redundant one-Position-at-a-time movement reminders; and
- lowercase uses of the defined **Position** term.

It also regenerates the density ranking from the fully refined card text at that point in the pipeline.

### Finalized-card forward conventions

`scripts/apply-v063-finalized-forward-conventions.mjs` reapplies later pool-wide conventions to finalized bespoke text, carries the latest approved reopened-card revisions forward, and audits the complete set of cards currently finalized in #405. This is where direct same-card `its Gambit/Tactic effect` self-reference is permitted while broad/general slash-label prose remains rejected.

### Compatibility-field synchronization

`cards[].effects[]` is the authoritative machine-readable card text within the generated candidate. `scripts/sync-v063-final-card-mirrors.mjs` synchronizes compatibility fields such as `action`, `asset`, `gambit_tactic`, `overlay`, and similar mirrors from `effects[]`, removes obsolete `battle`, `activate`, and `use` fields, and fails if any mirror disagrees with its corresponding effect.

This safeguard was added after artifact inspection found that otherwise-correct final `effects[]` text could coexist with stale compatibility mirrors.

### Live canonical #405 validation

`scripts/validate-v063-finalized-tracker.mjs` reads the canonical #405 finalized-text comment directly through the GitHub API and compares every finalized card section against the generated candidate. It does not rely only on the build's local mirror.

Consequently:

- changing the #405 finalized tracker without propagating the build causes CI to fail;
- changing the generated candidate away from an accepted finalized card causes CI to fail; and
- adding another finalized card to the tracker automatically adds it to the live comparison set.

### Rendering validation

The card renderer keeps formatting separate from canonical text.

`scripts/validate-v063-card-rendering-conventions.mjs` and `.github/workflows/validate-v063-card-rendering-conventions.yml` verify that:

- `Gambit/Tactic` is displayed as `Gambit/` over `Tactic` with the prose accessibility label `Gambit or Tactic`;
- compact instructions are emphasized only for v0.6.3, preserving v0.6.2 rendering; and
- the **entire** qualified instruction is bolded for forms such as `+1 Tactic from Hand`, `+1 Tactic from those cards`, and `+1 Tactic using that card`, not merely the numeric prefix.

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
8. exhaustive complete-pool convention pass plus finalized-text propagation;
9. generated-artifact cleanup, integrity validation, finalized-card forward conventions, compatibility synchronization, and live #405 comparison;
10. recalculate the complete 128-card density ranking;
11. continue bespoke compression with the remaining genuinely dense cards;
12. review the rest of the pool for smaller card-specific improvements;
13. distinguish actual mechanics changes from wording/shared-rule changes;
14. propagate final approved text through canonical data, references, Deckbuilder, rendered cards, browser surfaces, Rules Arbiter, digital implementation, print/export surfaces, starter materials, tests, and governance; and
15. render every changed card at production size and audit fit.

## Approved mechanics-sensitive revisions already in scope

The final-stage mirror carries forward every card currently marked finalized in #405, including mechanics-sensitive revisions such as **Protracted Siege**, **Reserve Force**, **Manifest Destiny**, **Shock and Awe**, and **Margin Loan**. These remain subject to their previously identified implementation-test and release-note requirements; the pool-wide language pass does not reclassify them as wording-only changes.

## Generated outputs

The normalization workflow runs, in order:

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
node scripts/apply-v063-final-artifact-audit.mjs
node scripts/finalize-v063-poolwide-integrity.mjs
node scripts/apply-v063-finalized-forward-conventions.mjs
node scripts/sync-v063-final-card-mirrors.mjs
node scripts/validate-v063-finalized-tracker.mjs
```

Rendering conventions are validated separately with:

```text
node scripts/validate-v063-card-rendering-conventions.mjs
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
- every standalone **Advantage** and **Disadvantage** occurrence is capitalized as a defined term;
- **Removed** is used only as the defined involuntary Asset-loss event, while natural destination verbs remain available where clearer;
- `Asset` is the only banked-card effect heading and no `Activate` heading or legacy `activate` field remains;
- redundant Asset ownership/control and `banked Asset(s)` wording is absent unless a genuine card-specific requirement remains;
- no `Battle` effect heading or `Battle effect` prose terminology remains;
- general prose does not use `Gambit/Tactic` as a generic effect category; direct same-card reference to `its Gambit/Tactic effect` is permitted;
- no redundant `in a battle involving you` or variant 1v1 scope wording remains;
- physical Overlay cards use the settled placement wording;
- copied/repeated-effect and no-winner cleanup reminders are not restated card by card when the shared rule supplies them;
- unpaired `Win —` / `Lose —` shorthand is absent;
- defined **Position** is capitalized and redundant one-at-a-time movement reminders are absent;
- every compatibility field exactly matches its authoritative `effects[]` entry;
- every currently finalized #405 card exactly matches the live canonical finalized-text tracker;
- compact instruction tokens render bold as complete instruction phrases on v0.6.3 card faces without changing canonical text or v0.6.2 rendering;
- `Deck` / `Draw Pile` terminology is used in the final v0.6.3 candidate; and
- normalization, rendering-convention, Test, Governance Integrity, and applicable render-generation workflows pass.
