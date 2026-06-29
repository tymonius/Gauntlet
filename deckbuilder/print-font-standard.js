(() => {
  const FONT_LINKS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700;800;900&display=block" rel="stylesheet">
`;

  const PRINT_FONT_STACK = '"Noto Sans", Arial, Helvetica, sans-serif';

  const PRINT_COSMETIC_CSS = `
.card-header{padding-right:.44in!important;}
.cost-circle{
  top:.06in!important;
  right:.14in!important;
  width:.28in!important;
  height:.28in!important;
  min-width:.28in!important;
  min-height:.28in!important;
  border:1.25px solid #111!important;
  border-radius:50%!important;
  padding:0!important;
  font-family:${PRINT_FONT_STACK}!important;
  font-size:10.6pt!important;
  font-weight:900!important;
  line-height:1!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  text-align:center!important;
}
`;

  function standardizePrintFonts(html) {
    let next = html;

    if (!next.includes("fonts.googleapis.com/css2?family=Noto+Sans")) {
      next = next.replace("</title>\n<style>", `</title>${FONT_LINKS}<style>`);
    }

    next = next.replace(
      "*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}",
      "*{box-sizing:border-box;font-synthesis:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}"
    );

    next = next.replace(
      "body{font-family:Arial,Helvetica,sans-serif;",
      `body{font-family:${PRINT_FONT_STACK};`
    );

    if (!next.includes("/* print cosmetic overrides */")) {
      next = next.replace("</style>", `/* print cosmetic overrides */\n${PRINT_COSMETIC_CSS}\n</style>`);
    }

    return next;
  }

  const originalBuildPrintDocument = window.buildPrintDocument || (typeof buildPrintDocument !== "undefined" ? buildPrintDocument : null);
  if (!originalBuildPrintDocument) return;

  function buildPrintDocumentWithStandardFonts(deck) {
    return standardizePrintFonts(originalBuildPrintDocument(deck));
  }

  window.buildPrintDocument = buildPrintDocumentWithStandardFonts;
  try {
    buildPrintDocument = buildPrintDocumentWithStandardFonts;
  } catch (error) {
    // Older browsers may not allow assigning the global binding directly.
  }
})();
