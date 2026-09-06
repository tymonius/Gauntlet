import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config/github-release-contract.json'), 'utf8'));

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN;
const publishedSha = process.env.GITHUB_SHA;
const githubRef = process.env.GITHUB_REF;
if (!repo || !token || !publishedSha) {
  throw new Error('GITHUB_REPOSITORY, GH_TOKEN, and GITHUB_SHA are required.');
}
if (githubRef && githubRef !== 'refs/heads/main') {
  throw new Error(`GitHub releases may only be published from main; got ${githubRef}.`);
}

const run = (command, args, options = {}) => {
  const { allowFailure = false, ...spawnOptions } = options;
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    ...spawnOptions,
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout || ''}${result.stderr || ''}`);
  }
  return result;
};

run(process.execPath, ['scripts/validate-github-release-contract.mjs']);
run('git', ['fetch', 'origin', '--tags', '--force']);

const remoteMainHead = () => {
  const result = run('git', ['ls-remote', 'origin', 'refs/heads/main']);
  const [sha] = result.stdout.trim().split(/\s+/);
  if (!sha) throw new Error('Unable to resolve origin/main while evaluating release publication freshness.');
  return sha;
};

const tagTarget = (tag) => {
  const result = run('git', ['rev-list', '-n', '1', `refs/tags/${tag}`], { allowFailure: true });
  return result.status === 0 ? result.stdout.trim() : null;
};

const releaseView = (tag) => {
  const result = run('gh', ['release', 'view', tag, '--repo', repo, '--json', 'tagName,name,isPrerelease,assets,url'], { allowFailure: true });
  if (result.status !== 0) return null;
  return JSON.parse(result.stdout);
};

const verifyReleaseMetadata = (record, release) => {
  if (!release) throw new Error(`${record.tag} has no GitHub Release.`);
  if (release.tagName !== record.tag) throw new Error(`${record.tag} GitHub Release reports unexpected tag ${release.tagName}.`);
  if (release.name !== record.title) throw new Error(`${record.tag} GitHub Release title drifted: ${release.name}`);
  if (release.isPrerelease !== record.prerelease) throw new Error(`${record.tag} prerelease state drifted.`);
};

const markdownNotice = (notice) => notice
  .split(/\r?\n/)
  .map((line) => `> ${line}`)
  .join('\n');

const historicalNotesFile = (record) => {
  const original = run('git', ['show', `${record.target}:${record.notes_at_target}`]).stdout;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gauntlet-${record.tag.replaceAll('.', '-')}-`));
  const notes = path.join(dir, 'release-notes.md');
  fs.writeFileSync(notes, `${markdownNotice(record.backfill_notice)}\n\n---\n\n${original}`);
  return notes;
};

const createHistoricalRelease = (record, notesFile) => {
  const args = [
    'release', 'create', record.tag,
    '--repo', repo,
    '--target', record.target,
    '--title', record.title,
    '--notes-file', notesFile,
  ];
  if (record.prerelease) args.push('--prerelease');
  run('gh', args);
};

for (const record of contract.historical_releases) {
  const commitCheck = run('git', ['cat-file', '-e', `${record.target}^{commit}`], { allowFailure: true });
  if (commitCheck.status !== 0) throw new Error(`${record.tag} target commit is unavailable: ${record.target}`);

  let target = tagTarget(record.tag);
  let release = releaseView(record.tag);

  if (!target) {
    if (!record.publish_if_missing) {
      throw new Error(`${record.tag} is required by the release contract but the tag is missing.`);
    }
    const notesFile = historicalNotesFile(record);
    console.log(`Backfilling ${record.tag} at ${record.target}.`);
    createHistoricalRelease(record, notesFile);
    run('git', ['fetch', 'origin', '--tags', '--force']);
    target = tagTarget(record.tag);
    release = releaseView(record.tag);
  } else if (!release && record.publish_if_missing) {
    if (target !== record.target) {
      throw new Error(`${record.tag} exists at ${target}, expected immutable publication commit ${record.target}.`);
    }
    const notesFile = historicalNotesFile(record);
    console.log(`Backfilling missing GitHub Release for existing ${record.tag} tag.`);
    createHistoricalRelease(record, notesFile);
    release = releaseView(record.tag);
  }

  if (target !== record.target) {
    throw new Error(`${record.tag} tag target drifted: ${target}; expected ${record.target}. Tags are immutable by policy.`);
  }
  verifyReleaseMetadata(record, release);
  console.log(`${record.tag} Git tag and GitHub Release verified at ${target}.`);
}

