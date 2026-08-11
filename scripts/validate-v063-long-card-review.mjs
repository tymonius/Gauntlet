import { readFileSync } from 'node:fs';

const productionCatalogPath = process.env.V063_PRODUCTION_CATALOG
  ?? 'artifacts/v0.6.3/production-render/catalog.json';
const reviewCatalogPath = process.env.V063_LONG_CARD_REVIEW_CATALOG
  ?? 'card-design/generated/v0.6.3/long-card-review-catalog.js';

const expectedIds = [
  'military-shock-and-awe',
  'financiers-margin-loan',
  'diplomats-trade-concessions',
  'intelligence-sleeper-network',
  'intelligence-fog-of-war',
  'diplomats-nonbinding-resolution',
  'military-reserve-force',
  'mystics-spirit-hollow',
  'diplomats-demilitarized-zone',
  'financiers-leveraged-buyout',
  'mystics-nature-s-altar',
  'military-field-command',
];

const production = JSON.parse(readFileSync(productionCatalogPath, 'utf8'));
const reviewSource = readFileSync(reviewCatalogPath, 'utf8');
const review = JSON.parse(reviewSource.slice(reviewSource.indexOf('{'), reviewSource.lastIndexOf('};') + 1));

if (production.gameVersion !== 'v0.6.3') {
  throw new Error(`Production catalog is ${production.gameVersion}, expected v0.6.3.`);
}
if (review.gameVersion !== 'v0.6.3') {
  throw new Error(`Review catalog is ${review.gameVersion}, expected v0.6.3.`);
}
if (JSON.stringify(review.reviewCardIds) !== JSON.stringify(expectedIds)) {
  throw new Error('Long-card review IDs or ordering do not match the approved 12-card review set.');
}

const productionById = new Map(production.playableCards.map((card) => [card.id, card]));
const expectedCards = expectedIds.map((id) => {
  const card = productionById.get(id);
  if (!card) throw new Error(`Production catalog is missing review card ${id}.`);
  return card;
});

if (JSON.stringify(review.playableCards) !== JSON.stringify(expectedCards)) {
  throw new Error('Tracked long-card review catalog is stale relative to the current v0.6.3 production catalog.');
}

console.log(`Validated ${expectedCards.length} long-card review renders against the current v0.6.3 production catalog.`);
