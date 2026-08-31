import { requireHostedUrl } from './generate-tts-save.mjs';

export const TTS_DECK_CODE_PREFIX = 'GDL1:';
export const TTS_DECK_IMPORTER_MIN_VERSION = 'v0.7.1';

function parseReleaseVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(String(value || '').trim());
  return match ? match.slice(1, 4).map(Number) : null;
}

export function isDeckImporterReleaseVersion(version) {
  const current = parseReleaseVersion(version);
  const minimum = parseReleaseVersion(TTS_DECK_IMPORTER_MIN_VERSION);
  if (!current || !minimum) return false;
  for (let index = 0; index < 3; index += 1) {
    if (current[index] > minimum[index]) return true;
    if (current[index] < minimum[index]) return false;
  }
  return true;
}
const LUA_BEGIN = '-- GAUNTLET_DECK_IMPORTER_BEGIN';
const LUA_END = '-- GAUNTLET_DECK_IMPORTER_END';
const XML_BEGIN = '<!-- GAUNTLET_DECK_IMPORTER_BEGIN -->';
const XML_END = '<!-- GAUNTLET_DECK_IMPORTER_END -->';

function renderedIndex(manifest) {
  const index = new Map();
  for (const sheet of manifest?.sheets || []) {
    for (const card of sheet.cards || []) {
      index.set(card.id, {
        ...card,
        deckId: Number(sheet.deckId),
        faceFile: sheet.faceFile,
        numWidth: Number(sheet.numWidth),
        numHeight: Number(sheet.numHeight),
      });
    }
  }
  return index;
}

function assertSameVersion(version, ...manifests) {
  for (const manifest of manifests) {
    if (manifest?.gameVersion !== version) {
      throw new Error(`Deck importer manifest version mismatch: expected ${version}, found ${manifest?.gameVersion || 'missing'}.`);
    }
  }
}

