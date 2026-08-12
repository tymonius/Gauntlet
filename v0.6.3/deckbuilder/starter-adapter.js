import { V063_STARTER_CATALOG } from '../data/starter-decks.js';

export { V063_STARTER_CATALOG };

// Compatibility entry point retained for the existing v0.6.3 browser and
// published release builders. v0.6.3 now has its own starter compositions;
// the supplied legacy catalog is intentionally ignored.
export function migrateV063StarterCatalog(_legacyCatalog) {
  return cloneCatalog(V063_STARTER_CATALOG);
}

export function getV063StarterCatalog() {
  return cloneCatalog(V063_STARTER_CATALOG);
}

function cloneCatalog(catalog) {
  return JSON.parse(JSON.stringify(catalog));
}
