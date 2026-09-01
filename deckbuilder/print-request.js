(() => {
  const deckbuilder = window.GAUNTLET_DECKBUILDER;
  if (!deckbuilder) throw new Error("Deckbuilder core API is unavailable.");
  const { state } = deckbuilder;

  const EMAIL_STORAGE_KEY = "gauntlet-print-request-host-email-v1";
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const el = {};

  document.addEventListener("DOMContentLoaded", installPrintRequest);

  function installPrintRequest() {
    const printButton = document.getElementById("printDeckButton");
    const printSection = printButton?.closest("section");
    if (!printSection || document.getElementById("printRequestForm")) return;

    const panel = document.createElement("div");
    panel.className = "print-request-panel";
    panel.innerHTML = `
      <h4>Prepping for a Gauntlet game night?</h4>
      <p>Send your host this Deck and request printing. The tool copies the complete request and exported JSON, then opens a short email draft addressed to your host.</p>
      <form id="printRequestForm" class="print-request-form" novalidate>
        <div class="print-request-fields">
          <label>
            Your name
            <input id="printRequestPlayerName" type="text" maxlength="80" autocomplete="name" required placeholder="Name your host will recognize" />
          </label>
          <label>
            Host email address
            <input id="printRequestHostEmail" type="email" maxlength="254" autocomplete="email" required placeholder="host@example.com" />
          </label>
          <label class="full">
            Note for the host <small>optional</small>
            <textarea id="printRequestNote" rows="3" maxlength="500" placeholder="Pickup timing, print preferences, or anything else the host should know"></textarea>
          </label>
        </div>
        <div class="print-request-actions">
          <button id="openPrintRequestEmail" type="submit" disabled>Copy request and open email</button>
          <button id="copyPrintRequest" type="button" class="secondary" disabled>Copy request</button>
        </div>
        <p class="print-request-help">Your Deck is not sent to Gauntlet. When your email app opens, paste the copied request into the message body, review it, and send.</p>
        <p id="printRequestStatus" class="print-request-status" aria-live="polite"></p>
      </form>`;
    printSection.append(panel);

    for (const id of [
      "printRequestForm", "printRequestPlayerName", "printRequestHostEmail", "printRequestNote",
      "openPrintRequestEmail", "copyPrintRequest", "printRequestStatus"
    ]) el[id] = document.getElementById(id);

    restoreHostEmail();
    el.printRequestForm.addEventListener("submit", openEmailRequest);
    el.copyPrintRequest.addEventListener("click", copyRequest);
    el.printRequestPlayerName.addEventListener("input", syncControls);
    el.printRequestHostEmail.addEventListener("input", syncControls);

    const validity = document.getElementById("validityText");
    if (validity) new MutationObserver(syncControls).observe(validity, { childList: true, subtree: true, characterData: true });
    for (const id of ["factionSelect", "leaderSelect", "deckName", "cardCount", "territoryMetricCount"]) {
      const target = document.getElementById(id);
      target?.addEventListener("change", syncControls);
      target?.addEventListener("input", syncControls);
    }
    syncControls();
  }

  function syncControls() {
    if (!el.openPrintRequestEmail) return;
    const validDeck = deckIsValid();
    const playerReady = Boolean(el.printRequestPlayerName.value.trim());
    const emailReady = EMAIL_PATTERN.test(el.printRequestHostEmail.value.trim());
    el.openPrintRequestEmail.disabled = !(validDeck && playerReady && emailReady);
    el.copyPrintRequest.disabled = !(validDeck && playerReady);

    if (!validDeck) setStatus("Complete and validate the Deck before requesting printing.");
    else if (el.printRequestHostEmail.value && !emailReady) setStatus("Enter a valid host email address.", "error");
    else setStatus("");
  }

  function deckIsValid() {
    try { return Boolean(deckbuilder.validate().valid); }
    catch { return document.getElementById("validityText")?.textContent?.trim() === "Valid"; }
  }

  function buildRequest() {
    const deck = deckbuilder.serialize();
    const validation = deckbuilder.validate();
    const factionName = document.getElementById("factionSelect")?.selectedOptions?.[0]?.textContent?.replace(/\s+—.*$/, "").trim() || deck.factionId;
    const leaderName = document.getElementById("leaderSelect")?.selectedOptions?.[0]?.textContent?.trim() || deck.leaderId;
    const playerName = el.printRequestPlayerName.value.trim();
    const note = el.printRequestNote.value.trim();
    const territories = Array.isArray(deck.territories) ? deck.territories.map(item => item.name || item.id).filter(Boolean) : [];
    const riteById = new Map((state.currentGameData?.mystics?.rites || []).map(rite => [rite.id, rite.name]));
    const rites = deck.factionId === "mystics"
      ? (deck.selectedRites || []).map(id => riteById.get(id) || id)
      : [];
    const json = JSON.stringify(deck, null, 2);
    const subject = `Gauntlet Deck printing request — ${playerName} — ${deck.name}`;
    const lines = [
      "Gauntlet Deck Printing Request",
      "",
      `Player: ${playerName}`,
      `Deck: ${deck.name}`,
      `Faction: ${factionName}`,
      `Leader: ${leaderName}`,
      `Playable cards: ${validation.cardCount}`,
      `Deck value: ${validation.pointTotal}/${validation.constructionRules.maximumDeckbuildingValue}`,
      `Territories: ${territories.length ? territories.join(" → ") : "None selected"}`,
      ...(deck.factionId === "mystics" ? [`Rites: ${rites.length ? rites.join(", ") : "None selected"}`] : []),
      ...(note ? [`Note: ${note}`] : []),
      "",
      "HOST INSTRUCTIONS",
      "1. Copy the JSON between the BEGIN and END markers.",
      "2. Open https://gauntlet.run/deckbuilder/",
      "3. Expand Advanced transfer and bulk printing.",
      "4. Paste the JSON into Import JSON and select Import JSON.",
      "5. Review the loaded Deck, then print the package.",
      "",
      "----- BEGIN GAUNTLET DECK JSON -----",
      json,
      "----- END GAUNTLET DECK JSON -----"
    ];
    return { deck, playerName, subject, body: lines.join("\n"), json };
  }

  function buildEmailDraftBody(request) {
    return [
      `Please prepare this Gauntlet Deck for ${request.playerName}.`,
      "",
      "The complete printing request and Deck JSON have been copied to my clipboard.",
      "Paste them below before sending this email:",
      "",
      "----- PASTE GAUNTLET DECK REQUEST BELOW -----",
      ""
    ].join("\n");
  }

  async function openEmailRequest(event) {
    event.preventDefault();
    syncControls();
    if (el.openPrintRequestEmail.disabled) return;

    const hostEmail = el.printRequestHostEmail.value.trim();
    const request = buildRequest();
    const copied = await copyText(request.body);
    if (!copied) {
      window.prompt("Copy this printing request before continuing:", request.body);
    }

    rememberHostEmail(hostEmail);
    const draftBody = buildEmailDraftBody(request);
    const mailto = `mailto:${encodeURIComponent(hostEmail)}?subject=${encodeURIComponent(request.subject)}&body=${encodeURIComponent(draftBody)}`;
    setStatus("Request copied. Paste it into the email draft before sending.", "success");
    openMailto(mailto);
  }

  function openMailto(mailto) {
    const link = document.createElement("a");
    link.href = mailto;
    link.hidden = true;
    link.setAttribute("aria-hidden", "true");
    document.body.append(link);
    link.click();
    link.remove();
  }

  async function copyRequest() {
    if (!deckIsValid()) {
      setStatus("Complete and validate the Deck before copying a request.", "error");
      return;
    }
    if (!el.printRequestPlayerName.value.trim()) {
      setStatus("Enter your name before copying the request.", "error");
      el.printRequestPlayerName.focus();
      return;
    }
    const request = buildRequest();
    const copied = await copyText(`${request.subject}\n\n${request.body}`);
    if (copied) {
      setStatus("Printing request copied. Paste it into an email or message to your host.", "success");
    } else {
      window.prompt("Copy this printing request:", `${request.subject}\n\n${request.body}`);
    }
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall through to the synchronous browser copy fallback.
    }

    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.inset = "0 auto auto -9999px";
    document.body.append(field);
    field.focus();
    field.select();
    field.setSelectionRange(0, field.value.length);
    let copied = false;
    try { copied = document.execCommand("copy"); }
    catch { copied = false; }
    field.remove();
    return copied;
  }

  function restoreHostEmail() {
    try { el.printRequestHostEmail.value = localStorage.getItem(EMAIL_STORAGE_KEY) || ""; }
    catch { /* The form works without stored preferences. */ }
  }

  function rememberHostEmail(email) {
    try { localStorage.setItem(EMAIL_STORAGE_KEY, email); }
    catch { /* The current request still opens. */ }
  }

  function setStatus(message, kind = "") {
    el.printRequestStatus.textContent = message;
    el.printRequestStatus.className = `print-request-status${kind ? ` ${kind}` : ""}`;
  }
})();