export function buildDeckImporterConfig({
  version,
  catalog,
  cardManifest,
  territoryManifest,
  starterManifest,
  supplementalManifest,
  releaseAssets,
}) {
  if (!version) throw new Error('Deck importer requires a game version.');
  assertSameVersion(version, catalog, cardManifest, territoryManifest, starterManifest, supplementalManifest, releaseAssets);

  const renderedCards = renderedIndex(cardManifest);
  const renderedTerritories = renderedIndex(territoryManifest);
  const cards = {};
  for (const card of catalog.playableCards || []) {
    const render = renderedCards.get(card.id);
    if (!render) throw new Error(`Deck importer is missing rendered card ${card.id}.`);
    cards[card.id] = {
      name: card.name,
      faction: card.faction,
      cost: Number(card.cost),
      unique: Boolean(card.unique),
      cardId: Number(render.ttsCardId),
      deckId: Number(render.deckId),
      faceUrl: requireHostedUrl(releaseAssets, render.faceFile),
      numWidth: Number(render.numWidth),
      numHeight: Number(render.numHeight),
    };
  }

  const territories = {};
  for (const territory of catalog.territories || []) {
    const render = renderedTerritories.get(territory.id);
    if (!render) throw new Error(`Deck importer is missing rendered Territory ${territory.id}.`);
    territories[territory.id] = {
      name: territory.name,
      arena: Boolean(territory.arena),
      cardId: Number(render.ttsCardId),
      deckId: Number(render.deckId),
      faceUrl: requireHostedUrl(releaseAssets, render.faceFile),
      numWidth: Number(render.numWidth),
      numHeight: Number(render.numHeight),
    };
  }

  const starters = {};
  const backFiles = new Set();
  for (const starter of starterManifest.decks || []) {
    const key = `${starter.factionId}:${starter.leaderId}`;
    if (starters[key]) throw new Error(`Deck importer has duplicate starter key ${key}.`);
    starters[key] = {
      starterId: starter.id,
      starterName: starter.name,
      leaderName: starter.leader?.name || starter.leaderId,
    };
    if (starter.back?.file) backFiles.add(starter.back.file);
  }
  if (!Object.keys(starters).length) throw new Error('Deck importer requires starter kit templates.');
  if (backFiles.size !== 1) throw new Error('Deck importer requires one shared playable/Territory back.');
  const [backFile] = [...backFiles];

  const rites = {};
  const riteComponents = (supplementalManifest.ready || []).filter(component => component.family === 'rite-card' && component.faction === 'mystics');
  for (const component of riteComponents) {
    const id = String(component.id || '').replace(/^mystics-rite-/, '');
    if (!id || id === component.id || rites[id]) throw new Error(`Deck importer has invalid or duplicate Mystics Rite component ${component.id || 'missing'}.`);
    rites[id] = {
      name: component.name,
      cardId: Number(component.tts?.cardId),
      deckId: Number(component.tts?.deckId),
      frontUrl: requireHostedUrl(releaseAssets, component.tts?.faceFile || component.frontFile),
      backUrl: requireHostedUrl(releaseAssets, component.tts?.backFile || component.reverseFile),
      numWidth: Number(component.tts?.numWidth || 1),
      numHeight: Number(component.tts?.numHeight || 1),
    };
  }

  const rituals = (supplementalManifest.ready || []).filter(component => component.family === 'ritual-card' && component.faction === 'mystics');
  if (rituals.length !== 1) throw new Error(`Deck importer requires exactly one Mystics Ritual component; found ${rituals.length}.`);
  const ritualComponent = rituals[0];
  const ritual = {
    name: ritualComponent.name,
    cardId: Number(ritualComponent.tts?.cardId),
    deckId: Number(ritualComponent.tts?.deckId),
    frontUrl: requireHostedUrl(releaseAssets, ritualComponent.tts?.faceFile || ritualComponent.frontFile),
    backUrl: requireHostedUrl(releaseAssets, ritualComponent.tts?.backFile || ritualComponent.reverseFile),
    numWidth: Number(ritualComponent.tts?.numWidth || 1),
    numHeight: Number(ritualComponent.tts?.numHeight || 1),
  };

  const mysticsStarters = (starterManifest.decks || []).filter(starter => starter.factionId === 'mystics');
  const selectedRiteCounts = new Set(mysticsStarters.map(starter => Array.isArray(starter.selectedRites) ? starter.selectedRites.length : 0));
  if (!mysticsStarters.length || selectedRiteCounts.size !== 1 || [...selectedRiteCounts][0] <= 0) {
    throw new Error('Deck importer requires a consistent selected-Rite count across Mystics starter kits.');
  }
  const selectedRiteCount = [...selectedRiteCounts][0];
  for (const starter of mysticsStarters) {
    for (const id of starter.selectedRites || []) {
      if (!rites[id]) throw new Error(`Deck importer is missing rendered Mystics Rite ${id}.`);
    }
  }

  return {
    schemaVersion: 1,
    codePrefix: TTS_DECK_CODE_PREFIX,
    gameVersion: version,
    minimumCards: Number(starterManifest.construction?.minimumCards || 30),
    maximumDeckbuildingValue: Number(starterManifest.construction?.maximumDeckbuildingValue || 60),
    territoriesPerPlayer: Number(starterManifest.construction?.territoryCount || starterManifest.construction?.territoriesPerPlayer || 3),
    maximumArenas: Number(starterManifest.construction?.maximumArenas || 1),
    selectedRiteCount,
    backUrl: requireHostedUrl(releaseAssets, backFile),
    cards,
    territories,
    rites,
    ritual,
    starters,
  };
}

function luaLongString(value) {
  const text = String(value);
  for (let equals = 0; equals < 8; equals += 1) {
    const marker = '='.repeat(equals);
    const close = `]${marker}]`;
    if (!text.includes(close)) return `[${marker}[${text}]${marker}]`;
  }
  throw new Error('Unable to encode Deck importer configuration as a Lua long string.');
}

