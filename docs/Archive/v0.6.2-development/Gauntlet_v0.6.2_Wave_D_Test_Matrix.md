# Gauntlet v0.6.2 Wave D Test Matrix

**Status:** Normative production-propagation scenarios  
**Tracker:** [Issue #501](https://github.com/tymonius/Gauntlet/issues/501)  
**Published release:** v0.6.1 remains canonical until v0.6.2 is released

These scenarios govern the effective structured data, versioned candidate URLs, starter handoff, Deckbuilder, generated reference, and release boundary.

---

# A. Effective canonical data

## A01 — Immutable base
Build v0.6.2 from the published v0.6.1 canonical JSON without modifying that file.

## A02 — Candidate identity
The effective data identifies itself as `v0.6.2-candidate`, not v0.6.1.

## A03 — Complete card count
The effective pool contains exactly 128 playable-card titles: 50 Neutral and 13 in each of six faction pools.

## A04 — Pool counts
Neutral contains 50 titles and each faction contains 13.

## A05 — Invasion migration
Invasion is Military and no Neutral Invasion remains.

## A06 — New cards
Landslide, Détente, Compound Interest, Extraordinary Rendition, Nature's Altar, and Martyrdom exist with their accepted values and modes.

## A07 — Retired classification
No effective card or Territory uses Basic or Advanced as an active complexity field.

## A08 — Deterministic materialization
Repeated builds from the same base produce byte-identical JSON after stable serialization.

# B. Rules and component parity

## B01 — Turn sequence
The effective turn is Capture → Draw → Opening → Movement → Denouement → Cleanup.

## B02 — Pending battle
The effective pre-battle sequence is pending battle → Terms → Onset → Gambits.

## B03 — Active battle
The effective battle begins at Onset and ends with Aftermath.

## B04 — Defensive Edge
The data defines conditional Defensive Edge rather than Defender's Advantage.

## B05 — Tiebreak Roll
Arenas remove Defensive Edge and direct tied totals to a separate Tiebreak Roll.

## B06 — Front Line
Capture and immediate-control effects preserve contiguous Front Line control.

## B07 — Withdrawal and retreat
The data distinguishes Fall Back, withdrawal, and retreat.

## B08 — Proposals
All nine Proposal outcomes use explicit roles rather than reader-dependent pronouns.

# C. Starter Deck propagation

## C01 — Twelve Decks
Exactly one approved starter exists for each faction/Leader pair.

## C02 — Card count
Every starter contains exactly 30 playable cards.

## C03 — Value
Every starter has total deckbuilding value 60.

## C04 — Allegiance
Every starter contains only Neutral and its selected faction's cards.

## C05 — Unique cards
No starter contains more than one copy of a Unique card.

## C06 — Territories
Every starter contains three known Territories in an explicit order.

## C07 — Arena limit
No starter contains more than one Arena.

## C08 — New-card coverage
The seven-card v0.6.2 expansion—six new titles plus Invasion's pool migration—is represented across the approved starter catalog.

# D. Candidate onboarding

## D01 — Version boundary
The candidate Start page is under `/v0.6.2/` and visibly identifies v0.6.1 as the published release.

## D02 — Layered teaching
The page teaches the shared game, the player's faction, then opponent-facing information.

## D03 — Shared turn
The turn sequence matches Wave A exactly.

## D04 — Shared battle
The page distinguishes pending battle from active battle and uses Onset.

## D05 — Physical zones
Hand, Gambit, Reserve, and Tactic are presented as separate zones.

## D06 — Bound cards
The bound-card reminder identifies bound cards as outside ordinary zones.

## D07 — Leader guidance
Each faction identifies one recommended first Leader.

## D08 — Handoff
Faction and Leader selection reaches the candidate Deckbuilder with `starter=1`.

# E. Candidate Deckbuilder

## E01 — One data source
The Deckbuilder consumes the effective v0.6.2 canonical-data module.

## E02 — Full pool
The available-card list contains Neutral plus the selected faction's complete 13-card pool.

## E03 — No complexity filter
The Deckbuilder offers no Basic/Advanced construction filter.

## E04 — Exact starter load
Loading a starter reproduces every approved card quantity and ordered Territory.

## E05 — Legal validation
The tool checks card count, value, allegiance, Unique limits, Territories, and Arena count. Non-Unique cards have no general copy ceiling unless a specific card says otherwise.

## E06 — Print
The selected Deck and ordered Territories have a print-friendly output path.

## E07 — Export
The tool exports a versioned Deck JSON file.

## E08 — Canonical download
The tool can download the materialized effective canonical JSON.

# F. Generated reference and release integrity

## F01 — Card reference
The generated reference exposes all 128 card titles and exact modes.

## F02 — Territory reference
The generated reference exposes all 25 Territories with revised text.

## F03 — Proposal reference
The generated reference exposes all nine perspective-safe Proposals.

## F04 — Search and filters
Card search, allegiance filtering, and value filtering operate on effective data.

## F05 — Retired vocabulary
Candidate player surfaces contain no current Action Opportunity, Defender's Advantage, opening effects, or revealed-Territory language.

## F06 — Published files
No file under `releases/v0.6.1/` changes in the Wave D pull request.

## F07 — Published URLs
Existing `/start/`, `/deckbuilder/`, and `/rulebook/` behavior remains v0.6.1 until release cutover.

## F08 — Repository gate
The complete test, governance, source-generation, TTS, media, and candidate-propagation checks pass.
