CREATE TABLE "deposit_spot_yields" (
	"spot_id" text PRIMARY KEY NOT NULL,
	"resource_instance_id" uuid NOT NULL,
	"units_capacity" integer NOT NULL,
	"units_extracted" integer DEFAULT 0 NOT NULL,
	"exhausted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "deposit_spot_yields" ADD CONSTRAINT "deposit_spot_yields_resource_instance_id_resource_instances_id_fk" FOREIGN KEY ("resource_instance_id") REFERENCES "public"."resource_instances"("id") ON DELETE no action ON UPDATE no action;