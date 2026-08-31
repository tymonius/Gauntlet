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
  const parent = authority?.parent;
  const copyright = authority?.copyright;
  const playerFacing = authority?.playerFacing;
  const required = [
    ['effectiveFromRelease', authority?.effectiveFromRelease],
    ['imprint.displayName', imprint?.displayName],
    ['imprint.status', imprint?.status],
    ['imprint.role', imprint?.role],
    ['imprint.logo', imprint?.logo],
    ['parent.displayName', parent?.displayName],
    ['parent.intendedLegalName', parent?.intendedLegalName],
    ['parent.legalEntityStatus', parent?.legalEntityStatus],
    ['copyright.holder', copyright?.holder],
    ['copyright.notice', copyright?.notice],
    ['playerFacing.publisherLine', playerFacing?.publisherLine],
    ['playerFacing.parentLine', playerFacing?.parentLine],
    ['playerFacing.imprintStatement', playerFacing?.imprintStatement],
  ];
  for (const [label, value] of required) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Publishing authority is missing ${label}.`);
    }
  }

  if (authority.effectiveFromRelease !== 'v0.7.1') {
    throw new Error(`TDS Games publishing authority must begin with v0.7.1; found ${authority.effectiveFromRelease}.`);
  }
  if (!['provisional', 'established'].includes(imprint.status)) {
    throw new Error(`Unsupported publishing-imprint status: ${imprint.status}`);
  }
  if (imprint.role !== 'publishing imprint') {
    throw new Error(`Publishing authority role must be "publishing imprint"; found "${imprint.role}".`);
  }
  if (!existsSync(resolve(ROOT, imprint.logo))) {
    throw new Error(`Publishing-authority logo does not exist: ${imprint.logo}`);
  }
  if (!['formation-pending', 'formed'].includes(parent.legalEntityStatus)) {
    throw new Error(`Unsupported parent legal-entity status: ${parent.legalEntityStatus}`);
  }

  const expectedPublisherLine = `Published by ${imprint.displayName}`;
  if (playerFacing.publisherLine !== expectedPublisherLine) {
    throw new Error(
      `playerFacing.publisherLine is "${playerFacing.publisherLine}", expected "${expectedPublisherLine}".`,
    );
  }
  const expectedParentLine = `An imprint of ${parent.displayName}`;
  if (playerFacing.parentLine !== expectedParentLine) {
    throw new Error(
      `playerFacing.parentLine is "${playerFacing.parentLine}", expected "${expectedParentLine}".`,
    );
  }
  if (!playerFacing.imprintStatement.includes(imprint.displayName) || !playerFacing.imprintStatement.includes(parent.displayName)) {
    throw new Error('playerFacing.imprintStatement must name both the imprint and its parent.');
  }
  if (!copyright.notice.includes(copyright.holder)) {
    throw new Error('Copyright notice does not name the configured copyright holder.');
  }

  if (parent.legalEntityStatus === 'formation-pending' && /\bLLC\b/.test(parent.displayName)) {
    throw new Error('Formation-pending player-facing parent name must not claim LLC status.');
  }
  if (parent.legalEntityStatus === 'formed' && parent.displayName !== parent.intendedLegalName) {
    throw new Error('Once formed, the player-facing parent name must use the configured legal name.');
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
    'publisher.parent_line': authority.playerFacing.parentLine,
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
