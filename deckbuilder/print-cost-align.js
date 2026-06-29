(() => {
  const COST_ALIGN_CSS = `
.card-header{padding-right:.42in!important;}
.cost-circle{
  top:.065in!important;
  right:.065in!important;
}
`;

  const previousBuildPrintDocument = window.buildPrintDocument || (typeof buildPrintDocument !== "undefined" ? buildPrintDocument : null);
  if (!previousBuildPrintDocument) return;

  function buildPrintDocumentWithAlignedCost(deck) {
    const html = previousBuildPrintDocument(deck);
    if (html.includes("/* print cost alignment */")) return html;
    return html.replace("</style>", `/* print cost alignment */\n${COST_ALIGN_CSS}\n</style>`);
  }

  window.buildPrintDocument = buildPrintDocumentWithAlignedCost;
  try {
    buildPrintDocument = buildPrintDocumentWithAlignedCost;
  } catch (error) {
    // Older browsers may not allow assigning the global binding directly.
  }
})();
