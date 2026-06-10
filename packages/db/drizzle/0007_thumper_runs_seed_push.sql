ALTER TABLE "thumper_runs" ADD COLUMN "run_seed" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "thumper_runs" ADD COLUMN "is_push_run" boolean DEFAULT false NOT NULL;
