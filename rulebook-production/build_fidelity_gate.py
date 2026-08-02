#!/usr/bin/env python3
"""Build a production fidelity checkpoint from the approved PR #357 templates."""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
APPROVED_PATH = REPO / "rulebook-design" / "build_proofs.py"


def load_approved_module():
    spec = importlib.util.spec_from_file_location("gauntlet_approved_rulebook_design", APPROVED_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load approved design source: {APPROVED_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def setup_page(approved) -> str:
    steps = [
        ("Prepare the Draw Pile", "Shuffle the Playable Deck and place it face down. Leave room for the Discard Pile and Graveyard."),
        ("Arrange Territories", "Secretly arrange the three Territory Cards in a line facing their owner."),
        ("Form the Gauntlet", "Join both Territory lines to create one six-Territory column."),
        ("Reveal Territories", "Reveal all six simultaneously. They remain face up unless an effect says otherwise."),
        ("Prepare faction components", "Place Leaders, trackers, references, and supplemental components according to their rules."),
        ("Place Player Tokens", "Place each token immediately before the Territory at that player's end."),
        ("Draw opening Hands", "Each player draws three cards."),
        ("Determine first player", "Each player rolls one die. Higher result goes first; reroll ties."),
    ]
    step_html = "".join(
        f'<div class="battle-step"><span class="num">{index}</span><div><h4>{title}</h4><p>{text}</p></div></div>'
        for index, (title, text) in enumerate(steps, 1)
    )
    return approved.page(
        5,
        f'''
      {approved.running("Part I · Learn to Play", "Setup")}<div class="chapter-title-row"><div class="chapter-number">3</div><h2>Setup</h2></div>
      <div class="rule-box"><span class="label">How it works</span><div class="body-copy">Shuffle your Playable Deck, arrange your three Territories secretly, then join them to your opponent's three Territories. Reveal the full Gauntlet, place your token just before your end, draw three cards, and roll to see who goes first.</div></div>
      <div class="battle-steps setup-steps">{step_html}</div>
      <div class="reminder"><strong>Keep zones distinct:</strong> Hand, temporary battle cards, Discard Pile, Graveyard, Assets, and faction components should remain clearly separate.</div>''',
        label="CHAPTER 3",
    )


def main() -> None:
    approved = load_approved_module()
    approved_pages = approved.build_pages()

    # Seven pages are intentionally reused without modification. CI compares
    # their raster output against the approved proof pixel for pixel. The Setup
    # page is the first current-content extension of that exact design system.
    pages = [
        approved_pages[0],
        approved_pages[1],
        approved_pages[2],
        approved_pages[3],
        setup_page(approved),
        approved_pages[5],
        approved_pages[6],
        approved_pages[7],
    ]

    html = approved.shell(
        "Gauntlet v0.6.1 Rulebook Production Fidelity Gate",
        "\n".join(pages),
        body_class="color-edition fidelity-gate",
    ).replace('href="proof-runtime.css"', 'href="../rulebook-design/proof-runtime.css"')

    output = ROOT / "fidelity-gate.html"
    output.write_text(html, encoding="utf-8")
    print(f"generated {output}")


if __name__ == "__main__":
    main()
