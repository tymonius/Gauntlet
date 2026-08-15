#!/usr/bin/env python3
"""Adapt the approved Rulebook production system to the current v0.6.3 source.

This is intentionally a thin source/version adapter. The certified v0.6.3
Markdown remains authoritative; this script restores only the presentation
structure that the approved PR #357 / PR #434 production system expects and
applies the shared player-facing editorial normalization used by the Browser
Rulebook.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRODUCTION = ROOT / "rulebook-production"
CURRENT_RULEBOOK = ROOT / "releases" / "v0.6.3-reconstructed" / "Gauntlet_v0.6.3_Rulebook.md"
PLAYER_FACING_REWRITES = ROOT / "rulebook" / "player-facing-rewrites.json"
PRODUCTION_SOURCE = PRODUCTION / ".v063-production-source.md"
HTML = PRODUCTION / "full-rulebook.html"
RUNTIME_PAGINATOR = PRODUCTION / ".paginate_rulebook_runtime.mjs"

LEADERS = (
    "General",
    "Commandant",
    "Ambassador",
    "Senator",
    "Banker",
    "Executive",
    "Ranger",
    "Spymaster",
    "Alchemist",
    "Spirit Walker",
    "Grand Inquisitor",
    "Witch Hunter",
)

sys.path.insert(0, str(PRODUCTION))

import build_rulebook  # noqa: E402
import build_complete_rulebook  # noqa: E402


def replace_required(source: str, old: str, new: str, label: str, expected: int = 1) -> str:
    count = source.count(old)
    if count != expected:
        raise RuntimeError(
            f"Expected exactly {expected} {label} marker(s) while adapting the approved "
            f"Rulebook production output; found {count}."
        )
    return source.replace(old, new)


def apply_player_facing_rewrites(source: str) -> str:
    """Apply the same strict editorial normalization used by the Browser Rulebook."""

    if not PLAYER_FACING_REWRITES.is_file():
        raise RuntimeError(f"Missing player-facing rewrite contract: {PLAYER_FACING_REWRITES}")
    rewrites = json.loads(PLAYER_FACING_REWRITES.read_text(encoding="utf-8"))
    if not isinstance(rewrites, list) or not rewrites:
        raise RuntimeError("Player-facing Rulebook rewrite contract is empty or invalid.")

    result = source
    for rewrite in rewrites:
        if not isinstance(rewrite, dict):
            raise RuntimeError("Player-facing Rulebook rewrite entry is malformed.")
        label = rewrite.get("label")
        old = rewrite.get("old")
        new = rewrite.get("new")
        expected = rewrite.get("expected", 1)
        if not isinstance(label, str) or not isinstance(old, str) or not isinstance(new, str) or not isinstance(expected, int):
            raise RuntimeError("Player-facing Rulebook rewrite entry is malformed.")
        result = replace_required(result, old, new, label, expected=expected)

    chapter_start = result.find("# 11. Detailed Card and Timing Rules")
    chapter_end = result.find("# 12. Overlays and Other Shared Card Rules", chapter_start)
    if chapter_start < 0 or chapter_end < 0:
        raise RuntimeError("Could not isolate player-facing Chapter 11.")
    chapter = result[chapter_start:chapter_end]
    for phrase in ("v0.6.3", "Cards therefore do not need", "Cards should", "Do not print", "The former "):
        if phrase in chapter:
            raise RuntimeError(f"Player-facing Chapter 11 still contains internal/editorial language: {phrase}")
    return result


def build_presentation_source(source: str) -> str:
    """Restore old production-only Leader hierarchy/art references."""

    output: list[str] = []
    leader_names = set(LEADERS)
    leader_count = 0
    wrapper_count = 0
    in_leader = False

    for original_line in source.splitlines():
        if original_line == "## Leaders":
            wrapper_count += 1
            in_leader = False
            continue

        heading_match = re.match(r"^(#{1,6})\s+(.+?)\s*$", original_line)
        heading_level = len(heading_match.group(1)) if heading_match else None
        heading_title = heading_match.group(2) if heading_match else None

        if heading_level == 3 and heading_title in leader_names:
            leader = heading_title
            image_rel = f"images/sketches/{leader.lower()}.png"
            image_path = ROOT / image_rel
            if not image_path.is_file():
                raise RuntimeError(f"Missing approved Leader sketch for {leader}: {image_rel}")
            output.append(f"## {leader}")
            output.append("")
            output.append(f"![{leader}](<{image_rel}>)")
            leader_count += 1
            in_leader = True
            continue

        if in_leader and heading_level is not None:
            if heading_level <= 2:
                in_leader = False
            elif heading_level >= 4:
                output.append(f"{'#' * (heading_level - 1)} {heading_title}")
                continue

        output.append(original_line)

    if wrapper_count != 6:
        raise RuntimeError(f"Expected six v0.6.3 Leaders wrapper headings; found {wrapper_count}.")
    if leader_count != len(LEADERS):
        raise RuntimeError(f"Expected {len(LEADERS)} current Leader headings; transformed {leader_count}.")

    transformed = "\n".join(output)
    if source.endswith("\n"):
        transformed += "\n"

    def semantic_lines(value: str) -> list[str]:
        result: list[str] = []
        for line in value.splitlines():
            if not line.strip() or line == "## Leaders":
                continue
            if re.match(r"^!\[[^]]+\]\(<images/sketches/[^>]+\.png>\)$", line):
                continue
            result.append(re.sub(r"^(#{1,6})\s+", "", line) if line.startswith("#") else line)
        return result

    if semantic_lines(source) != semantic_lines(transformed):
        raise RuntimeError("v0.6.3 production-source transform changed player-facing rules text instead of presentation structure only.")

    return transformed


def adapt_glossary_pagination(paginator: str) -> str:
    """Let the approved Glossary component continue when current content grows."""

    old = r'''function buildGlossary(section) {
  const page = createPage({ className: 'glossary-page', label: 'GLOSSARY', runningLeft: 'Part IV · Reference', runningRight: 'Glossary', anchor: section.heading.title });
  const flow = flowOf(page);
  flow.innerHTML = `<p class="eyebrow">Game terms</p><h2 class="page-title"${sourceAttr(section.heading)}>Glossary</h2><div class="glossary-grid"></div>`;
  const grid = flow.querySelector('.glossary-grid');
  for (const token of section.tokens) {
    if (token.kind !== 'paragraph') { consumed.add(token.id); continue; }
    const host = document.createElement('div'); host.innerHTML = token.html;
    const strong = host.querySelector('strong');
    const term = strong?.textContent?.replace(/:$/, '') || '';
    if (strong) strong.remove();
    const entry = document.createElement('div'); entry.className = 'glossary-entry'; entry.dataset.sourceId = token.id;
    entry.innerHTML = `<strong>${escapeHtml(term)}</strong>${host.innerHTML.replace(/^\s*:\s*/, '')}`;
    grid.append(entry);
  }
}'''

    new = r'''function buildGlossary(section) {
  const createGlossaryPage = (continuation = false) => {
    const page = createPage({
      className: continuation ? 'glossary-page continuation-page' : 'glossary-page',
      label: 'GLOSSARY',
      runningLeft: 'Part IV · Reference',
      runningRight: 'Glossary',
      anchor: continuation ? null : section.heading.title,
    });
    const flow = flowOf(page);
    if (continuation) {
      flow.innerHTML = '<div class="continuation-label">Glossary · continued</div><div class="glossary-grid"></div>';
    } else {
      flow.innerHTML = `<p class="eyebrow">Game terms</p><h2 class="page-title"${sourceAttr(section.heading)}>Glossary</h2><div class="glossary-grid"></div>`;
    }
    return page;
  };

  let page = createGlossaryPage(false);
  let flow = flowOf(page);
  let grid = flow.querySelector('.glossary-grid');

  for (const token of section.tokens) {
    if (token.kind !== 'paragraph') { consumed.add(token.id); continue; }
    const host = document.createElement('div'); host.innerHTML = token.html;
    const strong = host.querySelector('strong');
    const term = strong?.textContent?.replace(/:$/, '') || '';
    if (strong) strong.remove();
    const entry = document.createElement('div'); entry.className = 'glossary-entry'; entry.dataset.sourceId = token.id;
    entry.innerHTML = `<strong>${escapeHtml(term)}</strong>${host.innerHTML.replace(/^\s*:\s*/, '')}`;
    grid.append(entry);

    if (overflows(flow)) {
      entry.remove();
      page = createGlossaryPage(true);
      flow = flowOf(page);
      grid = flow.querySelector('.glossary-grid');
      grid.append(entry);
      if (overflows(flow)) {
        throw new Error(`Glossary entry cannot fit on an otherwise empty continuation page: ${term || token.id}`);
      }
    }
  }
}'''

    return replace_required(paginator, old, new, "approved single-page Glossary function")


def adapt_hero_plate_pool(paginator: str) -> str:
    """Use the unused approved hero sketches instead of repeating the cover art."""

    old = """  const heroSources = ['../images/sketches/hero sketch.png'];
  const source = heroSources[heroPlateIndex % heroSources.length];
  heroPlateIndex += 1;"""
    new = """  const heroSources = [
    '../images/sketches/hero-sketches/hero sketch 2.png',
    '../images/sketches/hero-sketches/hero sketch 3.png',
    '../images/sketches/hero-sketches/hero sketch 4.png',
  ];
  if (heroPlateIndex >= heroSources.length) throw new Error('More than three hero filler plates were required.');
  const source = heroSources[heroPlateIndex];
  heroPlateIndex += 1;"""
    return replace_required(paginator, old, new, "single repeated hero-plate source")


def adapt_signature_padding(paginator: str) -> str:
    """Globally place filler pages at the highest natural hierarchy that preserves spreads."""

    old = "    while ((pages.length + 2) % 4 !== 0) intentionalBlank('Booklet pagination');"
    new = r'''    const paddingNeeded = (4 - ((pages.length + 2) % 4)) % 4;
    const candidateByPage = new Map();
    const addCandidate = (anchor, tier) => {
      const page = anchors.get(anchor);
      if (!page) return;
      const existing = candidateByPage.get(page);
      if (!existing || tier < existing.tier) candidateByPage.set(page, { anchor, page, tier });
    };

    // Hierarchy: between Parts first, then between numbered chapters, then
    // major reference sections. Part I is the beginning of the body, not a
    // between-Part boundary, so it is deliberately excluded from tier 0.
    Object.keys(metadata.parts)
      .filter(title => title !== 'Part I — Learn to Play')
      .forEach(title => addCandidate(title, 0));
    metadata.chapters
      .filter(chapter => chapter.number !== null)
      .forEach(chapter => addCandidate(chapter.heading, 1));
    ['Quick Turn Reference', 'Glossary'].forEach(title => addCandidate(title, 2));

    const candidates = [...candidateByPage.values()]
      .map(candidate => ({ ...candidate, index: pages.indexOf(candidate.page) }))
      .filter(candidate => candidate.index >= 0)
      .sort((a, b) => a.tier - b.tier || a.index - b.index);

    const expectedLeaderPairs = [
      ['General', 'Commandant'],
      ['Ambassador', 'Senator'],
      ['Banker', 'Executive'],
      ['Ranger', 'Spymaster'],
      ['Alchemist', 'Spirit Walker'],
      ['Grand Inquisitor', 'Witch Hunter'],
    ];
    const leaderPageByName = new Map(
      pages
        .filter(page => page.classList.contains('leader-page'))
        .map(page => [page.querySelector('.leader-name')?.textContent?.trim() || '', page])
    );

    const choose = (items, count, start = 0, prefix = [], output = []) => {
      if (prefix.length === count) { output.push([...prefix]); return output; }
      for (let index = start; index <= items.length - (count - prefix.length); index += 1) {
        prefix.push(items[index]);
        choose(items, count, index + 1, prefix, output);
        prefix.pop();
      }
      return output;
    };

    const virtualPageNumber = (page, selection) => {
      const baseIndex = pages.indexOf(page);
      const precedingFillers = selection.filter(candidate => candidate.index <= baseIndex).length;
      return baseIndex + 1 + precedingFillers;
    };

    const preservesLeaderSpreads = selection => expectedLeaderPairs.every(([leftLeader, rightLeader]) => {
      const leftPage = leaderPageByName.get(leftLeader);
      const rightPage = leaderPageByName.get(rightLeader);
      if (!leftPage || !rightPage) return false;
      const left = virtualPageNumber(leftPage, selection);
      const right = virtualPageNumber(rightPage, selection);
      return left % 2 === 0 && right === left + 1;
    });

    const hierarchyScore = selection => {
      const counts = [0, 0, 0];
      selection.forEach(candidate => { counts[candidate.tier] += 1; });
      return counts;
    };
    const betterScore = (left, right) => {
      if (!right) return true;
      for (let tier = 0; tier < left.length; tier += 1) {
        if (left[tier] !== right[tier]) return left[tier] > right[tier];
      }
      return false;
    };

    let chosen = [];
    let chosenScore = null;
    if (paddingNeeded > 0) {
      for (const selection of choose(candidates, paddingNeeded)) {
        if (!preservesLeaderSpreads(selection)) continue;
        const score = hierarchyScore(selection);
        if (betterScore(score, chosenScore)) {
          chosen = selection;
          chosenScore = score;
        }
      }
      if (chosen.length !== paddingNeeded) {
        throw new Error(`No natural-boundary placement for ${paddingNeeded} filler page(s) preserves all Leader spreads.`);
      }
    }

    // Insert from the end of the document toward the front so original indices
    // remain stable while moving each newly-created hero plate into position.
    chosen.sort((a, b) => b.index - a.index);
    for (const candidate of chosen) {
      const plate = intentionalBlank('');
      const appended = pages.pop();
      if (appended !== plate) throw new Error('Hero plate insertion lost page order.');
      plate.dataset.heroPlateFor = candidate.anchor;
      pages.splice(candidate.index, 0, plate);
      candidate.page.before(plate);
    }'''
    return replace_required(paginator, old, new, "end-loaded booklet padding loop")


def main() -> None:
    if not CURRENT_RULEBOOK.is_file():
        raise RuntimeError(f"Missing current Rulebook source: {CURRENT_RULEBOOK}")

    current_source = CURRENT_RULEBOOK.read_text(encoding="utf-8")
    player_facing_source = apply_player_facing_rewrites(current_source)
    production_source = build_presentation_source(player_facing_source)
    PRODUCTION_SOURCE.write_text(production_source, encoding="utf-8")

    build_rulebook.RULEBOOK = PRODUCTION_SOURCE
    build_complete_rulebook.main()

    html = HTML.read_text(encoding="utf-8")
    html = replace_required(
        html,
        "Version 0.6.1 · First Playtest Revision",
        "Version 0.6.3",
        "approved cover version",
    )
    html = replace_required(
        html,
        "Gauntlet v0.6.1 Official Rulebook",
        "Gauntlet v0.6.3 Official Rulebook",
        "document title",
        expected=2,
    )
    html = html.replace("GAUNTLET V0.6.1", "GAUNTLET V0.6.3")
    html = html.replace("Gauntlet v0.6.1 · First Playtest Revision", "Gauntlet v0.6.3")
    HTML.write_text(html, encoding="utf-8")

    paginator = RUNTIME_PAGINATOR.read_text(encoding="utf-8")
    paginator = replace_required(
        paginator,
        "GAUNTLET V0.6.1",
        "GAUNTLET V0.6.3",
        "folio version",
        expected=3,
    )
    paginator = paginator.replace("Gauntlet v0.6.1", "Gauntlet v0.6.3")
    paginator = adapt_glossary_pagination(paginator)
    paginator = adapt_hero_plate_pool(paginator)
    paginator = adapt_signature_padding(paginator)
    RUNTIME_PAGINATOR.write_text(paginator, encoding="utf-8")

    print(
        f"adapted approved Rulebook production system to {CURRENT_RULEBOOK.relative_to(ROOT)} "
        "with shared player-facing editorial normalization, 12 presentation-only Leader sketches, "
        "content-aware Glossary continuation, hierarchical filler placement, and unique hero filler art"
    )


if __name__ == "__main__":
    main()
