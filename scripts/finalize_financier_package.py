from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, content):
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label, flags=re.S):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    return updated


def update_readme():
    path = "README.md"
    text = read(path)
    text = replace_once(text, "- **Completed faction pools:** Military, Diplomats, and Inquisition", "- **Completed faction pools:** Military, Diplomats, Inquisition, and Financiers", "README completed pools")
    text = replace_once(text, "- **Definitive faction guides:** Military, Diplomats, and Inquisition are packaged in Markdown, DOCX, and PDF under `releases/v0.6/faction-guides/`", "- **Definitive faction guides:** Military, Diplomats, Inquisition, and Financiers are packaged in Markdown, DOCX, and PDF under `releases/v0.6/faction-guides/`", "README guides")
    text = replace_once(text, "- **v0.6 deckbuilder:** live and reading the active Neutral, Military, Diplomat, Inquisition, and Territory Markdown sources", "- **v0.6 deckbuilder:** live and reading the active Neutral, Military, Diplomat, Inquisition, Financier, and Territory Markdown sources", "README deckbuilder")
    financier_package = """
The definitive Financier package is:

- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`
- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.docx`
- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.pdf`

The Markdown file is the definitive Financier source. The DOCX and PDF are matching release-formatted editions.

"""
    text = replace_once(text, "The Markdown file is the definitive Inquisition source. The DOCX and PDF are matching release-formatted editions.\n\n### `docs/`", "The Markdown file is the definitive Inquisition source. The DOCX and PDF are matching release-formatted editions.\n\n" + financier_package + "### `docs/`", "README Financier package")
    text = replace_once(text, "- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` — definitive Inquisition rules, leaders, components, strategy, and exact card pool;\n- `docs/card-reviews/STATUS.md`", "- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` — definitive Inquisition rules, leaders, components, strategy, and exact card pool;\n- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md` — definitive Financier rules, leaders, Capital, Treasury, Deeds, components, strategy, and exact card pool;\n- `docs/card-reviews/STATUS.md`", "README source list")
    text = replace_once(text, "The Military, Diplomat, and Inquisition sheets are derived production files governed by their definitive faction guides.", "The Military, Diplomat, and Inquisition sheets are derived production files governed by their definitive faction guides. The Financier definitive guide is complete; its dedicated browser-printable sheet remains a separate production task.", "README sheets")
    write(path, text)


def update_deckbuilder_readme():
    path = "deckbuilder-v0.6/README.md"
    text = read(path)
    text = replace_once(text, "- faction selection for Military, Diplomats, and Inquisition;", "- faction selection for Military, Diplomats, Inquisition, and Financiers;", "deckbuilder faction scope")
    text = replace_once(text, "Mystics, Financiers, and Intelligence appear as disabled development placeholders.", "Mystics and Intelligence appear as disabled development placeholders.", "deckbuilder placeholders")
    text = replace_once(text, "- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`\n- `docs/Gauntlet_v0.6_Territory_Pool.md`", "- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`\n- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`\n- `docs/Gauntlet_v0.6_Territory_Pool.md`", "deckbuilder sources")
    text = replace_once(text, "- **Inquisition:** selected Leader Card, Conviction Tracker, Inquisition Doctrine, and Purge Reference.", "- **Inquisition:** selected Leader Card, Conviction Tracker, Inquisition Doctrine, and Purge Reference.\n- **Financiers:** selected Leader Card with Capital, Treasury, Deed, Play the Market, Subsidize, and Controlling Interest reference text.", "deckbuilder packages")
    text = replace_once(text, "2. Add the completed Mystics, Financiers, and Intelligence packages as their exact-text sources stabilize.", "2. Add the completed Mystics and Intelligence packages as their exact-text sources stabilize.", "deckbuilder next steps")
    write(path, text)


