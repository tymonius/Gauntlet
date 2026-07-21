# Gauntlet v0.6 Development Deckbuilder

This is the developing faction-era deckbuilder. It is intentionally separate from the stable pre-faction tool under `/deckbuilder/`.

Rendered tool:

- `https://tymonius.github.io/Gauntlet/deckbuilder-v0.6/`

## Current scope

The development build supports:

- faction selection for Military, Diplomats, Inquisition, Mystics, Financiers, and Intelligence;
- both completed leaders for every faction, with leader-rule summaries;
- Neutral plus selected-faction card legality;
- live parsing of all six definitive faction-guide Markdown sources;
- card search and cost/allegiance filters;
- duplicate quantities and Unique enforcement;
- 30-card / 60-value playable-card validation;
- random valid 30-card test decks for the selected faction and leader;
- random decks containing 6–10 faction cards, no more than three copies of a non-Unique title, and no more than one copy of a Unique title;
- random selection of three different Territories, with a maximum of one Arena;
- all 25 consolidated v0.6 Territories;
- Territory search, standard/Arena filtering, previews, and playtest-watchlist display;
- exactly-three-Territory validation with a maximum of one Arena;
- selected Territories and faction supplemental packages in the Current deck display;
- Territory-aware local saves, JSON import/export, and text deck lists;
- browser Print / PDF export for the complete playable deck, Territories, selected Leader Card, and required faction supplemental cards;
- optional duplex backs for every playable card and Territory;
- local save/load/delete.

## Active runtime sources

This folder does not create canonical v0.6 release data. It reads the active working Markdown sources at runtime:

- `docs/Gauntlet_v0.6_Neutral_Card_Pool.md`
- `releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`
- `releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md`
- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`
- `releases/v0.6/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md`
- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`
- `releases/v0.6/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md`
- `docs/Gauntlet_v0.6_Territory_Pool.md`

The Territory source is the authoritative working exact-text pool, but it is not yet canonical v0.6 release JSON. The deckbuilder therefore remains explicitly versioned as a development tool.

## Random test decks

The Random deck control preserves the currently selected faction and leader, replaces the current playable cards and Territories after confirmation, and generates:

- exactly 30 playable cards;
- no more than 60 total deckbuilding value;
- a meaningful faction presence of 6–10 faction cards;
- varied card titles through a soft three-copy limit;
- normal Unique enforcement;
- exactly three different Territories;
- either no Arena or one Arena.

The generator is intended to accelerate broad playtesting rather than produce a strategically optimized deck for a specific leader.

## Print / PDF export

The Print / PDF control opens a browser-printable Letter-size package and then opens the system print dialog. The package contains:

- a deck summary and deck list;
- the selected Leader Card, including its portrait and exact leader rules;
- one printable card face for every playable-card copy in the deck;
- a full-height vertical ownership band on every playable card with an **Overlay** rules section, repeating the card name sideways so it remains visible when tucked beneath a Territory;
- the selected three Territories in landscape-reading orientation;
- every required faction tracker, reference, and supplemental card;
- standardized Noto Sans typography and 2.5 × 3.5-inch cut lines.

Enable **Print card backs** to add a mirrored reverse page for each sheet containing playable cards or Territories. Each reverse uses the same card positions as its front after long-edge duplex printing and carries **GAUNTLET** vertically in the same reading direction as the Overlay ownership bands. Leader cards and one-sided supplemental cards remain blank-backed; faction components that already have defined reverse faces retain those faces.

Faction packages render as follows:

- **Military:** selected Leader Card and shared Command Tracker;
- **Diplomats:** selected Leader Card, Influence Tracker, double-sided Reference card, nine Proposal fronts, and nine Treaty Article backs;
- **Inquisition:** selected Leader Card, Conviction Tracker, Inquisition Doctrine, and Purge Reference;
- **Mystics:** selected Leader Card, Mystics Reference, and three double-sided incomplete/completed Rite cards;
- **Financiers:** selected Leader Card, Financier Reference, public Capital Tracker, and eight full-size generic Deed Cards;
- **Intelligence:** selected Leader Card, dual Intel / Operation Progress tracker, Mission Reference, and Operations Reference.

All duplex pairs use identical 7.5 × 10.5-inch page boxes. Back-side card positions are mirrored horizontally so they align after long-edge duplex printing. Print at Actual Size / 100%, disable browser headers and footers, and choose **Flip on long edge**.

## Next implementation steps

1. Add starter-deck templates.
2. Keep supplemental manifests synchronized with definitive faction guides and faction-sheet sources.
3. Replace Markdown parsing with canonical v0.6 JSON only after the complete release data is approved.
