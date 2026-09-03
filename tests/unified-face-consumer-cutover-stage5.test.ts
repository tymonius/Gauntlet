import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cardReview = readFileSync('card-design/card-review.js', 'utf8');
const supplementals = readFileSync('card-design/supplemental-card.js', 'utf8');
const proposals = readFileSync('card-design/proposal-card.js', 'utf8');
const rites = readFileSync('card-design/rite-card.js', 'utf8');
const cardReference = readFileSync('card-reference/app.js', 'utf8');
const deckbuilderPrint = readFileSync('deckbuilder/production-print.js', 'utf8');
const deckbuilderCards = readFileSync('deckbuilder/rendered-card-preview.js', 'utf8');
const deckbuilderTerritories = readFileSync('deckbuilder/territories.js', 'utf8');
const deckbuilderRuntime = readFileSync('deckbuilder/current-runtime.js', 'utf8');
const currentGameRuntime = readFileSync('game-data/current-game.mjs', 'utf8');
const ttsCards = readFileSync('scripts/generate-tts-card-assets.mjs', 'utf8');
const ttsLeaders = readFileSync('scripts/generate-tts-leader-assets.mjs', 'utf8');
const ttsTerritories = readFileSync('scripts/generate-tts-territory-assets.mjs', 'utf8');
const ttsSupplementals = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const ttsFinalized = readFileSync('scripts/generate-tts-finalized-supplementals.mjs', 'utf8');
const ttsTrackers = readFileSync('scripts/tts-sliding-trackers.mjs', 'utf8');
const faceRuntime = readFileSync('card-design/face-render.mjs', 'utf8');

const liveConsumers = [
  cardReview,
  supplementals,
  proposals,
  rites,
  cardReference,
  deckbuilderPrint,
  deckbuilderCards,
  deckbuilderTerritories,
  ttsCards,
  ttsLeaders,
  ttsTerritories,
  ttsSupplementals,
  ttsFinalized,
  ttsTrackers,
];

describe('Stage 5 atomic face consumer cutover', () => {
  it('routes every live physical-face consumer through face-render.html', () => {
    for (const consumer of liveConsumers) {
      expect(consumer).toContain('face-render.html');
      expect(consumer).not.toContain('card-review-render.html');
      expect(consumer).not.toContain('territory-review-render.html');
      expect(consumer).not.toContain('card-back-render.html');
    }

    for (const consumer of [
      cardReview,
      supplementals,
      proposals,
      rites,
      cardReference,
      deckbuilderPrint,
      ttsLeaders,
      ttsSupplementals,
      ttsFinalized,
      ttsTrackers,
    ]) {
      expect(consumer).not.toContain('component-render.html');
    }
  });

  it('gives the canonical renderer only face identity, never caller-selected rendering behavior', () => {
    expect(faceRuntime).toContain("query.get('id')");
    for (const consumer of liveConsumers) {
      const faceRouteLines = consumer.split('\n').filter(line => line.includes('face-render.html'));
      for (const line of faceRouteLines) {
        expect(line).not.toContain('kind=');
        expect(line).not.toContain('side=');
        expect(line).not.toContain('orientation=');
        expect(line).not.toContain('template=');
        expect(line).not.toContain('rules=');
        expect(line).not.toContain('version=');
      }
    }
  });

  it('uses canonical face namespaces only as identity', () => {
    expect(deckbuilderPrint).toContain('faceRenderSource(`card:${cardId}`)');
    expect(deckbuilderPrint).toContain('faceRenderSource(`territory:${territoryId}`)');
    expect(deckbuilderPrint).toContain('component:${componentId}:${options.side || "front"}');
    expect(deckbuilderPrint).toContain('faceRenderSource(`back:${safeFaction}`)');
    expect(cardReference).toContain('buildFaceRendererUrl(`card:${card.id}`)');
    expect(cardReference).toContain('buildFaceRendererUrl(`territory:${territory.id}`)');
    expect(cardReference).toContain('component:${component.id}:${side}');
  });

  it('bridges Deckbuilder ruleset authority outside the renderer URL', () => {
    expect(deckbuilderRuntime).toContain('window.__gauntletFaceAuthorityBridge');
    expect(deckbuilderRuntime).toContain('rulesetMode: requestedRulesetMode');
    expect(deckbuilderPrint).toContain('window.__gauntletFaceAuthorityBridge');
    expect(currentGameRuntime).toContain('window.top.__gauntletFaceAuthorityBridge');
    expect(currentGameRuntime).toContain('function bridgedRenderGame()');
    expect(deckbuilderPrint).not.toContain('&rules=');
    expect(deckbuilderTerritories).not.toContain('&rules=');
  });

  it('keeps landscape rotation in consumer packaging rather than renderer parameters', () => {
    expect(deckbuilderPrint).toContain('production-component-landscape-rotate');
    expect(deckbuilderPrint).toContain('production-territory-rotate');
    expect(deckbuilderPrint).toContain('transform: rotate(90deg)');
    expect(deckbuilderPrint).not.toContain('&orientation=landscape');
    expect(cardReference).toContain("orientation: 'landscape'");
    expect(cardReference).toContain('frame.dataset.renderOrientation');
  });

  it('keeps legacy surfaces only in the explicit parity harness until Stage 6', () => {
    const parity = readFileSync('scripts/validate-unified-face-parity.mjs', 'utf8');
    expect(parity).toContain('card-review-render.html');
    expect(parity).toContain('territory-review-render.html');
    expect(parity).toContain('component-render.html');
    expect(parity).toContain('card-back-render.html');
  });
});
