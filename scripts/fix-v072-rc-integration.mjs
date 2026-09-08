import { readFile, writeFile } from 'node:fs/promises';

async function replaceExact(path, from, to) {
  const source = await readFile(path, 'utf8');
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${path}: expected exactly one match, found ${count}: ${from.slice(0, 120)}`);
  await writeFile(path, source.replace(from, to));
}

// Governance: derive the three newly volatile numeric claims from structured authority.
await replaceExact(
  'rulebook/player-facing/rule-facts.js',
  "  'proposals.count': 1,\n});",
  "  'proposals.count': 1,\n  'military.commandant.fortify.command_cost': 1,\n  'diplomats.diplomatic_recognition.accepted_draw': 1,\n  'financiers.executive.hostile_takeover.action_cost': 1,\n});",
);

await replaceExact(
  'rulebook/player-facing/rule-facts.js',
  "function cardCount(authority, allegiance) {\n  return (authority?.gameplay?.cards || []).filter(card => card?.allegiance === allegiance).length;\n}\n",
  "function cardCount(authority, allegiance) {\n"
    + "  return (authority?.gameplay?.cards || []).filter(card => card?.allegiance === allegiance).length;\n"
    + "}\n\n"
    + "function leaderAbility(authority, factionId, leaderId, abilityName) {\n"
    + "  const leader = faction(authority, factionId)?.leaders?.find(candidate => candidate?.id === leaderId);\n"
    + "  for (const section of leader?.sections || []) {\n"
    + "    for (const item of section?.items || []) {\n"
    + "      if (item?.name === abilityName) return item;\n"
    + "    }\n"
    + "    if (section?.name === abilityName) return section;\n"
    + "  }\n"
    + "  return null;\n"
    + "}\n\n"
    + "function leadingNumber(value, label) {\n"
    + "  const match = String(value ?? '').trim().match(/^(\\d+)\\b/);\n"
    + "  if (!match) throw new Error('Cannot derive numeric Rulebook fact from ' + label + ': ' + value);\n"
    + "  return Number(match[1]);\n"
    + "}\n\n"
    + "function proposalAcceptedDraw(authority, proposalId) {\n"
    + "  const proposal = (authority?.proposals || []).find(candidate => candidate?.id === proposalId);\n"
    + "  const accepted = String(proposal?.accepted || '');\n"
    + "  const match = accepted.match(/\\+(\\d+)\\s+Cards?\\b/i);\n"
    + "  if (!match) throw new Error('Cannot derive accepted draw for Proposal ' + proposalId + ': ' + accepted);\n"
    + "  return Number(match[1]);\n"
    + "}\n",
);

await replaceExact(
  'rulebook/player-facing/rule-facts.js',
  "    'proposals.count': (authority?.proposals || []).length,\n  };",
  "    'proposals.count': (authority?.proposals || []).length,\n"
    + "    'military.commandant.fortify.command_cost': leadingNumber(\n"
    + "      leaderAbility(authority, 'military', 'commandant', 'Fortify')?.cost,\n"
    + "      'Commandant Fortify cost',\n"
    + "    ),\n"
    + "    'diplomats.diplomatic_recognition.accepted_draw': proposalAcceptedDraw(\n"
    + "      authority,\n"
    + "      'diplomatic-recognition',\n"
    + "    ),\n"
    + "    'financiers.executive.hostile_takeover.action_cost': leadingNumber(\n"
    + "      leaderAbility(authority, 'financiers', 'executive', 'Hostile Takeover')?.descriptor,\n"
    + "      'Executive Hostile Takeover descriptor',\n"
    + "    ),\n"
    + "  };",
);

await replaceExact(
  'rulebook/player-facing/current-rulebook.md',
  '> **Fortify — 2 Command · No Action · Aftermath · Win while occupying enemy Territory:** Capture the Territory you occupy, if able.',
  '> **Fortify — 2<!-- RULE-FACT:military.commandant.fortify.command_cost:number --> Command · No Action · Aftermath · Win while occupying enemy Territory:** Capture the Territory you occupy, if able.',
);
await replaceExact(
  'rulebook/player-facing/current-rulebook.md',
  '> **Accepted:** Diplomat: Capture the Territory you occupy, if able. Accepting player withdraws, then +2 Cards.',
  '> **Accepted:** Diplomat: Capture the Territory you occupy, if able. Accepting player withdraws, then +2<!-- RULE-FACT:diplomats.diplomatic_recognition.accepted_draw:number --> Cards.',
);
await replaceExact(
  'rulebook/player-facing/current-rulebook.md',
  '> **Hostile Takeover — 1 Action · Denouement · After winning as attacker:** While occupying that enemy Territory, buy or buy out its Deed. Treat yourself as occupier for cost. If successful, capture that Territory, if able.',
  '> **Hostile Takeover — 1<!-- RULE-FACT:financiers.executive.hostile_takeover.action_cost:number --> Action · Denouement · After winning as attacker:** While occupying that enemy Territory, buy or buy out its Deed. Treat yourself as occupier for cost. If successful, capture that Territory, if able.',
);

// TTS: active-development previews must not pretend a versioned publication Rulebook exists.
await replaceExact(
  'scripts/stage-tts-release-assets.mjs',
  "  const { generateTtsRulebookReader } = await import('./generate-tts-rulebook-reader.mjs');\n  await generateTtsRulebookReader();\n\n  const prefix = assetPrefix(release.version);",
  "  const targetStatus = String(release.targetStatus || '').trim();\n"
    + "  if (!['current-release', 'active-development'].includes(targetStatus)) {\n"
    + "    throw new Error('Unsupported TTS target status ' + (targetStatus || 'missing') + '.');\n"
    + "  }\n"
    + "  const includeRulebook = targetStatus === 'current-release';\n"
    + "  if (includeRulebook) {\n"
    + "    const { generateTtsRulebookReader } = await import('./generate-tts-rulebook-reader.mjs');\n"
    + "    await generateTtsRulebookReader();\n"
    + "  } else {\n"
    + "    console.log('TTS active-development staging for ' + release.version + ': publication Rulebook PDF is intentionally omitted until release materialization.');\n"
    + "  }\n\n"
    + "  const prefix = assetPrefix(release.version);",
);

await replaceExact(
  'scripts/stage-tts-release-assets.mjs',
  "  addAsset(\n    records,\n    seenNames,\n    'rulebook-reader.pdf',\n    `${prefix}_Rulebook.pdf`,\n    'rulebook-reader',\n    { pageFormat: 'half-letter', pageOrder: 'reading' },\n  );",
  "  if (includeRulebook) {\n"
    + "    addAsset(\n"
    + "      records,\n"
    + "      seenNames,\n"
    + "      'rulebook-reader.pdf',\n"
    + "      `${prefix}_Rulebook.pdf`,\n"
    + "      'rulebook-reader',\n"
    + "      { pageFormat: 'half-letter', pageOrder: 'reading' },\n"
    + "    );\n"
    + "  }",
);

await replaceExact(
  'scripts/stage-tts-release-assets.mjs',
  "    gameVersion: release.version,\n    repository,\n    releaseTag: release.version,",
  "    gameVersion: release.version,\n    targetStatus,\n    repository,\n    releaseTag: release.version,",
);

await replaceExact(
  'scripts/generate-tts-save.mjs',
  "  const guid = makeGuidFactory();\n  const rulebook = makeSharedRulebook(version, releaseAssets, guid());\n  const starterKits = starters.map(starter => buildStarterKit(starter, releaseAssets, starterBagTransform(starter, starters), guid));",
  "  const targetStatus = String(releaseAssets?.targetStatus || 'current-release').trim();\n"
    + "  if (!['current-release', 'active-development'].includes(targetStatus)) {\n"
    + "    throw new Error('Unsupported staged TTS target status ' + (targetStatus || 'missing') + '.');\n"
    + "  }\n"
    + "  const hasRulebook = Boolean(releaseAssets?.bySourceFile?.[RULEBOOK_READER_SOURCE]);\n"
    + "  if (targetStatus === 'current-release' && !hasRulebook) {\n"
    + "    throw new Error('Published/current TTS save requires a staged Rulebook reader PDF.');\n"
    + "  }\n\n"
    + "  const guid = makeGuidFactory();\n"
    + "  const rulebook = hasRulebook ? makeSharedRulebook(version, releaseAssets, guid()) : null;\n"
    + "  const starterKits = starters.map(starter => buildStarterKit(starter, releaseAssets, starterBagTransform(starter, starters), guid));",
);

await replaceExact(
  'scripts/generate-tts-save.mjs',
  "    'Ready shared and faction supplemental components are assembled into the same starter kit later in the TTS package pipeline. Rules remain manual.',\n  ].join('\\n\\n');",
  "    'Ready shared and faction supplemental components are assembled into the same starter kit later in the TTS package pipeline. Rules remain manual.',\n"
    + "    rulebook ? 'The shared Rulebook PDF is included from the materialized release package.' : 'This active-development QA save omits the publication-only Rulebook PDF; use the maintained current Rulebook while testing.',\n"
    + "  ].join('\\n\\n');",
);

await replaceExact(
  'scripts/generate-tts-save.mjs',
  '    ObjectStates: [rulebook, ...starterKits],',
  '    ObjectStates: [...(rulebook ? [rulebook] : []), ...starterKits],',
);

await replaceExact(
  'tts/validate-current-authoritative-save.mjs',
  "function validateSharedRulebook(save) {\n  const rulebooks = (save.ObjectStates || []).filter(object => object?.GMNotes === SHARED_RULEBOOK_NOTE);\n  if (rulebooks.length !== 1) throw new Error(`Expected exactly one shared Rulebook Custom PDF; found ${rulebooks.length}.`);\n\n  const rulebook = rulebooks[0];",
  "function validateSharedRulebook(save, release) {\n"
    + "  const rulebooks = (save.ObjectStates || []).filter(object => object?.GMNotes === SHARED_RULEBOOK_NOTE);\n"
    + "  const targetStatus = String(release?.targetStatus || '').trim();\n"
    + "  if (targetStatus === 'active-development' && rulebooks.length === 0) return;\n"
    + "  if (targetStatus !== 'active-development' && targetStatus !== 'current-release') {\n"
    + "    throw new Error('Unsupported TTS target status ' + (targetStatus || 'missing') + ' while validating shared Rulebook.');\n"
    + "  }\n"
    + "  if (rulebooks.length !== 1) {\n"
    + "    const expectation = targetStatus === 'current-release' ? 'exactly one' : 'zero or one';\n"
    + "    throw new Error('Expected ' + expectation + ' shared Rulebook Custom PDF for ' + targetStatus + '; found ' + rulebooks.length + '.');\n"
    + "  }\n\n"
    + "  const rulebook = rulebooks[0];",
);

await replaceExact(
  'tts/validate-current-authoritative-save.mjs',
  '  validateSharedRulebook(save);',
  '  validateSharedRulebook(save, release);',
);

console.log('Applied v0.7.2 RC Governance/TTS integration fixes.');
