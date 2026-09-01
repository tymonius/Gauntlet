import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadTtsComponentContract } from './tts-component-contract.mjs';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const GENERATED_READY_FAMILIES = new Set(['proposal-treaty-card', 'ledger', 'deed-card']);
const SUPPLEMENTAL_NOTE_PREFIX = 'gauntlet:supplemental:';
const STARTER_KIT_NOTE_PREFIX = 'gauntlet:starter-kit:';
const STRICT_TARGET_STATUSES = new Set(['release-candidate']);

function walkObjects(objects, visit) {
  for (const object of objects || []) {
    visit(object);
    walkObjects(object?.ContainedObjects, visit);
  }
}

function generatedBridgeEligible(component) {
  return (component.designStatus || 'final') === 'final'
    && component.productionStatus === 'export-pending'
    && GENERATED_READY_FAMILIES.has(component.family);
}

export function evaluateComponentReadiness(contract, supplementalManifest) {
  const generatedReady = new Set((supplementalManifest?.ready || []).map(component => component.id));
  const blockers = [];
  const expectedGenerated = [];

  for (const component of contract.sharedComponents || []) {
    if (component.productionStatus !== 'ready') {
      blockers.push({
        id: component.id,
        kind: 'shared-component',
        status: component.productionStatus || 'missing',
        reason: `${component.name} is still ${component.productionStatus || 'not production-ready'}.`,
      });
    }
  }

  for (const component of contract.components || []) {
    const shouldGenerate = component.productionStatus === 'ready' || generatedBridgeEligible(component);
    if (!shouldGenerate) {
      blockers.push({
        id: component.id,
        kind: 'faction-component',
        status: component.productionStatus || 'missing',
        reason: `${component.name} has no release-ready TTS export path.`,
      });
      continue;
    }

    expectedGenerated.push(component.id);
    if (!generatedReady.has(component.id)) {
      blockers.push({
        id: component.id,
        kind: 'generated-output',
        status: 'missing',
        reason: `${component.name} should be generated for TTS but is absent from supplemental-manifest.json.`,
      });
    }
  }

  return { blockers, expectedGenerated };
}

function countSupplementalsById(objects) {
  const counts = new Map();
  walkObjects(objects, object => {
    const notes = String(object?.GMNotes || '');
    if (!notes.startsWith(SUPPLEMENTAL_NOTE_PREFIX)) return;
    const id = notes.slice(SUPPLEMENTAL_NOTE_PREFIX.length);
    counts.set(id, (counts.get(id) || 0) + 1);
  });
  return counts;
}

function riteIdFromComponent(component) {
  const id = String(component?.id || '');
  return id.startsWith('mystics-rite-') ? id.slice('mystics-rite-'.length) : '';
}

function componentAppliesToStarter(component, starter) {
  if (component?.deckInclusion === 'every-deck') return true;
  if (component?.faction !== starter?.factionId) return false;
  if (component?.family === 'rite-card') {
    const selectedRites = Array.isArray(starter?.selectedRites) ? starter.selectedRites : [];
    return selectedRites.includes(riteIdFromComponent(component));
  }
  return true;
}

export function evaluateStarterAssembly(starterManifest, supplementalManifest, save) {
  const blockers = [];
  const readyComponents = supplementalManifest.ready || [];

  const bags = (save.ObjectStates || []).filter(object => (
    object?.Name === 'Bag'
    && String(object?.GMNotes || '').startsWith(STARTER_KIT_NOTE_PREFIX)
  ));
  const bagByNickname = new Map(bags.map(bag => [bag.Nickname, bag]));
  let expectedCopies = 0;
  let assembledCopies = 0;

  for (const starter of starterManifest.decks || []) {
    const nickname = `${starter.name} — ${starter.leader.name}`;
    const bag = bagByNickname.get(nickname);
    if (!bag) {
      blockers.push({
        id: starter.id,
        kind: 'starter-bag',
        status: 'missing',
        reason: `Generated save is missing starter Bag ${nickname}.`,
      });
      continue;
    }

    const counts = countSupplementalsById(bag.ContainedObjects || []);
    for (const component of readyComponents.filter(item => componentAppliesToStarter(item, starter))) {
      const expected = Number(component.quantity || 0);
      const actual = counts.get(component.id) || 0;
      expectedCopies += expected;
      assembledCopies += actual;
      if (actual !== expected) {
        blockers.push({
          id: `${starter.id}:${component.id}`,
          kind: 'starter-supplemental',
          status: `${actual}/${expected}`,
          reason: `${nickname} contains ${actual} copies of ${component.name}; expected ${expected}.`,
        });
      }
    }
  }

  if (bags.length !== (starterManifest.decks || []).length) {
    blockers.push({
      id: 'starter-bag-count',
      kind: 'starter-bag',
      status: `${bags.length}/${(starterManifest.decks || []).length}`,
      reason: `Generated save contains ${bags.length} visible starter Bags for ${(starterManifest.decks || []).length} starter manifests.`,
    });
  }

  return { blockers, expectedCopies, assembledCopies, starterCount: (starterManifest.decks || []).length };
}