def update_deckbuilder_app():
    path = "deckbuilder-v0.6/app.js"
    text = read(path)
    source_old = '''  inquisition: {
    label: "Inquisition",
    path: "../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md",
    start: "## 6. Canonical Inquisition card pool",
    end: "## 7. Card-pool summary",
    headingLevel: 3
  }
};'''
    source_new = '''  inquisition: {
    label: "Inquisition",
    path: "../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md",
    start: "## 6. Canonical Inquisition card pool",
    end: "## 7. Card-pool summary",
    headingLevel: 3
  },
  financiers: {
    label: "Financiers",
    path: "../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md",
    start: "## 6. Canonical Financier card pool",
    end: "## 7. Card-pool summary",
    headingLevel: 3
  }
};'''
    text = replace_once(text, source_old, source_new, "deckbuilder Financier source")
    faction_old = '''  {
    id: "financiers",
    name: "Financiers",
    status: "developing",
    identity: "Capital, Treasury, Deeds, and Controlling Interest.",
    resource: "In development",
    victory: "Controlling Interest — in development.",
    leaders: [{ id: "banker", name: "Banker" }, { id: "executive", name: "Executive" }]
  },'''
    faction_new = '''  {
    id: "financiers",
    name: "Financiers",
    status: "ready",
    identity: "Capital, Treasury, Deeds, leverage, income, and Controlling Interest.",
    resource: "Capital (dynamic limit)",
    victory: "Controlling Interest: own the Deeds to every Territory in the Gauntlet.",
    leaders: [
      {
        id: "banker",
        name: "Banker",
        tagline: "Credit closes the distance.",
        role: "Collateral · Purchase timing · Flexible financing",
        rules: [
          ["Capital limit", "Territories you control plus the total value of cards in your Treasury."],
          ["Treasury", "Instead of playing an Action card after movement, place one card from hand face up in Treasury."],
          ["Line of Credit", "The first Deed purchase or buyout each turn may use one hand or Treasury card as collateral, contributing its value up to half the cost before being discarded."],
          ["Controlling Interest", "Immediately win when you own the Deeds to every Territory currently in the Gauntlet."]
        ]
      },
      {
        id: "executive",
        name: "Executive",
        tagline: "Take the ground. Close the deal.",
        role: "Offense · Occupation · Immediate control",
        rules: [
          ["Capital limit", "Territories you control plus the total value of cards in your Treasury."],
          ["Treasury", "Instead of playing an Action card after movement, place one card from hand face up in Treasury."],
          ["Hostile Takeover", "After winning a battle that caused you to occupy enemy Territory, use the after-movement Action opportunity to buy that Deed at occupied cost; success immediately gives you control."],
          ["Controlling Interest", "Immediately win when you own the Deeds to every Territory currently in the Gauntlet."]
        ]
      }
    ]
  },'''
    text = replace_once(text, faction_old, faction_new, "deckbuilder Financier faction")
    write(path, text)


def update_working_rules():
    path = "docs/Gauntlet_v0.6_Working_Rules.md"
    text = read(path)
    extra_actions = '''- A card may prohibit or delay its own voluntary removal.

### Extra actions

When an effect tells a player to **take an extra action**, it grants one additional Action opportunity that turn.

- It may be used for anything the player could normally do instead of playing an Action card, including a faction action or voluntary Asset removal.
- It does not grant additional movement unless an effect specifically says so.

### Persistent playable-card effects'''
    text = replace_once(text, "- A card may prohibit or delay its own voluntary removal.\n\n### Persistent playable-card effects", extra_actions, "Working Rules extra actions")
    financier_section = '''## 13. Financiers

**Definitive faction source:** `../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`  
**Identity:** Treasury, investment, ownership, Capital, leverage, and delayed payoff.  
**Resource:** Capital. Capital cannot fall below 0.

### Capital limit

Capital limit equals:

> Territories you control + total deckbuilding value of cards in your Treasury

Heartlands do not count. Capital may temporarily exceed the limit during a turn, but excess is lost at the end of that turn.

### Treasury

During the Action phase after movement, instead of playing an Action card, place one card from hand face up in the Treasury.

Treasury cards are outside every normal zone and cannot be played or affected unless a rule specifically refers to Treasury. Each contributes its deckbuilding value to the Capital limit. Treasury does not use Asset-bank capacity.

### Deeds

Each Territory has one Deed. A Deed may be unowned or owned by a Financier. Heartlands have no Deeds.

During the Action phase after movement, instead of playing an Action card, buy one Deed by spending Capital. An opposing Financier's Deed may be bought out and transferred.

### Deed cost

> Deed cost = min(Deeds you own + 1, 6) + position modifier + buyout premium

Minimum cost: 1 Capital.

| Territory state from buyer's perspective | Modifier |
|---|---:|
| You control it | -1 |
| You occupy but do not control it | 0 |
| You neither control nor occupy it | +1 |

Buyout premium is 0 for an unowned Deed. For a Deed owned by an opposing Financier:

> Buyout premium = min(Deeds the opposing owner owns, 6)

A Territory added to the Gauntlet, including Manifest Destiny, is a normal Territory with a Deed unless its effect says otherwise. It counts normally for income, Capital and Asset limits, and Controlling Interest.

### Income and victory

At the start of your turn, after captures, gain 1 Capital per Deed you own.

When you own the Deeds to all Territories currently in the Gauntlet, immediately win by **Controlling Interest**.

### Play the Market

During the Action phase after movement, instead of playing an Action card, discard one card from hand and roll:

| Roll | Result |
|---:|---|
| 1 | Send the card to the Graveyard; gain 0 Capital. |
| 2–3 | Gain 1 Capital. |
| 4–5 | Gain Capital equal to the card's value. |
| 6 | Gain Capital equal to twice the card's value. |

### Subsidize

Before dice are rolled in a battle involving you, spend Capital for a battle bonus:

| Bonus | Total cost |
|---:|---:|
| +1 | 1 |
| +2 | 3 |
| +3 | 6 |
| +4 | 10 |

The progression may continue without a fixed maximum; each additional +1 costs more than the last.

### Banker

**Line of Credit:** The first time on your turn that you would buy or buy out a Deed, you may use one card from hand or Treasury as collateral.

- Collateral contributes Capital equal to its deckbuilding value.
- It cannot fund more than half the purchase cost.
- Hand collateral is revealed and discarded after purchase.
- Treasury collateral moves to discard after purchase.
- Unused value is lost.
- It applies only to Deed purchases and buyouts, not Subsidize.

### Executive

**Hostile Takeover:** During the Action phase after movement, instead of playing an Action card, if you won a battle this turn that caused you to occupy an enemy Territory, you may buy that Territory's Deed.

Treat it as occupied but not controlled for cost. Normal buyout premiums apply. If the purchase succeeds, immediately control that Territory.

---

## 14. Intelligence'''
    text = regex_once(text, r"## 13\. Financiers\n.*?\n---\n\n## 14\. Intelligence", financier_section, "Working Rules Financier section")
    write(path, text)


