import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  normalizeArtDirection,
  parseArtDirectionSource,
  serializeArtDirectionMap,
} from '../scripts/art-direction-overrides.mjs';

const cropSource = readFileSync('tools/card-design/artwork-authoring/artwork-crop.js', 'utf8');
const compositor = readFileSync('tools/card-design/artwork-authoring/artwork-compositor.js', 'utf8');
const faceRender = readFileSync('card-design/face-render.mjs', 'utf8');
const faceRenderHtml = readFileSync('card-design/face-render.html', 'utf8');
const productionPrintSource = readFileSync('apps/deckbuilder/production-print.js', 'utf8');
const deckbuilderEntry = readFileSync('apps/deckbuilder/index.html', 'utf8');
const faceSpec = readFileSync('card-design/face-spec.mjs', 'utf8');
const indexHtml = readFileSync('tools/card-design/review/index.html', 'utf8');
const cardReferenceHtml = readFileSync('apps/card-reference/index.html', 'utf8');
const deckbuilderHtml = readFileSync('apps/deckbuilder/index.html', 'utf8');
const targets = readFileSync('tools/card-design/artwork-authoring/artwork-compositor-targets.js', 'utf8');
const worker = readFileSync('workers/artwork-authoring/src/format.js', 'utf8');

type MockNode = {
  tagName: string;
  id: string;
  style: Record<string, string>;
  attrs: Record<string, string>;
  children: MockNode[];
  appendChild(node: MockNode): void;
  setAttribute(name: string, value: string): void;
  querySelectorAll(selector: string): MockNode[];
};

function makeNode(tagName: string): MockNode {
  return {
    tagName,
    id: '',
    style: {},
    attrs: {},
    children: [],
    appendChild(node) { this.children.push(node); },
    setAttribute(name, value) { this.attrs[name] = value; },
    querySelectorAll(selector) {
      const wanted = selector.split(',').map(s => s.trim());
      const results: MockNode[] = [];
      const visit = (node: MockNode) => {
        for (const child of node.children) {
          if (wanted.includes(child.tagName)) results.push(child);
          visit(child);
        }
      };
      visit(this);
      return results;
    },
  };
}

function fixture() {
  const nodes: MockNode[] = [];
  const body = makeNode('body');
  const doc = {
    body,
    createElementNS(_ns: string, tag: string) {
      const node = makeNode(tag);
      nodes.push(node);
      return node;
    },
    getElementById(id: string) {
      return nodes.find(node => node.id === id) || null;
    },
  };
  const window = { GAUNTLET_ART_DIRECTION: {} as Record<string, unknown> } as Record<string, any>;
  vm.runInNewContext(cropSource, { document: doc, window, console });
  const frame = {
    clientWidth: 260,
    clientHeight: 190,
    classList: { contains: (name: string) => name === 'card-art' },
  };
  const image = {
    naturalWidth: 400,
    naturalHeight: 300,
    style: {} as Record<string, string>,
    dataset: {} as Record<string, string>,
    ownerDocument: doc,
    closest: () => frame,
  };
  return { crop: window.GauntletArtworkCrop, image, nodes };
}

describe('canonical artwork tonal compositor', () => {
  it('retains tonal corrections through canonical source roundtrip', () => {
    const direction = {
      fit: 'cover', focusX: 0.5, focusY: 0.45, smart: false, zoom: 1,
      brightness: 112, shadows: 40, contrast: 104, saturation: 105,
    };
    expect(normalizeArtDirection(direction)).toEqual(direction);
    const text = serializeArtDirectionMap({ 'sample-artwork': direction });
    expect(parseArtDirectionSource(text)['sample-artwork']).toEqual(direction);
    for (const field of ['brightness', 'shadows', 'contrast', 'saturation']) {
      expect(worker).toContain(field);
      expect(compositor).toContain(`data-tone-range="${field}"`);
    }
  });

  it('clamps tonal input and omits untouched defaults', () => {
    expect(normalizeArtDirection({
      brightness: 100, shadows: 0, contrast: 100, saturation: 100,
    })).toEqual({});
    expect(normalizeArtDirection({
      brightness: 400, shadows: -5, contrast: 10, saturation: 300,
    })).toEqual({ brightness: 150, contrast: 70, saturation: 150 });
    expect(() => normalizeArtDirection({ shadows: 'not-a-number' })).toThrow('Invalid artwork shadows');
  });

  it('applies neutral, global and shadow-only corrections to the artwork image', () => {
    const { crop, image, nodes } = fixture();
    crop.apply(image, { focusX: 0.5, focusY: 0.5, smart: false });
    expect(image.style.filter).toBe('');

    crop.apply(image, {
      focusX: 0.5, focusY: 0.5, smart: false,
      brightness: 112, shadows: 50, contrast: 106, saturation: 103,
    });
    expect(image.style.filter).toContain('url("#gauntlet-art-tone-');
    expect(image.style.filter).toContain('brightness(1.120)');
    expect(image.style.filter).toContain('contrast(1.060)');
    expect(image.style.filter).toContain('saturate(1.030)');
    expect(image.dataset.artShadows).toBe('50');

    const funcs = nodes.filter(node => node.tagName === 'feFuncR');
    expect(funcs).toHaveLength(1);
    const values = funcs[0].attrs.tableValues.split(' ').map(Number);
    expect(values).toHaveLength(33);
    expect(values[0]).toBeGreaterThan(0);
    expect(values[4]).toBeGreaterThan(4 / 32);
    expect(values[32]).toBe(1);

    // A subsequent neutral edit removes the treatment from the same image.
    crop.apply(image, { focusX: 0.5, focusY: 0.5, smart: false });
    expect(image.style.filter).toBe('');
    expect(image.dataset.artShadows).toBe('0');
  });

  it('uses the shared rendered-face path for printing, and keeps before/after preview non-destructive', () => {
    expect(faceRender).toContain('window.GauntletArtworkCrop.apply');
    expect(faceRender).toContain("loadClassicScript('/card-design/artwork-crop.js?v=20261113-1'");
    expect(faceRenderHtml).toContain('face-render.mjs?v=20261113-tone-1');
    expect(productionPrintSource).toContain('&renderRevision=20261113-tone-1');
    expect(deckbuilderEntry).toContain('production-print.js?v=20261113-tone-1');
    expect(faceRender).toContain('artwork.composition.direction');
    expect(faceSpec).toContain('composition: artDirectionSpec(game, card.id)');
    expect(indexHtml).toContain('artwork-crop.js?v=20261113-1');
    expect(indexHtml).toContain('artwork-compositor.js?v=20261113-1');
    expect(indexHtml).toContain('artwork-compositor-targets.js');
    expect(cardReferenceHtml).not.toContain('artwork-compositor.js');
    expect(cardReferenceHtml).not.toContain('artwork-compositor-targets.js');
    expect(deckbuilderHtml).not.toContain('artwork-compositor.js');
    expect(deckbuilderHtml).not.toContain('artwork-compositor-targets.js');
    expect(compositor).not.toContain("target.sourceElement.closest('.reference-preview.rendered-preview')");
    expect(targets).toContain("artwork-authoring-client.js?v=20260902-2");
    expect(compositor).toContain("document.addEventListener('load', event => {");
    expect(compositor).toContain('function toneFromControls()');
    expect(compositor).toContain('...toneFromControls()');
    expect(compositor).toContain('showOriginalTone');
    expect(compositor).toContain('function resolveExplicitDirection()');
    expect(compositor).toContain('direction = resolveExplicitDirection()');
    expect(compositor).toContain('body: JSON.stringify({ id: state.id, direction })');
  });
});
