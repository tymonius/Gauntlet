#!/usr/bin/env python3
"""Adapt the approved Rulebook production system to the current v0.6.3 source."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRODUCTION = ROOT / "rulebook-production"
CURRENT_RULEBOOK = ROOT / "releases" / "v0.6.3" / "Gauntlet_v0.6.3_Rulebook.md"
PLAYER_RULEBOOK_INPUT = PRODUCTION / ".v063-player-facing-input.md"
PLAYER_CHAPTER_11 = ROOT / "rulebook" / "player-facing" / "chapter-11.md"
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


def assert_reviewed_chapter_11(source: str, label: str) -> None:
    """Require the production input to contain the exact reviewed player-facing Chapter 11."""

    start_marker = "# 11. Detailed Card and Timing Rules"
    end_marker = "# 12. Overlays and Other Shared Card Rules"
    start = source.find(start_marker)
    end = source.find(end_marker, start + len(start_marker))
    if start < 0 or end <= start:
        raise RuntimeError(f"{label} is missing the Chapter 11 publication boundary.")
    expected = PLAYER_CHAPTER_11.read_text(encoding="utf-8").replace("\r\n", "\n").strip()
    actual = source[start:end].replace("\r\n", "\n").strip()
    if actual != expected:
        raise RuntimeError(f"{label} does not contain the exact reviewed player-facing Chapter 11.")
    for forbidden in (
        "## Inherited interaction rules",
        "## Adopted v0.6.3 card procedures",
        "v0.6.3 no longer uses",
        "Cards therefore do not need",
        "Do not print `from Reserve`",
    ):
        if forbidden in actual:
            raise RuntimeError(f"{label} Chapter 11 still contains internal language: {forbidden}")


def build_presentation_source(source: str) -> str:
    """Restore production-only Leader hierarchy and approved portrait references."""

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
    """Use each unused hero sketch once; extra signature filler stays visually quiet."""

    old = """  const heroSources = ['../images/sketches/hero sketch.png'];
  const source = heroSources[heroPlateIndex % heroSources.length];
  heroPlateIndex += 1;"""
    new = """  const heroSources = [
    '../images/sketches/hero-sketches/hero sketch 2.png',
    '../images/sketches/hero-sketches/hero sketch 3.png',
    '../images/sketches/hero-sketches/hero sketch 4.png',
  ];
  const source = heroPlateIndex < heroSources.length ? heroSources[heroPlateIndex] : null;
  heroPlateIndex += 1;
  if (!source) {
    page.classList.remove('hero-plate-page');
    page.classList.add('signature-blank-page');
    page.querySelector('.production-flow').outerHTML = '<div class=\"signature-blank\" aria-hidden=\"true\"></div>';
    return page;
  }"""
    return replace_required(paginator, old, new, "single repeated hero-plate source")


def adapt_signature_padding(paginator: str) -> str:
    """Choose the smallest legal filler count, then maximize natural hierarchy."""

    old = "    while ((pages.length + 2) % 4 !== 0) intentionalBlank('Booklet pagination');"
    new = r'''    const paddingNeeded = (4 - ((pages.length + 2) % 4)) % 4;
    const expectedLeaderPairs = [
      ['General', 'Commandant'], ['Ambassador', 'Senator'], ['Banker', 'Executive'],
      ['Ranger', 'Spymaster'], ['Alchemist', 'Spirit Walker'], ['Grand Inquisitor', 'Witch Hunter'],
    ];
    const leaderPageByName = new Map(
      pages.filter(page => page.classList.contains('leader-page'))
        .map(page => [page.querySelector('.leader-name')?.textContent?.trim() || '', page])
    );

    const candidateByPage = new Map();
    const addCandidatePage = (page, label, tier, kind) => {
      if (!page) return;
      const existing = candidateByPage.get(page);
      if (!existing || tier < existing.tier) candidateByPage.set(page, { page, label, tier, kind });
    };
    const addAnchorCandidate = (anchor, tier, kind) => addCandidatePage(anchors.get(anchor), anchor, tier, kind);

    // Editorial hierarchy for discretionary filler:
    // 0. Between Parts.
    // 1. Between numbered chapters (including faction chapters).
    // 2. Between a faction's shared rules and its two-page Leader profile spread.
    // 3. Between major reference sections.
    Object.keys(metadata.parts)
      .filter(title => title !== 'Part I — Learn to Play')
      .forEach(title => addAnchorCandidate(title, 0, 'part'));
    metadata.chapters
      .filter(chapter => chapter.number !== null)
      .forEach(chapter => addAnchorCandidate(chapter.heading, 1, 'chapter'));
    expectedLeaderPairs.forEach(([leftLeader, rightLeader]) => {
      addCandidatePage(leaderPageByName.get(leftLeader), `${leftLeader} / ${rightLeader} Leader spread`, 2, 'leader-spread');
    });
    ['Quick Turn Reference', 'Glossary'].forEach(title => addAnchorCandidate(title, 3, 'reference'));

    const candidates = [...candidateByPage.values()]
      .map(candidate => ({ ...candidate, index: pages.indexOf(candidate.page) }))
      .filter(candidate => candidate.index >= 0)
      .sort((a, b) => a.tier - b.tier || a.index - b.index);
    const groups = [0, 1, 2, 3].map(tier => candidates.filter(candidate => candidate.tier === tier));

    function* choose(items, count, start = 0, prefix = []) {
      if (prefix.length === count) { yield [...prefix]; return; }
      for (let index = start; index <= items.length - (count - prefix.length); index += 1) {
        prefix.push(items[index]);
        yield* choose(items, count, index + 1, prefix);
        prefix.pop();
      }
    }
    function* tierCountPlans(total, tier = 0, prefix = []) {
      if (tier === groups.length - 1) {
        if (total <= groups[tier].length) yield [...prefix, total];
        return;
      }
      const maximum = Math.min(groups[tier].length, total);
      for (let count = maximum; count >= 0; count -= 1) {
        yield* tierCountPlans(total - count, tier + 1, [...prefix, count]);
      }
    }
    function* selectionsForCounts(counts, tier = 0, prefix = []) {
      if (tier === groups.length) { yield prefix; return; }
      for (const subset of choose(groups[tier], counts[tier])) {
        yield* selectionsForCounts(counts, tier + 1, [...prefix, ...subset]);
      }
    }
    const virtualPageNumber = (page, selection) => {
      const baseIndex = pages.indexOf(page);
      return baseIndex + 1 + selection.filter(candidate => candidate.index <= baseIndex).length;
    };
    const preservesLeaderSpreads = selection => expectedLeaderPairs.every(([leftName, rightName]) => {
      const leftPage = leaderPageByName.get(leftName);
      const rightPage = leaderPageByName.get(rightName);
      if (!leftPage || !rightPage) return false;
      const left = virtualPageNumber(leftPage, selection);
      const right = virtualPageNumber(rightPage, selection);
      return left % 2 === 0 && right === left + 1;
    });
    const dispersion = selection => {
      const ordered = [...selection].sort((a, b) => a.index - b.index);
      return ordered.length < 2
        ? 0
        : Math.min(...ordered.slice(1).map((candidate, index) => candidate.index - ordered[index].index));
    };

    let chosen = null;
    for (let fillerCount = paddingNeeded; fillerCount <= candidates.length; fillerCount += 4) {
      for (const counts of tierCountPlans(fillerCount)) {
        let bestForHierarchy = null;
        let bestDispersion = -1;
        for (const selection of selectionsForCounts(counts)) {
          if (!preservesLeaderSpreads(selection)) continue;
          const candidateDispersion = dispersion(selection);
          if (bestForHierarchy === null || candidateDispersion > bestDispersion) {
            bestForHierarchy = selection;
            bestDispersion = candidateDispersion;
          }
        }
        if (bestForHierarchy !== null) {
          chosen = bestForHierarchy;
          break;
        }
      }
      if (chosen !== null) break;
    }

    if (chosen === null) {
      const leaders = expectedLeaderPairs.map(([left, right]) => [
        left, pages.indexOf(leaderPageByName.get(left)) + 1,
        right, pages.indexOf(leaderPageByName.get(right)) + 1,
      ]);
      const available = candidates.map(candidate => [candidate.label, candidate.tier, candidate.index + 1]);
      throw new Error(`No natural-boundary filler plan preserves Leader spreads from base padding ${paddingNeeded}. Leaders=${JSON.stringify(leaders)} Candidates=${JSON.stringify(available)}`);
    }

    // Create filler pages in hierarchy order so the three approved unused hero
    // sketches land at the strongest selected boundaries; any additional pages
    // needed for a full signature remain quiet intentional blanks.
    const plateByCandidate = new Map();
    const artOrder = [...chosen].sort((a, b) => a.tier - b.tier || a.index - b.index);
    for (const candidate of artOrder) {
      const plate = intentionalBlank('');
      const appended = pages.pop();
      if (appended !== plate) throw new Error('Filler-page creation lost page order.');
      plateByCandidate.set(candidate, plate);
    }

    // Insert from the end toward the front so the original candidate indices
    // stay valid while the selected layout plan is applied.
    chosen.sort((a, b) => b.index - a.index);
    for (const candidate of chosen) {
      const plate = plateByCandidate.get(candidate);
      plate.dataset.heroPlateFor = candidate.label;
      plate.dataset.heroPlateTier = String(candidate.tier);
      plate.dataset.heroPlateKind = candidate.kind;
      pages.splice(candidate.index, 0, plate);
      candidate.page.before(plate);
    }'''
    return replace_required(paginator, old, new, "end-loaded booklet padding loop")


def main() -> None:
    source_path = PLAYER_RULEBOOK_INPUT if PLAYER_RULEBOOK_INPUT.is_file() else CURRENT_RULEBOOK
    current_source = source_path.read_text(encoding="utf-8")
    if source_path == PLAYER_RULEBOOK_INPUT:
        assert_reviewed_chapter_11(current_source, "Transient player-facing Rulebook input")
    production_source = build_presentation_source(current_source)
    if source_path == PLAYER_RULEBOOK_INPUT:
        assert_reviewed_chapter_11(production_source, "Approved-production Rulebook source")
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
    print(f"adapted approved Rulebook production to v0.6.3 from {source_path.relative_to(ROOT)} with wording-neutral presentation transforms, minimum-count hierarchical filler planning, and unique hero filler art")


if __name__ == "__main__":
    main()