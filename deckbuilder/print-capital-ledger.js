(() => {
  const COLUMNS = 3;
  const LEDGERS_PER_SHEET = 9;
  const DEFAULT_SHEET_COUNT = 1;
  const MAX_SHEET_COUNT = 10;
  const PRODUCTION_LEDGER_COMPONENT_ID = "financiers-capital-ledger";
  const PRODUCTION_LEDGER_KIND = "supplemental";

  document.addEventListener("DOMContentLoaded", () => {
    installCapitalLedgerProductionPrintTransform();
    installCapitalLedgerSheetPrinter();
  });

  function installCapitalLedgerProductionPrintTransform() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    // Keep the true pre-click window.open so nested print transforms can always
    // unwind cleanly after this transform wraps the production-print transform.
    const baseOpen = window.open;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;

      function capitalLedgerAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          window.open = baseOpen;
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => inheritedWrite(formatCapitalLedgerForProduction(html));

        // Other print transforms are nested around this one. Restore the actual
        // pre-click implementation here rather than leaving one wrapper installed.
        window.open = baseOpen;
        return printWindow;
      }

      window.open = capitalLedgerAwareOpen;
      window.setTimeout(() => {
        if (window.open === capitalLedgerAwareOpen) window.open = baseOpen;
      }, 0);
    }, true);
  }

  function installCapitalLedgerSheetPrinter() {
    const factionSelect = document.getElementById("factionSelect");
    const printDeckButton = document.getElementById("printDeckButton");
    const printSection = printDeckButton?.closest("section");
    if (!factionSelect || !printSection) return;

    const tools = document.createElement("div");
    tools.id = "capitalLedgerPrintTools";
    tools.hidden = true;
    tools.style.marginTop = ".75rem";
    tools.innerHTML = `
      <p class="muted">Print full 9-up duplex sheets of finalized Capital Ledgers.</p>
      <div class="button-row">
        <label>
          Sheets
          <select id="capitalLedgerSheetCount" aria-label="Number of duplex Capital Ledger sheets">
            ${Array.from({ length: MAX_SHEET_COUNT }, (_, index) => {
              const sheetCount = index + 1;
              const ledgerCount = sheetCount * LEDGERS_PER_SHEET;
              return `<option value="${sheetCount}"${sheetCount === DEFAULT_SHEET_COUNT ? " selected" : ""}>${sheetCount} sheet${sheetCount === 1 ? "" : "s"} (${ledgerCount} ledgers)</option>`;
            }).join("")}
          </select>
        </label>
        <button id="printCapitalLedgersButton" type="button" class="secondary">Print Capital Ledgers</button>
      </div>`;

    const duplexOption = document.getElementById("printCardBacks")?.closest("label");
    if (duplexOption?.parentElement === printSection) duplexOption.insertAdjacentElement("afterend", tools);
    else printSection.append(tools);

    const sheetCountSelect = tools.querySelector("#capitalLedgerSheetCount");
    const printButton = tools.querySelector("#printCapitalLedgersButton");

    const updateVisibility = () => {
      tools.hidden = factionSelect.value !== "financiers";
    };

    factionSelect.addEventListener("change", updateVisibility);
    for (const id of ["loadDeckButton", "importJsonButton"]) {
      document.getElementById(id)?.addEventListener("click", () => window.setTimeout(updateVisibility, 0));
    }
    updateVisibility();

    printButton.addEventListener("click", () => {
      const requestedSheets = Number.parseInt(sheetCountSelect.value, 10);
      const sheetCount = Number.isFinite(requestedSheets)
        ? Math.min(MAX_SHEET_COUNT, Math.max(1, requestedSheets))
        : DEFAULT_SHEET_COUNT;
      openCapitalLedgerSheets(sheetCount);
    });
  }

  function openCapitalLedgerSheets(sheetCount) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Popup blocked. Allow popups to print Capital Ledger sheets.");
      return;
    }

    printWindow.document.write(buildCapitalLedgerSheetDocument(sheetCount));
    printWindow.document.close();
    printWindow.focus();
  }

  function buildCapitalLedgerSheetDocument(sheetCount) {
    const pages = Array.from({ length: sheetCount }, (_, sheetIndex) => {
      const pairName = `capital-ledger-sheet-${sheetIndex + 1}`;
      return [
        capitalLedgerPageHtml("front", pairName, false),
        capitalLedgerPageHtml("back", pairName, sheetIndex === sheetCount - 1),
      ].join("");
    }).join("");

    const printPageCount = sheetCount * 2;
    const ledgerCount = sheetCount * LEDGERS_PER_SHEET;

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Gauntlet — Duplex Capital Ledger Sheets</title>
<link rel="preconnect" href="https://use.typekit.net" />
<link rel="preconnect" href="https://p.typekit.net" crossorigin />
<link rel="stylesheet" href="https://use.typekit.net/vgm6nwi.css" />
<link rel="stylesheet" href="/design-tokens.css" />
<link rel="stylesheet" href="/card-design/card-design.css" />
<link rel="stylesheet" href="/card-design/card-parchment.css" />
<link rel="stylesheet" href="/card-design/reference-card.css" />
<link rel="stylesheet" href="/card-design/capital-ledger.css" data-capital-ledger-style="true" />
<style>
*{box-sizing:border-box;font-synthesis:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
body{margin:0;background:#f3f3f3;color:#111;font-family:var(--font-interface,Arial,Helvetica,sans-serif)}
.print-toolbar{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.65rem 1rem;background:#fff;border-bottom:1px solid #ccc;font-size:14px}
.print-toolbar-copy{display:grid;gap:.12rem}
.print-toolbar-note{font-size:12px;color:#555}
.print-toolbar button{padding:.45rem .8rem;border:1px solid #222;border-radius:.25rem;background:#222;color:#fff;font:inherit;font-weight:800;cursor:pointer}
.print-toolbar button:disabled{opacity:.5;cursor:wait}
.card-page{width:7.5in;height:10.5in;margin:.25in auto;background:#fff;break-after:page;page-break-after:always;overflow:hidden}
.card-page.last-page{break-after:auto;page-break-after:auto}
.card-table{width:7.5in;height:10.5in;border-collapse:collapse;border-spacing:0;table-layout:fixed}
.card-table td{width:2.5in;height:3.5in;min-width:2.5in;max-width:2.5in;min-height:3.5in;max-height:3.5in;padding:0;border:0;vertical-align:top;overflow:hidden}
.capital-ledger-slot,.capital-ledger-slot>.gauntlet-card{display:block;width:2.5in;height:3.5in;margin:0}
.capital-ledger-slot>.gauntlet-card{box-shadow:none!important}
@page{size:letter portrait;margin:.25in}
@media print{
  body{background:#fff}
  .print-toolbar{display:none!important}
  .card-page{margin:0 auto}
}
</style>
</head>
<body>
  <div class="print-toolbar">
    <div class="print-toolbar-copy">
      <strong>${sheetCount} duplex sheet${sheetCount === 1 ? "" : "s"} · ${ledgerCount} Capital Ledgers · ${printPageCount} print pages</strong>
      <span id="capitalLedgerPrintStatus" class="print-toolbar-note">Loading finalized Capital Ledger design…</span>
    </div>
    <button id="capitalLedgerPrintButton" type="button" disabled>Print / Save PDF</button>
  </div>
  ${pages}
  <script type="module">
    import { capitalLedgerMarkup } from "/card-design/capital-ledger.js";
    import { loadCurrentGame } from "/game-data/current-game.mjs";

    const status = document.getElementById("capitalLedgerPrintStatus");
    const printButton = document.getElementById("capitalLedgerPrintButton");

    async function preloadRenderedBackgrounds() {
      const urls = new Set();
      document.querySelectorAll(".capital-ledger-card .reference-card-interior").forEach(interior => {
        const background = getComputedStyle(interior).backgroundImage || "";
        for (const match of background.matchAll(/url\\(["']?([^"')]+)["']?\\)/g)) {
          urls.add(new URL(match[1], document.baseURI).href);
        }
      });
      await Promise.all([...urls].map(src => new Promise(resolve => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = resolve;
        image.src = src;
      })));
    }

    try {
      const currentGame = await loadCurrentGame();
      const template = document.createElement("template");
      template.innerHTML = capitalLedgerMarkup(currentGame.displayVersion || "Current").trim();
      const ledger = template.content.firstElementChild;
      if (!ledger) throw new Error("The finalized Capital Ledger renderer returned no card face.");

      document.querySelectorAll("[data-capital-ledger-slot]").forEach(slot => {
        slot.replaceChildren(ledger.cloneNode(true));
      });

      if (document.fonts?.ready) await document.fonts.ready;
      await preloadRenderedBackgrounds();

      status.textContent = "Finalized design loaded. Enable two-sided printing and flip on the long edge.";
      printButton.disabled = false;
      printButton.addEventListener("click", () => window.print());
      document.body.dataset.renderReady = "true";
    } catch (error) {
      console.error(error);
      status.textContent = `Unable to load finalized Capital Ledger: ${error.message}`;
      document.body.dataset.renderReady = "error";
    }
  <\/script>
</body>
</html>`;
  }

  function capitalLedgerPageHtml(side, pairName, isLastPage) {
    const cells = Array.from({ length: LEDGERS_PER_SHEET }, (_, position) => {
      const duplexSlot = side === "back" ? mirrorIndexForLongEdge(position) : position;
      return `<td data-duplex-side="${side}" data-duplex-slot="${duplexSlot}"><div class="capital-ledger-slot" data-capital-ledger-slot></div></td>`;
    });
    const rows = Array.from({ length: 3 }, (_, rowIndex) => {
      const start = rowIndex * COLUMNS;
      return `<tr>${cells.slice(start, start + COLUMNS).join("")}</tr>`;
    }).join("");

    return `
      <section class="card-page duplex-${side}-page${isLastPage ? " last-page" : ""}" data-duplex-pair="${pairName}">
        <table class="card-table" role="presentation"><tbody>${rows}</tbody></table>
      </section>`;
  }

  function mirrorIndexForLongEdge(index) {
    const row = Math.floor(index / COLUMNS);
    const column = index % COLUMNS;
    return row * COLUMNS + (COLUMNS - 1 - column);
  }

  function productionLedgerFrame(documentNode, side) {
    const wrapper = documentNode.createElement("article");
    wrapper.className = "print-card production-render-component production-render-supplemental";
    wrapper.dataset.productionComponentKind = PRODUCTION_LEDGER_KIND;
    wrapper.dataset.productionComponentId = PRODUCTION_LEDGER_COMPONENT_ID;
    wrapper.dataset.productionComponentRenderId = PRODUCTION_LEDGER_COMPONENT_ID;
    wrapper.dataset.productionComponentSide = side;
    // The component contract still carries its legacy standardBack value. This
    // face is physically identical duplex, so the Ledger transform supplies the
    // reverse explicitly and keeps it out of the standard card-back pass.
    wrapper.dataset.productionBackPolicy = "ledgerDuplex";
    wrapper.setAttribute("aria-label", `Capital Ledger finalized production render, ${side}`);

    const frame = documentNode.createElement("iframe");
    frame.className = "production-component-frame";
    frame.dataset.productionRenderFrame = "true";
    frame.dataset.productionRenderKind = "component";
    frame.src = `/card-design/component-print-render.html?kind=${encodeURIComponent(PRODUCTION_LEDGER_KIND)}&id=${encodeURIComponent(PRODUCTION_LEDGER_COMPONENT_ID)}&side=${encodeURIComponent(side)}`;
    frame.title = `Capital Ledger finalized production render, ${side}`;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("loading", "eager");
    wrapper.append(frame);
    return wrapper;
  }

  function formatCapitalLedgerForProduction(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const ledger = [...documentNode.querySelectorAll(".capital-tracker-card")]
      .find(card => /capital ledger/i.test(card.textContent || ""));
    if (!ledger) return html;

    const frontPage = ledger.closest(".first-page, .card-page");
    const frontCell = ledger.closest("td");
    const frontTable = frontPage?.querySelector(".card-table");
    if (!frontPage || !frontCell || !frontTable) return html;

    const frontCells = [...frontTable.querySelectorAll("td")];
    const frontIndex = frontCells.indexOf(frontCell);
    if (frontIndex < 0) return html;

    frontCell.replaceChildren(productionLedgerFrame(documentNode, "front"));

    const backPage = ensureCapitalLedgerBackPage(documentNode, frontPage);
    const backCells = [...backPage.querySelectorAll(".card-table td")];
    const backCell = backCells[mirrorIndexForLongEdge(frontIndex)];
    if (!backCell) return html;
    backCell.replaceChildren(productionLedgerFrame(documentNode, "reverse"));

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function ensureCapitalLedgerBackPage(documentNode, frontPage) {
    const existingDirect = frontPage.nextElementSibling?.classList.contains("deck-card-back-page")
      ? frontPage.nextElementSibling
      : null;
    const existingPairName = frontPage.dataset.duplexPair;
    const existingByPair = existingPairName
      ? [...documentNode.querySelectorAll(".deck-card-back-page[data-duplex-pair]")]
        .find(page => page.dataset.duplexPair === existingPairName)
      : null;
    const existing = existingDirect || existingByPair;
    const pairName = existingPairName || existing?.dataset.duplexPair || "capital-ledger-deck-sheet";

    frontPage.classList.add("deck-card-front-page");
    frontPage.dataset.duplexPair = pairName;
    if (existing) {
      existing.dataset.duplexPair = pairName;
      return existing;
    }

    const frontTable = frontPage.querySelector(".card-table");
    const rowCount = frontTable?.classList.contains("two-row") ? 2 : 3;
    const backPage = makeBlankBackPage(documentNode, rowCount, frontPage.classList.contains("first-page"));
    backPage.dataset.duplexPair = pairName;
    frontPage.after(backPage);
    return backPage;
  }

  function makeBlankBackPage(documentNode, rowCount, firstPageBack) {
    const section = documentNode.createElement("section");
    section.className = `card-page deck-card-back-page duplex-back-page blank-card-back-page${firstPageBack ? " first-page-back" : ""}`;

    if (firstPageBack) {
      const spacer = documentNode.createElement("div");
      spacer.className = "first-page-back-spacer";
      section.append(spacer);
    }

    const table = documentNode.createElement("table");
    table.className = `card-table ${rowCount === 2 ? "two-row" : "three-row"}`;
    const body = documentNode.createElement("tbody");

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = documentNode.createElement("tr");
      for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex += 1) {
        row.append(documentNode.createElement("td"));
      }
      body.append(row);
    }

    table.append(body);
    section.append(table);
    return section;
  }
})();
