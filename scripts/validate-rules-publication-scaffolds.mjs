import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT } from './current-game-authority.mjs';

const CONTRACT_PATH = 'config/rules-surface-contract.json';
const SOURCES_PATH = 'config/rules-publication-sources.json';

async function readText(path) {
  return readFile(resolve(ROOT, path), 'utf8');
}

async function readJson(path) {
  return JSON.parse(await readText(path));
}

function exactList(values) {
  return [...values];
}

function sameList(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function markerValues(markdown, marker) {
  const pattern = new RegExp(`<!--\\s*${marker}:([a-z0-9.-]+)\\s*-->`, 'g');
  return [...String(markdown).matchAll(pattern)].map(match => match[1]);
}

function requireLiteral(errors, markdown, literal, context) {
  if (!markdown.includes(`<!-- ${literal} -->`)) {
    errors.push(`${context} is missing <!-- ${literal} -->.`);
  }
}

async function requireSource(errors, path, context) {
  try {
    return await readText(path);
  } catch (error) {
    errors.push(`${context} source ${path} cannot be read: ${error.message}`);
    return '';
  }
}

const contract = await readJson(CONTRACT_PATH);
const sources = await readJson(SOURCES_PATH);
const errors = [];

if (sources.schemaVersion !== 1) errors.push('Rules publication source manifest must use schemaVersion 1.');
if (sources.surfaceContract !== CONTRACT_PATH) {
  errors.push(`Rules publication source manifest must point to ${CONTRACT_PATH}.`);
}
if (sources.authoritySource !== contract.authoritySource) {
  errors.push(
    `Rules publication source manifest authority ${sources.authoritySource} does not match contract authority ${contract.authoritySource}.`,
  );
}

if (!sources.editorialPolicy) {
  errors.push('Rules publication source manifest must declare an editorialPolicy source.');
} else {
  const policy = await requireSource(errors, sources.editorialPolicy, 'Rules publication editorial policy');
  if (!policy.includes('## Defined terms must still read as normal English')) {
    errors.push('Rules publication editorial policy must define the natural-English rule for defined game terms.');
  }
  if (!policy.includes('## Prefer player actions over abstract noun phrases')) {
    errors.push('Rules publication editorial policy must preserve action-oriented player language.');
  }
  if (!policy.includes('## Prefer low cognitive density over low word count')) {
    errors.push('Rules publication editorial policy must optimize teaching material for cognitive load rather than word count.');
  }
  if (!policy.includes('## Use visuals to teach, not merely decorate')) {
    errors.push('Rules publication editorial policy must define the instructional-visual standard.');
  }
  if (!policy.includes('## Standard callout roles')) {
    errors.push('Rules publication editorial policy must define the standard callout vocabulary.');
  }
}

if (!sources.playerGuidePedagogy) {
  errors.push('Rules publication source manifest must declare a playerGuidePedagogy source.');
} else {
  const pedagogy = await requireSource(errors, sources.playerGuidePedagogy, "Player's Guide visual pedagogy map");
  for (const required of [
    '# Player\'s Guide Visual Pedagogy Map',
    '## Existing instructional asset inventory',
    '### Card anatomy renderer — REUSE',
    '### Arcane trait-mark example — REUSE',
    '## 6. Battles',
    '### Mandatory commitment-order treatment',
    'attacker first, defender second',
    '## 7. Taking and Holding Ground',
    '## 8. Running the Gauntlet',
    '## Publication review checklist',
  ]) {
    if (!pedagogy.includes(required)) {
      errors.push(`Player's Guide visual pedagogy map is missing required publication guidance: ${required}.`);
    }
  }
}

const authorityMarker = `AUTHORITY:${contract.authoritySource}`;

const player = sources.surfaces?.['player-guide'];
const playerContract = contract.publicationArchitecture?.playerGuide;
if (!player?.path || !playerContract) {
  errors.push('Player Guide source or contract is missing.');
} else {
  const markdown = await requireSource(errors, player.path, 'Player Guide');
  requireLiteral(errors, markdown, player.marker, 'Player Guide');
  requireLiteral(errors, markdown, authorityMarker, 'Player Guide');
  const actual = markerValues(markdown, player.sectionMarker);
  const expected = exactList((playerContract.chapters || []).map(chapter => chapter.id));
  if (!sameList(actual, expected)) {
    errors.push(`Player Guide section order does not match contract. Expected ${expected.join(', ')}; got ${actual.join(', ')}.`);
  }
}

const factionTemplate = sources.surfaces?.['faction-guide-template'];
const factionTemplateContract = contract.publicationArchitecture?.factionGuideTemplate;
if (!factionTemplate?.path || !factionTemplateContract) {
  errors.push('Faction Guide template source or contract is missing.');
} else {
  const markdown = await requireSource(errors, factionTemplate.path, 'Faction Guide template');
  requireLiteral(errors, markdown, factionTemplate.marker, 'Faction Guide template');
  requireLiteral(errors, markdown, authorityMarker, 'Faction Guide template');
  const actual = markerValues(markdown, factionTemplate.sectionMarker);
  const expected = exactList((factionTemplateContract.sections || []).map(section => section.id));
  if (!sameList(actual, expected)) {
    errors.push(`Faction Guide template section order does not match contract. Expected ${expected.join(', ')}; got ${actual.join(', ')}.`);
  }
}

const factionContracts = contract.factions || [];
const expectedFactionIds = factionContracts.map(faction => faction.id);
const manifestFactionIds = Object.keys(sources.factionGuides || {});
if (!sameList([...manifestFactionIds].sort(), [...expectedFactionIds].sort())) {
  errors.push(
    `Faction Guide source manifest does not match contract factions. Expected ${expectedFactionIds.join(', ')}; got ${manifestFactionIds.join(', ')}.`,
  );
}

const expectedFactionSections = (factionTemplateContract?.sections || []).map(section => section.id);
for (const faction of factionContracts) {
  const path = sources.factionGuides?.[faction.id];
  if (!path) continue;
  const markdown = await requireSource(errors, path, `Faction Guide ${faction.id}`);
  requireLiteral(errors, markdown, 'RULES-SURFACE:faction-guide', `Faction Guide ${faction.id}`);
  requireLiteral(errors, markdown, `RULES-FACTION:${faction.id}`, `Faction Guide ${faction.id}`);
  requireLiteral(errors, markdown, authorityMarker, `Faction Guide ${faction.id}`);
  const actual = markerValues(markdown, factionTemplate.sectionMarker);
  if (!sameList(actual, expectedFactionSections)) {
    errors.push(
      `Faction Guide ${faction.id} section order does not match template. Expected ${expectedFactionSections.join(', ')}; got ${actual.join(', ')}.`,
    );
  }
}

const comprehensive = sources.surfaces?.['comprehensive-rules'];
const comprehensiveContract = contract.publicationArchitecture?.comprehensiveRules;
if (!comprehensive?.path || !comprehensiveContract) {
  errors.push('Comprehensive Rules source or contract is missing.');
} else {
  const markdown = await requireSource(errors, comprehensive.path, 'Comprehensive Rules');
  requireLiteral(errors, markdown, comprehensive.marker, 'Comprehensive Rules');
  requireLiteral(errors, markdown, authorityMarker, 'Comprehensive Rules');

  const actualParts = markerValues(markdown, comprehensive.sectionMarker);
  const expectedParts = (comprehensiveContract.parts || []).map(part => part.id);
  if (!sameList(actualParts, expectedParts)) {
    errors.push(
      `Comprehensive Rules part order does not match contract. Expected ${expectedParts.join(', ')}; got ${actualParts.join(', ')}.`,
    );
  }

  const coverageByPart = new Map(expectedParts.map(id => [id, []]));
  let currentPart = null;
  for (const line of markdown.split(/\r?\n/)) {
    const partMatch = line.match(new RegExp(`<!--\\s*${comprehensive.sectionMarker}:([a-z0-9.-]+)\\s*-->`));
    if (partMatch) {
      currentPart = partMatch[1];
      continue;
    }
    const coverMatch = line.match(new RegExp(`<!--\\s*${comprehensive.coverageMarker}:([a-z0-9.-]+)\\s*-->`));
    if (!coverMatch) continue;
    if (!currentPart || !coverageByPart.has(currentPart)) {
      errors.push(`Comprehensive Rules coverage ${coverMatch[1]} appears outside a known part.`);
      continue;
    }
    coverageByPart.get(currentPart).push(coverMatch[1]);
  }

  for (const part of comprehensiveContract.parts || []) {
    const actual = coverageByPart.get(part.id) || [];
    const expected = part.covers || [];
    if (!sameList(actual, expected)) {
      errors.push(
        `Comprehensive Rules / ${part.id} coverage does not match contract. Expected ${expected.join(', ') || '(none)'}; got ${actual.join(', ') || '(none)'}.`,
      );
    }
  }
}

if (errors.length) {
  throw new Error(`Rules publication scaffold validation failed:\n- ${errors.join('\n- ')}`);
}

console.log(
  `Rules publication scaffolds passed: editorial policy, Player's Guide pedagogy, Player Guide, Comprehensive Rules, faction template, and ${factionContracts.length} faction guides match the authority-derived publication contract.`,
);
