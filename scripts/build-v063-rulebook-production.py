#!/usr/bin/env python3
"""Adapt the approved Rulebook production system to the current v0.6.3 source."""

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
    "General", "Commandant", "Ambassador", "Senator", "Banker", "Executive",
    "Ranger", "Spymaster", "Alchemist", "Spirit Walker", "Grand Inquisitor", "Witch Hunter",
)

sys.path.insert(0, str(PRODUCTION))
import build_rulebook  # noqa: E402
import build_complete_rulebook  # noqa: E402


def replace_required(source: str, old: str, new: str, label: str, expected: int = 1) -> str:
    count = source.count(old)
    if count != expected:
        raise RuntimeError(f"Expected exactly {expected} {label} marker(s); found {count}.")
    return source.replace(old, new)


def apply_player_facing_rewrites(source: str) -> str:
    rewrites = json.loads(PLAYER_FACING_REWRITES.read_text(encoding="utf-8"))
    if not isinstance(rewrites, list) or not rewrites:
        raise RuntimeError("Player-facing Rulebook rewrite contract is empty or invalid.")
    result = source
    for rewrite in rewrites:
        label, old, new = rewrite.get("label"), rewrite.get("old"), rewrite.get("new")
        expected = rewrite.get("expected", 1)
        if not isinstance(label, str) or not isinstance(old, str) or not isinstance(new, str) or not isinstance(expected, int):
            raise RuntimeError("Player-facing Rulebook rewrite entry is malformed.")
        result = replace_required(result, old, new, label, expected)

    start = result.find("# 11. Detailed Card and Timing Rules")
    end = result.find("# 12. Overlays and Other Shared Card Rules", start)
    if start < 0 or end < 0:
        raise RuntimeError("Could not isolate player-facing Chapter 11.")
    chapter = result[start:end]
    for phrase in ("v0.6.3", "Cards therefore do not need", "Cards should", "Do not print", "The former "):
        if phrase in chapter:
            raise RuntimeError(f"Player-facing Chapter 11 still contains internal/editorial language: {phrase}")
    return result


def build_presentation_source(source: str) -> str:
    output: list[str] = []
    names = set(LEADERS)
    leader_count = 0
    wrapper_count = 0
    in_leader = False
    for line in source.splitlines():
        if line == "## Leaders":
            wrapper_count += 1
            in_leader = False
            continue
        match = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
        level = len(match.group(1)) if match else None
        title = match.group(2) if match else None
        if level == 3 and title in names:
            image_rel = f"images/sketches/{title.lower()}.png"
            if not (ROOT / image_rel).is_file():
                raise RuntimeError(f"Missing approved Leader sketch for {title}: {image_rel}")
            output.extend([f"## {title}", "", f"![{title}](<{image_rel}>)"])
            leader_count += 1
            in_leader = True
            continue
        if in_leader and level is not None:
            if level <= 2:
                in_leader = False
            elif level >= 4:
                output.append(f"{'#' * (level - 1)} {title}")
                continue
        output.append(line)

    if wrapper_count != 6 or leader_count != len(LEADERS):
        raise RuntimeError(f"Leader presentation transform mismatch: wrappers={wrapper_count}, leaders={leader_count}.")
    transformed = "\n".join(output) + ("\n" if source.endswith("\n") else "")

    def semantic_lines(value: str) -> list[str]:
        lines: list[str] = []
        for line in value.splitlines():
            if not line.strip() or line == "## Leaders":
                continue
            if re.match(r"^!\[[^]]+\]\(<images/sketches/[^>]+\.png>\)$", line):
                continue
            lines.append(re.sub(r"^(#{1,6})\s+", "", line) if line.startswith("#") else line)
        return lines

    if semantic_lines(source) != semantic_lines(transformed):
        raise RuntimeError("Production-source transform changed player-facing rules text.")
    return transformed


