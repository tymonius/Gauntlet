import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const app = readFileSync('rulebook/app.js', 'utf8');

describe('Browser Rulebook deep links', () => {
  test('replays the current fragment after asynchronous Rulebook rendering', () => {
    expect(app).toContain('function scrollToLocationHash()');
    expect(app).toContain("const rawHash = window.location.hash.replace(/^#/, '')");
    expect(app).toContain('document.getElementById(targetId)');
    expect(app).toContain("target.scrollIntoView({ block: 'start', behavior: 'auto' })");

    const renderEvent = "document.dispatchEvent(new CustomEvent('gauntlet:rulebook-rendered'";
    const renderIndex = app.indexOf(renderEvent);
    const replayIndex = app.indexOf('scrollToLocationHash();', renderIndex);
    expect(renderIndex).toBeGreaterThan(-1);
    expect(replayIndex).toBeGreaterThan(renderIndex);
  });

  test('replays fragments changed after the Rulebook is already loaded', () => {
    expect(app).toContain("window.addEventListener('hashchange', () => {");
    expect(app).toMatch(/window\.addEventListener\('hashchange',[\s\S]*scrollToLocationHash\(\);/);
  });
});
