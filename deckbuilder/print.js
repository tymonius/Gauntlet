(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const { state } = deckbuilder;
  const getFaction = () => deckbuilder.getFaction();
  const deckEntries = () => deckbuilder.deckEntries();
  const validateDeck = () => deckbuilder.validate();
  const escapeHtml = value => deckbuilder.escapeHtml(value);
  const territoriesApi = () => deckbuilder.feature("territories");
  const ritesApi = () => deckbuilder.feature("mysticsRites");
  const productionPrint = () => {
    const renderer = deckbuilder.feature("productionPrintRenderer");
    if (!renderer) throw new Error("Deckbuilder production print renderer is unavailable.");
    return renderer;
  };

  const PRINT_FONT_LINKS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700;800;900&display=block" rel="stylesheet">`;

  deckbuilder.registerFeature("printDeck", Object.freeze({
    buildDocument: buildCurrentPrintDocument,
    open: openPrintView,
  }));

  document.addEventListener("DOMContentLoaded", installPrintButton);

  function installPrintButton() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", openPrintView);

    const readyCheck = window.setInterval(() => {
      const ready = state.cards.length > 0
        && territoriesApi()?.isReady?.()
        && Boolean(deckbuilder.feature("supplementalPackages"));
      button.disabled = !ready;
      button.title = ready
        ? "Open a printable deck package for printing or saving as PDF"
        : "Waiting for card and Territory sources to load";
      if (ready) window.clearInterval(readyCheck);
    }, 100);
  }

  function openPrintView() {
    const printData = readPrintData();
    if (!printData) return;

    if (!printData.validation.valid && !window.confirm("This deck is currently invalid. Print it anyway?")) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Popup blocked. Allow popups to use Print / PDF.");
      return;
    }

    printWindow.document.write(buildCurrentPrintDocument(printData));
    printWindow.document.close();
    printWindow.focus();
  }

  function buildCurrentPrintDocument(printData = readPrintData()) {
    if (!printData) return "";
    const html = buildPrintDocument(printData);
    return deckbuilder.preparePrintDocument(html, {
      kind: "deck",
      printData,
    });
  }

  function readPrintData() {
    const faction = getFaction();
    const leader = faction?.leaders.find(item => item.id === state.leaderId);
    if (!faction || !leader) {
      window.alert("Choose a completed faction and leader before printing.");
      return null;
    }

    const entries = deckEntries();
    const cards = entries.flatMap(({ card, qty }) => Array.from({ length: qty }, () => ({ ...card })));
    const territories = territoriesApi()?.selected?.() || [];
    const supplementalPackage = deckbuilder.feature("supplementalPackages")?.[faction.id] || {
      summary: ["Selected Leader Card"],
      leaderImages: {},
      components: []
    };

    return {
      name: state.deckName.trim() || `Untitled ${state.currentGameDisplayVersion || state.currentGameVersion || "current"} Deck`,
      versionLabel: state.currentGameDisplayVersion || state.currentGameVersion || "current",
      faction,
      leader,
      entries,
      cards,
      territories,
      selectedRiteIds: state.factionId === "mystics" ? (ritesApi()?.selectedIds?.() || []) : [],
      selectedRites: state.factionId === "mystics" ? (ritesApi()?.selectedRites?.() || []) : [],
      validation: validateDeck(),
      supplementalPackage,
      supplementalRequirements: supplementalPackage.summary || ["Selected Leader Card"]
    };
  }

  function buildPrintDocument(data) {
    const supplemental = buildSupplementalPackage(data);
    const printableItems = [
      leaderToPrintHtml(data.faction, data.leader),
      ...supplemental.inlineItems,
      ...data.cards.map(cardToPrintHtml),
      ...data.territories.map(territoryToPrintHtml)
    ];

    const firstPageItems = printableItems.slice(0, 6);
    const remainingItems = printableItems.slice(6);
    const firstPage = firstPageToHtml(data, firstPageItems, remainingItems.length > 0 || supplemental.dedicatedPages.length > 0);
    const remainingPages = chunk(remainingItems, 9).map(items => cardTableToHtml(items, 3)).join("");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(data.name)} — Gauntlet ${escapeHtml(data.versionLabel)}</title>
