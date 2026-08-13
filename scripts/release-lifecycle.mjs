import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const lifecyclePath = path.join(root, 'config/release-lifecycle.json');

export function loadReleaseLifecycle() {
  return JSON.parse(fs.readFileSync(lifecyclePath, 'utf8'));
}

export function validateReleaseLifecycle(lifecycle = loadReleaseLifecycle()) {
  const failures = [];
  const releases = lifecycle?.releases ?? {};
  const allowedStatuses = new Set(['candidate', 'current', 'withdrawn', 'historical']);
  const entries = Object.entries(releases);

  if (!lifecycle?.current_release || typeof lifecycle.current_release !== 'string') {
    failures.push('release lifecycle must declare current_release');
  }
  if (!entries.length) failures.push('release lifecycle must declare releases');

  for (const [version, release] of entries) {
    if (!allowedStatuses.has(release?.status)) {
      failures.push(`${version} has unsupported lifecycle status ${String(release?.status)}`);
    }
    if (release?.status === 'withdrawn') {
      if (release.artifacts_preserved !== true) failures.push(`${version} withdrawn lifecycle must set artifacts_preserved=true`);
      if (release.public_cutover !== false) failures.push(`${version} withdrawn lifecycle must set public_cutover=false`);
    }
  }

  const current = entries.filter(([, release]) => release?.status === 'current').map(([version]) => version);
  if (current.length !== 1) failures.push(`release lifecycle must have exactly one current release; found ${current.length}`);
  if (current.length === 1 && current[0] !== lifecycle.current_release) {
    failures.push(`current_release ${lifecycle.current_release} does not match status=current release ${current[0]}`);
  }
  if (!releases[lifecycle.current_release]) {
    failures.push(`current_release ${lifecycle.current_release} has no release entry`);
  }

  if (failures.length) {
    throw new Error(`Release lifecycle validation failed:\n- ${failures.join('\n- ')}`);
  }
  return lifecycle;
}

export function currentRelease(lifecycle = validateReleaseLifecycle()) {
  return lifecycle.current_release;
}

export function releaseStatus(version, lifecycle = validateReleaseLifecycle()) {
  return lifecycle.releases?.[version]?.status ?? null;
}

export function isWithdrawn(version, lifecycle = validateReleaseLifecycle()) {
  return releaseStatus(version, lifecycle) === 'withdrawn';
}
