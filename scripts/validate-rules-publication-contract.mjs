import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  CURRENT_GAME_AUTHORITY_SOURCE,
  ROOT,
  loadCurrentGameAuthority,
} from './current-game-authority.mjs';
import {
  fingerprintRuleDependencies,
  resolveRegisteredRule,
} from '../rulebook/publication/rule-dependencies.mjs';

const CONTRACT_PATH = 'config/rules-surface-contract.json';
const CURRENT_GAME_PUBLIC_SOURCE = 'game-data/current-game.json';
const RULE_ID = /^(?:core|faction\.[a-z0-9-]+)(?:\.[a-z0-9-]+)+$/;

function fail(errors, message) {
  errors.push(message);
}

function exactSet(values) {
  return [...new Set(values || [])].sort((a, b) => a.localeCompare(b));
}

function coveredBy(ruleId, coverId) {
  return ruleId === coverId || ruleId.startsWith(`${coverId}.`);
}

function validateDependencies(errors, registryById, dependencies, context) {
  for (const id of dependencies || []) {
    if (!registryById.has(id)) fail(errors, `${context} references unknown rule dependency ${id}.`);
  }
}

function validateReviewedSection(errors, authority, registryById, section, context, active) {
  const dependencies = section.dependsOn || [];
  validateDependencies(errors, registryById, dependencies, context);
  if (!active) return;

  if (!dependencies.length) {
    fail(errors, `${context} is active teaching copy but declares no rule dependencies.`);
    return;
  }
  if (!/^[0-9a-f]{64}$/.test(section.reviewFingerprint || '')) {
    fail(errors, `${context} is active teaching copy but has no valid reviewFingerprint.`);
    return;
  }
  const expected = fingerprintRuleDependencies(authority, registryById, dependencies);
  if (section.reviewFingerprint !== expected) {
    fail(
      errors,
      `${context} is stale against its authority dependencies. Review the teaching copy and refresh its reviewFingerprint.`,
    );
  }
}

const contract = JSON.parse(await readFile(resolve(ROOT, CONTRACT_PATH), 'utf8'));
const authority = await loadCurrentGameAuthority();
const errors = [];

if (contract.schemaVersion !== 1) fail(errors, 'Rules surface contract must use schemaVersion 1.');
if (![CURRENT_GAME_AUTHORITY_SOURCE, CURRENT_GAME_PUBLIC_SOURCE].includes(contract.authoritySource)) {
  fail(
    errors,
    `Rules surface contract points to ${contract.authoritySource}; expected repository source ${CURRENT_GAME_AUTHORITY_SOURCE} or stable publication identity ${CURRENT_GAME_PUBLIC_SOURCE}.`,
  );
}

const registry = contract.ruleRegistry || [];
const registryById = new Map();
for (const rule of registry) {
  if (!RULE_ID.test(rule.id || '')) {
    fail(errors, `Invalid semantic rule id: ${JSON.stringify(rule.id)}.`);
    continue;
  }
  if (registryById.has(rule.id)) {
    fail(errors, `Duplicate semantic rule id: ${rule.id}.`);
    continue;
  }
  registryById.set(rule.id, rule);
  if (!Array.isArray(rule.sources) || !rule.sources.length) {
    fail(errors, `Registered rule ${rule.id} has no authority sources.`);
    continue;
  }
  try {
    resolveRegisteredRule(authority, rule);
  } catch (error) {
    fail(errors, error.message);
  }
}

const authorityFactionIds = exactSet((authority?.gameplay?.factions || []).map(faction => faction.id));
const contractFactionIds = exactSet((contract.factions || []).map(faction => faction.id));
if (JSON.stringify(authorityFactionIds) !== JSON.stringify(contractFactionIds)) {
  fail(
    errors,
    `Faction-guide contract does not match authority factions. Authority=${authorityFactionIds.join(', ')}; contract=${contractFactionIds.join(', ')}.`,
  );
}

