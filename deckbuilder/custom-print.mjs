const deckbuilder = window.GAUNTLET_DECKBUILDER;
if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");

const productionPrint = () => {
  const renderer = deckbuilder.feature("productionPrintRenderer");
  if (!renderer) throw new Error("Deckbuilder production print renderer is unavailable.");
  return renderer;
};

const CUSTOM_PRINT_STYLE_URL = "custom-print.css?v=20260823-2";
const CARDS_PER_SHEET = 9;
const COLUMNS = 3;
const MAX_QUANTITY = 99;
const RENDER_TIMEOUT_MS = 30000;
const BACK_VARIANTS = new Set(["military", "diplomats", "financiers", "intelligence", "mystics", "inquisition"]);
const CATEGORY_ORDER = ["Playable card", "Territory", "Leader", "Reference", "Tracker", "Capital Ledger", "Deed", "Proposal / Treaty", "Rite", "Ritual", "Supplemental card"];

let installed = false;
let catalog = [];
let catalogByKey = new Map();
const queue = new Map();
const ui = {};

export function installCustomPrintMode() {
  if (installed) return;
  installed = true;
  ensureStylesheet();

  const details = document.querySelector(".advanced-tools");
  const grid = details?.querySelector(".advanced-tools-grid");
  if (!details || !grid) return;

  const toggleSection = document.createElement("section");
  toggleSection.className = "custom-print-toggle-card";
  toggleSection.innerHTML = `
    <h3>Custom printing</h3>
    <p class="muted">Build print sheets from any current card without creating or validating a playable Deck.</p>
    <button id="customPrintModeToggle" type="button" class="secondary">Enable custom printing</button>`;
  grid.append(toggleSection);

  const workspace = document.createElement("section");
  workspace.id = "customPrintWorkspace";
  workspace.className = "custom-print-workspace";
  workspace.hidden = true;
  workspace.innerHTML = `
    <div class="custom-print-workspace-header">
      <div>
        <h3>Custom print sheets</h3>
        <p class="muted">Choose any physical cards in any quantities. Deck construction and validation rules do not apply. Intrinsically double-sided cards automatically receive their real reverse face.</p>
      </div>
      <button id="customPrintDisable" type="button" class="secondary">Close custom printing</button>
    </div>
    <div class="custom-print-filters">
      <label>Search cards<input id="customPrintSearch" type="search" placeholder="Name, type, or faction" /></label>
      <label>Card type<select id="customPrintTypeFilter"><option value="all">All card types</option></select></label>
      <label>Faction<select id="customPrintFactionFilter"><option value="all">All factions</option></select></label>
    </div>
    <div class="custom-print-layout">
      <section class="custom-print-pane">
        <div class="custom-print-pane-heading"><h4>Card selector</h4><span><span id="customPrintCatalogCount" class="pill">0</span> <button id="customPrintAddAll" type="button" class="text-button" title="Add all currently visible cards">Add all</button></span></div>
        <div id="customPrintCatalog" class="custom-print-catalog"><div class="custom-print-empty">Enable custom printing to load the current card catalog.</div></div>
      </section>
      <section class="custom-print-pane">
        <div class="custom-print-pane-heading"><h4>Selected for printing</h4><button id="customPrintClear" type="button" class="text-button danger">Clear</button></div>
        <div id="customPrintSelection" class="custom-print-selection"><div class="custom-print-empty">No cards selected yet.</div></div>
      </section>
    </div>
    <div class="custom-print-options">
      <label class="custom-print-checkbox"><input id="customPrintStandardBacks" type="checkbox" /><span>Include standard card backs for duplex printing</span></label>
      <label>Standard back style
        <select id="customPrintBackStyle" disabled>
          <option value="per-card">Use canonical card backs</option>
          <option value="intelligence">Black / Intelligence</option>
          <option value="military">Military</option>
          <option value="diplomats">Diplomats</option>
          <option value="financiers">Financiers</option>
          <option value="mystics">Mystics</option>
          <option value="inquisition">Inquisition</option>
        </select>
      </label>
      <button id="customPrintOpen" type="button" disabled>Print custom sheets</button>
    </div>
    <p id="customPrintSummary" class="custom-print-summary">0 physical cards selected.</p>
    <p id="customPrintStatus" class="custom-print-summary custom-print-status" aria-live="polite"></p>`;
  details.append(workspace);

  for (const id of ["customPrintModeToggle", "customPrintDisable", "customPrintWorkspace", "customPrintSearch", "customPrintTypeFilter", "customPrintFactionFilter", "customPrintCatalogCount", "customPrintAddAll", "customPrintCatalog", "customPrintSelection", "customPrintClear", "customPrintStandardBacks", "customPrintBackStyle", "customPrintOpen", "customPrintSummary", "customPrintStatus"]) {
    ui[id] = document.getElementById(id);
  }

  ui.customPrintModeToggle.addEventListener("click", toggleCustomPrinting);
  ui.customPrintDisable.addEventListener("click", disableCustomPrinting);
  ui.customPrintSearch.addEventListener("input", renderCatalog);
  ui.customPrintTypeFilter.addEventListener("change", renderCatalog);
  ui.customPrintFactionFilter.addEventListener("change", renderCatalog);
  ui.customPrintAddAll.addEventListener("click", addVisibleCards);
  ui.customPrintCatalog.addEventListener("click", handleCatalogClick);
  ui.customPrintSelection.addEventListener("click", handleSelectionClick);
  ui.customPrintSelection.addEventListener("change", handleSelectionChange);
  ui.customPrintClear.addEventListener("click", () => { queue.clear(); renderSelection(); });
  ui.customPrintStandardBacks.addEventListener("change", () => {
    ui.customPrintBackStyle.disabled = !ui.customPrintStandardBacks.checked;
    updateSummary();
  });
  ui.customPrintBackStyle.addEventListener("change", updateSummary);
  ui.customPrintOpen.addEventListener("click", openCustomPrintSheets);
}

