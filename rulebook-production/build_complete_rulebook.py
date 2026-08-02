#!/usr/bin/env python3
"""Build the complete Rulebook HTML and attach production layout controls."""

from __future__ import annotations

from pathlib import Path

import build_rulebook

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "full-rulebook.html"
PAGINATOR = ROOT / "paginate_rulebook.mjs"
RUNTIME_PAGINATOR = ROOT / ".paginate_rulebook_runtime.mjs"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label} block; found {count}.")
    return source.replace(old, new, 1)


def build_runtime_paginator() -> None:
    source = PAGINATOR.read_text(encoding="utf-8")

    old_blank = '''function intentionalBlank(reason = 'Section begins on the following recto') {
  const page = createPage({ className: 'intentional-blank', furniture: false });
  page.querySelector('.production-flow').outerHTML = `<div class="blank-mark"></div><div class="blank-note">${escapeHtml(reason)}</div>`;
  return page;
}'''
    new_blank = '''let heroPlateIndex = 0;
function intentionalBlank(reason = '') {
  const page = createPage({ className: 'intentional-blank hero-plate-page', furniture: false });
  const heroSources = ['../images/sketches/hero sketch.png'];
  const source = heroSources[heroPlateIndex % heroSources.length];
  heroPlateIndex += 1;
  page.querySelector('.production-flow').outerHTML = `<div class="hero-plate" role="img" aria-label="Gauntlet hero sketch"><img src="${source}" alt="" /></div>`;
  return page;
}'''
    source = replace_once(source, old_blank, new_blank, "intentional-blank")

    # Part and faction openers no longer force an otherwise empty verso. They
    # begin on the next naturally available page; only final booklet padding is
    # retained, and those pages are rendered as silent hero-art plates.
    source = replace_once(
        source,
        '  ensureRecto(`${meta.label} begins on a recto`);\n',
        '',
        "Part recto",
    )
    source = replace_once(
        source,
        '  ensureRecto(`${faction} begins on a recto`);\n',
        '',
        "faction recto",
    )

    old_golden_page = '''  const goldenPage = createPage({ className: 'frontmatter-page', label: 'WELCOME', runningLeft: 'Welcome', runningRight: 'Golden Rules', anchor: 'Golden Rules' });
  const goldenFlow = flowOf(goldenPage);
  goldenFlow.innerHTML = '<p class="flavor-overline">Rules before exceptions</p>';
  const goldenHeading = document.createElement('h2');
  goldenHeading.className = 'page-title';
  goldenHeading.dataset.sourceId = golden.heading.id;
  goldenHeading.textContent = golden.heading.title;
  goldenFlow.append(goldenHeading);
  const goldenGrid = document.createElement('div');
  goldenGrid.className = 'golden-rules';
  for (const token of sectionContent(golden)) {
    if (token.kind === 'list') {
      token.items.forEach((item, index) => {
        const entry = document.createElement('div');
        entry.dataset.sourceId = token.id;
        entry.dataset.fragment = String(index + 1);
        entry.innerHTML = item;
        goldenGrid.append(entry);
      });
    } else {
      goldenGrid.append(makeTokenElement(token));
    }
  }
  goldenFlow.append(goldenGrid);'''
    new_golden_page = '''  const goldenSection = document.createElement('section');
  goldenSection.className = 'golden-rules-compact';
  const goldenHeading = document.createElement('h3');
  goldenHeading.dataset.sourceId = golden.heading.id;
  goldenHeading.textContent = golden.heading.title;
  goldenSection.append(goldenHeading);
  const goldenGrid = document.createElement('div');
  goldenGrid.className = 'golden-rules';
  for (const token of sectionContent(golden)) {
    if (token.kind === 'list') {
      token.items.forEach((item, index) => {
        const entry = document.createElement('div');
        entry.dataset.sourceId = token.id;
        entry.dataset.fragment = String(index + 1);
        entry.innerHTML = item;
        goldenGrid.append(entry);
      });
    } else {
      goldenGrid.append(makeTokenElement(token));
    }
  }
  goldenSection.append(goldenGrid);
  glanceFlow.append(goldenSection);
  if (!anchors.has('Golden Rules')) anchors.set('Golden Rules', glancePage);'''
    source = replace_once(source, old_golden_page, new_golden_page, "Golden Rules consolidation")

    old_continuation = '''function newContinuationPage(context) {
  const page = createPage({
    className: 'chapter-page continuation-page',
    label: context.label,
    runningLeft: context.runningLeft,
    runningRight: context.runningRight,
    faction: context.faction,
  });
  const flow = flowOf(page);'''
    new_continuation = '''function newContinuationPage(context) {
  const page = createPage({
    className: 'chapter-page continuation-page',
    label: context.label,
    runningLeft: context.runningLeft,
    runningRight: context.runningRight,
    faction: context.faction,
  });
  page.dataset.contextTitle = context.title;
  const flow = flowOf(page);'''
    source = replace_once(source, old_continuation, new_continuation, "continuation context")

    old_heading_element = '''  } else if (token.kind === 'heading') {
    const level = Math.min(5, Math.max(2, token.level + headingOffset));
    element = document.createElement(`h${level}`);
    element.innerHTML = token.html;'''
    new_heading_element = '''  } else if (token.kind === 'heading') {
    const level = Math.min(5, Math.max(2, token.level + headingOffset));
    element = document.createElement(`h${level}`);
    element.innerHTML = token.html;
    element.dataset.headingTitle = token.title;'''
    source = replace_once(source, old_heading_element, new_heading_element, "heading metadata")

    old_heading_keep = '''    const next = sourceTokens[index + 1];
    if (token.kind === 'heading' && next && !['heading', 'pagebreak', 'divider'].includes(next.kind)) {
      const group = document.createElement('div');
      group.className = 'keep-group';
      group.append(makeTokenElement(token), makeTokenElement(next));
      const flow = flowOf(page);
      flow.append(group);
      if (overflows(flow)) {
        group.remove();
        if (hasRealContent(flow)) page = newContinuationPage(context);
        const target = flowOf(page);
        target.append(group);
        if (overflows(target)) {
          group.remove();
          page = appendSingleToken(token, page, context);
          page = appendSingleToken(next, page, context);
        }
      }
      index += 1;
      continue;
    }'''
    new_heading_keep = '''    if (token.kind === 'heading') {
      let nextIndex = index + 1;
      let crossedPageBreak = false;
      const groupTokens = [token];
      while (nextIndex < sourceTokens.length) {
        const candidate = sourceTokens[nextIndex];
        if (['pagebreak', 'divider'].includes(candidate.kind)) {
          crossedPageBreak ||= candidate.kind === 'pagebreak';
          consumed.add(candidate.id);
          nextIndex += 1;
          continue;
        }
        groupTokens.push(candidate);
        if (candidate.kind !== 'heading') break;
        nextIndex += 1;
      }
      const openingContent = groupTokens.at(-1);
      if (openingContent && openingContent.kind !== 'heading') {
        if (crossedPageBreak && hasRealContent(flowOf(page))) page = newContinuationPage(context);
        const group = document.createElement('div');
        group.className = 'keep-group';
        group.append(...groupTokens.map(makeTokenElement));
        const flow = flowOf(page);
        flow.append(group);
        if (overflows(flow)) {
          group.remove();
          if (hasRealContent(flow)) page = newContinuationPage(context);
          const target = flowOf(page);
          target.append(group);
          if (overflows(target)) {
            group.remove();
            for (const groupedToken of groupTokens) {
              page = appendSingleToken(groupedToken, page, context);
            }
          }
        }
        index = nextIndex;
        continue;
      }
    }'''
    source = replace_once(source, old_heading_keep, new_heading_keep, "semantic heading keep")

    RUNTIME_PAGINATOR.write_text(source, encoding="utf-8")