const playerGuide = contract?.publicationArchitecture?.playerGuide;
if (!playerGuide || playerGuide.kind !== 'teaching' || playerGuide.dependencyMode !== 'reviewedTeaching') {
  fail(errors, 'Player Guide must be a reviewedTeaching teaching surface.');
} else {
  const active = playerGuide.status === 'active';
  for (const chapter of playerGuide.chapters || []) {
    validateReviewedSection(errors, authority, registryById, chapter, `Player Guide / ${chapter.id}`, active);
    for (const dependency of chapter.dependsOn || []) {
      if (dependency.startsWith('faction.') && !dependency.endsWith('.definition')) {
        fail(
          errors,
          `Player Guide / ${chapter.id} depends on faction operating rule ${dependency}; base faction coverage must remain opponent-literacy only.`,
        );
      }
    }
  }
}

const factionTemplate = contract?.publicationArchitecture?.factionGuideTemplate;
if (!factionTemplate || factionTemplate.kind !== 'teaching' || factionTemplate.dependencyMode !== 'reviewedTeaching') {
  fail(errors, 'Faction Guide template must be a reviewedTeaching teaching surface.');
}

for (const faction of contract.factions || []) {
  validateDependencies(errors, registryById, faction.dependsOn, `Faction Guide ${faction.id}`);
  for (const dependency of faction.dependsOn || []) {
    if (dependency.startsWith('faction.') && !dependency.startsWith(`faction.${faction.id}.`)) {
      fail(
        errors,
        `Faction Guide ${faction.id} may not depend on another faction's operating rules (${dependency}).`,
      );
    }
  }
  if (faction.status === 'active' && !Array.isArray(faction.sections)) {
    fail(errors, `Active Faction Guide ${faction.id} must declare its authored sections and review fingerprints.`);
  }
  for (const section of faction.sections || []) {
    validateReviewedSection(
      errors,
      authority,
      registryById,
      section,
      `Faction Guide ${faction.id} / ${section.id}`,
      faction.status === 'active',
    );
  }
}

const comprehensive = contract?.publicationArchitecture?.comprehensiveRules;
if (!comprehensive || comprehensive.kind !== 'technical' || comprehensive.dependencyMode !== 'direct') {
  fail(errors, 'Comprehensive Rules must be the direct technical surface.');
} else {
  const coverIds = [];
  const partIds = new Set();
  for (const part of comprehensive.parts || []) {
    if (partIds.has(part.id)) fail(errors, `Duplicate Comprehensive Rules part id: ${part.id}.`);
    partIds.add(part.id);
    validateDependencies(errors, registryById, part.covers, `Comprehensive Rules / ${part.id}`);
    coverIds.push(...(part.covers || []));
  }
  for (const ruleId of registryById.keys()) {
    if (!coverIds.some(coverId => coveredBy(ruleId, coverId))) {
      fail(errors, `Registered rule ${ruleId} is not assigned to the Comprehensive Rules.`);
    }
  }
  for (const factionId of authorityFactionIds) {
    if (!partIds.has(factionId)) {
      fail(errors, `Comprehensive Rules are missing a dedicated ${factionId} faction part.`);
    }
  }
}

const referenceCards = contract?.otherSurfaces?.referenceCards;
if (
  !referenceCards
  || referenceCards.authorityRole !== 'consumer'
  || referenceCards.dependencyMode !== 'procedural'
) {
  fail(errors, 'Reference cards must remain procedural consumers of authority.');
}

const arbiter = contract?.otherSurfaces?.rulesArbiter;
if (
  !arbiter
  || !arbiter.retrievalAuthority?.includes('comprehensive-rules')
  || !arbiter.retrievalAuthority?.includes('canonical-game-objects')
  || arbiter.teachingSourcesMayResolveConflicts !== false
  || arbiter.teachingSourcesMayInfluencePresentation !== true
) {
  fail(
    errors,
    'Rules Arbiter contract must resolve from Comprehensive Rules + canonical game objects, while using teaching material only for presentation.',
  );
}

if (errors.length) {
  throw new Error(`Rules publication contract failed:\n- ${errors.join('\n- ')}`);
}

console.log(
  `Rules publication contract passed: ${registry.length} semantic rule registrations, `
  + `${authorityFactionIds.length} faction guides, one complete technical corpus, and player-friendly Arbiter presentation are structurally enforced.`,
);
