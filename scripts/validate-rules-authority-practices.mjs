import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  deriveRuleFacts,
  ruleNumberWord,
  validateRuleFactMarkers,
} from '../rulebook/player-facing/rule-facts.js';
import {
  CURRENT_GAME_AUTHORITY_SOURCE,
  ROOT,
  loadCurrentGameAuthority,
} from './current-game-authority.mjs';

const RULEBOOK_PATH = 'rulebook/player-facing/current-rulebook.md';
const BASELINE_PATH = 'config/rules-authority-debt-baseline.json';

const NUMBER_TOKEN = /\b(?:\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|once|twice)\b/i;
const RULES_CONTEXT = /\b(?:action|actions|card|cards|hand|reserve|gambit|gambits|tactic|tactics|territory|territories|rite|rites|proposal|proposals|influence|capital|intel|conviction|command|maximum|minimum|at least|no more than|exactly|begin|draw|discard|keep|gain|spend|cost|value|deck|leader|faction|die|dice|roll|retreat|movement|position|battle|turn|phase|asset|assets|overlay|overlays|mission|missions|operation|operations|front line|capture|purge|unique|arcane)\b/i;

function readText(path) {
  return readFileSync(resolve(ROOT, path), 'utf8').replace(/\r\n/g, '\n');
}

function normalizeDebtClaim(line) {
  return String(line).replace(/\s+/g, ' ').trim();
}

function scrubStructuralNumbers(line) {
  return String(line)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/^\s*\d+\.\s+/, ' ')
    .replace(/\bChapter\s+\d+\b/gi, ' ')
    .replace(/\bPart\s+[IVX]+\b/gi, ' ')
    .replace(/\b(?:v|Version\s*)?\d+\.\d+\.\d+(?:[- ][A-Za-z0-9.-]+)?\b/gi, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ');
}

function isUntrackedVolatileClaim(line) {
  if (/RULE-FACT:/.test(line)) return false;
  if (/^\s*#+\s+\d+(?:\.|\s)/.test(line)) return false;
  const scrubbed = scrubStructuralNumbers(line);
  return NUMBER_TOKEN.test(scrubbed) && RULES_CONTEXT.test(scrubbed);
}

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const char of String(value)) {
    hash ^= BigInt(char.codePointAt(0));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, '0');
}

function collectDebtClaims(markdown) {
  const claims = [];
  for (const [index, line] of String(markdown).split('\n').entries()) {
    if (!isUntrackedVolatileClaim(line)) continue;
    const normalized = normalizeDebtClaim(line);
    claims.push({ line: index + 1, text: normalized, hash: fnv1a64(normalized) });
  }
  return claims;
}

