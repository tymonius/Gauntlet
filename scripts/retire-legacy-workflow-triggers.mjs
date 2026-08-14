import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowsDir = path.join(root, '.github', 'workflows');
const targets = [
  'build-clean-v062-digital.yml',
  'build-clean-v062-faction-authority.yml',
  'build-clean-v062-rulebook.yml',
  'build-v063-canonical-data-candidate.yml',
  'build-v063-player-facing-candidates.yml',
  'build-v063-print-candidate.yml',
  'build-v063-release-candidate.yml',
  'certify-clean-v062-authority.yml',
  'deploy-v061-workers.yml',
  'finalize-v061-branch.yml',
  'generate-v061-release.yml',
  'package-v061-source.yml',
  'publish-v061-rulebook.yml',
  'publish-v062-print-package.yml',
  'render-v061-release-printables.yml',
  'sync-v061-deckbuilder.yml',
  'sync-v061-public-site.yml',
  'validate-release-reconstruction.yml',
  'validate-v061-rulebook-content.yml',
  'validate-v063-digital-candidate.yml',
  'validate-v063-rules-arbiter-candidate.yml',
];

function captureEventBlock(blockLines, eventName) {
  const start = blockLines.findIndex((line) => new RegExp(`^  ${eventName}\\s*:`).test(line));
  if (start < 0) return null;
  let end = blockLines.length;
  for (let i = start + 1; i < blockLines.length; i += 1) {
    if (/^  [A-Za-z0-9_-]+\s*:/.test(blockLines[i])) {
      end = i;
      break;
    }
  }
  return blockLines.slice(start, end);
}

function retireAutomaticEvents(source, file) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const onIndex = lines.findIndex((line) => /^on\s*:/.test(line));
  if (onIndex < 0) throw new Error(`${file}: no top-level on: block found`);

  let endIndex = lines.length;
  for (let i = onIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || /^\s+#/.test(line)) continue;
    if (/^[^\s]/.test(line)) {
      endIndex = i;
      break;
    }
  }

  const blockLines = lines.slice(onIndex + 1, endIndex);
  const dispatch = captureEventBlock(blockLines, 'workflow_dispatch') || ['  workflow_dispatch:'];
  const callable = captureEventBlock(blockLines, 'workflow_call');
  const replacement = ['on:', ...dispatch];
  if (callable) replacement.push(...callable);

  const next = [...lines.slice(0, onIndex), ...replacement, ...lines.slice(endIndex)].join('\n');
  return next.endsWith('\n') ? next : `${next}\n`;
}

let changed = 0;
for (const file of targets) {
  const target = path.join(workflowsDir, file);
  if (!fs.existsSync(target)) throw new Error(`Missing targeted workflow: ${file}`);
  const source = fs.readFileSync(target, 'utf8');
  const next = retireAutomaticEvents(source, file);
  if (next !== source.replace(/\r\n/g, '\n')) {
    fs.writeFileSync(target, next, 'utf8');
    changed += 1;
  }
}

console.log(`Retired automatic triggers from ${changed} of ${targets.length} historical/candidate workflows; manual/reusable entrypoints preserved.`);
