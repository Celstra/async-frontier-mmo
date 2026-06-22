ALTER TABLE "thumper_runs" ADD COLUMN "command_queue_length" integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
ALTER TABLE "thumper_runs" ADD CONSTRAINT "thumper_runs_command_queue_length_check" CHECK ("command_queue_length" in (2, 3, 4));
