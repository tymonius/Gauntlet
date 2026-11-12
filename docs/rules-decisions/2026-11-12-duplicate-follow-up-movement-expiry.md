# Accepted rules decision: Multiple follow-up movement effects from one battle

**Decision date:** 2026-11-12  
**Status:** Accepted by game designer; **pending integration into the next formally versioned rules release and digital engine**. The frozen v0.7.2 release and its currently published rulebooks remain unchanged.

**Related:** [issue #1953](https://github.com/tymonius/Gauntlet/issues/1953), [previous Give Chase / General Rout ruling](2026-10-16-give-chase-rout-precedence.md), [Countercharge architecture #1941](https://github.com/tymonius/Gauntlet/issues/1941), [Give Chase Action-mode scope #1952](https://github.com/tymonius/Gauntlet/issues/1952).

## Ruling

When two or more separate, otherwise eligible effects from the **same battle** grant follow-up movement at the end of or following that battle's Aftermath:

1. Resolve effects individually at their applicable timing. At a shared timing, retain the existing attacker/defender alternation and each controller's choice of order, except where a specific accepted precedence ruling overrides that order.
2. Resolve a chosen effect's movement immediately. If it initiates a new battle, enter the new battle's Onset immediately. **Any other follow-up movement effects still unresolved from the previous battle expire**; they are not resolved before Onset, do not carry into the new battle, and do not resume after it.
3. If an effect's movement does **not** initiate a new battle, proceed to the next otherwise eligible follow-up effect at that timing, following ordinary choice/order rules. An optional effect may be declined; declining does not spend an unchosen Order's cost.
4. Do not confuse an unused movement **step within a sequence** (already covered by the published movement rule) with an unresolved **separate effect**. This decision explicitly governs the latter.

This is a designer-approved clarification **for a future version**, not an assertion that frozen v0.7.2 already specified the expiration behavior.

## Concrete same-card combinations

- **Countercharge + Countercharge:** For example, a winning defender has a revealed Countercharge Gambit/Tactic and an eligible banked Countercharge Asset, or otherwise has multiple qualifying physical copies. Battle-card mode remains mandatory if eligible; Asset mode remains optional. If the first resolved Advance initiates another battle, all remaining unconsumed Countercharge movement effects from the original battle expire.
- **Give Chase + Give Chase:** Multiple eligible copies committed as Gambits/Tactics may each offer their printed optional follow-up Advance. If the first used Advance initiates another battle, other unused Give Chase follow-up movement effects from the previous battle expire. If not, remaining eligible copies may still be offered.

This does not change the October 16 specific **Give Chase before General Rout** priority: if Give Chase creates a new battle, the original Rout opportunity ends and no Command is spent. If not, Rout remains available when eligible. The distinct Give Chase **Denouement Action** remains outside this timing decision.

## Boundaries and implementation requirements

- **Countercharge** requires a winning defender; **Give Chase** and **General Rout** require a winning attacker, so they cannot be simultaneous benefits for the same winner in one battle.
- **Shock and Awe** has its own Breakthrough timing and explicit victory restrictions, and is Unique. Its independent implementation details remain governed by its printed effect and need their own validation; do not invent a same-timing interaction solely from this ruling.
- No change is made to which effects are mandatory or optional, payment rules, legality of the Advance, or the printed restriction on additional movement resulting from a given victory.
- Preserve off-turn movement ownership, source-instance identity, cleanup and one-at-a-time movement. Prevent old-battle effect queues from leaking into a newly initiated battle.

## Release and implementation checklist

- [x] Confirm whether remaining old-battle movement grants expire after a follow-up Advance initiates another battle.
- [x] Identify concrete duplicate Countercharge and duplicate Give Chase cases.
- [x] Retain the existing accepted Give Chase / General Rout precedence.
- [ ] Integrate this clarification into next-version canonical game/rules authority, then publish through normal release governance.
- [ ] Wire Countercharge and Give Chase into the shared post-Aftermath scheduler, including eligible banked Assets.
- [ ] Add end-to-end regression tests for duplicate sources with and without a newly initiated battle, optional declines, mandatory effects, and off-turn ownership.
- [ ] Resolve Give Chase Action-mode scope independently in #1952.
