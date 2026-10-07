import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const boundary = JSON.parse(read('config/publication-boundary.json'));
const materialized = new Map(
  boundary.materializedFiles.map((entry: { publicPath: string; source: string }) => [entry.publicPath, entry.source]),
);

const widgetFiles = [
  'widget.js',
  'widget.css',
  'feedback.css',
  'answer-presentation.js',
  'answer-presentation.css',
  'widget-mobile.css',
];

describe('Rules Assistant public/source boundary', () => {
  it('keeps the mixed backend root source-only instead of publishing it wholesale', () => {
    expect(boundary.pages.publishedDirectories).not.toContain('rules-assistant');
    expect(boundary.pages.sourceOnlyRepositoryRoots).toContain('rules-assistant');
  });

  it('materializes only the deliberate browser widget contract at stable URLs', () => {
    for (const file of widgetFiles) {
      expect(materialized.get(`/rules-assistant/${file}`)).toBe(`apps/rules-assistant-widget/${file}`);
      expect(existsSync(`apps/rules-assistant-widget/${file}`)).toBe(true);
      expect(existsSync(`rules-assistant/${file}`)).toBe(false);
    }
    expect(materialized.get('/rules-assistant/local-search.js')).toBe('rules-assistant/local-search.js');
    expect(materialized.get('/rules-assistant/v072-release-corpus.js')).toBe('rules-assistant/v072-release-corpus.js');
  });

  it('makes the widget depend on stable deployed shared-module URLs', () => {
    const widget = read('apps/rules-assistant-widget/widget.js');
    expect(widget).toContain('from "/rules-assistant/local-search.js"');
    expect(widget).toContain('from "/rules-assistant/v072-release-corpus.js"');
    expect(widget).toContain('from "./answer-presentation.js"');
  });

  it('routes widget changes through Pages and current-publication checks', () => {
    const pages = read('.github/workflows/deploy-pages.yml');
    const gate = read('.github/workflows/pr-quality-gate.yml');
    const live = read('.github/workflows/verify-current-live-publication.yml');

    expect(pages).toContain("'apps/rules-assistant-widget/**'");
    expect(pages).toContain("'rules-assistant/local-search.js'");
    expect(pages).toContain("'rules-assistant/v072-release-corpus.js'");
    expect(gate).toContain("under('apps/rules-assistant-widget/')");
    expect(gate).toContain("exact('config/publication-boundary.json')");
    expect(live).toContain("'apps/rules-arbiter/**'");
    expect(live).toContain("'apps/rules-assistant-widget/**'");
    expect(live).not.toContain("'rules-arbiter/**'");
  });
});
