PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS playtest_session_results (
  session_id TEXT PRIMARY KEY,
  submitted_by_participant_id TEXT NOT NULL,
  completion_status TEXT NOT NULL
    CHECK (completion_status IN ('completed', 'stopped')),
  first_player_participant_id TEXT,
  winner_participant_id TEXT,
  victory_route TEXT,
  duration_minutes INTEGER NOT NULL
    CHECK (duration_minutes BETWEEN 1 AND 1440),
  rounds INTEGER
    CHECK (rounds IS NULL OR rounds BETWEEN 0 AND 100),
  battles INTEGER
    CHECK (battles IS NULL OR battles BETWEEN 0 AND 200),
  stop_reason TEXT,
  package_unmodified INTEGER NOT NULL DEFAULT 1
    CHECK (package_unmodified IN (0, 1)),
  variant_used INTEGER NOT NULL DEFAULT 0
    CHECK (variant_used IN (0, 1)),
  production_issue TEXT,
  strongest_moment TEXT NOT NULL,
  confusing_point TEXT NOT NULL,
  important_observation TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES playtest_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by_participant_id) REFERENCES playtest_participants(id) ON DELETE RESTRICT,
  FOREIGN KEY (first_player_participant_id) REFERENCES playtest_participants(id) ON DELETE SET NULL,
  FOREIGN KEY (winner_participant_id) REFERENCES playtest_participants(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_playtest_results_submitted
  ON playtest_session_results(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_playtest_results_winner
  ON playtest_session_results(winner_participant_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS playtest_participant_responses (
  participant_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  faction_interest TEXT NOT NULL,
  expectation_match INTEGER NOT NULL CHECK (expectation_match BETWEEN 1 AND 5),
  leader_distinction INTEGER NOT NULL CHECK (leader_distinction BETWEEN 1 AND 5),
  fun INTEGER NOT NULL CHECK (fun BETWEEN 1 AND 5),
  pacing INTEGER NOT NULL CHECK (pacing BETWEEN 1 AND 5),
  meaningful_decisions INTEGER NOT NULL CHECK (meaningful_decisions BETWEEN 1 AND 5),
  battle_tension INTEGER NOT NULL CHECK (battle_tension BETWEEN 1 AND 5),
  rules_clarity INTEGER NOT NULL CHECK (rules_clarity BETWEEN 1 AND 5),
  faction_clarity INTEGER NOT NULL CHECK (faction_clarity BETWEEN 1 AND 5),
  table_organization INTEGER NOT NULL CHECK (table_organization BETWEEN 1 AND 5),
  play_again INTEGER NOT NULL CHECK (play_again IN (0, 1)),
  comments TEXT,
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (participant_id) REFERENCES playtest_participants(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES playtest_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playtest_responses_session
  ON playtest_participant_responses(session_id, submitted_at ASC);
CREATE INDEX IF NOT EXISTS idx_playtest_responses_submitted
  ON playtest_participant_responses(submitted_at DESC);

CREATE TABLE IF NOT EXISTS playtest_public_creation_limits (
  client_hash TEXT NOT NULL,
  day_key TEXT NOT NULL,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (client_hash, day_key)
);

CREATE INDEX IF NOT EXISTS idx_playtest_creation_limits_day
  ON playtest_public_creation_limits(day_key, updated_at DESC);
