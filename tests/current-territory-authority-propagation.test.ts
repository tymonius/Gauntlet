import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const historical = JSON.parse(readFileSync('docs/v0.6.4-territories.json', 'utf8'));
const reference = readFileSync('docs/v0.6.4-territory-reference.md', 'utf8');
const faceSpec = readFileSync('card-design/face-spec.mjs', 'utf8');
const territoryTemplate = readFileSync('card-design/face-templates/territory.mjs', 'utf8');
const faceRuntime = readFileSync('card-design/face-render.mjs', 'utf8');
const legacyTerritoryRoute = readFileSync('card-design/territory-review-render.html', 'utf8');
const specimen = readFileSync('card-design/territories/index.html', 'utf8');
const currentAuthority = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));

describe('historical v0.6.4 Territory derivation and current authority propagation', () => {
  it('keeps the accepted v0.6.4 Territory document only as derivation provenance', () => {
    expect(currentAuthority.authority).toBe('current-game');
    expect(currentAuthority.provenance.historicalInputs.territories).toBe('/docs/v0.6.4-territories.json');
    expect(currentAuthority.gameplay.territories).toEqual(historical.territories);
    expect(currentAuthority).not.toHaveProperty('sources');
  });

  it('binds Territory faces to current-game authority through FaceSpec only', () => {
    expect(faceSpec).toContain("(game.territories || []).find(item => item.id === id)");
    expect(faceSpec).toContain("return { type: 'territory', territory: clone(territory) }");
    expect(faceSpec).toContain("composition: artDirectionSpec(game, territory.id)");
    expect(territoryTemplate).toContain("const territory = spec.content.territory;");
    expect(faceRuntime).toContain("document.body.dataset.gameplayAuthority = spec.provenance.gameplay");
    expect(faceRuntime).toContain("document.body.dataset.visualAuthority = spec.provenance.visual");
    expect(faceSpec).not.toContain('v0.6.4-territories.json');
    expect(faceSpec).not.toContain('Gauntlet_v0.6.3_Canonical_Data.json');

    expect(legacyTerritoryRoute).toContain('data-legacy-face-route="territory"');
    expect(legacyTerritoryRoute).toContain('/card-design/legacy-face-redirect.mjs');
  });

  it('preserves the accepted High Ground wording in the flattened authority and specimen', () => {
    const highGround = currentAuthority.gameplay.territories.find((territory: any) => territory.id === 'territory-high-ground');
    expect(highGround).toBeDefined();
    expect(highGround.text).toBe(historical.territories.find((territory: any) => territory.id === 'territory-high-ground').text);
    expect(specimen).toContain(highGround.text);
    expect(specimen).not.toContain('The defending player in a battle on High Ground gains advantage.');
  });

  it('keeps the historical reference synchronized as provenance documentation', () => {
    for (const territory of historical.territories) {
      expect(reference).toContain(`### ${territory.number}. ${territory.name}`);
      for (const line of territory.text.split('\n')) expect(reference).toContain(`> ${line}`);
    }
    expect(reference).toContain('Shared battle rules already require a Tiebreak Roll');
  });


});
