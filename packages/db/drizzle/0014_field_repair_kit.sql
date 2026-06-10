-- Lesson 6.2: consumable repair kits, run hull durability, repair audit rows.

ALTER TABLE items
	ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

ALTER TABLE thumper_runs
	ADD COLUMN IF NOT EXISTS run_hull_condition INTEGER NOT NULL DEFAULT 100,
	ADD COLUMN IF NOT EXISTS run_hull_integrity INTEGER NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS repair_actions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	pilot_id TEXT NOT NULL REFERENCES pilots(id),
	repair_kit_item_id UUID NOT NULL REFERENCES items(id),
	thumper_run_id UUID REFERENCES thumper_runs(id),
	thumper_event_window_index INTEGER,
	context TEXT NOT NULL,
	condition_before INTEGER NOT NULL,
	condition_after INTEGER NOT NULL,
	integrity_before INTEGER NOT NULL,
	integrity_after INTEGER NOT NULL,
	kit_condition_restored_score INTEGER NOT NULL,
	kit_integrity_safety_score INTEGER NOT NULL,
	explanation TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repair_actions_pilot_id_idx ON repair_actions(pilot_id);
CREATE INDEX IF NOT EXISTS repair_actions_thumper_run_id_idx ON repair_actions(thumper_run_id);
