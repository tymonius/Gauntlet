from pathlib import Path
import re

OLD_ID = '2da05383c10fe3e784c64b26fd2d9837913011cad996966f49a7ae3a92af8ed9'
NEW_ID = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49'
OLD_CANDIDATE = 'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json'
COMPLETE_MANIFEST = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json'
COMPLETE_CANONICAL = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json'


def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing expected {label}')
    return text.replace(old, new, 1)


# Builder.
path = Path('scripts/build-clean-v063-downstream-data.mjs')
text = path.read_text()
text = must_replace(
    text,
    "const certificationPath = 'artifacts/reconstruction/clean-v0.6.3/certification/authority-set.json';",
    f"const certificationPath = '{COMPLETE_MANIFEST}';",
    'builder certification path',
)
text = must_replace(
    text,
    f"const evidencePath = '{OLD_CANDIDATE}';",
    f"const structuredAuthorityPath = '{COMPLETE_CANONICAL}';",
    'builder structured authority path',
)
text = must_replace(
    text,
    f"const authoritySetId = '{OLD_ID}';",
    f"const authoritySetId = '{NEW_ID}';\nconst parentHumanAuthoritySetId = '{OLD_ID}';",
    'builder authority IDs',
)
text = must_replace(
    text,
    "const evidenceBlob = '955dfa654cac96a9de820867ab694e83d0fb1d36';\n",
    '',
    'builder old evidence blob',
)
text = must_replace(
    text,
    "  'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json',\n];",
    f"  'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json',\n  '{OLD_CANDIDATE}',\n];",
    'builder forbidden candidate',
)
text = must_replace(
    text,
    "  const evidenceText = read(evidencePath);\n  const baseline = JSON.parse(baselineText);\n  const evidence = JSON.parse(evidenceText);",
    "  const structuredAuthorityText = read(structuredAuthorityPath);\n  const baseline = JSON.parse(baselineText);\n  const structuredAuthority = JSON.parse(structuredAuthorityText);\n  const evidence = structuredAuthority.gameplay;",
    'builder structured authority read',
)
text = must_replace(
    text,
    "  assert.equal(certification.target, 'clean-v0.6.3');",
    "  assert.equal(certification.target, 'clean-v0.6.3-complete');",
    'builder complete target',
)
text = must_replace(
    text,
    "  assert.equal(certification.status, 'certified_on_merge');",
    "  assert.equal(certification.status, 'certified_on_manual_merge');",
    'builder complete status',
)
text = must_replace(
    text,
    "  assert.equal(certification.downstream_regeneration_unlocked_on_merge, true);\n",
    '',
    'builder obsolete unlock',
)
text = must_replace(
    text,
    "  assert.equal(target?.certification?.authority_set_id, authoritySetId);",
    "  assert.equal(target?.certification?.authority_set_id, parentHumanAuthoritySetId);",
    'builder parent human authority ID',
)
text = must_replace(
    text,
    "  assert.equal(gitBlobSha(evidenceText), evidenceBlob, 'Pinned finalized v0.6.3 evidence blob drifted.');\n",
    '',
    'builder evidence blob gate',
)
text = must_replace(
    text,
    "  assert.equal(evidence.version, 'v0.6.3-candidate');\n  assert.equal(evidence.cards?.length, 128);\n  assert.equal(evidence.territories?.length, 25);",
    "  assert.equal(structuredAuthority.target, 'clean-v0.6.3-canonical-structured-authority');\n  assert.equal(structuredAuthority.status, 'complete_authority_candidate');\n  assert.equal(structuredAuthority.publication_unlocked, false);\n  assert.equal(evidence.cards?.length, 128);\n  assert.equal(evidence.territories?.length, 25);",
    'builder structured authority shape',
)
text = must_replace(
    text,
    "  const certifiedFiles = new Map((certification.authority_files ?? []).map((entry) => [entry.path, entry]));\n  for (const entry of certification.authority_files ?? []) {",
    "  const certifiedFiles = new Map((certification.authority_files ?? []).map((entry) => [entry.path, entry]));\n  const structuredAuthorityEntry = certifiedFiles.get(structuredAuthorityPath);\n  assert(structuredAuthorityEntry, 'Complete authority manifest does not bind the canonical structured authority.');\n  assert.equal(sha256(structuredAuthorityText), structuredAuthorityEntry.sha256, 'Canonical structured authority drifted from its complete authority manifest.');\n  for (const entry of certification.authority_files ?? []) {",
    'builder structured manifest binding',
)
text = must_replace(
    text,
    "    target: 'clean-v0.6.3',",
    "    target: 'clean-v0.6.3-complete',",
    'builder emitted target',
)
text = must_replace(
    text,
    "  data.evidence_payload = { path: evidencePath, git_blob_sha: evidenceBlob, role: 'verified_delta_payload_only' };",
    "  data.structured_authority = { path: structuredAuthorityPath, sha256: sha256(read(structuredAuthorityPath)), role: 'complete_machine_readable_authority' };",
    'builder structured provenance',
)
text = must_replace(
    text,
    "    verified_delta_payload: evidencePath,",
    "    structured_authority: structuredAuthorityPath,",
    'builder governing structured authority',
)
text = text.replace('evidence_payload: evidencePath', 'structured_authority: structuredAuthorityPath')
text = must_replace(
    text,
    "    finalized_v063_candidate_used_as_authority: false,\n    finalized_v063_candidate_role: 'verified_delta_payload_only',",
    "    complete_structured_authority_used_as_content_source: true,\n    historical_v063_candidate_used_as_content_source: false,",
    'builder normalization boundary',
)

