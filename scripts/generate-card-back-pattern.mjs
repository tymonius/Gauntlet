import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FACTIONS = Object.freeze([
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
]);
const ROW_SEQUENCE = Object.freeze([0, 3, 1, 4, 2, 5, 2, 4, 0, 5, 1, 3]);
const ROW_SHIFTS = Object.freeze([0, 7.25, 3.625, 10.875]);

function number(value) {
  return Number(value.toFixed(4)).toString();
}

export function normalizeFactionSymbol(name, source) {
  const viewBox = source.match(/\bviewBox=["']([^"']+)["']/i)?.[1];
  const bodyMatch = source.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>\s*$/i);
  if (!viewBox || !bodyMatch) throw new Error(`Unable to parse faction symbol ${name}.`);

  let body = bodyMatch[1]
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\sclass=(["'])[^"']*\1/gi, '')
    .replace(/\sfill=(["'])[^"']*\1/gi, '')
    .replace(/<defs>\s*<\/defs>/gi, '')
    .trim();

  if (/\bstroke\s*=|<style\b|\bclass\s*=|\bfill\s*=/i.test(body)) {
    throw new Error(`Faction symbol ${name} is not a paint-free silhouette.`);
  }

  return `    <symbol id="${name}" viewBox="${viewBox}" overflow="visible">\n${body}\n    </symbol>`;
}

export function buildCardBackPattern(symbolSources) {
  const symbols = FACTIONS.map(name => {
    const source = symbolSources[name];
    if (!source) throw new Error(`Missing faction symbol source for ${name}.`);
    return normalizeFactionSymbol(name, source);
  }).join('\n');

  const uses = [];
  for (let row = 0; row < 36; row += 1) {
    const offset = ROW_SEQUENCE[row % ROW_SEQUENCE.length];
    const shift = ROW_SHIFTS[row % ROW_SHIFTS.length];
    const y = 32.25 + row * 13.2;
    for (let column = 0; column < 36; column += 1) {
      const faction = FACTIONS[(column + offset) % FACTIONS.length];
      const x = 9.5 + column * 14.5 + shift;
      uses.push(`      <use href="#${faction}" x="${number(x)}" y="${number(y)}" width="13.5" height="13.5"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="2.35in" height="3.35in" viewBox="0 0 235 335">
  <defs>
${symbols}
  </defs>
  <g transform="translate(117.5 167.5) rotate(78) translate(-270 -270)" opacity="0.42" fill="#000">
${uses.join('\n')}
  </g>
</svg>
`;
}

export async function readFactionSymbolSources(root = ROOT) {
  return Object.fromEntries(await Promise.all(FACTIONS.map(async name => [
    name,
    await readFile(join(root, 'images', 'faction-symbols', `${name}.svg`), 'utf8'),
  ])));
}

export async function generateCardBackPattern(root = ROOT) {
  const output = buildCardBackPattern(await readFactionSymbolSources(root));
  await writeFile(join(root, 'card-design', 'card-back-pattern.svg'), output);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateCardBackPattern().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
