# Accepted rules decision: Give Chase before General Rout

**Decision date:** 2026-10-16  
**Status:** Accepted by game designer; **pending integration into the next formally versioned rules release**. The public v0.7.2 modular rulebooks and frozen release package are unchanged. This record is not a replacement for the currently published rules.

**Related:** [issue #1953](https://github.com/tymonius/Gauntlet/issues/1953) (shared follow-up movement sequencing), [issue #1952](https://github.com/tymonius/Gauntlet/issues/1952) (Give Chase Action-mode scope), [Gauntlet digital engine parity](https://github.com/tymonius/Gauntlet/issues/741).

## Ruling

If the attacking player wins a battle in which they played **Give Chase** as a Gambit or Tactic and the General's **Rout** Order is also available from that same victory:

1. Offer the player Give Chase's **optional** follow-up Advance **before** Rout.
2. If Give Chase's Advance is taken, resolve it first.
3. If that Advance initiates another battle, the previous battle's unused Rout opportunity ends. The player **does not use Rout** and **does not spend its 2 Command**.
4. If Give Chase's Advance is declined, or if its Advance does not initiate another battle, Rout is still optional at its printed timing and cost, provided its other requirements are met.

Give Chase is not forced merely because its follow-up has priority. Its distinct **Denouement Action** mode is unaffected by this particular timing ruling.

## Basis and scope

This is a new designer-approved specific precedence over the general shared-timing ordering rule. It is not a claim that the existing frozen v0.7.2 text already prescribed this priority.

This decision settles **Give Chase vs. Rout**. It does **not** determine the sequencing of every pair of follow-up movement effects, including separate Countercharge or Shock and Awe cases. Do not close issue #1953 solely on the strength of this narrower decision.

The card's exact current Gambit/Tactic text grants an optional Advance following the Aftermath. The General's Rout is an optional 2-Command Order at the end of Aftermath. Cost is paid only when the Order is actually used.

## Release and implementation checklist

- [x] Confirm designer's intended precedence, optionality, and Command treatment.
- [x] Record the ruling outside the frozen v0.7.2 publication sources.
- [ ] Integrate into the next release's authoritative comprehensive rules and Military faction guide through the governed publication process.
- [ ] Implement Give Chase battle-mode follow-up and Rout interaction with regression tests.
- [ ] Resolve remaining issue #1953 movement combinations independently.
- [ ] Resolve separate issue #1952 Action-mode scoping before claiming complete Give Chase parity.
