# Gauntlet v0.6 Condition Audit

**Status:** Active post-review cleanup pass  
**Source baseline:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## Guiding rule

Conditions are not being removed mechanically. Prefer:

- an **Asset** for a player-owned persistent effect that should compete for Asset-bank capacity;
- an **Overlay** for an effect attached to a Territory;
- immediate resolution when no persistent component is needed;
- a **Condition** only when neither Asset nor Overlay represents the timing and ownership cleanly.

Any conversion must preserve pacing, counterplay, visibility, and the intended cost of persistence.

## Already resolved

The following v0.5.7 Condition uses were removed or converted during card review:

- **Protracted Siege** — Asset that becomes a Territory Overlay.
- **Redemption** — expendable Asset.
- **Reinforcements** — expendable Asset.
- **Sabotage** — resolves immediately; the target Asset's face-down state tracks duration.
- **Scorched Earth** — Asset that becomes a Ruins Overlay.
- **Shock and Awe** — prepared Asset.
- **Stand Ground** — expendable Asset.
- **Supplies** — one-use Asset.
- **Tariffs** — temporary Asset with delayed penalty.
- **Treason** — expendable Asset.

## Pending review now

1. **Armistice**
2. **Assimilation**
3. **Capital Punishment**
4. **Court Martial**
5. **Disruption** (source card: Embargo)
6. **Palisade Wall**

## Deferred until faction-card redesign

- **Blockade / Sanctions** — exact Diplomat implementation remains unresolved.
- **Capital Gains** — payoff must first be reconnected to Financier infrastructure.

## Workflow

Review the six current candidates in source order. For each card:

1. decide whether Condition remains the cleanest representation;
2. if not, choose Asset, Overlay, or immediate resolution;
3. preserve the previously approved card identity and balance direction;
4. log the approved result here and in the consolidated card sources at rollup.
