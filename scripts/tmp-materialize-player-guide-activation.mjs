import { readFile, writeFile } from 'node:fs/promises';

const contractPath = 'config/rules-surface-contract.json';
const contract = JSON.parse(await readFile(contractPath, 'utf8'));
const playerGuide = contract?.publicationArchitecture?.playerGuide;

if (!playerGuide) throw new Error('Player Guide contract is missing.');

const fingerprints = {
  welcome: '6e20765329e442dacd730da7e230acebb1654f50467353e3b41003e4921622de',
  'battlefield-and-victory': 'fba631a4350b27d3073e637bcc8911cc6ee9960130aa9932ade42f7a8a44e0c7',
  'cards-and-play-area': 'cc0e2b3fda8fea00ffe17537bdfa0bcfab2d7fe65ce480411980e49556071457',
  setup: 'bd79412a02ace0d82d21717dda44b7922dd718919fa667df46145fa0243e896a',
  turn: '143ff119d9a7ced6776ee016f7c2339a3bbb3f8863c2f7c2faec9253762b0963',
  movement: '0543d98e3a1b509d0a5ab0b1fdce6c2c74cb99a7240cd227934f38768a3c56eb',
  battles: '9df1f08972f8bf117fcd8513dcbffcd025752792f53d36c8de4326e49c552fd3',
  ground: 'a80ea7420d46471b259e6d2de7aecb6aa838318a14a818293ea45eaabf128ae8',
  'run-the-gauntlet': '0ab58c2b5625409509a05f38e74671e0ff2c6a651faa4fed19ad372c0edb2365',
  factions: '744b3c4562a541224c90b0621089f6c8f7f7d6068b9d7e24dabd31da95a6ba93',
  deckbuilding: '8363911f06d4b1d2576dbce46d0f38cc3235a7ac992ac5da1927dfa34a3de816',
};

playerGuide.status = 'active';
for (const chapter of playerGuide.chapters || []) {
  if (chapter.id === 'next') {
    delete chapter.reviewFingerprint;
    continue;
  }
  const fingerprint = fingerprints[chapter.id];
  if (!fingerprint) throw new Error(`Missing fingerprint for Player Guide chapter ${chapter.id}.`);
  chapter.reviewFingerprint = fingerprint;
}

const seen = new Set((playerGuide.chapters || []).filter(chapter => chapter.id !== 'next').map(chapter => chapter.id));
for (const id of Object.keys(fingerprints)) {
  if (!seen.has(id)) throw new Error(`Fingerprint map contains unknown Player Guide chapter ${id}.`);
}

await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
