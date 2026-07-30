from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path('.')
CANONICAL = ROOT / 'releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json'
OUTPUT = ROOT / 'docs/internal/Arcane_Knowledge_Replay_Audit.md'

content = json.loads(CANONICAL.read_text())
source_files = sorted((ROOT / 'src').rglob('*.ts'))
file_lines = {path: path.read_text().splitlines() for path in source_files}


def battle_text(card: dict) -> str | None:
    value = card.get('battle')
    if isinstance(value, str) and value.strip():
        return value.strip()
    for effect in card.get('effects', []):
        if effect.get('label') in {'Battle', 'Gambit', 'Tactic'}:
            text = effect.get('text')
            if isinstance(text, str) and text.strip():
                return text.strip()
    return None


def timing_tags(text: str) -> list[str]:
    lower = text.lower()
    tags: list[str] = []
    patterns = [
        ('formation', ('forming your initial battle hand', 'initial battle hand', 'before battle hands')),
        ('pre-reveal', ('before the other cards', 'before the normal reveal', 'when this is revealed')),
        ('reveal', ('when this is revealed', 'during this battle', 'add +', 'gain advantage', 'disadvantage')),
        ('dice', ('after battle dice', 'after all rerolls', 'reroll', 'die result', 'battle total is lower')),
        ('cleanup', ('during battle cleanup', 'during cleanup', 'normal destination')),
        ('aftermath', ('if you win', 'if you lose', 'after completing your normal retreat', 'after the battle')),
        ('board-change', ('capture that territory', 'place this', 'overlay', 'movement', 'withdraw')),
        ('targeted', ('choose one', 'cancel one', 'negate one', 'look at one', 'replace this')),
    ]
    for tag, needles in patterns:
        if any(needle in lower for needle in needles):
            tags.append(tag)
    return tags or ['other']


def occurrences(card_id: str) -> list[tuple[Path, int, str]]:
    needle = re.compile(re.escape(card_id))
    result: list[tuple[Path, int, str]] = []
    for path, lines in file_lines.items():
        for number, line in enumerate(lines, 1):
            if needle.search(line):
                result.append((path, number, line.strip()))
    return result


def virtual_sites(paths: set[Path]) -> list[tuple[Path, int, str]]:
    result: list[tuple[Path, int, str]] = []
    for path in sorted(paths):
        lines = file_lines[path]
        for number, line in enumerate(lines, 1):
            if 'virtual' in line or 'effectOnlyReplay' in line:
                result.append((path, number, line.strip()))
    return result

cards = []
for card in content['cards']:
    text = battle_text(card)
    if not text:
        continue
    card_id = card['id']
    hits = occurrences(card_id)
    paths = {path for path, _, _ in hits}
    cards.append({
        'id': card_id,
        'name': card['name'],
        'allegiance': card['allegiance'],
        'text': text,
        'tags': timing_tags(text),
        'hits': hits,
        'virtual': virtual_sites(paths),
    })

lines: list[str] = [
    '# Arcane Knowledge Replay Capability Audit',
    '',
    '**Generated from:** v0.6.0 canonical card data and current TypeScript sources on this branch.',
    '',
    'This report inventories every printed Battle effect, where its card ID appears in the engine, and whether those implementation files contain virtual-card filtering. It is evidence for replacing Arcane Knowledge’s incomplete hard-coded replay allowlist; it does not itself declare an effect replay-safe.',
    '',
    f'Battle effects inventoried: **{len(cards)}**',
    '',
    '## Summary by timing tag',
    '',
]

summary: dict[str, int] = {}
for card in cards:
    for tag in card['tags']:
        summary[tag] = summary.get(tag, 0) + 1
for tag, count in sorted(summary.items()):
    lines.append(f'- **{tag}:** {count}')

lines.extend(['', '## Card matrix', ''])
for card in cards:
    lines.extend([
        f"### {card['name']} (`{card['id']}`)",
        '',
        f"- **Allegiance:** {card['allegiance']}",
        f"- **Timing tags:** {', '.join(card['tags'])}",
        f"- **Printed Battle text:** {card['text']}",
        f"- **TypeScript files containing the ID:** {len(set(path for path, _, _ in card['hits']))}",
    ])
    if card['hits']:
        for path, number, snippet in card['hits']:
            lines.append(f"  - `{path.as_posix()}:{number}` — `{snippet}`")
    else:
        lines.append('  - No TypeScript occurrence found.')
    lines.append(f"- **Virtual/effect-only sites in those files:** {len(card['virtual'])}")
    if card['virtual']:
        for path, number, snippet in card['virtual']:
            lines.append(f"  - `{path.as_posix()}:{number}` — `{snippet}`")
    else:
        lines.append('  - None found.')
    lines.append('')

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text('\n'.join(lines) + '\n')
print(f'Wrote {OUTPUT} with {len(cards)} cards and {len(lines)} lines.')
