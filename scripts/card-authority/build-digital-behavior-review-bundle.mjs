import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AUDIT_PATH = path.join(
  ROOT,
  'artifacts/card-authority/digital-behavior-audit.json',
);
const OUTPUT_PATH = path.join(
  ROOT,
  'artifacts/card-authority/digital-behavior-review-bundle.json',
);

function normalize(value) {
  return String(value || '').toLowerCase();
}

function contexts(text, needles, radius = 900, limit = 8) {
  const lower = text.toLowerCase();
  const ranges = [];
  for (const needle of needles.map(normalize).filter(Boolean)) {
    let from = 0;
    while (from < lower.length && ranges.length < limit * 3) {
      const index = lower.indexOf(needle, from);
      if (index < 0) break;
      ranges.push([
        Math.max(0, index - radius),
        Math.min(text.length, index + needle.length + radius),
      ]);
      from = index + needle.length;
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range[0] <= previous[1] + 100) {
      previous[1] = Math.max(previous[1], range[1]);
    } else {
      merged.push([...range]);
    }
  }
  return merged.slice(0, limit).map(([start, end]) => ({
    start,
    end,
    text: text.slice(start, end),
  }));
}

function candidateSourceFiles(cardId, cardName) {
  const root = path.join(ROOT, 'src/v070');
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(?:ts|tsx)$/.test(entry.name)
      || /\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name)) continue;
    const file = path.join(root, entry.name);
    const text = fs.readFileSync(file, 'utf8');
    const lower = text.toLowerCase();
    if (lower.includes(cardId.toLowerCase())
      || lower.includes(cardName.toLowerCase())) {
      result.push(`src/v070/${entry.name}`);
    }
  }
  return result.sort();
}

if (!fs.existsSync(AUDIT_PATH)) {
  throw new Error('Run validate-digital-behavior.mjs before building its review bundle.');
}

const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
const surfaces = [];
for (const card of audit.cards) {
  for (const effect of card.effects) {
    if (effect.status === 'literal_authority_locked'
      || effect.status === 'generic_authority_locked') continue;

    const candidates = new Set([
      ...effect.sourceFiles,
      ...candidateSourceFiles(card.id, card.name),
    ]);
    const sourceEvidence = [...candidates]
      .filter(file => fs.existsSync(path.join(ROOT, file)))
      .map(file => {
        const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
        return {
          file,
          contexts: contexts(
            text,
            [card.id, card.name, effect.label],
            1000,
            10,
          ),
        };
      })
      .filter(item => item.contexts.length > 0);

    const testEvidence = effect.testFiles
      .filter(file => fs.existsSync(path.join(ROOT, file)))
      .slice(0, 12)
      .map(file => {
        const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
        return {
          file,
          contexts: contexts(text, [card.id, card.name], 650, 6),
        };
      })
      .filter(item => item.contexts.length > 0);

    surfaces.push({
      key: effect.key,
      cardId: card.id,
      cardName: card.name,
      allegiance: card.allegiance,
      index: effect.index,
      label: effect.label,
      text: effect.text,
      textSha256: effect.textSha256,
      status: effect.status,
      sourceEvidence,
      testEvidence,
    });
  }
}

fs.writeFileSync(
  OUTPUT_PATH,
  `${JSON.stringify({
    schemaVersion: 1,
    releaseVersion: audit.releaseVersion,
    authorityDigest: audit.authorityDigest,
    classificationDigest: audit.classificationDigest,
    surfaceCount: surfaces.length,
    surfaces,
  }, null, 2)}\n`,
);
console.log(`Digital behavior review bundle: ${surfaces.length} non-locked effect surfaces -> ${path.relative(ROOT, OUTPUT_PATH)}`);
