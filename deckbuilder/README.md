# Gauntlet v0.6.0 Deckbuilder

The browser Deckbuilder for the canonical Gauntlet v0.6.0 playtest release.

Rendered tool:

- `https://gauntlet.run/deckbuilder/`

The former `https://gauntlet.run/deckbuilder-v0.6/` address remains as a compatibility redirect to the canonical URL.

## Recommended starter Decks

The Deckbuilder includes one complete recommended first-game Deck for each of the twelve faction Leaders.

Each preset contains:

- exactly 30 playable cards;
- exactly 60 total deckbuilding value;
- only Basic Neutral cards;
- exactly three different Basic Territories, with no more than one Arena;
- an ordered Territory line;
- a short explanation of the Deck's plan; and
- a first-game tip for the selected Leader.

Choose a faction and Leader, then select **Load recommended deck**. The loaded Deck can be modified, saved, exported, copied as text, or printed immediately with its Leader and all required supplemental components. When the current Deck still exactly matches the pre-built preset, its strategy summary, first-game tip, and recommended Territory order from the player's end outward are also printed in the top informational section before the cards.

The presets are designed for onboarding and broad playtesting. They are recommended starting points, not claims of optimal competitive construction.

## Current scope

The Deckbuilder supports:

- all six factions and twelve Leaders, with Leader-rule summaries;
- twelve validated recommended starter Decks;
- Neutral plus selected-faction card legality;
- live parsing of all six definitive faction-guide Markdown sources;
- card search and cost/allegiance filters;
- duplicate quantities and Unique enforcement;
- 30-card / 60-value playable-card validation;
- random valid 30-card test Decks for the selected faction and Leader;
- random Decks containing 6–10 faction cards, no more than three copies of a non-Unique title, and no more than one copy of a Unique title;
- all 25 canonical v0.6.0 Territories;
- Territory search, standard/Arena filtering, previews, and watchlist display;
- exactly-three-Territory validation with a maximum of one Arena;
- selected Territories and faction supplemental packages in the Current deck display;
- Territory-aware local saves, JSON import/export, and text Deck lists;
- browser Print / PDF export for the complete playable Deck, Territories, selected Leader Card, and required faction supplemental cards;
- optional duplex backs for every playable card and Territory; and
- local save/load/delete.

## Runtime sources

The browser tool reads the canonical Markdown sources at runtime so card and Territory text remains synchronized with the release:

- `docs/Gauntlet_v0.6_Neutral_Card_Pool.md`
- `releases/v0.6.0/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`
- `releases/v0.6.0/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md`
- `releases/v0.6.0/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`
- `releases/v0.6.0/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md`
- `releases/v0.6.0/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`
- `releases/v0.6.0/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md`
- `docs/Gauntlet_v0.6_Territory_Pool.md`

Recommended starter compositions live in `deckbuilder/starter-decks.json`. The repository test command validates them against `releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json`.

## Random test Decks

The **Random deck** control preserves the selected faction and Leader, replaces the current playable cards and Territories after confirmation, and generates:

- exactly 30 playable cards;
- no more than 60 total deckbuilding value;
- a faction presence of 6–10 cards;
- varied titles through a soft three-copy limit;
- normal Unique enforcement;
- exactly three different Territories; and
- either no Arena or one Arena.

The random generator accelerates broad playtesting. Use the recommended starter preset for a coherent first-game strategy.

## Print / PDF export

The **Print / PDF** control opens a browser-printable Letter-size package and then opens the system print dialog. The package contains:

- a Deck summary and list;
- the starter strategy summary, first-game tip, and recommended Territory order when the current Deck exactly matches a pre-built starter preset;
- the selected Leader Card, including portrait and exact Leader rules;
- one printable face for every playable-card copy;
- the selected three Territories in their saved order;
- every required faction tracker, reference, and supplemental card; and
- standardized 2.5 × 3.5-inch cut lines.

Enable **Print card backs** to add mirrored reverse pages for playable cards and Territories. Print at Actual Size / 100%, disable browser headers and footers, and choose **Flip on long edge** for duplex pages.

Faction packages render as follows:

- **Military:** selected Leader Card and shared Command Tracker;
- **Diplomats:** selected Leader Card, Influence Tracker, double-sided Reference card, nine Proposal fronts, and nine Treaty Article backs;
- **Financiers:** selected Leader Card, Financier Reference, Capital Tracker, and eight generic Deed Cards;
- **Intelligence:** selected Leader Card, Mission Reference, Operations Reference, sliding Intel Tracker, and sliding Operation Progress Tracker;
- **Mystics:** selected Leader Card, Mystics Reference, and three double-sided Rite cards; and
- **Inquisition:** selected Leader Card, Conviction Tracker, Doctrine Reference, and Purge Reference.
