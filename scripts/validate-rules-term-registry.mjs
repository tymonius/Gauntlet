import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT } from './current-game-authority.mjs';

const contract = JSON.parse(await readFile(resolve(ROOT, 'config/rules-surface-contract.json'), 'utf8'));
const authority = JSON.parse(await readFile(resolve(ROOT, 'game-data/current-game.json'), 'utf8'));
const registry = contract?.publicationArchitecture?.comprehensiveRules?.termRegistry;

if (!Array.isArray(registry) || registry.length === 0) {
  throw new Error('Comprehensive Rules termRegistry must be a non-empty array.');
}

if (authority.glossary || authority.gameplay?.glossary) {
  throw new Error('Do not create a parallel gameplay glossary; definitions must remain at their natural canonical authority paths.');
}

const allowedKeys = new Set(['id', 'term', 'definitionSource', 'sections', 'aliases', 'seeAlso']);
const forbiddenMechanicalKeys = new Set(['definition', 'text', 'description', 'rule', 'rules', 'body', 'copy']);
const allowedDefinitionRoots = new Set(['gameplay', 'factionFeatureTaxonomy', 'mystics', 'arcaneSymbol']);
const ids = new Map();
const names = new Map();

const normalize = value => value.trim().toLocaleLowerCase('en-US');
const assertUniqueName = (name, owner) => {
  const key = normalize(name);
  if (names.has(key)) throw new Error(`Duplicate or colliding Part XVI term/alias "${name}" in ${owner}; already owned by ${names.get(key)}.`);
  names.set(key, owner);
};

const resolvePath = path => {
  let value = authority;
  for (const segment of path) {
    if (value == null || !(segment in value)) throw new Error(`Term registry source does not resolve: ${path.join('.')}`);
    value = value[segment];
  }
  return value;
};

for (const entry of registry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Every termRegistry entry must be an object.');
  for (const key of Object.keys(entry)) {
    if (forbiddenMechanicalKeys.has(key)) throw new Error(`Term registry entry ${entry.id || '(unknown)'} contains forbidden mechanical prose field: ${key}`);
    if (!allowedKeys.has(key)) throw new Error(`Term registry entry ${entry.id || '(unknown)'} contains unsupported field: ${key}`);
  }

  if (typeof entry.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) throw new Error(`Invalid term registry id: ${entry.id}`);
  if (ids.has(entry.id)) throw new Error(`Duplicate term registry id: ${entry.id}`);
  ids.set(entry.id, entry);

  if (typeof entry.term !== 'string' || !entry.term.trim()) throw new Error(`Term registry entry ${entry.id} requires a non-empty term.`);
  assertUniqueName(entry.term, entry.id);

  if (!Array.isArray(entry.sections) || entry.sections.length === 0 || entry.sections.some(section => typeof section !== 'string' || !section.trim())) {
    throw new Error(`Term registry entry ${entry.id} requires one or more publication section references.`);
  }
  if (new Set(entry.sections).size !== entry.sections.length) throw new Error(`Term registry entry ${entry.id} repeats a section reference.`);
  for (const section of entry.sections) {
    if (!/^(?:[IVXLCDM]+\.\d+ .+|Part [IVXLCDM]+ — .+)$/.test(section)) {
      throw new Error(`Term registry entry ${entry.id} has malformed section reference: ${section}`);
    }
  }

  if (entry.definitionSource) {
    if (typeof entry.definitionSource !== 'object' || Array.isArray(entry.definitionSource)) throw new Error(`definitionSource for ${entry.id} must be an object.`);
    if (Object.keys(entry.definitionSource).some(key => key !== 'path')) throw new Error(`definitionSource for ${entry.id} may contain only path.`);
    const path = entry.definitionSource.path;
    if (!Array.isArray(path) || path.length === 0 || path.some(segment => typeof segment !== 'string' || !segment)) {
      throw new Error(`definitionSource.path for ${entry.id} must be a non-empty string array.`);
    }
    if (!allowedDefinitionRoots.has(path[0])) throw new Error(`definitionSource for ${entry.id} uses non-canonical root ${path[0]}.`);
    const value = resolvePath(path);
    if (typeof value !== 'string' || !value.trim()) throw new Error(`definitionSource for ${entry.id} must resolve to a non-empty canonical string.`);
  }

  for (const alias of entry.aliases || []) {
    if (typeof alias !== 'string' || !alias.trim()) throw new Error(`Alias for ${entry.id} must be a non-empty string.`);
    assertUniqueName(alias, `${entry.id} alias`);
  }
  if (entry.aliases && new Set(entry.aliases.map(normalize)).size !== entry.aliases.length) throw new Error(`Duplicate alias within ${entry.id}.`);

  if (entry.seeAlso && (!Array.isArray(entry.seeAlso) || entry.seeAlso.some(id => typeof id !== 'string' || !id))) {
    throw new Error(`seeAlso for ${entry.id} must be an array of term registry ids.`);
  }
  if (entry.seeAlso && new Set(entry.seeAlso).size !== entry.seeAlso.length) throw new Error(`Duplicate seeAlso reference within ${entry.id}.`);
  if (entry.seeAlso?.includes(entry.id)) throw new Error(`Term registry entry ${entry.id} cannot reference itself in seeAlso.`);
}

for (const entry of registry) {
  for (const relatedId of entry.seeAlso || []) {
    if (!ids.has(relatedId)) throw new Error(`Term registry entry ${entry.id} references unknown seeAlso id ${relatedId}.`);
  }
}

const sortedTerms = registry.map(entry => entry.term).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
const actualTerms = registry.map(entry => entry.term);
if (JSON.stringify(sortedTerms) !== JSON.stringify(actualTerms)) throw new Error('termRegistry primary terms must remain alphabetically sorted.');

console.log(`Validated ${registry.length} primary Comprehensive Rules terms and ${[...names.keys()].length - registry.length} aliases; all definition sources resolve directly to canonical authority.`);
