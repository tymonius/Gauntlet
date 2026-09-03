import * as playable from './face-templates/playable.mjs';
import * as territory from './face-templates/territory.mjs';
import * as leader from './face-templates/leader.mjs';
import * as reference from './face-templates/reference.mjs';
import * as tracker from './face-templates/tracker.mjs';
import * as proposal from './face-templates/proposal.mjs';
import * as ledger from './face-templates/ledger.mjs';
import * as deed from './face-templates/deed.mjs';
import * as rite from './face-templates/rite.mjs';
import * as ritual from './face-templates/ritual.mjs';
import * as standardBack from './face-templates/standard-back.mjs';

export const FACE_TEMPLATE_RENDERERS = Object.freeze({
  playable,
  territory,
  leader,
  reference,
  tracker,
  proposal,
  ledger,
  deed,
  rite,
  ritual,
  'standard-back': standardBack,
});

export function rendererForTemplate(template) {
  const renderer = FACE_TEMPLATE_RENDERERS[template];
  if (!renderer || typeof renderer.render !== 'function') {
    throw new Error(`No clean face renderer is registered for template ${template || '(missing)'}.`);
  }
  return renderer;
}