def update_metadata():
    path = "docs/Gauntlet_v0.6_Card_Metadata.md"
    text = read(path)
    text = replace_once(text, "**Status:** Consolidated metadata rollup through 95 current playable-card designs: 50 Neutral cards, 12 Military cards, 12 Diplomat cards, 12 Inquisition cards, and 9 retained source designs assigned to the three unfinished factions.", "**Status:** Consolidated metadata rollup through 104 current playable-card designs: 50 Neutral cards, 12 Military cards, 12 Diplomat cards, 12 Inquisition cards, 12 Financier cards, and 6 retained source designs assigned to the two unfinished factions.", "metadata status")
    text = replace_once(text, "`card-reviews/STATUS.md` records the live checkpoint. `Gauntlet_v0.6_Neutral_Card_Pool.md`, `../releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`, `../releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md`, and `../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` are authoritative for their completed pools. The definitive Military, Diplomat, and Inquisition guides also govern their leaders, resources, components, strategy, terminology, and player-facing faction rules.", "`card-reviews/STATUS.md` records the live checkpoint. `Gauntlet_v0.6_Neutral_Card_Pool.md`, `../releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`, `../releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md`, `../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`, and `../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md` are authoritative for their completed pools. The definitive Military, Diplomat, Inquisition, and Financier guides also govern their leaders, resources, components, strategy, terminology, and player-facing faction rules.", "metadata sources")
    table = '''
## Active Financier package metadata

This table records Financier metadata; the definitive Financier faction guide governs all player-facing rules and exact card text.

| ID | Card | Cost | Starter eligible | Complexity | Unique | Watchlist |
|---|---|---:|---|---|---|---|
| F1 | Speculation | 1 | TBD | Advanced | No | Visible self-tracking, Capital wager, and failure destination |
| F2 | Monetary Crisis | 2 | TBD | Basic | No | Repeated hand resets and Treasury asymmetry |
| F3 | Liquidation | 2 | TBD | Advanced | No | Temporary over-limit Capital and immediate-purchase timing |
| F4 | Underwriting | 2 | TBD | Advanced | No | Narrow standalone floor and Subsidize incentives |
| F5 | Capital Gains | 3 | TBD | Advanced | No | High-value preservation and delayed-investment tracking |
| F6 | Tariffs | 3 | No | Advanced | No | Action compression, delayed draw loss, and debt evasion |
| F7 | Divestment | 3 | TBD | Advanced | No | Sell-and-rebuy lines and portfolio-loop efficiency |
| F8 | Margin Loan | 3 | No | Advanced | No | Default timing, collateral recovery, and Action compression |
| F9 | Leveraged Buyout | 4 | No | Advanced | No | Additional Battle-card collateral and full-cost financing |
| F10 | Foreclosure | 4 | No | Advanced | No | Adjacency counterplay and ownership-to-control conversion |
| F11 | Property Dues | 4 | No | Advanced | No | Multiple-copy stacking and repeated movement pressure |
| F12 | Corner the Market | 5 | No | Advanced | Yes | Sudden Controlling Interest conversion after visible preparation |

'''
    text = replace_once(text, "## Name, trait, allegiance, and uniqueness notes", table + "## Name, trait, allegiance, and uniqueness notes", "metadata Financier table")
    text = replace_once(text, "- The Inquisition package currently contains no Unique cards.", "- The Inquisition package currently contains no Unique cards.\n- **Corner the Market** is Financier, cost 5, Advanced, and Unique: maximum one copy per deck.", "metadata unique note")
    text = replace_once(text, "- The Inquisition pool contains exactly 12 unique cards with the approved 1 / 3 / 4 / 2 / 2 cost curve, total value 37, and average value 3.08; its definitive source is the release faction guide.\n- The current project contains 95 playable-card designs: 50 Neutral, 12 Military, 12 Diplomats, 12 Inquisition, and 9 retained source designs assigned to the three unfinished factions.\n- Remaining card work concerns the Mystics, Financiers, and Intelligence packages, faction exact-text blockers, Intelligence Missions, copied-effect rules, package playtesting, and canonical-data production.", "- The Inquisition pool contains exactly 12 unique cards with the approved 1 / 3 / 4 / 2 / 2 cost curve, total value 37, and average value 3.08; its definitive source is the release faction guide.\n- The Financier pool contains exactly 12 unique cards with the approved 1 / 3 / 4 / 3 / 1 cost curve, total value 36, and average value 3.00; its definitive source is the release faction guide.\n- The current project contains 104 playable-card designs: 50 Neutral, 12 Military, 12 Diplomats, 12 Inquisition, 12 Financiers, and 6 retained source designs assigned to Mystics and Intelligence.\n- Remaining card work concerns the Mystics and Intelligence packages, Intelligence Missions, copied-effect rules, package playtesting, and canonical-data production.", "metadata rollup")
    write(path, text)


