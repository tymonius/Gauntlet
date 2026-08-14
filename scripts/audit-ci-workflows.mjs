import fs from 'node:fs';
import path from 'node:path';

const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
const outputPath = path.join(process.cwd(), 'artifacts', 'ci', 'workflow-audit.json');
const manualEvents = new Set(['workflow_dispatch', 'workflow_call']);

function parseEvents(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const onIndex = lines.findIndex((line) => /^on\s*:/.test(line));
  if (onIndex < 0) return [];
  const inline = lines[onIndex].replace(/^on\s*:\s*/, '').trim();
  if (inline) {
    if (inline.startsWith('[') && inline.endsWith(']')) {
      return inline.slice(1, -1).split(',').map((value) => value.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    }
    return [inline.replace(/^['"]|['"]$/g, '')];
  }

  const events = [];
  for (let i = onIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || /^\s+#/.test(line)) continue;
    if (/^[^\s]/.test(line)) break;
    const match = line.match(/^\s{2}([A-Za-z0-9_-]+)\s*:/);
    if (match) events.push(match[1]);
  }
  return [...new Set(events)];
}

const files = fs.readdirSync(workflowsDir)
  .filter((name) => /\.ya?ml$/i.test(name))
  .sort();

const workflows = files.map((name) => {
  const source = fs.readFileSync(path.join(workflowsDir, name), 'utf8');
  const events = parseEvents(source);
  const automaticEvents = events.filter((event) => !manualEvents.has(event));
  const manualOnly = events.length > 0 && automaticEvents.length === 0;
  const historicalName = /(?:v0?6[0-2]|v061|v062|pre[-_]?recovery|reconstruction|candidate|rollback|withdrawn)/i.test(name);
  return {
    file: name,
    events,
    automatic_events: automaticEvents,
    manual_only: manualOnly,
    historical_or_candidate_name: historicalName,
  };
});

const automatic = workflows.filter((item) => item.automatic_events.length > 0);
const manualOnly = workflows.filter((item) => item.manual_only);
const historicalAutomatic = automatic.filter((item) => item.historical_or_candidate_name);
const eventCounts = {};
for (const workflow of automatic) {
  for (const event of workflow.automatic_events) eventCounts[event] = (eventCounts[event] || 0) + 1;
}

const report = {
  generated_at: new Date().toISOString(),
  workflow_count: workflows.length,
  automatic_workflow_count: automatic.length,
  manual_only_workflow_count: manualOnly.length,
  historical_or_candidate_automatic_count: historicalAutomatic.length,
  automatic_event_counts: eventCounts,
  historical_or_candidate_automatic: historicalAutomatic,
  workflows,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const summary = [
  '# CI workflow inventory',
  '',
  `- Workflow files: **${report.workflow_count}**`,
  `- Automatic workflows: **${report.automatic_workflow_count}**`,
  `- Manual/reusable only: **${report.manual_only_workflow_count}**`,
  `- Automatic workflows with historical/candidate-looking names: **${report.historical_or_candidate_automatic_count}**`,
  '',
  '## Automatic event counts',
  '',
  ...Object.entries(eventCounts).sort().map(([event, count]) => `- ${event}: ${count}`),
  '',
  '## Historical/candidate automatic workflows',
  '',
  ...(historicalAutomatic.length
    ? historicalAutomatic.map((item) => `- \`${item.file}\` — ${item.automatic_events.join(', ')}`)
    : ['- None']),
  '',
].join('\n');

console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, 'utf8');
