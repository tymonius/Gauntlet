# Gauntlet v0.6 Development Deckbuilder

This is the developing faction-era deckbuilder. It is intentionally separate from the stable pre-faction tool under `/deckbuilder/`.

Rendered tool:

- `https://tymonius.github.io/Gauntlet/deckbuilder-v0.6/`

## Current scope

The development build supports:

- faction selection for Military, Diplomats, and Inquisition;
- leader selection and leader-rule summaries;
- Neutral plus selected-faction card legality;
- live parsing of active Markdown card sources;
- card search and cost/allegiance filters;
- duplicate quantities and Unique enforcement;
- 30-card / 60-value playable-card validation;
- all 25 consolidated v0.6 Territories;
- Territory search, standard/Arena filtering, previews, and playtest-watchlist display;
- exactly-three-Territory validation with a maximum of one Arena;
- selected Territories in the Current deck display;
- Territory-aware local saves, JSON import/export, and text deck lists;
- local save/load/delete.

Arcane, Financiers, and Intelligence appear as disabled development placeholders.

## Active runtime sources

This folder does not create canonical v0.6 release data. It reads the active working Markdown sources at runtime:

- `docs/Gauntlet_v0.6_Neutral_Card_Pool.md`
- `releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`
- `docs/Gauntlet_v0.6_Diplomat_Card_Pool.md`
- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`
- `docs/Gauntlet_v0.6_Territory_Pool.md`

The Territory source is the authoritative working exact-text pool, but it is not yet canonical v0.6 release JSON. The deckbuilder therefore remains explicitly versioned as a development tool.

## Deliberate omission

Print/PDF export is not included yet. It should eventually render:

- playable Neutral and faction cards;
- the selected three Territories;
- the chosen Leader Card;
- required faction references, trackers, Proposals, Orders, or other supplemental components.

## Next implementation steps

1. Add faction supplemental-component manifests for leaders, references, trackers, Orders, Proposals, and Purge materials.
2. Add print/PDF rendering for playable cards, Territories, and required supplemental components.
3. Add starter-deck templates and random test-deck generation.
4. Add completed Arcane, Financier, and Intelligence packages as their exact-text sources stabilize.
5. Replace Markdown parsing with canonical v0.6 JSON only after the complete release data is approved.
