import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, 'artifacts/reconstruction/clean-v0.6.2/faction-guides');
const fail = (message) => {
  console.error(`clean-v062-faction-authority: ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};
const read = (rel) => fs.readFileSync(path.join(base, rel), 'utf8');
const includes = (text, value, label) => assert(text.includes(value), `${label}: missing ${JSON.stringify(value)}`);
const excludes = (text, value, label) => assert(!text.includes(value), `${label}: forbidden ${JSON.stringify(value)}`);

const guides = {
  military: ['military/Gauntlet_v0.6.2_Military_Faction_Guide.md', 'Military'],
  diplomat: ['diplomat/Gauntlet_v0.6.2_Diplomat_Faction_Guide.md', 'Diplomat'],
  financier: ['financier/Gauntlet_v0.6.2_Financier_Faction_Guide.md', 'Financier'],
  intelligence: ['intelligence/Gauntlet_v0.6.2_Intelligence_Faction_Guide.md', 'Intelligence'],
  mystics: ['mystics/Gauntlet_v0.6.2_Mystics_Faction_Guide.md', 'Mystics'],
  inquisition: ['inquisition/Gauntlet_v0.6.2_Inquisition_Faction_Guide.md', 'Inquisition']
};

assert(fs.existsSync(path.join(base, 'authority-manifest.json')), 'authority manifest missing');
const manifest = JSON.parse(read('authority-manifest.json'));
assert(manifest.target === 'clean-v0.6.2', 'manifest target must be clean-v0.6.2');
assert(manifest.authority_base === 'v0.6.1', 'manifest authority base must remain v0.6.1');
assert(manifest.approval_pr === 606 && manifest.build_unlock_pr === 607, 'manifest must record approval PR #606 and build-unlock PR #607');
assert(manifest.status === 'authority_candidate_pending_semantic_review', 'candidate must remain pending semantic review');
assert(Array.isArray(manifest.forbidden_authority_sources) && manifest.forbidden_authority_sources.includes('releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Rulebook.md'), 'withdrawn v0.6.2 Rulebook must remain forbidden authority');
assert(manifest.forbidden_authority_sources.includes('releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Faction_and_Component_Guide.md'), 'withdrawn v0.6.2 combined faction guide must remain forbidden authority');
assert(JSON.stringify([...manifest.guides].sort()) === JSON.stringify(Object.keys(guides).sort()), 'manifest must enumerate all six faction guides');

const text = {};
for (const [slug, [rel, display]] of Object.entries(guides)) {
  const full = path.join(base, rel);
  assert(fs.existsSync(full), `${display}: generated guide missing`);
  text[slug] = read(rel);
  includes(text[slug], `# Gauntlet v0.6.2 ${display} Faction Guide`, display);
  includes(text[slug], `Clean v0.6.2 ${display} faction authority candidate`, display);
  excludes(text[slug], 'Definitive v0.6.1', display);
  excludes(text[slug], "Defender's Advantage", display);
  excludes(text[slug], 'Action Opportunity', display);
  excludes(text[slug], "Smuggler's Run", display);
  excludes(text[slug], 'Second Line', display);
}

// Military: preserve Leader ownership and adopt only the v0.6.2-compatible deltas.
for (const value of ['## General', '## Commandant', '**Onward — 1 Command:**', '**Rally — 1 Command:**', '**Rout — 2 Command:**', '**Entrench — 1 Command:**', '**Repel — 1 Command:**', '**Fortify — 2 Command:**']) includes(text.military, value, 'Military');
includes(text.military, 'advance your Front Line by one Territory, if able', 'Military Fortify');
includes(text.military, '## Invasion', 'Military pool expansion');
includes(text.military, '**Cost:** 4', 'Military Invasion cost');
includes(text.military, 'form your Reserve with one additional card and you may choose one additional Tactic', 'Military Invasion battle mode');
excludes(text.military, 'Military alternate victory', 'Military');

// Diplomats: complete Terms engine, revised Influence economy and Leverage curve, both Leaders, and Détente.
for (const value of ['## Ambassador', '## Senator', '**Cordiality:**', '**Political Capital:**', '### Accepted Terms', '### Refused Terms', '### Leverage', '## Détente']) includes(text.diplomat, value, 'Diplomat');
includes(text.diplomat, 'if newly ratified, gain 1 Influence', 'Diplomat accepted reward');
includes(text.diplomat, 'Gain 2 Influence if newly ratified', 'Diplomat imposed reward');
includes(text.diplomat, '| +4 | 10 |', 'Diplomat Leverage curve');
includes(text.diplomat, 'The accepting player', 'Diplomat Proposal perspective');

// Financiers: preserve both Leaders and economic engine, start at 2 Capital, Front Line-safe Executive, Compound Interest, and #511 same-phase actions.
for (const value of ['## Banker', '## Executive', '**Line of Credit:**', '**Hostile Takeover:**', 'Begin with 2 Capital', '### Financial Capacity', '## Compound Interest']) includes(text.financier, value, 'Financier');
includes(text.financier, 'advance your Front Line by one Territory, if able', 'Financier Hostile Takeover');
includes(text.financier, 'After this Action resolves, you may take one additional Action during this phase.', 'Financier #511 same-phase action');

// Intelligence: the guide must fully restate the v0.6.1 engine rather than say it merely "retains" systems.
for (const value of ['## Ranger', '## Spymaster', '**Fieldcraft:**', '**Mission Control:**', '### Gambit Surveillance', '### Tactic Surveillance', '### Direct Interference', '**Start a Mission:**', '**Complete a Mission:**', '**Abort a Mission:**', '**Start a Special Operation:**', '**Complete a Special Operation:**', '## Extraordinary Rendition']) includes(text.intelligence, value, 'Intelligence');
excludes(text.intelligence, 'retains its v0.6.1 resource, Mission, Leader, and victory systems', 'Intelligence flattened authority');
excludes(text.intelligence, 'face-down battle card, or Territory', 'Intelligence Counterintelligence');

// Mystics: preserve Leader ownership/Rite engine, count all 13 Arcane cards, and add Nature's Altar without changing Rite of Crossing.
for (const value of ['## Alchemist', '## Spirit Walker', '**Materia Prima:**', '**Guardians of the Circle:**', '## Rite of Echoes', '## Rite of Blood', '## Rite of Crossing', '## Nature\'s Altar']) includes(text.mystics, value, 'Mystics');
includes(text.mystics, 'All thirteen Mystics cards have the Arcane trait', 'Mystics Arcane pool');
includes(text.mystics, 'Gain advantage. Then you may play one card from your Hand with a Tactic or Battle effect face up as an additional Tactic.', 'Black Covenant revision');
includes(text.mystics, 'Rite of Crossing retains its specialized beginning restriction', 'Nature\'s Altar boundary');

// Inquisition: preserve both Leaders and full doctrine, adopt the phase-compatible Purge expression, and add Martyrdom.
for (const value of ['## Grand Inquisitor', '## Witch Hunter', '**Final Judgment:**', '**Relentless Pursuit:**', '### Conviction', '### Condemnation', '### Blasphemy', '**Purge — Opening or Denouement:**', '### Purification', '## Martyrdom']) includes(text.inquisition, value, 'Inquisition');
includes(text.inquisition, 'does not consume the once-per-turn Purge Faction Action', 'Final Judgment separation');
includes(text.inquisition, 'Do not create an Opening or Denouement phase before that pending battle', 'Relentless Pursuit phase boundary');
includes(text.inquisition, 'set your Conviction to 4', 'Martyrdom Conviction');

// Cross-version guardrails: clean v0.6.2 must not absorb v0.6.3-only architecture.
for (const [slug, body] of Object.entries(text)) {
  excludes(body, 'inherent Bank Action', `${slug} v0.6.3 card-language backport`);
  excludes(body, 'Gambit/Tactic —', `${slug} v0.6.3 role-heading backport`);
  excludes(body, 'face-up opening discard', `${slug} v0.6.3 setup backport`);
  excludes(body, 'two independent Run-the-Gauntlet', `${slug} v0.6.3 victory backport`);
}

if (!process.exitCode) {
  console.log('Clean v0.6.2 faction authority validated: six self-contained v0.6.1-based candidates preserve Leader ownership and approved v0.6.2 boundaries.');
}
