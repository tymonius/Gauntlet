PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rules_interactions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  previous_interaction_id TEXT,
  sequence_index INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  game_version TEXT NOT NULL,
  ruling_status TEXT NOT NULL CHECK (ruling_status IN ('explicit', 'inferred', 'unresolved')),
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  answer_mode TEXT NOT NULL CHECK (answer_mode IN ('ai', 'retrieval_only')),
  model TEXT,
  source_count INTEGER NOT NULL DEFAULT 0,
  feedback_rating TEXT CHECK (feedback_rating IN ('yes', 'unclear', 'incorrect')),
  feedback_comment TEXT,
  feedback_at TEXT,
  review_status TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (review_status IN ('unreviewed', 'correct', 'needs_correction', 'rules_unclear', 'duplicate')),
  issue_types_json TEXT NOT NULL DEFAULT '[]',
  reviewer_notes TEXT NOT NULL DEFAULT '',
  resolution TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (previous_interaction_id) REFERENCES rules_interactions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rules_interactions_created_at
  ON rules_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rules_interactions_session
  ON rules_interactions(session_id, sequence_index);
CREATE INDEX IF NOT EXISTS idx_rules_interactions_review_status
  ON rules_interactions(review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rules_interactions_feedback
  ON rules_interactions(feedback_rating, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rules_interactions_ruling
  ON rules_interactions(ruling_status, confidence, created_at DESC);

CREATE TABLE IF NOT EXISTS rules_interaction_sources (
  interaction_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_path TEXT,
  source_url TEXT,
  excerpt TEXT,
  PRIMARY KEY (interaction_id, ordinal),
  FOREIGN KEY (interaction_id) REFERENCES rules_interactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rules_sources_path
  ON rules_interaction_sources(source_path);

CREATE TABLE IF NOT EXISTS rules_interaction_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  interaction_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  review_status TEXT NOT NULL,
  issue_types_json TEXT NOT NULL DEFAULT '[]',
  reviewer_notes TEXT NOT NULL DEFAULT '',
  resolution TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (interaction_id) REFERENCES rules_interactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rules_reviews_interaction
  ON rules_interaction_reviews(interaction_id, created_at DESC);