export function evaluateHostedUrls(save) {
  const blockers = [];
  let urlCount = 0;
  walkObjects(save.ObjectStates, object => {
    for (const state of Object.values(object?.CustomDeck || {})) {
      for (const [field, value] of [['FaceURL', state?.FaceURL], ['BackURL', state?.BackURL]]) {
        if (!value) continue;
        urlCount += 1;
        if (!/^https:\/\//i.test(String(value))) {
          blockers.push({
            id: object.GUID || object.Nickname || 'custom-deck',
            kind: 'hosted-url',
            status: 'invalid',
            reason: `${field} is not HTTPS: ${value}`,
          });
        }
      }
    }
    for (const field of ['ImageURL', 'ImageSecondaryURL']) {
      const value = object?.CustomImage?.[field];
      if (!value) continue;
      urlCount += 1;
      if (!/^https:\/\//i.test(String(value))) {
        blockers.push({
          id: object.GUID || object.Nickname || 'custom-image',
          kind: 'hosted-url',
          status: 'invalid',
          reason: `${field} is not HTTPS: ${value}`,
        });
      }
    }
  });
  return { blockers, urlCount };
}

export function buildReadinessReport({ release, contract, supplementalManifest, starterManifest, save }) {
  const component = evaluateComponentReadiness(contract, supplementalManifest);
  const assembly = evaluateStarterAssembly(starterManifest, supplementalManifest, save);
  const urls = evaluateHostedUrls(save);
  const blockers = [...component.blockers, ...assembly.blockers, ...urls.blockers];
  const warnings = [];

  if (/review scaffold/i.test(String(save.SaveName || ''))) {
    warnings.push({
      id: 'review-scaffold-name',
      reason: 'The generated save still identifies itself as a review scaffold; promote/rename it only after the final in-game usability pass.',
    });
  }

  return {
    schemaVersion: 1,
    gameVersion: release.version,
    generatedAt: new Date().toISOString(),
    machineReady: blockers.length === 0,
    blockers,
    warnings,
    checks: {
      expectedGeneratedFactionComponents: component.expectedGenerated.length,
      generatedReadyComponents: supplementalManifest.readyCount ?? (supplementalManifest.ready || []).length,
      starterCount: assembly.starterCount,
      expectedStarterSupplementalCopies: assembly.expectedCopies,
      assembledStarterSupplementalCopies: assembly.assembledCopies,
      hostedObjectUrlsChecked: urls.urlCount,
    },
    manualReleaseChecks: [
      'Load the generated save in Tabletop Simulator using published release assets.',
      'Verify both player perspectives, hand zones, Gauntlet snaps, Territory orientation, dice, and Player Tokens.',
      'Unpack and play with representative starter kits from all six factions.',
      'Verify each faction supplemental component can be manipulated as intended, including trackers, Rites, Proposals/Treaties, Ledger, and Deeds.',
      'Exercise core handling and any faction supplemental interactions not already covered through focused in-game drills before Workshop publication.',
    ],
  };
}

export function shouldEnforceStrictReadiness(release, argv = process.argv) {
  return argv.includes('--strict') || STRICT_TARGET_STATUSES.has(String(release?.targetStatus || '').trim());
}

async function readGeneratedJson(path, hint) {
  return JSON.parse(await readFile(path, 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error(`${hint}: ${relative(ROOT, path)}`);
    throw error;
  }));
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const strict = shouldEnforceStrictReadiness(release);
  const contract = await loadTtsComponentContract();
  const [supplementalManifest, starterManifest, save] = await Promise.all([
    readGeneratedJson(join(release.outputRoot, 'supplemental-manifest.json'), 'Run npm run tts:package before checking TTS release readiness'),
    readGeneratedJson(join(release.outputRoot, 'starter-deck-manifest.json'), 'Run npm run tts:package before checking TTS release readiness'),
    readGeneratedJson(join(release.outputRoot, `Gauntlet_${release.version}_TTS_Review_Scaffold.json`), 'Run npm run tts:package before checking TTS release readiness'),
  ]);

  const report = buildReadinessReport({ release, contract, supplementalManifest, starterManifest, save });
  const reportText = `${JSON.stringify(report, null, 2)}\n`;
  await Promise.all([
    import('node:fs/promises').then(({ writeFile }) => writeFile(join(release.outputRoot, 'tts-release-readiness.json'), reportText)),
    import('node:fs/promises').then(({ writeFile }) => writeFile(join(CURRENT_ALIAS_ROOT, 'tts-release-readiness.json'), reportText)),
  ]);

  console.log(`TTS release readiness for ${release.version}: ${report.machineReady ? 'machine-ready' : `${report.blockers.length} blocker(s)`}.`);
  if (strict && release.targetStatus === 'release-candidate') {
    console.log('Release-candidate target: machine readiness is enforced as a blocking gate.');
  }
  for (const blocker of report.blockers) console.log(`BLOCKER ${blocker.id}: ${blocker.reason}`);
  for (const warning of report.warnings) console.log(`WARNING ${warning.id}: ${warning.reason}`);
  console.log(`Machine report: ${relative(ROOT, join(release.outputRoot, 'tts-release-readiness.json'))}`);
  console.log('Manual in-game QA remains required before Workshop publication.');

  if (strict && !report.machineReady) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
