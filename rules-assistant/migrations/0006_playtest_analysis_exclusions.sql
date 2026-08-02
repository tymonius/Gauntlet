PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS playtest_analysis_exclusions (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL
    CHECK (target_type IN ('game', 'response')),
  target_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  reason_code TEXT NOT NULL
    CHECK (reason_code IN ('test', 'duplicate', 'incomplete', 'invalid', 'corrupted', 'other')),
  reason_note TEXT,
  excluded_by TEXT NOT NULL,
  excluded_at TEXT NOT NULL,
  restored_by TEXT,
  restored_at TEXT,
  FOREIGN KEY (session_id) REFERENCES playtest_sessions(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_playtest_exclusions_active_target
  ON playtest_analysis_exclusions(target_type, target_id)
  WHERE restored_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_playtest_exclusions_session
  ON playtest_analysis_exclusions(session_id, excluded_at DESC);

CREATE INDEX IF NOT EXISTS idx_playtest_exclusions_history
  ON playtest_analysis_exclusions(restored_at, excluded_at DESC);
