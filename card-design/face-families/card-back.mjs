import { renderCardBack } from '../card-back.js';

export function mountFace(target, spec) {
  const back = document.createElement('div');
  back.dataset.gauntletCardBack = '';
  back.dataset.cardBackFaction = spec.faction;
  back.dataset.faceId = spec.id;
  back.dataset.faceKind = 'back';
  target.replaceChildren(back);
  renderCardBack(back);
  return back;
}
