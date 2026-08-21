import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('card-design/artwork-compositor-targets.js', 'utf8');

describe('artwork compositor launch behavior', () => {
  it('locks the catalog viewport before the compositor dialog opens', () => {
    expect(source).toContain("this.classList.contains('art-compositor-dialog')");
    expect(source).toContain('lockViewport();');
    expect(source).toContain('nativeShowModal.apply(this, args)');
  });

  it('automatically retries a launch that races card rendering', () => {
    expect(source).toContain('openingRetries');
    expect(source).toContain('opener.click();');
    expect(source).toContain('dialog?.open');
  });
});
