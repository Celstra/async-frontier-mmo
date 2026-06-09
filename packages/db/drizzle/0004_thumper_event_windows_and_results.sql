CREATE TABLE "thumper_event_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thumper_run_id" uuid NOT NULL,
	"window_index" integer NOT NULL,
	"complication" text NOT NULL,
	"matching_action" text NOT NULL,
	"chosen_response" text,
	"responded_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "thumper_event_windows" ADD CONSTRAINT "thumper_event_windows_thumper_run_id_thumper_runs_id_fk" FOREIGN KEY ("thumper_run_id") REFERENCES "public"."thumper_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "thumper_event_windows_run_window_idx" ON "thumper_event_windows" ("thumper_run_id","window_index");--> statement-breakpoint
CREATE TABLE "thumper_run_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thumper_run_id" uuid NOT NULL,
	"target_resource_id" text NOT NULL,
	"projected_recovery" integer NOT NULL,
	"recovered_quantity" integer NOT NULL,
	"waste_quantity" integer NOT NULL,
	"explanation" text NOT NULL,
	"resolved_at" timestamp with time zone NOT NULL,
	CONSTRAINT "thumper_run_results_thumper_run_id_unique" UNIQUE("thumper_run_id")
);--> statement-breakpoint
ALTER TABLE "thumper_run_results" ADD CONSTRAINT "thumper_run_results_thumper_run_id_thumper_runs_id_fk" FOREIGN KEY ("thumper_run_id") REFERENCES "public"."thumper_runs"("id") ON DELETE no action ON UPDATE no action;
