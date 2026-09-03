import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listFaces } from '../../card-design/face-authority.mjs';
import { resolveAllFaceSpecs } from '../../card-design/face-spec.mjs';
import {
  expectedFaceIds,
  runtimeGameFromAuthority,
  validateFaceCatalogContract,
} from '../../scripts/card-authority/model.mjs';

const authority = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));

describe('canonical physical-face contract', () => {
  it('derives exactly one canonical face and production-ready FaceSpec for every authoritative physical face', () => {
    const summary = validateFaceCatalogContract(authority);
    const game = runtimeGameFromAuthority(authority);
    const faces = listFaces(game);
    const specs = resolveAllFaceSpecs(game);

    expect(summary.totalFaces).toBe(expectedFaceIds(authority).length);
    expect(summary.readyFaces).toBe(summary.totalFaces);
    expect(faces.map(face => face.id).sort()).toEqual([...expectedFaceIds(authority)].sort());
    expect(specs.every(spec => spec.readiness.productionReady)).toBe(true);
  });

  it('keeps every intrinsic reverse paired symmetrically with its front', () => {
    const faces = listFaces(runtimeGameFromAuthority(authority));
    const byId = new Map(faces.map(face => [face.id, face]));

    for (const face of faces.filter(face => face.pairedFaceId)) {
      expect(byId.get(face.pairedFaceId)?.pairedFaceId).toBe(face.id);
    }
  });

  it('keeps current-game provenance on every resolved FaceSpec', () => {
    const specs = resolveAllFaceSpecs(runtimeGameFromAuthority(authority));
    for (const spec of specs) {
      expect(spec.provenance).toMatchObject({
        gameplay: '/game-data/current-game.json',
        visual: '/game-data/current-game.json',
        version: authority.version,
        displayVersion: authority.displayVersion,
      });
    }
  });
});
