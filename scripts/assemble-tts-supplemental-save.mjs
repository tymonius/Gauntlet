import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildCatalog, CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';
import { makeCustomDeckState, requireHostedUrl } from './generate-tts-save.mjs';
import { trackerPresentation } from './tts-supplemental-geometry.mjs';
import { STAGING_ROOT } from './stage-tts-release-assets.mjs';
import { buildDeckImporterConfig, installDeckImporter, isDeckImporterReleaseVersion } from './tts-deck-importer.mjs';

const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const SUPPLEMENTAL_STACK_NOTE_PREFIX = 'gauntlet:supplemental-stack:';
const STARTER_DECK_NOTE_PREFIX = 'gauntlet:starter-deck:';
const STARTER_TERRITORY_STACK_NOTE_PREFIX = 'gauntlet:starter-territories:';
const DEED_TAG = 'gauntlet-deed';
const DEED_STACK_TAG = 'gauntlet-deed-stack';
const FACTION_ZONE_TAG = 'gauntlet-faction-zone';
const PENDING_SUPPLEMENTAL_NOTE = 'Ready shared and faction supplemental components are assembled into the same starter kit later in the TTS package pipeline. Rules remain manual.';
const ASSEMBLED_SUPPLEMENTAL_NOTE = 'Shared components and production-ready faction components are included automatically in the matching starter kits. Proposals, Deeds, and Mystics Rites/Ritual are packaged as family stacks; sliding trackers use renderer-derived registration points. Rules remain manual.';

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function color(r = 1, g = 1, b = 1) {
  return { r, g, b };
}

function transform(posX = 0, posY = 1, posZ = 0, rotY = 0, scaleX = 1, scaleY = 1, scaleZ = 1) {
  return { posX, posY, posZ, rotX: 0, rotY, rotZ: 0, scaleX, scaleY, scaleZ };
}

function collectGuids(objects, used = new Set()) {
  for (const object of objects || []) {
    if (typeof object?.GUID === 'string' && object.GUID) used.add(object.GUID.toLowerCase());
    collectGuids(object?.ContainedObjects, used);
  }
  return used;
}

function makeContinuationGuidFactory(save) {
  const used = collectGuids(save?.ObjectStates);
  let value = 1;
  for (const guid of used) {
    if (/^[0-9a-z]{6}$/i.test(guid)) value = Math.max(value, Number.parseInt(guid, 36) + 1);
  }
  return () => {
    while (value < 36 ** 6) {
      const candidate = value.toString(36).padStart(6, '0').slice(-6);
      value += 1;
      if (used.has(candidate)) continue;
      used.add(candidate);
      return candidate;
    }
    throw new Error('Unable to allocate another deterministic six-character TTS GUID.');
  };
}


const CAPITAL_LEDGER_STARTING_BALANCE = 2;
const CAPITAL_LEDGER_ROWS_PER_PAGE = 11;

