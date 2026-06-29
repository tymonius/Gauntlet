(() => {
  const FONT_LINKS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700;800;900&display=block" rel="stylesheet">
`;

  const PRINT_FONT_STACK = '"Noto Sans", Arial, Helvetica, sans-serif';

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
