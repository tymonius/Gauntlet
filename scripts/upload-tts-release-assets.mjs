import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function gh(args) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function releaseAssets(repo, releaseId) {
  // --paginate is required: the v0.7.2 release already has over 100 assets.
  const output = gh([
    'api', '--paginate',
    '/repos/' + repo + '/releases/' + releaseId + '/assets?per_page=100',
    '--jq', '.[] | [.name, .id, (.digest // "")] | @tsv',
  ]);
  const result = new Map();
  for (const line of output.split('\n').filter(Boolean)) {
    const [name, id, digest] = line.split('\t');
    if (result.has(name)) throw new Error('Duplicate hosted asset name: ' + name);
    result.set(name, { id, digest });
  }
  return result;
}

export function decideAssetAction(local, hosted) {
  if (!hosted) return 'upload';
  return hosted.digest === 'sha256:' + local.sha256 ? 'skip' : 'replace';
}

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function assertLocalAsset(asset) {
  const info = await stat(asset.path);
  if (!info.isFile()) throw new Error('TTS asset is not a file: ' + asset.path);
  if (asset.bytes !== undefined && info.size !== asset.bytes) {
    throw new Error('Staged TTS asset size differs from manifest: ' + asset.name);
  }
  const digest = await sha256(asset.path);
  if (digest !== asset.sha256) {
    throw new Error('Staged TTS asset digest differs from manifest: ' + asset.name);
  }
}

async function uploadOne(repo, tag, releaseId, asset, hosted) {
  const action = decideAssetAction(asset, hosted);
  if (action === 'skip') return action;

  if (action === 'replace') {
    if (!/^\d+$/.test(String(hosted.id))) throw new Error('Invalid existing asset ID: ' + asset.name);
    gh(['api', '-X', 'DELETE', '/repos/' + repo + '/releases/assets/' + hosted.id]);
  }

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      gh(['release', 'upload', tag, '--repo', repo, asset.path]);
      return action;
    } catch (error) {
      const message = String(error.stderr || error.message || error);
      if (!/HTTP 422[\s\S]*ReleaseAsset\.name already exists/i.test(message)) throw error;

      // GitHub may still reserve a just-deleted name for a short interval.
      // Never delete a different asset created by another publisher.
      const current = releaseAssets(repo, releaseId).get(asset.name);
      if (current?.digest === 'sha256:' + asset.sha256) return action;
      if (current && current.id !== hosted?.id) {
        throw new Error('Concurrent publication changed hosted asset: ' + asset.name);
      }
      if (attempt === 8) throw new Error('GitHub did not release the asset name: ' + asset.name);
      await sleep(1500 * attempt);
    }
  }
  throw new Error('Upload retry limit reached: ' + asset.name);
}

async function confirmPublished(repo, releaseId, assets) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const hosted = releaseAssets(repo, releaseId);
    const mismatches = assets.filter(asset =>
      hosted.get(asset.name)?.digest !== 'sha256:' + asset.sha256);
    if (!mismatches.length) return;
    if (attempt === 6) {
      throw new Error('Hosted TTS asset digests do not match: ' + mismatches.map(a => a.name).join(', '));
    }
    await sleep(1500 * attempt);
  }
}

async function main() {
  const [manifestPath, flag, modPath] = process.argv.slice(2);
  if (!manifestPath || (flag && flag !== '--mod-save') || (flag === '--mod-save' && !modPath)) {
    throw new Error('Usage: node scripts/upload-tts-release-assets.mjs <manifest> [--mod-save <approved-save>]');
  }
  if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN is required for TTS release publication.');

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const repo = String(manifest.repository || '');
  const tag = String(manifest.releaseTag || '');
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo) || repo !== process.env.GITHUB_REPOSITORY || !/^v\d+\.\d+\.\d+$/.test(tag)) {
    throw new Error('TTS release publication repository/tag mismatch.');
  }
  const releaseId = gh(['api', '/repos/' + repo + '/releases/tags/' + tag, '--jq', '.id']);
  if (!/^\d+$/.test(releaseId)) throw new Error('Published GitHub release not found: ' + tag);

  let assets;
  if (flag === '--mod-save') {
    if (basename(modPath) !== 'Gauntlet_' + tag + '_TTS_Mod.json') {
      throw new Error('Approved TTS mod filename does not match the release tag.');
    }
    const save = JSON.parse(await readFile(modPath, 'utf8'));
    if (save.SaveName !== 'Gauntlet ' + tag || /review scaffold/i.test(String(save.Note || ''))) {
      throw new Error('Approved TTS mod save still has a review-scaffold identity.');
    }
    assets = [{ name: basename(modPath), path: modPath, sha256: await sha256(modPath) }];
  } else {
    if (!Array.isArray(manifest.assets) || manifest.assetCount !== manifest.assets.length || !manifest.assets.length) {
      throw new Error('Staged TTS release manifest is missing its complete asset inventory.');
    }
    assets = manifest.assets.map(asset => ({
      name: asset.releaseAsset,
      path: join(dirname(manifestPath), asset.releaseAsset),
      sha256: asset.sha256,
      bytes: asset.bytes,
    }));
    assets.push({ name: basename(manifestPath), path: manifestPath, sha256: await sha256(manifestPath) });
  }
  if (new Set(assets.map(asset => asset.name)).size !== assets.length) {
    throw new Error('TTS release asset names are not unique.');
  }

  // Verify *every* local file before replacing any existing release asset.
  for (const asset of assets) await assertLocalAsset(asset);

  const existing = releaseAssets(repo, releaseId);
  const counts = { skip: 0, upload: 0, replace: 0 };
  for (const asset of assets) {
    const action = await uploadOne(repo, tag, releaseId, asset, existing.get(asset.name));
    counts[action] += 1;
  }
  await confirmPublished(repo, releaseId, assets);
  console.log('Verified ' + assets.length + ' TTS release asset digests on ' + tag
    + ' (unchanged=' + counts.skip + ', new=' + counts.upload + ', replaced=' + counts.replace + ').');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
