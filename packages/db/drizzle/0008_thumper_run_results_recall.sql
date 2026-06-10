ALTER TABLE "thumper_run_results" ADD COLUMN "forfeited_recovery" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "thumper_run_results" ADD COLUMN "resolution_type" text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "thumper_run_results" ADD COLUMN "applied_wear" integer DEFAULT 0 NOT NULL;