def update_status():
    path = "docs/card-reviews/STATUS.md"
    text = read(path)
    text = replace_once(text, "**Last completed faction package:** Inquisition", "**Last completed faction package:** Financiers", "status last package")
    text = replace_once(text, "**Inquisition pool:** Complete at 12 cards  \n**Current playable designs:** 95", "**Inquisition pool:** Complete at 12 cards; definitive faction guide packaged  \n**Financier pool:** Complete at 12 cards; definitive faction guide packaged  \n**Current playable designs:** 104", "status counts")
    text = replace_once(text, "The 95 current designs comprise 50 Neutral, 12 Military, 12 Diplomat, 12 Inquisition, and 9 retained source designs assigned to Mystics, Financiers, and Intelligence.", "The 104 current designs comprise 50 Neutral, 12 Military, 12 Diplomat, 12 Inquisition, 12 Financier, and 6 retained source designs assigned to Mystics and Intelligence.", "status rollup")
    text = replace_once(text, "4. `../../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` — definitive Inquisition rules and exact card pool\n5. `../Gauntlet_v0.6_Card_Metadata.md`", "4. `../../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` — definitive Inquisition rules and exact card pool\n5. `../../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md` — definitive Financier rules and exact card pool\n6. `../Gauntlet_v0.6_Card_Metadata.md`", "status sources")
    text = replace_once(text, "Military's former split files, Diplomats' former split pool, design-note, and supplemental files, and Inquisition's former split pool, design-note, supplemental, and working-guide files have been consolidated into definitive guides and removed.", "Military's former split files, Diplomats' former split pool, design-note, and supplemental files, Inquisition's former split pool, design-note, supplemental, and working-guide files, and the Financier split pool and design notes have been consolidated into definitive guides and removed.", "status consolidation")
    text = replace_once(text, "- Inquisition Blasphemy, revised Purge, Purification, and leader rules.", "- Inquisition Blasphemy, revised Purge, Purification, and leader rules;\n- Financier extra actions, capped Deed and buyout costs, Manifest Destiny Deeds, Capital, Treasury, and leader rules.", "status integrated rules")
    financier_section = '''
### Financiers

- Curve: **1 / 3 / 4 / 3 / 1**; total 36; average 3.00.
- Roster: **Speculation; Monetary Crisis; Liquidation; Underwriting; Capital Gains; Tariffs; Divestment; Margin Loan; Leveraged Buyout; Foreclosure; Property Dues; Corner the Market**.
- **Corner the Market** is the Unique cost-5 statement card.
- Deed base costs and Financier-mirror buyout premiums stop scaling after 6.
- Manifest Destiny Territories have normal Deeds and expand Controlling Interest.
- The definitive source is `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`, with matching release DOCX and PDF.

'''
    text = replace_once(text, "---\n\n## Unresolved items", financier_section + "---\n\n## Unresolved items", "status Financier section")
    text = replace_once(text, "- Redesign **Capital Gains** around Financier infrastructure.\n", "", "status Capital Gains blocker")
    text = replace_once(text, "- Complete the Mystics, Financiers, and Intelligence packages.", "- Complete the Mystics and Intelligence packages.", "status package blocker")
    text = replace_once(text, "Begin design work on Mystics, Financiers, or Intelligence while testing and reviewing the completed Military, Diplomat, and Inquisition packages. Do not reopen a completed roster without new evidence.", "Continue design work on Mystics or Intelligence while testing and reviewing the completed Military, Diplomat, Inquisition, and Financier packages. Do not reopen a completed roster without new evidence.", "status next step")
    write(path, text)


