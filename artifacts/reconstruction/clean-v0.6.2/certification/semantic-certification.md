# Clean v0.6.2 authority-set semantic certification

**Status:** certified on manual merge of this certification PR  
**Authority set:** `563ce3a0ac39a0bbba52cc113ae9ffbcaeb3c0985bad4cfa66fe462fb2cacb3b`  
**Public/current release remains:** v0.6.1  
**Publication:** locked

## Certified authority set

This certification binds exactly seven authority documents: the reconstructed self-contained Rulebook and the six reconstructed faction guides approved through PR #609 and PR #611. Their SHA-256 hashes are recorded in `artifacts/reconstruction/clean-v0.6.2/certification/authority-set.json`.

The certification validator recomputes every hash and reconstructs each faction chapter from its dedicated guide using the Rulebook integration transform plus the approved integration-only normalization. The resulting text must appear exactly in Part III of the certified Rulebook. This makes the shared Rulebook and dedicated faction authorities one coherent, pinned authority set rather than seven independently approved documents.

## Semantic boundary rechecked

- v0.6.2 setup remains draw four, keep three, place the fourth face down beneath the Draw Pile, then arrange Territories with the opening Hand known.
- Tokens begin before their own-end Territory.
- Turn structure remains Capture → Draw → Opening → Movement → Denouement → Cleanup.
- Faction Actions and Faction Abilities remain distinct.
- Pending battle → Terms → Onset remains the pre-battle sequence.
- Front Line, Defensive Edge, and the straight unmodified Tiebreak Roll remain the shared control/tie model.
- Normal victory remains cumulative: the opponent's final Territory must enter the attacker's Front Line before the normal Last Stand victory can occur.
- All twelve Leader ownership mappings remain intact through the exact Part III integration check.
- Reserves and Smuggler's Pass remain the v0.6.2 identities.

## Cross-version and publication boundary

Certification does not publish v0.6.2. The public/current release remains v0.6.1, and both historical v0.6.2 and v0.6.3 packages remain withdrawn.

Merging this certification unlocks **clean v0.6.3 authority construction only**. Clean v0.6.3 must derive from this certified authority set and apply only its verified deltas. The withdrawn v0.6.3 Rulebook and combined guide remain evidence only, and publication remains separately locked.
