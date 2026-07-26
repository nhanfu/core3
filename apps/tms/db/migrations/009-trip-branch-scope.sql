ALTER TABLE trips ADD COLUMN IF NOT EXISTS branch_id VARCHAR;

UPDATE trips
SET branch_id = (
  SELECT branch_id FROM trucks WHERE trucks.id = trips.truck_id
)
WHERE branch_id IS NULL AND truck_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trips_branch ON trips(branch_id);
