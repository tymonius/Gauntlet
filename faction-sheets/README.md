# Gauntlet v0.6 Faction Sheets

**Status:** Working print-and-play sources for developing v0.6 faction packages and supplemental cards.

These browser-printable sheets are separate from the versioned v0.5 deckbuilder. They may use active v0.6 exact text before canonical v0.6 data exists.

## Available sheets

- [Open the rendered Military faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/military.html) — twelve Military cards, General, Commandant, and the sliding Command tracker.
- [Open the rendered Diplomat faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/diplomat.html) — twelve Diplomat cards, both leaders, Proposal / Treaty Article cards, references, and the sliding Influence tracker.
- [Open the rendered Inquisition faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/inquisition.html) — twelve Inquisition cards, Grand Inquisitor, Witch Hunter, two references, and the sliding Conviction tracker.

Use the rendered GitHub Pages links rather than GitHub's source-code view.

## Printing

1. Open the rendered sheet, or serve the repository locally and open the corresponding file under `/faction-sheets/`.
2. Print at **100% scale** on Letter paper.
3. Disable browser headers and footers.
4. Enable background graphics.
5. Cut cards to **2.5 × 3.5 inches**.

The sheets use a 3 × 3 grid. Supplemental cards are open information and do not use the normal playable-card back.

## Sliding trackers

Place the tracker beneath the selected Leader Card. The Leader Card's bottom edge indicates the current value.

- At **0**, align both cards so the tracker is fully covered.
- Slide the Leader upward until its bottom edge aligns with the current numbered line.
- No token or marker is used.

Military tracks **0–2 Command**. Diplomats track **0–10 Influence**. Inquisition tracks **0–4 Conviction**.

## Sources of truth

- `releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md` — definitive Military rules, leaders, components, and playable-card text. The Military sheets are derived from this guide.
- `docs/Gauntlet_v0.6_Diplomat_Card_Pool.md` — Diplomat playable-card text.
- `docs/Gauntlet_v0.6_Diplomat_Supplemental_Cards.md` — Diplomat leaders, Proposals, references, and tracker.
- `docs/Gauntlet_v0.6_Inquisition_Card_Pool.md` — Inquisition playable-card text.
- `docs/Gauntlet_v0.6_Inquisition_Supplemental_Cards.md` — Inquisition leaders, references, and tracker.
- `docs/Gauntlet_v0.6_Working_Rules.md` — shared rules.
- `docs/Gauntlet_v0.6_Leader_Design_Bible.md` — leader art direction.

The HTML is a rendering source, not independent canonical game data. Update authoritative text first, then synchronize the sheets.
