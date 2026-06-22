CREATE TABLE "thumper_run_command_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"beat_index" integer NOT NULL,
	"command" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "thumper_run_command_log" ADD CONSTRAINT "thumper_run_command_log_run_id_thumper_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."thumper_runs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "thumper_run_command_log_run_beat_idx" ON "thumper_run_command_log" USING btree ("run_id","beat_index");
