import assert from 'node:assert/strict';
import test from 'node:test';
import { __test } from './index.js';
import {
  normalizeArtDirection,
  parseArtDirectionSource,
  serializeArtDirectionMap,
  updateArtDirectionMap,
} from './format.js';

const SECRET = 'test-secret-with-enough-entropy-for-ci-only';

test('art direction source round-trips without eval', () => {
  const source = serializeArtDirectionMap({
    'z-card': { focusY: 0.4 },
    'a-card': { focus: [61, 37], zoom: 1.087, fit: 'contain' },
  });
  assert.ok(source.indexOf('"a-card"') < source.indexOf('"z-card"'));
  assert.deepEqual(parseArtDirectionSource(source), {
    'a-card': { focus: [0.61, 0.37], zoom: 1.09, fit: 'contain' },
    'z-card': { focusY: 0.4 },
  });
  assert.deepEqual(normalizeArtDirection({ focusX: 62.5 }), { focusX: 0.625 });
  assert.deepEqual(updateArtDirectionMap({ 'a-card': { focusX: 0.6 } }, 'a-card', {}), {});
});

test('oauth state is signed and rejects tampering', async () => {
  const now = Math.floor(Date.now() / 1000);
  const signed = await __test.signState({ returnTo: 'https://gauntlet.run/card-design/', exp: now + 60 }, SECRET);
  const parsed = await __test.verifyState(signed, SECRET);
  assert.equal(parsed.returnTo, 'https://gauntlet.run/card-design/');
  await assert.rejects(() => __test.verifyState(`${signed}x`, SECRET));
});

test('authoring sessions encrypt the github token', async () => {
  const now = Math.floor(Date.now() / 1000);
  const token = await __test.encryptSession({ githubToken: 'ghu_secret', login: 'tymonius', exp: now + 60 }, SECRET);
  assert.equal(token.includes('ghu_secret'), false);
  const parsed = await __test.decryptSession(token, SECRET);
  assert.equal(parsed.githubToken, 'ghu_secret');
  assert.equal(parsed.login, 'tymonius');
});

test('return urls are limited to the public card-design surface', () => {
  const env = { PUBLIC_SITE_ORIGIN: 'https://gauntlet.run' };
  assert.equal(__test.validateReturnTo('https://gauntlet.run/card-design/', env), 'https://gauntlet.run/card-design/');
  assert.throws(() => __test.validateReturnTo('https://evil.example/card-design/', env));
  assert.throws(() => __test.validateReturnTo('https://gauntlet.run/deckbuilder/', env));
});
