import { AUTHORITY_SET_ID, RULEBOOK_SHA256, CANONICAL_SHA256, read, failures, finish } from './publication-utils.mjs';

// The live Rules Arbiter is version-controlled independently from the recovered
// reconstruction web template. Publication validates its authority binding and
// terminology layer instead of pruning/regenerating the current implementation.
const app = read('rules-arbiter/app.js');
const corpus = read('rules-assistant/v063-public-corpus.js');

if (!app.includes('../rules-assistant/v063-public-corpus.js')) {
  failures.push('Live Rules Arbiter is not using the current v0.6.3 public corpus.');
}
if (!app.includes('const CURRENT_PUBLIC_RELEASE = "v0.6.3";')) {
  failures.push('Live Rules Arbiter is not marked as the current v0.6.3 release.');
}
if (!corpus.includes(AUTHORITY_SET_ID)) {
  failures.push('Published Rules Arbiter corpus lost authority-set binding.');
}
if (!corpus.includes(RULEBOOK_SHA256) || !corpus.includes(CANONICAL_SHA256)) {
  failures.push('Published Rules Arbiter corpus lost certified source hash binding.');
}
if (!corpus.includes('normalizeV063LastStandText') || !corpus.includes('normalizeV063LastStandValue')) {
  failures.push('Published Rules Arbiter corpus does not apply the PR #171 Last Stand terminology layer.');
}

for (const relative of ['rules-arbiter/index.html', 'rules-arbiter/app.js', 'rules-arbiter/styles.css']) {
  try {
    read(relative);
  } catch {
    failures.push(`Missing current Rules Arbiter implementation: ${relative}`);
  }
}

finish('Clean v0.6.3 Rules Arbiter publication');
