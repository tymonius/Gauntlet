import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (relative: string) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const attestationPath = 'artifacts/reconstruction/clean-v0.6.3/publication-verification.json';
const canonicalManifestPath = 'releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json';

describe('clean v0.6.3 publication closeout', () => {
  it('records the completed live publication without rewriting phase-specific evidence', () => {
    const attestation = readJson(attestationPath);
    const lifecycle = readJson('config/release-lifecycle.json');
    const manifest = readJson(canonicalManifestPath);
    const candidate = readJson('artifacts/reconstruction/clean-v0.6.3/current-release-metadata/release-candidate.json');
    const currentPointer = read('src/content/current.ts');

    expect(attestation).toMatchObject({
      schema_version: 1,
      target: 'clean-v0.6.3-publication-verification',
      release_version: 'v0.6.3',
      status: 'published_and_live_verified',
      authority_set_id: authoritySetId,
      publication_date: '2026-08-14',
      verified_at: '2026-08-14T14:21:58Z',
    });
    expect(attestation.publication_chain).toMatchObject({
      authorization_pr: 641,
      atomic_materialization_commit: '72af3ff51fdb8a220b5159cb6ec39a4a337a86b9',
      ci_phase_transition_pr: 647,
      live_verification_pr: 648,
      initial_live_verification_commit: 'e54e6aa76e673e8adea711d11e2452fbfa7097eb',
      live_verification_run_id: 31808351910,
      successful_live_job_id: 94793703001,
    });
    expect(attestation.publication_chain.retry_prs).toEqual([645, 646]);
    expect(attestation.github_pages).toMatchObject({
      initial_verified_commit: 'e54e6aa76e673e8adea711d11e2452fbfa7097eb',
      verified_build_id: 1151157745,
      verified_workflow_run_id: 31808746671,
      build_status: 'built',
      deployment_status: 'success',
    });
    expect(attestation.rules_arbiter.current_route).toMatchObject({
      version: 'v0.6.3',
      published: true,
      reconstruction: false,
      current_public_release: 'v0.6.3',
      verified: true,
    });
    expect(attestation.rules_arbiter.historical_route).toMatchObject({ version: 'v0.6.1', verified: true });
    expect(attestation.live_surfaces.gauntlet_run_routes_verified).toHaveLength(13);
    expect(attestation.live_surfaces.all_checks_passed).toBe(true);
    expect(attestation.release_integrity).toMatchObject({
      playable_cards: 128,
      territories: 25,
      factions: 6,
      leaders: 12,
      starter_decks: 12,
      print_pdfs: 9,
      json_exports: 3,
      historical_withdrawn_package_preserved: true,
    });
    expect(attestation.governance.issue_590_acceptance_gates_satisfied).toBe(true);
    expect(attestation.governance.issue_591_acceptance_gates_satisfied).toBe(true);
    expect(attestation.governance.issues_ready_to_close_after_this_attestation_merges).toEqual([590, 591]);

    expect(lifecycle.releases['v0.6.1'].status).toBe('historical');
    expect(lifecycle.releases['v0.6.2']).toMatchObject({
      status: 'withdrawn',
      artifacts_preserved: true,
      public_cutover: false,
      historical_package_path: 'releases/v0.6.2-withdrawn/',
    });
    expect(lifecycle.releases['v0.6.2'].legacy_package_aliases).toBeUndefined();
    expect(lifecycle.releases['v0.6.3']).toMatchObject({
      artifacts_preserved: true,
      public_cutover: true,
      authority_set_id: authoritySetId,
    });
    expect(lifecycle.releases['v0.6.3'].legacy_package_aliases).toBeUndefined();
    expect(currentPointer).not.toContain('../reconstruction/clean-v063/content');

    expect(manifest.release_version).toBe('v0.6.3');
    expect(manifest.authority_set_id).toBe(authoritySetId);
    expect(manifest.status).toBe('current');
    expect(manifest.historical_withdrawn_package_preserved_at).toBe('releases/v0.6.3-withdrawn/');
    expect(manifest.current_package_path).toBe('releases/v0.6.3/');

    expect(candidate.status).toBe('candidate_not_current');
    expect(candidate.public_current_release).toBe('v0.6.1');
    expect(candidate.post_merge_verification.gauntlet_run).toBe('pending_after_authorized_publication_merge');
    expect(candidate.post_merge_verification.production_workers).toBe('pending_after_authorized_publication_merge');
    expect(attestation.preserved_evidence.note).toMatch(/phase-specific pending fields as historical evidence/);

    expect(fs.existsSync(path.join(root, 'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'releases/v0.6.3-withdrawn/Gauntlet_v0.6.3_Manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, canonicalManifestPath))).toBe(true);
    expect(fs.existsSync(path.join(root, 'releases/v0.6.2'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'releases/v0.6.3-reconstructed'))).toBe(false);
  });
});
