CREATE TABLE "settlement_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilot_id" text NOT NULL,
	"milestone_key" text NOT NULL,
	"family" text NOT NULL,
	"stack_size" integer NOT NULL,
	"bound_instance_id" uuid,
	"delivered_units" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_milestones" (
	"pilot_id" text NOT NULL,
	"milestone_key" text NOT NULL,
	"unlocked_at" timestamp with time zone,
	CONSTRAINT "settlement_milestones_pilot_id_milestone_key_pk" PRIMARY KEY("pilot_id","milestone_key")
);
--> statement-breakpoint
CREATE TABLE "pilot_tutorial_state" (
	"pilot_id" text PRIMARY KEY NOT NULL,
	"step" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settlement_orders" ADD CONSTRAINT "settlement_orders_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "settlement_orders" ADD CONSTRAINT "settlement_orders_bound_instance_id_resource_instances_id_fk" FOREIGN KEY ("bound_instance_id") REFERENCES "public"."resource_instances"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "settlement_milestones" ADD CONSTRAINT "settlement_milestones_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pilot_tutorial_state" ADD CONSTRAINT "pilot_tutorial_state_pilot_id_pilots_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilots"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_orders_pilot_milestone_family_idx" ON "settlement_orders" USING btree ("pilot_id","milestone_key","family");
--> statement-breakpoint
ALTER TABLE "pilot_survey_energy" RENAME COLUMN "survey_energy" TO "raw_energy";
--> statement-breakpoint
ALTER TABLE "pilot_survey_energy" RENAME COLUMN "last_updated_at" TO "updated_at";
--> statement-breakpoint
ALTER TABLE "pilot_deposit_spot_samples" ADD COLUMN "samples_taken" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "pilots" DROP COLUMN IF EXISTS "frame_id";
--> statement-breakpoint
ALTER TABLE "pilots" DROP COLUMN IF EXISTS "starter_stockpile_granted_at";
--> statement-breakpoint
ALTER TABLE "thumper_runs" DROP COLUMN IF EXISTS "pilot_frame_id";
