from pathlib import Path
import re

for name in [
    'scripts/build-clean-v063-complete-authority.mjs',
    'scripts/validate-clean-v063-complete-authority.mjs',
]:
    path = Path(name)
    text = path.read_text()
    old = "  'authority', 'structural_baseline', 'evidence_payload', 'governing_sources',\n"
    new = "  'authority', 'structural_baseline', 'evidence_payload', 'structured_authority', 'governing_sources',\n"
    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        raise SystemExit(f'Missing top-level provenance key list in {name}')
    path.write_text(text)

path = Path('scripts/build-clean-v063-complete-authority.mjs')
text = path.read_text()
pattern = re.compile(
    r"  let expectedTerritories = structuredClone\(v062\.territories\);\n"
    r"expectedTerritories = replaceStrings\(expectedTerritories, 'only one banked Asset they control can be active', 'only 1 of their Assets can be active'\);\n"
    r"expectedTerritories = replaceStrings\(expectedTerritories, 'all their other banked Assets are inactive', 'their other Assets are inactive'\);\n"
    r"expectedTerritories = replaceStrings\(expectedTerritories, \"Smuggler's Pass\", \"Smuggler's Run\"\);\n"
    r"expectedTerritories = stripProvenance\(expectedTerritories\);\n"
    r"assert\.deepEqual\(\n"
    r"  generatedGameplay\.territories,\n"
    r"  expectedTerritories,\n"
    r"  'Territory authority contains a v0\.6\.3 mutation outside the approved Asset-language normalization or Smuggler title migration\.',\n"
    r"\);"
)
replacement = '''  let expectedTerritories = structuredClone(v062.territories);
  expectedTerritories = replaceStrings(expectedTerritories, 'only one banked Asset they control can be active', 'only 1 of their Assets can be active');
  expectedTerritories = replaceStrings(expectedTerritories, 'all their other banked Assets are inactive', 'their other Assets are inactive');
  expectedTerritories = replaceStrings(expectedTerritories, "Smuggler's Pass", "Smuggler's Run");
  expectedTerritories = stripProvenance(expectedTerritories);
  assert.deepEqual(
    generatedGameplay.territories,
    expectedTerritories,
    'Territory authority contains a v0.6.3 mutation outside the approved Asset-language normalization or Smuggler title migration.',
  );'''
text, count = pattern.subn(replacement, text, count=1)
if count == 0 and replacement not in text:
    raise SystemExit('Missing complete-authority Territory proof block')
path.write_text(text)

print('Prepared final complete-authority provenance normalization.')
