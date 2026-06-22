ALTER TABLE "thumper_runs" ADD COLUMN "part_wear_applied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "thumper_run_results" ADD COLUMN "part_wear_deltas" jsonb;
