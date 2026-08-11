import { readFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_TEXT_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';
const repository = process.env.GITHUB_REPOSITORY ?? 'tymonius/Gauntlet';
const commentId = process.env.V063_FINALIZED_TRACKER_COMMENT_ID ?? '5221286097';
const token = process.env.GITHUB_TOKEN ?? '';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const byName = new Map((candidate.cards ?? []).map((card) => [card.name, card]));

const smugglersRun = (candidate.territories ?? []).find((territory) => territory.id === 'territory-smuggler-s-pass');
if (!smugglersRun) throw new Error('Stable Smuggler Territory ID territory-smuggler-s-pass is missing.');
if (smugglersRun.name !== "Smuggler's Run") {
  throw new Error(`Expected v0.6.3 Territory title Smuggler's Run; found ${smugglersRun.name}.`);
}
const activeTerritoryAndStarterText = JSON.stringify({
  territories: candidate.territories ?? [],
  starter_decks: candidate.starter_decks ?? null
});
if (activeTerritoryAndStarterText.includes("Smuggler's Pass")) {
  throw new Error("Retired Smuggler's Pass title remains in active v0.6.3 Territory or starter data.");
}

const secondLine = (candidate.cards ?? []).find((card) => card.id === 'neutral-reserves');
if (!secondLine) throw new Error('Stable card ID neutral-reserves is missing.');
if (secondLine.name !== 'Second Line') {
  throw new Error(`Expected v0.6.3 card title Second Line; found ${secondLine.name}.`);
}
if (JSON.stringify(candidate.starter_decks ?? null).includes('"Reserves"')) {
  throw new Error('Retired Reserves card title remains in active v0.6.3 starter data.');
}

const response = await fetch(`https://api.github.com/repos/${repository}/issues/comments/${commentId}`, {
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
});

if (!response.ok) {
  throw new Error(`Unable to read canonical #405 finalized-text tracker: HTTP ${response.status}.`);
}

const payload = await response.json();
const trackedCards = parseTracker(String(payload.body ?? ''));
if (!trackedCards.length) throw new Error('Canonical #405 tracker contained no finalized cards.');

for (const tracked of trackedCards) {
  const card = byName.get(tracked.name);
  if (!card) throw new Error(`Canonical #405 tracker names unknown card: ${tracked.name}.`);

  const actual = (card.effects ?? []).map((effect) => ({
    label: effect.label,
    text: normalizeText(effect.text)
  }));
  const expected = tracked.effects.map((effect) => ({
    label: effect.label,
    text: normalizeText(effect.text)
  }));

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Finalized #405 tracker drift for ${tracked.name}.\n` +
      `Tracker: ${JSON.stringify(expected, null, 2)}\n` +
      `Candidate: ${JSON.stringify(actual, null, 2)}`
    );
  }
}

console.log(`Verified Smuggler's Run and Second Line propagation and ${trackedCards.length} finalized card(s) directly against canonical #405 comment ${commentId}.`);

function parseTracker(body) {
  const lines = body.replace(/\r/g, '').split('\n');
  const cards = [];
  let currentCard = null;
  let currentEffect = null;

  const flushEffect = () => {
    if (!currentCard || !currentEffect) return;
    currentEffect.text = trimBlankLines(currentEffect.lines)
      .map(stripFormatting)
      .join('\n');
    delete currentEffect.lines;
    currentCard.effects.push(currentEffect);
    currentEffect = null;
  };

  const flushCard = () => {
    flushEffect();
    if (currentCard) {
      if (!currentCard.effects.length) throw new Error(`Tracker section ${currentCard.name} has no effect text.`);
      cards.push(currentCard);
    }
    currentCard = null;
  };

  for (const line of lines) {
    const cardHeading = line.match(/^##\s+(.+?)\s*$/);
    if (cardHeading) {
      flushCard();
      currentCard = { name: cardHeading[1].trim(), effects: [] };
      continue;
    }
    if (!currentCard) continue;

    const effectHeading = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
    if (effectHeading) {
      flushEffect();
      currentEffect = {
        label: effectHeading[1].trim(),
        lines: effectHeading[2] ? [effectHeading[2]] : []
      };
      continue;
    }

    if (currentEffect) currentEffect.lines.push(line);
  }

  flushCard();
  return cards;
}

function stripFormatting(line) {
  return line.replace(/\*\*/g, '').replace(/[ \t]+$/g, '');
}

function trimBlankLines(lines) {
  const result = [...lines];
  while (result.length && !result[0].trim()) result.shift();
  while (result.length && !result.at(-1).trim()) result.pop();
  return result;
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();
}
