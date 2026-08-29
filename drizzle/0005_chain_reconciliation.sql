ALTER TABLE claim_records ADD COLUMN verification_error TEXT;
ALTER TABLE claim_records ADD COLUMN verification_attempted_at TEXT;
ALTER TABLE claim_records ADD COLUMN chain_confirmed_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_records_tx_hash
ON claim_records(tx_hash)
WHERE tx_hash IS NOT NULL;

DROP TRIGGER IF EXISTS trg_claim_records_capacity_guard_v2;
DROP TRIGGER IF EXISTS trg_claim_records_allocate_v2;
DROP TRIGGER IF EXISTS trg_claim_records_release_v2;
DROP TRIGGER IF EXISTS trg_claim_records_capacity_guard_v3;
DROP TRIGGER IF EXISTS trg_claim_records_allocate_v3;
DROP TRIGGER IF EXISTS trg_claim_records_release_v3;

CREATE TRIGGER trg_claim_records_capacity_guard_v4
BEFORE INSERT ON claim_records
FOR EACH ROW
WHEN NEW.status IN ('reserved','claim_pending','claim_confirmed','pending_review')
AND COALESCE((SELECT allocated >= capacity FROM program_inventory WHERE program_id = NEW.program_id), 1)
BEGIN SELECT RAISE(ABORT, 'PROGRAM_CAPACITY_REACHED'); END;

CREATE TRIGGER trg_claim_records_allocate_v4
AFTER INSERT ON claim_records
FOR EACH ROW WHEN NEW.status IN ('reserved','claim_pending','claim_confirmed','pending_review')
BEGIN UPDATE program_inventory SET allocated = allocated + 1 WHERE program_id = NEW.program_id; END;

CREATE TRIGGER trg_claim_records_release_v4
AFTER UPDATE OF status ON claim_records
FOR EACH ROW
WHEN OLD.status IN ('reserved','claim_pending','claim_confirmed','pending_review')
AND NEW.status IN ('released','expired')
BEGIN UPDATE program_inventory SET allocated = MAX(0, allocated - 1) WHERE program_id = NEW.program_id; END;