function deckImporterLua(config) {
  const configJson = JSON.stringify(config);
  return `${LUA_BEGIN}
local GAUNTLET_DECK_IMPORT = JSON.decode(${luaLongString(configJson)})
local gauntletDeckImportCodes = {}

local function gauntletColorOf(player)
  if player == nil then return "" end
  local ok, color = pcall(function() return player.color end)
  if ok and color ~= nil then return tostring(color) end
  return tostring(player or "")
end

local function gauntletTrim(value)
  return tostring(value or ""):gsub("^%s+", ""):gsub("%s+$", "")
end

local function gauntletStartsWith(value, prefix)
  return string.sub(tostring(value or ""), 1, string.len(prefix)) == prefix
end

local function gauntletMessage(color, text, errorMessage)
  local tint = errorMessage and {0.95, 0.35, 0.28} or {0.95, 0.82, 0.45}
  if color == "White" or color == "Green" then
    broadcastToColor(text, color, tint)
  else
    broadcastToAll(text, tint)
  end
end

local function gauntletDeepCopy(value)
  return JSON.decode(JSON.encode(value))
end

local function gauntletCustomDeckState(meta)
  return {
    FaceURL = meta.faceUrl,
    BackURL = GAUNTLET_DECK_IMPORT.backUrl,
    NumWidth = tonumber(meta.numWidth),
    NumHeight = tonumber(meta.numHeight),
    BackIsHidden = true,
    UniqueBack = false,
  }
end

local function gauntletSupplementalCardState(meta)
  return {
    FaceURL = meta.frontUrl,
    BackURL = meta.backUrl,
    NumWidth = tonumber(meta.numWidth),
    NumHeight = tonumber(meta.numHeight),
    BackIsHidden = true,
    UniqueBack = false,
  }
end

local function gauntletClearGuids(node)
  if type(node) ~= "table" then return end
  node.GUID = nil
  if type(node.ContainedObjects) == "table" then
    for _, child in ipairs(node.ContainedObjects) do gauntletClearGuids(child) end
  end
end

local function gauntletFindChildByNotePrefix(bagData, prefix)
  for _, child in ipairs(bagData.ContainedObjects or {}) do
    if gauntletStartsWith(child.GMNotes, prefix) then return child end
  end
  return nil
end

local function gauntletFindStarterBag(starterId)
  local note = "gauntlet:starter-kit:" .. tostring(starterId)
  for _, object in ipairs(getAllObjects()) do
    if object.getGMNotes ~= nil and object.getGMNotes() == note then return object end
  end
  return nil
end

local function gauntletValidatePayload(payload)
  if type(payload) ~= "table" then return nil, "Deck Code payload is not an object." end
  if tostring(payload.v or "") ~= GAUNTLET_DECK_IMPORT.gameVersion then
    return nil, "This Deck was built for " .. tostring(payload.v or "an unknown version") .. "; this TTS mod uses " .. GAUNTLET_DECK_IMPORT.gameVersion .. ". Re-export it from the current Deckbuilder."
  end

  local faction = gauntletTrim(payload.f)
  local leader = gauntletTrim(payload.l)
  local starter = GAUNTLET_DECK_IMPORT.starters[faction .. ":" .. leader]
  if starter == nil then return nil, "No matching " .. faction .. " / " .. leader .. " starter kit exists in this TTS build." end

  if type(payload.c) ~= "table" then return nil, "Deck Code has no card list." end
  local seenCards = {}
  local cardCount = 0
  local pointTotal = 0
  for _, pair in ipairs(payload.c) do
    if type(pair) ~= "table" then return nil, "Deck Code contains an invalid card entry." end
    local id = tostring(pair[1] or "")
    local qty = tonumber(pair[2])
    local meta = GAUNTLET_DECK_IMPORT.cards[id]
    if meta == nil then return nil, "Card " .. id .. " is not present in this TTS build." end
    if seenCards[id] then return nil, "Deck Code lists " .. meta.name .. " more than once." end
    seenCards[id] = true
    if qty == nil or qty < 1 or qty ~= math.floor(qty) then return nil, "Invalid quantity for " .. meta.name .. "." end
    if meta.faction ~= "neutral" and meta.faction ~= faction then return nil, meta.name .. " is not legal for " .. faction .. "." end
    if meta.unique and qty > 1 then return nil, meta.name .. " is Unique." end
    cardCount = cardCount + qty
    pointTotal = pointTotal + (tonumber(meta.cost) or 0) * qty
  end
  if cardCount < GAUNTLET_DECK_IMPORT.minimumCards then
    return nil, "Deck has " .. tostring(cardCount) .. " cards; at least " .. tostring(GAUNTLET_DECK_IMPORT.minimumCards) .. " are required."
  end
  if pointTotal > GAUNTLET_DECK_IMPORT.maximumDeckbuildingValue then
    return nil, "Deck value is " .. tostring(pointTotal) .. "; maximum is " .. tostring(GAUNTLET_DECK_IMPORT.maximumDeckbuildingValue) .. "."
  end

  if type(payload.t) ~= "table" or #payload.t ~= GAUNTLET_DECK_IMPORT.territoriesPerPlayer then
    return nil, "Choose exactly " .. tostring(GAUNTLET_DECK_IMPORT.territoriesPerPlayer) .. " Territories."
  end
  local seenTerritories = {}
  local arenas = 0
  for _, idValue in ipairs(payload.t) do
    local id = tostring(idValue or "")
    local meta = GAUNTLET_DECK_IMPORT.territories[id]
    if meta == nil then return nil, "Territory " .. id .. " is not present in this TTS build." end
    if seenTerritories[id] then return nil, "Territories must be different." end
    seenTerritories[id] = true
    if meta.arena then arenas = arenas + 1 end
  end
  if arenas > GAUNTLET_DECK_IMPORT.maximumArenas then
    return nil, "Choose no more than " .. tostring(GAUNTLET_DECK_IMPORT.maximumArenas) .. " Arena."
  end

  local selectedRites = {}
  if faction == "mystics" then
    if type(payload.r) ~= "table" or #payload.r ~= GAUNTLET_DECK_IMPORT.selectedRiteCount then
      return nil, "Choose exactly " .. tostring(GAUNTLET_DECK_IMPORT.selectedRiteCount) .. " Mystics Rites."
    end
    local seenRites = {}
    for _, idValue in ipairs(payload.r) do
      local id = tostring(idValue or "")
      local meta = GAUNTLET_DECK_IMPORT.rites[id]
      if meta == nil then return nil, "Rite " .. id .. " is not present in this TTS build." end
      if seenRites[id] then return nil, "Mystics Rites must be different." end
      seenRites[id] = true
      table.insert(selectedRites, id)
    end
  end

  return {
    name = gauntletTrim(payload.n) ~= "" and gauntletTrim(payload.n) or "Imported Gauntlet Deck",
    faction = faction,
    leader = leader,
    starter = starter,
    cardCount = cardCount,
    pointTotal = pointTotal,
    cards = payload.c,
    territories = payload.t,
    rites = selectedRites,
  }, nil
end

local function gauntletBuildPlayableDeck(deck, validated)
  local cardTemplate = (deck.ContainedObjects or {})[1]
  if cardTemplate == nil then error("Starter Deck template has no cards.") end

  deck.Nickname = validated.name .. " Deck — " .. tostring(validated.cardCount) .. " cards"
  deck.Description = "Deckbuilder import · " .. tostring(validated.pointTotal) .. " deckbuilding value"
  deck.GMNotes = "gauntlet:custom-deck"
  deck.DeckIDs = {}
  deck.CustomDeck = {}
  deck.ContainedObjects = {}

  for _, pair in ipairs(validated.cards) do
    local id = tostring(pair[1])
    local qty = tonumber(pair[2])
    local meta = GAUNTLET_DECK_IMPORT.cards[id]
    local state = gauntletCustomDeckState(meta)
    deck.CustomDeck[tostring(meta.deckId)] = state
    for copyIndex = 1, qty do
      local card = gauntletDeepCopy(cardTemplate)
      card.Nickname = meta.name
      card.Description = (meta.faction == "neutral" and "Neutral" or validated.faction) .. " · Cost " .. tostring(meta.cost)
      card.GMNotes = "gauntlet:playable-card:" .. id
      card.CardID = tonumber(meta.cardId)
      card.SidewaysCard = false
      card.CustomDeck = { [tostring(meta.deckId)] = gauntletDeepCopy(state) }
      card.LuaScript = ""
      card.LuaScriptState = ""
      card.XmlUI = ""
      table.insert(deck.DeckIDs, tonumber(meta.cardId))
      table.insert(deck.ContainedObjects, card)
    end
  end
end

local function gauntletBuildTerritories(stack, validated)
  local territoryTemplate = (stack.ContainedObjects or {})[1]
  if territoryTemplate == nil then error("Starter Territory template has no cards.") end

  stack.Nickname = validated.name .. " Territories"
  stack.Description = "Three Territories selected in the Gauntlet Deckbuilder"
  stack.GMNotes = "gauntlet:custom-territories"
  stack.DeckIDs = {}
  stack.CustomDeck = {}
  stack.ContainedObjects = {}
  stack.SidewaysCard = true

  for _, idValue in ipairs(validated.territories) do
    local id = tostring(idValue)
    local meta = GAUNTLET_DECK_IMPORT.territories[id]
    local state = gauntletCustomDeckState(meta)
    local territory = gauntletDeepCopy(territoryTemplate)
    territory.Nickname = meta.name
    territory.Description = meta.arena and "Arena Territory" or "Territory"
    territory.GMNotes = "gauntlet:territory:" .. id
    territory.CardID = tonumber(meta.cardId)
    territory.SidewaysCard = true
    territory.CustomDeck = { [tostring(meta.deckId)] = gauntletDeepCopy(state) }
    territory.LuaScript = ""
    territory.LuaScriptState = ""
    territory.XmlUI = ""
    stack.CustomDeck[tostring(meta.deckId)] = state
    table.insert(stack.DeckIDs, tonumber(meta.cardId))
    table.insert(stack.ContainedObjects, territory)
  end
end

local function gauntletBuildMysticsRiteStack(stack, validated)
  local cardTemplate = (stack.ContainedObjects or {})[1]
  if cardTemplate == nil then error("Mystics Rite stack template has no cards.") end

  stack.Nickname = "Rites + Ritual"
  stack.Description = "Selected Mystics Rites and Ritual of Ascension from the Gauntlet Deckbuilder"
  stack.GMNotes = "gauntlet:supplemental-stack:rites-rituals"
  stack.DeckIDs = {}
  stack.CustomDeck = {}
  stack.ContainedObjects = {}
  stack.SidewaysCard = false

  local function addCard(meta, note, description)
    local state = gauntletSupplementalCardState(meta)
    local card = gauntletDeepCopy(cardTemplate)
    card.Nickname = meta.name
    card.Description = description
    card.GMNotes = note
    card.CardID = tonumber(meta.cardId)
    card.SidewaysCard = false
    card.CustomDeck = { [tostring(meta.deckId)] = gauntletDeepCopy(state) }
    card.LuaScript = ""
    card.LuaScriptState = ""
    card.XmlUI = ""
    stack.CustomDeck[tostring(meta.deckId)] = state
    table.insert(stack.DeckIDs, tonumber(meta.cardId))
    table.insert(stack.ContainedObjects, card)
  end

  for _, id in ipairs(validated.rites or {}) do
    local meta = GAUNTLET_DECK_IMPORT.rites[id]
    addCard(meta, "gauntlet:supplemental:mystics-rite-" .. id, "Mystics Rite")
  end
  addCard(GAUNTLET_DECK_IMPORT.ritual, "gauntlet:supplemental:mystics-ritual-of-ascension", "Mystics Ritual")
end

local function gauntletSpawnPosition(color)
  if color == "Green" then return {x = -7, y = 2.2, z = 13.5} end
  return {x = 7, y = 2.2, z = -13.5}
end

function gauntletOpenDeckImporter(player, value, id)
  local color = gauntletColorOf(player)
  if color ~= "White" and color ~= "Green" then
    gauntletMessage(color, "Sit in the White or Green seat before importing a Deck.", true)
    return
  end
  UI.show("gauntlet-deck-import-panel")
  UI.hide("gauntlet-deck-import-open")
end

function gauntletCloseDeckImporter(player, value, id)
  UI.hide("gauntlet-deck-import-panel")
  UI.show("gauntlet-deck-import-open")
end

function gauntletDeckImportChanged(player, value, id)
  local color = gauntletColorOf(player)
  gauntletDeckImportCodes[color] = tostring(value or "")
end

function gauntletImportDeck(player, value, id)
  local color = gauntletColorOf(player)
  if color ~= "White" and color ~= "Green" then
    gauntletMessage(color, "Sit in the White or Green seat before importing a Deck.", true)
    return
  end

  local raw = gauntletTrim(gauntletDeckImportCodes[color] or "")
  if not gauntletStartsWith(raw, GAUNTLET_DECK_IMPORT.codePrefix) then
    gauntletMessage(color, "Paste a Deck Code copied from the Gauntlet Deckbuilder.", true)
    return
  end

  local okDecode, payload = pcall(JSON.decode, string.sub(raw, string.len(GAUNTLET_DECK_IMPORT.codePrefix) + 1))
  if not okDecode then
    gauntletMessage(color, "That Deck Code is not valid JSON.", true)
    return
  end

  local validated, validationError = gauntletValidatePayload(payload)
  if validationError ~= nil then
    gauntletMessage(color, validationError, true)
    return
  end

  local templateBag = gauntletFindStarterBag(validated.starter.starterId)
  if templateBag == nil then
    gauntletMessage(color, "The official " .. validated.starter.leaderName .. " starter kit is not on the table. Reload the mod or restore that starter bag, then import again.", true)
    return
  end

  local okTemplate, bagData = pcall(JSON.decode, templateBag.getJSON())
  if not okTemplate or type(bagData) ~= "table" then
    gauntletMessage(color, "TTS could not read the starter-kit template.", true)
    return
  end

  local playableDeck = gauntletFindChildByNotePrefix(bagData, "gauntlet:starter-deck:")
  local territoryStack = gauntletFindChildByNotePrefix(bagData, "gauntlet:starter-territories:")
  local mysticsStack = validated.faction == "mystics"
    and gauntletFindChildByNotePrefix(bagData, "gauntlet:supplemental-stack:rites-rituals")
    or nil
  if playableDeck == nil or territoryStack == nil then
    gauntletMessage(color, "The starter-kit template is missing its Deck or Territory stack.", true)
    return
  end
  if validated.faction == "mystics" and mysticsStack == nil then
    gauntletMessage(color, "The Mystics starter-kit template is missing its Rites + Ritual stack.", true)
    return
  end

  local okBuild, buildError = pcall(function()
    gauntletBuildPlayableDeck(playableDeck, validated)
    gauntletBuildTerritories(territoryStack, validated)
    if mysticsStack ~= nil then gauntletBuildMysticsRiteStack(mysticsStack, validated) end
    bagData.Nickname = validated.name .. " — " .. validated.starter.leaderName
    bagData.Description = "Custom Deckbuilder starter kit\n\n" .. tostring(validated.cardCount) .. " cards · " .. tostring(validated.pointTotal) .. " deckbuilding value"
    bagData.GMNotes = "gauntlet:custom-starter:" .. validated.faction .. ":" .. validated.leader
    local position = gauntletSpawnPosition(color)
    bagData.Transform = bagData.Transform or {}
    bagData.Transform.posX = position.x
    bagData.Transform.posY = position.y
    bagData.Transform.posZ = position.z
    gauntletClearGuids(bagData)
  end)
  if not okBuild then
    gauntletMessage(color, "Could not assemble the custom Deck: " .. tostring(buildError), true)
    return
  end

  spawnObjectData({
    data = bagData,
    position = gauntletSpawnPosition(color),
    callback_function = function(spawned)
      gauntletMessage(color, "Imported " .. validated.name .. ". Unpack it like an official starter kit.", false)
      UI.hide("gauntlet-deck-import-panel")
      UI.show("gauntlet-deck-import-open")
      UI.setAttribute("gauntlet-deck-import-code", "text", "")
      gauntletDeckImportCodes[color] = ""
    end,
  })
end
${LUA_END}`;
}