def adapt_glossary_pagination(paginator: str) -> str:
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
    const page = createPage({ className: continuation ? 'glossary-page continuation-page' : 'glossary-page', label: 'GLOSSARY', runningLeft: 'Part IV · Reference', runningRight: 'Glossary', anchor: continuation ? null : section.heading.title });
    const flow = flowOf(page);
    flow.innerHTML = continuation
      ? '<div class="continuation-label">Glossary · continued</div><div class="glossary-grid"></div>'
      : `<p class="eyebrow">Game terms</p><h2 class="page-title"${sourceAttr(section.heading)}>Glossary</h2><div class="glossary-grid"></div>`;
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
      if (overflows(flow)) throw new Error(`Glossary entry cannot fit on an empty continuation page: ${term || token.id}`);
    }
  }
}'''
    return replace_required(paginator, old, new, "approved single-page Glossary function")


def adapt_hero_plate_pool(paginator: str) -> str:
    old = """  const heroSources = ['../images/sketches/hero sketch.png'];
  const source = heroSources[heroPlateIndex % heroSources.length];
  heroPlateIndex += 1;"""
    new = """  const heroSources = [
    '../images/sketches/hero-sketches/hero sketch 2.png',
    '../images/sketches/hero-sketches/hero sketch 3.png',
    '../images/sketches/hero-sketches/hero sketch 4.png',
    '../images/sketches/hero sketch.png',
  ];
  if (heroPlateIndex >= heroSources.length) throw new Error('More than four hero filler plates were required.');
  const source = heroSources[heroPlateIndex];
  heroPlateIndex += 1;"""
    return replace_required(paginator, old, new, "single repeated hero-plate source")


def adapt_signature_padding(paginator: str) -> str:
    old = "    while ((pages.length + 2) % 4 !== 0) intentionalBlank('Booklet pagination');"
    new = r'''    const paddingNeeded = (4 - ((pages.length + 2) % 4)) % 4;
    const candidateByPage = new Map();
    const addCandidate = (anchor, tier) => {
      const page = anchors.get(anchor);
      if (!page) return;
      const existing = candidateByPage.get(page);
      if (!existing || tier < existing.tier) candidateByPage.set(page, { anchor, page, tier });
    };
    Object.keys(metadata.parts).filter(title => title !== 'Part I — Learn to Play').forEach(title => addCandidate(title, 0));
    metadata.chapters.filter(chapter => chapter.number !== null).forEach(chapter => addCandidate(chapter.heading, 1));
    ['Quick Turn Reference', 'Glossary'].forEach(title => addCandidate(title, 2));

    const candidates = [...candidateByPage.values()]
      .map(candidate => ({ ...candidate, index: pages.indexOf(candidate.page) }))
      .filter(candidate => candidate.index >= 0)
      .sort((a, b) => a.tier - b.tier || a.index - b.index);
    const expectedLeaderPairs = [
      ['General', 'Commandant'], ['Ambassador', 'Senator'], ['Banker', 'Executive'],
      ['Ranger', 'Spymaster'], ['Alchemist', 'Spirit Walker'], ['Grand Inquisitor', 'Witch Hunter'],
    ];
    const leaderPageByName = new Map(pages.filter(page => page.classList.contains('leader-page')).map(page => [page.querySelector('.leader-name')?.textContent?.trim() || '', page]));

    const choose = (items, count, start = 0, prefix = [], output = []) => {
      if (prefix.length === count) { output.push([...prefix]); return output; }
      for (let index = start; index <= items.length - (count - prefix.length); index += 1) {
        prefix.push(items[index]); choose(items, count, index + 1, prefix, output); prefix.pop();
      }
      return output;
    };
    const virtualPageNumber = (page, selection) => {
      const baseIndex = pages.indexOf(page);
      return baseIndex + 1 + selection.filter(candidate => candidate.index <= baseIndex).length;
    };
    const preservesLeaderSpreads = selection => expectedLeaderPairs.every(([leftName, rightName]) => {
      const leftPage = leaderPageByName.get(leftName), rightPage = leaderPageByName.get(rightName);
      if (!leftPage || !rightPage) return false;
      const left = virtualPageNumber(leftPage, selection), right = virtualPageNumber(rightPage, selection);
      return left % 2 === 0 && right === left + 1;
    });
    const score = selection => {
      const counts = [0, 0, 0];
      selection.forEach(candidate => { counts[candidate.tier] += 1; });
      const rectoStarts = selection.filter(candidate => virtualPageNumber(candidate.page, selection) % 2 === 1).length;
      const ordered = [...selection].sort((a, b) => a.index - b.index);
      const dispersion = ordered.length < 2 ? 0 : Math.min(...ordered.slice(1).map((candidate, index) => candidate.index - ordered[index].index));
      return [counts[0], counts[1], rectoStarts, dispersion];
    };
    const better = (left, right) => {
      if (!right) return true;
      for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) return left[index] > right[index];
      }
      return false;
    };

    let chosen = null;
    let chosenScore = null;
    for (let fillerCount = paddingNeeded; fillerCount <= 4; fillerCount += 4) {
      for (const selection of choose(candidates, fillerCount)) {
        if (!preservesLeaderSpreads(selection)) continue;
        const candidateScore = score(selection);
        if (chosen === null || better(candidateScore, chosenScore)) {
          chosen = selection;
          chosenScore = candidateScore;
        }
      }
      if (chosen !== null) break;
    }
    if (chosen === null) throw new Error(`No natural-boundary filler plan preserves all Leader spreads from base padding ${paddingNeeded}.`);

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
    current_source = CURRENT_RULEBOOK.read_text(encoding="utf-8")
    production_source = build_presentation_source(apply_player_facing_rewrites(current_source))
    PRODUCTION_SOURCE.write_text(production_source, encoding="utf-8")
    build_rulebook.RULEBOOK = PRODUCTION_SOURCE
    build_complete_rulebook.main()

    html = HTML.read_text(encoding="utf-8")
    html = replace_required(html, "Version 0.6.1 · First Playtest Revision", "Version 0.6.3", "approved cover version")
    html = replace_required(html, "Gauntlet v0.6.1 Official Rulebook", "Gauntlet v0.6.3 Official Rulebook", "document title", 2)
    html = html.replace("GAUNTLET V0.6.1", "GAUNTLET V0.6.3").replace("Gauntlet v0.6.1 · First Playtest Revision", "Gauntlet v0.6.3")
    HTML.write_text(html, encoding="utf-8")

    paginator = RUNTIME_PAGINATOR.read_text(encoding="utf-8")
    paginator = replace_required(paginator, "GAUNTLET V0.6.1", "GAUNTLET V0.6.3", "folio version", 3)
    paginator = paginator.replace("Gauntlet v0.6.1", "Gauntlet v0.6.3")
    paginator = adapt_glossary_pagination(paginator)
    paginator = adapt_hero_plate_pool(paginator)
    paginator = adapt_signature_padding(paginator)
    RUNTIME_PAGINATOR.write_text(paginator, encoding="utf-8")
    print("adapted approved Rulebook production to v0.6.3 with player-facing editorial normalization, hierarchical filler planning, and unique hero filler art")


if __name__ == "__main__":
    main()
