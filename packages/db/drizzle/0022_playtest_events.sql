CREATE TABLE "playtest_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilot_id" text NOT NULL,
	"event_name" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playtest_events" ADD CONSTRAINT "playtest_events_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playtest_events_pilot_id_idx" ON "playtest_events" USING btree ("pilot_id");--> statement-breakpoint
CREATE INDEX "playtest_events_pilot_event_idx" ON "playtest_events" USING btree ("pilot_id","event_name");--> statement-breakpoint
CREATE INDEX "playtest_events_created_at_idx" ON "playtest_events" USING btree ("created_at");
