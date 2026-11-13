# Accepted rules decision: Impossible mandatory Advance

**Decision date:** 2026-11-13  
**Status:** Accepted by game designer for the next candidate release. The frozen published rules and active gameplay authority remain unchanged.  
**Related:** [issue #1953](https://github.com/tymonius/Gauntlet/issues/1953), [Countercharge implementation #1941](https://github.com/tymonius/Gauntlet/issues/1941), [prior follow-up movement expiration decision](2026-11-12-duplicate-follow-up-movement-expiry.md).

## Ruling

A card effect that directs a player to **Advance** (rather than saying **“you may”**) is mandatory when its stated conditions are met. If **no legal Advance can occur**, the Advance **does not take place**. **All other instructions of the effect still resolve**, including putting the card into the Graveyard when instructed. The player does not pass through an entry prohibition, waive a required cost, move illegally, or initiate a battle.

This is not a choice to decline a legal mandatory Advance. When the required discard or other payment **can** be provided, the player must supply it to perform the otherwise legal Advance; omission is not a reason to skip the movement.

A mandatory Advance that fails because it is legally impossible is **not** a new battle. It therefore does not expire any other unresolved movement effects from the old battle; those effects continue at their proper timing and with their normal optional/mandatory statuses.

## Countercharge examples

- **Gambit/Tactic mode:** After the defending winner's Aftermath, Countercharge instructs the player to put the card in the Graveyard and then Advance one Position. If the only forward Territory is under a current-turn Demilitarized Zone entry lock, put Countercharge in the Graveyard and do not move.
- **Cost barrier:** If the only otherwise available move requires an entry discard and the player has no card in Hand to pay it, the instructed Advance fails; no cost is waived and the Countercharge source still goes to the Graveyard.
- **Available payment:** If the player *has* a valid card available to pay an entry cost, failing to specify a discard does not make that Advance impossible. Resolve the required cost and movement normally.
- **Asset mode:** Banked Countercharge says **“you may”**. It remains optional and can be declined without moving the Asset into the Graveyard. This ruling does not turn its optional effect into a mandatory effect.

## Implementation and release boundary

- Make mandatory no-movement failure explicit in the follow-up queue and its event history; do not leave an active movement step or an off-turn movement controller waiting indefinitely.
- Preserve card cleanup (a Tactic normally Discards in Aftermath, but Countercharge instructs Graveyard once its effect resolves), original turn ownership, and unrelated pending effect identity.
- Preserve ordinary rules for DMZ locks, DMZ discard costs, and any other movement restrictions; reject omitted payments when payment is possible.
- Put this clarification into the **isolated v0.7.3-candidate authority and rules**. Do not mutate published v0.7.2 card wording or imply retroactive publication.
