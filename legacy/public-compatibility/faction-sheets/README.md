# Gauntlet v0.6 Faction Sheets

**Status:** Retired compatibility surface retained for historical links and regression coverage.

These browser-printable sheets preserve an earlier faction-era print workflow. They are **not current authoring sources or current gameplay authority**. New printable packages should come from the current Deckbuilder and current production renderers. Compatibility fixes may still be made when needed to keep preserved pages coherent, but new product behavior does not belong here.

Some regression tests intentionally read these files to ensure retired player-facing copy does not drift into contradictory terminology. That dependency is compatibility coverage, not evidence that this directory is current source.

## Preserved sheets

- [Open the rendered Military faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/military.html) — twelve Military cards, General, Commandant, and the sliding Command tracker.
- [Open the rendered Diplomat faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/diplomat.html) — twelve Diplomat cards, both leaders, Proposal / Treaty Article cards, references, and the sliding Influence tracker.
- [Open the rendered Inquisition faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/inquisition.html) — twelve Inquisition cards, Grand Inquisitor, Witch Hunter, two references, and the sliding Conviction tracker.
- [Open the rendered Mystics faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/mystics.html) — twelve Mystics cards, Alchemist, Spirit Walker, the Mystics Reference, three incomplete Rite faces, and three mirrored completed Rite backs.
- [Open the rendered Financier faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/financier.html) — twelve Financier cards, Banker, Executive, the Financier Reference, a reusable Capital Ledger, and eight full-size generic Deed cards.
- [Open the rendered Intelligence faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/intelligence.html) — twelve Intelligence cards, Ranger, Spymaster, two references, a sliding Intel Tracker, and a sliding Operation Progress Tracker.

Use the rendered GitHub Pages links rather than GitHub's source-code view.

## Printing

1. Open the rendered sheet, or serve the repository locally and open the corresponding file under `/faction-sheets/`.
2. Print at **100% scale** on Letter paper.
3. Disable browser headers and footers.
4. Enable background graphics.
5. Cut cards to **2.5 × 3.5 inches**.

The sheets use a 3 × 3 grid. Supplemental cards are open information and do not use the normal playable-card back. Mystics page 1 is single-sided; pages 2 and 3 are aligned for long-edge duplex printing so the three incomplete Rites pair with their mirrored completed backs.

## Trackers, ledgers, and ownership cards

Military, Diplomats, and Inquisition place their sliding tracker beneath the selected Leader Card. The Leader Card's bottom edge indicates the current value.

- At **0**, align both cards so the tracker is fully covered.
- Slide the covering card upward until its bottom edge aligns with the current numbered line.
- No token or marker is used.

Military tracks **0–2 Command**. Diplomats track **0–10 Influence**. Inquisition tracks **0–4 Conviction**.

Intelligence uses two sliding tracker stacks:

- place the **Intel Tracker** beneath the **Operations Reference Card**;
- place the **Operation Progress Tracker** beneath the **Mission Reference Card**;
- fully cover each tracker at 0, then slide its paired Reference Card upward until the lower edge aligns with the current value.

The printed Intelligence ranges are **Intel 0–20** and **Operation Progress 0–8**. Those printed ranges are not resource maximums, but ordinary play requires no markers.

Financiers use a reusable **Capital Ledger** rather than a marker. Record every gain, spend, loss, and end-turn reduction as a transaction; the last Balance entry is current Capital. Record the current Capital limit in the separate field. Keep the eight full-size generic **Deed Cards** in a shared supply, place one beside a Territory on its owner's side when purchased, move it across on buyout, and return it to the supply when made unowned.

Mystics use no tracker or ledger. Completed Rites are flipped to their completed faces and remain public.

## Historical sources for these preserved sheets

- `releases/v0.6.0/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md` — definitive Military rules, leaders, components, and playable-card text. The Military sheets are derived from this guide.
- `releases/v0.6.0/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md` — definitive Diplomat rules, leaders, Proposals, references, tracker, and playable-card text. The Diplomat sheets are derived from this guide.
- `releases/v0.6.0/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` — definitive Inquisition rules, leaders, references, tracker, and playable-card text. The Inquisition sheets are derived from this guide.
- `releases/v0.6.0/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md` — definitive Mystics rules, leaders, Rites, reference, and playable-card text. The Mystics sheets are derived from this guide.
- `releases/v0.6.0/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md` — definitive Financier rules, leaders, Capital, Treasury, Deeds, reference, Capital Ledger, Deed-card requirements, and playable-card text. The Financier sheets are derived from this guide.
- `releases/v0.6.0/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md` — definitive Intelligence rules, leaders, Missions, references, trackers, and playable-card text. The Intelligence sheets are derived from this guide.
- `releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.md` — canonical shared rules.
- `docs/Gauntlet_v0.6_Leader_Design_Bible.md` — leader art direction.

The HTML is preserved rendering/compatibility material, not independent canonical game data. Current gameplay authority lives in `game-data/current-game.json`; do not use these sheets to reconstruct current rules.
