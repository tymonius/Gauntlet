import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  ROOT,
  loadPublishingAuthority,
  synchronizePublishingFactMarkers,
} from './publishing-authority.mjs';

const WRITE = process.argv.includes('--write');
const SURFACES = [
  {
    path: 'rulebook/player-facing/current-rulebook.md',
    expected: {
      'publisher.line': 1,
      'imprint.statement': 1,
      'copyright.notice': 1,
    },
  },
  {
    path: 'README.md',
    expected: {
      'publisher.line': 1,
      'imprint.statement': 1,
      'copyright.notice': 1,
    },
  },
];

const authority = await loadPublishingAuthority();
const pending = [];

for (const surface of SURFACES) {
  const file = resolve(ROOT, surface.path);
  const source = await readFile(file, 'utf8');
  const result = synchronizePublishingFactMarkers(source, authority, surface.expected);
  if (!result.changes.length) continue;
  pending.push({ surface, file, result });
}

if (!pending.length) {
  console.log('Publishing-authority surfaces match config/publishing-authority.json.');
  process.exit(0);
}

if (!WRITE) {
  const details = pending.flatMap(({ surface, result }) =>
    result.changes.map(change =>
      surface.path + ': ' + change.id + ': "' + change.current + '" -> "' + change.expected + '"',
    ),
  );
  throw new Error(
    'Publishing-authority surfaces are stale:\n- ' + details.join('\n- ') + '\n' +
    'Run npm run publishing:sync after changing the publishing authority.',
  );
}

for (const { surface, file, result } of pending) {
  await writeFile(file, result.output, 'utf8');
  console.log(
    'Updated ' + surface.path + ': ' + [...new Set(result.changes.map(change => change.id))].join(', '),
  );
}
