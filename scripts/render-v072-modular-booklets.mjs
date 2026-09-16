import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  V072_BOOKLET_AUTHORITY_PREFIX,
  V072_BOOKLET_MANIFEST,
  V072_BOOKLET_OUTPUT_ROOT,
  V072_BOOKLET_RELEASE_VERSION,
  V072_MODULAR_BOOKLETS,
} from '../packages/rules/publication/v072-modular-booklets.mjs';
import {
  loadPublicationBoundary,
  materializePublicFiles,
  materializePublicRoutes,
} from './publication-boundary.mjs';

const ROOT = process.cwd();
const AUTHORITY_PATH = path.join(ROOT, 'packages', 'game-data', 'current-game.json');
const OUTPUT_ROOT = path.resolve(ROOT, process.env.GAUNTLET_V072_BOOKLET_OUTPUT || V072_BOOKLET_OUTPUT_ROOT);
const MANIFEST_PATH = path.join(OUTPUT_ROOT, V072_BOOKLET_MANIFEST);
const HALF_LETTER = Object.freeze({ width: 396, height: 612 });
const LETTER_LANDSCAPE = Object.freeze({ width: 792, height: 612 });
const BUILD_EPOCH = new Date('2000-01-01T00:00:00.000Z');

const hashBytes = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = file => hashBytes(fs.readFileSync(file));
const relative = file => path.relative(ROOT, file).replaceAll(path.sep, '/');

function requireCandidateAuthority() {
  const authority = JSON.parse(fs.readFileSync(AUTHORITY_PATH, 'utf8'));
  const version = String(authority.version || '');
  const status = String(authority.status || '');
  if (!version.startsWith(V072_BOOKLET_AUTHORITY_PREFIX)) {
    throw new Error(`Expected ${V072_BOOKLET_AUTHORITY_PREFIX} authority; found ${version || 'missing'}.`);
  }
  if (!['active-development', 'release-candidate', 'current-release'].includes(status)) {
    throw new Error(`v0.7.2 booklet rendering is not allowed from authority status ${status || 'missing'}.`);
  }
  return authority;
}

function copyPublishedRootDependencies(destinationRoot, contract) {
  for (const name of contract.pages?.publishedDirectories || []) {
    const source = path.join(ROOT, name);
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, path.join(destinationRoot, name), { recursive: true });
  }

  const allowedExtensions = new Set(contract.pages?.rootFiles?.allowedExtensions || []);
  const required = new Set(contract.pages?.rootFiles?.required || []);
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (!required.has(entry.name) && !allowedExtensions.has(extension)) continue;
    fs.copyFileSync(path.join(ROOT, entry.name), path.join(destinationRoot, entry.name));
  }
}

function materializeCandidateSite() {
  const destinationRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-v072-booklets-'));
  const contract = loadPublicationBoundary();
  copyPublishedRootDependencies(destinationRoot, contract);
  materializePublicRoutes({ root: ROOT, destinationRoot, contract, skipMissingSources: false });
  materializePublicFiles({ root: ROOT, destinationRoot, contract, skipMissingSources: false });
  return destinationRoot;
}

function contentType(file) {
  const extension = path.extname(file).toLowerCase();
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.webp': 'image/webp',
    '.xml': 'application/xml; charset=utf-8',
  })[extension] || 'application/octet-stream';
}

