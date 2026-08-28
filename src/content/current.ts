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
export * from '../v070/views';

/**
 * These procedure modules remain explicitly versioned because they were
 * implemented and validated during the v0.6.3 migration. They are retained as
 * reusable migration surfaces, not silently relabeled as v0.7.0 behavior.
 * Promote them individually only after current-rule revalidation.
 */
export * from '../v063/cards';
export * from '../v063/copied-effects';
export * from '../v063/arcane-knowledge';
export * from '../v063/copied-effect-callers';
export * from '../v063/gauntlet';
export * from '../v063/manifest-destiny';
export * from '../v063/territories';
export * from '../v063/territory-battles';

export { V070_RULES_VERSION as CURRENT_RULES_VERSION } from './v070';
