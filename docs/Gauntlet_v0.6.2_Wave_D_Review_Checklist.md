# Gauntlet v0.6.2 Wave D Review Checklist

**Tracker:** [Issue #501](https://github.com/tymonius/Gauntlet/issues/501)

## Structured data

- [ ] Effective data is derived from immutable v0.6.1 plus merged Wave A–C sources.
- [ ] Pool totals are 50 Neutral and 13 for each faction, 128 overall.
- [ ] Invasion is Military; Landslide replaces it in Neutral.
- [ ] All six genuinely new titles have exact accepted values, modes, traits, restrictions, and text.
- [ ] Every adopted inherited-card and Territory replacement is present.
- [ ] All nine Proposal outcomes use explicit roles.
- [ ] Basic/Advanced is absent as an active v0.6.2 data field.

## Candidate Start

- [ ] The shared turn and battle sequences match Wave A.
- [ ] The teaching order is shared game → own faction → opponent summary.
- [ ] Recommended first Leaders match Wave C.
- [ ] Battle zones and bound-card handling are clear on mobile.
- [ ] The selected faction/Leader hands off the exact starter to the candidate Deckbuilder.

## Candidate Deckbuilder

- [ ] The tool loads all legal Neutral-plus-faction cards from effective data.
- [ ] No Basic/Advanced filter or restriction remains.
- [ ] All twelve starters reproduce their exact card quantities and ordered Territories.
- [ ] Validation covers count, value, allegiance, uniqueness, Territories, and Arena limit.
- [ ] Non-Unique cards are not given an invented general copy ceiling.
- [ ] Print/PDF and JSON export are usable.
- [ ] The materialized canonical JSON can be downloaded.

## Generated reference

- [ ] All 128 cards render with modes and notes.
- [ ] All 25 Territories render with revised text.
- [ ] All nine Proposals render with Stake, requirement, Accepted, and Refused text.
- [ ] Search, allegiance, and value filters operate correctly.

## Release boundary

- [ ] Candidate URLs are under `/v0.6.2/`.
- [ ] Candidate pages visibly state that v0.6.1 remains canonical.
- [ ] No file under `releases/v0.6.1/` changes.
- [ ] Existing public `/start/`, `/deckbuilder/`, and `/rulebook/` remain v0.6.1.
- [ ] No unresolved Military alternate victory, Peace Treaty threshold, marker-art, or balance decision is silently changed.

## Validation

- [ ] Wave A: 63 scenarios.
- [ ] Wave B: 111 scenarios.
- [ ] Wave C: 66 scenarios.
- [ ] Wave D: 48 scenarios.
- [ ] Full repository test and artifact workflows pass.
