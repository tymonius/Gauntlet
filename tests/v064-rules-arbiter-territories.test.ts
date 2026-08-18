import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  V064_CANDIDATE_RULES_VERSION,
  V064_TERRITORY_SOURCE_PATH,
  applyV064TerritoryOverride,
  buildV064TerritoryDocuments,
  validateV064TerritorySource,
} from '../rules-assistant/v064-candidate-corpus.js';

const source = JSON.parse(readFileSync('docs/v0.6.4-territories.json', 'utf8'));

describe('v0.6.4 candidate Rules Arbiter Territory corpus', () => {
  it('accepts the approved issue #738 source', () => {
    expect(validateV064TerritorySource(source)).toBe(true);
  });

  it('creates one exact candidate document for every Territory and Arena', () => {
    const documents = buildV064TerritoryDocuments(
      source,
      'https://example.invalid/docs/v0.6.4-territories.json',
    );
    expect(documents).toHaveLength(25);
    expect(documents.filter((document) => document.kind === 'arena')).toHaveLength(4);

    for (const territory of source.territories) {
      const kind = territory.arena ? 'arena' : 'territory';
      const document = documents.find((candidate) => candidate.id === `${kind}:${territory.id}`);
      expect(document?.heading).toBe(territory.name);
      expect(document?.body).toBe(territory.text);
      expect(document?.sourcePath).toBe(V064_TERRITORY_SOURCE_PATH);
    }
  });

  it('replaces stale v0.6.3 Territory documents and structured Territory data only', () => {
    const baseCorpus = {
      version: 'v0.6.3',
      versionLabel: 'Gauntlet v0.6.3',
      published: true,
      currentPublicRelease: 'v0.6.3',
      data: {
        cards: [{ id: 'card-stays-put' }],
        territories: source.territories.map((territory: any) => ({
          id: territory.id,
          name: territory.name,
          text: `Old ${territory.name} text`,
          retainedMetadata: 'keep-me',
        })),
      },
      documents: [
        {
          id: 'territory:territory-high-ground',
          kind: 'territory',
          heading: 'High Ground',
          body: 'Old High Ground text.',
        },
        {
          id: 'arena:territory-arena-grand-melee',
          kind: 'arena',
          heading: 'Arena: Grand Melee',
          body: 'Old Grand Melee text.',
        },
        {
          id: 'rulebook:battle',
          kind: 'rulebook',
          heading: 'Battle',
          body: 'Unrelated v0.6.3 authority remains unchanged.',
        },
      ],
    };

    const result = applyV064TerritoryOverride(
      baseCorpus,
      source,
      'https://example.invalid/docs/v0.6.4-territories.json',
    );

    expect(result.version).toBe(V064_CANDIDATE_RULES_VERSION);
    expect(result.published).toBe(false);
    expect(result.currentPublicRelease).toBe('v0.6.3');
    expect(result.documents.find((document: any) => document.id === 'rulebook:battle')?.body)
      .toBe('Unrelated v0.6.3 authority remains unchanged.');
    expect(result.byId.get('territory:territory-high-ground')?.body)
      .toBe('During battles here, the defender gains Advantage.');
    expect(result.byId.get('arena:territory-arena-grand-melee')?.body)
      .toBe('During battles here, Defensive Edge does not apply. Each player: +1 Reserve, +1 Tactic.');
    expect(result.data.cards).toBe(baseCorpus.data.cards);
    expect(result.data.territories.find((territory: any) => territory.id === 'territory-high-ground')?.retainedMetadata)
      .toBe('keep-me');
    expect(result.data.territories.find((territory: any) => territory.id === 'territory-high-ground')?.text)
      .toBe('During battles here, the defender gains Advantage.');
  });
});
