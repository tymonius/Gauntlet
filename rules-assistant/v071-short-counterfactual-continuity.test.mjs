import fs from 'node:fs';
import { expect, test } from 'vitest';
import { buildRulesCorpus, retrieveRules } from './local-search.js';
import { augmentRetrievalForContext, BEHAVIOR_REVISION, contextualQuery } from './worker-v071.js';
import { V071_CANONICAL_SOURCE_PATH, V071_RULEBOOK_SOURCE_PATH } from './v071-public-corpus.js';

const canonicalData = JSON.parse(fs.readFileSync(V071_CANONICAL_SOURCE_PATH, 'utf8'));
const rulebookMarkdown = fs.readFileSync(V071_RULEBOOK_SOURCE_PATH, 'utf8');
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown, siteOrigin: 'https://gauntlet.run' });
const openingQuestion = "I use Margin Loan's Battle effect, place a card beneath it as collateral, and then withdraw from the battle. What happens to Margin Loan and the collateral?";
const openingAnswer = 'If your withdrawal means you do not win the battle, in the Aftermath put Margin Loan and its collateral in your Graveyard. If you still win, return the collateral to your Hand.';
const history = [
  { role: 'user', content: openingQuestion },
  { role: 'assistant', content: openingAnswer, rulingStatus: 'explicit' }
];

function currentRetrieval(question, suppliedHistory) {
  const query = contextualQuery(question, suppliedHistory);
  let results = retrieveRules(corpus, query, { limit: 10, excerptLength: 1400 });
  return augmentRetrievalForContext(corpus, question, suppliedHistory, results);
}

test('short what-if follow-ups inherit the immediately preceding exchange', () => {
  const query = contextualQuery('What if I win instead?', history);
  expect(query).toContain(openingQuestion);
  expect(query).toContain(openingAnswer);
  expect(query).toContain('What if I win instead?');

  const results = currentRetrieval('What if I win instead?', history);
  expect(results[0]?.canonicalId).toBe('card:financiers-margin-loan');
  const marginLoan = results[0];
  expect(marginLoan.body).toContain('Gambit/Tactic: Before dice are rolled');
  expect(marginLoan.body).toContain('In the Aftermath: Win — return collateral to your Hand. Otherwise — Default.');
  expect(marginLoan.body).toContain('Action: Bank this card');
});

test('longer self-contained what-if questions do not automatically inherit unrelated history', () => {
  const question = 'What if a defender wins a battle during an opponent turn after resolving all battle effects?';
  expect(contextualQuery(question, history)).toBe(question);
});

test('short counterfactual continuity is part of the current behavior revision', () => {
  expect(BEHAVIOR_REVISION).toBe('v071-qa-20260910-4');
});
