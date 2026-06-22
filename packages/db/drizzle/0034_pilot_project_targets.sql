CREATE TABLE IF NOT EXISTS "pilot_project_targets" (
	"pilot_id" text PRIMARY KEY NOT NULL,
	"schematic_id" text NOT NULL,
	"target_slot_id" text NOT NULL,
	"target_family" text NOT NULL,
	"target_resource_instance_id" uuid,
	"sampled_spot_id" text,
	"material_secured_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pilot_project_targets_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "pilot_project_targets_target_resource_instance_id_resource_instances_id_fk" FOREIGN KEY ("target_resource_instance_id") REFERENCES "public"."resource_instances"("id") ON DELETE no action ON UPDATE no action
);
