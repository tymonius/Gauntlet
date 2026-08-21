(() => {
  const LEDGERS_PER_PAGE = 9;
  const DEFAULT_PAGE_COUNT = 1;
  const MAX_PAGE_COUNT = 10;
  const CAPITAL_LEDGER_CSS = `
.capital-ledger-card{display:grid!important;grid-template-rows:.42in 1fr .16in!important;background:#fffdf7!important;color:#191714!important;}
.capital-ledger-card .supplemental-header{background:#d7d7d7!important;color:#111!important;box-shadow:inset 0 0 0 999px #d7d7d7!important;}
.capital-ledger-body{min-height:0;padding:.055in .075in .04in;display:flex;flex-direction:column;}
.capital-ledger-instructions{font-size:5.25pt;line-height:1.12;margin-bottom:.04in;}
.capital-limit-field{display:grid;grid-template-columns:1fr .62in;gap:.05in;align-items:end;margin-bottom:.045in;padding:.035in .045in;border:1px solid #777;font-size:5.25pt;text-transform:uppercase;letter-spacing:.035em;}
.capital-limit-field span{height:.19in;border-bottom:1px solid #111;}
.capital-ledger-grid{width:100%;font-size:4.8pt;}
.capital-ledger-row{display:grid;grid-template-columns:58% 17% 25%;min-height:.17in;}
.capital-ledger-row>*{display:flex;align-items:center;min-width:0;border-right:1px solid #999;border-bottom:1px solid #999;padding:.01in .025in;background:#fff!important;}
.capital-ledger-row>*:first-child{border-left:1px solid #999;}
.capital-ledger-head>*{justify-content:center;border-top:1px solid #777;border-color:#777;background:#ececec!important;text-transform:uppercase;letter-spacing:.035em;}
.capital-ledger-reminder{margin-top:auto;padding-top:.035in;font-size:4.65pt;line-height:1.1;}
.capital-ledger-card .reference-footer{background:#e1e1e1!important;color:#111!important;}`;

  document.addEventListener("DOMContentLoaded", () => {
    installCapitalLedgerPrintTransform();
    installCapitalLedgerSheetPrinter();
  });

  function installCapitalLedgerPrintTransform() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === capitalLedgerAwareOpen) window.open = inheritedOpen;
      };

      function capitalLedgerAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => inheritedWrite(formatCapitalLedger(html));
        restoreOpen();
        return printWindow;
      }

      window.open = capitalLedgerAwareOpen;
      window.setTimeout(restoreOpen, 0);
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
      <p class="muted">Print full 9-up sheets of reusable Capital Ledgers.</p>
      <div class="button-row">
        <label>
          Pages
          <select id="capitalLedgerPageCount" aria-label="Number of Capital Ledger pages">
            ${Array.from({ length: MAX_PAGE_COUNT }, (_, index) => {
              const pageCount = index + 1;
              const ledgerCount = pageCount * LEDGERS_PER_PAGE;
              return `<option value="${pageCount}"${pageCount === DEFAULT_PAGE_COUNT ? " selected" : ""}>${pageCount} page${pageCount === 1 ? "" : "s"} (${ledgerCount} ledgers)</option>`;
            }).join("")}
          </select>
        </label>
        <button id="printCapitalLedgersButton" type="button" class="secondary">Print Capital Ledgers</button>
      </div>`;

    const duplexOption = document.getElementById("printCardBacks")?.closest("label");
    if (duplexOption?.parentElement === printSection) duplexOption.insertAdjacentElement("afterend", tools);
    else printSection.append(tools);

    const pageCountSelect = tools.querySelector("#capitalLedgerPageCount");
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
      const requestedPages = Number.parseInt(pageCountSelect.value, 10);
      const pageCount = Number.isFinite(requestedPages)
        ? Math.min(MAX_PAGE_COUNT, Math.max(1, requestedPages))
        : DEFAULT_PAGE_COUNT;
      openCapitalLedgerSheets(pageCount);
    });
  }

  function openCapitalLedgerSheets(pageCount) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Popup blocked. Allow popups to print Capital Ledger sheets.");
      return;
    }

    printWindow.document.write(buildCapitalLedgerSheetDocument(pageCount));
    printWindow.document.close();
    printWindow.focus();
  }

  function buildCapitalLedgerSheetDocument(pageCount) {
    const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
      const row = `<tr>${Array.from({ length: 3 }, () => `<td>${capitalLedgerCardHtml()}</td>`).join("")}</tr>`;
      const rows = row.repeat(3);

      return `
        <section class="card-page${pageIndex === pageCount - 1 ? " last-page" : ""}">
          <table class="card-table" role="presentation"><tbody>${rows}</tbody></table>
        </section>`;
    }).join("");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Gauntlet — Capital Ledger Sheets</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700;800;900&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;font-synthesis:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
body{margin:0;background:#f3f3f3;color:#111;font-family:"Noto Sans",Arial,Helvetica,sans-serif}
.print-toolbar{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.65rem 1rem;background:#fff;border-bottom:1px solid #ccc;font-size:14px}
.print-toolbar button{padding:.45rem .8rem;border:1px solid #222;border-radius:.25rem;background:#222;color:#fff;font:inherit;font-weight:800;cursor:pointer}
.card-page{width:7.5in;height:10.5in;margin:.25in auto;background:#fff;break-after:page;page-break-after:always;overflow:hidden}
.card-page.last-page{break-after:auto;page-break-after:auto}
.card-table{width:7.5in;height:10.5in;border-collapse:collapse;border-spacing:0;table-layout:fixed}
.card-table td{width:2.5in;height:3.5in;min-width:2.5in;max-width:2.5in;min-height:3.5in;max-height:3.5in;padding:0;border:0;vertical-align:top;overflow:hidden}
.print-card{position:relative;width:2.5in;height:3.5in;overflow:hidden;border:1px solid #111;background:#fff}
.supplemental-header{display:flex;align-items:center;padding:.06in .09in;background:#d1d1d1!important;border-bottom:1px solid #111;box-shadow:inset 0 0 0 999px #d1d1d1;font-size:11pt;font-weight:900;line-height:1;text-transform:uppercase}
.reference-footer{display:flex;align-items:center;justify-content:center;padding:.025in .06in;background:#e1e1e1!important;border-top:1px solid #111;font-size:4.9pt;font-weight:700;text-align:center}
${CAPITAL_LEDGER_CSS}
@page{size:letter;margin:.25in}
@media print{
  body{background:#fff}
  .print-toolbar{display:none!important}
  .card-page{margin:0 auto}
}
</style>
</head>
<body>
  <div class="print-toolbar">
    <span>${pageCount} page${pageCount === 1 ? "" : "s"} · ${pageCount * LEDGERS_PER_PAGE} Capital Ledgers</span>
    <button type="button" onclick="window.print()">Print / Save PDF</button>
  </div>
  ${pages}
</body>
</html>`;
  }

  function capitalLedgerCardHtml() {
    return `
      <article class="print-card capital-tracker-card capital-ledger-card">
        ${capitalLedgerInnerHtml()}
      </article>`;
  }

  function capitalLedgerInnerHtml() {
    const rows = Array.from({ length: 12 }, () => `
      <div class="capital-ledger-row" role="row">
        <span role="cell"></span><span role="cell"></span><span role="cell"></span>
      </div>`).join("");

    return `
      <header class="supplemental-header">Capital Ledger</header>
      <div class="capital-ledger-body">
        <div class="capital-ledger-instructions">Record every gain, spend, loss, and end-turn reduction. The final Balance is your current Capital.</div>
        <div class="capital-limit-field"><strong>Current Capital limit</strong><span aria-hidden="true"></span></div>
        <div class="capital-ledger-grid" role="table" aria-label="Capital transaction ledger">
          <div class="capital-ledger-row capital-ledger-head" role="row">
            <strong role="columnheader">Transaction</strong><strong role="columnheader">+/−</strong><strong role="columnheader">Balance</strong>
          </div>
          ${rows}
        </div>
        <div class="capital-ledger-reminder"><strong>Limit:</strong> controlled Territories + total Treasury value. Reduce excess only at the end of each turn.</div>
      </div>
      <footer class="reference-footer">Reusable supplemental ledger — no marker required</footer>`;
  }

  function formatCapitalLedger(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const style = documentNode.querySelector("style");
    if (!style) return html;

    const ledger = [...documentNode.querySelectorAll(".capital-tracker-card")]
      .find(card => /capital ledger/i.test(card.querySelector(".supplemental-header")?.textContent || ""));
    if (!ledger) return html;

    ledger.classList.add("capital-ledger-card");
    ledger.innerHTML = capitalLedgerInnerHtml();
    style.textContent += CAPITAL_LEDGER_CSS;

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }
})();
