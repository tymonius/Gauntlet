# Gauntlet v0.6 Faction Sheets

**Status:** Working print-and-play sources for developing v0.6 faction packages and supplemental cards.

These browser-printable sheets are separate from the versioned v0.5 deckbuilder. They may use active v0.6 exact text before canonical v0.6 data exists.

## Available sheets

- [Open the rendered Military faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/military.html) — twelve Military cards, General, Commandant, and the sliding Command tracker.
- [Open the rendered Diplomat faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/diplomat.html) — twelve Diplomat cards, both leaders, Proposal / Treaty Article cards, references, and the sliding Influence tracker.
- [Open the rendered Inquisition faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/inquisition.html) — twelve Inquisition cards, Grand Inquisitor, Witch Hunter, two references, and the sliding Conviction tracker.
- [Open the rendered Mystics faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/mystics.html) — twelve Mystics cards, Alchemist, Spirit Walker, the Mystics Reference, three incomplete Rite faces, and three mirrored completed Rite backs.
- [Open the rendered Financier faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/financier.html) — twelve Financier cards, Banker, Executive, the Financier Reference, a public Capital Tracker, and eight full-size generic Deed cards.
- [Open the rendered Intelligence faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/intelligence.html) — twelve Intelligence cards, Ranger, Spymaster, two references, and the dual Intel / Operation Progress tracker.

Use the rendered GitHub Pages links rather than GitHub's source-code view.

## Printing

1. Open the rendered sheet, or serve the repository locally and open the corresponding file under `/faction-sheets/`.
2. Print at **100% scale** on Letter paper.
3. Disable browser headers and footers.
4. Enable background graphics.
5. Cut cards to **2.5 × 3.5 inches**.

The sheets use a 3 × 3 grid. Supplemental cards are open information and do not use the normal playable-card back. Mystics page 1 is single-sided; pages 2 and 3 are aligned for long-edge duplex printing so the three incomplete Rites pair with their mirrored completed backs.

## Trackers and ownership cards

Place a sliding tracker beneath the selected Leader Card. The Leader Card's bottom edge indicates the current value.

- At **0**, align both cards so the tracker is fully covered.
- Slide the Leader upward until its bottom edge aligns with the current numbered line.
- No token or marker is used.

Military tracks **0–2 Command**. Diplomats track **0–10 Influence**. Inquisition tracks **0–4 Conviction**. Intelligence uses a dual printed track for **Intel 0–20** and **Operation Progress 0–8** with separate cut-out markers; those printed ranges are not resource maximums.

Financiers use a public **Capital Tracker** and eight full-size generic **Deed Cards**. Keep the Deeds in a shared supply, place one beside a Territory on its owner's side when purchased, move it across on a buyout, and return it to the supply when made unowned.

Mystics use no tracker or ledger. Completed Rites are flipped to their completed faces and remain public.

## Sources of truth

- `releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md` — definitive Military rules, leaders, components, and playable-card text. The Military sheets are derived from this guide.
- `releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md` — definitive Diplomat rules, leaders, Proposals, references, tracker, and playable-card text. The Diplomat sheets are derived from this guide.
- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` — definitive Inquisition rules, leaders, references, tracker, and playable-card text. The Inquisition sheets are derived from this guide.
- `releases/v0.6/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md` — definitive Mystics rules, leaders, Rites, reference, and playable-card text. The Mystics sheets are derived from this guide.
- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md` — definitive Financier rules, leaders, Capital, Treasury, Deeds, reference, Capital Tracker, Deed-card requirements, and playable-card text. The Financier sheets are derived from this guide.
- `releases/v0.6/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md` — definitive Intelligence rules, leaders, Missions, references, tracker, and playable-card text. The Intelligence sheets are derived from this guide.
- `releases/v0.6/Gauntlet_v0.6.0_Rulebook.md` — canonical shared rules.
- `docs/Gauntlet_v0.6_Leader_Design_Bible.md` — leader art direction.

The HTML is a rendering source, not independent canonical game data. Update authoritative text first, then synchronize the sheets.
