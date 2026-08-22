CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  min_age INTEGER NOT NULL,
  jurisdiction INTEGER NOT NULL,
  min_household_size INTEGER NOT NULL,
  max_annual_income INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  policy_hash TEXT
);

INSERT OR IGNORE INTO programs VALUES
  ('food-support-2026', 'Emergency Food Support', 1000, 18, 566, 2, 2500000, 1, NULL),
  ('medical-assistance-2026', 'Medical Assistance', 500, 18, 566, 1, 4000000, 1, NULL),
  ('temporary-shelter-2026', 'Temporary Shelter', 250, 21, 566, 2, 3000000, 1, NULL);

INSERT OR IGNORE INTO program_inventory (program_id, capacity, allocated)
SELECT id, capacity, 0 FROM programs;
