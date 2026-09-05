#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const HOMEPAGE_SHOWCASE_ID = 'all-factions-promotional-showcase';
export const HOMEPAGE_SHOWCASE_SCHEMA_VERSION = 1;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function finiteNumber(value, label) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${label} must be a finite number.`);
  return number;
}

export function buildHomepageShowcaseManifest(source) {
  invariant(source && typeof source === 'object', 'Homepage showcase source must be an object.');
  const composition = (source.compositions || []).find(item => item?.id === HOMEPAGE_SHOWCASE_ID);
  invariant(composition, `Missing source composition ${HOMEPAGE_SHOWCASE_ID}.`);

  const canvas = composition.canvas || {};
  const width = finiteNumber(canvas.width, 'Homepage showcase canvas width');
  const height = finiteNumber(canvas.height, 'Homepage showcase canvas height');
  invariant(width > 0 && height > 0, 'Homepage showcase canvas dimensions must be positive.');

  const cards = Array.isArray(composition.cards) ? composition.cards : [];
  invariant(cards.length === 7, `Homepage showcase must contain exactly 7 cards; found ${cards.length}.`);

  const ids = cards.map(card => String(card?.id || '').trim());
  invariant(ids.every(Boolean), 'Every homepage showcase card must have an id.');
  invariant(new Set(ids).size === ids.length, 'Homepage showcase card ids must be unique.');

  return Object.freeze({
    schemaVersion: HOMEPAGE_SHOWCASE_SCHEMA_VERSION,
    id: HOMEPAGE_SHOWCASE_ID,
    canvas: Object.freeze({ width, height }),
    cards: Object.freeze(cards.map((card, index) => {
      const x = finiteNumber(card.x, `Homepage showcase card ${index + 1} x`);
      const y = finiteNumber(card.y, `Homepage showcase card ${index + 1} y`);
      const cardWidth = finiteNumber(card.width, `Homepage showcase card ${index + 1} width`);
      const rotation = finiteNumber(card.rotation, `Homepage showcase card ${index + 1} rotation`);
      const z = finiteNumber(card.z, `Homepage showcase card ${index + 1} z`);
      invariant(cardWidth > 0, `Homepage showcase card ${card.id} width must be positive.`);
      return Object.freeze({ id: ids[index], x, y, width: cardWidth, rotation, z });
    })),
  });
}

export async function materializeHomepageShowcaseManifest(sourcePath, outputPath) {
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  const manifest = buildHomepageShowcaseManifest(source);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const sourcePath = resolve(process.argv[2] || 'media/compositions.json');
  const outputPath = resolve(process.argv[3] || 'assets/homepage-card-showcase.json');
  const manifest = await materializeHomepageShowcaseManifest(sourcePath, outputPath);
  console.log(`Materialized ${manifest.cards.length}-card homepage showcase manifest at ${outputPath}.`);
}
