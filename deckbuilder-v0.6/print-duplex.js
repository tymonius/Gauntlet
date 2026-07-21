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
        printWindow.document.write = html => originalWrite(preparePrintDocument(html));
        restoreOpen();
        return printWindow;
      };

      window.setTimeout(restoreOpen, 0);
    }, true);
  }

  function preparePrintDocument(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const printCardBacks = Boolean(document.getElementById("printCardBacks")?.checked);

    standardizePageGeometry(documentNode);
    normalizeProposalLayouts(documentNode);
    addOverlayBands(documentNode);
    alignProposalAndTreatyPages(documentNode);
    isolateDoubleSidedReference(documentNode);
    appendMysticsRitePages(documentNode);
    compactSingleSidedPages(documentNode);
    if (printCardBacks) appendPlayableAndTerritoryBacks(documentNode);
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
.card-table{width:7.5in!important;margin:0!important;}
.card-page .card-table{height:10.5in!important;}
.first-page .card-table.two-row{height:7in!important;}
.duplex-page{break-before:page!important;page-break-before:always!important;break-after:page!important;page-break-after:always!important;}
.duplex-page.duplex-back-page:last-of-type{break-after:auto!important;page-break-after:auto!important;}
.duplex-page .card-table{position:absolute;inset:0;}
.deck-card-back-page{break-before:page!important;page-break-before:always!important;break-after:page!important;page-break-after:always!important;}
.deck-card-back-page.first-page-back .card-table.two-row{height:7in!important;}
.first-page-back-spacer{height:3.5in;}
.gauntlet-card-back{position:relative;display:flex;align-items:center;justify-content:center;width:2.5in;height:3.5in;overflow:hidden;border:1px solid #111;background:#2b211b!important;box-shadow:inset 0 0 0 999px #2b211b;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;}
.gauntlet-card-back::before{content:"";position:absolute;inset:.12in;border:1px solid #c9b899;box-shadow:inset 0 0 0 1px rgba(201,184,153,.22);}
.gauntlet-back-name{position:relative;z-index:1;display:block;writing-mode:vertical-rl;transform:rotate(180deg);color:#f5ede0;font-size:23pt;font-weight:900;line-height:1;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;text-shadow:0 1px 1px #000;}
.proposal-card .proposal-banner{grid-row:1;}
.proposal-card .proposal-title-row{grid-row:2;}
.proposal-card .requirement{grid-row:3;}
.proposal-card .proposal-body{grid-row:4;}
.proposal-card .proposal-footer{grid-row:5;}
.proposal-card.treaty .proposal-banner{font-size:10pt!important;font-weight:900!important;letter-spacing:.16em!important;}
.rite-card{--card-text-size:5.8pt;--card-label-size:5.35pt;display:grid;grid-template-rows:.27in .55in 1fr .16in;background:#f5f1f8!important;}
.rite-banner{display:flex;align-items:center;justify-content:center;padding:.03in .06in;background:#d7cedf!important;border-bottom:1px solid #111;font-size:6pt;font-weight:900;letter-spacing:.1em;text-transform:uppercase;}
.rite-title-row{position:relative;display:flex;align-items:center;gap:.08in;padding:.055in .09in;border-bottom:1px solid #aaa;background:#ebe4ef!important;}
.rite-icon{display:flex;align-items:center;justify-content:center;width:.34in;height:.34in;border:1px solid #111;border-radius:50%;font-size:13pt;font-weight:900;}
.rite-title{font-size:12pt;font-weight:900;line-height:1.02;}
.rite-body{min-height:0;overflow:hidden;padding:.06in .09in .04in;}
.rite-body .rules-section+.rules-section{margin-top:.045in;padding-top:.035in;}
.rite-footer{display:flex;align-items:center;justify-content:center;padding:.025in .05in;background:#d7cedf!important;border-top:1px solid #111;font-size:4.7pt;text-align:center;}
.rite-back-card{background:#e7ddeb!important;}
.rite-back-card .rite-banner{background:#6d4d78!important;color:#fff;font-size:10pt;letter-spacing:.16em;box-shadow:inset 0 0 0 999px #6d4d78;}
.rite-complete-mark{display:flex;align-items:center;justify-content:center;width:.68in;height:.68in;margin:.08in auto;border:2px solid #6d4d78;border-radius:50%;font-size:25pt;font-weight:900;}
.rite-completed-copy{font-size:6.6pt;line-height:1.16;text-align:center;}
.rite-progress{margin-top:.12in;padding-top:.08in;border-top:1px solid #8d7894;font-size:6pt;line-height:1.25;}
.overlay-card .card-header,
.overlay-card .card-body,
.overlay-card .card-footer{margin-right:.30in;}
.overlay-card .unique-flag{right:.37in;}
.overlay-band{position:absolute;z-index:5;top:0;right:0;bottom:0;width:.30in;display:flex;align-items:center;justify-content:center;overflow:hidden;border-left:1px solid #111;background:#bcbcbc!important;box-shadow:inset 0 0 0 999px #bcbcbc;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;}
.overlay-band-name{display:block;max-height:3.24in;overflow:hidden;writing-mode:vertical-rl;transform:rotate(180deg);color:#111;font-size:7.8pt;font-weight:900;line-height:1;letter-spacing:.045em;text-align:center;text-transform:uppercase;white-space:nowrap;}
`;
  }

  function normalizeProposalLayouts(documentNode) {
    documentNode.querySelectorAll(".proposal-card.treaty .proposal-banner").forEach(banner => {
      banner.textContent = "RATIFIED";
      banner.setAttribute("aria-label", "Ratified Treaty Article");
    });
  }

  function addOverlayBands(documentNode) {
    documentNode.querySelectorAll(".main-card").forEach(card => {
      const isOverlay = [...card.querySelectorAll(".rules-section .card-label")]
        .some(label => /(^|\s)overlay(\s|$)/i.test(label.textContent.trim()));
      if (!isOverlay) return;

      const name = card.querySelector(".card-name")?.textContent.trim();
      if (!name) return;

      card.classList.add("overlay-card");
      const band = documentNode.createElement("div");
      band.className = "overlay-band";
      band.setAttribute("aria-label", `${name} Overlay ownership band`);

      const bandName = documentNode.createElement("span");
      bandName.className = "overlay-band-name";
      bandName.textContent = name;
      band.append(bandName);
      card.append(band);
    });
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
    const frontCard = references.find(card => /side\s*a/i.test(referenceSide(card)));
    const backCard = references.find(card => /side\s*b/i.test(referenceSide(card)));
    if (!frontCard || !backCard || frontCard === backCard) return;

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

  function appendMysticsRitePages(documentNode) {
    if (state.factionId !== "mystics") return;
    const rites = window.GAUNTLET_V06_SUPPLEMENTALS?.mystics?.rites || [];
    if (rites.length !== 3) return;

    const frontSlots = [6, 7, 8];
    const backSlots = frontSlots.map(mirrorIndexForLongEdge);
    const frontCards = rites.map(rite => makeRiteCard(documentNode, rite, false));
    const backCards = rites.map(rite => makeRiteCard(documentNode, rite, true));
    const frontPage = makeDuplexPageWithCards(documentNode, frontCards, frontSlots, "mystics-rites", "front");
    const backPage = makeDuplexPageWithCards(documentNode, backCards, backSlots, "mystics-rites", "back");

    const script = documentNode.body.querySelector("script:last-of-type");
    documentNode.body.insertBefore(frontPage, script);
    documentNode.body.insertBefore(backPage, script);
  }

  function makeRiteCard(documentNode, rite, completed) {
    const article = documentNode.createElement("article");
    article.className = `print-card rite-card fit-target ${completed ? "rite-back-card" : "rite-front-card"}`;
    article.dataset.riteName = rite.name;

    if (completed) {
      article.innerHTML = `
        <div class="rite-banner">Rite Completed</div>
        <div class="rite-title-row"><div class="rite-icon">${escapeForDocument(rite.icon)}</div><div class="rite-title">${escapeForDocument(rite.name)}</div></div>
        <div class="rite-body">
          <div class="rite-complete-mark">✓</div>
          <div class="rite-completed-copy"><strong>Keep this face up.</strong><br>This Rite remains completed and cannot be begun again.</div>
          <div class="rite-progress"><strong>First completed Rite:</strong> unlock Invocation.<br><strong>Second:</strong> unlock Transmutation.<br><strong>Third:</strong> immediately win by Ritual.</div>
        </div>
        <div class="rite-footer">${escapeForDocument(rite.name)} · completed side</div>`;
      return article;
    }

    const sections = [];
    if (rite.requirement) sections.push(riteSection("Requirement", rite.requirement));
    sections.push(riteSection("Beginning cost", rite.beginning));
    sections.push(riteSection("Completion", rite.completion));
    if (rite.result) sections.push(riteSection("On completion", rite.result));
    sections.push(riteSection("Interrupted", rite.interruption));

    article.innerHTML = `
      <div class="rite-banner">Incomplete Rite</div>
      <div class="rite-title-row"><div class="rite-icon">${escapeForDocument(rite.icon)}</div><div class="rite-title">${escapeForDocument(rite.name)}</div></div>
      <div class="rite-body">${sections.join("")}</div>
      <div class="rite-footer">${escapeForDocument(rite.name)} · incomplete side</div>`;
    return article;
  }

  function riteSection(label, text) {
    return `<section class="rules-section"><div class="card-label">${escapeForDocument(label)}</div><div class="card-text">${escapeForDocument(text)}</div></section>`;
  }

  function compactSingleSidedPages(documentNode) {
    const firstPageCells = [...documentNode.querySelectorAll(".first-page .card-table td")];
    const standardPages = [...documentNode.querySelectorAll(".card-page:not(.duplex-page)")];
    const standardCells = standardPages.flatMap(page => [...page.querySelectorAll("td")]);
    const cells = [...firstPageCells, ...standardCells];
    if (!cells.length) return;

    const cards = cells.flatMap(cell => [...cell.children].filter(child => child.classList.contains("print-card")));
    cells.forEach(cell => cell.replaceChildren());
    cards.forEach((card, index) => cells[index]?.append(card));

    standardPages.forEach(page => {
      if (!page.querySelector(".print-card")) page.remove();
    });
  }

  function appendPlayableAndTerritoryBacks(documentNode) {
    const pages = [
      documentNode.querySelector(".first-page"),
      ...documentNode.querySelectorAll(".card-page:not(.duplex-page):not(.deck-card-back-page)")
    ].filter(Boolean);

    pages.forEach((page, pageIndex) => {
      const table = page.querySelector(".card-table");
      if (!table) return;

      const cells = [...table.querySelectorAll("td")];
      const backSlots = [];

      cells.forEach((cell, frontIndex) => {
        if (!cell.querySelector(".main-card, .territory")) return;
        backSlots.push(mirrorIndexForLongEdge(frontIndex));
      });

      if (!backSlots.length) return;

      const rowCount = table.classList.contains("two-row") ? 2 : 3;
      const isFirstPage = page.classList.contains("first-page");
      const backCards = backSlots.map(() => makeGauntletCardBack(documentNode));
      const backPage = makeDeckCardBackPage(documentNode, backCards, backSlots, rowCount, isFirstPage);
      const pairName = `deck-cards-${pageIndex + 1}`;

      page.classList.add("deck-card-front-page");
      page.dataset.duplexPair = pairName;
      backPage.dataset.duplexPair = pairName;
      page.after(backPage);
    });
  }

  function makeGauntletCardBack(documentNode) {
    const card = documentNode.createElement("article");
    card.className = "print-card gauntlet-card-back";
    card.setAttribute("aria-label", "Gauntlet card back");

    const name = documentNode.createElement("span");
    name.className = "gauntlet-back-name";
    name.textContent = "Gauntlet";
    card.append(name);
    return card;
  }

  function makeDeckCardBackPage(documentNode, cards, slotIndexes, rowCount, firstPageBack) {
    const section = documentNode.createElement("section");
    section.className = `card-page deck-card-back-page duplex-back-page${firstPageBack ? " first-page-back" : ""}`;

    if (firstPageBack) {
      const spacer = documentNode.createElement("div");
      spacer.className = "first-page-back-spacer";
      section.append(spacer);
    }

    const table = makeCardTable(documentNode, cards, slotIndexes, rowCount);
    section.append(table);
    return section;
  }

  function makeDuplexPage(documentNode, card, slotIndex, pairName, side) {
    return makeDuplexPageWithCards(documentNode, [card], [slotIndex], pairName, side);
  }

  function makeDuplexPageWithCards(documentNode, cards, slotIndexes, pairName, side) {
    const section = documentNode.createElement("section");
    section.className = `card-page duplex-page duplex-${side}-page`;
    section.dataset.duplexPair = pairName;
    section.append(makeCardTable(documentNode, cards, slotIndexes, 3));
    return section;
  }

  function makeCardTable(documentNode, cards, slotIndexes, rowCount) {
    const table = documentNode.createElement("table");
    table.className = `card-table ${rowCount === 2 ? "two-row" : "three-row"}`;
    const body = documentNode.createElement("tbody");

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = documentNode.createElement("tr");
      for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex += 1) {
        const cell = documentNode.createElement("td");
        const index = rowIndex * COLUMNS + columnIndex;
        const cardIndex = slotIndexes.indexOf(index);
        if (cardIndex >= 0 && cards[cardIndex]) cell.append(cards[cardIndex]);
        row.append(cell);
      }
      body.append(row);
    }

    table.append(body);
    return table;
  }

  function addDuplexInstructions(documentNode) {
    const hasCardBacks = Boolean(documentNode.querySelector(".deck-card-back-page"));
    if (!documentNode.querySelector(".duplex-page") && !hasCardBacks) return;

    const summaryBlocks = [...documentNode.querySelectorAll(".summary-side .summary-block")];
    const printNote = summaryBlocks.find(block => /print note/i.test(block.textContent));
    const backsNote = hasCardBacks
      ? " Playable cards and Territories include mirrored Gauntlet backs."
      : "";
    const instructionHtml = `<strong>Print note:</strong> Leader and supplemental cards are included.${backsNote} For paired cards, use Actual Size / 100%, disable headers and footers, and select <strong>Flip on long edge</strong>. Back positions are mirrored to their fronts.`;

    if (printNote) {
      printNote.innerHTML = instructionHtml;
      return;
    }

    const summarySide = documentNode.querySelector(".summary-side");
    if (!summarySide) return;
    const instructions = documentNode.createElement("div");
    instructions.className = "summary-block";
    instructions.innerHTML = instructionHtml;
    summarySide.append(instructions);
  }

  function referenceSide(card) {
    return card.querySelector(".supplemental-subtitle")?.textContent.trim() || "";
  }

  function articleKey(card) {
    return card.querySelector(".proposal-number")?.textContent.trim().toLowerCase() || "";
  }

  function mirrorIndexForLongEdge(index) {
    const row = Math.floor(index / COLUMNS);
    const column = index % COLUMNS;
    return row * COLUMNS + (COLUMNS - 1 - column);
  }

  function escapeForDocument(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
