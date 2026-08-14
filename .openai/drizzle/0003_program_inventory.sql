CREATE TABLE IF NOT EXISTS program_inventory (
  program_id TEXT PRIMARY KEY,
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  allocated INTEGER NOT NULL DEFAULT 0 CHECK (allocated >= 0 AND allocated <= capacity)
);
--> statement-breakpoint
INSERT INTO program_inventory (program_id, capacity, allocated)
SELECT 'emergency-relief-2026', 1000, COUNT(*)
FROM claim_records
WHERE program_id = 'emergency-relief-2026'
ON CONFLICT(program_id) DO UPDATE SET allocated = excluded.allocated;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_claim_records_capacity_guard
BEFORE INSERT ON claim_records
FOR EACH ROW
WHEN COALESCE((SELECT allocated >= capacity FROM program_inventory WHERE program_id = NEW.program_id), 1)
BEGIN
  SELECT RAISE(ABORT, 'PROGRAM_CAPACITY_REACHED');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_claim_records_allocate
AFTER INSERT ON claim_records
FOR EACH ROW
BEGIN
  UPDATE program_inventory SET allocated = allocated + 1 WHERE program_id = NEW.program_id;
END;
--> statement-breakpoint
PRAGMA optimize;
