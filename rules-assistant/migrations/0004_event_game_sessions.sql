PRAGMA foreign_keys = ON;

ALTER TABLE playtest_sessions ADD COLUMN session_kind TEXT NOT NULL DEFAULT 'game'
  CHECK (session_kind IN ('event', 'game'));
ALTER TABLE playtest_sessions ADD COLUMN event_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_playtest_sessions_kind
  ON playtest_sessions(session_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playtest_sessions_event
  ON playtest_sessions(event_session_id, created_at ASC);

ALTER TABLE playtest_participants ADD COLUMN identity_token_hash TEXT;
ALTER TABLE playtest_participants ADD COLUMN event_participant_id TEXT;
ALTER TABLE playtest_participants ADD COLUMN seat_index INTEGER
  CHECK (seat_index IS NULL OR seat_index IN (1, 2));
ALTER TABLE playtest_participants ADD COLUMN faction TEXT;
ALTER TABLE playtest_participants ADD COLUMN leader TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_playtest_participants_event_identity
  ON playtest_participants(session_id, event_participant_id)
  WHERE event_participant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_playtest_participants_seat
  ON playtest_participants(session_id, seat_index)
  WHERE seat_index IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_playtest_participants_parent_identity
  ON playtest_participants(event_participant_id);

ALTER TABLE playtest_arbiter_links ADD COLUMN participant_id TEXT;
ALTER TABLE rules_interactions ADD COLUMN playtest_participant_id TEXT;

CREATE INDEX IF NOT EXISTS idx_playtest_arbiter_participant
  ON playtest_arbiter_links(participant_id, linked_at DESC);
CREATE INDEX IF NOT EXISTS idx_rules_interactions_playtest_participant
  ON rules_interactions(playtest_participant_id, created_at DESC);
