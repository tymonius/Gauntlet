(() => {
  const COLUMNS = 3;
  const DUPLEX_SLOT_COUNT = 9;
  const REFERENCE_SLOT = 4;

  document.addEventListener("DOMContentLoaded", installDuplexPrintTransform);

  function installDuplexPrintTransform() {
    const button = document.getElementById("printDeckButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const originalOpen = window.open;
      let restored = false;

      const restoreOpen = () => {
        if (restored) return;
        restored = true;
        window.open = originalOpen;
      };

      window.open = function duplexAwareOpen(...args) {
        const printWindow = originalOpen.apply(window, args);
        if (!printWindow) {
          restoreOpen();
          return printWindow;
        }

        const originalWrite = printWindow.document.write.bind(printWindow.document);
        printWindow.document.write = html => originalWrite(prepareDuplexDocument(html));
        restoreOpen();
        return printWindow;
      };

      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function prepareDuplexDocument(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    standardizePageGeometry(documentNode);
    alignProposalAndTreatyPages(documentNode);
    isolateDoubleSidedReference(documentNode);
    addDuplexInstructions(documentNode);
    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function standardizePageGeometry(documentNode) {
    const style = documentNode.querySelector("style");
    if (!style) return;

    style.textContent = style.textContent
      .replace(
        ".first-page,.card-page{display:block;width:7.5in;margin:0 auto}",
        ".first-page,.card-page{display:block;width:7.5in;height:10.5in;margin:0;overflow:hidden}"
      )
      .replace(
        "@page{size:letter;margin:.25in .1in .04in .1in}",
        "@page{size:letter portrait;margin:.25in .5in}"
      );

    style.textContent += `
.card-page{position:relative;width:7.5in!important;height:10.5in!important;margin:0!important;overflow:hidden!important;}
.card-table{width:7.5in!important;height:10.5in!important;margin:0!important;}
.duplex-page{break-before:page!important;page-break-before:always!important;break-after:page!important;page-break-after:always!important;}
.duplex-page .card-table{position:absolute;inset:0;}
.duplex-print-instructions{margin-top:.08in;padding-top:.06in;border-top:1px solid #aaa;font-size:7.2pt;line-height:1.2;}
`;
  }

  function alignProposalAndTreatyPages(documentNode) {
    const pages = [...documentNode.querySelectorAll(".card-page")];
    const frontPage = pages.find(page => page.querySelector(".proposal-card:not(.treaty)"));
    const backPage = pages.find(page => page.querySelector(".proposal-card.treaty"));
    if (!frontPage || !backPage) return;

    const frontCells = [...frontPage.querySelectorAll("td")];
    const backCells = [...backPage.querySelectorAll("td")];
    if (frontCells.length !== DUPLEX_SLOT_COUNT || backCells.length !== DUPLEX_SLOT_COUNT) return;

    const backsByArticle = new Map(
      [...backPage.querySelectorAll(".proposal-card.treaty")].map(card => [articleKey(card), card])
    );

    backCells.forEach(cell => cell.replaceChildren());

    frontCells.forEach((cell, frontIndex) => {
      const frontCard = cell.querySelector(".proposal-card:not(.treaty)");
      if (!frontCard) return;

      const backCard = backsByArticle.get(articleKey(frontCard));
      if (!backCard) return;

      backCells[mirrorIndexForLongEdge(frontIndex)].append(backCard);
    });

    frontPage.classList.add("duplex-page", "duplex-front-page");
    backPage.classList.add("duplex-page", "duplex-back-page");
    frontPage.dataset.duplexPair = "diplomat-proposals";
    backPage.dataset.duplexPair = "diplomat-proposals";

    if (frontPage.nextElementSibling !== backPage) frontPage.after(backPage);
  }

  function isolateDoubleSidedReference(documentNode) {
    const references = [...documentNode.querySelectorAll(".reference-card")];
    const frontCard = references.find(card => /side\s*a/i.test(card.textContent));
    const backCard = references.find(card => /side\s*b/i.test(card.textContent));
    if (!frontCard || !backCard) return;

    frontCard.closest("td")?.replaceChildren();
    backCard.closest("td")?.replaceChildren();

    const frontPage = makeDuplexPage(documentNode, frontCard, REFERENCE_SLOT, "diplomat-reference", "front");
    const backPage = makeDuplexPage(
      documentNode,
      backCard,
      mirrorIndexForLongEdge(REFERENCE_SLOT),
      "diplomat-reference",
      "back"
    );

    const script = documentNode.body.querySelector("script:last-of-type");
    documentNode.body.insertBefore(frontPage, script);
    documentNode.body.insertBefore(backPage, script);
  }

  function makeDuplexPage(documentNode, card, slotIndex, pairName, side) {
    const section = documentNode.createElement("section");
    section.className = `card-page duplex-page duplex-${side}-page`;
    section.dataset.duplexPair = pairName;

    const table = documentNode.createElement("table");
    table.className = "card-table three-row";
    const body = documentNode.createElement("tbody");

    for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
      const row = documentNode.createElement("tr");
      for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex += 1) {
        const cell = documentNode.createElement("td");
        const index = rowIndex * COLUMNS + columnIndex;
        if (index === slotIndex) cell.append(card);
        row.append(cell);
      }
      body.append(row);
    }

    table.append(body);
    section.append(table);
    return section;
  }

  function addDuplexInstructions(documentNode) {
    const summarySide = documentNode.querySelector(".summary-side");
    if (!summarySide || !documentNode.querySelector(".duplex-page")) return;

    const instructions = documentNode.createElement("div");
    instructions.className = "duplex-print-instructions";
    instructions.innerHTML = "<strong>Duplex setup:</strong> Print at Actual Size / 100%, disable browser headers and footers, and select two-sided printing with <strong>Flip on long edge</strong>. Front and back sheets use identical page boxes and mirrored card positions.";
    summarySide.append(instructions);
  }

  function articleKey(card) {
    return card.querySelector(".proposal-number")?.textContent.trim().toLowerCase() || "";
  }

  function mirrorIndexForLongEdge(index) {
    const row = Math.floor(index / COLUMNS);
    const column = index % COLUMNS;
    return row * COLUMNS + (COLUMNS - 1 - column);
  }
})();
