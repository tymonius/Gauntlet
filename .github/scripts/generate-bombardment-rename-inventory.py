from __future__ import annotations

from pathlib import Path

ROOT = Path('.')
OUTPUT = ROOT / 'docs/internal/Bombardment_Rename_Inventory.md'
NEEDLES = ('Siege Weaponry', 'neutral-siege-weaponry')
SKIP_PARTS = {'.git', 'node_modules'}
TEXT_SUFFIXES = {
    '.md', '.json', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.html', '.css', '.csv', '.txt', '.yml', '.yaml', '.py', '.toml', '.xml', '.svg'
}

matches: list[tuple[str, int, str]] = []
for path in sorted(ROOT.rglob('*')):
    if not path.is_file() or any(part in SKIP_PARTS for part in path.parts):
        continue
    if path.suffix.lower() not in TEXT_SUFFIXES:
        continue
    try:
        lines = path.read_text(errors='strict').splitlines()
    except (UnicodeDecodeError, OSError):
        continue
    for number, line in enumerate(lines, 1):
        if any(needle in line for needle in NEEDLES):
            matches.append((path.as_posix(), number, line.strip()))

active = []
archived = []
for match in matches:
    path = match[0].lower()
    if path.startswith('archive/') or '/archive/' in path or path.startswith('releases/v0.5'):
        archived.append(match)
    else:
        active.append(match)

lines = [
    '# Bombardment Rename Inventory',
    '',
    'Approved current identity: **Bombardment**, cost 4. `Siege Weaponry` is obsolete for the current card and reserved for a possible future Engineer card.',
    '',
    f'- Active/current-source matches: **{len(active)}**',
    f'- Historical/archive matches: **{len(archived)}**',
    '',
    '## Active/current-source matches',
    '',
]
for path, number, line in active:
    lines.append(f'- `{path}:{number}` — `{line}`')
if not active:
    lines.append('- None.')
lines.extend(['', '## Historical/archive matches (do not rewrite)', ''])
for path, number, line in archived:
    lines.append(f'- `{path}:{number}` — `{line}`')
if not archived:
    lines.append('- None.')

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text('\n'.join(lines) + '\n')
print(f'Wrote {OUTPUT}: {len(active)} active and {len(archived)} historical matches.')
