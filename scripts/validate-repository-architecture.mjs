import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const architecturePath = path.join(root, 'docs', 'Repository_Architecture.md');
const contractPath = path.join(root, 'config', 'repository-architecture.json');
const source = fs.readFileSync(architecturePath, 'utf8').replace(/\r\n/g, '\n');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

const startMarker = '## Current path classification';
const endMarker = '## Target architecture';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker);

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Repository Architecture is missing a valid current-classification section.');
}
if (contract.schema_version !== 1) {
  throw new Error(`Unsupported repository architecture schema: ${contract.schema_version}.`);
}
if (!contract.root_directories || typeof contract.root_directories !== 'object' || Array.isArray(contract.root_directories)) {
  throw new Error('Repository architecture contract is missing root_directories.');
}

const allowedRoles = new Set(contract.allowed_roles || []);
const allowedTargetGroups = new Set(contract.allowed_target_groups || []);
const configured = Object.keys(contract.root_directories).sort();
const failures = [];

for (const directory of configured) {
  const entry = contract.root_directories[directory];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    failures.push(`${directory}: architecture entry must be an object.`);
    continue;
  }
  if (!allowedRoles.has(entry.role)) {
    failures.push(`${directory}: unknown architecture role ${JSON.stringify(entry.role)}.`);
  }
  if (!Array.isArray(entry.target_groups) || entry.target_groups.length === 0) {
    failures.push(`${directory}: target_groups must contain at least one architectural target.`);
  } else {
    const invalidTargets = entry.target_groups.filter(group => !allowedTargetGroups.has(group));
    if (invalidTargets.length) {
      failures.push(`${directory}: unknown target group(s): ${invalidTargets.join(', ')}.`);
    }
  }
  if (typeof entry.transitional !== 'boolean') {
    failures.push(`${directory}: transitional must be boolean.`);
  }
  if (typeof entry.note !== 'string' || entry.note.trim() === '') {
    failures.push(`${directory}: note must explain the current ownership/boundary.`);
  }
}

const ignoredRootDirectories = new Set(['.git', 'node_modules']);
const actual = fs.readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && !ignoredRootDirectories.has(entry.name))
  .map(entry => entry.name)
  .sort();

const missing = actual.filter(directory => !configured.includes(directory));
const stale = configured.filter(directory => !actual.includes(directory));

if (missing.length) {
  failures.push(
    `Unclassified top-level director${missing.length === 1 ? 'y' : 'ies'}: ${missing.join(', ')}. ` +
    'Add each root directory to config/repository-architecture.json in the same change.',
  );
}
if (stale.length) {
  failures.push(
    `Stale top-level architecture entr${stale.length === 1 ? 'y' : 'ies'}: ${stale.join(', ')}. ` +
    'Remove or update entries for root directories that no longer exist.',
  );
}

const classification = source.slice(start, end);
const documented = new Set(
  [...classification.matchAll(/\|\s+`([^`]+)\/`\s+\|/g)]
    .map(([, value]) => value)
    .filter(value => !value.includes('/')),
);
const undocumented = configured.filter(directory => !documented.has(directory));
const docStale = [...documented].filter(directory => !configured.includes(directory)).sort();

if (undocumented.length) {
  failures.push(
    `Machine-classified root director${undocumented.length === 1 ? 'y is' : 'ies are'} missing from docs/Repository_Architecture.md: ${undocumented.join(', ')}.`,
  );
}
if (docStale.length) {
  failures.push(
    `Documented top-level classification${docStale.length === 1 ? '' : 's'} missing from the machine contract: ${docStale.join(', ')}.`,
  );
}

const workflowsDir = path.join(root, '.github', 'workflows');
const workflowFiles = fs.readdirSync(workflowsDir)
  .filter(name => /\.ya?ml$/i.test(name))
  .sort();
const materializeWorkflows = workflowFiles.filter(name => name.startsWith('materialize-'));
const genericRefreshOwners = [];

for (const workflow of workflowFiles) {
  const workflowSource = fs.readFileSync(path.join(workflowsDir, workflow), 'utf8');
  if (/automation\/v[^\s/]+-release-package-refresh/.test(workflowSource)) {
    failures.push(
      `${workflow}: version-specific standing release-refresh branches are forbidden; ` +
      'historical releases must not regenerate standing PRs from current development.',
    );
  }
  if (materializeWorkflows.includes(workflow) && workflowSource.includes('automation/current-release-package-refresh')) {
    genericRefreshOwners.push(workflow);
  }
}

if (genericRefreshOwners.length !== 1 || genericRefreshOwners[0] !== 'materialize-current-release-package.yml') {
  failures.push(
    'Release refresh ownership must belong only to .github/workflows/materialize-current-release-package.yml.',
  );
}

const currentMaterializer = path.join(workflowsDir, 'materialize-current-release-package.yml');
if (!fs.existsSync(currentMaterializer)) {
  failures.push('Lifecycle-driven current release materialization workflow is missing.');
} else {
  const currentMaterializerSource = fs.readFileSync(currentMaterializer, 'utf8');
  if (!currentMaterializerSource.includes('scripts/render-current-rulebook-booklet.mjs --plan')) {
    failures.push('Current release materialization must select its release through the lifecycle-driven render plan.');
  }
}

if (failures.length) {
  throw new Error(`Repository architecture validation failed:\n- ${failures.join('\n- ')}`);
}

const transitional = configured.filter(directory => contract.root_directories[directory].transitional).length;
console.log(
  `Repository architecture contract passed: ${actual.length} top-level directories classified; ` +
  `${transitional} remain explicitly transitional toward the target architecture.`,
);
