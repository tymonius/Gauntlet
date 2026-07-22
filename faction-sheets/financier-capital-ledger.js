(() => {
  const ledger = document.querySelector('[data-card-name="Capital Tracker"]');
  if (!ledger) return;

  ledger.dataset.cardName = "Capital Ledger";
  ledger.classList.add("capital-ledger-card");
  ledger.innerHTML = `
    <div class="ledger-heading">Capital Ledger</div>
    <div class="capital-ledger-instructions">Record every gain, spend, loss, and end-turn reduction. The final Balance is your current Capital.</div>
    <div class="capital-limit-field"><strong>Current Capital limit</strong><span aria-hidden="true"></span></div>
    <table class="capital-ledger-table" aria-label="Capital transaction ledger">
      <thead><tr><th>Transaction</th><th>+/−</th><th>Balance</th></tr></thead>
      <tbody>${Array.from({ length: 12 }, () => '<tr><td></td><td></td><td></td></tr>').join('')}</tbody>
    </table>
    <div class="capital-ledger-reminder"><strong>Limit:</strong> controlled Territories + total Treasury value. Reduce excess only at the end of each turn.</div>
    <div class="cut-note">Reusable supplemental ledger — no marker required</div>`;
})();
