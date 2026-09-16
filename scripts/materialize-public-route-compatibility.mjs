import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  loadPublicationBoundary,
  materializePublicFiles,
  materializePublicRoutes,
  publicFileTarget,
  publicPathTarget,
} from './publication-boundary.mjs';

const destinationRoot = process.argv[2] ? path.resolve(process.argv[2]) : ROOT;
const contract = loadPublicationBoundary();
const inPlace = path.resolve(destinationRoot) === path.resolve(ROOT);
const sourceOnlyRoots = new Set(contract.pages?.sourceOnlyRepositoryRoots || []);

const compatibleRoutes = (contract.materializedRoutes || []).filter((route) => {
  if (!inPlace) return true;
  const topLevel = route.publicPath.replace(/^\/+|\/+$/g, '').split('/', 1)[0];
  if (sourceOnlyRoots.has(topLevel)) return false;
  const source = path.resolve(ROOT, route.source);
  const destination = path.resolve(publicPathTarget(destinationRoot, route.publicPath));
  return source !== destination;
});

const compatibleFiles = (contract.materializedFiles || []).filter((file) => {
  if (!inPlace) return true;
  const source = path.resolve(ROOT, file.source);
  const destination = path.resolve(publicFileTarget(destinationRoot, file.publicPath));
  if (fs.existsSync(destination)) return false;
  return source !== destination;
});

const compatibilityContract = {
  ...contract,
  materializedRoutes: compatibleRoutes,
  materializedFiles: compatibleFiles,
};

const materializedRoutes = materializePublicRoutes({
  destinationRoot,
  contract: compatibilityContract,
  skipMissingSources: true,
});
const materializedFiles = materializePublicFiles({
  destinationRoot,
  contract: compatibilityContract,
  skipMissingSources: true,
});

console.log(
  `Materialized ${materializedRoutes.length} public route compatibility target(s): ${materializedRoutes.join(', ')}. ` +
  `Materialized ${materializedFiles.length} public file compatibility target(s): ${materializedFiles.join(', ')}.`,
);
