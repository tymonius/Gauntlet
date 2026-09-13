import {
  materializePublicFiles,
  materializePublicRoutes,
} from './publication-boundary.mjs';

const materializedRoutes = materializePublicRoutes({ skipMissingSources: true });
const materializedFiles = materializePublicFiles({ skipMissingSources: true });

console.log(
  `Materialized ${materializedRoutes.length} public route compatibility target(s): ${materializedRoutes.join(', ')}. ` +
  `Materialized ${materializedFiles.length} public file compatibility target(s): ${materializedFiles.join(', ')}.`,
);
