import path from 'node:path';
import {
  ROOT,
  materializePublicFiles,
  materializePublicRoutes,
} from './publication-boundary.mjs';

const destinationRoot = process.argv[2] ? path.resolve(process.argv[2]) : ROOT;
const materializedRoutes = materializePublicRoutes({ destinationRoot, skipMissingSources: true });
const materializedFiles = materializePublicFiles({ destinationRoot, skipMissingSources: true });

console.log(
  `Materialized ${materializedRoutes.length} public route compatibility target(s): ${materializedRoutes.join(', ')}. ` +
  `Materialized ${materializedFiles.length} public file compatibility target(s): ${materializedFiles.join(', ')}.`,
);