function ensureStylesheet() {
  if (document.querySelector('link[data-gauntlet-custom-print]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = CUSTOM_PRINT_STYLE_URL;
  link.dataset.gauntletCustomPrint = "true";
  document.head.append(link);
}

async function toggleCustomPrinting() {
  if (!ui.customPrintWorkspace.hidden) {
    disableCustomPrinting();
    return;
  }
  await enableCustomPrinting();
}

async function enableCustomPrinting() {
  ui.customPrintModeToggle.disabled = true;
  ui.customPrintModeToggle.textContent = "Loading card catalog…";
  setStatus("");
  try {
    if (!catalog.length) await loadCatalog();
    ui.customPrintWorkspace.hidden = false;
    ui.customPrintModeToggle.textContent = "Disable custom printing";
    renderCatalog();
    renderSelection();
    ui.customPrintWorkspace.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.error(error);
    setStatus(`Unable to load the custom print catalog: ${error.message}`, "error");
    ui.customPrintModeToggle.textContent = "Enable custom printing";
  } finally {
    ui.customPrintModeToggle.disabled = false;
  }
}

function disableCustomPrinting() {
  ui.customPrintWorkspace.hidden = true;
  ui.customPrintModeToggle.textContent = "Enable custom printing";
}

async function loadCatalog() {
  let game = deckbuilder.state.currentGameData;
  if (!game?.componentContract) game = await deckbuilder.bootstrap();
  if (!game?.cards?.length || !game?.territories?.length || !game?.leaders?.length) throw new Error("Current-game card authority is incomplete.");
  catalog = buildCatalog(game);
  catalogByKey = new Map(catalog.map(entry => [entry.key, entry]));
  populateFilters();
  if (!catalog.length) throw new Error("No printable card faces were found.");
}

function buildCatalog(game) {
  const factionNames = new Map((game.factions || []).map(faction => [faction.id, faction.name]));
  factionNames.set("neutral", "Neutral");
  factionNames.set("shared", "Shared");
  const entries = [];

  for (const card of game.cards || []) {
    const faction = slugify(card.allegiance || "neutral") || "neutral";
    entries.push(makeEntry(`card:${card.id}`, card.name, "Playable card", faction, factionNames.get(faction) || card.allegiance || faction, "portrait", "standardBack", { surface: "card", id: card.id }));
  }
  for (const territory of game.territories || []) {
    entries.push(makeEntry(`territory:${territory.id}`, territory.name, "Territory", "neutral", "Neutral", "landscape", "standardBack", { surface: "territory", id: territory.id }));
  }
  for (const leader of game.leaders || []) {
    const faction = leader.faction || "shared";
    entries.push(makeEntry(`leader:${faction}:${leader.id}`, leader.name, "Leader", faction, factionNames.get(faction) || faction, "portrait", "standardBack", { surface: "leader", id: `${faction}-${leader.id}` }));
  }

  const contractComponents = [
    ...(game.sharedComponents || []).filter(component => component.cardLike),
    ...(game.components || []).filter(component => component.cardLike),
  ];
  for (const component of contractComponents) {
    const entry = componentCatalogEntry(component, factionNames);
    if (entry) entries.push(entry);
  }

  const categoryIndex = category => {
    const index = CATEGORY_ORDER.indexOf(category);
    return index < 0 ? CATEGORY_ORDER.length : index;
  };
  return entries.filter(entry => entry?.name && entry?.render?.id).sort((a, b) => categoryIndex(a.category) - categoryIndex(b.category) || a.factionLabel.localeCompare(b.factionLabel) || a.name.localeCompare(b.name));
}

function makeEntry(key, name, category, faction, factionLabel, orientation, backPolicy, render) {
  return { key, name, category, faction, factionLabel, orientation, backPolicy, render };
}

function componentCatalogEntry(component, factionNames) {
  if ((component.designStatus || "final") === "placeholder") return null;

  let descriptor;
  try {
    descriptor = productionPrint().componentDescriptor(component.id);
  } catch {
    return null;
  }

  const faction = component.faction || descriptor.faction || "shared";
  return makeEntry(
    `component:${component.id}`,
    component.name,
    componentCategory(component),
    faction,
    factionNames.get(faction) || (faction === "shared" ? "Shared" : faction),
    descriptor.orientation || "portrait",
    descriptor.backPolicy || "standardBack",
    { surface: "component", id: component.id },
  );
}

function componentCategory(component) {
  if (component.id === "financiers-capital-ledger" || component.family === "ledger") return "Capital Ledger";
  if (component.id === "financiers-deed" || component.family === "deed-card") return "Deed";
  if (component.family === "reference-card") return "Reference";
  if (component.family === "tracker") return "Tracker";
  if (component.family === "proposal-treaty-card") return "Proposal / Treaty";
  if (component.family === "rite-card") return "Rite";
  if (component.family === "ritual-card") return "Ritual";
  return "Supplemental card";
}

function populateFilters() {
  const categories = [...new Set(catalog.map(entry => entry.category))].sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));
  ui.customPrintTypeFilter.innerHTML = `<option value="all">All card types</option>${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  const factions = [...new Map(catalog.map(entry => [entry.faction, entry.factionLabel])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  ui.customPrintFactionFilter.innerHTML = `<option value="all">All factions</option>${factions.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}`;
}

function visibleCatalogEntries() {
  const search = normalize(ui.customPrintSearch.value);
  const type = ui.customPrintTypeFilter.value;
  const faction = ui.customPrintFactionFilter.value;
  return catalog.filter(entry => (type === "all" || entry.category === type) && (faction === "all" || entry.faction === faction) && (!search || normalize(`${entry.name} ${entry.category} ${entry.factionLabel}`).includes(search)));
}

function updateAddAllButton(visible = visibleCatalogEntries()) {
  if (!ui.customPrintAddAll) return;
  ui.customPrintAddAll.disabled = !visible.length || visible.every(entry => queue.has(entry.key));
}

function renderCatalog() {
  if (!catalog.length) return;
  const visible = visibleCatalogEntries();
  ui.customPrintCatalogCount.textContent = String(visible.length);
  ui.customPrintCatalog.innerHTML = visible.length ? visible.map(entry => `
    <article class="custom-print-row">
      <div class="custom-print-row-title"><strong>${escapeHtml(entry.name)}</strong><span class="custom-print-row-meta">${escapeHtml(entry.category)} · ${escapeHtml(entry.factionLabel)}${entry.orientation === "landscape" ? " · Landscape" : ""}${intrinsicReverse(entry) ? " · Double-sided" : ""}</span></div>
      <button type="button" class="secondary custom-print-add" data-custom-print-add="${escapeHtml(entry.key)}">Add</button>
    </article>`).join("") : `<div class="custom-print-empty">No current cards match these filters.</div>`;
  updateAddAllButton(visible);
}

function renderSelection() {
  const selected = [...queue.entries()].map(([key, quantity]) => ({ entry: catalogByKey.get(key), quantity })).filter(item => item.entry && item.quantity > 0);
  ui.customPrintSelection.innerHTML = selected.length ? selected.map(({ entry, quantity }) => `
    <article class="custom-print-row">
      <div class="custom-print-row-title"><strong>${escapeHtml(entry.name)}</strong><span class="custom-print-row-meta">${escapeHtml(entry.category)} · ${escapeHtml(entry.factionLabel)}</span></div>
      <div class="custom-print-quantity">
        <button type="button" class="secondary" data-custom-print-step="-1" data-custom-print-key="${escapeHtml(entry.key)}">−</button>
        <input type="number" min="1" max="${MAX_QUANTITY}" value="${quantity}" data-custom-print-quantity="${escapeHtml(entry.key)}" aria-label="Quantity of ${escapeHtml(entry.name)}" />
        <button type="button" class="secondary" data-custom-print-step="1" data-custom-print-key="${escapeHtml(entry.key)}">+</button>
        <button type="button" class="text-button custom-print-remove" data-custom-print-remove="${escapeHtml(entry.key)}">Remove</button>
      </div>
    </article>`).join("") : `<div class="custom-print-empty">No cards selected yet.</div>`;
  updateAddAllButton();
  updateSummary();
}

function addVisibleCards() {
  const visible = visibleCatalogEntries();
  let changed = false;
  for (const entry of visible) {
    if (queue.has(entry.key)) continue;
    queue.set(entry.key, 1);
    changed = true;
  }
  if (changed) renderSelection(); else updateAddAllButton(visible);
}

function handleCatalogClick(event) {
  const button = event.target.closest("[data-custom-print-add]");
  if (!button) return;
  const key = button.dataset.customPrintAdd;
  if (!catalogByKey.has(key)) return;
  queue.set(key, Math.min(MAX_QUANTITY, (queue.get(key) || 0) + 1));
  renderSelection();
}

function handleSelectionClick(event) {
  const remove = event.target.closest("[data-custom-print-remove]");
  if (remove) {
    queue.delete(remove.dataset.customPrintRemove);
    renderSelection();
    return;
  }
  const step = event.target.closest("[data-custom-print-step]");
  if (!step) return;
  const key = step.dataset.customPrintKey;
  const next = Math.min(MAX_QUANTITY, Math.max(0, (queue.get(key) || 0) + (Number.parseInt(step.dataset.customPrintStep, 10) || 0)));
  if (next) queue.set(key, next); else queue.delete(key);
  renderSelection();
}

function handleSelectionChange(event) {
  const input = event.target.closest("[data-custom-print-quantity]");
  if (!input) return;
  const quantity = Math.min(MAX_QUANTITY, Math.max(1, Number.parseInt(input.value, 10) || 1));
  queue.set(input.dataset.customPrintQuantity, quantity);
  input.value = String(quantity);
  updateSummary();
}

function expandedSelection() {
  return [...queue.entries()].flatMap(([key, quantity]) => {
    const entry = catalogByKey.get(key);
    return entry ? Array.from({ length: quantity }, () => entry) : [];
  });
}

function updateSummary() {
  const cards = expandedSelection();
  const frontSheets = Math.ceil(cards.length / CARDS_PER_SHEET);
  const includeStandardBacks = Boolean(ui.customPrintStandardBacks.checked);
  let backSheets = 0;
  for (let offset = 0; offset < cards.length; offset += CARDS_PER_SHEET) {
    const page = cards.slice(offset, offset + CARDS_PER_SHEET);
    if (page.some(entry => intrinsicReverse(entry) || (includeStandardBacks && entry.backPolicy === "standardBack"))) backSheets += 1;
  }
  const pages = frontSheets + backSheets;
  ui.customPrintOpen.disabled = cards.length === 0;
  ui.customPrintSummary.textContent = cards.length ? `${cards.length} physical card${cards.length === 1 ? "" : "s"} · ${frontSheets} front sheet${frontSheets === 1 ? "" : "s"} · ${pages} print page${pages === 1 ? "" : "s"}${backSheets ? ` (${backSheets} reverse)` : ""}.` : "0 physical cards selected.";
}

function openCustomPrintSheets() {
  const cards = expandedSelection();
  if (!cards.length) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.alert("Popup blocked. Allow popups to print custom card sheets.");
    return;
  }
  printWindow.document.write(buildCustomPrintDocument(cards, Boolean(ui.customPrintStandardBacks.checked), ui.customPrintBackStyle.value || "per-card"));
  printWindow.document.close();
  printWindow.focus();
}

function buildCustomPrintDocument(cards, includeStandardBacks, backStyle) {
  const sheets = [];
  for (let offset = 0, sheetIndex = 0; offset < cards.length; offset += CARDS_PER_SHEET, sheetIndex += 1) {
    const pageCards = cards.slice(offset, offset + CARDS_PER_SHEET);
    const pair = `custom-sheet-${sheetIndex + 1}`;
    sheets.push({ side: "front", pair, cards: pageCards });
    if (pageCards.some(entry => intrinsicReverse(entry) || (includeStandardBacks && entry.backPolicy === "standardBack"))) sheets.push({ side: "back", pair, cards: pageCards });
  }
  const frontCount = sheets.filter(sheet => sheet.side === "front").length;
  const reverseCount = sheets.length - frontCount;
  const pages = sheets.map((sheet, index) => customPageHtml(sheet, includeStandardBacks, backStyle, index === sheets.length - 1)).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex,nofollow" /><title>Gauntlet — Custom Print Sheets</title>
<style>
*{box-sizing:border-box;font-synthesis:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}body{margin:0;background:#eee;color:#111;font-family:Arial,Helvetica,sans-serif}.print-toolbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.65rem 1rem;background:#fff;border-bottom:1px solid #ccc;font-size:14px}.print-toolbar-copy{display:grid;gap:.12rem}.print-toolbar-note{font-size:12px;color:#555}.print-toolbar button{padding:.45rem .8rem;border:1px solid #222;border-radius:.25rem;background:#222;color:#fff;font:inherit;font-weight:800;cursor:pointer}.print-toolbar button:disabled{opacity:.5;cursor:wait}.card-page{width:7.5in;height:10.5in;margin:.25in auto;background:#fff;break-after:page;page-break-after:always;overflow:hidden}.card-page.last-page{break-after:auto;page-break-after:auto}.card-table{width:7.5in;height:10.5in;border-collapse:collapse;border-spacing:0;table-layout:fixed}.card-table td{width:2.5in;height:3.5in;padding:0;border:0;vertical-align:top;overflow:hidden}.custom-card-slot{position:relative;width:2.5in;height:3.5in;overflow:hidden}.custom-render-frame,.custom-back-frame{display:block;width:2.5in;height:3.5in;margin:0;padding:0;border:0;overflow:hidden;background:transparent}.custom-landscape-rotate{position:absolute;top:0;left:2.5in;width:3.5in;height:2.5in;transform:rotate(90deg);transform-origin:top left}.custom-landscape-rotate .custom-render-frame{width:3.5in;height:2.5in}@page{size:letter portrait;margin:.25in}@media print{body{background:#fff}.print-toolbar{display:none!important}.card-page{margin:0 auto}}
</style></head><body>
<div class="print-toolbar"><div class="print-toolbar-copy"><strong>${cards.length} physical cards · ${frontCount} front sheets · ${sheets.length} print pages</strong><span id="customSheetStatus" class="print-toolbar-note">Loading finalized production card faces…</span></div><button id="customSheetPrintButton" type="button" disabled>Print / Save PDF</button></div>
${pages}
<script>
(() => {
  const timeoutMs=${RENDER_TIMEOUT_MS};const frames=[...document.querySelectorAll('[data-custom-render-frame]')];const status=document.getElementById('customSheetStatus');const button=document.getElementById('customSheetPrintButton');const delay=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  function frameState(frame){try{const doc=frame.contentDocument;if(!doc)return{ready:false,error:''};if(frame.dataset.customRenderKind==='back')return{ready:doc.readyState==='complete'&&Boolean(doc.querySelector('.gauntlet-card-back__frame')),error:''};const body=doc.body;if(body?.dataset.renderReady==='error')return{ready:false,error:body.dataset.renderErrorMessage||'A production card face failed to render.'};return{ready:body?.dataset.renderReady==='true',error:''}}catch(error){return{ready:false,error:error.message||String(error)}}}
  async function waitForFrames(){const deadline=performance.now()+timeoutMs;while(performance.now()<deadline){const states=frames.map(frameState);const failure=states.find(state=>state.error);if(failure)throw new Error(failure.error);if(states.every(state=>state.ready))return;await delay(25)}throw new Error('Timed out waiting for one or more production card faces.')}
  async function preloadFrameAssets(){const urls=new Set();await Promise.all(frames.map(async frame=>{const doc=frame.contentDocument;if(!doc)return;if(doc.fonts?.ready)await doc.fonts.ready;for(const node of doc.querySelectorAll('.gauntlet-card, .reference-card-interior, [data-parchment-loaded="true"]')){const background=frame.contentWindow?.getComputedStyle(node)?.backgroundImage||'';for(const match of background.matchAll(/url\\(["']?([^"')]+)["']?\\)/g)){try{urls.add(new URL(match[1],doc.baseURI).href)}catch(error){}}}}));await Promise.all([...urls].map(src=>new Promise(resolve=>{const image=new Image();image.onload=resolve;image.onerror=resolve;image.src=src})))}
  (async()=>{try{if(!frames.length)throw new Error('No production card frames were created.');await waitForFrames();await preloadFrameAssets();status.textContent='${reverseCount ? "Production faces loaded. For paired pages, enable two-sided printing and flip on the long edge." : "Production faces loaded and ready to print."}';button.disabled=false;button.addEventListener('click',()=>window.print());document.body.dataset.renderReady='true'}catch(error){console.error(error);status.textContent='Printing stopped: '+error.message;document.body.dataset.renderReady='error'}})();
})();
<\/script></body></html>`;
}

