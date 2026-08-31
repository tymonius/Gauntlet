(() => {
  const COLUMNS = 3;
  const LEDGERS_PER_SHEET = 9;
  const DEFAULT_SHEET_COUNT = 1;
  const MAX_SHEET_COUNT = 10;
  const PRODUCTION_LEDGER_COMPONENT_ID = "financiers-capital-ledger";
  const PRODUCTION_LEDGER_KIND = "supplemental";
  const PRODUCTION_RENDER_TIMEOUT_MS = 30000;

  document.addEventListener("DOMContentLoaded", installCapitalLedgerSheetPrinter);

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
      <p class="muted">Print full 9-up duplex sheets of consumable Capital Ledgers.</p>
      <div class="capital-ledger-print-controls" style="display:grid;grid-template-columns:minmax(0,11rem) max-content;grid-template-rows:auto auto;column-gap:.5rem;row-gap:.35rem;align-items:stretch;justify-content:start;max-width:100%">
        <label for="capitalLedgerSheetCount" style="grid-column:1;grid-row:1;margin:0">Sheets</label>
        <select id="capitalLedgerSheetCount" aria-label="Number of duplex Capital Ledger sheets" style="grid-column:1;grid-row:2;margin:0;width:100%">
          ${Array.from({ length: MAX_SHEET_COUNT }, (_, index) => {
            const sheetCount = index + 1;
            const ledgerCount = sheetCount * LEDGERS_PER_SHEET;
            return `<option value="${sheetCount}"${sheetCount === DEFAULT_SHEET_COUNT ? " selected" : ""}>${sheetCount} sheet${sheetCount === 1 ? "" : "s"} (${ledgerCount} ledgers)</option>`;
          }).join("")}
        </select>
        <button id="printCapitalLedgersButton" type="button" class="secondary" style="grid-column:2;grid-row:2;margin:0;align-self:stretch;height:auto">Print Capital Ledgers</button>
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
<style>
*{box-sizing:border-box;font-synthesis:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
body{margin:0;background:#f3f3f3;color:#111;font-family:Arial,Helvetica,sans-serif}
.print-toolbar{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.65rem 1rem;background:#fff;border-bottom:1px solid #ccc;font-size:14px}
.print-toolbar-copy{display:grid;gap:.12rem}
.print-toolbar-note{font-size:12px;color:#555}
.print-toolbar button{padding:.45rem .8rem;border:1px solid #222;border-radius:.25rem;background:#222;color:#fff;font:inherit;font-weight:800;cursor:pointer}
.print-toolbar button:disabled{opacity:.5;cursor:wait}
.card-page{width:7.5in;height:10.5in;margin:.25in auto;background:#fff;break-after:page;page-break-after:always;overflow:hidden}
.card-page.last-page{break-after:auto;page-break-after:auto}
.card-table{width:7.5in;height:10.5in;border-collapse:collapse;border-spacing:0;table-layout:fixed}
.card-table td{width:2.5in;height:3.5in;min-width:2.5in;max-width:2.5in;min-height:3.5in;max-height:3.5in;padding:0;border:0;vertical-align:top;overflow:hidden}
.capital-ledger-slot,.capital-ledger-production-frame{display:block;width:2.5in;height:3.5in;margin:0;padding:0;border:0;background:transparent;overflow:hidden}
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
      <span id="capitalLedgerPrintStatus" class="print-toolbar-note">Loading finalized production Capital Ledger design…</span>
    </div>
    <button id="capitalLedgerPrintButton" type="button" disabled>Print / Save PDF</button>
  </div>
  ${pages}
  <script>
    (() => {
      const status = document.getElementById("capitalLedgerPrintStatus");
      const printButton = document.getElementById("capitalLedgerPrintButton");
      const frames = [...document.querySelectorAll("[data-capital-ledger-sheet-frame]")];
      const timeoutMs = ${PRODUCTION_RENDER_TIMEOUT_MS};
      const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));

      function frameRenderState(frame) {
        try {
          const body = frame.contentDocument?.body;
          if (!body) return { ready: false, error: "" };
          if (body.dataset.renderReady === "error") {
            return {
              ready: false,
              error: body.dataset.renderErrorMessage || "A production Capital Ledger frame failed to render.",
            };
          }
          return { ready: body.dataset.renderReady === "true", error: "" };
        } catch (error) {
          return { ready: false, error: error.message || String(error) };
        }
      }

      async function waitForProductionLedgerFrames() {
        const deadline = performance.now() + timeoutMs;
        while (performance.now() < deadline) {
          const states = frames.map(frameRenderState);
          const failed = states.find(state => state.error);
          if (failed) throw new Error(failed.error);
          if (states.every(state => state.ready)) return;
          await delay(25);
        }
        throw new Error("Timed out waiting for finalized Capital Ledger production renders.");
      }

      async function preloadProductionLedgerFrameAssets() {
        const backgroundUrls = new Set();
        await Promise.all(frames.map(async frame => {
          const frameDocument = frame.contentDocument;
          if (frameDocument?.fonts?.ready) await frameDocument.fonts.ready;
          const interior = frameDocument?.querySelector(".capital-ledger-card .reference-card-interior");
          const background = interior && frame.contentWindow
            ? frame.contentWindow.getComputedStyle(interior).backgroundImage || ""
            : "";
          for (const match of background.matchAll(/url\\(["']?([^"')]+)["']?\\)/g)) {
            backgroundUrls.add(new URL(match[1], frameDocument.baseURI).href);
          }
        }));

        await Promise.all([...backgroundUrls].map(src => new Promise(resolve => {
          const image = new Image();
          image.onload = resolve;
          image.onerror = resolve;
          image.src = src;
        })));
      }

      (async () => {
        try {
          if (!frames.length) throw new Error("No Capital Ledger production frames were created.");
          await waitForProductionLedgerFrames();
          await preloadProductionLedgerFrameAssets();
          status.textContent = "Finalized design loaded. Enable two-sided printing and flip on the long edge.";
          printButton.disabled = false;
          printButton.addEventListener("click", () => window.print());
          document.body.dataset.renderReady = "true";
        } catch (error) {
          console.error(error);
          status.textContent = "Unable to load finalized Capital Ledger: " + error.message;
          document.body.dataset.renderReady = "error";
        }
      })();
    })();
  <\/script>
</body>
</html>`;
  }

  function capitalLedgerPageHtml(side, pairName, isLastPage) {
    const cells = Array.from({ length: LEDGERS_PER_SHEET }, (_, position) => {
      const duplexSlot = side === "back" ? mirrorIndexForLongEdge(position) : position;
      return `<td data-duplex-side="${side}" data-duplex-slot="${duplexSlot}"><div class="capital-ledger-slot">${capitalLedgerSheetFrameHtml(side)}</div></td>`;
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

  function selectedRulesetMode() {
    return window.GAUNTLET_DECKBUILDER_RULESET?.mode
      || (new URLSearchParams(window.location.search).get("rules") === "candidate" ? "candidate" : "released");
  }

  function productionComponentFrameSource(kind, id, side, orientation = "portrait") {
    const orientationParam = orientation === "landscape" ? "&orientation=landscape" : "";
    return `/card-design/component-print-render.html?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}&side=${encodeURIComponent(side)}${orientationParam}&rules=${encodeURIComponent(selectedRulesetMode())}`;
  }

  function productionLedgerFrameSource(side) {
    return productionComponentFrameSource(PRODUCTION_LEDGER_KIND, PRODUCTION_LEDGER_COMPONENT_ID, side);
  }

  function capitalLedgerSheetFrameHtml(side) {
    const src = productionLedgerFrameSource(side);
    return `<iframe class="capital-ledger-production-frame" data-capital-ledger-sheet-frame src="${src}" title="Capital Ledger finalized production render, ${side}" scrolling="no" loading="eager"></iframe>`;
  }
})();
