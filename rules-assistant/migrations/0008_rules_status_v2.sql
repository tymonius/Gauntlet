ALTER TABLE rules_interactions
ADD COLUMN ruling_status_v2 TEXT
CHECK (ruling_status_v2 IN (
  'explicit',
  'inferred',
  'provisional',
  'out_of_scope',
  'unresolved',
  'source_lookup'
));

UPDATE rules_interactions
SET ruling_status_v2 = ruling_status
WHERE ruling_status_v2 IS NULL;

CREATE INDEX IF NOT EXISTS idx_rules_interactions_ruling_status_v2
ON rules_interactions(ruling_status_v2, created_at DESC);
