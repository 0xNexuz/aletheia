CREATE TABLE IF NOT EXISTS claim_records (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL,
  nullifier TEXT NOT NULL,
  commitment TEXT NOT NULL,
  wallet_kind TEXT NOT NULL,
  status TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  signature TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_records_program_nullifier
ON claim_records(program_id, nullifier);
--> statement-breakpoint
PRAGMA optimize;