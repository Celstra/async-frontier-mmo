ALTER TABLE "thumper_events" ADD COLUMN IF NOT EXISTS "target_resource_id" text;--> statement-breakpoint
UPDATE "thumper_events" SET "target_resource_id" = 'veyrith_copper' WHERE "target_resource_id" IS NULL;--> statement-breakpoint
ALTER TABLE "thumper_events" ALTER COLUMN "target_resource_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "thumper_events" RENAME TO "thumper_runs";--> statement-breakpoint
DROP INDEX IF EXISTS "thumper_events_one_open_per_pilot";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "thumper_runs_one_open_per_pilot" ON "thumper_runs" ("pilot_id") WHERE "claimed_at" IS NULL;
