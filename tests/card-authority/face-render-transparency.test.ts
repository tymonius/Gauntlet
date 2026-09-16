import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const FACE_RENDER = fileURLToPath(new URL('../../card-design/face-render.html', import.meta.url));

describe('canonical face render surface', () => {
  it('keeps the page surface transparent after shared card styles load', async () => {
    const html = await readFile(FACE_RENDER, 'utf8');

    expect(html).toMatch(
      /html,\s*body,\s*#renderTarget\s*\{[^}]*background:\s*transparent\s*!important;/s,
    );
  });
});
