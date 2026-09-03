import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync('card-reference/app.js', 'utf8');
const styles = readFileSync('card-reference/styles.css', 'utf8');

describe('card reference production component integration', () => {
  it('passes the canonical Leader specimen id to the shared component renderer', () => {
    expect(app).toContain("const rendererId = `${faction}-${slugify(leader.name)}`;");
    expect(app).toContain("buildComponentRendererUrl('leader', rendererId)");
    expect(app).not.toContain("buildComponentRendererUrl('leader', leader.id)");
  });

  it('renders the Financiers Deed at its canonical landscape geometry', () => {
    expect(app).toContain("return component.family === 'deed-card' ? 'landscape' : 'portrait';");
    expect(app).toContain("if (orientation === 'landscape') params.set('orientation', 'landscape');");
    expect(app).toContain("frameUrl.searchParams.get('orientation') === 'landscape'");
  });

  it('stacks sidebar metrics so labels never determine the sidebar width', () => {
    expect(styles).toContain('grid-template-columns: 3.2rem minmax(0, 1fr);');
    expect(styles).toContain('.reference-metrics div:first-child');
    expect(styles).toContain('word-break: normal;');
  });
});