boundary_and_status = '''  const boundaryText = `# Clean v0.6.3 downstream source boundary\n\n**Status:** reconstruction candidate; not published  \n**Complete authority set:** ${authoritySetId}\n\nThe complete clean v0.6.3 authority manifest at ${certificationPath} is the binding downstream source. Its machine-readable gameplay payload comes from ${structuredAuthorityPath}, which was independently regenerated from v0.6.1 through the historical v0.6.2/v0.6.3 transformation pipeline and certified with zero gameplay drift.\n\nThe certified Rulebook and six faction guides remain the human-readable authority within that complete set. The published v0.6.1 canonical data is retained only as a pinned structural-baseline check; it is not used to fill missing clean-v0.6.3 gameplay content. The withdrawn v0.6.3 release-candidate canonical file is forbidden as a downstream content source or emitted provenance dependency.\n\nThe twelve starter compositions come from PR #573 (merge ${starterApproval.merge_commit}) and are accepted only after legality is revalidated against the complete 128-card / 25-Territory authority.\n\nPublication remains separately locked; v0.6.1 remains current/public.\n`;
  const statusText = `# Clean v0.6.3 downstream validation status\n\n**Status:** candidate ready for merge review  \n**Publication:** locked  \n**Authority set:** ${authoritySetId}\n\nValidated by the deterministic build/validation gate:\n\n- exact complete-authority manifest and every bound authority-file hash;\n- machine-readable gameplay source from the complete canonical structured authority, not the withdrawn v0.6.3 candidate;\n- 128 playable cards: 50 Neutral plus 13 for each of six factions;\n- all 78 faction-card identities, costs, forms, Unique status, and printed effects against their certified faction guides;\n- 25 Territories, Second Line, and Smuggler's Run identity invariants;\n- recovered Armistice, Manifest Destiny, and Contingency Plan decisions;\n- Extraordinary Rendition form normalization and Détente special Bank Action;\n- twelve PR #573 starter Decks, each exactly 30 cards / 60 Deckbuilding Value, legal for its Leader/faction, with legal Territory selections and 110 represented playable titles; and\n- no publication/current-release cutover.\n`;
  const outputFiles ='''
text, count = re.subn(
    r"  const boundaryText = `# Clean v0\.6\.3 downstream source boundary.*?\n  const outputFiles =",
    boundary_and_status,
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('Missing builder boundary/status block')

text = must_replace(
    text,
    "    evidence: { path: evidencePath, git_blob_sha: evidenceBlob, role: 'verified_delta_payload_only' },",
    "    structured_authority: { path: structuredAuthorityPath, sha256: sha256(read(structuredAuthorityPath)), role: 'complete_machine_readable_authority' },",
    'builder manifest structured source',
)
if 'evidencePath' in text or 'evidenceBlob' in text:
    raise SystemExit('Old evidence variables survived downstream builder cutover')
path.write_text(text)

# Validator.
path = Path('scripts/validate-clean-v063-downstream-data.mjs')
text = path.read_text()
text = must_replace(
    text,
    "const certificationPath = 'artifacts/reconstruction/clean-v0.6.3/certification/authority-set.json';",
    f"const certificationPath = '{COMPLETE_MANIFEST}';",
    'validator certification path',
)
text = must_replace(
    text,
    f"const authoritySetId = '{OLD_ID}';",
    f"const authoritySetId = '{NEW_ID}';",
    'validator authority ID',
)
text = must_replace(
    text,
    f"const evidencePath = '{OLD_CANDIDATE}';\n",
    f"const structuredAuthorityPath = '{COMPLETE_CANONICAL}';\n",
    'validator structured path',
)
text = must_replace(
    text,
    "const evidenceBlob = '955dfa654cac96a9de820867ab694e83d0fb1d36';\n",
    '',
    'validator old blob',
)
text = must_replace(
    text,
    "  'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json',\n];",
    f"  'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json',\n  '{OLD_CANDIDATE}',\n];",
    'validator forbidden candidate',
)
text = must_replace(
    text,
    "assert.equal(canonical.evidence_payload?.path, evidencePath);\nassert.equal(canonical.evidence_payload?.git_blob_sha, evidenceBlob);\nassert.equal(canonical.evidence_payload?.role, 'verified_delta_payload_only');",
    "assert.equal(canonical.structured_authority?.path, structuredAuthorityPath);\nassert.equal(canonical.structured_authority?.sha256, sha256(read(structuredAuthorityPath)));\nassert.equal(canonical.structured_authority?.role, 'complete_machine_readable_authority');",
    'validator canonical structured provenance',
)
text = must_replace(
    text,
    "assert.equal(manifest.evidence?.role, 'verified_delta_payload_only');",
    "assert.equal(manifest.structured_authority?.path, structuredAuthorityPath);\nassert.equal(manifest.structured_authority?.role, 'complete_machine_readable_authority');",
    'validator manifest structured provenance',
)
text = must_replace(
    text,
    "assert.equal(certification.authority_set_id, authoritySetId);",
    "assert.equal(certification.target, 'clean-v0.6.3-complete');\nassert.equal(certification.status, 'certified_on_manual_merge');\nassert.equal(certification.authority_set_id, authoritySetId);",
    'validator complete authority manifest',
)
if 'evidencePath' in text or 'evidenceBlob' in text:
    raise SystemExit('Old evidence variables survived downstream validator cutover')
path.write_text(text)

print('Prepared downstream builder/validator cutover to complete authority.')
