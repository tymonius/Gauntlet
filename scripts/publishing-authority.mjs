import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const PUBLISHING_AUTHORITY_SOURCE = 'config/publishing-authority.json';

let authorityPromise = null;

export function validatePublishingAuthority(authority) {
  if (authority?.schemaVersion !== 1 || authority?.project !== 'Gauntlet') {
    throw new Error('Invalid Gauntlet publishing-authority record.');
  }

  const imprint = authority?.imprint;
  const copyright = authority?.copyright;
  const playerFacing = authority?.playerFacing;
  const required = [
    ['imprint.displayName', imprint?.displayName],
    ['imprint.status', imprint?.status],
    ['imprint.role', imprint?.role],
    ['imprint.logo', imprint?.logo],
    ['copyright.holder', copyright?.holder],
    ['copyright.notice', copyright?.notice],
    ['playerFacing.publisherLine', playerFacing?.publisherLine],
    ['playerFacing.imprintStatement', playerFacing?.imprintStatement],
  ];
  for (const [label, value] of required) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Publishing authority is missing ${label}.`);
    }
  }

  if (imprint.status !== 'provisional' && imprint.status !== 'established') {
    throw new Error(`Unsupported publishing-imprint status: ${imprint.status}`);
  }
  if (imprint.role !== 'publishing imprint') {
    throw new Error(`Publishing authority role must be "publishing imprint"; found "${imprint.role}".`);
  }
  if (!existsSync(resolve(ROOT, imprint.logo))) {
    throw new Error(`Publishing-authority logo does not exist: ${imprint.logo}`);
  }

  const expectedPublisherLine = `Published by ${imprint.displayName}`;
  if (playerFacing.publisherLine !== expectedPublisherLine) {
    throw new Error(
      `playerFacing.publisherLine is "${playerFacing.publisherLine}", expected "${expectedPublisherLine}".`,
    );
  }
  if (!playerFacing.imprintStatement.includes(imprint.displayName)) {
    throw new Error('playerFacing.imprintStatement does not name the configured publishing imprint.');
  }
  if (!copyright.notice.includes(copyright.holder)) {
    throw new Error('Copyright notice does not name the configured copyright holder.');
  }

  return authority;
}

export async function loadPublishingAuthority() {
  if (!authorityPromise) {
    authorityPromise = readFile(resolve(ROOT, PUBLISHING_AUTHORITY_SOURCE), 'utf8')
      .then(JSON.parse)
      .then(validatePublishingAuthority)
      .catch(error => {
        authorityPromise = null;
        throw error;
      });
  }
  return authorityPromise;
}

export function derivePublishingFacts(authority) {
  validatePublishingAuthority(authority);
  return Object.freeze({
    'imprint.display_name': authority.imprint.displayName,
    'publisher.line': authority.playerFacing.publisherLine,
    'imprint.statement': authority.playerFacing.imprintStatement,
    'copyright.notice': authority.copyright.notice,
  });
}

const MARKER = /<!-- PUBLISHING-FACT:([a-z0-9_.-]+) -->([\s\S]*?)<!-- \/PUBLISHING-FACT -->/g;

export function synchronizePublishingFactMarkers(source, authority, expectedCounts = {}) {
  const facts = derivePublishingFacts(authority);
  const seen = new Map();
  const changes = [];

  const output = String(source ?? '').replace(MARKER, (whole, id, current) => {
    if (!Object.prototype.hasOwnProperty.call(facts, id)) {
      throw new Error(`Unknown publishing fact marker: ${id}`);
    }
    seen.set(id, (seen.get(id) || 0) + 1);
    const expected = facts[id];
    if (current !== expected) changes.push({ id, current, expected });
    return `<!-- PUBLISHING-FACT:${id} -->${expected}<!-- /PUBLISHING-FACT -->`;
  });

  const errors = [];
  for (const [id, required] of Object.entries(expectedCounts)) {
    const actual = seen.get(id) || 0;
    if (actual !== required) errors.push(`${id}: expected ${required} marker(s), found ${actual}`);
  }
  if (errors.length) {
    throw new Error(`Publishing fact-marker contract failed:\n- ${errors.join('\n- ')}`);
  }

  return { output, changes, facts };
}