function capitalLedgerLuaScript() {
  return String.raw`local STARTING_BALANCE = 2
local ROWS_PER_PAGE = 11

local ledger = {
  pages = {{}},
  page = 1,
  draftEntry = "",
  draftDelta = "",
}

local function safeDecode(saved)
  if saved == nil or saved == "" then return nil end
  local ok, decoded = pcall(JSON.decode, saved)
  if not ok or type(decoded) ~= "table" then return nil end
  return decoded
end

local function normalize()
  if type(ledger.pages) ~= "table" or #ledger.pages == 0 then ledger.pages = {{}} end
  if type(ledger.page) ~= "number" then ledger.page = 1 end
  ledger.page = math.max(1, math.min(math.floor(ledger.page), #ledger.pages))
  ledger.draftEntry = tostring(ledger.draftEntry or "")
  ledger.draftDelta = tostring(ledger.draftDelta or "")
  for pageIndex, page in ipairs(ledger.pages) do
    if type(page) ~= "table" then
      ledger.pages[pageIndex] = {}
    else
      local cleaned = {}
      for _, entry in ipairs(page) do
        if type(entry) == "table" and tostring(entry.entry or "") ~= "" and tonumber(entry.delta) ~= nil then
          table.insert(cleaned, {
            entry = tostring(entry.entry),
            delta = math.floor(tonumber(entry.delta)),
          })
        end
      end
      ledger.pages[pageIndex] = cleaned
    end
  end
end

local function totalBalance()
  local balance = STARTING_BALANCE
  for _, page in ipairs(ledger.pages) do
    for _, entry in ipairs(page) do
      balance = balance + (tonumber(entry.delta) or 0)
    end
  end
  return balance
end

local function openingBalanceForPage(pageIndex)
  local balance = STARTING_BALANCE
  for index = 1, pageIndex - 1 do
    for _, entry in ipairs(ledger.pages[index] or {}) do
      balance = balance + (tonumber(entry.delta) or 0)
    end
  end
  return balance
end

local function formatDelta(value)
  value = tonumber(value) or 0
  if value > 0 then return "+" .. tostring(value) end
  return tostring(value)
end

local function setValue(id, value)
  self.UI.setValue(id, tostring(value or ""))
end

local function renderLedger()
  normalize()
  local currentPage = ledger.pages[ledger.page]
  local running = openingBalanceForPage(ledger.page)

  setValue("ledger-page-label", "PAGE " .. tostring(ledger.page) .. " OF " .. tostring(#ledger.pages))
  setValue("ledger-opening-balance", tostring(running))
  setValue("ledger-current-balance", tostring(totalBalance()))
  setValue("ledger-draft-entry", ledger.draftEntry)
  setValue("ledger-draft-delta", ledger.draftDelta)

  for row = 1, ROWS_PER_PAGE do
    local item = currentPage[row]
    if item ~= nil then
      running = running + (tonumber(item.delta) or 0)
      setValue("ledger-row-" .. row .. "-entry", item.entry)
      setValue("ledger-row-" .. row .. "-delta", formatDelta(item.delta))
      setValue("ledger-row-" .. row .. "-balance", running)
    else
      setValue("ledger-row-" .. row .. "-entry", "")
      setValue("ledger-row-" .. row .. "-delta", "")
      setValue("ledger-row-" .. row .. "-balance", "")
    end
  end

  self.setName("Capital Ledger — Balance: " .. tostring(totalBalance()))
  self.setDescription("Public Financier Capital record. Right-click or use OPEN LEDGER to inspect and record transactions.")
end

local function colorOf(player)
  if player ~= nil and player.color ~= nil then return player.color end
  if type(player) == "string" then return player end
  return "White"
end

local function message(player, text)
  broadcastToColor(text, colorOf(player), {0.95, 0.82, 0.45})
end

function openLedger(player)
  self.UI.setAttribute("ledger-window", "active", "true")
  renderLedger()
end

function openLedgerButton(object, playerColor, altClick)
  openLedger(playerColor)
end

function closeLedger(player, value, id)
  self.UI.setAttribute("ledger-window", "active", "false")
end

function updateLedgerDraftEntry(player, value, id)
  ledger.draftEntry = tostring(value or "")
end

function updateLedgerDraftDelta(player, value, id)
  ledger.draftDelta = tostring(value or "")
end

function addLedgerEntry(player, value, id)
  normalize()
  local entryText = tostring(ledger.draftEntry or ""):gsub("^%s+", ""):gsub("%s+$", "")
  local deltaText = tostring(ledger.draftDelta or ""):gsub("%s+", "")
  local delta = tonumber(deltaText)

  if entryText == "" then
    message(player, "Capital Ledger: enter a transaction description.")
    return
  end
  if delta == nil or delta ~= math.floor(delta) then
    message(player, "Capital Ledger: amount must be a whole number such as +2 or -3.")
    return
  end
  delta = math.floor(delta)
  if totalBalance() + delta < 0 then
    message(player, "Capital cannot fall below 0.")
    return
  end

  ledger.page = #ledger.pages
  if #ledger.pages[ledger.page] >= ROWS_PER_PAGE then
    table.insert(ledger.pages, {})
    ledger.page = #ledger.pages
  end

  table.insert(ledger.pages[ledger.page], {
    entry = entryText,
    delta = delta,
  })
  ledger.draftEntry = ""
  ledger.draftDelta = ""
  renderLedger()
end

function undoLedgerEntry(player, value, id)
  normalize()
  for pageIndex = #ledger.pages, 1, -1 do
    local page = ledger.pages[pageIndex]
    if #page > 0 then
      table.remove(page, #page)
      while #ledger.pages > 1 and #ledger.pages[#ledger.pages] == 0 do
        table.remove(ledger.pages, #ledger.pages)
      end
      ledger.page = math.min(pageIndex, #ledger.pages)
      renderLedger()
      return
    end
  end
  message(player, "Capital Ledger: there is no transaction to undo.")
end

function previousLedgerPage(player, value, id)
  normalize()
  if ledger.page > 1 then ledger.page = ledger.page - 1 end
  renderLedger()
end

function nextLedgerPage(player, value, id)
  normalize()
  if ledger.page < #ledger.pages then ledger.page = ledger.page + 1 end
  renderLedger()
end

function turnLedgerPage(player, value, id)
  normalize()
  if ledger.page < #ledger.pages then
    ledger.page = ledger.page + 1
  elseif #ledger.pages[ledger.page] == 0 then
    message(player, "Capital Ledger: the current page is still blank.")
  else
    table.insert(ledger.pages, {})
    ledger.page = #ledger.pages
  end
  renderLedger()
end

function onSave()
  normalize()
  return JSON.encode(ledger)
end

function onLoad(savedData)
  ledger = safeDecode(savedData) or ledger
  normalize()
  self.clearButtons()
  self.createButton({
    click_function = "openLedgerButton",
    function_owner = self,
    label = "OPEN LEDGER",
    position = {0, 0.28, -2.02},
    rotation = {0, 0, 0},
    width = 920,
    height = 220,
    font_size = 90,
    color = {0.12, 0.23, 0.15, 0.96},
    font_color = {0.96, 0.90, 0.72, 1},
    hover_color = {0.18, 0.32, 0.21, 1},
    press_color = {0.08, 0.16, 0.10, 1},
    tooltip = "Open the public Capital Ledger",
  })
  self.addContextMenuItem("Open Ledger", function(playerColor) openLedger(playerColor) end)
  Wait.frames(renderLedger, 1)
end
`;
}

