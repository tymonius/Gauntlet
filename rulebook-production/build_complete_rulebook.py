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
