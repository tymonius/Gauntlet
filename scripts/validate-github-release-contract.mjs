import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const fail = (message) => {
  throw new Error(`GitHub release contract: ${message}`);
};
const requireCondition = (condition, message) => {
  if (!condition) fail(message);
};

const contract = readJson('config/github-release-contract.json');
const lifecycle = readJson('config/release-lifecycle.json');

requireCondition(contract.schema_version === 1, 'schema_version must be 1.');
for (const [key, value] of Object.entries({
  published_release_requires_git_tag: contract.policy?.published_release_requires_git_tag,
  published_release_requires_github_release: contract.policy?.published_release_requires_github_release,
  release_tags_are_immutable: contract.policy?.release_tags_are_immutable,
})) {
  requireCondition(value === true, `policy.${key} must remain true.`);
}

const current = contract.current_release;
requireCondition(current && typeof current === 'object', 'current_release is required.');
requireCondition(current.tag === lifecycle.current_release, `current_release.tag (${current.tag}) must equal release-lifecycle current_release (${lifecycle.current_release}).`);
requireCondition(lifecycle.releases?.[current.tag]?.status === 'current', `${current.tag} must be current in release-lifecycle.json.`);
requireCondition(lifecycle.releases?.[current.tag]?.public_cutover === true, `${current.tag} must have public_cutover=true before GitHub publication.`);
requireCondition(current.status === 'current', 'current_release.status must be current.');
requireCondition(current.target_strategy === 'verified_main_push', 'current release must use verified_main_push so the tag is created only after deployed verification.');
requireCondition(current.prerelease === true, 'playtest releases must remain GitHub prereleases.');
requireCondition(/^v\d+\.\d+\.\d+$/.test(current.tag), `invalid current tag ${current.tag}.`);
requireCondition(typeof current.title === 'string' && current.title.trim(), 'current release title is required.');
requireCondition(typeof current.notes_file === 'string' && exists(current.notes_file), `current notes file is missing: ${current.notes_file}.`);
requireCondition(typeof current.live_verification_script === 'string' && current.live_verification_script.startsWith('scripts/') && exists(current.live_verification_script), `current live verifier is missing: ${current.live_verification_script}.`);
requireCondition(Array.isArray(current.assets) && current.assets.length > 0, 'current release must declare downloadable assets.');
for (const asset of current.assets) {
  requireCondition(typeof asset === 'string' && asset.startsWith('releases/'), `release asset must live under releases/: ${asset}.`);
  requireCondition(exists(asset), `declared current release asset is missing: ${asset}.`);
}

const historical = contract.historical_releases;
requireCondition(Array.isArray(historical) && historical.length > 0, 'historical_releases must be a non-empty array.');

const allTags = [current.tag];
for (const release of historical) {
  requireCondition(/^v\d+\.\d+\.\d+$/.test(release.tag), `invalid historical tag ${release.tag}.`);
  requireCondition(!allTags.includes(release.tag), `duplicate release tag ${release.tag}.`);
  allTags.push(release.tag);
  requireCondition(typeof release.title === 'string' && release.title.trim(), `${release.tag} title is required.`);
  requireCondition(['historical', 'withdrawn'].includes(release.status), `${release.tag} status must be historical or withdrawn.`);
  requireCondition(release.prerelease === true, `${release.tag} must remain a GitHub prerelease.`);
  requireCondition(/^[0-9a-f]{40}$/.test(release.target), `${release.tag} requires an immutable 40-character publication commit.`);
  requireCondition(typeof release.publish_if_missing === 'boolean', `${release.tag} publish_if_missing must be explicit.`);

  const lifecycleEntry = lifecycle.releases?.[release.tag];
  if (lifecycleEntry) {
    requireCondition(lifecycleEntry.status === release.status, `${release.tag} contract status ${release.status} must match lifecycle status ${lifecycleEntry.status}.`);
  }

  if (release.publish_if_missing) {
    requireCondition(/^\d{4}-\d{2}-\d{2}$/.test(release.original_publication_date || ''), `${release.tag} requires its original publication date.`);
    requireCondition(typeof release.notes_at_target === 'string' && release.notes_at_target.trim(), `${release.tag} requires notes_at_target.`);
    requireCondition(typeof release.backfill_notice === 'string' && release.backfill_notice.trim(), `${release.tag} requires an explicit backfill notice.`);
  }
}

for (const [version, state] of Object.entries(lifecycle.releases || {})) {
  if (version === current.tag) continue;
  const record = historical.find((release) => release.tag === version);
  requireCondition(record, `${version} is in release-lifecycle.json but absent from the GitHub release contract.`);
  requireCondition(record.status === state.status, `${version} lifecycle status is not represented accurately in the GitHub release contract.`);
}

for (const tag of ['v0.6.0', 'v0.6.1', 'v0.6.2']) {
  requireCondition(historical.some((release) => release.tag === tag), `missing required historical record ${tag}.`);
}

console.log(`GitHub release contract validated: ${historical.length} historical records and current ${current.tag}.`);
