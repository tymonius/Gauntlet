import { elementFromMarkup, esc } from './common.mjs';

function ledgerRows(count) {
  return Array.from({ length: count }, () => `
    <div class="capital-ledger-row capital-ledger-row--blank" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>`).join('');
}

export function render(spec) {
  const content = spec.content;
  const component = content.component;
  const example = content.exampleEntry;
  const version = spec.provenance.displayVersion || 'Current';
  const element = elementFromMarkup(`
    <article class="gauntlet-card faction-component-card reference-card capital-ledger-card"
      data-faction="${esc(spec.faction)}"
      data-component-id="${esc(component.id)}"
      data-contract-component-id="${esc(component.id)}"
      aria-label="${esc(spec.label)}">
      <div class="reference-card-interior capital-ledger-interior">
        <header class="reference-card-header capital-ledger-header">
          <div class="capital-ledger-faction-line"><span class="reference-faction-emblem" aria-hidden="true"></span><span>Financiers</span></div>
          <h3 class="reference-face-title">${esc(component.name)}</h3>
        </header>
        <div class="reference-body capital-ledger-body">
          <div class="capital-ledger-grid" role="table" aria-label="Capital transaction ledger">
            <div class="capital-ledger-row capital-ledger-row--head" role="row">
              <span role="columnheader">Entry</span><span role="columnheader">±</span><span role="columnheader">Balance</span>
            </div>
            <div class="capital-ledger-row capital-ledger-row--opening" role="row">
              <span role="cell">Opening Balance</span><span role="cell"></span><span role="cell">${Number(content.openingBalance)}</span>
            </div>
            <div class="capital-ledger-row capital-ledger-row--example" role="row" aria-label="Example entry">
              <span role="cell">${esc(example.label)}</span><span role="cell">${example.delta >= 0 ? '+' : ''} ${Number(example.delta)}</span><span role="cell">${Number(example.balance)}</span>
            </div>
            ${ledgerRows(Number(content.blankRows) || 0)}
          </div>
        </div>
        <footer class="card-footer"><span>Financiers</span><span>Ledger</span><span>${esc(version)}</span></footer>
      </div>
    </article>`
  );
  element.dataset.faceId = spec.id;
  element.dataset.faceTemplate = spec.template;
  return { element };
}
