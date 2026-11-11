import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as canonical from '../tools/tts/tts-component-contract.mjs';
import * as compatibility from '../scripts/tts-component-contract.mjs';

describe('TTS component-contract tooling boundary', () => {
  it('preserves every original API export through the compatibility entrypoint', () => {
    expect(Object.keys(compatibility).sort()).toEqual(Object.keys(canonical).sort());
    for (const [name, value] of Object.entries(canonical)) {
      expect((compatibility as Record<string, unknown>)[name]).toBe(value);
    }
  });

  it('executes the same validator when invoked through either CLI path', () => {
    const options = { encoding: 'utf8' as const, timeout: 20000 };
    const canonicalOutput = execFileSync(process.execPath, ['tools/tts/tts-component-contract.mjs'], options);
    const compatibilityOutput = execFileSync(process.execPath, ['scripts/tts-component-contract.mjs'], options);
    expect(compatibilityOutput).toBe(canonicalOutput);
    expect(canonicalOutput).toContain('TTS component contract passed through');
  });

  it('keeps implementation out of the shim and watches the maintained source in TTS CI', () => {
    const shim = readFileSync('scripts/tts-component-contract.mjs', 'utf8');
    const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
    expect(shim).toContain("export * from '../tools/tts/tts-component-contract.mjs'");
    expect(shim).not.toContain('function validateTtsComponentContract');
    expect(workflow).toContain("'tools/tts/tts-component-contract.mjs'");
    expect(workflow).toContain('scripts/tts-component-contract.mjs|tools/tts/tts-component-contract.mjs');
  });
});
