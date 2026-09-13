import { materializePublicRoutes } from './publication-boundary.mjs';

const materialized = materializePublicRoutes({ skipMissingSources: true });
console.log(`Materialized ${materialized.length} public route compatibility target(s): ${materialized.join(', ')}.`);
