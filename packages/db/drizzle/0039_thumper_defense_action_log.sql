ALTER TABLE "thumper_runs" ADD COLUMN "defense_action_log" jsonb DEFAULT '[]'::jsonb NOT NULL;