function countHashes(claims) {
  const counts = {};
  for (const claim of claims) counts[claim.hash] = (counts[claim.hash] || 0) + 1;
  return counts;
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function gitShowJson(baseSha, path) {
  if (!baseSha || !/^[0-9a-f]{40}$/i.test(baseSha)) return null;
  try {
    const raw = execFileSync('git', ['show', `${baseSha}:${path}`], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function validateDebtBaseline(rulebook, baseSha) {
  const baseline = readJson(BASELINE_PATH);
  if (baseline?.schemaVersion !== 1 || baseline?.algorithm !== 'fnv1a64-v1' || !baseline?.claims) {
    throw new Error('Invalid rules-authority debt baseline.');
  }

  const currentClaims = collectDebtClaims(rulebook);
  const currentCounts = countHashes(currentClaims);
  const errors = [];
  const reported = new Set();

  for (const claim of currentClaims) {
    const allowed = Number(baseline.claims[claim.hash] || 0);
    const actual = Number(currentCounts[claim.hash] || 0);
    if (actual > allowed && !reported.has(claim.hash)) {
      reported.add(claim.hash);
      errors.push(
        `Untracked volatile Rulebook claim at line ${claim.line}: "${claim.text}"\n` +
        '  Add/derive a structured authority fact and mark the displayed value with RULE-FACT.',
      );
    }
  }

  const baseBaseline = gitShowJson(baseSha, BASELINE_PATH);
  if (baseBaseline?.claims) {
    for (const [hash, allowed] of Object.entries(baseline.claims)) {
      const previous = Number(baseBaseline.claims[hash] || 0);
      if (Number(allowed) > previous) {
        errors.push(
          `Rules-authority debt baseline increased for ${hash}: ${previous} -> ${allowed}. ` +
          'The baseline is a one-way ratchet; new untracked claims may not be grandfathered.',
        );
      }
    }
  }

  if (errors.length) {
    throw new Error(`Rules-authority debt ratchet failed:\n- ${errors.join('\n- ')}`);
  }

  const baselineTotal = Object.values(baseline.claims).reduce((sum, value) => sum + Number(value), 0);
  console.log(
    `Rules-authority debt ratchet passed: ${currentClaims.length} untracked high-risk numeric claim(s) remain ` +
    `against a baseline of ${baselineTotal}; new debt is forbidden.`,
  );
}

function addedLines(baseSha, paths) {
  if (!baseSha || !/^[0-9a-f]{40}$/i.test(baseSha)) return [];
  let diff = '';
  try {
    diff = execFileSync('git', ['diff', '--unified=0', '--no-color', `${baseSha}...HEAD`, '--', ...paths], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`Unable to inspect rules-authority diff: ${error.message}`);
  }

  const lines = [];
  let path = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      path = line.slice('+++ b/'.length);
      continue;
    }
    if (!path || !line.startsWith('+') || line.startsWith('+++')) continue;
    lines.push({ path, text: line.slice(1) });
  }
  return lines;
}

function isHistoricalDoc(path) {
  return (
    /(?:^|\/)(?:recovery|archive|archives|history|historical)(?:\/|$)/i.test(path)
    || /(?:^|\/)(?:changelog|release-notes)(?:\/|$)/i.test(path)
    || /v\d+\.\d+(?:\.\d+)?/i.test(path)
  );
}

function validateNoNewVersionPinnedCurrentDocs(baseSha) {
  const errors = [];
  for (const { path, text } of addedLines(baseSha, ['docs', 'README.md'])) {
    if (isHistoricalDoc(path)) continue;
    if (/DOC-HISTORICAL/.test(text)) continue;
    if (
      /\b(?:current|currently|official|latest|active)\b/i.test(text)
      && /\bv?\d+\.\d+\.\d+(?:[- ][A-Za-z0-9.-]+)?\b/i.test(text)
    ) {
      errors.push(
        `${path}: "${text.trim()}" hard-codes a version while describing active/current state. ` +
        'Reference release lifecycle/current authority instead, or mark an intentionally historical statement with DOC-HISTORICAL.',
      );
    }
  }
  if (errors.length) {
    throw new Error(`Active-document version-pin policy failed:\n- ${errors.join('\n- ')}`);
  }
  console.log('Active-document version-pin policy passed.');
}

function validateCurrentPlayerFacingSurfaces(authority, rulebook) {
  const facts = deriveRuleFacts(authority);
  const errors = [];

  const thresholdWord = ruleNumberWord(facts['diplomats.peace_treaty_threshold']);
  for (const path of [
    'legacy/public-compatibility/faction-sheets/diplomat.js',
    'rules-assistant/answer-presentation.js',
    'rules-assistant/rules-deterministic.js',
  ]) {
    const source = readText(path);
    if (!source.includes(`${thresholdWord} different Proposals`)) {
      errors.push(
        `${path} does not reflect diplomats.peace_treaty_threshold=${facts['diplomats.peace_treaty_threshold']}.`,
      );
    }
  }

  const ritualName = authority?.mystics?.ritual?.name;
  if (ritualName && !rulebook.includes(ritualName)) {
    errors.push(`Current Rulebook does not contain the authoritative Mystics ritual name "${ritualName}".`);
  }
  if (rulebook.includes('Ritual of Ascendance')) {
    errors.push('Current Rulebook contains retired Mystics term "Ritual of Ascendance".');
  }

  for (const faction of authority?.gameplay?.factions || []) {
    const uniqueCards = (authority?.gameplay?.cards || []).filter(
      card => card?.allegiance === faction.name && card?.unique,
    );
    for (const card of uniqueCards) {
      const expected = `| Unique card | ${card.name}, cost ${card.cost}; maximum one copy per Deck. |`;
      if (!rulebook.includes(expected)) {
        errors.push(
          `Current Rulebook is missing authoritative Unique summary for ${faction.name} card ${card.name}.`,
        );
      }
    }
  }

  if (errors.length) {
    throw new Error(`Current player-facing rules surface contract failed:\n- ${errors.join('\n- ')}`);
  }
  console.log('Current player-facing rules surface contract passed.');
}

const authority = await loadCurrentGameAuthority();
const rulebook = readText(RULEBOOK_PATH);
validateRuleFactMarkers(rulebook, authority);
validateCurrentPlayerFacingSurfaces(authority, rulebook);

const baseSha = String(process.env.RULES_AUTHORITY_BASE_SHA || '').trim();
validateDebtBaseline(rulebook, baseSha);
validateNoNewVersionPinnedCurrentDocs(baseSha);

console.log(
  `Rules-authority governance passed for ${authority.version} from ${CURRENT_GAME_AUTHORITY_SOURCE}. ` +
  'Structured authority, tracked Rulebook facts, active surfaces, debt ratchet, and active-doc version policy are consistent.',
);
