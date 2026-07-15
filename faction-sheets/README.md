# Gauntlet v0.6 Faction Sheets

**Status:** Working print-and-play sources for developing v0.6 faction packages and supplemental cards.

These browser-printable sheets are separate from the versioned v0.5 deckbuilder. They may use active v0.6 exact-text documents before canonical v0.6 data exists.

## Available sheets

- [Open the rendered Military faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/military.html) — the twelve-card Military faction pool, General, Commandant, and the shared sliding Command tracker.
- [Open the rendered Diplomat faction sheets](https://tymonius.github.io/Gauntlet/faction-sheets/diplomat.html) — the twelve-card Diplomat faction pool, Ambassador, Senator, all nine Proposal / Treaty Article pairs, both reference faces, and the shared 0–10 sliding Influence Tracker.

Do not open the HTML files through GitHub's repository file viewer when you want to print them. GitHub displays repository HTML as source code. Use the rendered GitHub Pages links above, or serve the repository locally.

## Printing

1. Open a rendered link above, or serve the repository from its root with `python3 -m http.server 8000` and open the relevant file under `/faction-sheets/`.
2. Print at **100% scale** on Letter paper.
3. Disable browser headers and footers.
4. Enable background graphics.
5. Cut cards to **2.5 × 3.5 inches**.

The sheets use a 3 × 3, nine-card page grid. Supplemental cards are open-information references and do not use the normal playable-card back.

## Diplomat duplex pages

The Diplomat package renders four pages:

1. nine playable cards;
2. three playable cards, both leaders, both reference faces, and the Influence Tracker;
3. nine Proposal fronts;
4. nine Treaty Article backs.

Pages 3 and 4 are prepared for **long-edge duplex printing**. The Treaty Article page is horizontally mirrored so each numbered back aligns with its Proposal front. Pair the two reference faces back-to-back after cutting or sleeving.

## Military Command tracker

Place the Command tracker directly beneath the selected Military Leader Card:

- fully aligned and covered: **0 Command**;
- slide the Leader upward until its lower edge reaches the first line: **1 Command**;
- slide it to the second line: **2 Command**.

The Leader Card itself is the indicator. No separate Command marker is required.

## Diplomat Influence tracker

Place the Influence Tracker directly beneath the selected Diplomat Leader Card:

- fully aligned and covered: **0 Influence**;
- slide the Leader upward until its lower edge aligns with the current numbered line: **1–10 Influence**.

Diplomats begin at 1 Influence. To stake or spend Influence, lower the displayed value. When a stake is returned or recovered, raise it again. The offered Proposal lists the current stake, so no separate Influence or stake tokens are used.

## Sources of truth

- `docs/Gauntlet_v0.6_Military_Card_Pool.md` governs playable Military exact text.
- `docs/Gauntlet_v0.6_Military_Supplemental_Cards.md` governs the Military leader and tracker component specification.
- `docs/Gauntlet_v0.6_Diplomat_Card_Pool.md` governs playable Diplomat exact text.
- `docs/Gauntlet_v0.6_Diplomat_Supplemental_Cards.md` governs the Diplomat leaders, Proposals, references, and tracker specification.
- `docs/Gauntlet_v0.6_Working_Rules.md` governs shared faction mechanics and general rules.
- `docs/Gauntlet_v0.6_Leader_Design_Bible.md` governs leader art direction.

The HTML is a production rendering source, not independent canonical game data. When rules text changes, update the authoritative document first and then synchronize the sheet.
