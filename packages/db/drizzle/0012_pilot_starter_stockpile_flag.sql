ALTER TABLE "pilots" ADD COLUMN IF NOT EXISTS "starter_stockpile_granted_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "pilots" p
SET "starter_stockpile_granted_at" = COALESCE(
	(
		SELECT MIN(el.created_at)
		FROM "economy_ledger" el
		WHERE el.pilot_id = p.id
			AND el.event_type = 'resource_granted'
			AND el.payload ->> 'source_type' = 'starter_stockpile'
	),
	p."starter_stockpile_granted_at"
)
WHERE p."starter_stockpile_granted_at" IS NULL;
