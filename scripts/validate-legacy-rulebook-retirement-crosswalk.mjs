import crypto from 'node:crypto';
import fs from 'node:fs';

const CROSSWALK_PATH = 'config/legacy-rulebook-retirement-crosswalk.json';
const SOURCE_FINGERPRINT_PATH = 'config/legacy-rulebook-retirement-crosswalk.sha256';
const CONTRACT_PATH = 'config/rules-surface-contract.json';

const crosswalk = JSON.parse(fs.readFileSync(CROSSWALK_PATH, 'utf8'));
const expectedLegacySourceFingerprint = fs.readFileSync(SOURCE_FINGERPRINT_PATH, 'utf8').trim();
const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
const legacySource = fs.readFileSync(crosswalk.legacySource, 'utf8');
const errors = [];

function fail(message) {
  errors.push(message);
}

function normalizeSection(raw) {
  return `${raw.replace(/\r\n/g, '\n').trimEnd()}\n`;
}

function fingerprint(raw) {
  return crypto.createHash('sha256').update(normalizeSection(raw), 'utf8').digest('hex');
}

function parseTopLevelSections(markdown) {
  const matches = [...markdown.matchAll(/^# (.+)$/gm)];
  return matches.map((match, index) => ({
    heading: match[1].trim(),
    raw: markdown.slice(match.index, matches[index + 1]?.index ?? markdown.length),
  }));
}

function coveredBy(ruleId, coverId) {
  return ruleId === coverId || ruleId.startsWith(`${coverId}.`);
}

if (crosswalk.schemaVersion !== 1) fail('Legacy Rulebook retirement crosswalk must use schemaVersion 1.');
if (crosswalk.technicalSuccessor !== 'comprehensive-rules') {
  fail('Legacy Rulebook retirement crosswalk must name comprehensive-rules as the technical successor.');
}
if (crosswalk.retirementReadiness !== 'coverage-proven') {
  fail('Legacy Rulebook retirement crosswalk must explicitly record retirementReadiness=coverage-proven.');
}
if (crosswalk.routeRetirementIncluded !== false) {
  fail('Coverage proof must not itself retire the legacy /rulebook/ route.');
}
const actualLegacySourceFingerprint = fingerprint(legacySource);
if (!/^[0-9a-f]{64}$/.test(expectedLegacySourceFingerprint)) {
  fail(`${SOURCE_FINGERPRINT_PATH} must contain one lowercase SHA-256 fingerprint.`);
} else if (expectedLegacySourceFingerprint !== actualLegacySourceFingerprint) {
  fail(`Legacy Rulebook source changed since retirement review. Re-review the full source before refreshing ${SOURCE_FINGERPRINT_PATH} to ${actualLegacySourceFingerprint}.`);
}

const actualSections = parseTopLevelSections(legacySource);
const expectedSections = crosswalk.sections || [];
const actualHeadings = actualSections.map(section => section.heading);
const expectedHeadings = expectedSections.map(section => section.heading);
if (JSON.stringify(actualHeadings) !== JSON.stringify(expectedHeadings)) {
  fail(`Legacy Rulebook top-level section inventory changed.\nExpected: ${expectedHeadings.join(' | ')}\nActual:   ${actualHeadings.join(' | ')}`);
}
if (new Set(expectedSections.map(section => section.id)).size !== expectedSections.length) {
  fail('Legacy Rulebook retirement crosswalk contains duplicate section ids.');
}

const registryById = new Map((contract.ruleRegistry || []).map(rule => [rule.id, rule]));
const comprehensive = contract?.publicationArchitecture?.comprehensiveRules;
if (!comprehensive || comprehensive.id !== 'comprehensive-rules' || comprehensive.status !== 'active' || comprehensive.dependencyMode !== 'direct') {
  fail('The Comprehensive Rules must remain the active direct technical successor before the legacy Rulebook can retire.');
}
const comprehensiveCoverIds = (comprehensive?.parts || []).flatMap(part => part.covers || []);
for (const ruleId of registryById.keys()) {
  if (!comprehensiveCoverIds.some(coverId => coveredBy(ruleId, coverId))) {
    fail(`Registered rule ${ruleId} is not covered by the active Comprehensive Rules.`);
  }
}

const playerGuide = contract?.publicationArchitecture?.playerGuide;
const playerGuideSections = new Set((playerGuide?.chapters || []).map(chapter => chapter.id));
const factionGuides = new Map((contract.factions || []).map(faction => [faction.id, faction]));
const comprehensivePartIds = new Set((comprehensive?.parts || []).map(part => part.id));
const allowedClassifications = new Set(['editorial', 'mechanical', 'procedural', 'reference']);
const actualByHeading = new Map(actualSections.map(section => [section.heading, section]));

for (const section of expectedSections) {
  const context = `Legacy Rulebook / ${section.heading}`;
  if (!allowedClassifications.has(section.classification)) {
    fail(`${context} has unknown classification ${JSON.stringify(section.classification)}.`);
    continue;
  }

  const dependencies = section.dependsOn || [];
  if (section.classification === 'editorial') {
    if (dependencies.length) fail(`${context} is editorial but declares gameplay dependencies.`);
    if (section.sourceFingerprint) fail(`${context} is editorial but declares a mechanical sourceFingerprint.`);
  } else {
    if (!/^[0-9a-f]{64}$/.test(section.sourceFingerprint || '')) {
      fail(`${context} must declare a valid sourceFingerprint.`);
    } else {
      const actual = actualByHeading.get(section.heading);
      if (actual && fingerprint(actual.raw) !== section.sourceFingerprint) {
        fail(`${context} changed since retirement coverage review; re-review the section before refreshing its sourceFingerprint.`);
      }
    }

    if (!dependencies.length && section.coverageMode !== 'termRegistry') {
      fail(`${context} is mechanically relevant but declares neither rule dependencies nor termRegistry coverage.`);
    }
    for (const ruleId of dependencies) {
      if (!registryById.has(ruleId)) {
        fail(`${context} references unknown rule dependency ${ruleId}.`);
      } else if (!comprehensiveCoverIds.some(coverId => coveredBy(ruleId, coverId))) {
        fail(`${context} dependency ${ruleId} is not covered by the active Comprehensive Rules.`);
      }
    }
  }

  if (section.coverageMode) {
    if (section.coverageMode !== 'termRegistry') {
      fail(`${context} uses unsupported coverageMode ${section.coverageMode}.`);
    } else {
      if (section.classification !== 'reference') fail(`${context} termRegistry coverage must be classified as reference.`);
      if (!(comprehensive.termRegistry || []).length) fail(`${context} requires the Comprehensive Rules term registry.`);
      if (!comprehensivePartIds.has('definitions-index')) fail(`${context} requires the Comprehensive Rules definitions-index part.`);
    }
  }

  for (const successor of section.teachingSuccessors || []) {
    if (successor.surface === 'player-guide') {
      if (playerGuide?.status !== 'active') fail(`${context} points to an inactive Player Guide.`);
      for (const id of successor.sections || []) {
        if (!playerGuideSections.has(id)) fail(`${context} points to unknown Player Guide section ${id}.`);
      }
      continue;
    }

    if (successor.surface === 'faction-guide') {
      const faction = factionGuides.get(successor.faction);
      if (!faction) {
        fail(`${context} points to unknown Faction Guide ${successor.faction}.`);
        continue;
      }
      if (faction.status !== 'active') fail(`${context} points to inactive Faction Guide ${successor.faction}.`);
      const factionSections = new Set((faction.sections || []).map(entry => entry.id));
      for (const id of successor.sections || []) {
        if (!factionSections.has(id)) fail(`${context} points to unknown ${successor.faction} Faction Guide section ${id}.`);
      }
      continue;
    }

    fail(`${context} names unsupported teaching successor ${JSON.stringify(successor.surface)}.`);
  }
}

if (errors.length) {
  console.error('Legacy Rulebook retirement coverage validation failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const mechanicallyReviewed = expectedSections.filter(section => section.classification !== 'editorial').length;
console.log(`Legacy Rulebook retirement coverage valid: full-source fingerprint plus ${expectedSections.length} top-level sections inventoried, ${mechanicallyReviewed} mechanically relevant sections fingerprint-reviewed, all registered gameplay rules covered by active Comprehensive Rules.`);
