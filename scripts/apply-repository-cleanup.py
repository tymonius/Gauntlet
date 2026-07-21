#!/usr/bin/env python3
from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}: {old[:80]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "docs/Gauntlet_v0.6_Faction_Card_Design_Guide.md",
    """This document should be used alongside:\n\n- `Gauntlet_v0.6_Working_Rules.md` for current faction and leader mechanics;\n- `Gauntlet_Design_Principles_and_Guardrails.md` for broader game-design constraints;\n- `card-reviews/COST_CURVE_AND_NEUTRAL_POOL_AUDIT.md` for current cost-tier expectations;\n- the active card metadata and review records for approved cards and unresolved wording.\n\nExact card text belongs in the appropriate active faction-pool or card source once approved. This guide defines how proposed faction cards and completed packages should be evaluated and records the working v0.6 package-size and cost-profile baseline.\n""",
    """This document should be used alongside:\n\n- the [official v0.6.0 rulebook](../releases/v0.6/Gauntlet_v0.6.0_Rulebook.md) for shared rules;\n- the [definitive faction guides](../releases/v0.6/faction-guides/) for current faction mechanics, Leaders, components, and exact faction-card text;\n- [Gauntlet Design Principles and Guardrails](Gauntlet_Design_Principles_and_Guardrails.md) for broader design constraints;\n- [Gauntlet Development Status](Gauntlet_Development_Status.md) for the current testing watchlist; and\n- the generated [canonical data](../releases/v0.6/Gauntlet_v0.6.0_Canonical_Data.json) for current pool counts and metadata.\n\nExact card text belongs in the governing faction guide once approved. This document defines how new faction cards and future package revisions should be evaluated; it is not an alternate card source.\n""",
)

replace_once(
    "docs/Gauntlet_v0.6_Leader_Design_Bible.md",
    "This document records the current character design direction for the twelve v0.6 faction leaders. It should be used alongside `docs/Gauntlet_v0.6_Working_Rules.md`, which remains the source of truth for rules text and leader abilities.",
    "This document records the current character design direction for the twelve v0.6 faction Leaders. The [official rulebook](../releases/v0.6/Gauntlet_v0.6.0_Rulebook.md) and [definitive faction guides](../releases/v0.6/faction-guides/) govern rules text and Leader abilities.",
)

replace_once(
    "faction-sheets/README.md",
    "- `docs/Gauntlet_v0.6_Working_Rules.md` — shared rules.",
    "- `releases/v0.6/Gauntlet_v0.6.0_Rulebook.md` — canonical shared rules.",
)

replace_once(
    "docs/Gauntlet_v0.7_Parking_Lot.md",
    "The cross variant may make it easier for players to get around blockers or create openings into Heartlands, but it may also increase rules load and board-state ambiguity.",
    "The cross variant may make it easier for players to get around blockers or create openings beyond an opponent's end of the Gauntlet, but it may also increase rules load and board-state ambiguity.",
)

replace_once(
    "docs/Gauntlet_Lore_Development_Notes.md",
    "Heartlands are rules endpoints and final defensive positions. They should not automatically become sacred, metaphysical, or world-defining lore objects.",
    "The unnamed positions beyond each end of the Gauntlet are rules endpoints, not defined regions of the setting. They should not automatically become sacred, metaphysical, or world-defining lore objects.",
)
replace_once(
    "docs/Gauntlet_Lore_Development_Notes.md",
    "- ancient roads reconnecting Heartlands;",
    "- ancient roads reconnecting distant realms or capitals;",
)

replace_once(
    "README.md",
    """### `docs/`\n\nActive design, testing, source-card, Territory, project-index, and production documentation. Archived or superseded records are under `docs/Archive/`.\n""",
    """### `docs/`\n\nThe [documentation index](docs/README.md) separates canonical sources, active design and testing documents, and archived provenance. Current post-release priorities are in [Gauntlet Development Status](docs/Gauntlet_Development_Status.md).\n""",
)
replace_once(
    "README.md",
    """### `src/`\n\nFramework-neutral TypeScript rules-engine and digital-prototype scaffolding. It is development software, not the authoritative rules source.\n""",
    """### `src/` and `data/`\n\nLegacy pre-v0.6 digital-prototype code and starter data. They are retained for architecture and testing provenance but do not implement the canonical faction-era game. Future work is governed by the [Digital Roadmap](docs/Gauntlet_Digital_Roadmap.md).\n""",
)
replace_once(
    "README.md",
    "6. Do not silently resolve open design questions in generated data or production artifacts.",
    "6. Record unresolved testing concerns in `docs/Gauntlet_Development_Status.md`; do not silently resolve them in generated data or production artifacts.",
)
replace_once(
    "README.md",
    "For the TypeScript development tools:",
    "For the legacy TypeScript prototype:",
)