function capitalLedgerXml() {
  const rows = Array.from({ length: CAPITAL_LEDGER_ROWS_PER_PAGE }, (_, index) => {
    const row = index + 1;
    return `
      <HorizontalLayout preferredHeight="42" childForceExpandHeight="true" childForceExpandWidth="false" spacing="6">
        <Text id="ledger-row-${row}-entry" text="" preferredWidth="430" fontSize="25" color="#2E281F" alignment="MiddleLeft" />
        <Text id="ledger-row-${row}-delta" text="" preferredWidth="120" fontSize="25" color="#2E281F" alignment="MiddleCenter" />
        <Text id="ledger-row-${row}-balance" text="" preferredWidth="130" fontSize="25" color="#2E281F" alignment="MiddleCenter" />
      </HorizontalLayout>`;
  }).join('');

  return `<Panel id="ledger-window" active="false" width="820" height="930" position="0 0 -500" rotation="0 0 180" color="#E8D9B8F5" outline="#31291F" outlineSize="3 3" padding="22 22 22 22">
    <VerticalLayout childForceExpandHeight="false" childForceExpandWidth="true" spacing="8">
      <HorizontalLayout preferredHeight="66" childForceExpandWidth="false">
        <Text text="FINANCIERS" preferredWidth="220" fontSize="24" color="#324D37" alignment="MiddleLeft" />
        <Text text="CAPITAL LEDGER" preferredWidth="380" fontSize="37" color="#252018" alignment="MiddleCenter" />
        <Button text="CLOSE" onClick="closeLedger" preferredWidth="140" fontSize="22" color="#4A4134" textColor="#F4E8CC" />
      </HorizontalLayout>

      <HorizontalLayout preferredHeight="54" childForceExpandWidth="false" spacing="8">
        <Text text="Opening Balance" preferredWidth="210" fontSize="23" color="#3A3328" alignment="MiddleLeft" />
        <Text id="ledger-opening-balance" text="2" preferredWidth="90" fontSize="28" color="#252018" alignment="MiddleCenter" />
        <Text id="ledger-page-label" text="PAGE 1 OF 1" preferredWidth="220" fontSize="20" color="#5E5545" alignment="MiddleCenter" />
        <Text text="CURRENT CAPITAL" preferredWidth="170" fontSize="20" color="#324D37" alignment="MiddleRight" />
        <Text id="ledger-current-balance" text="2" preferredWidth="70" fontSize="32" color="#1F3D27" alignment="MiddleCenter" />
      </HorizontalLayout>

      <Panel preferredHeight="2" color="#665A46" />

      <HorizontalLayout preferredHeight="42" childForceExpandWidth="false" spacing="6">
        <Text text="ENTRY" preferredWidth="430" fontSize="22" color="#4A4134" alignment="MiddleLeft" />
        <Text text="±" preferredWidth="120" fontSize="22" color="#4A4134" alignment="MiddleCenter" />
        <Text text="BALANCE" preferredWidth="130" fontSize="22" color="#4A4134" alignment="MiddleCenter" />
      </HorizontalLayout>

      ${rows}

      <Panel preferredHeight="2" color="#665A46" />

      <HorizontalLayout preferredHeight="60" childForceExpandWidth="false" spacing="8">
        <InputField id="ledger-draft-entry" text="" placeholder="Transaction (Income, Buy Deed, Play the Market…)" onValueChanged="updateLedgerDraftEntry" preferredWidth="430" fontSize="23" textColor="#282218" />
        <InputField id="ledger-draft-delta" text="" placeholder="+ / −" onValueChanged="updateLedgerDraftDelta" preferredWidth="120" fontSize="23" textColor="#282218" />
        <Button text="POST ENTRY" onClick="addLedgerEntry" preferredWidth="180" fontSize="22" color="#324D37" textColor="#F4E8CC" />
      </HorizontalLayout>

      <HorizontalLayout preferredHeight="56" childForceExpandWidth="false" spacing="8">
        <Button text="◀ PREVIOUS" onClick="previousLedgerPage" preferredWidth="160" fontSize="20" color="#5A5143" textColor="#F4E8CC" />
        <Button text="NEXT ▶" onClick="nextLedgerPage" preferredWidth="140" fontSize="20" color="#5A5143" textColor="#F4E8CC" />
        <Button text="TURN PAGE" onClick="turnLedgerPage" preferredWidth="170" fontSize="20" color="#324D37" textColor="#F4E8CC" />
        <Button text="UNDO LAST ENTRY" onClick="undoLedgerEntry" preferredWidth="220" fontSize="20" color="#6B493B" textColor="#F4E8CC" />
      </HorizontalLayout>

      <Text text="Public record · Opening Capital 2 · Capital may temporarily exceed the Capital Limit · Capital cannot fall below 0" preferredHeight="40" fontSize="18" color="#665A46" alignment="MiddleCenter" />
    </VerticalLayout>
  </Panel>`;
}