function deckImporterXml() {
  return `${XML_BEGIN}
<Button id="gauntlet-deck-import-open" text="DECK IMPORT" onClick="gauntletOpenDeckImporter" width="138" height="34" rectAlignment="LowerRight" offsetXY="-24 24" fontSize="15" color="#3B3025EE" textColor="#F4E8CC" visibility="White|Green" tooltip="Import a Deck Code copied from the Gauntlet Deckbuilder." />
<Panel id="gauntlet-deck-import-panel" active="false" width="700" height="400" rectAlignment="MiddleCenter" color="#E8D9B8F7" outline="#31291F" outlineSize="3 3" padding="22 22 22 22" visibility="White|Green">
  <VerticalLayout childForceExpandHeight="false" childForceExpandWidth="true" spacing="12">
    <HorizontalLayout preferredHeight="54" childForceExpandWidth="false">
      <Text text="GAUNTLET DECK IMPORT" preferredWidth="520" fontSize="30" color="#252018" alignment="MiddleLeft" />
      <Button text="CLOSE" onClick="gauntletCloseDeckImporter" preferredWidth="130" fontSize="18" color="#4A4134" textColor="#F4E8CC" />
    </HorizontalLayout>
    <Text text="1. Copy a TTS Deck Code from the Gauntlet Deckbuilder.  2. Paste it below.  3. Import the starter kit." preferredHeight="48" fontSize="18" color="#4A4134" alignment="MiddleLeft" />
    <InputField id="gauntlet-deck-import-code" text="" placeholder="GDL1:{...}" onValueChanged="gauntletDeckImportChanged" onEndEdit="gauntletDeckImportChanged" lineType="MultiLineNewLine" preferredHeight="150" fontSize="18" textColor="#282218" />
    <Button text="IMPORT STARTER KIT" onClick="gauntletImportDeck" preferredHeight="56" fontSize="22" color="#324D37" textColor="#F4E8CC" />
    <Text text="You must be seated in White or Green. The imported Bag keeps the matching Leader and faction components, replaces its playable Deck and Territories, and uses the selected Mystics Rites when applicable." preferredHeight="54" fontSize="16" color="#665A46" alignment="MiddleCenter" />
  </VerticalLayout>
</Panel>
${XML_END}`;
}

function stripGeneratedBlock(text, begin, end) {
  const source = String(text || '');
  const start = source.indexOf(begin);
  if (start < 0) return source.trim();
  const finish = source.indexOf(end, start);
  if (finish < 0) return source.slice(0, start).trim();
  return `${source.slice(0, start)}${source.slice(finish + end.length)}`.trim();
}

export function installDeckImporter(save, config) {
  if (!save || !Array.isArray(save.ObjectStates)) throw new Error('Deck importer requires a TTS save.');
  const existingLua = stripGeneratedBlock(save.LuaScript, LUA_BEGIN, LUA_END);
  const existingXml = stripGeneratedBlock(save.XmlUI, XML_BEGIN, XML_END);
  save.LuaScript = [existingLua, deckImporterLua(config)].filter(Boolean).join('\n\n');
  save.XmlUI = [existingXml, deckImporterXml()].filter(Boolean).join('\n');
  return save;
}
