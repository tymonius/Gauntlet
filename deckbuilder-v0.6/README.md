# Gauntlet v0.6 Development Deckbuilder

This is the developing faction-era deckbuilder. It is intentionally separate from the stable pre-faction tool under `/deckbuilder/`.

Rendered tool:

- `https://tymonius.github.io/Gauntlet/deckbuilder-v0.6/`

## Current scope

The first scaffold supports:

- faction selection for Military, Diplomats, and Inquisition;
- leader selection and leader-rule summaries;
- Neutral plus selected-faction card legality;
- live parsing of active Markdown card sources;
- card search and cost/allegiance filters;
- duplicate quantities and Unique enforcement;
- 30-card / 60-value playable-card validation;
- local save/load/delete;
- JSON import/export;
- text deck-list copy.

Arcane, Financiers, and Intelligence appear as disabled development placeholders.

## Deliberate omissions

Territory selection and print/PDF export are not included yet. The Territory reviews are complete, but no consolidated canonical v0.6 Territory dataset exists. This tool must not silently treat historical v0.5.7 data as final v0.6 data.

Likewise, this folder does not create canonical v0.6 data. It reads the active Markdown sources at runtime:

- `docs/Gauntlet_v0.6_Neutral_Card_Pool.md`
- `releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`
- `docs/Gauntlet_v0.6_Diplomat_Card_Pool.md`
- `docs/Gauntlet_v0.6_Inquisition_Card_Pool.md`

This keeps the development tool synchronized while the remaining faction packages and cross-card rules are unresolved.

## Next implementation steps

1. Add a consolidated v0.6 Territory source and Territory validation.
2. Add faction supplemental-component manifests for leaders, references, trackers, Orders, Proposals, and Purge materials.
3. Add print/PDF rendering for playable cards and required supplemental components.
4. Add starter-deck templates and random test-deck generation.
5. Replace Markdown parsing with canonical v0.6 JSON only after the complete release data is approved.
