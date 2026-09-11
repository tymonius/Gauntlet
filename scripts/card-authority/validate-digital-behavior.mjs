import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { V070_GENERIC_DIGITAL_BEHAVIOR_PROOFS } from './digital-behavior-proofs.mjs';

const ROOT = process.cwd();
const RELEASE = 'v0.7.0';
const CANONICAL_PATH = path.join(
  ROOT,
  'releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json',
);
const OUTPUT_PATH = path.join(
  ROOT,
  'artifacts/card-authority/digital-behavior-audit.json',
);
const BASELINE_PATH = path.join(
  ROOT,
  'config/v070-digital-behavior-authority.json',
);
const RUNTIME_ROOT = path.join(ROOT, 'src/v070');
const RUNTIME_ENTRYPOINTS = [
  'src/v070/engine.ts',
  'src/v070/turn-engine.ts',
  'src/v070/battle-engine.ts',
  'src/v070/views.ts',
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeRepoPath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function walkFiles(root, predicate) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && predicate(full)) result.push(full);
    }
  }
  return result.sort((a, b) => a.localeCompare(b));
}

function parseTypeScript(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  return { text, sourceFile };
}

function staticString(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)
    || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) {
    return staticString(node.expression);
  }
  if (ts.isBinaryExpression(node)
    && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticString(node.left);
    const right = staticString(node.right);
    return left === null || right === null ? null : `${left}${right}`;
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const expression = staticString(span.expression);
      if (expression === null) return null;
      value += expression + span.literal.text;
    }
    return value;
  }
  return null;
}

function collectStaticStrings(sourceFile) {
  const strings = new Set();
  function visit(node) {
    const value = staticString(node);
    if (value !== null) strings.add(value);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return strings;
}

function relativeModuleSpecifiers(sourceFile) {
  const specs = [];
  for (const statement of sourceFile.statements) {
    if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))
      && statement.moduleSpecifier
      && ts.isStringLiteral(statement.moduleSpecifier)
      && statement.moduleSpecifier.text.startsWith('.')) {
      specs.push(statement.moduleSpecifier.text);
    }
  }
  return specs;
}

function resolveRelativeModule(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  return candidates.find(candidate => fs.existsSync(candidate)
    && fs.statSync(candidate).isFile()) ?? null;
}