replace_once(
    "docs/README.md",
    "[Digital Prototype Roadmap](Gauntlet_Digital_Prototype_Roadmap.md)",
    "[Digital Roadmap](Gauntlet_Digital_Roadmap.md)",
)

(ROOT / "data/README.md").write_text(
    """# Legacy Digital Prototype Data\n\nThis directory contains early machine-readable data created before the canonical v0.6.0 faction-era package.\n\nIt is preserved as implementation provenance and schema scaffolding. It is **not current game data** and must not be used by the v0.6 Deckbuilder, printable sheets, release generator, or a new canonical rules engine.\n\n## Files\n\n- `cards.json` — partial legacy card records.\n- `territories.json` — partial legacy Territory records.\n- `recommended_decks.json` — legacy sample Decks.\n- `game_config.json` — legacy constants and turn/battle assumptions.\n- `schema.md` — the initial prototype data model.\n\n## Current source\n\nUse `releases/v0.6/Gauntlet_v0.6.0_Canonical_Data.json` for structured v0.6.0 content. It is generated from the official rulebook, definitive faction guides, Neutral pool, and Territory pool.\n\nThe future digital implementation plan is in `docs/Gauntlet_Digital_Roadmap.md`.\n\nDo not update these legacy files piecemeal to resemble v0.6.0. A canonical engine should consume a deliberate versioned schema generated from current sources.\n""",
    encoding="utf-8",
)

(ROOT / "src/README.md").write_text(
    """# Legacy Gauntlet Digital Prototype\n\nThis directory contains the pre-v0.6 TypeScript rules-engine experiment and its development interfaces.\n\nThe code is preserved because it contains useful architecture, state-transition tests, hidden-information work, and interface prototypes. It does **not** implement the canonical v0.6.0 faction-era game and is not an authoritative rules source.\n\nCurrent references:\n\n- `releases/v0.6/Gauntlet_v0.6.0_Rulebook.md`\n- `releases/v0.6/Gauntlet_v0.6.0_Canonical_Data.json`\n- `docs/Gauntlet_Digital_Roadmap.md`\n- `docs/Gauntlet_Playtest_Targets_and_Metrics.md`\n\n## Preserved areas\n\n- `state/` — setup, actions, reducers, views, movement, battles, capture, and win-evaluation experiments.\n- `effects/` — early card-effect handlers.\n- `cards/` — prototype card integration.\n- `cli/` — guided command-line runner and logs.\n- `gui/` — local browser development server.\n\n## Development commands\n\nFrom the repository root:\n\n```bash\nnpm install\nnpm run typecheck\nnpm test\nnpm run dev:cli\nnpm run dev:gui\n```\n\nThese commands exercise the legacy prototype. Passing tests confirms internal consistency of that prototype, not compliance with v0.6.0.\n\n## Reuse policy\n\nNew canonical engine work should extract reusable architecture deliberately rather than continuing the mixed-version model. Any retained module must be tested against v0.6.0 terminology, zones, timing, Battle Hands, Defender's Advantage, running the Gauntlet, faction systems, and supplemental components.\n""",
    encoding="utf-8",
)