function makeSupplementalCard(component, releaseAssets, guid) {
  if (!component.tts?.faceFile || !component.tts?.backFile || !component.tts?.deckId) {
    throw new Error(`Ready supplemental card ${component.id} is missing rendered TTS metadata.`);
  }
  const deckId = String(component.tts.deckId);
  const state = makeCustomDeckState(
    requireHostedUrl(releaseAssets, component.tts.faceFile),
    requireHostedUrl(releaseAssets, component.tts.backFile),
    component.tts.numWidth || 1,
    component.tts.numHeight || 1,
  );
  const sideways = component.tts?.sidewaysCard === true;
  const tabletopRotation = component.family === 'deed-card' ? 0 : (sideways ? 90 : 0);
  const tags = component.family === 'deed-card'
    ? [DEED_TAG, FACTION_ZONE_TAG]
    : [FACTION_ZONE_TAG];
  return {
    Name: 'CardCustom',
    Transform: transform(0, 1, 0, tabletopRotation),
    Nickname: component.name || component.id,
    Description: `${component.faction || 'Faction'} supplemental · ${component.family || 'component'}`,
    GMNotes: `${SUPPLEMENTAL_GUID_NOTE_PREFIX}${component.id}`,
    ColorDiffuse: color(),
    Locked: false,
    Grid: true,
    Snap: true,
    Autoraise: true,
    Sticky: true,
    Tooltip: true,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: true,
    LuaScript: component.family === 'ledger' ? capitalLedgerLuaScript() : '',
    LuaScriptState: '',
    XmlUI: component.family === 'ledger' ? capitalLedgerXml() : '',
    GUID: guid(),
    CardID: Number(component.tts.cardId),
    SidewaysCard: sideways,
    Tags: tags,
    CustomDeck: { [deckId]: state },
  };
}

function makeSlidingTracker(component, starter, releaseAssets, guid) {
  if (!component.tts?.faceFile || component.tts?.stackable !== false) {
    throw new Error(`Ready sliding tracker ${component.id} is missing its production face or non-stackable metadata.`);
  }
  if (!starter.factionComponentBack?.file) {
    throw new Error(`Starter ${starter.id} has no faction-component back for tracker ${component.id}.`);
  }
  const faceUrl = requireHostedUrl(releaseAssets, component.tts.faceFile);
  const backUrl = requireHostedUrl(releaseAssets, starter.factionComponentBack.file);
  const snapTag = String(component.tts.snapTag || '').trim();
  const presentation = trackerPresentation(component);
  return {
    Name: 'Custom_Tile',
    Transform: transform(0, 1, 0, 0, presentation.transformScale, 1, presentation.transformScale),
    Nickname: component.name || component.id,
    Description: `${component.faction || 'Faction'} sliding tracker · ${component.physicalScale?.minimum ?? 0}–${component.physicalScale?.maximum ?? '?'}`,
    GMNotes: `${SUPPLEMENTAL_GUID_NOTE_PREFIX}${component.id}`,
    ColorDiffuse: color(),
    Locked: false,
    Grid: false,
    Snap: true,
    Autoraise: true,
    // Trackers are physical carriers: a snapped Leader (or the Intelligence
    // Intel Tracker + Leader chain) must move with the tracker beneath it.
    Sticky: true,
    Tooltip: true,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: false,
    LuaScript: presentation.luaScript,
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid(),
    Tags: [snapTag, FACTION_ZONE_TAG],
    CustomImage: {
      ImageURL: faceUrl,
      ImageSecondaryURL: backUrl,
      WidthScale: presentation.widthScale,
      CustomTile: {
        Type: presentation.tileType,
        Thickness: Number(component.tts.thickness || 0.05),
        Stackable: false,
        Stretch: presentation.stretch,
      },
    },
  };
}

