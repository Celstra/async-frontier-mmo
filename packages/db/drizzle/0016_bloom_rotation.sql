CREATE TABLE IF NOT EXISTS blooms (
	id INTEGER PRIMARY KEY,
	generation_seed TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	rotated_at TIMESTAMPTZ
);

INSERT INTO blooms (id, generation_seed, created_at)
VALUES (1, 'locked-decision-006', NOW())
ON CONFLICT (id) DO NOTHING;
