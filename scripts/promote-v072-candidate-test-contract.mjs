import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(new URL('..', import.meta.url).pathname, 'tests/current-game-authority.test.ts');
let source = await readFile(path, 'utf8');

const replacements = [
  [
    "it('is a native, complete v0.7.1 release authority rather than a resolution manifest', () => {",
    "it('is a native, complete v0.7.2 candidate authority rather than a resolution manifest', () => {",
  ],
  ["expect(authority.version).toBe('v0.7.1');", "expect(authority.version).toBe('v0.7.2-candidate');"],
  ["expect(authority.displayVersion).toBe('v0.7.1');", "expect(authority.displayVersion).toBe('v0.7.2 Candidate');"],
  ["expect(authority.status).toBe('current-release');", "expect(authority.status).toBe('release-candidate');"],
  [
    "it('keeps the maintained Rulebook on the v0.7.1 release identity', () => {",
    "it('keeps the maintained Rulebook on the v0.7.2 candidate identity', () => {",
  ],
  ["expect(rulebook).toContain('**Version 0.7.1**');", "expect(rulebook).toContain('**Version 0.7.2 Candidate**');"],
  ["expect(rulebook).not.toContain('**Version 0.7.1 Candidate**');", "expect(rulebook).not.toContain('**Version 0.7.1**');"],
];

for (const [from, to] of replacements) {
  if (source.includes(from)) source = source.replace(from, to);
  assert.ok(source.includes(to), `Candidate test contract replacement missing: ${to}`);
}

const provenanceExpectation = [
  "    expect(authority.provenance.currentDevelopmentInputs.v072TimingAndCaptureCleanup)",
  "      .toBe('/docs/v0.7.2-timing-and-capture-cleanup.json');",
].join('\n');
const policyExpectation = "    expect(authority.runtimePolicy).toContain('complete current gameplay authority');";
if (!source.includes(provenanceExpectation)) {
  assert.ok(source.includes(policyExpectation));
  source = source.replace(policyExpectation, `${provenanceExpectation}\n${policyExpectation}`);
}

await writeFile(path, source.replace(/\r\n/g, '\n'));
console.log('Updated current-game authority regression contract for v0.7.2-candidate.');