function makeSupplementalObject(component, starter, releaseAssets, guid) {
  if (component.representation === 'card') return makeSupplementalCard(component, releaseAssets, guid);
  if (component.representation === 'sliding-tracker') return makeSlidingTracker(component, starter, releaseAssets, guid);
  throw new Error(`Ready supplemental component ${component.id} uses unsupported save representation ${component.representation || 'missing'}.`);
}

function makeSupplementalStack(cards, { key, nickname, description, stackRotation = 0, sidewaysCard = false, tags = [] }, guid) {
  if (!Array.isArray(cards) || cards.length < 2) throw new Error(`Supplemental stack ${key} needs at least two cards.`);
  const customDeck = {};
  for (const card of cards) {
    if (card?.Name !== 'CardCustom' || !Number.isFinite(Number(card.CardID))) throw new Error(`Supplemental stack ${key} contains a non-card object.`);
    Object.assign(customDeck, card.CustomDeck || {});
  }
  return {
    Name: 'DeckCustom',
    Transform: transform(0, 1, 0, stackRotation),
    Nickname: nickname,
    Description: description,
    GMNotes: `${SUPPLEMENTAL_STACK_NOTE_PREFIX}${key}`,
    ColorDiffuse: color(),
    Locked: false,
    Grid: true,
    Snap: true,
    Autoraise: true,
    Sticky: true,
    Tooltip: true,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: true,
    LuaScript: '',
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid(),
    DeckIDs: cards.map(card => Number(card.CardID)),
    SidewaysCard: sidewaysCard,
    ...(tags.length ? { Tags: [...tags] } : {}),
    CustomDeck: customDeck,
    ContainedObjects: cards,
  };
}

const FAMILY_STACKS = Object.freeze([
  {
    key: 'proposals',
    nickname: 'Proposals',
    description: 'Diplomat Proposal / ratified Treaty Article cards',
    expectedCount: 9,
    families: Object.freeze(['proposal-treaty-card']),
    tags: Object.freeze([FACTION_ZONE_TAG]),
  },
  {
    key: 'deeds',
    nickname: 'Deeds',
    description: 'Financier Deed cards',
    expectedCount: 8,
    families: Object.freeze(['deed-card']),
    stackRotation: 90,
    sidewaysCard: true,
    tags: Object.freeze([DEED_STACK_TAG, FACTION_ZONE_TAG]),
  },
  {
    key: 'rites-rituals',
    nickname: 'Rites + Ritual',
    description: 'Mystics Rites and Ritual of Ascension',
    expectedCount: 4,
    families: Object.freeze(['rite-card', 'ritual-card']),
    tags: Object.freeze([FACTION_ZONE_TAG]),
  },
]);

function componentIdFromObject(object) {
  const note = String(object?.GMNotes || '');
  return note.startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX)
    ? note.slice(SUPPLEMENTAL_GUID_NOTE_PREFIX.length)
    : null;
}

function familyDefinitionForComponent(component) {
  return FAMILY_STACKS.find(definition => definition.families.includes(component.family)) || null;
}

function orientGeneratedContentsForHost(bag) {
  for (const object of bag.ContainedObjects || []) {
    const notes = String(object?.GMNotes || '');
    const isSupplemental = notes.startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX);
    const isStack = notes.startsWith(SUPPLEMENTAL_STACK_NOTE_PREFIX);
    if (!isSupplemental && !isStack) continue;
    object.Transform ||= transform();
    const stackKind = isStack ? notes.slice(SUPPLEMENTAL_STACK_NOTE_PREFIX.length) : '';
    object.Transform.rotY = stackKind === 'deeds' ? 90 : 180;
  }
}

