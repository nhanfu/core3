DROP INDEX IF EXISTS idx_trips_branch;
ALTER TABLE trips DROP COLUMN IF EXISTS branch_id;
