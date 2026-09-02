import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCurrentGameAuthority, validateCurrentGameAuthority, CURRENT_GAME_AUTHORITY_SOURCE } from './current-game-authority.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUTPUT = join(ROOT, 'card-design', 'generated', 'proposals');
const PROPOSAL_ART_ROOT = join(ROOT, 'images', 'artwork', 'cards', 'diplomats', 'proposals');
const CARD_WIDTH = 240;
const CARD_HEIGHT = 336;
const EXPECTED_PROPOSALS = 9;
const EXPECTED_FACES = EXPECTED_PROPOSALS * 2;
const MINIMUM_RULE_SCALE = 0.93;

function contentType(path) {
  const extension = extname(path).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.avif': 'image/avif',
  }[extension] || 'application/octet-stream';
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const requestPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const requested = resolve(ROOT, requestPath || 'index.html');
      if (!requested.startsWith(`${ROOT}${sep}`) && requested !== join(ROOT, 'index.html')) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const file = (await stat(requested)).isDirectory() ? join(requested, 'index.html') : requested;
      response.writeHead(200, { 'Content-Type': contentType(file) });
      response.end(await readFile(file));
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.message);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

function expectedRuleText(proposal) {
  return {
    Requirement: proposal.requirement,
    Accepted: proposal.accepted,
    Refused: proposal.refused,
  };
}

