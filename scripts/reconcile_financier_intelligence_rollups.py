from pathlib import Path
import re


def replace_section(text: str, start: str, end: str, replacement: str) -> str:
    a = text.index(start)
    b = text.index(end, a)
    return text[:a] + replacement.rstrip() + "\n\n" + text[b:]


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Expected text not found in {label}: {old}")
    return text.replace(old, new, 1)


FIN_GUIDE_DOC = "`../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`"
FIN_GUIDE_STATUS = "`../../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`"


# Card metadata: retain all Intelligence additions from main and promote Financiers to the definitive guide.
path = Path("docs/Gauntlet_v0.6_Card_Metadata.md")
text = path.read_text(encoding="utf-8")
text = text.replace("`Gauntlet_v0.6_Financier_Card_Pool.md`", FIN_GUIDE_DOC)
text = text.replace(
    "The definitive Military, Diplomat, and Inquisition guides also govern",
    "The definitive Military, Diplomat, Inquisition, and Financier guides also govern",
)
fin_metadata = """## Active Financier package metadata

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
| F12 | Corner the Market | 5 | No | Advanced | Yes | Sudden Controlling Interest conversion after visible preparation |"""
text = replace_section(text, "## Active Financier package metadata", "## Active Intelligence package metadata", fin_metadata)
text = re.sub(
    r"^- The Financier pool contains exactly 12 unique cards.*$",
    "- The Financier pool contains exactly 12 unique cards with the approved 1 / 3 / 4 / 3 / 1 cost curve, total value 36, and average value 3.00; its definitive source is the release faction guide.",
    text,
    flags=re.M,
)
text = re.sub(
    r"^- Remaining card work concerns.*$",
    "- Remaining work concerns the Mystics package, copied-effect rules, Financier and Intelligence playtesting and production, and canonical-data production.",
    text,
    flags=re.M,
)
path.write_text(text, encoding="utf-8")


# Review status: Intelligence remains the latest completed pool; Financiers are the latest definitive guide.
path = Path("docs/card-reviews/STATUS.md")
text = path.read_text(encoding="utf-8")
if "**Last completed definitive faction guide:** Financiers" not in text:
    text = replace_required(
        text,
        "**Last completed faction pool:** Intelligence  ",
        "**Last completed faction pool:** Intelligence  \n**Last completed definitive faction guide:** Financiers  ",
        str(path),
    )
text = text.replace(
    "**Financier pool:** Complete at 12 cards; working exact-text pool approved",
    "**Financier pool:** Complete at 12 cards; definitive faction guide packaged",
)
text = re.sub(
    r"^5\. `\.\./Gauntlet_v0\.6_Financier_Card_Pool\.md`.*$",
    f"5. {FIN_GUIDE_STATUS} — definitive Financier rules and exact card pool",
    text,
    flags=re.M,
)
text = text.replace(
    "and Inquisition's former split pool, design-note, supplemental, and working-guide files have been consolidated into definitive guides and removed.",
    "Inquisition's former split pool, design-note, supplemental, and working-guide files, and the Financier split pool and design notes have been consolidated into definitive guides and removed.",
)
text = text.replace(
    "- current Financier and Intelligence faction frameworks.",
    "- definitive Financier extra-action, capped Deed and buyout cost, Manifest Destiny Deed, Capital, Treasury, and leader rules;\n- the current Intelligence faction framework.",
)
fin_status = """### Financiers

- Curve: **1 / 3 / 4 / 3 / 1**; total 36; average 3.00.
- Roster: **Speculation; Monetary Crisis; Liquidation; Underwriting; Capital Gains; Tariffs; Divestment; Margin Loan; Leveraged Buyout; Foreclosure; Property Dues; Corner the Market**.
- **Corner the Market** is the Unique cost-5 statement card.
- Deed base costs and Financier-mirror buyout premiums stop scaling after 6.
- Manifest Destiny Territories have normal Deeds and expand Controlling Interest.
- The definitive source is `releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`, with matching release DOCX and PDF."""
text = replace_section(text, "### Financiers", "### Intelligence", fin_status)
text = text.replace("- Synchronize approved Financier rules clarifications into the Working Rules.\n", "")
text = re.sub(
    r"^- Playtest the Financier and Intelligence card pools.*$",
    "- Playtest the Financier definitive guide and Intelligence card pool; complete the Intelligence definitive guide and both factions' remaining supplemental, printable, and physical-review work.",
    text,
    flags=re.M,
)
text = re.sub(
    r"## Immediate next step\n\n.*\Z",
    "## Immediate next step\n\nPlaytest the definitive Financier guide and the approved Intelligence pool while continuing design work on Mystics. Complete the Intelligence definitive guide and the remaining Financier and Intelligence printable packages after their rules, leaders, watchlists, and physical text survive focused testing.\n",
    text,
    flags=re.S,
)
path.write_text(text, encoding="utf-8")


