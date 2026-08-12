CREATE TABLE IF NOT EXISTS claim_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_claim_events_type ON claim_events(event_type);
--> statement-breakpoint
PRAGMA optimize;