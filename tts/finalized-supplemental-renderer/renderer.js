import { loadCurrentGame } from '/game-data/current-game.mjs';
import { loadProposalArtwork, proposalFace } from '/card-design/proposal-card.js';
import { capitalLedgerMarkup } from '/card-design/capital-ledger.js';
import { deedCardMarkup } from '/card-design/deed-card.js';

const params = new URLSearchParams(window.location.search);
const componentId = params.get('component') || '';
const side = params.get('side') || 'front';
const target = document.querySelector('#renderTarget');
const PREPARE_TIMEOUT_MS = 10000;

function reportError(error) {
  const message = error?.stack || error?.message || String(error);
  console.error(error);
  document.body.dataset.renderErrorMessage = message;
  document.body.dataset.renderError = 'true';
  target.innerHTML = `<pre class="render-error"></pre>`;
  target.querySelector('.render-error').textContent = message;
}

function waitForImage(image) {
  if (image.complete) {
    if (image.naturalWidth > 0) return Promise.resolve();
    return Promise.reject(new Error(`Image failed to load: ${image.currentSrc || image.src || '(unknown)'}`));
  }
  return new Promise((resolve, reject) => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', () => reject(new Error(`Image failed to load: ${image.currentSrc || image.src || '(unknown)'}`)), { once: true });
  });
}

function doubleFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function waitFor(predicate, label, timeoutMs = PREPARE_TIMEOUT_MS) {
  const started = performance.now();
  while (!predicate()) {
    if (performance.now() - started > timeoutMs) throw new Error(`Timed out waiting for ${label}.`);
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}

async function waitForVisuals() {
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all(Array.from(target.querySelectorAll('img')).map(waitForImage));
  await doubleFrame();
}

function elementOverflows(element) {
  return Boolean(element)
    && (element.scrollWidth > element.clientWidth + 1
      || element.scrollHeight > element.clientHeight + 1);
}

function titleOverflowsHorizontally(title) {
  return Boolean(title) && title.scrollWidth > title.clientWidth + 1;
}

function rectFitsInside(inner, outer, tolerance = 1) {
  const a = inner.getBoundingClientRect();
  const b = outer.getBoundingClientRect();
  return a.left >= b.left - tolerance
    && a.right <= b.right + tolerance
    && a.top >= b.top - tolerance
    && a.bottom <= b.bottom + tolerance;
}

function assertProductionFit(card, label) {
  const interior = card.querySelector('.card-interior');
  const title = card.querySelector('.card-title');
  const rules = card.querySelector('.card-rules');
  const footer = card.querySelector('.card-footer');
  const heading = card.querySelector('.card-heading');
  if (card.hasAttribute('data-art-max') && card.dataset.titleFit !== 'true') {
    throw new Error(`${label} did not pass the production title-fitting check.`);
  }
  if (card.classList.contains('fit-warning')) throw new Error(`${label} still carries the production fit-warning class.`);
  // The shared production fitter deliberately defines title fit by horizontal
  // width. Font glyph metrics can report scrollHeight slightly larger than a
  // sub-1 line-height even when nothing is visually clipped, so do not create a
  // contradictory second vertical criterion here.
  if (titleOverflowsHorizontally(title)) throw new Error(`${label} title is clipped.`);
  if (elementOverflows(rules)) throw new Error(`${label} rules are clipped.`);
  if (interior && footer && footer.getBoundingClientRect().bottom > interior.getBoundingClientRect().bottom + 1) {
    throw new Error(`${label} footer extends beyond the card interior.`);
  }

  if (card.classList.contains('deed-card')) {
    // The approved Deed intentionally overscans a rotated parchment
    // pseudo-element to 145% and clips it inside the interior. That decorative
    // overscan legitimately enlarges scrollHeight. Validate the actual printed
    // content block instead of rejecting the background construction.
    if (interior && heading && !rectFitsInside(heading, interior)) {
      throw new Error(`${label} heading extends beyond the card interior.`);
    }
  } else if (interior && interior.scrollHeight > interior.clientHeight + 1) {
    throw new Error(`${label} card interior is clipped.`);
  }
}

async function prepareProductionCard(card, label) {
  // These cards are inserted after the page's native load event may already have
  // fired. Replay the shared production preparation lifecycle only after the
  // production markup and artwork exist, then wait for its async fitting pass.
  window.dispatchEvent(new Event('load'));
  await waitFor(() => card.dataset.parchmentLoaded !== undefined, `${label} parchment preparation`);
  if (card.dataset.parchmentLoaded !== 'true') throw new Error(`${label} production parchment failed to load.`);

  if (card.hasAttribute('data-art-max')) {
    const interior = card.querySelector('.card-interior');
    await waitFor(
      () => Boolean(interior?.style.getPropertyValue('--art-height')) && card.dataset.titleFit !== undefined,
      `${label} production fitting`,
    );
  }
  await doubleFrame();
  assertProductionFit(card, label);
}

function proposalIdForComponent(component) {
  return String(component.id || '').replace(/^diplomats-proposal-/, '');
}

async function renderProposal(currentGame, component) {
  const proposalId = proposalIdForComponent(component);
  const proposal = (currentGame.proposals || []).find(item => item.id === proposalId);
  if (!proposal) throw new Error(`No current Proposal data matches ${component.id}.`);
  if (proposal.name !== component.name) {
    throw new Error(`Proposal contract mismatch for ${component.id}: ${proposal.name} != ${component.name}.`);
  }

  const ratified = side === 'reverse';
  if (side !== 'front' && side !== 'reverse') throw new Error(`Unsupported Proposal side ${side}.`);
  document.documentElement.dataset.supplementalOrientation = 'portrait';
  target.innerHTML = proposalFace(proposal, ratified, currentGame.displayVersion || currentGame.version);
  const card = target.querySelector('.gauntlet-card');
  if (!card) throw new Error(`Proposal production renderer returned no card for ${component.id}.`);
  card.dataset.componentId = component.id;
  card.dataset.contractComponentId = component.id;
  card.dataset.productionStatus = 'ready';
  await loadProposalArtwork(target);
  if (!ratified && target.querySelector('.proposal-art-pending')) {
    throw new Error(`Final Proposal artwork is missing for ${component.id}.`);
  }
  await waitForVisuals();
  await prepareProductionCard(card, `${component.name} ${ratified ? 'Treaty Article' : 'Proposal'}`);

  if (!ratified) {
    const artImage = card.querySelector('.card-art img');
    if (!artImage) throw new Error(`Final Proposal artwork image is missing for ${component.id}.`);
    if (!window.GauntletArtworkCrop?.apply) throw new Error('Shared artwork crop engine is unavailable in finalized supplemental rendering.');
    window.GauntletArtworkCrop.apply(
      artImage,
      null,
      { id: `proposal-${proposal.id}`, label: proposal.name },
    );
    await doubleFrame();
    if (!artImage.dataset.artCrop) throw new Error(`Proposal artwork crop was not applied for ${component.id}.`);
  }
  assertProductionFit(card, `${component.name} ${ratified ? 'Treaty Article' : 'Proposal'}`);
}

async function renderLedger(currentGame, component) {
  if (side !== 'front' && side !== 'reverse') throw new Error(`Unsupported Capital Ledger side ${side}.`);
  document.documentElement.dataset.supplementalOrientation = 'portrait';
  target.innerHTML = capitalLedgerMarkup(currentGame.displayVersion || currentGame.version);
  const card = target.querySelector('.gauntlet-card');
  if (!card) throw new Error('Capital Ledger production renderer returned no card.');
  card.dataset.componentId = component.id;
  card.dataset.contractComponentId = component.id;
  card.dataset.productionStatus = 'ready';
  await waitForVisuals();
  await prepareProductionCard(card, `Capital Ledger ${side}`);
}

async function renderDeed(component) {
  if (side !== 'front') throw new Error(`Deed Card has no rendered ${side} face; it uses the faction standard back.`);
  document.documentElement.dataset.supplementalOrientation = 'landscape';
  target.innerHTML = deedCardMarkup();
  const card = target.querySelector('.gauntlet-card');
  if (!card) throw new Error('Deed production renderer returned no card.');
  card.dataset.componentId = component.id;
  card.dataset.contractComponentId = component.id;
  card.dataset.productionStatus = 'ready';
  await waitForVisuals();
  await prepareProductionCard(card, 'Financier Deed');
}

async function main() {
  if (!componentId) throw new Error('Missing finalized supplemental component id.');
  const currentGame = await loadCurrentGame();
  window.GAUNTLET_ART_DIRECTION = currentGame.artDirection || {};
  const component = (currentGame.components || []).find(item => item.id === componentId);
  if (!component) throw new Error(`Unknown current supplemental component ${componentId}.`);
  if ((component.designStatus || 'final') !== 'final' || component.productionStatus !== 'export-pending') {
    throw new Error(`${componentId} is not a final export-pending supplemental component.`);
  }

  if (component.family === 'proposal-treaty-card') await renderProposal(currentGame, component);
  else if (component.family === 'ledger') await renderLedger(currentGame, component);
  else if (component.family === 'deed-card') await renderDeed(component);
  else throw new Error(`Finalized supplemental renderer does not support ${component.family} (${component.id}).`);

  document.body.dataset.renderReady = 'true';
}

main().catch(reportError);
