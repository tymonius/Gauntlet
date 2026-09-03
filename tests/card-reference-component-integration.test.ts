import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync('card-reference/app.js', 'utf8');

describe('card reference production component integration', () => {
  it('passes the canonical Leader id to the FaceSpec renderer', () => {
    expect(app).toContain("const rendererId = `${faction}-${leader.id}`;");
    expect(app).toContain("buildFaceRendererUrl('leader', rendererId)");
    expect(app).toContain("../card-design/face-render.html?");
    expect(app).not.toContain("buildComponentRendererUrl('leader', rendererId)");
  });

  it('renders the Financiers Deed at its canonical landscape geometry', () => {
    expect(app).toContain("return component.family === 'deed-card' ? 'landscape' : 'portrait';");
    expect(app).toContain("if (orientation === 'landscape') params.set('orientation', 'landscape');");
    expect(app).toContain("frameUrl.searchParams.get('orientation') === 'landscape'");
  });
});
