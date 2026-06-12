ALTER TABLE "pilot_field_state" ADD COLUMN "discovered_tiles" jsonb DEFAULT '[]'::jsonb NOT NULL;
