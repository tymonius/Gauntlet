import fs from 'node:fs';

const args = process.argv.slice(2);
const separator = args.indexOf('--');
if (separator < 1 || separator === args.length - 1) {
  throw new Error('Usage: node scripts/commit-generated-files.mjs "Commit message" -- <path> [path ...]');
}

const message = args.slice(0, separator).join(' ');
const paths = args.slice(separator + 1);
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;

if (!repository || !token || !branch) {
  throw new Error('GITHUB_REPOSITORY, GITHUB_TOKEN, and branch context are required.');
}

async function api(path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`${options.method ?? 'GET'} ${path} failed: ${response.status} ${text}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

const entries = [];
for (const filePath of paths) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping absent generated file: ${filePath}`);
    continue;
  }
  const content = fs.readFileSync(filePath).toString('base64');
  const blob = await api('/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content, encoding: 'base64' })
  });
  entries.push({ path: filePath, mode: '100644', type: 'blob', sha: blob.sha });
}

if (!entries.length) {
  console.log('No generated files to commit.');
  process.exit(0);
}

for (let attempt = 1; attempt <= 5; attempt += 1) {
  const ref = await api(`/git/ref/heads/${encodeURIComponent(branch)}`);
  const parent = ref.object.sha;
  const parentCommit = await api(`/git/commits/${parent}`);
  const tree = await api('/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree: entries })
  });

  if (tree.sha === parentCommit.tree.sha) {
    console.log('Generated files are already current.');
    process.exit(0);
  }

  const commit = await api('/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [parent] })
  });

  try {
    await api(`/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: false })
    });
    console.log(`Committed generated files at ${commit.sha}.`);
    process.exit(0);
  } catch (error) {
    if (error.status !== 422 || attempt === 5) throw error;
    console.log(`Branch advanced during commit attempt ${attempt}; retrying.`);
  }
}
