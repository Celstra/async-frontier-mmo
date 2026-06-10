-- Lesson 6.3: equippable thumper parts, deploy snapshots, starter worn kit.

ALTER TABLE pilots
	ADD COLUMN IF NOT EXISTS equipped_drill_item_id UUID REFERENCES items(id),
	ADD COLUMN IF NOT EXISTS equipped_pump_item_id UUID REFERENCES items(id),
	ADD COLUMN IF NOT EXISTS equipped_hull_item_id UUID REFERENCES items(id),
	ADD COLUMN IF NOT EXISTS starter_thumper_parts_granted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS thumper_run_part_snapshots (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	thumper_run_id UUID NOT NULL REFERENCES thumper_runs(id) ON DELETE CASCADE,
	slot TEXT NOT NULL,
	item_id UUID NOT NULL REFERENCES items(id),
	schematic_id TEXT NOT NULL,
	display_name TEXT NOT NULL,
	property_scores JSONB NOT NULL,
	condition_at_deploy INTEGER NOT NULL,
	integrity_at_deploy INTEGER NOT NULL,
	UNIQUE (thumper_run_id, slot)
);

CREATE INDEX IF NOT EXISTS thumper_run_part_snapshots_run_id_idx ON thumper_run_part_snapshots(thumper_run_id);
