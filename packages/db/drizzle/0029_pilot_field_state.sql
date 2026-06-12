CREATE TABLE "pilot_field_state" (
	"pilot_id" text PRIMARY KEY NOT NULL,
	"selected_family" text,
	"resource_instance_id" uuid,
	"position_x" integer DEFAULT 8 NOT NULL,
	"position_y" integer DEFAULT 5 NOT NULL,
	"scanned_tiles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pending_sample_spot_id" text,
	"pending_sample_resource_instance_id" uuid,
	"pending_sample_started_at" timestamp with time zone,
	"pending_sample_completes_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pilot_field_state" ADD CONSTRAINT "pilot_field_state_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pilot_field_state" ADD CONSTRAINT "pilot_field_state_resource_instance_id_resource_instances_id_fk" FOREIGN KEY ("resource_instance_id") REFERENCES "public"."resource_instances"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pilot_field_state" ADD CONSTRAINT "pilot_field_state_pending_sample_resource_instance_id_resource_instances_id_fk" FOREIGN KEY ("pending_sample_resource_instance_id") REFERENCES "public"."resource_instances"("id") ON DELETE no action ON UPDATE no action;