def update_open_questions():
    path = "docs/Gauntlet_v0.6_Open_Questions.md"
    text = read(path)
    text = replace_once(text, "- twelve-card Military, Diplomat, and Inquisition packages;", "- twelve-card Military, Diplomat, Inquisition, and Financier packages;", "questions completed packages")
    text = replace_once(text, "- definitive Military, Diplomat, and Inquisition faction guides in Markdown, DOCX, and PDF formats.", "- definitive Military, Diplomat, Inquisition, and Financier faction guides in Markdown, DOCX, and PDF formats.", "questions completed guides")
    text = replace_once(text, "- Redesign **Capital Gains** around Financier infrastructure.\n", "", "questions Capital Gains")
    text = replace_once(text, "- Complete the Mystics, Financiers, and Intelligence twelve-card packages.", "- Complete the Mystics and Intelligence twelve-card packages.", "questions blockers")
    financier = '''## Financiers

Definitive source: `../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`. The adjacent PDF and DOCX are the release-formatted editions. The earlier split Financier pool and design-note documents have been consolidated and removed.

Closed production decisions:

- The package contains twelve cards with a **1 / 3 / 4 / 3 / 1** curve, total value 36, and average value 3.00.
- **Corner the Market** is the Unique cost-5 statement card.
- Added Territories receive normal Deeds; Deed base costs and buyout premiums stop scaling after 6.
- **Take an extra action** grants a full additional Action opportunity.
- The package uses two Leader Cards, one Financier Reference, and a public Capital / Deed ledger or equivalent record rather than currency tokens.

Open questions:

- Is Capital accumulation fast enough without becoming runaway?
- Is the Capital-limit formula easy to track physically?
- Does Treasury create planning rather than disconnected setup?
- Are Deed costs and buyout premiums intuitive, including mirrors and Manifest Destiny?
- Is Play the Market appropriately swingy?
- Is Subsidize understandable and balanced?
- Should Line of Credit collateral remain in discard rather than the Graveyard?
- Does Hostile Takeover snowball too quickly?
- Are Banker and Executive comparably strong?
- Do Tariffs, Divestment, and Margin Loan collectively erase intended Action pressure?
- Do repeated Monetary Crisis and stacked Property Dues create excessive denial?
- Are Divestment loops, Leveraged Buyout collateral, Foreclosure, and Capital Gains fair?
- Is Underwriting's standalone floor sufficient?
- Is the self-tracking burden of Speculation, Capital Gains, and Margin Loan acceptable?
- Does Corner the Market create a visible, dramatic finish?

---'''
    text = regex_once(text, r"## Financiers\n.*?\n---", financier, "questions Financier section")
    write(path, text)


