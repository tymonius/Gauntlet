# Gauntlet v0.6.0 Changelog

This changelog records differences from the v0.5.7 canonical release. The v0.6.0 rulebook itself describes only the current game.

## Factions

- Added six complete factions: Military, Diplomats, Financiers, Intelligence, Mystics, and Inquisition.
- Added two Leaders per faction, for twelve Leaders total.
- Added faction-specific supplemental cards, trackers, references, and victory conditions.
- Added 72 faction cards, twelve per faction.
- Established the faction color palette:
  - Military — crimson red
  - Diplomats — royal blue
  - Financiers — emerald green
  - Intelligence — charcoal/black
  - Mystics — deep violet
  - Inquisition — antique gold/ochre

## Battlefield and victory

- Retired the Heartland term and defined-area concept.
- Defined the Gauntlet as the six-Territory column.
- Players now begin immediately before their end of the Gauntlet.
- Retained the established final-battle sequence under the name Last Stand.
- Clarified that winning on the final Territory does not immediately begin the Last Stand.
- The attacker must occupy and capture the final Territory, then advance beyond it on a later Movement step.
- Renamed Homeland Advantage to Defender's Advantage.
- Defender's Advantage remains the tie rule; the Last Stand's +1 is a separate bonus.
- Standard victory is consistently called running the Gauntlet.

## Setup and Territories

- Territories are secretly arranged, then all six are revealed simultaneously during setup.
- Territories remain face up unless an effect states otherwise.
- Removed obsolete Territory exploration and voluntary-reveal rules.
- Removed hidden-Territory clauses from Counterintelligence, Scouting Report, and Command Tent.
- Updated all four Arenas to suppress Defender's Advantage rather than Homeland Advantage.

## Turn structure

- Clarified the two Action Opportunities: one before movement and one after movement.
- A player normally uses only one of those Action Opportunities each turn.
- Effects may grant additional Action Opportunities.
- Capture occurs whenever a player begins their turn occupying a Territory they do not control; no minimum occupation duration is required.

## Cards and zones

- Distinguished Deck, Playable Deck, and Draw Pile.
- Replaced battle draw terminology with Battle Hand.
- Clarified sequential battle choices: attacker commits first, defender commits second; attacker forms and chooses from their Battle Hand first, defender second.
- Cards committed from hand normally go to the Graveyard.
- Cards chosen or unchosen in a Battle Hand normally go to the Discard Pile.
- Clarified that a card's method of use determines which printed effect resolves.
- Retired Conditions as a general card category.
- Persistent cards now use Assets, Overlays, or explicitly self-tracking placement.

## Movement and control

- Clarified position, movement, withdrawal, retreat, occupation, control, and capture as separate concepts.
- Retreat is forced displacement and does not count as movement.
- Additional movement resolves one position at a time unless stated otherwise.
- When attacking an occupied Territory, the attacker moves their token into it before battle, but the defender continues to occupy it until the battle resolves.

## Overlays

- Clarified Overlay stacking.
- Only the top exposed Overlay is active; lower Overlays remain attached but dormant.
- Dormant Overlay effects and timers pause, while printed removal conditions remain active.
- Overlays normally face the same direction as their Territory and rotate with it when control changes.
- Territory control changes do not change Overlay ownership or reorder the stack.

## Card-pool audit

- Audited all 50 Neutral cards, 72 faction cards, and 25 Territories against the canonical rules language.
- Standardized Action Opportunity, Battle Hand, Draw Pile, Discard Pile, Graveyard, position, retreat, occupation, control, capture, and end-of-Gauntlet terminology.
- Removed strategy-guide material from definitive faction rules.
- Clarified Battlefield Promotion's Action timing.
- Clarified Line of Credit's half-cost ceiling as rounded down.
- Clarified Intelligence battle-choice order for Surveillance and Interference.
- Clarified Invocation and Black Covenant under the Action/Battle effect model.
- Clarified Divine Mercy requires an actual opposing Graveyard card to resolve.

## Publication and data

- Authored a new v0.6.0 rulebook from canonical Markdown rather than combining previous PDFs.
- Added full faction sections and a dedicated page for each Leader sketch.
- Added a deterministic generator for canonical JSON, the reference guide, and release manifest.
- Added automated validation for card counts, Territory counts, Leader assets, uniqueness, and retired terminology.
