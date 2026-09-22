import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  V072_BOOKLET_AUTHORITY_PREFIX,
  V072_BOOKLET_HERO_WOODCUTS,
  V072_BOOKLET_MANIFEST,
  V072_BOOKLET_OUTPUT_ROOT,
  V072_BOOKLET_RELEASE_VERSION,
  V072_MODULAR_BOOKLETS,
  v072BookletImposition,
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
const REQUIRED_PUBLIC_DIRECTORIES = Object.freeze([
  'assets',
  'images',
  'rules-assistant',
]);
const REQUIRED_MATERIALIZED_ROUTES = new Set([
  '/card-design/',
  '/game-data/',
  '/rulebook/',
]);
const REQUIRED_MATERIALIZED_FILES = new Set([
  '/card-design/face-authority.mjs',
  '/card-design/production-surface.mjs',
]);
const MAX_INTERSTITIAL_PAGES = 3;

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

function validateHeroWoodcuts() {
  if (V072_BOOKLET_HERO_WOODCUTS.length < MAX_INTERSTITIAL_PAGES) {
    throw new Error(`Expected at least ${MAX_INTERSTITIAL_PAGES} hero woodcuts for booklet interstitials.`);
  }
  for (const hero of V072_BOOKLET_HERO_WOODCUTS) {
    const source = path.join(ROOT, hero.source);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
      throw new Error(`Missing booklet hero woodcut: ${hero.source}.`);
    }
  }
}

function copyPublishedRootDependencies(destinationRoot, contract) {
  const publishedDirectories = new Set(contract.pages?.publishedDirectories || []);
  for (const name of REQUIRED_PUBLIC_DIRECTORIES) {
    if (!publishedDirectories.has(name)) {
      throw new Error(`Required booklet runtime directory is outside the public publication boundary: ${name}.`);
    }
    const source = path.join(ROOT, name);
    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
      throw new Error(`Missing booklet runtime directory: ${name}.`);
    }
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

function bookletPublicationContract(contract) {
  return {
    ...contract,
    materializedRoutes: (contract.materializedRoutes || [])
      .filter(route => REQUIRED_MATERIALIZED_ROUTES.has(route.publicPath)),
    materializedFiles: (contract.materializedFiles || [])
      .filter(file => file.publicPath.startsWith('/rulebook/') || REQUIRED_MATERIALIZED_FILES.has(file.publicPath)),
  };
}

function materializeCandidateSite() {
  const destinationRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-v072-booklets-'));
  const contract = loadPublicationBoundary();
  const bookletContract = bookletPublicationContract(contract);
  copyPublishedRootDependencies(destinationRoot, contract);
  materializePublicRoutes({ root: ROOT, destinationRoot, contract: bookletContract, skipMissingSources: false });
  materializePublicFiles({ root: ROOT, destinationRoot, contract: bookletContract, skipMissingSources: false });
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
    const timeout = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
    const content = document.querySelector('.rulebook-content.candidate-publication');
    content?.querySelectorAll('img[loading="lazy"], iframe[loading="lazy"]').forEach(element => {
      element.loading = 'eager';
    });

    await Promise.race([document.fonts?.ready || Promise.resolve(), timeout(10000)]);

    const images = [...(content?.querySelectorAll('img') || [])];
    await Promise.all(images.map(image => image.complete
      ? Promise.resolve()
      : Promise.race([
          new Promise(resolve => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          }),
          timeout(10000),
        ])));

    const frames = [...(content?.querySelectorAll('iframe') || [])];
    await Promise.all(frames.map(frame => frame.contentDocument?.readyState === 'complete'
      ? Promise.resolve()
      : Promise.race([
          new Promise(resolve => frame.addEventListener('load', resolve, { once: true })),
          timeout(10000),
        ])));
  });

  await page.waitForFunction(() => {
    const section = document.querySelector('.card-anatomy-guide');
    if (!section) return true;
    const frames = [...section.querySelectorAll('iframe')];
    return section.classList.contains('markers-positioned')
      && frames.every(frame => frame.contentDocument?.body?.dataset.renderReady === 'true');
  }, null, { timeout: 30000 });

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

function balancedSubset(items, count) {
  if (count <= 0 || items.length === 0) return [];
  if (count >= items.length) return items.slice(0, count);
  if (count === 1) return [items[Math.floor(items.length / 2)]];
  if (count === 2) return [items[0], items.at(-1)];
  return items.slice(0, count);
}

