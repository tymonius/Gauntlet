# Gauntlet: Alliances Documentation

This directory preserves the active exploratory design record for **Gauntlet: Alliances**, a proposed four-player fixed-team 2v2 mode.

Alliances is **not part of the current canonical game**. The current two-player release remains authoritative, and Arena remains a separate multiplayer design track. Nothing in this directory changes standard Gauntlet unless a future Alliances release explicitly adopts it.

## Current documents

- [Working Design Record](Gauntlet_Alliances_Working_Design.md) — the current concept, provisional rules, design rationale, rejected/abandoned directions, unresolved questions, and future prototype boundaries.

Additional documents should be added only when they acquire a distinct continuing purpose. Likely future records include:

- a current-release compatibility/baseline migration;
- a faction and Leader adaptation matrix;
- a physical/TTS prototype specification;
- structured playtest reports; and
- an Alliances rules/reference candidate.

## Development states

Alliances notes use three states:

- **Working direction** — the current preferred model, worth preserving for a future prototype but not yet validated by playtesting.
- **Open question** — unresolved and requiring design work or testing.
- **Deferred** — deliberately excluded from the first prototype or from current work.

Because this record was created before implementation, most rules remain **working directions**, not locked rules.

## Core identity

Alliances should not feel like two ordinary Gauntlet games placed beside each other. Its defining question is:

> **How does an alliance maintain a two-wide front while deciding when to spread, reinforce, concentrate, flank, and risk exposing one side of the battlefield?**

The intended identity is coordinated maneuver and combined combat:

- a **2 × 6 battlefield** built from two parallel six-Territory Gauntlet columns;
- two side-by-side Territories at the same depth form a **rank**;
- teammates are not assigned permanent lanes;
- each Alliance shares a pool of **2 Movement** during its Movement phase;
- players may Advance straight or diagonally and may reposition between columns;
- teammates may share a Territory and concentrate their strength;
- battles may involve 1v1, 2v1, or 2v2 participation;
- decisive team victories may cause a **Rout** to create meaningful positional separation;
- passing and flanking are allowed, but hostile Territory must be consolidated rather than sprinted through; and
- a Last Stand should require a genuine team breakthrough across the full final rank.

## Project tracking

Future work is tracked in [issue #1696](https://github.com/tymonius/Gauntlet/issues/1696).

The issue tracks work; the documents in this directory preserve the design.

## Development workflow

1. Treat the current canonical two-player release at the time of implementation as the inherited baseline.
2. Rebase these notes against that release before building a prototype; do not assume current wording will still match future rules.
3. Preserve Alliances-specific decisions separately from inherited two-player rules.
4. Test the smallest coherent rules package that answers geometry, cooperation, battle, Rout, and anti-race questions.
5. Do not begin with a full faction-compatibility rewrite unless the board and battle model first proves fun.
6. Record evidence and revise working directions after actual four-player tests.
7. Do not propagate Alliances rules into canonical two-player sources or Arena documentation.