# Open questions: preserve Intelligence's completed pool and replace the old Financier working-source section.
path = Path("docs/Gauntlet_v0.6_Open_Questions.md")
text = path.read_text(encoding="utf-8")
text = text.replace(
    "- definitive Military, Diplomat, and Inquisition faction guides in Markdown, DOCX, and PDF formats.",
    "- definitive Military, Diplomat, Inquisition, and Financier faction guides in Markdown, DOCX, and PDF formats.",
)
text = text.replace("- Synchronize approved Financier rules clarifications into the Working Rules.\n", "")
text = re.sub(
    r"^- Playtest the Financier and Intelligence card pools.*$",
    "- Playtest the Financier definitive guide and Intelligence card pool; complete the Intelligence definitive guide and both factions' remaining supplemental, printable, and physical-review work.",
    text,
    flags=re.M,
)
fin_questions = """## Financiers

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
- Does Corner the Market create a visible, dramatic finish?"""
text = replace_section(text, "## Financiers", "## Intelligence", fin_questions)
path.write_text(text, encoding="utf-8")


# Project index: keep the Intelligence milestone and restore the definitive Financier source hierarchy.
path = Path("docs/Gauntlet_v0.6_Project_Index.md")
text = path.read_text(encoding="utf-8")
text = re.sub(
    r"^7\. \*\*`Gauntlet_v0\.6_Financier_Card_Pool\.md`\*\*.*$",
    "7. **`../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`** — definitive Financier faction source: rules, Banker, Executive, Capital, Treasury, Deeds, Play the Market, Subsidize, Controlling Interest, components, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are the release-formatted editions.",
    text,
    flags=re.M,
)
text = re.sub(
    r"No canonical v0\.6 data exists yet\..*?\n\n### Design rationale and testing",
    "No canonical v0.6 data exists yet. The preliminary core rulebook is the current player-facing shared-rules snapshot; the Working Rules remain the active development superset. Active v0.6 documents govern until the remaining Mystics card package, copied-effect rules, Intelligence production package, and package testing are resolved. For Military, Diplomats, Inquisition, and Financiers, the definitive faction guides above override earlier development records and split package documents, which have been removed from the active repository. The Intelligence exact-text pool overrides its migration-era records until it is consolidated into a definitive guide.\n\n### Design rationale and testing",
    text,
    flags=re.S,
)
text = re.sub(r"^\d+\. \*\*`Gauntlet_v0\.6_Financier_Design_Notes\.md`\*\*.*\n", "", text, flags=re.M)
text = text.replace(
    "The split Diplomat pool, design-note, and supplemental-component documents and the split Inquisition pool, design-note, supplemental-component, and working-guide documents were likewise removed after consolidation into their definitive guides.",
    "The split Diplomat pool, design-note, and supplemental-component documents, the split Inquisition pool, design-note, supplemental-component, and working-guide documents, and the split Financier pool and design notes were likewise removed after consolidation into their definitive guides.",
)
fin_checkpoint = """### Financier checkpoint

- Curve: **1 / 3 / 4 / 3 / 1**.
- Total value: 36; average: 3.00.
- Roster: **Speculation; Monetary Crisis; Liquidation; Underwriting; Capital Gains; Tariffs; Divestment; Margin Loan; Leveraged Buyout; Foreclosure; Property Dues; Corner the Market**.
- **Corner the Market** is the Unique cost-5 statement card.
- Deed base costs and opposing-owner buyout premiums stop scaling after 6.
- Manifest Destiny Territories receive normal Deeds and expand Controlling Interest.
- The supplemental specification uses either leader, one Financier Reference, and a public Capital / Deed ledger or equivalent record.
- `../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md` is the definitive Financier source; the adjacent DOCX and PDF are release-formatted editions using the Banker and Executive sketches under `../images/sketches/`."""
text = replace_section(text, "### Financier checkpoint", "### Intelligence checkpoint", fin_checkpoint)
text = text.replace("- Synchronize approved Financier rules clarifications into the Working Rules.\n", "")
text = re.sub(
    r"^- Playtest the Financier and Intelligence pools.*$",
    "- Playtest the Financier definitive guide and Intelligence pool; complete the Intelligence definitive guide and both factions' remaining supplemental, printable, and physical-review work.",
    text,
    flags=re.M,
)
text = text.replace(
    "current Inquisition rules, and current Financier and Intelligence frameworks.",
    "current Inquisition and Financier rules, and the current Intelligence framework.",
)
text = text.replace(
    "integration summaries for the three completed definitive faction guides.",
    "integration summaries for the four completed definitive faction guides.",
)
text = text.replace(
    "reads the active Neutral, Military, Diplomat, Inquisition, and Territory Markdown sources",
    "reads the active Neutral, Military, Diplomat, Inquisition, Financier, and Territory Markdown sources",
)
text = text.replace(
    "Mystics remains disabled pending a completed card package. Financiers and Intelligence remain disabled pending definitive-guide, supplemental-component, and printable-package integration.",
    "Mystics and Intelligence remain disabled pending completed definitive-guide and printable-package integration.",
)
text = text.replace(
    "The definitive Military, Diplomat, and Inquisition guide packages are under `releases/v0.6/faction-guides/` in Markdown, DOCX, and PDF formats.",
    "The definitive Military, Diplomat, Inquisition, and Financier guide packages are under `releases/v0.6/faction-guides/` in Markdown, DOCX, and PDF formats.",
)
text = text.replace(
    "Financier and Intelligence card design is complete, but their definitive guides, reference components, tracker treatment, and printable faction sheets remain to be produced.",
    "The Financier definitive guide is complete; its dedicated printable faction sheet remains production work. Intelligence card design is complete, but its definitive guide, supplemental components, and printable sheet remain to be produced.",
)
text = re.sub(
    r"## Immediate next step\n\n.*\Z",
    "## Immediate next step\n\nPlaytest the definitive Financier guide and approved Intelligence exact-text pool while completing the Mystics card package. Record shared-rules corrections in the Working Rules first. After Intelligence survives focused testing, consolidate its rules, leaders, references, strategy, and twelve cards into a definitive guide and printable package; complete the Financier printable sheet in parallel. Continue physical review of the preliminary core rulebook and completed definitive faction guides.\n",
    text,
    flags=re.S,
)

