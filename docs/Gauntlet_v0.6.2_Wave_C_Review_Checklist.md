# Gauntlet v0.6.2 Wave C Review Checklist

Use this checklist when reviewing the starter Deck and first-game source set.

## Source boundary

- [ ] Published v0.6.1 files are unchanged.
- [ ] The Wave C starter catalog is a candidate source and does not replace the live Deckbuilder catalog yet.
- [ ] Waves A and B remain authoritative for rules and component behavior.

## Starter construction

- [ ] All twelve faction / Leader pairs are present exactly once.
- [ ] Every starter has 30 playable cards and total value 60.
- [ ] Every card is legal for the selected faction.
- [ ] Unique cards appear no more than once.
- [ ] Recommended quantities do not exceed three copies for a non-Unique title.
- [ ] No starter eligibility or Territory choice depends on a retired binary classification.
- [ ] Each starter contains at least twelve faction-card copies.
- [ ] Each starter contains its four listed signature cards.
- [ ] Each starter has no more than nine singleton titles.
- [ ] Each Territory set contains three different Territories and no more than one Arena.

## Strategy and consistency

- [ ] Each Deck expresses the selected Leader rather than only the faction generally.
- [ ] The Opening plan and first-game tip match the exact card list.
- [ ] Each early-plan package contains at least eight copies.
- [ ] Opening-Hand access is at least 60%.
- [ ] Access within the first five cards is at least 80%.
- [ ] The seven new v0.6.2 cards each appear in at least one appropriate starter.
- [ ] Advanced interactions are concentrated around the Deck's primary plan rather than scattered as unrelated one-offs.

## Teaching sequence

- [ ] The shared game is demonstrated before faction detail.
- [ ] The turn and battle sequences match Wave A.
- [ ] Fall Back, withdrawal, and retreat are distinct.
- [ ] Occupation and later Front Line Capture are demonstrated separately.
- [ ] Hand, Gambit, Reserve, and Tactic are physically separated.
- [ ] The bound-card diagram states that bound cards are outside normal zones and follow the binding effect.
- [ ] The active-player marker carries only turn ownership and the six-step sequence.

## Faction presentation

- [ ] Every faction card uses the same information order.
- [ ] Every faction explains aim, resource or progression, Faction Actions, Faction Abilities, additional victory, Leaders, starter Decks, and opponent watch text.
- [ ] Exactly one recommended first Leader is identified per faction.
- [ ] Opponent summaries contain public decision information rather than the full faction guide.
- [ ] Introductory pairings are teaching recommendations, not balance claims or restrictions.

## Validation

- [ ] All 66 Wave C scenarios are present and unique.
- [ ] The Wave C validator is included in `npm test`.
- [ ] The validator checks effective v0.6.2 card legality, pool migration, exact totals, signatures, consistency thresholds, teaching text, and scenario completeness.
- [ ] The full repository test and governance workflows pass.