function collectReachableRuntimeSources() {
  const pending = RUNTIME_ENTRYPOINTS.map(entry => path.join(ROOT, entry));
  for (const entry of pending) invariant(fs.existsSync(entry), `Missing v0.7.0 runtime entrypoint ${normalizeRepoPath(entry)}.`);

  const visited = new Map();
  while (pending.length > 0) {
    const filePath = pending.pop();
    if (visited.has(filePath)) continue;
    if (!filePath.startsWith(RUNTIME_ROOT + path.sep) && filePath !== RUNTIME_ROOT) continue;
    if (/\.(?:test|spec)\.(?:ts|tsx)$/.test(filePath)) continue;

    const parsed = parseTypeScript(filePath);
    visited.set(filePath, {
      ...parsed,
      strings: collectStaticStrings(parsed.sourceFile),
    });
    for (const specifier of relativeModuleSpecifiers(parsed.sourceFile)) {
      const resolved = resolveRelativeModule(filePath, specifier);
      if (resolved && resolved.startsWith(RUNTIME_ROOT + path.sep)) pending.push(resolved);
    }
  }

  return new Map(
    [...visited.entries()]
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function collectTests() {
  const files = [
    ...walkFiles(path.join(ROOT, 'src/v070'), file => /\.(?:test|spec)\.(?:ts|tsx)$/.test(file)),
    ...walkFiles(path.join(ROOT, 'tests'), file => /\.(?:test|spec)\.(?:ts|tsx|js|mjs)$/.test(file)),
  ];
  return new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
}

function surfaceKey(card, effect, index) {
  return `${card.id}::${index}::${effect.label}`;
}

function validateGenericProofs(surfaceKeys, runtimeSources, tests) {
  const byKey = new Map();
  for (const proof of V070_GENERIC_DIGITAL_BEHAVIOR_PROOFS) {
    invariant(proof && typeof proof === 'object', 'Every generic digital-behavior proof must be an object.');
    invariant(typeof proof.key === 'string' && surfaceKeys.has(proof.key), `Generic proof references unknown effect surface ${proof.key ?? '(missing key)'}.`);
    invariant(!byKey.has(proof.key), `Duplicate generic digital-behavior proof for ${proof.key}.`);
    invariant(typeof proof.rationale === 'string' && proof.rationale.trim().length >= 20, `Generic proof ${proof.key} needs a substantive rationale.`);
    invariant(Array.isArray(proof.sourceFiles) && proof.sourceFiles.length > 0, `Generic proof ${proof.key} needs at least one runtime source file.`);
    invariant(Array.isArray(proof.testFiles) && proof.testFiles.length > 0, `Generic proof ${proof.key} needs at least one regression test file.`);
    invariant(Array.isArray(proof.anchors) && proof.anchors.length > 0, `Generic proof ${proof.key} needs stable implementation anchors.`);

    for (const source of proof.sourceFiles) {
      const absolute = path.join(ROOT, source);
      invariant(runtimeSources.has(absolute), `Generic proof ${proof.key} source ${source} is not reachable from the maintained v0.7.0 engine.`);
    }
    for (const testFile of proof.testFiles) {
      const absolute = path.join(ROOT, testFile);
      invariant(tests.has(absolute), `Generic proof ${proof.key} test ${testFile} does not exist in maintained regression coverage.`);
    }
    const combinedSource = proof.sourceFiles
      .map(source => runtimeSources.get(path.join(ROOT, source)).text)
      .join('\n');
    for (const anchor of proof.anchors) {
      invariant(typeof anchor === 'string' && anchor.length >= 4, `Generic proof ${proof.key} has an invalid anchor.`);
      invariant(combinedSource.includes(anchor), `Generic proof ${proof.key} implementation anchor is missing: ${anchor}`);
    }
    byKey.set(proof.key, proof);
  }
  return byKey;
}

function relatedTests(card, effect, testFiles) {
  const id = card.id.toLowerCase();
  const name = card.name.toLowerCase();
  const label = effect.label.toLowerCase();
  return [...testFiles.entries()]
    .filter(([, text]) => {
      const lower = text.toLowerCase();
      if (!(lower.includes(id) || lower.includes(name))) return false;
      return lower.includes(label)
        || lower.includes('authority')
        || lower.includes('released')
        || lower.includes('canonical')
        || effect.label === 'Action';
    })
    .map(([file]) => normalizeRepoPath(file))
    .sort();
}

function dynamicCanonicalSources(card, effect, runtimeSources) {
  const id = card.id.toLowerCase();
  const labelQuoted = [
    `'${effect.label}'`,
    `"${effect.label}"`,
    `\`${effect.label}\``,
  ];
  return [...runtimeSources.entries()]
    .filter(([, info]) => {
      const lower = info.text.toLowerCase();
      if (!lower.includes(id)) return false;
      const readsCanonical = lower.includes('v070canonicalcontent')
        || lower.includes('cardsbyid')
        || lower.includes('../content/v070')
        || lower.includes("./content/v070");
      if (!readsCanonical) return false;
      return labelQuoted.some(quoted => info.text.includes(quoted))
        || info.text.includes('.effects.find')
        || info.text.includes('.effects.filter');
    })
    .map(([file]) => normalizeRepoPath(file))
    .sort();
}

function classifySurface(card, effect, index, runtimeSources, tests, genericProofs) {
  const key = surfaceKey(card, effect, index);
  const generic = genericProofs.get(key);
  if (generic) {
    return {
      key,
      status: 'generic_authority_locked',
      sourceFiles: [...generic.sourceFiles].sort(),
      testFiles: [...generic.testFiles].sort(),
      rationale: generic.rationale,
    };
  }

  const literalSourceFiles = [...runtimeSources.entries()]
    .filter(([, info]) => info.strings.has(effect.text))
    .map(([file]) => normalizeRepoPath(file))
    .sort();
  const testFiles = relatedTests(card, effect, tests);
  if (literalSourceFiles.length > 0 && testFiles.length > 0) {
    return {
      key,
      status: 'literal_authority_locked',
      sourceFiles: literalSourceFiles,
      testFiles,
    };
  }
  if (literalSourceFiles.length > 0) {
    return {
      key,
      status: 'literal_without_regression',
      sourceFiles: literalSourceFiles,
      testFiles: [],
    };
  }

  const dynamicSources = dynamicCanonicalSources(card, effect, runtimeSources);
  if (dynamicSources.length > 0) {
    return {
      key,
      status: 'dynamic_canonical_text_only',
      sourceFiles: dynamicSources,
      testFiles,
    };
  }

  return {
    key,
    status: 'unverified',
    sourceFiles: [],
    testFiles,
  };
}

function loadCanonical() {
  const canonical = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));
  invariant(canonical.release_version === RELEASE, `Digital behavior audit expected ${RELEASE} authority.`);
  invariant(canonical.status === 'published', 'Digital behavior audit must use the frozen published authority.');
  invariant(Array.isArray(canonical.gameplay?.cards), 'Canonical v0.7.0 card list is missing.');
  return canonical;
}

