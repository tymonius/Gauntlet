(() => {
  document.addEventListener("DOMContentLoaded", installDuplexSheetPairingFix);

  function installDuplexSheetPairingFix() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const inheritedOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        if (window.open === pairingAwareOpen) window.open = inheritedOpen;
      };

      function pairingAwareOpen(...args) {
        const printWindow = inheritedOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const inheritedWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => inheritedWrite(ensureSheetBackPages(html));
        restoreOpen();
        return printWindow;
      }

      window.open = pairingAwareOpen;
      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function ensureSheetBackPages(html) {
    const printCardBacks = Boolean(document.getElementById("printCardBacks")?.checked);
    if (!printCardBacks) return html;

    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const frontPages = [
      documentNode.querySelector(".first-page"),
      ...documentNode.querySelectorAll(".card-page:not(.duplex-page):not(.deck-card-back-page)")
    ].filter(Boolean);

    frontPages.forEach((frontPage, index) => {
      if (frontPage.nextElementSibling?.classList.contains("deck-card-back-page")) return;

      const frontTable = frontPage.querySelector(".card-table");
      if (!frontTable) return;
      const rowCount = frontTable.classList.contains("two-row") ? 2 : 3;
      const isFirstPage = frontPage.classList.contains("first-page");
      const pairName = frontPage.dataset.duplexPair || `deck-sheet-${index + 1}`;
      const backPage = makeBlankBackPage(documentNode, rowCount, isFirstPage);

      frontPage.classList.add("deck-card-front-page");
      frontPage.dataset.duplexPair = pairName;
      backPage.dataset.duplexPair = pairName;
      frontPage.after(backPage);
    });

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
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
      for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
        row.append(documentNode.createElement("td"));
      }
      body.append(row);
    }

    table.append(body);
    section.append(table);
    return section;
  }
})();
