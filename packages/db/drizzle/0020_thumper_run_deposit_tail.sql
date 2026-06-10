ALTER TABLE "thumper_runs" ADD COLUMN IF NOT EXISTS "deposit_spot_id" text;
--> statement-breakpoint
ALTER TABLE "thumper_runs" ADD COLUMN IF NOT EXISTS "true_concentration_percent" integer;
--> statement-breakpoint
ALTER TABLE "thumper_runs" ADD COLUMN IF NOT EXISTS "extraction_tail_minutes" integer DEFAULT 60 NOT NULL;
--> statement-breakpoint
ALTER TABLE "thumper_runs" ADD COLUMN IF NOT EXISTS "resource_instance_id" uuid;
