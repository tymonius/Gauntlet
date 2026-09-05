import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex');

function packageFile(packagePath, value) {
  const normalized = String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized) throw new Error('Manifest file path is blank.');
  return normalized.startsWith('releases/') ? normalized : path.posix.join(packagePath, normalized);
}

async function digestEntry(root, packagePath, entry) {
  const file = packageFile(packagePath, entry.path);
  const absolute = path.join(root, file);
  const info = await stat(absolute);
  if (!info.isFile()) throw new Error(`Release payload is not a file: ${file}`);
  return {
    ...entry,
    sha256: await sha256(absolute),
    bytes: info.size,
  };
}

export async function refreshCurrentReleaseManifest({ root = process.cwd() } = {}) {
  const lifecyclePath = path.join(root, 'config/release-lifecycle.json');
  const lifecycle = await readJson(lifecyclePath);
  const version = String(lifecycle.current_release || '').trim();
  if (!/^v\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid current release: ${version || '(blank)'}.`);

  const release = lifecycle.releases?.[version];
  const packagePath = String(release?.current_package_path || '').replace(/^\//, '').replace(/\/$/, '');
  if (release?.status !== 'current' || !packagePath) {
    throw new Error(`Current release ${version} is missing a current package path.`);
  }

  const stem = `Gauntlet_${version}`;
  const manifestPath = path.join(root, packagePath, `${stem}_Manifest.json`);
  const provenancePath = path.join(root, packagePath, `${stem}_Source_Provenance.json`);
  const [manifest, provenance] = await Promise.all([readJson(manifestPath), readJson(provenancePath)]);

  if (manifest.release_version !== version || manifest.status !== 'current') {
    throw new Error(`Manifest is not the current ${version} release.`);
  }
  if (provenance.release_version !== version || !provenance.authority_set_id) {
    throw new Error(`Source provenance is not valid for ${version}.`);
  }

  manifest.authority_set_id = provenance.authority_set_id;
  if (!Array.isArray(manifest.payload_files) || !manifest.payload_files.length) {
    throw new Error('Current release manifest has no payload_files.');
  }

  manifest.payload_files = await Promise.all(
    manifest.payload_files.map(entry => digestEntry(root, packagePath, entry))
  );

  const payloadByBasename = new Map(
    manifest.payload_files.map(entry => [path.posix.basename(entry.path), entry])
  );

  for (const [key, binding] of Object.entries(manifest.binding_sources || {})) {
    const basename = path.posix.basename(String(binding?.path || ''));
    const payload = payloadByBasename.get(basename);
    if (!payload) throw new Error(`Binding source ${key} is not present in payload_files: ${binding?.path || '(blank)'}.`);
    manifest.binding_sources[key] = {
      ...binding,
      sha256: payload.sha256,
    };
  }

  if (Array.isArray(manifest.pdf_outputs)) {
    manifest.pdf_outputs = manifest.pdf_outputs.map(entry => {
      const payload = payloadByBasename.get(path.posix.basename(String(entry?.path || '')));
      if (!payload) throw new Error(`PDF output is not present in payload_files: ${entry?.path || '(blank)'}.`);
      return { ...entry, sha256: payload.sha256, bytes: payload.bytes };
    });
  }

  for (const key of ['card_anatomy_figure', 'arcane_trait_figure']) {
    const figure = manifest.rulebook_booklet_provenance?.[key];
    if (!figure?.path) continue;
    const payload = payloadByBasename.get(path.posix.basename(figure.path));
    if (!payload) throw new Error(`Rulebook figure is not present in payload_files: ${figure.path}.`);
    manifest.rulebook_booklet_provenance[key] = { ...figure, sha256: payload.sha256 };
  }

  await writeJson(manifestPath, manifest);
  return { version, packagePath, manifestPath, authoritySetId: manifest.authority_set_id };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await refreshCurrentReleaseManifest();
  console.log(`Refreshed ${result.version} manifest for authority ${result.authoritySetId}.`);
}