function buildAudit() {
  const canonical = loadCanonical();
  const runtimeSources = collectReachableRuntimeSources();
  const tests = collectTests();
  const keys = new Set();
  for (const card of canonical.gameplay.cards) {
    invariant(Array.isArray(card.effects), `Canonical card ${card.id} is missing effects.`);
    card.effects.forEach((effect, index) => keys.add(surfaceKey(card, effect, index)));
  }
  const genericProofs = validateGenericProofs(keys, runtimeSources, tests);

  const cards = canonical.gameplay.cards.map(card => ({
    id: card.id,
    name: card.name,
    allegiance: card.allegiance,
    effects: card.effects.map((effect, index) => ({
      index,
      label: effect.label,
      text: effect.text,
      textSha256: sha256(effect.text),
      ...classifySurface(card, effect, index, runtimeSources, tests, genericProofs),
    })),
  }));
  const surfaces = cards.flatMap(card => card.effects.map(effect => ({
    cardId: card.id,
    cardName: card.name,
    ...effect,
  })));
  const summary = {};
  for (const surface of surfaces) summary[surface.status] = (summary[surface.status] ?? 0) + 1;

  const authorityPayload = surfaces
    .map(surface => `${surface.key}\u0000${surface.textSha256}`)
    .sort()
    .join('\n');
  const classificationPayload = surfaces
    .map(surface => JSON.stringify({
      key: surface.key,
      status: surface.status,
      sourceFiles: surface.sourceFiles,
      testFiles: surface.testFiles,
      rationale: surface.rationale ?? null,
    }))
    .sort()
    .join('\n');

  return {
    schemaVersion: 1,
    releaseVersion: canonical.release_version,
    canonicalSource: normalizeRepoPath(CANONICAL_PATH),
    cardCount: cards.length,
    effectSurfaceCount: surfaces.length,
    runtimeSourceCount: runtimeSources.size,
    regressionTestCount: tests.size,
    authorityDigest: sha256(authorityPayload),
    classificationDigest: sha256(classificationPayload),
    summary,
    cards,
  };
}

function validateBaseline(audit) {
  if (!fs.existsSync(BASELINE_PATH)) return { present: false };
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  invariant(baseline.schemaVersion === 1, 'Unsupported digital behavior authority baseline schema.');
  invariant(baseline.releaseVersion === audit.releaseVersion, 'Digital behavior baseline release version drifted.');
  for (const field of ['cardCount', 'effectSurfaceCount', 'authorityDigest', 'classificationDigest']) {
    invariant(baseline[field] === audit[field], `Digital behavior authority baseline drifted at ${field}: expected ${baseline[field]}, received ${audit[field]}. Review every affected surface before updating the baseline.`);
  }
  invariant(JSON.stringify(baseline.summary) === JSON.stringify(audit.summary), 'Digital behavior authority status counts drifted. Review the affected effect surfaces before updating the baseline.');
  return { present: true, baseline };
}

function writeReport(audit) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
}

function printSummary(audit, baselineState) {
  console.log(`v0.7.0 digital behavior audit: ${audit.cardCount} cards, ${audit.effectSurfaceCount} printed effect surfaces, ${audit.runtimeSourceCount} reachable runtime source files, ${audit.regressionTestCount} regression test files.`);
  for (const [status, count] of Object.entries(audit.summary).sort()) {
    console.log(`  ${status}: ${count}`);
  }
  console.log(`  authority digest: ${audit.authorityDigest}`);
  console.log(`  classification digest: ${audit.classificationDigest}`);
  console.log(`  baseline: ${baselineState.present ? 'locked' : 'not yet locked'}`);

  const review = audit.cards.flatMap(card => card.effects
    .filter(effect => effect.status !== 'literal_authority_locked'
      && effect.status !== 'generic_authority_locked')
    .map(effect => `${card.id} [${effect.index}:${effect.label}] ${effect.status}`));
  if (review.length > 0) {
    console.log(`Surfaces requiring explicit behavior review (${review.length}):`);
    for (const line of review) console.log(`  - ${line}`);
  }
}

const audit = buildAudit();
writeReport(audit);
const baselineState = validateBaseline(audit);
printSummary(audit, baselineState);

if (!baselineState.present) {
  console.log(`Initial audit report written to ${normalizeRepoPath(OUTPUT_PATH)}. Lock its reviewed digests in ${normalizeRepoPath(BASELINE_PATH)} after inspecting the full inventory.`);
}