function stackGeneratedFamilies(bag, generatedEntries, guid) {
  const stacked = [];
  for (const definition of FAMILY_STACKS) {
    const matching = generatedEntries.filter(({ component, object }) => (
      object?.Name === 'CardCustom' && definition.families.includes(component.family)
    ));
    if (!matching.length) continue;
    if (matching.length !== definition.expectedCount) {
      throw new Error(`${bag.Nickname} has ${matching.length} ${definition.key} cards; expected ${definition.expectedCount}.`);
    }

    const members = new Set(matching.map(({ object }) => object));
    const firstIndex = bag.ContainedObjects.findIndex(object => members.has(object));
    const cards = matching.map(({ object }) => object);
    bag.ContainedObjects = bag.ContainedObjects.filter(object => !members.has(object));
    bag.ContainedObjects.splice(firstIndex, 0, makeSupplementalStack(cards, definition, guid));
    stacked.push(definition.key);
  }
  return stacked;
}

function supplementalStackOrder(stackKey, applicable) {
  const definition = FAMILY_STACKS.find(candidate => candidate.key === stackKey);
  if (!definition) return Number.MAX_SAFE_INTEGER;
  const index = applicable.findIndex(component => definition.families.includes(component.family));
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function reorderStarterBagContents(bag, starter, applicable) {
  const original = [...(bag.ContainedObjects || [])];
  const originalIndex = new Map(original.map((object, index) => [object, index]));
  const componentOrder = new Map(applicable.map((component, index) => [component.id, { component, index }]));
  const leader = findLeaderObject(bag, starter);

  const orderKey = object => {
    if (object === leader) return [0, 0];

    const notes = String(object?.GMNotes || '');
    if (notes.startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX)) {
      const id = notes.slice(SUPPLEMENTAL_GUID_NOTE_PREFIX.length);
      const record = componentOrder.get(id);
      if (!record) return [3, originalIndex.get(object) ?? Number.MAX_SAFE_INTEGER];
      if (record.component.representation === 'sliding-tracker') return [1, record.index];
      if (record.component.family === 'reference-card') return [2, record.index];
      return [3, record.index];
    }

    if (notes.startsWith(SUPPLEMENTAL_STACK_NOTE_PREFIX)) {
      return [3, supplementalStackOrder(notes.slice(SUPPLEMENTAL_STACK_NOTE_PREFIX.length), applicable)];
    }
    if (notes === `${STARTER_DECK_NOTE_PREFIX}${starter.id}`) return [4, 0];
    if (notes === `${STARTER_TERRITORY_STACK_NOTE_PREFIX}${starter.id}`) return [5, 0];

    // Player token and Battle Die (and any future non-card utilities) follow the
    // requested card/setup sequence instead of interrupting it.
    return [6, originalIndex.get(object) ?? Number.MAX_SAFE_INTEGER];
  };

  // TTS Bags extract from the END of ContainedObjects. Therefore the serialized
  // order must be the exact reverse of the intended setup sequence.
  bag.ContainedObjects = original.sort((left, right) => {
    const a = orderKey(left);
    const b = orderKey(right);
    return b[0] - a[0] || b[1] - a[1];
  });
}

function starterBagNickname(starter) {
  return `${starter.name} — ${starter.leader.name}`;
}

function stripSupplementalDescription(description) {
  return String(description || '').replace(/\n\nReady (?:faction )?supplement(?:al components|als):[^\n]*$/u, '');
}

function findStarterBag(save, starter) {
  const nickname = starterBagNickname(starter);
  const matches = (save.ObjectStates || []).filter(object => object?.Name === 'Bag' && object?.Nickname === nickname);
  if (matches.length !== 1) throw new Error(`Expected exactly one starter Bag named ${JSON.stringify(nickname)}; found ${matches.length}.`);
  return matches[0];
}

function validateSupplementalManifest(supplementalManifest, version) {
  if (supplementalManifest?.gameVersion !== version) throw new Error(`Supplemental manifest targets ${supplementalManifest?.gameVersion || 'no version'}; expected ${version}.`);
  const ready = supplementalManifest.ready || [];
  if (Number(supplementalManifest.readyCount) !== ready.length) throw new Error(`Supplemental manifest readyCount ${supplementalManifest.readyCount} does not match ${ready.length} ready records.`);
  const ids = new Set();
  for (const component of ready) {
    if (component.productionStatus !== 'ready') throw new Error(`Supplemental manifest includes non-ready component ${component.id || 'unknown'} in ready records.`);
    if (!component.id || ids.has(component.id)) throw new Error(`Supplemental manifest contains duplicate or missing component id ${component.id || 'unknown'}.`);
    ids.add(component.id);
    const quantity = Number(component.quantity || 0);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(`Ready supplemental component ${component.id} has invalid quantity ${component.quantity}.`);
  }
  return ready;
}

function addObjectTag(object, tag) {
  if (!tag) return;
  const tags = new Set(Array.isArray(object.Tags) ? object.Tags : []);
  tags.add(tag);
  object.Tags = [...tags].sort();
}

