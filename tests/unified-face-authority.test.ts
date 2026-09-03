import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FACE_TEMPLATES,
  buildFaceCatalog,
  listFaces,
  resolveFace,
} from '../card-design/face-authority.mjs';

const authority = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const game = Object.freeze({
  cards: authority.gameplay.cards,
  territories: authority.gameplay.territories,
  leaders: authority.leaders,
  components: authority.componentContract.components,
  sharedComponents: authority.componentContract.sharedComponents,
});

describe('unified physical face authority', () => {
  it('enumerates every current card-like physical face in one catalog', () => {
    const faces = listFaces(game);
    expect(faces).toHaveLength(242);
    expect(new Set(faces.map(face => face.id)).size).toBe(faces.length);

    expect(faces.filter(face => face.id.startsWith('card:'))).toHaveLength(142);
    expect(faces.filter(face => face.id.startsWith('territory:'))).toHaveLength(25);
    expect(faces.filter(face => face.id.startsWith('leader:'))).toHaveLength(12);
    expect(faces.filter(face => face.id.startsWith('component:'))).toHaveLength(57);
    expect(faces.filter(face => face.id.startsWith('back:'))).toHaveLength(6);
  });

  it('treats type as FaceSpec data rather than caller-selected rendering infrastructure', () => {
    const general = resolveFace(game, 'leader:military-general');
    const deed = resolveFace(game, 'component:financiers-deed:front');
    const territory = resolveFace(game, `territory:${game.territories[0].id}`);

    expect(general).toMatchObject({
      template: 'leader',
      orientation: 'portrait',
      side: 'front',
      backPolicy: 'standardBack',
    });
    expect(deed).toMatchObject({
      template: 'deed',
      orientation: 'landscape',
      side: 'front',
      backPolicy: 'standardBack',
    });
    expect(territory).toMatchObject({
      template: 'territory',
      orientation: 'landscape',
      side: 'front',
      backPolicy: 'standardBack',
    });
  });

  it('derives paired faces from physical component policy instead of renderer-specific side logic', () => {
    const proposalFront = resolveFace(game, 'component:diplomats-proposal-de-escalation:front');
    const proposalReverse = resolveFace(game, 'component:diplomats-proposal-de-escalation:reverse');
    expect(proposalFront.pairedFaceId).toBe(proposalReverse.id);
    expect(proposalReverse.pairedFaceId).toBe(proposalFront.id);

    const ritualFront = resolveFace(game, 'component:mystics-ritual-of-ascension:front');
    const ritualReverse = resolveFace(game, 'component:mystics-ritual-of-ascension:reverse');
    expect(ritualFront.backPolicy).toBe('specialBack');
    expect(ritualFront.pairedFaceId).toBe(ritualReverse.id);

    const deed = resolveFace(game, 'component:financiers-deed:front');
    expect(deed.pairedFaceId).toBeUndefined();
  });

  it('has one explicit template registry for geometry rather than scattered per-family dimensions', () => {
    expect(FACE_TEMPLATES.leader.orientation).toBe('portrait');
    expect(FACE_TEMPLATES.playable.orientation).toBe('portrait');
    expect(FACE_TEMPLATES.territory.orientation).toBe('landscape');
    expect(FACE_TEMPLATES.deed.orientation).toBe('landscape');

    for (const face of buildFaceCatalog(game).values()) {
      expect(face.surface.orientation).toBe(face.orientation);
      if (face.orientation === 'portrait') {
        expect(face.surface).toMatchObject({ widthIn: 2.5, heightIn: 3.5 });
      } else {
        expect(face.surface).toMatchObject({ widthIn: 3.5, heightIn: 2.5 });
      }
    }
  });

  it('fails closed for unknown faces and unsupported card-like component families', () => {
    expect(() => resolveFace(game, 'leader:not-a-real-face')).toThrow('Unknown canonical face id');

    const broken = {
      ...game,
      components: [
        ...game.components,
        {
          id: 'test-unknown-component',
          name: 'Unknown Component',
          family: 'mystery-family',
          cardLike: true,
          backPolicy: 'standardBack',
        },
      ],
    };
    expect(() => buildFaceCatalog(broken)).toThrow('has no canonical face template');
  });
});
