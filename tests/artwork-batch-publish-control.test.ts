import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const controller = readFileSync('card-design/artwork-batch-publish-control.js', 'utf8');
const recovery = readFileSync('card-design/artwork-publish-fetch-recovery.js', 'utf8');
const targets = readFileSync('card-design/artwork-compositor-targets.js', 'utf8');

describe('artwork batch publish controller', () => {
  it('does not rerender on every mutation inside the compositor dialog', () => {
    expect(controller).not.toContain("if (document.querySelector('.art-compositor-dialog') && currentPr) renderPanel();");
    expect(controller).toContain('for (const node of mutation.addedNodes)');
    expect(controller).toContain("node.matches('.art-compositor-dialog') || node.querySelector('.art-compositor-dialog')");
    expect(controller).toContain('requestAnimationFrame(renderPanel);');
  });

  it('loads publish recovery before the persistent batch controller', () => {
    expect(targets).toContain("artwork-publish-fetch-recovery.js?v=20260831-1");
    expect(targets).toContain("artwork-batch-publish-control.js?v=20260819-2");
    expect(targets.indexOf('artwork-publish-fetch-recovery.js')).toBeLessThan(
      targets.indexOf('artwork-batch-publish-control.js'),
    );
  });

  it('retries dropped publish requests and verifies GitHub before reporting failure', () => {
    expect(recovery).toContain('const RETRY_DELAYS_MS = [500, 1500, 3000, 5000, 8000];');
    expect(recovery).toContain('recoverPublishedPr');
    expect(recovery).toContain('lastPr = await publicPr(prNumber)');
    expect(recovery).toContain('after repeated retries');
    expect(recovery).toContain('pr?.merged === true || pr?.merged_at');
    expect(recovery).toContain('PR #${prNumber} is still open${mergeState}.');
  });
});
