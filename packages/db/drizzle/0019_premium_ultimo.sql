CREATE TABLE "pilot_deposit_spot_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilot_id" text NOT NULL,
	"resource_instance_id" uuid NOT NULL,
	"spot_id" text NOT NULL,
	"true_concentration_percent" integer NOT NULL,
	"sampled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pilot_resource_stat_reveals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilot_id" text NOT NULL,
	"resource_instance_id" uuid NOT NULL,
	"revealed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pilot_survey_energy" (
	"pilot_id" text PRIMARY KEY NOT NULL,
	"survey_energy" integer NOT NULL,
	"last_updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pilot_deposit_spot_samples" ADD CONSTRAINT "pilot_deposit_spot_samples_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_deposit_spot_samples" ADD CONSTRAINT "pilot_deposit_spot_samples_resource_instance_id_resource_instances_id_fk" FOREIGN KEY ("resource_instance_id") REFERENCES "public"."resource_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_resource_stat_reveals" ADD CONSTRAINT "pilot_resource_stat_reveals_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_resource_stat_reveals" ADD CONSTRAINT "pilot_resource_stat_reveals_resource_instance_id_resource_instances_id_fk" FOREIGN KEY ("resource_instance_id") REFERENCES "public"."resource_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_survey_energy" ADD CONSTRAINT "pilot_survey_energy_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_deposit_spot_samples_pilot_spot_idx" ON "pilot_deposit_spot_samples" USING btree ("pilot_id","spot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_resource_stat_reveals_pilot_instance_idx" ON "pilot_resource_stat_reveals" USING btree ("pilot_id","resource_instance_id");