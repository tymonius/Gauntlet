import { loadCurrentGame } from '/game-data/current-game.mjs';
import { loadProposalArtwork, proposalFace } from '/card-design/proposal-card.js';
import { capitalLedgerMarkup } from '/card-design/capital-ledger.js';
import { deedCardMarkup, hydrateDeedDivider } from '/card-design/deed-card.js';

const params = new URLSearchParams(window.location.search);
const componentId = params.get('component') || '';
const side = params.get('side') || 'front';
const target = document.querySelector('#renderTarget');

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

async function waitForVisuals() {
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all(Array.from(target.querySelectorAll('img')).map(waitForImage));
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function proposalIdForComponent(component) {
  return String(component.id || '').replace(/^diplomats-proposal-/, '');
}

async function renderProposal(currentGame, component) {
  const proposalId = proposalIdForComponent(component);
  const proposal = (currentGame.proposals || []).find(item => item.id === proposalId);
  if (!proposal) throw new Error(`No current Proposal data matches ${component.id}.`);
  if (proposal.name !== component.name) {
    throw new Error(`Proposal contract mismatch for ${component.id}: ${component.name} != ${proposal.name}.`);
  }

  const ratified = side === 'reverse';
  if (side !== 'front' && side !== 'reverse') throw new Error(`Unsupported Proposal side ${side}.`);
  document.documentElement.dataset.supplementalOrientation = 'portrait';
  target.innerHTML = proposalFace(proposal, ratified, currentGame.displayVersion || currentGame.version);
  const card = target.querySelector('.gauntlet-card');
  card.dataset.componentId = component.id;
  card.dataset.contractComponentId = component.id;
  card.dataset.productionStatus = 'ready';
  await loadProposalArtwork(target);
  await waitForVisuals();
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
}

async function renderDeed(component) {
  if (side !== 'front') throw new Error(`Deed Card has no rendered ${side} face; it uses the faction standard back.`);
  document.documentElement.dataset.supplementalOrientation = 'landscape';
  target.innerHTML = deedCardMarkup();
  hydrateDeedDivider(target);
  const card = target.querySelector('.gauntlet-card');
  if (!card) throw new Error('Deed production renderer returned no card.');
  card.dataset.componentId = component.id;
  card.dataset.contractComponentId = component.id;
  card.dataset.productionStatus = 'ready';
  await waitForVisuals();
}

async function main() {
  if (!componentId) throw new Error('Missing finalized supplemental component id.');
  const currentGame = await loadCurrentGame();
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
