# v0.6.4 Candidate Legacy Subsystem

This directory is the canonical repository home for the historical `v0.6.4-candidate` source set.

The candidate was an intermediate design/data layer between the certified v0.6.3 historical release and later current-game authorities. These files are retained because the legacy v0.6.4 adapter and provenance records still reproduce or identify that candidate state; they are not current gameplay authority.

## Contents

- `v0.6.4-card-additions.json` — candidate card additions and retirements.
- `v0.6.4-rules.json` — candidate shared-rule changes.
- `v0.6.4-territories.json` — candidate Territory set.
- `v0.6.4-diplomat-proposals.json` — candidate Diplomat Proposal data.
- `v0.6.4-arcane-symbol.json` — candidate Arcane-symbol data.
- `v0.6.4-balance-watch.md` — balance-watch record for the candidate cycle.
- `v0.6.4-territory-brevity-review.md` — Territory wording review.
- `v0.6.4-territory-reference.md` — Territory reference record.

## Compatibility paths

Some maintained historical/provenance consumers still name the former `docs/v0.6.4-*` paths. Those paths are retained only as lightweight symbolic links to this directory so there is one stored copy of each candidate file while compatibility is preserved.

New code and documentation should reference this `legacy/v0.6.4-candidate/` location directly. Current gameplay authority remains `game-data/current-game.json`.
