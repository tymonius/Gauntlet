(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");

  deckbuilder.registerPrintTransform("print-summary", polishPrintDocument, 70);

  function polishPrintDocument(html) {
    if (!/class=["'][^"']*first-page-summary/i.test(html)) return html;

    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const changed = polishFirstPageSummary(documentNode);
    return changed ? `<!doctype html>\n${documentNode.documentElement.outerHTML}` : html;
  }

  function polishFirstPageSummary(documentNode) {
    const summary = documentNode.querySelector(".first-page-summary");
    const firstPage = summary?.closest(".first-page");
    if (!summary || !firstPage) return false;

    if (!documentNode.querySelector('link[data-gauntlet-print-typekit]')) {
      const preconnect = documentNode.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = "https://use.typekit.net";
      preconnect.dataset.gauntletPrintTypekit = "true";

      const stylesheet = documentNode.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "https://use.typekit.net/vgm6nwi.css";
      stylesheet.dataset.gauntletPrintTypekit = "true";
      documentNode.head.append(preconnect, stylesheet);
    }

    const style = documentNode.createElement("style");
    style.dataset.gauntletPrintSummary = "true";
    style.textContent = `
.first-page{
  display:grid!important;
  grid-template-rows:3.5in 7in!important;
  width:7.5in!important;
  height:10.5in!important;
  overflow:hidden!important;
}
.first-page-summary{
  --summary-ink:#181614;
  --summary-muted:#655f56;
  --summary-paper:#fffaf0;
  --summary-paper-deep:#f3eddf;
  --summary-line:rgba(49,42,32,.22);
  --summary-crimson:#8f1f25;
  --summary-crimson-dark:#5f1418;
  --summary-bronze:#a37338;
  grid-row:1;
  display:grid!important;
  grid-template-rows:auto auto minmax(0,1fr)!important;
  row-gap:.05in;
  width:7.5in!important;
  height:3.5in!important;
  min-height:3.5in!important;
  max-height:3.5in!important;
  margin:0!important;
  padding:.125in .18in .095in!important;
  overflow:hidden!important;
  position:relative;
  color:var(--summary-ink)!important;
  border-top:.035in solid var(--summary-crimson-dark);
  border-bottom:1px solid var(--summary-bronze);
  background:
    linear-gradient(90deg,rgba(143,31,37,.035),transparent 1.2in),
    linear-gradient(180deg,var(--summary-paper) 0%,var(--summary-paper-deep) 100%)!important;
  box-shadow:inset 0 0 0 1px rgba(163,115,56,.18);
  font-family:"adobe-caslon-pro",Georgia,"Times New Roman",serif!important;
}
.first-page-summary::after{
  content:"";
  position:absolute;
  top:.125in;
  right:.18in;
  width:.42in;
  border-top:1px solid var(--summary-bronze);
  pointer-events:none;
}
.first-page-summary h1{
  margin:0!important;
  min-width:0;
  color:var(--summary-ink)!important;
  font-family:"p22-1722-pro",Georgia,"Times New Roman",serif!important;
  font-size:19pt!important;
  font-weight:400!important;
  line-height:1.02!important;
  letter-spacing:0!important;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.first-page-summary h1::before{
  content:"GAUNTLET · DECK PACKAGE";
  display:block;
  margin:0 0 .03in;
  color:var(--summary-crimson)!important;
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
  font-size:5.8pt!important;
  font-weight:800!important;
  line-height:1.15!important;
  letter-spacing:.15em!important;
  text-transform:uppercase;
}
.first-page-summary .summary-line{
  margin:0!important;
  padding:0 0 .045in!important;
  border-bottom:1px solid var(--summary-line);
  color:var(--summary-muted)!important;
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
  font-size:6.45pt!important;
  font-weight:600!important;
  line-height:1.24!important;
  letter-spacing:.005em;
}
.first-page-summary .summary-line strong{
  color:var(--summary-ink)!important;
  font-family:"adobe-caslon-pro",Georgia,"Times New Roman",serif!important;
  font-size:8.8pt!important;
  font-weight:600!important;
  letter-spacing:0;
}
.first-page-summary .validity{
  display:inline-block;
  margin-left:.018in;
  padding:.015in .04in .012in;
  border:1px solid currentColor;
  border-radius:999px;
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
  font-size:5.25pt!important;
  font-weight:800!important;
  line-height:1.15!important;
  letter-spacing:.08em!important;
  text-transform:uppercase;
}
.first-page-summary .validity.valid{color:#2f6b45!important}
.first-page-summary .validity.invalid{color:#8a2f2f!important}
.first-page-summary .summary-grid{
  display:grid!important;
  grid-template-columns:minmax(0,1.72fr) minmax(0,.88fr)!important;
  gap:.2in!important;
  min-height:0!important;
  height:auto!important;
  overflow:hidden!important;
}
.first-page-summary .summary-grid>section,
.first-page-summary .summary-side{
  min-width:0;
  min-height:0;
  overflow:hidden!important;
}
.first-page-summary h2{
  margin:0 0 .035in!important;
  padding:0 0 .02in!important;
  color:var(--summary-crimson)!important;
  border-bottom:1px solid rgba(163,115,56,.38);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
  font-size:5.7pt!important;
  font-weight:800!important;
  line-height:1.2!important;
  letter-spacing:.14em!important;
  text-transform:uppercase!important;
}
.first-page-summary .deck-list{
  height:1.72in!important;
  columns:2!important;
  column-gap:.18in!important;
  column-rule:1px solid rgba(49,42,32,.12);
  overflow:hidden!important;
  color:var(--summary-ink)!important;
  font-family:"adobe-caslon-pro",Georgia,"Times New Roman",serif!important;
  font-size:7.05pt!important;
  line-height:1.28!important;
}
.first-page-summary .deck-list-entry{
  margin:0 0 .012in!important;
  break-inside:avoid;
  page-break-inside:avoid;
}
.first-page-summary .deck-list-entry em{
  color:var(--summary-muted)!important;
  font-size:.9em;
}
.first-page-summary .summary-side{
  padding-left:.145in;
  border-left:1px solid var(--summary-line);
  color:#3f3a34!important;
  font-family:"adobe-caslon-pro",Georgia,"Times New Roman",serif!important;
  font-size:6.35pt!important;
  line-height:1.3!important;
}
.first-page-summary .summary-block+.summary-block{margin-top:.06in!important}
.first-page-summary .summary-list{margin:.02in 0 0!important;padding-left:.13in!important}
.first-page-summary .summary-list li+li{margin-top:.014in!important}
.first-page-summary .summary-side strong{color:var(--summary-ink)!important;font-weight:700!important}
.first-page-summary.summary-auto-tight .deck-list{font-size:6.65pt!important;line-height:1.24!important}
.first-page-summary.summary-auto-tight .summary-side{font-size:6pt!important;line-height:1.25!important}
.first-page-summary.summary-auto-tight .summary-block+.summary-block{margin-top:.045in!important}
.first-page-summary.summary-auto-tightest .deck-list{font-size:6.25pt!important;line-height:1.2!important}
.first-page-summary.summary-auto-tightest .summary-side{font-size:5.7pt!important;line-height:1.22!important}
.first-page-summary.summary-auto-tightest h2{margin-bottom:.024in!important;padding-bottom:.016in!important;font-size:5.35pt!important;line-height:1.2!important}

/* Starter decks insert a fourth direct child between the metrics line and the
   deck/side grid. Preserve comfortable leading first; only the measured overflow
   fitter below is allowed to reduce type size. */
.first-page-summary.has-starter-strategy{
  grid-template-rows:auto auto auto minmax(0,1fr)!important;
  row-gap:.035in!important;
}
.first-page-summary.has-starter-strategy .starter-print-strategy{
  min-height:0!important;
  max-height:.86in!important;
  margin:0!important;
  padding:.05in .07in!important;
  overflow:hidden!important;
  grid-template-columns:minmax(0,.9fr) minmax(0,1.45fr)!important;
  gap:.04in .12in!important;
  font-family:"adobe-caslon-pro",Georgia,"Times New Roman",serif!important;
  font-size:6.2pt!important;
  line-height:1.28!important;
}
.first-page-summary.has-starter-strategy .starter-print-strategy h2{
  margin:0 0 .018in!important;
  padding:0!important;
  border:0!important;
  font-size:5.35pt!important;
  line-height:1.2!important;
}
.first-page-summary.has-starter-strategy .starter-print-strategy p{margin:0!important}
.first-page-summary.has-starter-strategy .starter-print-territories{
  grid-column:1/-1!important;
  display:grid!important;
  grid-template-columns:1.38in minmax(0,1fr)!important;
  gap:.06in!important;
  align-items:start!important;
  padding-top:.04in!important;
}
.first-page-summary.has-starter-strategy .starter-print-territories h2{
  margin:0!important;
  min-height:.11in!important;
  padding:.006in 0 0!important;
  line-height:1.3!important;
}
.first-page-summary.has-starter-strategy .starter-print-territories p{
  min-width:0!important;
  overflow:hidden!important;
  white-space:nowrap!important;
  text-overflow:ellipsis!important;
  font-size:5.95pt!important;
  line-height:1.28!important;
}
.first-page-summary.has-starter-strategy .summary-grid{
  min-height:0!important;
  height:auto!important;
  overflow:hidden!important;
}
.first-page-summary.has-starter-strategy .deck-list{
  height:1.72in!important;
}
.first-page-summary.has-starter-strategy.summary-auto-tight .starter-print-strategy{
  max-height:.82in!important;
  font-size:5.95pt!important;
  line-height:1.24!important;
}
.first-page-summary.has-starter-strategy.summary-auto-tightest .starter-print-strategy{
  max-height:.78in!important;
  font-size:5.65pt!important;
  line-height:1.2!important;
}
.first-page>.card-table.two-row{
  grid-row:2;
  width:7.5in!important;
  height:7in!important;
  margin:0!important;
}
`;
    documentNode.head.append(style);

    const fitScript = documentNode.createElement("script");
    fitScript.dataset.gauntletPrintSummaryFit = "true";
    fitScript.textContent = `(() => {
  const summaries = [...document.querySelectorAll('.first-page-summary')];
  if (!summaries.length) return;

  const fitSummary = summary => {
    const overflowTargets = () => [
      summary,
      ...summary.querySelectorAll('.deck-list, .summary-side, .starter-print-strategy')
    ];
    const overflows = () => overflowTargets().some(node => (
      node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1
    ));

    summary.classList.remove('summary-auto-tight', 'summary-auto-tightest');
    if (!overflows()) return;
    summary.classList.add('summary-auto-tight');
    void summary.offsetHeight;
    if (overflows()) summary.classList.add('summary-auto-tightest');
  };

  const fitAll = () => summaries.forEach(fitSummary);
  const run = async () => {
    try { if (document.fonts?.ready) await document.fonts.ready; } catch (error) {}
    fitAll();
    requestAnimationFrame(() => requestAnimationFrame(fitAll));
  };
  if (document.readyState === 'loading') window.addEventListener('load', run, { once: true });
  else run();
})();`;
    documentNode.body.append(fitScript);
    return true;
  }

})();
