export {
  V070_CANONICAL_DATA_SOURCE,
  V070_RELEASE_MANIFEST_SOURCE,
  V070_RULES_VERSION,
  loadV070CanonicalContent,
  v070CanonicalContent,
  type V070CanonicalCard,
  type V070CanonicalCardEffect,
  type V070CanonicalContentIndex,
  type V070CanonicalData,
  type V070CanonicalFaction,
  type V070CanonicalTerritory,
  type V070Gameplay,
  type V070ReleaseManifest,
} from './v070';

export * from '../v070/rules';
export * from '../v070/starter-decks';
export * from '../v070/engine';
export * from '../v070/turn-engine';
export * from '../v070/battle-types';
export * from '../v070/battle-engine';
export * from '../v070/battle-effects';
export * from '../v070/diplomats';
export * from '../v070/front-line';
export * from '../v070/overlays';
export * from '../v070/assets';
export * from '../v070/sanctions';
export * from '../v070/movement-triggers';
export * from '../v070/views';
export * from '../v070/replay';

/** Historical v0.6.x procedure libraries are intentionally not re-exported here.
 * Import an explicit versioned module when working with migration evidence.
 */
export { V070_RULES_VERSION as CURRENT_RULES_VERSION } from './v070';
