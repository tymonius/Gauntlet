import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';

const root = process.cwd();
const oldBuild = 'scripts/build-clean-v063-rules-browser.mjs';
const newBuild = 'scripts/build-clean-v063-browser-rulebook.mjs';
const oldValidate = 'scripts/validate-clean-v063-rules-browser.mjs';
const newValidate = 'scripts/validate-clean-v063-browser-rulebook.mjs';
const oldOutput = 'artifacts/reconstruction/clean-v0.6.3/rules-browser';
const newOutput = 'artifacts/reconstruction/clean-v0.6.3/browser-rulebook';
const permanentWorkflow = '.github/workflows/build-clean-v063-browser-rulebook.yml';
const temporaryWorkflow = '.github/workflows/migrate-browser-rulebook-terminology.yml';
const self = 'scripts/migrate-browser-rulebook-terminology.mjs';

const abs = (relative) => path.join(root, relative);
const rename = (from, to) => {
  if (fs.existsSync(abs(to))) fs.rmSync(abs(to), { recursive: true, force: true });
  fs.renameSync(abs(from), abs(to));
};
const write = (relative, content) => fs.writeFileSync(abs(relative), content, 'utf8');
const textFiles = (directory) => {
  const out = [];
  for (const entry of fs.readdirSync(abs(directory), { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...textFiles(relative));
    else out.push(relative);
  }
  return out;
};

rename(oldBuild, newBuild);
rename(oldValidate, newValidate);
rename(oldOutput, newOutput);

const transformTargets = [
  newBuild,
  newValidate,
  'scripts/sync-google-analytics.mjs',
  ...textFiles(newOutput),
];

for (const relative of transformTargets) {
  let content = fs.readFileSync(abs(relative), 'utf8');
  content = content
    .replaceAll('rules-browser', 'browser-rulebook')
    .replaceAll('Rules Browser', 'Browser Rulebook')
    .replaceAll('Rulebook browser', 'Browser Rulebook');

  if (relative === newValidate) {
    content = content.replace("  'Official Browser Rulebook',\n", '');
    if (!content.includes("  'Browser Rulebook',\n")) {
      content = content.replace("  'Certified Markdown',\n", "  'Certified Markdown',\n  'Browser Rulebook',\n");
    }
  }
  write(relative, content);
}

const workflow = `name: Build clean v0.6.3 Browser Rulebook

on:
  push:
    branches:
      - 'agent/rebuild-clean-v063-*'
  pull_request:
    branches: [main]
    paths:
      - '.github/workflows/build-clean-v063-browser-rulebook.yml'
      - 'scripts/build-clean-v063-browser-rulebook.mjs'
      - 'scripts/validate-clean-v063-browser-rulebook.mjs'
      - 'artifacts/reconstruction/clean-v0.6.3/browser-rulebook/**'
      - 'artifacts/reconstruction/clean-v0.6.3/rulebook/**'
      - 'artifacts/reconstruction/clean-v0.6.3/certification/**'
      - 'artifacts/reconstruction/clean-v0.6.3/downstream/**'
      - 'config/release-lifecycle.json'
      - 'rulebook/app.js'
      - 'rulebook/markdown.js'
      - 'rulebook/styles.css'
      - 'rulebook/publication.css'
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: clean-v063-browser-rulebook-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  reconstruct:
    runs-on: ubuntu-latest
    steps:
      - name: Check out Browser Rulebook reconstruction inputs
        uses: actions/checkout@v4
        with:
          sparse-checkout-cone-mode: false
          sparse-checkout: |
            /.github/workflows/build-clean-v063-browser-rulebook.yml
            /scripts/build-clean-v063-browser-rulebook.mjs
            /scripts/validate-clean-v063-browser-rulebook.mjs
            /config/release-lifecycle.json
            /artifacts/reconstruction/clean-v0.6.3/certification/
            /artifacts/reconstruction/clean-v0.6.3/rulebook/
            /artifacts/reconstruction/clean-v0.6.3/downstream/
            /artifacts/reconstruction/clean-v0.6.3/browser-rulebook/
            /rulebook/app.js
            /rulebook/markdown.js
            /rulebook/styles.css
            /rulebook/publication.css

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Syntax-check Browser Rulebook scripts
        run: |
          node --check scripts/build-clean-v063-browser-rulebook.mjs
          node --check scripts/validate-clean-v063-browser-rulebook.mjs

      - name: Build clean v0.6.3 Browser Rulebook
        run: node scripts/build-clean-v063-browser-rulebook.mjs

      - name: Syntax-check generated Browser Rulebook JavaScript
        run: |
          node --check artifacts/reconstruction/clean-v0.6.3/browser-rulebook/app.js
          node --check artifacts/reconstruction/clean-v0.6.3/browser-rulebook/markdown.js

      - name: Validate clean v0.6.3 Browser Rulebook
        run: node scripts/validate-clean-v063-browser-rulebook.mjs

      - name: Reject whitespace errors
        run: git diff --check

      - name: Commit deterministic Browser Rulebook reconstruction
        if: github.event_name == 'push'
        run: |
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git add artifacts/reconstruction/clean-v0.6.3/browser-rulebook
          if git diff --cached --quiet; then
            echo 'Browser Rulebook reconstruction already materialized.'
          else
            git commit -m 'Materialize clean v0.6.3 Browser Rulebook'
            git push
          fi

      - name: Require committed Browser Rulebook outputs on pull requests
        if: github.event_name == 'pull_request'
        run: git diff --exit-code -- artifacts/reconstruction/clean-v0.6.3/browser-rulebook
`;
write(permanentWorkflow, workflow);

execFileSync(process.execPath, [newBuild], { stdio: 'inherit' });
execFileSync(process.execPath, [newValidate], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/sync-google-analytics.mjs', '--check'], { stdio: 'inherit' });

const persistentTargets = [newBuild, newValidate, permanentWorkflow, 'scripts/sync-google-analytics.mjs', ...textFiles(newOutput)];
for (const relative of persistentTargets) {
  const content = fs.readFileSync(abs(relative), 'utf8');
  if (content.includes('Rules Browser') || content.includes('rules-browser')) {
    throw new Error(`Retired Browser Rulebook corruption remains in ${relative}`);
  }
}

fs.rmSync(abs(temporaryWorkflow), { force: true });
fs.rmSync(abs(self), { force: true });
execSync('git diff --check', { stdio: 'inherit' });
console.log('Browser Rulebook terminology migration completed and validated.');