async function prepareInterstitialAnchors(page, publication) {
  const anchors = await page.evaluate(({ publicationId, maximum }) => {
    const content = document.querySelector('.rulebook-content.candidate-publication');
    if (!content) return [];

    let candidates;
    if (publicationId === 'complete-rules') {
      candidates = [...content.querySelectorAll('h2[id]')];
    } else if (publicationId === 'player-guide') {
      candidates = [...content.querySelectorAll('h2[id]')]
        .filter(heading => !heading.classList.contains('how-it-works-heading'));
    } else {
      const preferred = [
        ...content.querySelectorAll('h2.leader-heading'),
        ...content.querySelectorAll('h2.complete-rules-heading'),
      ];
      const preferredSet = new Set(preferred);
      candidates = [
        ...preferred,
        ...[...content.querySelectorAll('h2[id]')].filter(heading => !preferredSet.has(heading)),
      ];
    }

    const unique = [...new Set(candidates)].filter(heading => heading.id);
    if (unique.length === 0) return [];

    const indexes = [];
    const desired = Math.min(maximum, unique.length);
    for (let slot = 1; slot <= desired; slot += 1) {
      const rawIndex = Math.round((slot * (unique.length + 1)) / (desired + 1)) - 1;
      let index = Math.max(0, Math.min(unique.length - 1, rawIndex));
      while (indexes.includes(index) && index + 1 < unique.length) index += 1;
      while (indexes.includes(index) && index - 1 >= 0) index -= 1;
      if (!indexes.includes(index)) indexes.push(index);
    }

    return indexes.sort((a, b) => a - b).map((index, order) => {
      const heading = unique[index];
      heading.classList.add('booklet-interstitial-anchor');
      heading.dataset.bookletInterstitialAnchor = String(order + 1);
      return {
        id: heading.id,
        label: heading.textContent.trim().replace(/#$/, '').trim(),
      };
    });
  }, { publicationId: publication.id, maximum: MAX_INTERSTITIAL_PAGES });

  await page.addStyleTag({ content: `
    @media print {
      .booklet-interstitial-anchor { break-before: page !important; }
      .booklet-woodcut-interstitial {
        height: 7.35in;
        box-sizing: border-box;
        margin: 0;
        padding: 0.28in 0.08in 0.2in;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        break-before: page;
        break-after: page;
        break-inside: avoid;
        border-top: 2px solid #a37338;
        border-bottom: 1px solid #b9b2a7;
        background: #fbf7ee;
      }
      .rulebook-content .booklet-woodcut-interstitial img {
        width: 100%;
        max-width: 4.45in;
        height: auto;
        max-height: 6.55in;
        margin: 0 auto;
        object-fit: contain;
        filter: grayscale(1) contrast(1.12);
        mix-blend-mode: multiply;
        break-inside: avoid;
      }
      .booklet-interstitial-mark {
        margin-top: 0.12in;
        color: #69645d;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
    }
  ` });

  return anchors;
}

async function insertWoodcutInterstitials(page, publication, anchors, count) {
  const selectedAnchors = balancedSubset(anchors, count);
  const publicationIndex = Math.max(0, V072_MODULAR_BOOKLETS.findIndex(item => item.id === publication.id));
  const placements = selectedAnchors.map((anchor, index) => {
    const hero = V072_BOOKLET_HERO_WOODCUTS[(publicationIndex + index) % V072_BOOKLET_HERO_WOODCUTS.length];
    return { ...anchor, heroId: hero.id, heroUrl: hero.publicUrl, heroSource: hero.source };
  });

  await page.evaluate((entries) => {
    for (const entry of entries) {
      const anchor = document.getElementById(entry.id);
      if (!anchor) throw new Error(`Missing interstitial anchor #${entry.id}.`);
      const section = document.createElement('section');
      section.className = 'booklet-woodcut-interstitial';
      section.dataset.bookletHero = entry.heroId;
      section.dataset.bookletAnchor = entry.id;
      section.setAttribute('aria-label', 'Gauntlet woodcut interstitial');

      const image = document.createElement('img');
      image.src = entry.heroUrl;
      image.alt = '';
      image.loading = 'eager';
      image.decoding = 'sync';

      const mark = document.createElement('div');
      mark.className = 'booklet-interstitial-mark';
      mark.textContent = 'Gauntlet';

      section.append(image, mark);
      anchor.before(section);
    }
  }, placements);

  await page.waitForFunction(expected => {
    const interstitials = [...document.querySelectorAll('.booklet-woodcut-interstitial')];
    return interstitials.length === expected
      && interstitials.every(section => {
        const image = section.querySelector('img');
        return image?.complete && image.naturalWidth > 0;
      });
  }, placements.length, { timeout: 30000 });

  return placements.map(({ heroUrl, ...placement }) => placement);
}

async function pdfPageCount(file) {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.load(fs.readFileSync(file));
  return pdf.getPageCount();
}

async function printReaderPdf(page, publication, destination) {
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
}

async function renderReaderPdf(browser, publication, baseUrl, destination) {
  const page = await browser.newPage({ viewport: { width: 1056, height: 1632 }, deviceScaleFactor: 1 });
  const baselinePath = `${destination}.baseline.pdf`;
  try {
    await waitForPublication(page, publication, baseUrl);
    await page.emulateMedia({ media: 'print' });
    const anchors = await prepareInterstitialAnchors(page, publication);
    await printReaderPdf(page, publication, baselinePath);
    const logicalPages = await pdfPageCount(baselinePath);
    const interstitialCount = (4 - (logicalPages % 4)) % 4;

    if (interstitialCount === 0) {
      fs.copyFileSync(baselinePath, destination);
      return { logicalPages, paddedPages: logicalPages, interstitials: [] };
    }
    if (anchors.length < interstitialCount) {
      throw new Error(`${publication.title} needs ${interstitialCount} interstitial pages but exposes only ${anchors.length} semantic anchors.`);
    }

    const interstitials = await insertWoodcutInterstitials(page, publication, anchors, interstitialCount);
    await printReaderPdf(page, publication, destination);
    const paddedPages = await pdfPageCount(destination);
    if (paddedPages !== logicalPages + interstitialCount || paddedPages % 4 !== 0) {
      throw new Error(
        `${publication.title} interstitial pagination drifted: ${logicalPages} logical + ${interstitialCount} interstitials produced ${paddedPages} pages.`,
      );
    }
    return { logicalPages, paddedPages, interstitials };
  } finally {
    fs.rmSync(baselinePath, { force: true });
    await page.close();
  }
}

async function imposeBooklet(readerPath, bookletPath, publication, readerPagination) {
  const { PDFDocument } = await import('pdf-lib');
  const readerBytes = fs.readFileSync(readerPath);
  const reader = await PDFDocument.load(readerBytes);
  const paddedPages = reader.getPageCount();
  if (paddedPages < 4 || paddedPages % 4 !== 0) {
    throw new Error(`${publication.title} reader PDF must already be padded to a multiple of four; found ${paddedPages}.`);
  }
  if (paddedPages !== readerPagination.paddedPages) {
    throw new Error(`${publication.title} reader pagination changed before imposition.`);
  }

  const booklet = await PDFDocument.create();
  booklet.setTitle(`Gauntlet ${V072_BOOKLET_RELEASE_VERSION} ${publication.title}`);
  booklet.setSubject('Gauntlet modular rules booklet');
  booklet.setAuthor('Tymon Scott');
  booklet.setCreator('Gauntlet modular rules publication pipeline');
  booklet.setProducer('Gauntlet modular rules publication pipeline');
  booklet.setCreationDate(BUILD_EPOCH);
  booklet.setModificationDate(BUILD_EPOCH);

  const embedded = await booklet.embedPdf(readerBytes, Array.from({ length: paddedPages }, (_, index) => index));
  const sheets = paddedPages / 4;
  for (let sheet = 0; sheet < sheets; sheet += 1) {
    const order = v072BookletImposition(paddedPages, sheet);
    const front = booklet.addPage([LETTER_LANDSCAPE.width, LETTER_LANDSCAPE.height]);
    front.drawPage(embedded[order.front[0] - 1], { x: 0, y: 0, width: HALF_LETTER.width, height: HALF_LETTER.height });
    front.drawPage(embedded[order.front[1] - 1], { x: HALF_LETTER.width, y: 0, width: HALF_LETTER.width, height: HALF_LETTER.height });

    const back = booklet.addPage([LETTER_LANDSCAPE.width, LETTER_LANDSCAPE.height]);
    back.drawPage(embedded[order.back[0] - 1], { x: 0, y: 0, width: HALF_LETTER.width, height: HALF_LETTER.height });
    back.drawPage(embedded[order.back[1] - 1], { x: HALF_LETTER.width, y: 0, width: HALF_LETTER.width, height: HALF_LETTER.height });
  }

  const bytes = await booklet.save({ useObjectStreams: false });
  fs.writeFileSync(bookletPath, bytes);
  return {
    ...readerPagination,
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
validateHeroWoodcuts();
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
    const readerPagination = await renderReaderPdf(browser, publication, server.baseUrl, readerPath);
    const pagination = await imposeBooklet(readerPath, bookletPath, publication, readerPagination);
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
    console.log(
      `Rendered ${publication.title}: ${relative(bookletPath)} (${pagination.logicalPages} logical pages + ${pagination.interstitials.length} woodcut interstitials, ${pagination.physicalSheets} sheets).`,
    );
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
      pagePadding: 'Reader page count is padded to a multiple of four with deterministic hero-woodcut pages placed preferentially at semantic section boundaries.',
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