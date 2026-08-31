(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");

  deckbuilder.registerPrintTransform("diplomat-reference-placement", repositionDiplomatReference, 50);

  function repositionDiplomatReference(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const frontPage = documentNode.querySelector('.duplex-front-page[data-duplex-pair="diplomat-reference"]');
    const backPage = documentNode.querySelector('.duplex-back-page[data-duplex-pair="diplomat-reference"]');
    if (!frontPage || !backPage) return html;

    moveOnlyCard(frontPage, 0);
    moveOnlyCard(backPage, 2);

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function moveOnlyCard(page, targetIndex) {
    const cells = [...page.querySelectorAll("td")];
    const card = page.querySelector(".reference-card");
    if (!card || !cells[targetIndex]) return;

    cells.forEach(cell => cell.replaceChildren());
    cells[targetIndex].append(card);
  }
})();
