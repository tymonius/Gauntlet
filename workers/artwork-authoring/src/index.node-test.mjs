import assert from 'node:assert/strict';
import test from 'node:test';
import { __test } from './index.js';
import { __sessionTest } from './index-session.js';
import { __testReady } from './index-publish-ready.js';
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
  const explicit = { fit: 'cover', focusX: 0.5, focusY: 0.4182, smart: false, zoom: 1 };
  assert.deepEqual(normalizeArtDirection(explicit), explicit);
  assert.deepEqual(updateArtDirectionMap({}, 'explicit-card', explicit), { 'explicit-card': explicit });
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

test('idle authoring branch only syncs when main is strictly ahead', () => {
  assert.equal(__sessionTest.canSyncIdleBranch({ ahead_by: 9, behind_by: 0 }), true);
  assert.equal(__sessionTest.canSyncIdleBranch({ ahead_by: 0, behind_by: 0 }), false);
  assert.equal(__sessionTest.canSyncIdleBranch({ ahead_by: 0, behind_by: 1 }), false);
  assert.equal(__sessionTest.canSyncIdleBranch({ ahead_by: 4, behind_by: 2 }), false);
});

test('GitHub validation failure is a no-op only when branches are identical', () => {
  assert.equal(__sessionTest.isNoOpValidation(422, 'Validation Failed', true), true);
  assert.equal(__sessionTest.isNoOpValidation(422, 'Validation Failed', false), false);
  assert.equal(__sessionTest.isNoOpValidation(409, 'Validation Failed', true), false);
  assert.equal(__sessionTest.isNoOpValidation(422, 'Other failure', true), false);
});

test('publish readiness waits while GitHub mergeability or status checks are unresolved', () => {
  assert.equal(__testReady.mergeabilityPending({ state: 'open', mergeable: null, mergeable_state: 'unknown' }), true);
  assert.equal(__testReady.mergeabilityPending({ state: 'open', mergeable: undefined, mergeable_state: 'unknown' }), true);
  assert.equal(__testReady.mergeabilityPending({ state: 'open', mergeable: true, mergeable_state: 'unstable' }), true);
  assert.equal(__testReady.mergeabilityPending({ state: 'open', mergeable: true, mergeable_state: 'clean' }), false);
  assert.equal(__testReady.mergeabilityPending({ state: 'open', mergeable: false, mergeable_state: 'dirty' }), false);
  assert.equal(__testReady.mergeabilityPending({ state: 'closed', mergeable: null, mergeable_state: 'unknown' }), false);
});