def update_project_index():
    path = "docs/Gauntlet_v0.6_Project_Index.md"
    text = read(path)
    hierarchy = '''1. **`Gauntlet_v0.6_Working_Rules.md`** — active v0.6 development rules framework and superset, including developing faction mechanics, leaders, resources, alternate victories, Assets, Overlays, Territories, and product scope. Later approved decisions recorded here govern until rolled into the preliminary core rulebook.
2. **`Gauntlet_v0.6_Neutral_Card_Pool.md`** — authoritative names, costs, metadata, and exact text for all 50 Neutral cards.
3. **`Gauntlet_v0.6_Territory_Pool.md`** — authoritative names, complexity, watchlists, status, and exact text for all 25 Territories and Arenas.
4. **`../releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`** — definitive Military faction source: Military rules, General, Commandant, Orders, Command tracker, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are the release-formatted editions.
5. **`../releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md`** — definitive Diplomat faction source: rules, Ambassador, Senator, Influence, Terms, Proposals / Treaty Articles, references, tracker, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are release-formatted editions.
6. **`../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`** — definitive Inquisition faction source: Inquisition rules, Grand Inquisitor, Witch Hunter, Conviction, doctrine, Purge, Purification, supplemental components, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are the release-formatted editions.
7. **`../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`** — definitive Financier faction source: rules, Banker, Executive, Capital, Treasury, Deeds, Play the Market, Subsidize, Controlling Interest, components, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are the release-formatted editions.
8. **`card-reviews/STATUS.md`** — live playable-card checkpoint and unresolved blockers.
9. **`Gauntlet_v0.6_Card_Metadata.md`** — consolidated allegiance, starter, complexity, uniqueness, and watchlist metadata for 104 current playable designs.
10. **`card-reviews/COST_CURVE_AND_NEUTRAL_POOL_AUDIT.md`** — completed Neutral pool audit.
11. **`Gauntlet_v0.6_Card_Review_Log.md`** — migration provenance for all 54 v0.5.7 source cards.
12. **`card-reviews/CONDITION_AUDIT.md`** — Condition retirement and conversion provenance.
13. **`card-reviews/`** — detailed historical reviews and approval sidecars for unfinished or unconsolidated packages.
14. **`territory-reviews/STATUS.md`** — Territory-review and consolidation checkpoint.
15. **`territory-reviews/GENERAL_RULES.md`** — Territory activation and suppression-rule provenance.
16. **`territory-reviews/`** — individual design and approval provenance for all 25 v0.5.7 Territories and Arenas.
17. **`Gauntlet_v0.6_Open_Questions.md`** — unresolved rules, card, testing, and release decisions.
18. **`../releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`** — historical pre-v0.6 canonical source.
19. **`v0.5.7_rules_clarifications.md`** — physical-rules clarifications from digital implementation.'''
    text = regex_once(text, r"1\. \*\*`Gauntlet_v0\.6_Working_Rules\.md`\*\*.*?18\. \*\*`v0\.5\.7_rules_clarifications\.md`\*\* — physical-rules clarifications from digital implementation\.", hierarchy, "index source hierarchy")
    text = replace_once(text, "Active v0.6 documents govern until the remaining three faction packages, exact-text blockers, Intelligence Missions, copied-effect rules, and package testing are resolved. For Military, Diplomats, and Inquisition, the definitive faction guides above override earlier development records and split package documents, which have been removed from the active repository.", "Active v0.6 documents govern until the remaining two faction packages, Intelligence Missions, copied-effect rules, and package testing are resolved. For Military, Diplomats, Inquisition, and Financiers, the definitive faction guides above override earlier development records and split package documents, which have been removed from the active repository.", "index hierarchy paragraph")
    text = replace_once(text, "The split Diplomat pool, design-note, and supplemental-component documents and the split Inquisition pool, design-note, supplemental-component, and working-guide documents were likewise removed after consolidation into their definitive guides.", "The split Diplomat pool, design-note, and supplemental-component documents, the split Inquisition pool, design-note, supplemental-component, and working-guide documents, and the split Financier pool and design notes were likewise removed after consolidation into their definitive guides.", "index consolidation")
    text = replace_once(text, "- Military, Diplomats, and Inquisition are complete at **12** cards each.\n- Militias and Patriotism are retired.\n- The project contains **95 current playable designs**: 50 Neutral, 12 Military, 12 Diplomat, 12 Inquisition, and 9 retained source designs assigned to Mystics, Financiers, and Intelligence.", "- Military, Diplomats, Inquisition, and Financiers are complete at **12** cards each.\n- Militias and Patriotism are retired.\n- The project contains **104 current playable designs**: 50 Neutral, 12 Military, 12 Diplomat, 12 Inquisition, 12 Financier, and 6 retained source designs assigned to Mystics and Intelligence.", "index playable count")
    financier_checkpoint = '''### Financier checkpoint

- Curve: **1 / 3 / 4 / 3 / 1**.
- Total value: 36; average: 3.00.
- Roster: **Speculation; Monetary Crisis; Liquidation; Underwriting; Capital Gains; Tariffs; Divestment; Margin Loan; Leveraged Buyout; Foreclosure; Property Dues; Corner the Market**.
- **Corner the Market** is the Unique cost-5 statement card.
- Deed base costs and opposing-owner buyout premiums stop scaling after 6.
- Manifest Destiny Territories receive normal Deeds and expand Controlling Interest.
- The supplemental specification uses either leader, one Financier Reference, and a public Capital / Deed ledger or equivalent record.
- `../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md` is the definitive Financier source; the adjacent DOCX and PDF are release-formatted editions using the Banker and Executive sketches under `../images/sketches/`.

'''
    text = replace_once(text, "### Remaining blockers", financier_checkpoint + "### Remaining blockers", "index Financier checkpoint")
    text = replace_once(text, "- Redesign **Capital Gains** around Financier infrastructure.\n", "", "index Capital Gains blocker")
    text = replace_once(text, "- Complete the Mystics, Financiers, and Intelligence card packages.", "- Complete the Mystics and Intelligence card packages.", "index package blockers")
    text = replace_once(text, "- The v0.6 development deckbuilder is live under `../deckbuilder-v0.6/` and reads the active Neutral, Military, Diplomat, Inquisition, and Territory Markdown sources at runtime.", "- The v0.6 development deckbuilder is live under `../deckbuilder-v0.6/` and reads the active Neutral, Military, Diplomat, Inquisition, Financier, and Territory Markdown sources at runtime.", "index deckbuilder sources")
    text = replace_once(text, "- Mystics, Financiers, and Intelligence remain disabled placeholders until their packages are complete.", "- Mystics and Intelligence remain disabled placeholders until their packages are complete.", "index placeholders")
    text = replace_once(text, "- The definitive Military, Diplomat, and Inquisition guide packages are under `releases/v0.6/faction-guides/` in Markdown, DOCX, and PDF formats.", "- The definitive Military, Diplomat, Inquisition, and Financier guide packages are under `releases/v0.6/faction-guides/` in Markdown, DOCX, and PDF formats.", "index guide packages")
    text = replace_once(text, "Playtest and physically review the preliminary core rulebook together with the completed Military, Diplomat, and Inquisition guides while continuing design work on Mystics, Financiers, or Intelligence.", "Playtest and physically review the preliminary core rulebook together with the completed Military, Diplomat, Inquisition, and Financier guides while continuing design work on Mystics or Intelligence.", "index immediate next")
    write(path, text)


