# Gauntlet Digital Roadmap

**Status:** Active roadmap  
**Current rules authority:** v0.6.3 — Third Playtest Revision  
**Canonical package:** [`../releases/v0.6.3/`](../releases/v0.6.3/)

The digital implementation must reproduce the published tabletop game, not define a parallel ruleset. `src/content/current.ts` is the digital current-version pointer and must agree with `config/current-release.json`.

## Current architecture principles

1. **Canonical data first.** Cards, Territories, Proposals, Leaders, starter Decks, and rules-facing labels come from or are validated against the current immutable release package.
2. **One production UI lineage.** The polished root Start, Rulebook, Deckbuilder, and Card Reference applications own production UX. Versioned current routes hand off to them rather than maintaining divergent candidate frontends.
3. **Rules terminology parity.** Digital play uses the same vocabulary as v0.6.3: Advance / Hold / Fall Back, Defensive Edge, Tiebreak Roll, Front Line Capture, Last Stand, and faction-specific systems.
4. **Historical compatibility is explicit.** Old Workers/data/routes may remain for reproducibility, but they may not silently become current defaults.
5. **Release integrity is a product invariant.** The digital current pointer, browser tools, Rules Arbiter, and formal playtest infrastructure must all agree with `config/current-release.json`.

## v0.6.3 engine baseline

The digital rules model must support at minimum:

- 30-card / 60-value Deck construction and three Territories;
- opening draw four / discard one / keep three, then Territory arrangement;
- contiguous six-position battlefield movement;
- Advance, Hold, and Fall Back choices;
- Tactics, Gambits, Assets, Missions, and faction mechanics;
- Defensive Edge and Tiebreak Roll resolution;
- contiguous Front Line Capture;
- independent final-Territory-capture and Last-Stand normal victory routes;
- six faction additional victories and twelve Leader abilities.

## Near-term work

- Keep the browser tools and digital data model synchronized with published v0.6.3.
- Continue deterministic engine tests for card interactions and faction mechanics.
- Use formal playtest evidence to identify rules-model gaps before the next release.
- Avoid adding speculative next-version rules to the current digital baseline until they are accepted into a release candidate.
- Make future release promotion update `config/current-release.json` atomically with current digital/browser routing.

## Release gate

Before a digital rules version becomes current, both its version-specific tests and `npm run test:release-integrity` must pass. The current-release integrity gate is deliberately broader than engine tests: it verifies that the repository and production surfaces agree about which ruleset they are serving.

See [`Gauntlet_Release_Integrity_Standard.md`](Gauntlet_Release_Integrity_Standard.md).