function customPageHtml(sheet, includeStandardBacks, backStyle, isLast) {
  const cells = Array.from({ length: CARDS_PER_SHEET }, () => "");
  sheet.cards.forEach((entry, frontIndex) => {
    const targetIndex = sheet.side === "front" ? frontIndex : mirrorIndexForLongEdge(frontIndex);
    cells[targetIndex] = sheet.side === "front" ? cardFrameHtml(entry, "front") : reverseCellHtml(entry, includeStandardBacks, backStyle);
  });
  const rows = Array.from({ length: 3 }, (_, row) => `<tr>${cells.slice(row * COLUMNS, row * COLUMNS + COLUMNS).map(cell => `<td><div class="custom-card-slot">${cell}</div></td>`).join("")}</tr>`).join("");
  return `<section class="card-page custom-${sheet.side}-page${isLast ? " last-page" : ""}" data-duplex-pair="${escapeHtml(sheet.pair)}"><table class="card-table" role="presentation"><tbody>${rows}</tbody></table></section>`;
}

function reverseCellHtml(entry, includeStandardBacks, backStyle) {
  if (intrinsicReverse(entry)) return cardFrameHtml(entry, "reverse");
  if (includeStandardBacks && entry.backPolicy === "standardBack") return backFrameHtml(backFactionForEntry(entry, backStyle));
  return "";
}

