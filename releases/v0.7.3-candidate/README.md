# Gauntlet v0.7.3-candidate — isolated development snapshot

**Status:** Draft candidate; not a published release. Derived from active v0.7.2 at commit `86deae7a1a659421c3e77f5accacf6d1f1c23367`.

This directory contains a **complete review snapshot** of the gameplay authority and the player-facing Rulebook, Comprehensive Rules, Player's Guide, and six Faction Guides. It is intentionally **not wired into runtime or publication**. Until a governed candidate promotion, all current consumers continue using `packages/game-data/current-game.json` and the maintained live rules sources. Published v0.7.2 release files and hashes must remain unchanged.

## Approved decisions included

1. **Intercepted Orders:** Tactic-only with precisely approved Reserve reveal/return/replacement wording, normal Tactic-reveal timing, no new pre-reveal window. Asset unchanged. [Accepted decision](../../docs/rules-decisions/2026-10-16-intercepted-orders-tactic-timing.md) / [issue #1939](https://github.com/tymonius/Gauntlet/issues/1939).
2. **Give Chase before General Rout:** Give Chase's optional Gambit/Tactic follow-up advances take priority over Rout. If an Advance starts another battle, the original Rout option expires and no Command is paid. If no battle starts, Rout may still be used if eligible. Denouement Action unchanged. [Accepted decision](../../docs/rules-decisions/2026-10-16-give-chase-rout-precedence.md) / [PR #1967](https://github.com/tymonius/Gauntlet/pull/1967).
3. **Unresolved follow-up movement expires:** When separate eligible effects from one battle provide movement, process them individually. A movement that begins a new battle immediately enters Onset; remaining unresolved old-battle movement effects expire without resuming, including duplicate Countercharge and duplicate Give Chase cases. Otherwise continue with remaining eligible effects. [Accepted decision](../../docs/rules-decisions/2026-11-12-duplicate-follow-up-movement-expiry.md) / [PR #2015](https://github.com/tymonius/Gauntlet/pull/2015).

## Still unresolved; deliberately excluded

- Give Chase **Action-mode** follow-up-battle restrictions ([#1952](https://github.com/tymonius/Gauntlet/issues/1952)).
- Unresolved mechanical parity for Intercepted Orders, Spies, Treason, Field Command, and Shock and Awe; this candidate does **not** claim any digital engine support.
- Any unapproved wording changes or inferred movement timing interactions.

The candidate `current-game.json` is the **complete candidate source**, not a patch to apply to the active game. Its status is `active-development`, and its `runtimePolicy` identifies this release as a review-only candidate.

## Contents

- `current-game.json` — complete v0.7.3-candidate structured gameplay authority
- `current-rulebook.md` — full candidate player-facing rulebook
- `comprehensive-rules.md` — candidate detailed rules
- `player-guide.md` — unchanged player-onboarding material, bundled for completeness
- `faction-guides/` — six complete guides, with Military and Intelligence updated
- `candidate-manifest.json` — source versions, recorded decisions, exclusions, integration status

**Release boundary:** These copies are for review and future promotion. They are not a new public rulebook version, a release manifest, a rules-arbiter corpus, or a claim of runtime parity.
