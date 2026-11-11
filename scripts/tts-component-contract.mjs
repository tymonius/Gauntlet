// Compatibility API and command path for established TTS generators and npm scripts.
// The maintained component-contract validator is owned by tools/tts/.
import { pathToFileURL } from 'node:url';
import { runTtsComponentContractCheck } from '../tools/tts/tts-component-contract.mjs';
export * from '../tools/tts/tts-component-contract.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runTtsComponentContractCheck().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
