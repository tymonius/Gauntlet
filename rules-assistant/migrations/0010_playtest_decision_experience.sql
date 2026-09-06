PRAGMA foreign_keys = ON;

ALTER TABLE playtest_participants
  ADD COLUMN selection_reason TEXT;

ALTER TABLE playtest_participant_responses
  ADD COLUMN felt_decided_when TEXT
  CHECK (felt_decided_when IS NULL OR felt_decided_when IN ('never', 'early', 'middle', 'late', 'at_end'));

ALTER TABLE playtest_participant_responses
  ADD COLUMN agency_after_decided TEXT
  CHECK (agency_after_decided IS NULL OR agency_after_decided IN ('yes', 'some', 'no', 'not_applicable'));

ALTER TABLE playtest_participant_responses
  ADD COLUMN decisive_cause TEXT;