# Renumber all numbered source-map entries after removing the Financier design-note line.
counter = 0
lines = []
for line in text.splitlines():
    if re.match(r"^\d+\. \*\*", line):
        counter += 1
        line = re.sub(r"^\d+\.", f"{counter}.", line)
    lines.append(line)
text = "\n".join(lines) + "\n"
path.write_text(text, encoding="utf-8")


# Assertions protect both milestones.
checks = {
    "docs/Gauntlet_v0.6_Card_Metadata.md": [
        "112 current playable-card designs",
        "## Active Intelligence package metadata",
        "definitive Financier faction guide",
    ],
    "docs/card-reviews/STATUS.md": [
        "Last completed faction pool:** Intelligence",
        "Last completed definitive faction guide:** Financiers",
    ],
    "docs/Gauntlet_v0.6_Open_Questions.md": [
        "## Intelligence",
        "Definitive source: `../releases/v0.6/faction-guides/financier/",
    ],
    "docs/Gauntlet_v0.6_Project_Index.md": [
        "Gauntlet_v0.6_Intelligence_Card_Pool.md",
        "Gauntlet_v0.6_Financier_Faction_Guide.md",
        "112 current playable designs",
    ],
}
for filename, needles in checks.items():
    value = Path(filename).read_text(encoding="utf-8")
    for needle in needles:
        if needle not in value:
            raise RuntimeError(f"Validation failed: {needle!r} missing from {filename}")
