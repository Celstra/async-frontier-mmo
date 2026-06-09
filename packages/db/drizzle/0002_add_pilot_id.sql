ALTER TABLE "thumper_events" ADD COLUMN IF NOT EXISTS "pilot_id" text;--> statement-breakpoint
UPDATE "thumper_events" SET "pilot_id" = 'demo-pilot' WHERE "pilot_id" IS NULL;--> statement-breakpoint
ALTER TABLE "thumper_events" ALTER COLUMN "pilot_id" SET NOT NULL;--> statement-breakpoint
UPDATE "thumper_events" AS t
SET "claimed_at" = COALESCE(t."claimed_at", NOW())
WHERE t."claimed_at" IS NULL
	AND t."id" NOT IN (
		SELECT DISTINCT ON ("pilot_id") "id"
		FROM "thumper_events"
		WHERE "claimed_at" IS NULL
		ORDER BY "pilot_id", "deployed_at" DESC
	);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "thumper_events_one_open_per_pilot" ON "thumper_events" ("pilot_id") WHERE "claimed_at" IS NULL;
