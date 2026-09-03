import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const faceSpec = readFileSync('card-design/face-spec.mjs', 'utf8');
const faceRuntime = readFileSync('card-design/face-render.mjs', 'utf8');
const faceShell = readFileSync('card-design/face-render.html', 'utf8');
const leaderFace = readFileSync('card-design/face-families/leader.mjs', 'utf8');
const cardBackFace = readFileSync('card-design/face-families/card-back.mjs', 'utf8');
const componentRuntime = readFileSync('card-design/component-render.js', 'utf8');
const cardBackAlias = readFileSync('card-design/card-back-render.html', 'utf8');
const leaderStyles = readFileSync('card-design/leader-card.css', 'utf8');
const cardReview = readFileSync('card-design/card-review.js', 'utf8');
const productionPrint = readFileSync('deckbuilder/production-print.js', 'utf8');
const cardReference = readFileSync('card-reference/app.js', 'utf8');
const ttsLeaders = readFileSync('scripts/generate-tts-leader-assets.mjs', 'utf8');
const ttsCards = readFileSync('scripts/generate-tts-card-assets.mjs', 'utf8');

describe('FaceSpec renderer v2 foundation', () => {
  it('defines one immutable request-to-FaceSpec boundary for migrated families', () => {
    expect(faceSpec).toContain("export async function resolveFaceSpec");
    expect(faceSpec).toContain("normalizedKind === 'leader'");
    expect(faceSpec).toContain("normalizedKind === 'back'");
    expect(faceSpec).toContain("surfaceCssSize(orientation)");
    expect(faceSpec).toContain("backPolicy: 'standardBack'");
    expect(faceSpec).toContain("requireExplicitArtworkDirection");
    expect(faceRuntime).toContain("const spec = await resolveFaceSpec(request)");
    expect(faceRuntime).toContain("family.mountFace(target, spec)");
    expect(faceShell).not.toContain('leaderReviewSections');
    expect(faceShell).not.toContain('proposalReviewSections');
    expect(faceShell).not.toContain('supplementalReviewSections');
  });

  it('renders Leader faces directly instead of building a hidden catalog and reparents nothing', () => {
    expect(leaderFace).toContain("export function mountFace");
    expect(leaderFace).toContain("leader-card--standardized");
    expect(leaderFace).toContain("data-face-kind=\"leader\"");
    expect(leaderFace).not.toContain("leaderReviewSections");
    expect(faceRuntime).not.toContain("target.replaceChildren(card)");
    expect(faceRuntime).not.toContain("window.dispatchEvent(new Event('load'))");
    expect(componentRuntime).toContain('if (kind === "leader")');
    expect(componentRuntime).toContain('/card-design/face-render.html');
    expect(componentRuntime).toContain('window.location.replace(redirect)');
  });

  it('requires all Leader artwork composition to be explicit data, never hidden CSS or smart production cropping', () => {
    for (const leader of currentGame.leaders) {
      const id = `${leader.faction}-${leader.id}`;
      const direction = currentGame.artDirection[id];
      expect(direction).toEqual(expect.objectContaining({
        fit: 'cover',
        focusX: expect.any(Number),
        focusY: expect.any(Number),
        smart: false,
        zoom: expect.any(Number),
      }));
    }
    expect(leaderStyles).not.toContain('object-position:');
    expect(faceSpec).toContain("resolved.focusX == null || resolved.focusY == null || resolved.smart !== false");
  });

  it('renders card backs through the same face surface and keeps the old back URL as a redirect only', () => {
    expect(cardBackFace).toContain("renderCardBack");
    expect(productionPrint).toContain('/card-design/face-render.html?kind=back&id=');
    expect(ttsCards).toContain('/card-design/face-render.html?kind=back&id=');
    expect(cardBackAlias).toContain('/card-design/face-render.html');
    expect(cardBackAlias).toContain('window.location.replace(target)');
    expect(cardBackAlias).not.toContain('card-back.js');
  });

  it('moves every migrated consumer onto FaceSpec rather than keeping parallel Leader/back surfaces', () => {
    expect(cardReview).toContain("kind === 'leader' ? 'face-render.html' : 'component-render.html'");
    expect(productionPrint).toContain('options.kind === "leader" ? "face-render.html" : "component-render.html"');
    expect(cardReference).toContain("buildFaceRendererUrl('leader', rendererId)");
    expect(ttsLeaders).toContain('/card-design/face-render.html');
    expect(ttsLeaders).not.toContain('/card-design/component-render.html');
    expect(ttsCards).not.toContain('/card-design/card-back-render.html');
  });

  it('prepares a single mounted card explicitly instead of replaying page lifecycle events', () => {
    expect(faceRuntime).toContain('window.GauntletCardDesign.prepareCard(card)');
    expect(faceRuntime).toContain('spec.artwork.direction');
    expect(faceRuntime).toContain('card.dataset.artDirectionApplied = spec.artwork.id');
    expect(faceRuntime).not.toContain("dispatchEvent(new Event('load'))");
  });
});