${PRINT_FONT_LINKS}
<style>
*{box-sizing:border-box;font-synthesis:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
body{margin:0;background:#fff;color:#111;font-family:"Noto Sans",Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
h1{margin:0 0 .04in;font-size:21pt;line-height:1}
h2{margin:0 0 .05in;font-size:10pt;text-transform:uppercase;letter-spacing:.05em}
p{margin:0}
.first-page,.card-page{display:block;width:7.5in;margin:0 auto}
.first-page{height:10.5in;overflow:hidden}
.first-page.has-more-pages{break-after:page;page-break-after:always}
.first-page-summary{height:3.5in;overflow:hidden;padding:.08in .12in .04in}
.summary-line{margin-bottom:.08in;font-size:9pt;line-height:1.2}
.summary-grid{display:grid;grid-template-columns:1.55fr .95fr;gap:.25in;min-height:2.72in}
.deck-list{columns:2;column-gap:.24in;font-size:7.7pt;line-height:1.18}
.deck-list-entry{break-inside:avoid}
.summary-side{font-size:7.8pt;line-height:1.24}
.summary-block+.summary-block{margin-top:.11in}
.summary-list{margin:.03in 0 0;padding-left:.17in}
.summary-list li+li{margin-top:.02in}
.validity{font-weight:900;text-transform:uppercase}
.validity.valid{color:#245b38}
.validity.invalid{color:#8a2f2f}
.card-page{break-after:page;page-break-after:always}
.card-page:last-of-type{break-after:auto;page-break-after:auto}
.card-table{width:7.5in;margin:0 auto;border-collapse:collapse;border-spacing:0;table-layout:fixed}
.card-table.three-row{height:10.5in}
.card-table.two-row{height:7in}
.card-table td{width:2.5in;height:3.5in;min-width:2.5in;max-width:2.5in;min-height:3.5in;max-height:3.5in;padding:0;border:0;vertical-align:top;overflow:hidden}
.print-card{position:relative;width:2.5in;height:3.5in;overflow:hidden}
@page{size:letter;margin:.25in .1in .04in .1in}
</style>
</head>
<body>
${firstPage}
${remainingPages}
${supplemental.dedicatedPages.join("")}
<script>
window.__gauntletPrintPreflights=window.__gauntletPrintPreflights||[];
function nextFrame(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
function waitForImages(){return Promise.all(Array.from(document.images).map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});})));}
async function preparePrint(){try{for(const preflight of window.__gauntletPrintPreflights){await preflight();}if(document.fonts?.ready){try{await document.fonts.ready;}catch(error){}}await waitForImages();document.body.offsetHeight;await nextFrame();await nextFrame();setTimeout(()=>window.print(),300);}catch(error){console.error(error);window.alert(error?.message||'Printing stopped because the print document did not finish preparing.');}}
window.addEventListener('load',preparePrint,{once:true});
<\/script>
</body>
</html>`;
  }

  function buildSupplementalPackage(data) {
    const packageData = data.supplementalPackage || {};
    const inlineItems = (packageData.components || []).flatMap(component => { const item = componentToPrintHtml(component); return Array.isArray(item) ? item : [item]; }).filter(Boolean);
    const dedicatedPages = [];

    if (packageData.proposals?.length) {
      const proposalFronts = packageData.proposals.map(proposal => proposalToPrintHtml(proposal, false));
      const mirroredBackOrder = [2, 1, 0, 5, 4, 3, 8, 7, 6];
      const treatyBacks = mirroredBackOrder
        .map(index => packageData.proposals[index])
        .filter(Boolean)
        .map(proposal => proposalToPrintHtml(proposal, true));
      dedicatedPages.push(cardTableToHtml(proposalFronts, 3));
      dedicatedPages.push(cardTableToHtml(treatyBacks, 3));
    }


    const packageRites = data.faction.id === "mystics"
      ? (packageData.rites || []).filter(rite => data.selectedRiteIds.includes(rite.id))
      : (packageData.rites || []);

    if (packageRites.length) {
      const riteFronts = packageRites.map(rite => riteToPrintHtml(rite, false));
      const riteBacks = [...packageRites]
        .reverse()
        .map(rite => riteToPrintHtml(rite, true));
      dedicatedPages.push(cardTableToHtml(riteFronts, 3));
      dedicatedPages.push(cardTableToHtml(riteBacks, 3));
    }

    return {
      inlineItems,
      dedicatedPages
    };
  }

  function componentToPrintHtml(component) {
    if (!component?.contractId) return "";
    const item = productionPrint().component(component.contractId, "front");
    if (component.type === "deed-set") {
      return Array.from({ length: Number(component.count) || 8 }, () => item);
    }
    return item;
  }

  function firstPageToHtml(data, pageItems, hasMorePages) {
    const validationClass = data.validation.valid ? "valid" : "invalid";
    const territoryNames = data.territories.length
      ? data.territories.map(territory => `<li>${escapeHtml(territory.name)}</li>`).join("")
      : "<li>None selected</li>";
    const supplementalItems = data.supplementalRequirements
      .filter(item => !(data.faction.id === "mystics" && /three double-sided rite cards/i.test(item)))
      .map(item => `<li>${escapeHtml(item)}</li>`).join("");
    const riteSummary = data.selectedRites?.length
      ? `<div class="summary-block"><h2>Rites</h2><ul class="summary-list">${data.selectedRites.map(rite => `<li>${escapeHtml(rite.name)}</li>`).join("")}</ul></div>`
      : "";
    const diplomatNote = data.faction.id === "diplomats"
      ? " Proposal fronts and mirrored Treaty Article backs are included on dedicated 9-up pages for long-edge duplex printing."
      : "";

    return `<section class="first-page${hasMorePages ? " has-more-pages" : ""}">
      <div class="first-page-summary">
        <h1>${escapeHtml(data.name)}</h1>
        <p class="summary-line"><strong>${escapeHtml(data.faction.name)} — ${escapeHtml(data.leader.name)}</strong> · ${data.validation.cardCount}/30+ cards · ${data.validation.pointTotal}/60 value · ${data.territories.length}/3 Territories · <span class="validity ${validationClass}">${data.validation.valid ? "Valid" : "Invalid"}</span></p>
        <div class="summary-grid">
          <section>
            <h2>Playable deck</h2>
            <div class="deck-list">${data.entries.map(({ card, qty }) => `<div class="deck-list-entry">${qty}x ${escapeHtml(card.name)} (${card.cost}) <em>${escapeHtml(card.factionLabel)}</em></div>`).join("") || "No playable cards selected."}</div>
          </section>
          <aside class="summary-side">
            <div class="summary-block"><h2>Territories</h2><ul class="summary-list">${territoryNames}</ul></div>
            ${riteSummary}
            <div class="summary-block"><h2>Faction components included</h2><ul class="summary-list">${supplementalItems}</ul></div>
            <div class="summary-block"><strong>Print note:</strong> The selected Leader and required faction supplemental faces are included in this package.${diplomatNote}</div>
          </aside>
        </div>
      </div>
      ${cardTableToHtml(pageItems, 2, true)}
    </section>`;
  }

  function cardTableToHtml(items, rowCount = 3, suppressSection = false) {
    const rows = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const cells = [];
      for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
        const index = rowIndex * 3 + columnIndex;
        cells.push(`<td>${items[index] || ""}</td>`);
      }
      rows.push(`<tr>${cells.join("")}</tr>`);
    }
    const table = `<table class="card-table ${rowCount === 2 ? "two-row" : "three-row"}"><tbody>${rows.join("")}</tbody></table>`;
    return suppressSection ? table : `<section class="card-page">${table}</section>`;
  }

  function cardToPrintHtml(card) {
    return productionPrint().card(card);
  }

  function leaderToPrintHtml(faction, leader) {
    return productionPrint().leader(faction, leader);
  }

  function proposalToPrintHtml(proposal, treaty) {
    if (!proposal?.contractId) throw new Error("Proposal print contract id is missing.");
    return productionPrint().component(proposal.contractId, treaty ? "reverse" : "front");
  }

  function riteToPrintHtml(rite, completed) {
    if (!rite?.contractId) throw new Error("Rite print contract id is missing.");
    return productionPrint().component(rite.contractId, completed ? "reverse" : "front");
  }

  function territoryToPrintHtml(territory) {
    return productionPrint().territory(territory);
  }

  function chunk(items, size) {
    const result = [];
    for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
    return result;
  }
})();