function cardFrameHtml(entry, side) {
  const renderer = productionPrint();
  let src;
  if (entry.render.surface === "card") {
    src = renderer.cardSource(entry.render.id);
  } else if (entry.render.surface === "territory") {
    src = renderer.territorySource(entry.render.id);
  } else if (entry.render.surface === "leader") {
    src = renderer.frameSource({
      kind: "leader",
      id: entry.render.id,
      side,
      orientation: entry.orientation,
    });
  } else {
    src = renderer.componentSource(entry.render.id, side);
  }

  const frame = `<iframe class="custom-render-frame" data-custom-render-frame data-custom-render-kind="face" src="${escapeHtml(src)}" title="${escapeHtml(`${entry.name} ${side} production render`)}" scrolling="no" loading="eager"></iframe>`;
  return entry.orientation === "landscape" ? `<div class="custom-landscape-rotate">${frame}</div>` : frame;
}

function backFrameHtml(faction) {
  const safeFaction = BACK_VARIANTS.has(faction) ? faction : "intelligence";
  const src = productionPrint().backSource(safeFaction, 180);
  return `<iframe class="custom-back-frame" data-custom-render-frame data-custom-render-kind="back" src="${escapeHtml(src)}" title="${escapeHtml(safeFaction)} card back" scrolling="no" loading="eager"></iframe>`;
}
function canonicalBackFactionForEntry(entry) {
  if (entry.render.surface === "card" || entry.render.surface === "territory") return "intelligence";
  return BACK_VARIANTS.has(entry.faction) ? entry.faction : "intelligence";
}
function backFactionForEntry(entry, selected) {
  if (selected && selected !== "per-card" && BACK_VARIANTS.has(selected)) return selected;
  return canonicalBackFactionForEntry(entry);
}
function intrinsicReverse(entry) { return entry.backPolicy === "twoSided" || entry.backPolicy === "specialBack"; }
function mirrorIndexForLongEdge(index) { const row = Math.floor(index / COLUMNS); const column = index % COLUMNS; return row * COLUMNS + (COLUMNS - 1 - column); }
function setStatus(message, kind = "") { if (!ui.customPrintStatus) return; ui.customPrintStatus.textContent = message; ui.customPrintStatus.className = `custom-print-summary custom-print-status${kind ? ` ${kind}` : ""}`; }
function normalize(value) { return String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim(); }
function slugify(value) { return String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