def main() -> None:
    build_rulebook.main()
    build_runtime_paginator()
    content = OUTPUT.read_text(encoding="utf-8")

    head_marker = "</head>"
    production_links = (
        '<link rel="stylesheet" href="pagination-reserve.css" />\n'
        '<link rel="stylesheet" href="chapter-compaction.css" />\n'
        '<link rel="stylesheet" href="supplemental-reference.css" />\n'
        '<link rel="stylesheet" href="publication-corrections.css" />\n'
    )
    if head_marker not in content:
        raise RuntimeError("Could not attach the production pagination styles.")
    content = content.replace(head_marker, f"{production_links}{head_marker}", 1)

    script_marker = '<script type="module" src="paginate_rulebook.mjs"></script>'
    script_replacement = (
        '<script src="normalize_rulebook_layout.js"></script>\n'
        '<script src="postprocess_rulebook.mjs"></script>\n'
        '<script type="module" src=".paginate_rulebook_runtime.mjs"></script>'
    )
    if script_marker not in content:
        raise RuntimeError("Could not attach Rulebook layout controls around pagination.")
    content = content.replace(script_marker, script_replacement, 1)

    OUTPUT.write_text(content, encoding="utf-8")
    print(
        f"attached current-rule normalization, corrected pagination, publication styles, "
        f"and structural postprocessing to {OUTPUT}"
    )


if __name__ == "__main__":
    main()
