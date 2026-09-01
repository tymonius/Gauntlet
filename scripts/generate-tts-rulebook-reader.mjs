import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const HALF_WIDTH = 5.5 * 72;
const HALF_HEIGHT = 8.5 * 72;
const TOLERANCE = 1;

export function imposedPlacementForLogicalPage(totalLogicalPages, logicalIndex) {
  if (!Number.isInteger(totalLogicalPages) || totalLogicalPages < 4 || totalLogicalPages % 4 !== 0) {
    throw new Error(`Logical Rulebook page count must be a positive multiple of four; found ${totalLogicalPages}.`);
  }
  if (!Number.isInteger(logicalIndex) || logicalIndex < 0 || logicalIndex >= totalLogicalPages) {
    throw new Error(`Logical Rulebook page index ${logicalIndex} is outside 0..${totalLogicalPages - 1}.`);
  }

  for (let sheet = 0; sheet < totalLogicalPages / 4; sheet += 1) {
    const frontSide = sheet * 2;
    const backSide = frontSide + 1;
    const placements = [
      [totalLogicalPages - 1 - 2 * sheet, frontSide, 'left'],
      [2 * sheet, frontSide, 'right'],
      [1 + 2 * sheet, backSide, 'left'],
      [totalLogicalPages - 2 - 2 * sheet, backSide, 'right'],
    ];
    const match = placements.find(([page]) => page === logicalIndex);
    if (match) return { imposedPageIndex: match[1], slot: match[2] };
  }

  throw new Error(`Could not resolve imposed placement for logical page ${logicalIndex}.`);
}

function validateImposedPage(page, index) {
  const { width, height } = page.getSize();
  if (Math.abs(width - HALF_WIDTH * 2) > TOLERANCE || Math.abs(height - HALF_HEIGHT) > TOLERANCE) {
    throw new Error(`Imposed Rulebook side ${index + 1} is ${width}x${height}pt; expected Letter landscape 792x612pt.`);
  }
}

export async function generateTtsRulebookReader() {
  const release = await resolveCurrentTtsRelease();
  const inputPath = join(ROOT, 'releases', release.version, `Gauntlet_${release.version}_Rulebook_Booklet.pdf`);
  const outputPath = join(release.outputRoot, 'rulebook-reader.pdf');

  const imposed = await PDFDocument.load(await readFile(inputPath));
  const imposedPages = imposed.getPages();
  if (!imposedPages.length) throw new Error('Imposed Rulebook PDF contains no pages.');
  imposedPages.forEach(validateImposedPage);

  const totalLogicalPages = imposedPages.length * 2;
  if (totalLogicalPages % 4 !== 0) {
    throw new Error(`Imposed Rulebook expands to ${totalLogicalPages} logical pages, which is not divisible by four.`);
  }

  const reader = await PDFDocument.create();
  reader.setTitle(`Gauntlet ${release.version} Rulebook`);
  reader.setSubject('Sequential half-letter reader-order Rulebook for Tabletop Simulator');

  for (let logicalIndex = 0; logicalIndex < totalLogicalPages; logicalIndex += 1) {
    const { imposedPageIndex, slot } = imposedPlacementForLogicalPage(totalLogicalPages, logicalIndex);
    const source = imposedPages[imposedPageIndex];
    const left = slot === 'left' ? 0 : HALF_WIDTH;
    const embedded = await reader.embedPage(source, {
      left,
      bottom: 0,
      right: left + HALF_WIDTH,
      top: HALF_HEIGHT,
    });
    const page = reader.addPage([HALF_WIDTH, HALF_HEIGHT]);
    page.drawPage(embedded, { x: 0, y: 0, width: HALF_WIDTH, height: HALF_HEIGHT });
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, await reader.save({ useObjectStreams: false }));
  console.log(`Generated ${totalLogicalPages}-page reader-order TTS Rulebook at ${relative(ROOT, outputPath)}.`);
  return { inputPath, outputPath, pageCount: totalLogicalPages };
}

async function main() {
  await generateTtsRulebookReader();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
