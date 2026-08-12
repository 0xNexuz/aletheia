CREATE TABLE IF NOT EXISTS claims (id TEXT PRIMARY KEY, program_id TEXT NOT NULL, wallet_id TEXT NOT NULL, nullifier TEXT NOT NULL, commitment TEXT NOT NULL, wallet_kind TEXT NOT NULL, status TEXT NOT NULL, issued_at TEXT NOT NULL, signature TEXT NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_program_nullifier ON claims(program_id, nullifier);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, organization TEXT NOT NULL, program TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL);