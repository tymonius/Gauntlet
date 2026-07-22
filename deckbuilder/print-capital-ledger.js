(() => {
  document.addEventListener("DOMContentLoaded", installCapitalLedgerPrintTransform);

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

  function formatCapitalLedger(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const style = documentNode.querySelector("style");
    if (!style) return html;

    const ledger = [...documentNode.querySelectorAll(".capital-tracker-card")]
      .find(card => /capital ledger/i.test(card.querySelector(".supplemental-header")?.textContent || ""));
    if (!ledger) return html;

    ledger.classList.add("capital-ledger-card");
    ledger.innerHTML = `
      <header class="supplemental-header">Capital Ledger</header>
      <div class="capital-ledger-body">
        <div class="capital-ledger-instructions">Record every gain, spend, loss, and end-turn reduction. The final Balance is your current Capital.</div>
        <div class="capital-limit-field"><strong>Current Capital limit</strong><span aria-hidden="true"></span></div>
        <table class="capital-ledger-table" aria-label="Capital transaction ledger">
          <thead><tr><th>Transaction</th><th>+/−</th><th>Balance</th></tr></thead>
          <tbody>${Array.from({ length: 12 }, () => "<tr><td></td><td></td><td></td></tr>").join("")}</tbody>
        </table>
        <div class="capital-ledger-reminder"><strong>Limit:</strong> controlled Territories + total Treasury value. Reduce excess only at the end of each turn.</div>
      </div>
      <footer class="reference-footer">Reusable supplemental ledger — no marker required</footer>`;

    style.textContent += `
.capital-ledger-card{display:grid!important;grid-template-rows:.42in 1fr .16in!important;background:#fffdf7!important;color:#191714!important;}
.capital-ledger-card .supplemental-header{background:#d7d7d7!important;color:#111!important;box-shadow:inset 0 0 0 999px #d7d7d7!important;}
.capital-ledger-body{min-height:0;padding:.055in .075in .04in;display:flex;flex-direction:column;}
.capital-ledger-instructions{font-size:5.25pt;line-height:1.12;margin-bottom:.04in;}
.capital-limit-field{display:grid;grid-template-columns:1fr .62in;gap:.05in;align-items:end;margin-bottom:.045in;padding:.035in .045in;border:1px solid #777;font-size:5.25pt;text-transform:uppercase;letter-spacing:.035em;}
.capital-limit-field span{height:.19in;border-bottom:1px solid #111;}
.capital-ledger-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:4.8pt;}
.capital-ledger-table th{height:.17in;padding:.015in .025in;border:1px solid #777;background:#ececec!important;text-transform:uppercase;letter-spacing:.035em;}
.capital-ledger-table th:first-child{width:58%;}
.capital-ledger-table th:nth-child(2){width:17%;}
.capital-ledger-table th:nth-child(3){width:25%;}
.capital-ledger-table td{height:.17in!important;min-height:.17in!important;max-height:.17in!important;border:1px solid #999!important;background:#fff!important;}
.capital-ledger-reminder{margin-top:auto;padding-top:.035in;font-size:4.65pt;line-height:1.1;}
.capital-ledger-card .reference-footer{background:#e1e1e1!important;color:#111!important;}`;

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }
})();
