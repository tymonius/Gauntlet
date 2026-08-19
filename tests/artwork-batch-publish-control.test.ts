import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const controller = readFileSync('card-design/artwork-batch-publish-control.js', 'utf8');
const targets = readFileSync('card-design/artwork-compositor-targets.js', 'utf8');

describe('artwork batch publish controller', () => {
  it('does not rerender on every mutation inside the compositor dialog', () => {
    expect(controller).not.toContain("if (document.querySelector('.art-compositor-dialog') && currentPr) renderPanel();");
    expect(controller).toContain('for (const node of mutation.addedNodes)');
    expect(controller).toContain("node.matches('.art-compositor-dialog') || node.querySelector('.art-compositor-dialog')");
    expect(controller).toContain('requestAnimationFrame(renderPanel);');
  });

  it('cache-busts the fixed controller', () => {
    expect(targets).toContain("artwork-batch-publish-control.js?v=20260819-2");
    expect(targets).not.toContain("artwork-batch-publish-control.js?v=20260819-1");
  });
});