async function startStaticServer(root) {
  const server = http.createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const candidate = path.resolve(root, `.${pathname}`);
      const rootPrefix = `${path.resolve(root)}${path.sep}`;
      if (candidate !== path.resolve(root) && !candidate.startsWith(rootPrefix)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, {
        'Content-Type': contentType(candidate),
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(candidate).pipe(response);
    } catch (error) {
      response.writeHead(500).end(error.message);
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Static server did not expose a TCP port.');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

async function waitForPublication(page, publication, baseUrl) {
  const localFailures = [];
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => {
    if (!response.url().startsWith(baseUrl)) return;
    if (response.status() >= 400) localFailures.push(`${response.status()} ${response.url()}`);
  });

  const url = `${baseUrl}/rulebook/?rules=candidate&doc=${encodeURIComponent(publication.id)}`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (!response?.ok()) throw new Error(`${publication.title} returned HTTP ${response?.status() || 'unknown'}.`);

  await page.waitForFunction(
    expected => document.body.dataset.rulesetMode === 'candidate'
      && document.body.dataset.candidateDocument === expected
      && document.querySelector('.rulebook-content.candidate-publication'),
    publication.id,
    { timeout: 60000 },
  );

  if (!['player-guide', 'complete-rules'].includes(publication.id)) {
    await page.waitForSelector('.candidate-featured-leaders img.leader-portrait', { state: 'visible', timeout: 60000 });
  }

  await page.evaluate(async () => {
    await document.fonts?.ready;
    const images = [...document.images];
    await Promise.all(images.map(image => image.complete
      ? Promise.resolve()
      : new Promise(resolve => image.addEventListener('load', resolve, { once: true }))));
  });

  const diagnostics = await page.evaluate(() => {
    const content = document.querySelector('.rulebook-content.candidate-publication');
    const brokenImages = [...content.querySelectorAll('img')]
      .filter(image => !image.complete || image.naturalWidth <= 0)
      .map(image => image.getAttribute('src'));
    const suspiciousOverflow = [...content.querySelectorAll('p, li, h1, h2, h3, h4, blockquote, figure')]
      .filter(element => element.scrollWidth > element.clientWidth + 2)
      .map(element => ({ tag: element.tagName, text: element.textContent.trim().slice(0, 120) }));
    const visibleEditorialLeak = /rules-surface-contract\.json|player-facing language/i.test(content.innerText);
    return {
      brokenImages,
      suspiciousOverflow,
      visibleEditorialLeak,
      title: content.querySelector('.candidate-document-title')?.textContent?.trim() || '',
      textLength: content.innerText.length,
    };
  });

  if (pageErrors.length) throw new Error(`${publication.title} browser errors: ${pageErrors.join(' | ')}`);
  if (localFailures.length) throw new Error(`${publication.title} local asset failures: ${localFailures.join(' | ')}`);
  if (diagnostics.brokenImages.length) throw new Error(`${publication.title} has broken images: ${diagnostics.brokenImages.join(', ')}`);
  if (diagnostics.suspiciousOverflow.length) {
    throw new Error(`${publication.title} has obvious horizontal overflow: ${JSON.stringify(diagnostics.suspiciousOverflow.slice(0, 8))}`);
  }
  if (diagnostics.visibleEditorialLeak) throw new Error(`${publication.title} exposes internal editorial/governance language.`);
  if (diagnostics.textLength < 500) throw new Error(`${publication.title} rendered too little publication text.`);
}

function footerTemplate(publication) {
  const safeTitle = publication.title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<div style="width:100%;padding:0 0.42in;display:flex;justify-content:space-between;align-items:center;color:#5f5a53;font:600 7px/1.2 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;"><span>${safeTitle} · ${V072_BOOKLET_RELEASE_VERSION}</span><span>Page <span class="pageNumber"></span></span></div>`;
}

async function renderReaderPdf(browser, publication, baseUrl, destination) {
  const page = await browser.newPage({ viewport: { width: 1056, height: 1632 }, deviceScaleFactor: 1 });
  try {
    await waitForPublication(page, publication, baseUrl);
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: destination,
      width: '5.5in',
      height: '8.5in',
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: footerTemplate(publication),
      margin: {
        top: '0.45in',
        bottom: '0.52in',
        left: '0.42in',
        right: '0.42in',
      },
    });
  } finally {
    await page.close();
  }
}

async function imposeBooklet(readerPath, bookletPath, publication) {
  const { PDFDocument } = await import('pdf-lib');
  const readerBytes = fs.readFileSync(readerPath);
  const reader = await PDFDocument.load(readerBytes);
  const logicalPages = reader.getPageCount();
  if (logicalPages < 1) throw new Error(`${publication.title} reader PDF has no pages.`);

  while (reader.getPageCount() % 4 !== 0) reader.addPage([HALF_LETTER.width, HALF_LETTER.height]);
  const paddedPages = reader.getPageCount();
  const paddedBytes = await reader.save({ useObjectStreams: false });
  const booklet = await PDFDocument.create();
  booklet.setTitle(`Gauntlet ${V072_BOOKLET_RELEASE_VERSION} ${publication.title}`);
  booklet.setSubject('Gauntlet modular rules booklet');
  booklet.setAuthor('Tymon Scott');
  booklet.setCreator('Gauntlet modular rules publication pipeline');
  booklet.setProducer('Gauntlet modular rules publication pipeline');
  booklet.setCreationDate(BUILD_EPOCH);
  booklet.setModificationDate(BUILD_EPOCH);

  const embedded = await booklet.embedPdf(paddedBytes, Array.from({ length: paddedPages }, (_, index) => index));
  const sheets = paddedPages / 4;
  for (let sheet = 0; sheet < sheets; sheet += 1) {
    const front = booklet.addPage([LETTER_LANDSCAPE.width, LETTER_LANDSCAPE.height]);
    const frontLeft = paddedPages - (2 * sheet) - 1;
    const frontRight = 2 * sheet;
    front.drawPage(embedded[frontLeft], { x: 0, y: 0, width: HALF_LETTER.width, height: HALF_LETTER.height });
    front.drawPage(embedded[frontRight], { x: HALF_LETTER.width, y: 0, width: HALF_LETTER.width, height: HALF_LETTER.height });

    const back = booklet.addPage([LETTER_LANDSCAPE.width, LETTER_LANDSCAPE.height]);
    const backLeft = (2 * sheet) + 1;
    const backRight = paddedPages - (2 * sheet) - 2;
    back.drawPage(embedded[backLeft], { x: 0, y: 0, width: HALF_LETTER.width, height: HALF_LETTER.height });
    back.drawPage(embedded[backRight], { x: HALF_LETTER.width, y: 0, width: HALF_LETTER.width, height: HALF_LETTER.height });
  }

  const bytes = await booklet.save({ useObjectStreams: false });
  fs.writeFileSync(bookletPath, bytes);
  return {
    logicalPages,
    paddedPages,
    bookletSides: booklet.getPageCount(),
    physicalSheets: sheets,
  };
}

function publicationSourceMetadata(publication) {
  const sourcePath = path.join(ROOT, publication.source);
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing publication source: ${publication.source}`);
  const source = fs.readFileSync(sourcePath, 'utf8');
  if (!source.includes('AUTHORITY:game-data/current-game.json')) {
    throw new Error(`${publication.source} is not bound to current gameplay authority.`);
  }
  return {
    path: publication.source,
    sha256: hashFile(sourcePath),
  };
}

const authority = requireCandidateAuthority();
fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
const publicRoot = materializeCandidateSite();
const server = await startStaticServer(publicRoot);
const browser = await chromium.launch({ headless: true });
const temporaryReaders = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-v072-readers-'));

try {
  const outputs = [];
  for (const publication of V072_MODULAR_BOOKLETS) {
    const readerPath = path.join(temporaryReaders, `${publication.id}.pdf`);
    const bookletPath = path.join(OUTPUT_ROOT, publication.filename);
    await renderReaderPdf(browser, publication, server.baseUrl, readerPath);
    const pagination = await imposeBooklet(readerPath, bookletPath, publication);
    const bytes = fs.statSync(bookletPath).size;
    if (bytes < 10000) throw new Error(`${publication.title} booklet is unexpectedly small: ${bytes} bytes.`);
    outputs.push({
      id: publication.id,
      title: publication.title,
      source: publicationSourceMetadata(publication),
      file: publication.filename,
      sha256: hashFile(bookletPath),
      bytes,
      ...pagination,
    });
    console.log(`Rendered ${publication.title}: ${relative(bookletPath)} (${pagination.logicalPages} reader pages, ${pagination.physicalSheets} sheets).`);
  }

  const manifest = {
    schemaVersion: 1,
    releaseVersion: V072_BOOKLET_RELEASE_VERSION,
    status: 'candidate-review-artifact',
    authority: {
      path: 'packages/game-data/current-game.json',
      version: authority.version,
      status: authority.status,
      sha256: hashFile(AUTHORITY_PATH),
    },
    renderContract: {
      readerPage: 'half-letter portrait (5.5 x 8.5 in)',
      bookletSheet: 'letter landscape (11 x 8.5 in)',
      duplexInstruction: 'Print double-sided, flip on the short edge, then fold and saddle stitch.',
      pagePadding: 'Reader page count is padded with blank pages to a multiple of four before imposition.',
    },
    outputs,
  };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote modular booklet manifest: ${relative(MANIFEST_PATH)}.`);
} finally {
  await browser.close();
  await server.close();
  fs.rmSync(publicRoot, { recursive: true, force: true });
  fs.rmSync(temporaryReaders, { recursive: true, force: true });
}