(ROOT / "docs/Gauntlet_Digital_Roadmap.md").write_text(
    """# Gauntlet Digital Roadmap\n\n**Status:** Active post-v0.6.0 roadmap.  \n**Purpose:** Define the path from the current physical-game sources and browser tools to a versioned digital rules implementation.\n\nThe [official v0.6.0 rulebook](../releases/v0.6/Gauntlet_v0.6.0_Rulebook.md), definitive faction guides, Neutral pool, and Territory pool remain authoritative. Digital behavior must follow those sources and generated canonical data.\n\n---\n\n## 1. Current layers\n\n### Canonical content\n\n- `releases/v0.6/Gauntlet_v0.6.0_Canonical_Data.json`\n- canonical Markdown rule and card sources\n- generated release manifest\n\nThis layer defines versioned content and identifiers.\n\n### Browser tools\n\n- `deckbuilder-v0.6/`\n- `faction-sheets/`\n\nThese tools build Decks and render physical components. They are production tools, not rules engines.\n\n### Legacy prototype\n\n- `src/`\n- `data/`\n\nThese files preserve a pre-v0.6 TypeScript experiment and starter data. They remain useful for architecture and tests but do not implement the canonical faction-era game.\n\n---\n\n## 2. Next supported target\n\nThe next engine milestone should support **v0.6.0 explicitly** rather than extending the legacy mixed-version state.\n\nBefore adding more interfaces:\n\n1. define a versioned schema generated from canonical data;\n2. map every shared rule to a legal state transition;\n3. model player-specific hidden information;\n4. implement setup, turns, movement, battles, occupation, control, capture, and Last Stand;\n5. represent normal card destinations and Battle Hands exactly;\n6. identify unsupported card effects explicitly; and\n7. save the rules version with every game, Deck, and log.\n\nDo not silently migrate legacy saved data or infer missing faction behavior.\n\n---\n\n## 3. Engine boundaries\n\nThe engine should own legal-action generation, state validation, deterministic transitions, random-event requests and recorded results, card-zone changes, timing windows, victory evaluation, and player-specific views.\n\nInterfaces should request legal actions from the engine, display only permitted state, collect choices, avoid reproducing legality independently, and surface manual-resolution or unsupported-effect warnings.\n\nCanonical content generation, engine logic, and interface code should remain separate.\n\n---\n\n## 4. Implementation order\n\n### Phase A — canonical core\n\n- setup and Deck validation;\n- turn sequence and Action Opportunities;\n- movement and occupied-position battles;\n- Battle Hand formation and commitments;\n- Defender's Advantage and the separate Last Stand bonus;\n- retreat, occupation, capture, and running the Gauntlet;\n- Draw Pile, hand, Battle Hand, Discard Pile, Graveyard, and Asset Bank;\n- Assets, Overlays, and Territory orientation.\n\n### Phase B — shared card framework\n\n- effect registry keyed to canonical card IDs;\n- target validation and partial resolution;\n- cancellation and negation;\n- copied and repeated Battle effects;\n- destination overrides;\n- manual-resolution fallback with explicit state annotations.\n\n### Phase C — factions\n\nImplement one complete faction at a time, including both Leaders and supplemental components, in canonical order: Military, Diplomats, Financiers, Intelligence, Mystics, and Inquisition.\n\nA faction is not complete until its additional victory condition, trackers, hidden information, and all twelve cards are supported or explicitly marked manual.\n\n### Phase D — interfaces and telemetry\n\n- guided local interface;\n- save/load;\n- reproducible logs;\n- playtest metrics export;\n- local two-player hot-seat mode;\n- remote play only after deterministic local games are stable.\n\n---\n\n## 5. Validation\n\nEvery implementation change should be checked against canonical source text, generated counts, deterministic replay tests, hidden-information boundaries, card-destination invariants, victory-route tests, matched physical-game examples, and [Playtest Targets and Metrics](Gauntlet_Playtest_Targets_and_Metrics.md).\n\nEngine behavior never overrides the physical rules. An implementation mismatch is either a software defect or evidence that the source rule needs clarification.\n""",
    encoding="utf-8",
)

old_roadmap = ROOT / "docs/Gauntlet_Digital_Prototype_Roadmap.md"
archive_roadmap = ROOT / "docs/Archive/Gauntlet_Digital_Prototype_Roadmap.md"
archive_roadmap.parent.mkdir(parents=True, exist_ok=True)
if old_roadmap.exists():
    shutil.move(old_roadmap, archive_roadmap)

replace_once(
    "docs/Archive/README.md",
    "Conversation audits, character-design logs, superseded visual notes, and long-form development history remain at the archive root when they span several versions or do not belong to one release cycle.",
    "Conversation audits, character-design logs, superseded visual notes, the pre-v0.6 digital prototype roadmap, and long-form development history remain at the archive root when they span several versions or do not belong to one release cycle.",
)

legacy_ref = re.compile(r"Gauntlet_v0\.6_(Working_Rules|Preliminary_Core_Rules|Card_Metadata|Open_Questions|Project_Index)|card-reviews/STATUS|COST_CURVE_AND_NEUTRAL_POOL_AUDIT|CONDITION_AUDIT|Gauntlet_v0\.6_Card_Review_Log")
stale_terms = re.compile(r"\bHeartlands?\b|Homeland Advantage|battle[- ]draw|\bAction card\b|\bBattle card\b|breakthrough victory", re.I)

for path in [ROOT / "README.md", ROOT / "faction-sheets/README.md", *sorted((ROOT / "docs").glob("*.md"))]:
    text = path.read_text(encoding="utf-8")
    if legacy_ref.search(text):
        raise RuntimeError(f"Legacy active-source reference remains in {path.relative_to(ROOT)}")
    if stale_terms.search(text):
        raise RuntimeError(f"Retired terminology remains in active documentation: {path.relative_to(ROOT)}")

print("Repository documentation cleanup applied and validated.")
