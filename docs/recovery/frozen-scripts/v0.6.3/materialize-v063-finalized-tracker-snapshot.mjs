import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repository = process.env.GITHUB_REPOSITORY ?? 'tymonius/Gauntlet';
const commentId = process.env.V063_FINALIZED_TRACKER_COMMENT_ID ?? '5221286097';
const token = process.env.GITHUB_TOKEN ?? '';
const snapshotPath = 'artifacts/reconstruction/evidence/v0.6.3/issue-405-finalized-card-tracker.md';
const metadataPath = 'artifacts/reconstruction/evidence/v0.6.3/issue-405-finalized-card-tracker.json';

if (!token) throw new Error('GITHUB_TOKEN is required to materialize the one-time #405 evidence snapshot.');
if (fs.existsSync(snapshotPath) || fs.existsSync(metadataPath)) {
  throw new Error('Refusing to refresh committed #405 evidence. The snapshot is immutable once materialized.');
}

const response = await fetch(`https://api.github.com/repos/${repository}/issues/comments/${commentId}`, {
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
  },
});
if (!response.ok) throw new Error(`Unable to read #405 finalized-card tracker: HTTP ${response.status}.`);

const payload = await response.json();
const body = String(payload.body ?? '').replace(/\r\n/g, '\n').replace(/\s+$/g, '') + '\n';
if (!body.includes('# v0.6.3 bespoke pass — finalized card text')) {
  throw new Error('Unexpected #405 tracker body; refusing to freeze it.');
}
const sha256 = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
const metadata = {
  schema_version: 1,
  source_issue: 405,
  source_comment_id: Number(commentId),
  source_url: payload.html_url,
  created_at: payload.created_at,
  updated_at: payload.updated_at,
  captured_from_repository: repository,
  snapshot_path: snapshotPath,
  snapshot_sha256: sha256,
  role: 'Immutable reconstruction evidence. Final authority validation is offline and does not reread the live comment.',
};

fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
fs.writeFileSync(snapshotPath, body, 'utf8');
fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
console.log(`Materialized immutable #405 tracker snapshot ${sha256} (${body.split('\n').filter((line) => line.startsWith('## ')).length} card sections).`);