def update_faction_sheets_readme():
    path = "faction-sheets/README.md"
    text = read(path)
    text = replace_once(text, "- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` — definitive Inquisition rules, leaders, references, tracker, and playable-card text. The Inquisition sheets are derived from this guide.\n- `docs/Gauntlet_v0.6_Working_Rules.md`", "- `releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` — definitive Inquisition rules, leaders, references, tracker, and playable-card text. The Inquisition sheets are derived from this guide.\n- `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md` — definitive Financier rules, leaders, Capital, Treasury, Deeds, references, ledger requirements, and playable-card text. A dedicated browser-printable Financier sheet remains to be created from this guide.\n- `docs/Gauntlet_v0.6_Working_Rules.md`", "faction sheets source")
    write(path, text)


def remove_superseded_files():
    for path in [
        ROOT / "docs/Gauntlet_v0.6_Financier_Card_Pool.md",
        ROOT / "docs/Gauntlet_v0.6_Financier_Design_Notes.md",
    ]:
        if path.exists():
            path.unlink()


def main():
    update_readme()
    update_deckbuilder_readme()
    update_deckbuilder_app()
    update_working_rules()
    update_metadata()
    update_status()
    update_open_questions()
    update_project_index()
    update_faction_sheets_readme()
    remove_superseded_files()
    print("Financier package integration complete")


if __name__ == "__main__":
    main()