const current = contract.current_release;
let currentTarget = tagTarget(current.tag);
let currentRelease = releaseView(current.tag);

const deferIfMainAdvanced = (phase) => {
  const latestMain = remoteMainHead();
  if (latestMain === publishedSha) return false;
  console.log(`Deferring ${current.tag} publication ${phase}: this workflow targets ${publishedSha}, but origin/main is now ${latestMain}. A newer main workflow will verify and publish the release.`);
  return true;
};

const verifyLive = () => {
  console.log(`Running deployed publication verification before creating or repairing ${current.tag}.`);
  const result = spawnSync(process.execPath, [current.live_verification_script], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PUBLISHED_SHA: publishedSha,
    },
  });
  if (result.status !== 0) {
    if (deferIfMainAdvanced('after live verification was superseded')) {
      process.stdout.write(result.stdout || '');
      process.stderr.write(result.stderr || '');
      return false;
    }
    throw new Error(`Live publication verification failed before ${current.tag} GitHub publication:\n${result.stdout || ''}${result.stderr || ''}`);
  }
  process.stdout.write(result.stdout || '');
  return true;
};

const createCurrentRelease = (target) => {
  const args = [
    'release', 'create', current.tag,
    '--repo', repo,
    '--target', target,
    '--title', current.title,
    '--notes-file', current.notes_file,
  ];
  if (current.prerelease) args.push('--prerelease');
  args.push(...current.assets);
  run('gh', args);
};

if (!currentTarget) {
  if (currentRelease) throw new Error(`${current.tag} has a GitHub Release but no Git tag.`);

  if (deferIfMainAdvanced('before live verification')) {
    process.exit(0);
  }

  if (!verifyLive()) {
    process.exit(0);
  }

  if (deferIfMainAdvanced('after live verification')) {
    process.exit(0);
  }

  console.log(`Publishing current ${current.tag} from verified main commit ${publishedSha}.`);
  createCurrentRelease(publishedSha);
  run('git', ['fetch', 'origin', '--tags', '--force']);
  currentTarget = tagTarget(current.tag);
  currentRelease = releaseView(current.tag);
} else {
  const ancestor = run('git', ['merge-base', '--is-ancestor', currentTarget, publishedSha], { allowFailure: true });
  if (ancestor.status !== 0) {
    throw new Error(`${current.tag} tag target ${currentTarget} is not an ancestor of current main ${publishedSha}.`);
  }
  if (!currentRelease) {
    if (!verifyLive()) {
      process.exit(0);
    }
    console.log(`Repairing missing GitHub Release for existing current tag ${current.tag}.`);
    createCurrentRelease(currentTarget);
    currentRelease = releaseView(current.tag);
  }
}

verifyReleaseMetadata(current, currentRelease);

const expectedAssets = new Map(current.assets.map((asset) => [path.basename(asset), asset]));
let uploadedNames = new Set((currentRelease.assets || []).map((asset) => asset.name));
for (const [name, assetPath] of expectedAssets) {
  if (uploadedNames.has(name)) continue;
  console.log(`Uploading missing ${current.tag} release asset ${name}.`);
  run('gh', ['release', 'upload', current.tag, '--repo', repo, assetPath]);
}
currentRelease = releaseView(current.tag);
uploadedNames = new Set((currentRelease.assets || []).map((asset) => asset.name));
for (const name of expectedAssets.keys()) {
  if (!uploadedNames.has(name)) throw new Error(`${current.tag} GitHub Release is missing required asset ${name}.`);
}

console.log(`${current.tag} Git tag and GitHub Release contract satisfied at ${currentTarget}.`);
