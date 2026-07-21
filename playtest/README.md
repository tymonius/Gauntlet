# Gauntlet v0.6.0 Playtest Packet

Public tool: `https://gauntlet.run/playtest/`

This directory contains the official human-playtest collection form for the canonical v0.6.0 release.

## What the packet captures

The seven-page printable packet combines:

1. facilitator instructions and session setup;
2. matchup, outcome, and objective activity metrics;
3. faction-system, pacing, battle, victory-pressure, and recovery observations;
4. a private evaluation for Player A;
5. a private evaluation for Player B;
6. a joint debrief and physical-product review; and
7. a structured issue log and facilitator conclusion.

It is the practical companion to [`docs/Gauntlet_Playtest_Targets_and_Metrics.md`](../docs/Gauntlet_Playtest_Targets_and_Metrics.md). The testing standard defines the evidence Gauntlet needs; this packet provides a consistent way to collect it.

## Recommended use

### First-game and onboarding tests

- Use the recommended Deck for each selected Leader without modification.
- Let players use the rulebook, faction references, and printed components without strategic coaching.
- Record teach time separately from play time.
- Have each player complete the private evaluation before the joint discussion.
- Pay particular attention to whether the starter Deck's intended plan becomes apparent through play.

### Repeated balance tests

- Keep Decks, Territories, and seating order controlled unless one of them is the variable being tested.
- Test both first-player orders.
- Record exact faction-resource and progression counts where practical.
- Repeat a suspicious result before treating it as evidence of a general balance problem.

### Rules and production tests

- Record every lookup, disagreement, impossible state, and physical representation problem.
- Describe what happened before proposing replacement wording or a mechanical fix.
- Do not silently alter canonical rules during an ordinary playtest.

## Browser features

The form:

- automatically saves an unfinished draft in the current browser's local storage;
- prints as a seven-page Letter-size paper packet or PDF;
- copies a readable Markdown session report;
- downloads the complete response as structured JSON; and
- does not transmit responses automatically.

Use **Copy report** for discussion and issue filing. Use **Download JSON** when results will be aggregated across many sessions.

## Response schema

Downloaded files use:

```json
{
  "schema": "gauntlet-playtest-response",
  "schemaVersion": 1,
  "gameVersion": "v0.6.0"
}
```

Every named form field is included. Checkboxes are stored as booleans; rating groups use `1` through `5` or `N/A`.

## Interpretation rule

The packet is designed to separate:

- **observation:** what happened;
- **classification:** rules, wording, balance, pacing, agency, onboarding, components, exploit, or preference;
- **severity:** question, friction, meaningful problem, severe imbalance, or play blocker;
- **confidence:** tentative, moderate, high, or deterministic; and
- **next test:** repeat unchanged, isolate one variable, or revise before retesting.

One unusual game should not change canonical rules. A deterministic exploit, impossible resolution, or repeatable play blocker may justify immediate escalation.
