import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function lstatOrNull(file) {
  try {
    return fs.lstatSync(file);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function clearCompatibilityPath(alias) {
  const existing = lstatOrNull(alias);
  if (!existing) return;
  if (existing.isSymbolicLink()) {
    fs.unlinkSync(alias);
    return;
  }
  if (existing.isDirectory() && fs.readdirSync(alias).length === 0) {
    fs.rmdirSync(alias);
    return;
  }
  throw new Error(`Refusing to replace nonempty publication path: ${alias}`);
}

export function prepareLegacyRulebookPublicationCompatibility(root = process.cwd()) {
  const legacyRoot = path.join(root, 'legacy', 'v0.6.1-rulebook-publication');
  const legacyDesign = path.join(legacyRoot, 'rulebook-design');
  const legacyProduction = path.join(legacyRoot, 'rulebook-production');
  for (const source of [legacyDesign, legacyProduction]) {
    if (!fs.statSync(source).isDirectory()) {
      throw new Error(`Missing preserved Rulebook publication source: ${source}`);
    }
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-rulebook-publication-'));
  const tempDesign = path.join(tempRoot, 'rulebook-design');
  const tempProduction = path.join(tempRoot, 'rulebook-production');
  fs.cpSync(legacyDesign, tempDesign, { recursive: true });
  fs.cpSync(legacyProduction, tempProduction, { recursive: true });

  for (const name of ['images', 'releases', 'node_modules']) {
    const source = path.join(root, name);
    if (!fs.existsSync(source)) {
      throw new Error(`Missing Rulebook publication dependency: ${source}`);
    }
    fs.symlinkSync(source, path.join(tempRoot, name), 'dir');
  }

  const aliases = [
    [path.join(root, 'rulebook-design'), tempDesign],
    [path.join(root, 'rulebook-production'), tempProduction],
  ];
  for (const [alias, target] of aliases) {
    clearCompatibilityPath(alias);
    fs.symlinkSync(target, alias, 'dir');
  }

  return { tempRoot, aliases: aliases.map(([alias]) => alias) };
}

export function cleanupLegacyRulebookPublicationCompatibility(state) {
  for (const alias of state?.aliases || []) {
    const existing = lstatOrNull(alias);
    if (existing?.isSymbolicLink()) fs.unlinkSync(alias);
  }
  if (state?.tempRoot) fs.rmSync(state.tempRoot, { recursive: true, force: true });
}
