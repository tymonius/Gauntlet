PRAGMA foreign_keys = ON;

ALTER TABLE rules_interactions ADD COLUMN playtest_session_id TEXT;
ALTER TABLE rules_interactions ADD COLUMN sheet_serial TEXT;

CREATE INDEX IF NOT EXISTS idx_rules_interactions_playtest_session
  ON rules_interactions(playtest_session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rules_interactions_sheet_serial
  ON rules_interactions(sheet_serial, created_at DESC);

CREATE TABLE IF NOT EXISTS playtest_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  host_key_hash TEXT NOT NULL,
  sheet_serial TEXT NOT NULL UNIQUE,
  rules_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL,
  closed_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_playtest_sessions_status
  ON playtest_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playtest_sessions_rules_version
  ON playtest_sessions(rules_version, created_at DESC);

CREATE TABLE IF NOT EXISTS playtest_participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'player'
    CHECK (role IN ('player', 'facilitator', 'observer')),
  joined_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES playtest_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playtest_participants_session
  ON playtest_participants(session_id, joined_at);

CREATE TABLE IF NOT EXISTS playtest_session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES playtest_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playtest_events_session
  ON playtest_session_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_playtest_events_type
  ON playtest_session_events(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS playtest_arbiter_links (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  interaction_id TEXT NOT NULL,
  classification TEXT
    CHECK (classification IS NULL OR classification IN ('explicit', 'inferred', 'unresolved')),
  question_excerpt TEXT,
  answer_excerpt TEXT,
  source_json TEXT NOT NULL DEFAULT '[]',
  linked_at TEXT NOT NULL,
  UNIQUE (session_id, interaction_id),
  FOREIGN KEY (session_id) REFERENCES playtest_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (interaction_id) REFERENCES rules_interactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playtest_arbiter_session
  ON playtest_arbiter_links(session_id, linked_at);
CREATE INDEX IF NOT EXISTS idx_playtest_arbiter_interaction
  ON playtest_arbiter_links(interaction_id);
