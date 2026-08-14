# Clean v0.6.3 digital source boundary

This reconstruction implements the executable v0.6.3 delta only after the clean v0.6.2 digital base was rebuilt and merged in PR #629.

## Binding sources

The digital layer is derived from:

1. clean v0.6.2 executable base under `src/reconstruction/clean-v062/`;
2. complete clean v0.6.3 authority set `64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49`;
3. the clean v0.6.3 Rulebook;
4. `complete-authority/canonical-structured-data.json` for the complete 128-card / 25-Territory / six-faction structured payload.

The structured adapter imports the complete-authority artifact directly. It does not load the withdrawn v0.6.3 candidate JSON or the old release-candidate payload.

## Historical evidence boundary

`src/v063/*`, `src/v062/*`, and `src/content/v063.ts` may be inspected as historical implementation evidence only. They are not imported by the clean layer and do not determine the result.

The old v0.6.3 candidate was useful as a checklist, but each retained behavior was rechecked against the clean authority. In particular, the general bound-card cleanup rule is retained because the Complete Shared Rules expressly state that when a card leaves play, cards bound to it go to their owners' Discard Piles unless another instruction overrides that default.

## v0.6.3 delta implemented here

- opening draw four / discard one face up / keep three;
- informed Territory arrangement after opening selection;
- setup placement on the own-end Territory without movement or entering;
- initiative after opening selection and Territory arrangement;
- immediate Run-the-Gauntlet victory by capturing the opponent-end Territory;
- independent Last Stand victory without requiring prior control or capture of that Territory;
- separate legal movement sequence for Last Stand initiation;
- effect-granted movement as a distinct movement sequence;
- inherent Bank Action and directly permitted procedure rules;
- additional-Tactic defaults;
- bound-card cleanup default and reveal-stage interference priority;
- persistent Margin Loan lifecycle;
- exact Armistice, Contingency Plan, and Manifest Destiny late corrections through the clean structured authority.

## Publication firewall

This reconstruction does not modify `src/content/current.ts`, public routes, release lifecycle state, TTS/print, or any immutable historical release package. v0.6.1 remains the current/public release and publication remains locked.