function removeGeneratedTrackerTags(object, generatedTags) {
  if (!Array.isArray(object?.Tags)) return;
  object.Tags = object.Tags.filter(tag => !generatedTags.has(tag));
  if (!object.Tags.length) delete object.Tags;
}

function findLeaderObject(bag, starter) {
  const matches = (bag.ContainedObjects || []).filter(object => object?.Name === 'CardCustom' && object?.Nickname === starter.leader.name);
  if (matches.length !== 1) throw new Error(`Starter ${starter.id} expected exactly one Leader card ${JSON.stringify(starter.leader.name)}; found ${matches.length}.`);
  return matches[0];
}

function findSupplementalObject(bag, componentId) {
  const note = `${SUPPLEMENTAL_GUID_NOTE_PREFIX}${componentId}`;
  const matches = [];
  const visit = objects => {
    for (const object of objects || []) {
      if (object?.GMNotes === note) matches.push(object);
      visit(object?.ContainedObjects);
    }
  };
  visit(bag.ContainedObjects);
  if (matches.length !== 1) throw new Error(`Starter bag expected exactly one supplemental object ${componentId}; found ${matches.length}.`);
  return matches[0];
}

function resolveTrackerCover(bag, starter, tracker) {
  if (tracker.cover?.kind === 'leader') return findLeaderObject(bag, starter);
  if (tracker.cover?.kind === 'component' && tracker.cover.componentId) return findSupplementalObject(bag, tracker.cover.componentId);
  throw new Error(`Sliding tracker ${tracker.id} has unsupported cover declaration ${JSON.stringify(tracker.cover || null)}.`);
}

function wireTrackerCovers(bag, starter, trackers, generatedTags) {
  for (const tracker of trackers) {
    const tag = String(tracker.tts?.snapTag || '').trim();
    if (!tag) throw new Error(`Sliding tracker ${tracker.id} has no snap tag.`);
    generatedTags.add(tag);
    addObjectTag(resolveTrackerCover(bag, starter, tracker), tag);
  }
}

function cleanPriorAssembly(save, generatedTags) {
  const visit = objects => {
    for (const object of objects || []) {
      if (object?.Name === 'Bag') {
        object.ContainedObjects = (object.ContainedObjects || []).filter(child => {
          const note = String(child?.GMNotes || '');
          return !note.startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX)
            && !note.startsWith(SUPPLEMENTAL_STACK_NOTE_PREFIX);
        });
      }
      removeGeneratedTrackerTags(object, generatedTags);
      visit(object?.ContainedObjects);
    }
  };
  visit(save.ObjectStates || []);
}

function riteIdFromComponent(component) {
  const id = String(component?.id || '');
  return id.startsWith('mystics-rite-') ? id.slice('mystics-rite-'.length) : '';
}

function componentAppliesToStarter(component, starter) {
  if (component?.deckInclusion === 'every-deck') return true;
  if (component?.faction !== starter?.factionId) return false;
  if (component?.family === 'rite-card') {
    const selectedRites = Array.isArray(starter?.selectedRites) ? starter.selectedRites : [];
    return selectedRites.includes(riteIdFromComponent(component));
  }
  return true;
}

function instantiateApplicableComponents(applicable, starter, releaseAssets, guid) {
  const entries = [];
  for (const component of applicable) {
    const quantity = Number(component.quantity);
    for (let copy = 0; copy < quantity; copy += 1) {
      entries.push({ component, object: makeSupplementalObject(component, starter, releaseAssets, guid) });
    }
  }
  return entries;
}

