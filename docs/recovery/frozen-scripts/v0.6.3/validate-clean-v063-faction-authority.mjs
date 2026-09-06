import fs from 'node:fs';
import path from 'node:path';
import { buildOutputs } from './build-clean-v063-faction-authority.mjs';

const root = process.cwd();
const outputs = buildOutputs();
let failed = false;

function fail(message) {
  console.error(`[clean-v063-faction-authority] ${message}`);
  failed = true;
}

for (const [rel, expected] of Object.entries(outputs)) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fail(`missing generated output: ${rel}`);
    continue;
  }
  const actual = fs.readFileSync(full, 'utf8');
  if (actual !== expected) fail(`committed output does not match deterministic reconstruction: ${rel}`);
}

const guidePaths = Object.keys(outputs).filter((rel) => /Gauntlet_v0\.6\.3_.*_Faction_Guide\.md$/.test(rel));
if (guidePaths.length !== 6) fail(`expected six faction guides, found ${guidePaths.length}`);

for (const rel of guidePaths) {
  const text = outputs[rel];
  if (!/^# Gauntlet v0\.6\.3 .* Faction Guide/m.test(text)) fail(`${rel}: v0.6.3 title missing`);
  if (!/Clean v0\.6\.3 .* faction authority candidate/.test(text)) fail(`${rel}: reconstruction authority notice missing`);
  if (!/Card-text boundary/.test(text)) fail(`${rel}: card-text evidence boundary missing`);
  if (/> \*\*(?:Battle|Activate|Use):\*\*/.test(text)) fail(`${rel}: retired effect heading survives`);
  if (/\bPlayable Deck\b/.test(text)) fail(`${rel}: Playable Deck terminology survives`);
  if (/\bBattle effects?\b/.test(text)) fail(`${rel}: Battle-effect prose survives`);
  if (/> \*\*Action:\*\* Bank this card\.$/m.test(text)) fail(`${rel}: exact standalone inherent Bank Action survives`);

  const poolMatch = text.match(/^# \d+\. Canonical .* card pool$/m);
  const quickMatch = text.match(/^# \d+\. Quick reference$/m);
  if (!poolMatch || !quickMatch || poolMatch.index >= quickMatch.index) {
    fail(`${rel}: card-pool boundaries missing or malformed`);
  } else {
    const cardSection = text.slice(poolMatch.index, quickMatch.index);
    const cardHeadings = [...cardSection.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    if (cardHeadings.length !== 13) fail(`${rel}: expected 13 faction-card headings, found ${cardHeadings.length}`);
  }
}

const manifestPath = 'artifacts/reconstruction/clean-v0.6.3/faction-guides/authority-manifest.json';
const manifest = JSON.parse(outputs[manifestPath]);
if (manifest.target !== 'clean-v0.6.3') fail('authority manifest target drifted');
if (manifest.authority_base_set_id !== '563ce3a0ac39a0bbba52cc113ae9ffbcaeb3c0985bad4cfa66fe462fb2cacb3b') fail('authority manifest clean-v0.6.2 base pin drifted');
if (manifest.evidence?.git_blob_sha !== '955dfa654cac96a9de820867ab694e83d0fb1d36') fail('authority manifest v0.6.3 evidence pin drifted');
if (manifest.publication_unlocked !== false) fail('faction authority candidate must not unlock publication');
if ((manifest.guides ?? []).length !== 6) fail('authority manifest must contain six guides');
if ((manifest.recovered_late_decisions ?? []).length !== 3) fail('authority manifest must retain the three recovered PR #571 decisions');
const identityTransitions = manifest.approved_identity_transitions ?? [];
if (identityTransitions.length !== 1 || identityTransitions[0]?.card !== 'Extraordinary Rendition' || identityTransitions[0]?.field !== 'card_form' || identityTransitions[0]?.from !== 'Asset with a bound opposing card' || identityTransitions[0]?.to !== 'Asset') fail('authority manifest must pin exactly the approved Extraordinary Rendition form normalization');
if (JSON.stringify(manifest.integrated_faction_shared_rules ?? []) !== JSON.stringify(['diplomat-sanctions-default-expiration'])) fail('authority manifest must record the Diplomat Sanctions shared-rule integration');
const diplomatGuide = outputs['artifacts/reconstruction/clean-v0.6.3/faction-guides/diplomat/Gauntlet_v0.6.3_Diplomat_Faction_Guide.md'];
for (const requiredSanctionsText of [
  'that opponent remains associated with that Sanction for as long as it remains in play',
  "unless the Sanction says otherwise, after that opponent accepts the owner's Terms, put the Sanction in its owner's Discard Pile",
  'A Sanction may state additional removal conditions',
]) {
  if (!diplomatGuide?.includes(requiredSanctionsText)) fail(`Diplomat guide missing adopted Sanctions shared rule: ${requiredSanctionsText}`);
}

if (failed) process.exit(1);
console.log('Clean v0.6.3 faction authority validated: six deterministic guides derive from certified clean v0.6.2 authority, finalized card-text evidence is pinned, and publication remains locked.');