async function main() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('Playwright is required.'); }

  const authority = await loadCurrentGameAuthority();
  const sourcePath = CURRENT_GAME_AUTHORITY_SOURCE;
  const source = { proposals: authority.proposals || [] };
  validateCurrentGameAuthority(authority);
  if (source.proposals.length !== EXPECTED_PROPOSALS) {
    throw new Error(`Expected ${EXPECTED_PROPOSALS} current Proposals; found ${source.proposals.length}.`);
  }

  await mkdir(OUTPUT, { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/card-design/?type=proposal#proposal-cards`, { waitUntil: 'load' });
    await page.waitForFunction(expected => (
      document.querySelectorAll('#proposal-cards .component-review-frame').length === expected
    ), EXPECTED_FACES);
    await page.locator('#proposal-cards .component-review-frame').evaluateAll(frames => {
      frames.forEach(frame => { frame.loading = 'eager'; });
    });
    await page.waitForFunction(count => {
      const root = document.querySelector('#proposalReviewSections');
      return root?.dataset.proposalCount === String(count)
        && root?.dataset.proposalAuthority === '/game-data/current-game.json';
    }, EXPECTED_PROPOSALS);
    await page.waitForFunction(() => [...document.querySelectorAll('#proposal-cards .component-review-frame')].every(frame => (
      frame.contentDocument?.body?.dataset.renderReady === 'true'
    )));
    await page.evaluate(async () => document.fonts?.ready);
    await page.waitForTimeout(150);

    const metrics = await page.locator('#proposal-cards .component-review-frame').evaluateAll(frames => frames.flatMap(frame => {
      const doc = frame.contentDocument;
      const card = doc?.querySelector('.proposal-card');
      if (!card) return [];
      const view = doc.defaultView;
      const rect = card.getBoundingClientRect();
      const art = card.querySelector('.card-art')?.getBoundingClientRect();
      const seal = card.querySelector('.proposal-wax-seal');
      const sealRect = seal?.getBoundingClientRect();
      const ruleSections = [...card.querySelectorAll('.rule-section')].map(section => ({
        label: section.querySelector('h4')?.textContent?.trim() || '',
        text: section.querySelector('p')?.textContent?.trim() || '',
      }));
      return [{
        name: card.querySelector('.card-title')?.textContent?.trim() || '',
        type: card.querySelector('.card-footer span:nth-child(2)')?.textContent?.trim() || '',
        version: card.querySelector('.card-footer span:nth-child(3)')?.textContent?.trim() || '',
        stake: Number(card.querySelector('.value-medallion')?.textContent?.trim()),
        width: rect.width,
        height: rect.height,
        artWidth: art?.width || 0,
        artHeight: art?.height || 0,
        fitWarning: card.classList.contains('fit-warning'),
        titleFit: card.dataset.titleFit,
        parchmentLoaded: card.dataset.parchmentLoaded,
        rulesScale: Number.parseFloat(view?.getComputedStyle(card).getPropertyValue('--rules-scale')) || 1,
        pendingArtwork: Boolean(card.querySelector('.proposal-art-pending')),
        ratifiedPanel: Boolean(card.querySelector('.proposal-ratified-panel')),
        sealWidth: sealRect?.width || 0,
        sealHeight: sealRect?.height || 0,
        sealNaturalWidth: seal?.naturalWidth || 0,
        sealNaturalHeight: seal?.naturalHeight || 0,
        ruleSections,
      }];
    }));

    if (metrics.length !== EXPECTED_FACES) {
      throw new Error(`Expected ${EXPECTED_FACES} Proposal/Treaty Article faces, found ${metrics.length}.`);
    }

    for (const proposal of source.proposals) {
      const faces = metrics.filter(metric => metric.name === proposal.name);
      if (faces.length !== 2) {
        throw new Error(`Expected a Proposal/Treaty Article pair for ${proposal.name}: ${JSON.stringify(faces)}.`);
      }
      const proposalFace = faces.find(face => face.type === 'Proposal');
      const treatyFace = faces.find(face => face.type === 'Treaty Article');
      if (!proposalFace || !treatyFace) {
        throw new Error(`Proposal pair is mislabeled for ${proposal.name}: ${JSON.stringify(faces)}.`);
      }

      for (const face of faces) {
        if (face.stake !== proposal.stake) {
          throw new Error(`Stake mismatch for ${proposal.name}: ${JSON.stringify(face)}.`);
        }
        if (face.version !== authority.displayVersion) {
          throw new Error(`Current-game version footer missing for ${proposal.name}: ${JSON.stringify(face)}.`);
        }
        if (Math.abs(face.width - CARD_WIDTH) > 0.25 || Math.abs(face.height - CARD_HEIGHT) > 0.25) {
          throw new Error(`Unexpected production card dimensions for ${proposal.name}: ${JSON.stringify(face)}.`);
        }
        if (face.fitWarning || face.titleFit !== 'true' || face.parchmentLoaded !== 'true') {
          throw new Error(`Proposal face does not fit or load correctly: ${JSON.stringify(face)}.`);
        }
        if (face.rulesScale < MINIMUM_RULE_SCALE - 0.001) {
          throw new Error(`Proposal typography fell below the readability floor: ${JSON.stringify(face)}.`);
        }
        if (face.artWidth <= 0 || face.artHeight <= 0) {
          throw new Error(`Proposal artwork field collapsed: ${JSON.stringify(face)}.`);
        }

        const renderedRules = Object.fromEntries(face.ruleSections.map(section => [section.label, section.text]));
        const expected = expectedRuleText(proposal);
        for (const [label, text] of Object.entries(expected)) {
          if (renderedRules[label] !== text) {
            throw new Error(`${proposal.name} ${face.type} ${label} text drifted: ${JSON.stringify({ expected: text, actual: renderedRules[label] })}.`);
          }
        }
      }

      const hasApprovedArtwork = existsSync(join(PROPOSAL_ART_ROOT, `${proposal.id}.png`));
      if (proposalFace.pendingArtwork === hasApprovedArtwork || proposalFace.ratifiedPanel) {
        throw new Error(`Unratified Proposal face has the wrong artwork state for ${proposal.name}: ${JSON.stringify({ hasApprovedArtwork, proposalFace })}.`);
      }
      if (treatyFace.pendingArtwork || !treatyFace.ratifiedPanel) {
        throw new Error(`Treaty Article face has the wrong ratified artwork state for ${proposal.name}: ${JSON.stringify(treatyFace)}.`);
      }
      if (treatyFace.sealWidth <= 0 || treatyFace.sealHeight <= 0 || treatyFace.sealNaturalWidth <= 0 || treatyFace.sealNaturalHeight <= 0) {
        throw new Error(`Treaty Article wax seal failed to render for ${proposal.name}: ${JSON.stringify(treatyFace)}.`);
      }
    }

    await page.locator('#proposal-cards').screenshot({
      path: join(OUTPUT, 'diplomat-proposal-card-review.png'),
    });
    console.log(JSON.stringify({
      authority: CURRENT_GAME_AUTHORITY_SOURCE,
      source: sourcePath,
      sourceIssue: source.source_issue,
      metrics,
    }, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