export function assembleReadySupplementals(save, starterManifest, supplementalManifest, releaseAssets) {
  const version = String(starterManifest?.gameVersion || '').trim();
  if (!version || supplementalManifest?.gameVersion !== version || releaseAssets?.gameVersion !== version || releaseAssets?.releaseTag !== version) {
    throw new Error('TTS supplemental assembly requires matching starter, supplemental, and hosted-asset versions.');
  }
  const ready = validateSupplementalManifest(supplementalManifest, version);
  const trackerTags = new Set(ready
    .filter(component => component.representation === 'sliding-tracker')
    .map(component => component.tts?.snapTag)
    .filter(Boolean));
  cleanPriorAssembly(save, trackerTags);

  const guid = makeContinuationGuidFactory(save);
  const assembledIds = new Set();
  const starterSummaries = [];
  for (const starter of starterManifest.decks || []) {
    const bag = findStarterBag(save, starter);
    const applicable = ready.filter(component => componentAppliesToStarter(component, starter));
    const trackers = applicable.filter(component => component.representation === 'sliding-tracker');
    const generatedEntries = instantiateApplicableComponents(applicable, starter, releaseAssets, guid);

    bag.ContainedObjects ||= [];
    bag.ContainedObjects.push(...generatedEntries.map(({ object }) => object));
    wireTrackerCovers(bag, starter, trackers, trackerTags);
    const stackedFamilies = stackGeneratedFamilies(bag, generatedEntries, guid);
    orientGeneratedContentsForHost(bag);
    reorderStarterBagContents(bag, starter, applicable);
    for (const component of applicable) assembledIds.add(component.id);

    const names = applicable.map(component => component.name || component.id);
    const baseDescription = stripSupplementalDescription(bag.Description);
    bag.Description = `${baseDescription}\n\nReady faction supplementals: ${names.join(', ')}`;
    starterSummaries.push({
      starterId: starter.id,
      supplementalIds: applicable.map(component => component.id),
      stackedFamilies,
    });
  }

  const missingReadyIds = ready
    .filter(component => component.deckInclusion !== 'selected-rite' && !assembledIds.has(component.id))
    .map(component => component.id);
  if (missingReadyIds.length) throw new Error(`Ready supplemental components were not assembled into any starter kit: ${missingReadyIds.join(', ')}.`);

  for (const field of ['Note', 'Rules']) {
    const existing = String(save[field] || '');
    save[field] = existing.includes(PENDING_SUPPLEMENTAL_NOTE)
      ? existing.replace(PENDING_SUPPLEMENTAL_NOTE, ASSEMBLED_SUPPLEMENTAL_NOTE)
      : existing.includes(ASSEMBLED_SUPPLEMENTAL_NOTE)
        ? existing
        : `${existing.trim()}\n\n${ASSEMBLED_SUPPLEMENTAL_NOTE}`.trim();
  }
  return { save, starterSummaries, assembledIds: [...assembledIds] };
}

async function readReleaseAssetManifest(version) {
  const names = await readdir(STAGING_ROOT).catch(error => {
    if (error.code === 'ENOENT') throw new Error('TTS supplemental assembly requires staged hosted assets. Run npm run tts:release:stage first.');
    throw error;
  });
  const candidates = names.filter(name => /^Gauntlet_.*_TTS_Release_Assets\.json$/i.test(name));
  if (candidates.length !== 1) throw new Error(`Expected exactly one staged TTS release-asset manifest; found ${candidates.length}.`);
  const manifest = JSON.parse(await readFile(join(STAGING_ROOT, candidates[0]), 'utf8'));
  if (manifest.gameVersion !== version || manifest.releaseTag !== version) throw new Error(`Staged TTS release-asset manifest targets ${manifest.gameVersion || manifest.releaseTag || 'unknown'}; expected ${version}.`);
  return manifest;
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const release = await resolveCurrentTtsRelease();
  if (checkOnly) {
    console.log(`Current TTS supplemental save assembly source check passed for ${release.version}.`);
    return;
  }
  const versionedName = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const versionedPath = join(release.outputRoot, versionedName);
  const [save, starterManifest, supplementalManifest, releaseAssets, catalog, cardManifest, territoryManifest] = await Promise.all([
    readFile(versionedPath, 'utf8').then(JSON.parse),
    readFile(join(release.outputRoot, 'starter-deck-manifest.json'), 'utf8').then(JSON.parse),
    readFile(join(release.outputRoot, 'supplemental-manifest.json'), 'utf8').then(JSON.parse),
    readReleaseAssetManifest(release.version),
    buildCatalog(),
    readFile(join(release.outputRoot, 'manifest.json'), 'utf8').then(JSON.parse),
    readFile(join(release.outputRoot, 'territory-manifest.json'), 'utf8').then(JSON.parse),
  ]);
  const result = assembleReadySupplementals(save, starterManifest, supplementalManifest, releaseAssets);
  const importerEnabled = isDeckImporterReleaseVersion(release.version);
  if (importerEnabled) {
    const importerConfig = buildDeckImporterConfig({
      version: release.version,
      catalog,
      cardManifest,
      territoryManifest,
      starterManifest,
      supplementalManifest,
      releaseAssets,
    });
    installDeckImporter(result.save, importerConfig);
  }
  const text = jsonText(result.save);
  await writeFile(versionedPath, text);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json'), text);
  const importerStatus = importerEnabled ? ' and installed Deckbuilder import' : '';
  console.log(`Assembled ${result.assembledIds.length} ready supplemental component ids${importerStatus} into ${result.starterSummaries.length} starter kits in ${relative(ROOT, versionedPath)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
