import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { buildRulesCorpus, retrieveRules } from './local-search.js';
import { augmentRetrievalForContext, contextualQuery } from './worker-v071.js';
import { V071_CANONICAL_SOURCE_PATH, V071_RULEBOOK_SOURCE_PATH } from './v071-public-corpus.js';

const canonicalData = JSON.parse(fs.readFileSync(V071_CANONICAL_SOURCE_PATH, 'utf8'));
const rulebookMarkdown = fs.readFileSync(V071_RULEBOOK_SOURCE_PATH, 'utf8');
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown, siteOrigin: 'https://gauntlet.run' });

function sourcesFor(question) {
  const query = contextualQuery(question, []);
  const raw = retrieveRules(corpus, query, { limit: 10, excerptLength: 1800 });
  return augmentRetrievalForContext(corpus, question, [], raw);
}

const reviewedQuestion = "I am losing after the initial battle roll and have both Fate's Toll and Valor available as Battle effects. May I reroll with both effects one after the other?";

describe('v0.7.1 multi-effect ordering retrieval', () => {
  test('the reviewed Fate’s Toll + Valor question keeps both card authorities and adds Shared timing', () => {
    const sources = sourcesFor(reviewedQuestion);
    const topFive = sources.slice(0, 5).map((source) => source.canonicalId);
    expect(sources[0]?.canonicalId).toBe('card:mystics-fate-s-toll');
    expect(topFive).toContain('card:neutral-valor');
    expect(topFive).toContain('rulebook:shared-timing');

    const fate = sources.find((source) => source.canonicalId === 'card:mystics-fate-s-toll');
    const valor = sources.find((source) => source.canonicalId === 'card:neutral-valor');
    const timing = sources.find((source) => source.canonicalId === 'rulebook:shared-timing');
    expect(fate?.body).toContain('After you roll, you may put one other card from your Hand in your Graveyard to reroll.');
    expect(valor?.body).toContain("if your battle total is lower than the opponent's, you may reroll your battle die.");
    expect(timing?.body).toContain('Each player chooses the order of effects they control.');
  });

  test.each([
    'Can multiple effects resolve one after the other?',
    'If two effects happen at the same timing, how are they resolved?',
    'Several effects can apply sequentially; who chooses their order?'
  ])('multi-effect ordering paraphrase retrieves Shared timing: %s', (question) => {
    const ids = sourcesFor(question).slice(0, 5).map((source) => source.canonicalId);
    expect(ids).toContain('rulebook:shared-timing');
  });

  test('ordinary single-effect Valor questions are not hijacked by Shared timing', () => {
    const ids = sourcesFor('How does Valor work?').slice(0, 3).map((source) => source.canonicalId);
    expect(ids[0]).toBe('card:neutral-valor');
    expect(ids).not.toContain('rulebook:shared-timing');
  });
});
