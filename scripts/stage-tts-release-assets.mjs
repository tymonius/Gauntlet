import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const DEFAULT_REPOSITORY = 'tymonius/Gauntlet';
const STAGING_ROOT = join(ROOT, 'tts', 'generated', 'release-assets');
const ENVIRONMENT_ASSETS = Object.freeze([
  {
    sourceFile: 'environment/campaign-map-table.png',
    releaseSuffix: 'Environment_Table.png',
    kind: 'environment-table',
  },
  {
    sourceFile: 'environment/command-tent-panorama.png',
    releaseSuffix: 'Environment_Panorama.png',
    kind: 'environment-panorama',
  },
]);

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assetPrefix(version) {
  return `Gauntlet_${version}_TTS`;
}

function safeSegment(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function ensureFile(path) {
  const info = await stat(path).catch((error) => {
    if (error.code === 'ENOENT') throw new Error(`Required TTS release asset is missing: ${relative(ROOT, path)}`);
    throw error;
  });
  if (!info.isFile()) throw new Error(`Expected a file for TTS release publication: ${relative(ROOT, path)}`);
  return info;
}

function releaseUrl(repository, tag, name) {
  return `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(name)}`;
}

function contentVersionedUrl(url, digest) {
  if (!/^[a-f0-9]{64}$/i.test(String(digest || ''))) {
    throw new Error(`Cannot cache-bust TTS asset URL without a SHA-256 digest: ${url}`);
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${digest.slice(0, 12)}`;
}

function addAsset(records, seenNames, sourceFile, releaseAsset, kind, metadata = {}) {
  if (seenNames.has(releaseAsset)) throw new Error(`Duplicate staged TTS release asset name: ${releaseAsset}`);
  seenNames.add(releaseAsset);
  records.push({ sourceFile, releaseAsset, kind, ...metadata });
}

async function stageReleaseAssets() {
  const release = await resolveCurrentTtsRelease();
  const outputRoot = release.outputRoot;
  const repository = String(process.env.TTS_RELEASE_REPOSITORY || process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY).trim();
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) {
    throw new Error(`Invalid TTS release repository ${JSON.stringify(repository)}; expected owner/repo.`);
  }

  const [cardManifest, territoryManifest, leaderManifest, starterManifest, supplementalManifest] = await Promise.all([
    readJson(join(outputRoot, 'manifest.json')),
    readJson(join(outputRoot, 'territory-manifest.json')),
    readJson(join(outputRoot, 'leader-manifest.json')),
    readJson(join(outputRoot, 'starter-deck-manifest.json')),
    readJson(join(outputRoot, 'supplemental-manifest.json')),
  ]).catch((error) => {
    if (error.code === 'ENOENT') {
      throw new Error('TTS release staging requires a complete current build. Run npm run tts:build first.');
    }
    throw error;
  });

  for (const [label, manifest] of [
    ['playable-card manifest', cardManifest],
    ['Territory manifest', territoryManifest],
    ['Leader manifest', leaderManifest],
    ['starter-deck manifest', starterManifest],
    ['supplemental manifest', supplementalManifest],
  ]) {
    if (manifest.gameVersion !== release.version) {
      throw new Error(`${label} targets ${manifest.gameVersion || 'no version'}; current release is ${release.version}.`);
    }
  }
  if (territoryManifest.backPolicy !== 'standardBack') {
    throw new Error(`Territory manifest must use standardBack; found ${territoryManifest.backPolicy || 'missing'}.`);
  }
  if (supplementalManifest.placement?.assembly !== 'starter-faction') {
    throw new Error(`Supplemental manifest must declare starter-faction save assembly; found ${supplementalManifest.placement?.assembly || 'missing'}.`);
  }

  const prefix = assetPrefix(release.version);
  const records = [];
  const seenNames = new Set();

  for (const environment of ENVIRONMENT_ASSETS) {
    addAsset(
      records,
      seenNames,
      environment.sourceFile,
      `${prefix}_${environment.releaseSuffix}`,
      environment.kind,
    );
  }

  addAsset(
    records,
    seenNames,
    'rulebook-reader.pdf',
    `${prefix}_Rulebook.pdf`,
    'rulebook-reader',
    { pageFormat: 'half-letter', pageOrder: 'reading' },
  );

  for (const sheet of cardManifest.sheets || []) {
    addAsset(
      records,
      seenNames,
      sheet.faceFile,
      `${prefix}_Playable_Sheet_${String(sheet.sheetNumber).padStart(2, '0')}.png`,
      'playable-face-sheet',
      { sheetNumber: sheet.sheetNumber, deckId: sheet.deckId, numWidth: sheet.numWidth, numHeight: sheet.numHeight },
    );
  }

  for (const [faction, back] of Object.entries(cardManifest.backVariants || {})) {
    addAsset(
      records,
      seenNames,
      back.file,
      `${prefix}_Back_${safeSegment(faction)}.png`,
      'standard-back-variant',
      { faction },
    );
  }

  for (const sheet of territoryManifest.sheets || []) {
    if (sheet.backPolicy !== 'standardBack') {
      throw new Error(`Territory sheet ${sheet.sheetNumber} must use standardBack; found ${sheet.backPolicy || 'missing'}.`);
    }
    addAsset(
      records,
      seenNames,
      sheet.faceFile,
      `${prefix}_Territory_Sheet_${String(sheet.sheetNumber).padStart(2, '0')}.png`,
      'territory-face-sheet',
      { sheetNumber: sheet.sheetNumber, deckId: sheet.deckId, numWidth: sheet.numWidth, numHeight: sheet.numHeight },
    );
  }
  if (!territoryManifest.sheets?.length) throw new Error('Territory manifest contains no sheets to publish.');

  for (const leader of leaderManifest.leaders || []) {
    addAsset(
      records,
      seenNames,
      leader.tts?.faceFile,
      `${prefix}_Leader_${safeSegment(leader.faction)}_${safeSegment(leader.id)}.png`,
      'leader-face',
      { id: leader.id, name: leader.name, faction: leader.faction, cardId: leader.tts?.cardId, deckId: leader.tts?.deckId },
    );
  }

  const supplementalReverseSources = new Set();
  for (const component of supplementalManifest.ready || []) {
    if (component.representation === 'sliding-tracker') {
      if (!component.frontFile) {
        throw new Error(`Ready supplemental tracker ${component.id || 'missing id'} lacks a rendered tracker face.`);
      }
      addAsset(
        records,
        seenNames,
        component.frontFile,
        `${prefix}_Supplemental_${safeSegment(component.faction)}_${safeSegment(component.id)}_Tracker.png`,
        'supplemental-tracker-face',
        {
          id: component.id,
          name: component.name,
          faction: component.faction,
          family: component.family,
          assembly: component.tts?.assembly,
          layer: component.tts?.layer,
        },
      );
      continue;
    }

    if (component.representation !== 'card') {
      throw new Error(`Ready supplemental component ${component.id || 'missing id'} uses unsupported staged representation ${component.representation || 'missing'}.`);
    }
    if (!component.frontFile || !component.reverseFile) {
      throw new Error(`Ready supplemental component ${component.id || 'missing id'} lacks rendered front/reverse files.`);
    }
    addAsset(
      records,
      seenNames,
      component.frontFile,
      `${prefix}_Supplemental_${safeSegment(component.faction)}_${safeSegment(component.id)}_Front.png`,
      'supplemental-front',
      { id: component.id, name: component.name, faction: component.faction, family: component.family },
    );
    if (!supplementalReverseSources.has(component.reverseFile)) {
      supplementalReverseSources.add(component.reverseFile);
      addAsset(
        records,
        seenNames,
        component.reverseFile,
        `${prefix}_Supplemental_Reverse_${safeSegment(component.reverseFile)}.png`,
        'supplemental-reverse',
        { sourceArtwork: component.reverseArtwork || null },
      );
    }
  }

  const manifestFiles = [
    ['manifest.json', `${prefix}_Card_Manifest.json`, 'card-manifest'],
    ['territory-manifest.json', `${prefix}_Territory_Manifest.json`, 'territory-manifest'],
    ['leader-manifest.json', `${prefix}_Leader_Manifest.json`, 'leader-manifest'],
    ['starter-deck-manifest.json', `${prefix}_Starter_Deck_Manifest.json`, 'starter-deck-manifest'],
    ['supplemental-manifest.json', `${prefix}_Supplemental_Manifest.json`, 'supplemental-manifest'],
  ];
  for (const [sourceFile, releaseAsset, kind] of manifestFiles) {
    addAsset(records, seenNames, sourceFile, releaseAsset, kind);
  }

  await rm(STAGING_ROOT, { recursive: true, force: true });
  await mkdir(STAGING_ROOT, { recursive: true });

  const staged = [];
  for (const record of records) {
    if (!record.sourceFile) throw new Error(`TTS release asset ${record.releaseAsset} has no source file.`);
    const sourcePath = join(outputRoot, record.sourceFile);
    const info = await ensureFile(sourcePath);
    const targetPath = join(STAGING_ROOT, record.releaseAsset);
    await copyFile(sourcePath, targetPath);
    const digest = await sha256(sourcePath);
    staged.push({
      ...record,
      bytes: info.size,
      sha256: digest,
      url: contentVersionedUrl(
        releaseUrl(repository, release.version, record.releaseAsset),
        digest,
      ),
    });
  }

  const releaseManifestName = `${prefix}_Release_Assets.json`;
  const releaseManifest = {
    schemaVersion: 3,
    gameVersion: release.version,
    repository,
    releaseTag: release.version,
    releasePage: `https://github.com/${repository}/releases/tag/${release.version}`,
    sourceOutput: relative(ROOT, outputRoot).replaceAll('\\', '/'),
    publication: {
      host: 'github-release-assets',
      mutableAssetNames: true,
      cachePolicy: 'sha256-query',
      note: 'The publication workflow replaces only these deterministic TTS-named assets on the existing current GitHub Release. Generated TTS URLs append each asset SHA-256 prefix so TTS cannot reuse stale cached bytes after an in-place asset replacement. The release tag itself is not moved.',
    },
    backPolicy: starterManifest.backPolicy,
    supplemental: {
      readyCount: supplementalManifest.readyCount,
      pendingCount: supplementalManifest.pendingCount,
      assembly: supplementalManifest.placement.assembly,
      includedInReviewSaveAfterAssembly: true,
    },
    assetCount: staged.length,
    assets: staged,
    bySourceFile: Object.fromEntries(staged.map((asset) => [asset.sourceFile, asset.url])),
  };

  await writeFile(join(STAGING_ROOT, releaseManifestName), jsonText(releaseManifest));
  return { release, releaseManifest, releaseManifestName };
}

async function main() {
  const { release, releaseManifest, releaseManifestName } = await stageReleaseAssets();
  console.log(`Staged ${releaseManifest.assetCount} TTS network assets for ${release.version} in ${relative(ROOT, STAGING_ROOT)}.`);
  console.log(`Hosted URL manifest: ${releaseManifestName}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { STAGING_ROOT, contentVersionedUrl, stageReleaseAssets };
