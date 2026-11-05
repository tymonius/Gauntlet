// Stable TTS package CLI and test import boundary.
// Canonical table-layout tooling lives under tools/tts/.
import { pathToFileURL } from 'node:url';
import { runTableLayoutCli } from '../tools/tts/apply-table-layout.mjs';
export * from '../tools/tts/apply-table-layout.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runTableLayoutCli();
}
